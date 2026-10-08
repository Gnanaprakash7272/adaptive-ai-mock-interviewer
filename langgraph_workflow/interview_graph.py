"""
interview_graph.py

LangGraph workflow for the AI MOCKORA interview session.

Graph Flow:
    START
      â†“
    create_interview_plan       â€” validates + initialises session state
      â†“
    generate_question           â€” calls question_generator, commits question to state
      â†“
    wait_for_answer             â€” INTERRUPTS here, waits for candidate answer
      â†“  (resumed with Command(resume=<answer_string>))
    evaluate_answer             â€” calls answer_evaluator
      â†“
    adaptive_decision           â€” calls adaptive_engine, updates topic/difficulty
      â†“
    should_continue (router)
        â”œâ”€â”€ "continue"  â†’ generate_question          (loop)
        â””â”€â”€ "finish"    â†’ generate_final_report â†’ END

Design rules:
    - NO Supabase calls.
    - NO CLI blocking (no input()).
    - NO duplication of AI-function logic.
    - NO FastAPI / HTTP concerns.
    - State is mutated ONLY via return dicts (LangGraph style).

Why two nodes instead of one for question + interrupt?
    LangGraph 1.2 commits a node's state updates only AFTER the full node
    returns.  If interrupt() is called mid-node, any state written before
    the interrupt is not yet saved to the checkpoint.  By splitting into
    generate_question (writes state, returns) and wait_for_answer (interrupt
    only), the question/count/topics_covered are safely committed before the
    graph pauses.

Interrupt/Resume mechanism (LangGraph 1.2.x):
    Inside wait_for_answer, `interrupt(payload)` is called.
    This raises an internal exception that freezes the graph and saves
    a checkpoint.  The caller receives control back with the question in state.
    When the candidate submits an answer, the caller resumes with:

        graph.invoke(Command(resume=<answer_string>), config)

    LangGraph replays wait_for_answer from the interrupt point and the
    return value of `interrupt(...)` becomes the candidate's answer string.
"""

from __future__ import annotations

import logging
import os
import re
import threading
import urllib.parse

from dotenv import load_dotenv

# Load local configuration before LangGraph initializes its serializer.
load_dotenv(override=True)

from typing import Any

from langgraph.graph import END, START, StateGraph
from langgraph.types import interrupt

try:
    from langgraph.checkpoint.postgres import PostgresSaver
    from psycopg.rows import dict_row
    from psycopg_pool import ConnectionPool
    _POSTGRES_AVAILABLE = True
    _POSTGRES_IMPORT_ERROR = None
except (ImportError, Exception) as _pg_exc:
    PostgresSaver = None  # type: ignore
    dict_row = None  # type: ignore
    ConnectionPool = None  # type: ignore
    _POSTGRES_AVAILABLE = False
    _POSTGRES_IMPORT_ERROR = _pg_exc

from adaptive_intelligence.adaptive_engine import _get_next_topic
from adaptive_intelligence.adaptive_engine import decide_next_step as _decide_next_step
from answer_intelligence.answer_processor import (
    process_candidate_answer as _process_candidate_answer,
)
from langgraph_workflow.interview_brief import (
    build_interview_brief,
    max_followups_per_topic,
    plan_interview_topics,
)
from langgraph_workflow.interview_state import InterviewState

# ---------------------------------------------------------------------------
# Import existing pure AI functions â€” zero logic duplication.
# ---------------------------------------------------------------------------
from question_intelligence.question_generator import generate_question as _generate_question
from report_intelligence.report_generator import generate_narrative as _generate_narrative

logger = logging.getLogger(__name__)

import time

def log_latency(msg, *args):
    formatted = msg % args
    logger.info(formatted)

# ---------------------------------------------------------------------------
# Scoring constants
# ---------------------------------------------------------------------------
TOPIC_MASTERY_SCORE = 7

# Difficulty multipliers for weighted scoring.
# Harder questions deserve more weight in the overall score.
_DIFFICULTY_WEIGHT: dict[str, float] = {
    "easy":   0.7,
    "medium": 1.0,
    "hard":   1.3,
}

# ---------------------------------------------------------------------------
# A transaction-scoped PostgreSQL advisory lock serializes checkpoint schema
# migrations across separate serverless instances as well as local processes.
# ---------------------------------------------------------------------------
_CHECKPOINT_SETUP_LOCK_ID = 0x4D4F434B4F5241
_checkpoint_store_lock = threading.Lock()
_checkpoint_pool: Any | None = None
_postgres_checkpointer: Any | None = None
_interview_graph = None


def _sanitize_database_url(database_url: str) -> str:
    """
    Sanitize and normalize common copy-paste artifacts from Supabase dashboard.

    Fixes:
    - Leading/trailing whitespace, outer quotes, 'DATABASE_URL=' prefixes
    - Accidental bracketed passwords: user[pass] or user:[pass] -> user:pass
    - Unencoded special characters in the password (@, #, %, etc.)
    """
    if not database_url:
        return ""
    database_url = database_url.strip()
    if database_url.startswith("DATABASE_URL="):
        database_url = database_url[len("DATABASE_URL="):].strip()
    if (database_url.startswith('"') and database_url.endswith('"')) or (
        database_url.startswith("'") and database_url.endswith("'")
    ):
        database_url = database_url[1:-1].strip()

    # Match bracketed password e.g. postgresql://user[pass]@host... or postgresql://user:[pass]@host...
    match = re.match(r"^(postgres(?:ql)?://)([^@:]+)(?::\[|\[)([^\]]+)\](@.*)$", database_url)
    if match:
        prefix, user, password, rest = match.groups()
        unquoted_pw = urllib.parse.unquote(password)
        safe_pw = urllib.parse.quote(unquoted_pw, safe="")
        database_url = f"{prefix}{user}:{safe_pw}{rest}"

    return database_url


def _create_checkpoint_pool(database_url: str) -> ConnectionPool:
    """Create the small runtime pool used by PostgresSaver on warm instances."""
    return ConnectionPool(
        conninfo=database_url,
        min_size=0,
        max_size=2,
        kwargs={
            "autocommit": True,
            "row_factory": dict_row,
            "prepare_threshold": 0,
        },
        open=False,
        check=ConnectionPool.check_connection,
        name="mockora-langgraph-checkpoints",
    )


def _initialize_checkpoint_schema(database_url: str) -> None:
    """Run checkpoint migrations on a dedicated connection."""
    from psycopg import connect

    with connect(
        database_url,
        autocommit=True,
        row_factory=dict_row,
        prepare_threshold=0,
    ) as connection:
        # Use session-level advisory lock instead of transaction lock, because
        # PostgresSaver.setup() executes DDL like "CREATE INDEX CONCURRENTLY"
        # which PostgreSQL prohibits inside an active transaction block.
        connection.execute(
            "SELECT pg_advisory_lock(%s)",
            (_CHECKPOINT_SETUP_LOCK_ID,),
        )
        try:
            PostgresSaver(connection).setup()
        finally:
            connection.execute(
                "SELECT pg_advisory_unlock(%s)",
                (_CHECKPOINT_SETUP_LOCK_ID,),
            )


if _POSTGRES_AVAILABLE and PostgresSaver is not None:
    class InstrumentedPostgresSaver(PostgresSaver):
        def put(self, *args, **kwargs):
            import time
            t0 = time.monotonic()
            try:
                return super().put(*args, **kwargs)
            finally:
                log_latency("[LATENCY] pg_checkpoint_put duration=%.3fs", time.monotonic() - t0)

        def put_writes(self, *args, **kwargs):
            import time
            t0 = time.monotonic()
            try:
                return super().put_writes(*args, **kwargs)
            finally:
                log_latency("[LATENCY] pg_checkpoint_put_writes duration=%.3fs", time.monotonic() - t0)
else:
    InstrumentedPostgresSaver = None  # type: ignore

def _get_postgres_checkpointer():
    """Return the process-wide PostgresSaver, initializing its pool once."""
    global _checkpoint_pool, _postgres_checkpointer

    if _postgres_checkpointer is not None:
        return _postgres_checkpointer

    with _checkpoint_store_lock:
        if _postgres_checkpointer is not None:
            return _postgres_checkpointer

        allow_memory = os.getenv("ALLOW_MEMORY_CHECKPOINTER", "").lower() in ("true", "1", "yes")

        if not _POSTGRES_AVAILABLE:
            logger.warning(
                "PostgreSQL/psycopg is unavailable (%s). "
                "Falling back to MemorySaver.",
                _POSTGRES_IMPORT_ERROR,
            )
            from langgraph.checkpoint.memory import MemorySaver
            _postgres_checkpointer = MemorySaver()
            return _postgres_checkpointer

        database_url = _sanitize_database_url(os.getenv("DATABASE_URL", ""))

        if not database_url:
            if allow_memory:
                logger.warning(
                    "DATABASE_URL not set. Falling back to MemorySaver because ALLOW_MEMORY_CHECKPOINTER=true."
                )
                from langgraph.checkpoint.memory import MemorySaver
                _postgres_checkpointer = MemorySaver()
                return _postgres_checkpointer

            raise RuntimeError(
                "DATABASE_URL is required for LangGraph PostgreSQL checkpointing. "
                "Set it to the Supabase PostgreSQL session-pooler connection string."
            )

        pool = None
        try:
            # Run schema setup using a dedicated PostgreSQL connection.
            # Do not consume a connection from the runtime pool while
            # initializing that same pool.
            _initialize_checkpoint_schema(database_url)

            pool = _create_checkpoint_pool(database_url)
            pool.open(wait=True, timeout=10)
            checkpointer = InstrumentedPostgresSaver(pool)
            _checkpoint_pool = pool
            _postgres_checkpointer = checkpointer
            return checkpointer
        except Exception as exc:
            if pool is not None:
                pool.close()
            if allow_memory:
                logger.warning(
                    "PostgreSQL checkpointer connection failed (%s). "
                    "ALLOW_MEMORY_CHECKPOINTER=true: falling back to MemorySaver.",
                    exc,
                )
                from langgraph.checkpoint.memory import MemorySaver
                _postgres_checkpointer = MemorySaver()
                return _postgres_checkpointer
            raise


# ===========================================================================
# NODE 1 â€” create_interview_plan
# ===========================================================================

def create_interview_plan(state: InterviewState) -> dict:
    """
    Validate and initialise interview session state.

    Responsibilities:
        - Confirm required fields are present (user_id, role, candidate_profile,
          max_questions).
        - Build a sanitized interview brief from the role catalogue (or fallback).
        - Derive role_topics from role requirements, gaps, and candidate evidence.
        - Resolve current_topic: keep pre-set if valid, else default to first
          role topic.
        - Validate / default current_difficulty.
        - Reset all per-session accumulators to known-good values.

    Does NOT:
        - Call Supabase.
        - Call any AI API.
        - Generate questions.

    Raises:
        ValueError: if any required field is missing or invalid.
    """
    candidate_profile = state.get("candidate_profile")
    if not candidate_profile or not isinstance(candidate_profile, dict):
        raise ValueError(
            "create_interview_plan: candidate_profile must be a non-empty dict."
        )

    role = state.get("role", "").strip()
    if not role:
        raise ValueError(
            "create_interview_plan: role is required."
        )

    user_id = state.get("user_id")
    if user_id is None:
        raise ValueError(
            "create_interview_plan: user_id is required."
        )

    max_questions = state.get("max_questions")
    if not isinstance(max_questions, int) or max_questions <= 0:
        raise ValueError(
            "create_interview_plan: max_questions must be a positive integer."
        )

    interview_brief = build_interview_brief(role, candidate_profile)
    role_topics, candidate_topics, available_topics = plan_interview_topics(
        interview_brief,
        candidate_profile,
    )

    # Resolve current_topic.
    current_topic: str = state.get("current_topic", "").strip()
    if not current_topic:
        # No pre-set topic â€” use first role topic.
        if role_topics:
            current_topic = role_topics[0]
        elif available_topics:
            current_topic = available_topics[0]
        else:
            raise ValueError(
                "create_interview_plan: no interview topics found in "
                "candidate_profile and no current_topic was pre-set."
            )
    elif current_topic not in available_topics:
        # Pre-set topic is not in the valid topic pool â€” reset to first.
        current_topic = available_topics[0] if available_topics else role_topics[0]

    # Validate / default difficulty.
    current_difficulty: str = state.get("current_difficulty", "medium")
    if current_difficulty not in ("easy", "medium", "hard"):
        current_difficulty = "medium"

    return {
        "role_topics":                 role_topics,
        "candidate_topics":            candidate_topics,
        "available_topics":            available_topics,
        "interview_brief":             interview_brief,
        "current_topic":               current_topic,
        "current_difficulty":          current_difficulty,
        "topics_covered":              [],
        "followups_on_current_topic":  0,
        "max_followups_per_topic":     max_followups_per_topic(),
        "current_question":            None,
        "current_answer":              None,
        "current_evaluation":          None,
        "interviewer_feedback":        "",
        "adaptive_decision":           None,
        "question_count":              0,
        "is_finished":                 False,
        "interview_history":           [],
        "final_report":                None,
    }


# ===========================================================================
# NODE 2 â€” generate_question
# ===========================================================================

def generate_question(state: InterviewState) -> dict:
    """
    Generate the next interview question and commit it to state.

    This node ONLY generates the question â€” it does NOT pause for the answer.
    Pausing happens in the next node (wait_for_answer).

    This split is necessary because LangGraph 1.2 only commits state updates
    after a node fully returns.  If we called interrupt() mid-node, the state
    updates made before the interrupt would not be saved to the checkpoint.
    By returning normally here, all updates are safely committed before
    wait_for_answer fires the interrupt.

    Reads:
        candidate_profile, role, current_topic, current_difficulty,
        topics_covered, question_count, interview_history, adaptive_decision

    Writes:
        current_question, topics_covered, question_count,
        current_evaluation (cleared), adaptive_decision (cleared),
        current_answer (cleared)
    """
    candidate_profile  = state["candidate_profile"]
    role               = state["role"]
    current_topic      = state["current_topic"]
    current_difficulty = state["current_difficulty"]
    question_count: int       = state.get("question_count", 0)
    history: list             = state.get("interview_history", [])
    interview_brief: dict     = state.get("interview_brief") or {}

    # Extract the adaptive action string from the previous turn's decision.
    adaptive_decision_dict: dict = state.get("adaptive_decision") or {}
    adaptive_action: str = adaptive_decision_dict.get("next_action", "")

    _t_gq = time.monotonic()
    question_data = _generate_question(
        candidate_profile,
        role,
        current_topic,
        current_difficulty,
        history,
        adaptive_action,
        interview_brief=interview_brief,
    )
    log_latency("[LATENCY] node_generate_question duration=%.3fs", time.monotonic() - _t_gq)

    question_count = question_count + 1

    return {
        "current_question":   question_data,
        "question_count":     question_count,
        "current_answer":     None,
        "current_evaluation": None,
        "adaptive_decision":  None,
    }


# ===========================================================================
# NODE 3 â€” wait_for_answer
# ===========================================================================
# NODE 3 — process_answer
# ===========================================================================

def process_answer(state: InterviewState) -> dict:
    """
    Pause the graph and wait for the candidate's answer, then process it.

    This node calls interrupt() which suspends the graph at this point and
    saves a checkpoint. The caller receives control and can read the committed
    state (including current_question).

    When the candidate submits an answer, the caller resumes via Command(resume=answer).
    Then, this node immediately evaluates the answer and runs the adaptive engine
    before returning, eliminating redundant checkpoints.
    """
    current_question = state.get("current_question", {})
    question_count   = state.get("question_count", 0)

    public_question = dict(current_question or {})
    public_question.pop("expected_concepts", None)

    # 1. Wait for answer
    candidate_answer: str = interrupt(
        {
            "event":    "answer_required",
            "question": public_question,
            "turn":     question_count,
        }
    )

    if not str(candidate_answer).strip():
        raise ValueError(
            "process_answer: answer cannot be empty. "
            "Resume with a non-empty string via Command(resume=<answer>)."
        )

    # 2. Compute potential next topic
    current_topic      = state["current_topic"]
    current_difficulty = state["current_difficulty"]
    topics_covered: list[str]   = list(state.get("topics_covered", []))
    role_topics: list[str]      = list(state.get("role_topics", []))
    candidate_topics: list[str] = list(state.get("candidate_topics", []))
    available_topics: list[str] = list(state.get("available_topics", []))
    max_questions: int          = state["max_questions"]
    followups_on_topic: int     = int(state.get("followups_on_current_topic") or 0)
    max_followups: int          = int(state.get("max_followups_per_topic") or max_followups_per_topic())
    history: list               = list(state.get("interview_history", []))
    previous_action = ""
    if history:
        previous_action = (history[-1].get("adaptive_decision") or {}).get("next_action", "")

    topics_visited: list[str] = list(state.get("topics_visited") or topics_covered)

    next_topic_if_needed = _get_next_topic(
        current_topic=current_topic,
        topics_covered=topics_covered,
        topics_visited=topics_visited,
        role_topics=role_topics,
        candidate_topics=candidate_topics,
    )

    # 3. Evaluate answer and propose question (Combined Gemini Call)
    question_text: str      = current_question.get("question", "")
    expected_concepts: list = current_question.get("expected_concepts", [])
    if not isinstance(expected_concepts, list):
        expected_concepts = []

    _t_ea = time.monotonic()
    process_output = _process_candidate_answer(
        question=question_text,
        expected_concepts=expected_concepts,
        candidate_answer=candidate_answer,
        role=state.get("role", ""),
        current_topic=current_topic,
        current_difficulty=current_difficulty,
        recent_turns=history,
        interview_brief=state.get("interview_brief"),
        next_topic_if_needed=next_topic_if_needed,
    )
    log_latency("[LATENCY] node_process_answer_inference duration=%.3fs", time.monotonic() - _t_ea)

    evaluation = process_output.get("evaluation") or {}
    question_proposal = process_output.get("question_proposal")
    feedback = str(evaluation.get("feedback") or "").strip()

    # 4. Run deterministic adaptive engine
    _t_ad = time.monotonic()
    decision = _decide_next_step(
        evaluation=evaluation,
        current_topic=current_topic,
        current_difficulty=current_difficulty,
        topics_covered=topics_covered,
        role_topics=role_topics,
        candidate_topics=candidate_topics,
        followups_on_topic=followups_on_topic,
        max_followups=max_followups,
        previous_action=previous_action,
        topics_visited=topics_visited,
    )
    log_latency("[LATENCY] node_adaptive_decision duration=%.3fs", time.monotonic() - _t_ad)

    next_topic: str      = decision.get("next_topic", current_topic)
    next_difficulty: str = decision.get("difficulty", current_difficulty)
    next_action: str     = decision.get("next_action", "")
    followups_before = followups_on_topic

    if next_action == "follow_up":
        followups_on_topic = followups_on_topic + 1
    elif next_topic.strip().lower() != current_topic.strip().lower():
        followups_on_topic = 0

    score = evaluation.get("score", 0)
    try:
        score = float(score)
    except (TypeError, ValueError):
        score = 0.0

    covered_lower = {t.lower() for t in topics_covered}
    topic_key = current_topic.strip().lower()
    cycle_complete = followups_before > 0 and next_action != "follow_up"
    if topic_key not in covered_lower:
        if score >= TOPIC_MASTERY_SCORE or cycle_complete:
            topics_covered = topics_covered + [current_topic]

    turn_record = {
        "turn":              question_count,
        "question":          current_question,
        "answer":            candidate_answer,
        "evaluation":        evaluation,
        "adaptive_decision": decision,
    }
    history = history + [turn_record]

    # Termination decision
    is_finished: bool = question_count >= max_questions
    termination_reason: str = ""

    if not is_finished and question_count >= 5:
        scores    = [t.get("evaluation", {}).get("score", 0) for t in history]
        avg_score = sum(scores) / len(scores) if scores else 0
        if avg_score < 4.0:
            is_finished = True
            termination_reason = "Adaptive early-exit (score < 4.0 after 5 turns)."

    if next_action == "finish":
        is_finished = True
        termination_reason = "Adaptive engine determined interview is complete."
    elif len(history) >= max_questions:
        is_finished = True
        termination_reason = f"Reached maximum questions ({max_questions})."

    # 5. Validate question proposal against deterministic decision
    use_fallback = True
    new_question = None
    if not is_finished and question_proposal:
        proposed_topic = str(question_proposal.get("topic") or "").strip().lower()
        decided_topic = str(next_topic).strip().lower()

        # Ensure Gemini didn't try to switch topic when it shouldn't, or vice-versa
        if proposed_topic == decided_topic:
            use_fallback = False
            new_question = dict(question_proposal)
            # Force difficulty to match deterministic engine
            new_question["difficulty"] = next_difficulty
            question_count += 1
            log_latency("[LATENCY] process_answer accepted proposed question topic=%s", proposed_topic)
        else:
            log_latency("[LATENCY] process_answer rejected proposal: expected topic %s, got %s", decided_topic, proposed_topic)

    decision["use_fallback_generate"] = use_fallback

    return {
        "current_question":           new_question if not use_fallback else None,
        "question_count":             question_count,
        "current_answer":             None,
        "current_evaluation":         evaluation,
        "interviewer_feedback":       feedback,
        "adaptive_decision":          decision,
        "current_topic":              next_topic,
        "current_difficulty":         next_difficulty,
        "is_finished":                is_finished,
        "interview_history":          history,
        "termination_reason":         termination_reason,
        "topics_visited":             topics_visited + [next_topic] if next_topic not in topics_visited else topics_visited,
        "followups_on_current_topic": followups_on_topic,
        "topics_covered":             topics_covered,
    }

# ===========================================================================

def generate_final_report(state: InterviewState) -> dict:
    """
    Summarise the completed interview from interview_history.

    Produces a report dict stored in state under "final_report".

    Uses:
        - state["topics_covered"]  â€” the actual tracked list (single source of truth)
          rather than re-deriving from history question dicts, which may differ
          if the AI returns a different topic string.
        - interview_history        â€” for scores, feedback, missing_concepts, actions.

    Note:
        is_finished is NOT re-set here â€” it was already set True by
        run_adaptive_engine (or should_continue routing logic).
        Setting it again here would be a double-write with no effect,
        but is removed for clarity.
    """
    history: list       = state.get("interview_history", [])
    role: str           = state.get("role", "")
    user_id             = state.get("user_id")
    question_count: int = state.get("question_count", 0)

    # Use the canonical topics_covered list from state â€” single source of truth.
    topics_covered: list[str] = list(state.get("topics_covered", []))
    interview_brief: dict = state.get("interview_brief") or {}

    # Aggregate scores â€” weighted by difficulty so harder questions count more.
    # Follow-up turns are excluded from independent scoring; their score is
    # already reflected by how the parent question steered the interview.
    weighted_sum   = 0.0
    weight_total   = 0.0
    for turn in history:
        if turn.get("evaluation") is None:
            continue
        action = (turn.get("adaptive_decision") or {}).get("next_action", "")
        if action == "follow_up":
            # Follow-ups contribute to the parent topic's dimension, not as an
            # independent question in the scoring average.
            continue
        difficulty = (turn.get("question") or {}).get("difficulty", "medium")
        weight = _DIFFICULTY_WEIGHT.get(str(difficulty).lower(), 1.0)
        try:
            score = float(turn["evaluation"].get("score", 0))
        except (TypeError, ValueError):
            score = 0.0
        weighted_sum  += score * weight
        weight_total  += weight
    overall_score: float = round(weighted_sum / weight_total, 2) if weight_total else 0.0

    # Collect feedback strings.
    feedback_notes: list[str] = [
        turn.get("evaluation", {}).get("feedback", "")
        for turn in history
        if turn.get("evaluation", {}).get("feedback")
    ]

    # Collect and deduplicate missing concepts.
    all_missing: list[str] = []
    for turn in history:
        missing = turn.get("evaluation", {}).get("missing_concepts", [])
        if isinstance(missing, list):
            all_missing.extend(missing)
    seen: set[str] = set()
    unique_missing: list[str] = []
    for concept in all_missing:
        key = str(concept).strip().lower()
        if key and key not in seen:
            seen.add(key)
            unique_missing.append(concept)

    profile_strengths = list(interview_brief.get("matched_skills") or [])
    interview_demonstrated: list[str] = []
    demonstrated_seen: set[str] = set()
    for turn in history:
        eval_data = turn.get("evaluation") or {}
        try:
            turn_score = float(eval_data.get("score") or 0)
        except (TypeError, ValueError):
            turn_score = 0.0
        if turn_score < TOPIC_MASTERY_SCORE:
            continue
        topic = (turn.get("question") or {}).get("topic") or ""
        key = str(topic).strip().lower()
        if key and key not in demonstrated_seen:
            demonstrated_seen.add(key)
            interview_demonstrated.append(topic)

    interview_gaps: list[str] = []
    gap_seen: set[str] = set()
    for concept in unique_missing:
        key = str(concept).strip().lower()
        if key and key not in gap_seen:
            gap_seen.add(key)
            interview_gaps.append(concept)
    for gap in interview_brief.get("skill_gaps") or []:
        key = str(gap).strip().lower()
        if key and key not in gap_seen and key not in demonstrated_seen:
            gap_seen.add(key)
            interview_gaps.append(gap)

    # Collect adaptive actions from history.
    adaptive_actions: list[str] = [
        turn.get("adaptive_decision", {}).get("next_action", "")
        for turn in history
        if turn.get("adaptive_decision", {}).get("next_action")
    ]

    narrative_failed_flag = False
    _t_nar = time.monotonic()
    try:
        narrative = _generate_narrative(
            role=role,
            overall_score=overall_score,
            topics_covered=topics_covered,
            history=history,
            interview_brief=interview_brief,
            profile_strengths=profile_strengths,
            interview_demonstrated_strengths=interview_demonstrated,
            interview_knowledge_gaps=interview_gaps,
        )
        log_latency("[LATENCY] node_generate_narrative duration=%.3fs", time.monotonic() - _t_nar)
    except Exception:
        log_latency("[LATENCY] node_generate_narrative error duration=%.3fs", time.monotonic() - _t_nar)
        logger.warning("Narrative generation failed", exc_info=True)
        narrative = {
            "summary": "",
            "strengths": [],
            "weaknesses": [],
            "recommendations": [],
        }
        narrative_failed_flag = True

    report = {
        "user_id":          user_id,
        "role":             role,
        "total_questions":  question_count,
        "overall_score":    overall_score,
        "topics_covered":   topics_covered,          # from state, not re-derived
        "profile_strengths": profile_strengths,
        "interview_demonstrated_strengths": interview_demonstrated,
        "interview_knowledge_gaps": interview_gaps,
        "adaptive_actions": adaptive_actions,
        "missing_concepts": unique_missing,
        "feedback_notes":   feedback_notes,
        "turn_details":     history,
        "strengths":        narrative.get("strengths", []),
        "weaknesses":       narrative.get("weaknesses", []),
        "recommendations":  narrative.get("recommendations", []),
        "summary":          narrative.get("summary", ""),
        "narrative_failed": narrative_failed_flag,
        "termination_reason": state.get("termination_reason", ""),
    }

    return {
        "final_report": report,
        # is_finished is already True from run_adaptive_engine â€” not re-set here.
    }


# ===========================================================================
# CONDITIONAL ROUTER â€” should_continue
# ===========================================================================

def should_continue(state: InterviewState) -> str:
    if state.get("is_finished", False):
        return "finish"

    adaptive = state.get("adaptive_decision") or {}
    if adaptive.get("use_fallback_generate", True):
        return "continue"

    return "process_answer"""


# ===========================================================================
# GRAPH ASSEMBLY
# ===========================================================================

def build_interview_graph(checkpointer=None):
    """
    Assemble and compile the interview graph.

    Args:
        checkpointer: A LangGraph checkpointer instance.
                      Defaults to the process-wide PostgresSaver backed by
                      DATABASE_URL. Pass a custom checkpointer (e.g.
                      MemorySaver) for isolated tests.

    Returns:
        A compiled LangGraph CompiledStateGraph ready for invoke/stream.

    Usage:
        graph = build_interview_graph()
        config = {"configurable": {"thread_id": "interview-42"}}

        # Start: runs plan â†’ generate_question â†’ wait_for_answer, then pauses.
        graph.invoke(initial_state, config)

        # Read the committed question from state.
        question = graph.get_state(config).values["current_question"]

        # Resume with the candidate's answer.
        from langgraph.types import Command
        graph.invoke(Command(resume="My answer text"), config)

    """
    if checkpointer is None:
        checkpointer = _get_postgres_checkpointer()

    builder = StateGraph(InterviewState)

    # ------------------------------------------------------------------
    # Register nodes
    # ------------------------------------------------------------------
    builder.add_node("create_interview_plan", create_interview_plan)
    builder.add_node("generate_question",     generate_question)
    builder.add_node("process_answer",        process_answer)
    builder.add_node("generate_final_report", generate_final_report)

    # ------------------------------------------------------------------
    # Edges â€” linear flow
    # ------------------------------------------------------------------
    builder.add_edge(START,                   "create_interview_plan")
    builder.add_edge("create_interview_plan", "generate_question")
    builder.add_edge("generate_question",     "process_answer")

    # ------------------------------------------------------------------
    # Conditional edge â€” loop or finish
    # ------------------------------------------------------------------
    builder.add_conditional_edges(
        "process_answer",
        should_continue,
        {
            "continue": "generate_question",
            "process_answer": "process_answer",
            "finish":   "generate_final_report",
        },
    )

    builder.add_edge("generate_final_report", END)

    return builder.compile(checkpointer=checkpointer)


# ===========================================================================
# Lazy module-level graph accessor.
# The Postgres pool is process-scoped and opens connections only when used.
# ===========================================================================
_interview_graph_lock = threading.Lock()


def get_interview_graph():
    """
    Return the module-level default graph, building it on first call.

    Use this instead of importing `_interview_graph` directly so that
    importing this module never triggers a database connection. Production
    uses the shared PostgreSQL checkpoint tables; tests can inject MemorySaver.
    """
    global _interview_graph
    if _interview_graph is None:
        with _interview_graph_lock:
            if _interview_graph is None:
                _interview_graph = build_interview_graph()
    return _interview_graph


# ---------------------------------------------------------------------------
# Public lazy proxy â€” maintains backwards compatibility.
#
# `from langgraph_workflow.interview_graph import interview_graph` works
# across the codebase (api/interview_router.py etc.) because this proxy
# forwards every attribute access / call to the lazily-built graph instance.
#
# Using a proxy instead of a bare module-level graph means importing this module
# does not initialize PostgreSQL until the application first needs the graph.
# ---------------------------------------------------------------------------

class _LazyGraphProxy:
    """Forwards all attribute access to the lazily-initialised interview graph."""

    __slots__ = ()   # no instance dict â€” all attrs delegate to the real graph

    def __getattr__(self, name: str):
        return getattr(get_interview_graph(), name)

    def __call__(self, *args, **kwargs):
        return get_interview_graph()(*args, **kwargs)


interview_graph = _LazyGraphProxy()

