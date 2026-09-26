"""
interview_graph.py

LangGraph workflow for the AI MOCKORA interview session.

Graph Flow:
    START
      ↓
    create_interview_plan       — validates + initialises session state
      ↓
    generate_question           — calls question_generator, commits question to state
      ↓
    wait_for_answer             — INTERRUPTS here, waits for candidate answer
      ↓  (resumed with Command(resume=<answer_string>))
    evaluate_answer             — calls answer_evaluator
      ↓
    adaptive_decision           — calls adaptive_engine, updates topic/difficulty
      ↓
    should_continue (router)
        ├── "continue"  → generate_question          (loop)
        └── "finish"    → generate_final_report → END

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
import threading

from dotenv import load_dotenv

# Load local configuration before LangGraph initializes its serializer.
load_dotenv(override=True)

from langgraph.graph import StateGraph, END, START
from langgraph.checkpoint.postgres import PostgresSaver
from langgraph.types import interrupt
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from langgraph_workflow.interview_state import InterviewState

# ---------------------------------------------------------------------------
# Import existing pure AI functions — zero logic duplication.
# ---------------------------------------------------------------------------
from question_intellegence.question_generator import generate_question as _generate_question
from answer_intellegence.answer_evaluator import evaluate_answer as _evaluate_answer
from adaptive_intellegence.adaptive_engine import decide_next_step as _decide_next_step
from report_intellegence.report_generator import generate_narrative as _generate_narrative

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# A transaction-scoped PostgreSQL advisory lock serializes checkpoint schema
# migrations across separate serverless instances as well as local processes.
# ---------------------------------------------------------------------------
_CHECKPOINT_SETUP_LOCK_ID = 0x4D4F434B4F5241
_checkpoint_store_lock = threading.Lock()
_checkpoint_pool: ConnectionPool | None = None
_postgres_checkpointer: PostgresSaver | None = None
_interview_graph = None

# ---------------------------------------------------------------------------
# Module-level constant — role → default topic list.
# Keys use full, unambiguous phrases to avoid substring collisions
# (e.g. "ml" would also match "email" or "html").
# ---------------------------------------------------------------------------
_ROLE_TOPIC_MAP: dict[str, list[str]] = {
    "react":            ["React", "JavaScript", "TypeScript", "Frontend Architecture", "State Management"],
    "machine learning": ["Python", "Machine Learning", "Deep Learning", "Data Processing", "MLOps", "Model Evaluation"],
    "ml engineer":      ["Python", "Machine Learning", "Deep Learning", "Data Processing", "MLOps", "Model Evaluation"],
    "backend":          ["API Design", "Databases", "Microservices", "System Architecture", "Security", "Backend Frameworks"],
    "frontend":         ["JavaScript", "CSS/HTML", "Frontend Frameworks", "Web Performance", "State Management"],
    "data scientist":   ["SQL", "Data Pipelines", "Data Warehousing", "Python", "Data Modeling"],
    "data engineer":    ["SQL", "Data Pipelines", "Data Warehousing", "Python", "Data Modeling"],
    "devops":           ["CI/CD", "Docker", "Kubernetes", "Cloud Platforms", "Infrastructure as Code", "Monitoring"],
    "full stack":       ["Frontend Frameworks", "Backend Architecture", "Databases", "API Design", "Deployment"],
    "software":         ["Data Structures", "Algorithms", "System Design", "Problem Solving", "Software Engineering Principles"],
}

_DEFAULT_TOPICS: list[str] = [
    "Technical Skills", "System Design", "Problem Solving", "Domain Knowledge", "Best Practices"
]


def _create_checkpoint_pool(database_url: str) -> ConnectionPool:
    """Create a bounded pool suitable for a warm serverless function instance."""
    return ConnectionPool(
        conninfo=database_url,
        min_size=0,
        max_size=1,
        kwargs={
            "autocommit": True,
            "row_factory": dict_row,
            "prepare_threshold": 0,
        },
        open=False,
        check=ConnectionPool.check_connection,
        name="mockora-langgraph-checkpoints",
    )


def _initialize_checkpoint_schema(pool: ConnectionPool) -> None:
    """Apply PostgresSaver migrations once per process under a database lock."""
    with pool.connection() as connection:
        with connection.transaction():
            connection.execute(
                "SELECT pg_advisory_xact_lock(%s)",
                (_CHECKPOINT_SETUP_LOCK_ID,),
            )
            PostgresSaver(connection).setup()


def _get_postgres_checkpointer() -> PostgresSaver:
    """Return the process-wide PostgresSaver, initializing its pool once."""
    global _checkpoint_pool, _postgres_checkpointer

    if _postgres_checkpointer is not None:
        return _postgres_checkpointer

    with _checkpoint_store_lock:
        if _postgres_checkpointer is not None:
            return _postgres_checkpointer

        database_url = os.getenv("DATABASE_URL", "").strip()
        if not database_url:
            raise RuntimeError(
                "DATABASE_URL is required for LangGraph PostgreSQL checkpointing. "
                "Set it to the Supabase PostgreSQL session-pooler connection string."
            )

        pool = _create_checkpoint_pool(database_url)
        try:
            pool.open(wait=True, timeout=10)
            _initialize_checkpoint_schema(pool)
            checkpointer = PostgresSaver(pool)
        except Exception:
            pool.close()
            raise

        _checkpoint_pool = pool
        _postgres_checkpointer = checkpointer
        return checkpointer


# ===========================================================================
# NODE 1 — create_interview_plan
# ===========================================================================

def create_interview_plan(state: InterviewState) -> dict:
    """
    Validate and initialise interview session state.

    Responsibilities:
        - Confirm required fields are present (user_id, role, candidate_profile,
          max_questions).
        - Derive role_topics from the role string via _ROLE_TOPIC_MAP.
        - Extract candidate_topics from the profile's potential_interview_topics.
        - Build available_topics as the deduped union (role first, then profile).
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

    # Resolve role topics — longest matching key wins to avoid short-key
    # substring collisions (e.g. "ml" inside "email").
    normalized_role = role.lower()
    role_topics: list[str] = []
    best_key_len = 0
    for key, topics in _ROLE_TOPIC_MAP.items():
        if key in normalized_role and len(key) > best_key_len:
            role_topics = list(topics)
            best_key_len = len(key)
    if not role_topics:
        role_topics = list(_DEFAULT_TOPICS)

    # Extract interview topics from the profile.
    profile_topics: list[str] = candidate_profile.get("potential_interview_topics", [])
    if not isinstance(profile_topics, list):
        profile_topics = []

    # candidate_topics = profile topics NOT already in role_topics.
    role_topics_lower = {t.lower() for t in role_topics}
    candidate_topics: list[str] = [
        t for t in profile_topics if t.lower() not in role_topics_lower
    ]

    # available_topics = deduped union (role first, then profile extras).
    available_topics: list[str] = list(dict.fromkeys(role_topics + profile_topics))

    # Resolve current_topic.
    current_topic: str = state.get("current_topic", "").strip()
    if not current_topic:
        # No pre-set topic — use first role topic.
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
        # Pre-set topic is not in the valid topic pool — reset to first.
        current_topic = available_topics[0] if available_topics else role_topics[0]

    # Validate / default difficulty.
    current_difficulty: str = state.get("current_difficulty", "medium")
    if current_difficulty not in ("easy", "medium", "hard"):
        current_difficulty = "medium"

    return {
        "role_topics":        role_topics,
        "candidate_topics":   candidate_topics,
        "available_topics":   available_topics,
        "current_topic":      current_topic,
        "current_difficulty": current_difficulty,
        "topics_covered":     [],
        "current_question":   None,
        "current_answer":     None,
        "current_evaluation": None,
        "adaptive_decision":  None,
        "question_count":     0,
        "is_finished":        False,
        "interview_history":  [],
        "final_report":       None,
    }


# ===========================================================================
# NODE 2 — generate_question
# ===========================================================================

def generate_question(state: InterviewState) -> dict:
    """
    Generate the next interview question and commit it to state.

    This node ONLY generates the question — it does NOT pause for the answer.
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
    topics_covered: list[str] = list(state.get("topics_covered", []))
    question_count: int       = state.get("question_count", 0)
    history: list             = state.get("interview_history", [])

    # Extract the adaptive action string from the previous turn's decision.
    adaptive_decision_dict: dict = state.get("adaptive_decision") or {}
    adaptive_action: str = adaptive_decision_dict.get("next_action", "")

    question_data = _generate_question(
        candidate_profile,
        role,
        current_topic,
        current_difficulty,
        history,
        adaptive_action,
    )

    # Track covered topics (case-insensitive dedup).
    covered_lower = {t.lower() for t in topics_covered}
    if current_topic.lower() not in covered_lower:
        topics_covered = topics_covered + [current_topic]

    question_count = question_count + 1

    return {
        "current_question":   question_data,
        "topics_covered":     topics_covered,
        "question_count":     question_count,
        "current_answer":     None,    # clear answer from prior turn
        "current_evaluation": None,    # clear stale evaluation from prior turn
        "adaptive_decision":  None,    # clear stale decision from prior turn
    }


# ===========================================================================
# NODE 3 — wait_for_answer
# ===========================================================================

def wait_for_answer(state: InterviewState) -> dict:
    """
    Pause the graph and wait for the candidate's answer.

    This node calls interrupt() which suspends the graph at this point and
    saves a checkpoint.  The caller (FastAPI) receives control and can read
    the committed state (including current_question) from the checkpoint.

    When the candidate submits an answer, the caller resumes:

        from langgraph.types import Command
        graph.invoke(Command(resume=<answer_string>), config)

    LangGraph replays this node from the interrupt() call, and the return
    value of interrupt(...) becomes the answer string.

    Validates that the resumed answer is non-empty before committing it,
    to give a clear error rather than a cryptic RuntimeError one node later.

    Writes:
        current_answer — the candidate's raw answer text
    """
    current_question = state.get("current_question", {})
    question_count   = state.get("question_count", 0)

    candidate_answer: str = interrupt(
        {
            "event":    "answer_required",
            "question": current_question,
            "turn":     question_count,
        }
    )

    # Validate immediately so the error surfaces at the right node.
    if not str(candidate_answer).strip():
        raise ValueError(
            "wait_for_answer: answer cannot be empty. "
            "Resume with a non-empty string via Command(resume=<answer>)."
        )

    return {
        "current_answer": candidate_answer,
    }


# ===========================================================================
# NODE 4 — evaluate_answer
# ===========================================================================

def evaluate_answer(state: InterviewState) -> dict:
    """
    Evaluate the candidate's answer using the existing pure function.

    Reads:
        current_question  — the question dict (contains expected_concepts)
        current_answer    — the raw answer text submitted by the candidate

    Writes:
        current_evaluation — the full evaluation dict

    Raises:
        RuntimeError: if current_question or current_answer is missing/empty.
    """
    question_data    = state.get("current_question")
    candidate_answer = state.get("current_answer")

    if not question_data or not isinstance(question_data, dict):
        raise RuntimeError(
            "evaluate_answer: current_question is missing or invalid."
        )

    if not candidate_answer or not str(candidate_answer).strip():
        raise RuntimeError(
            "evaluate_answer: current_answer is empty."
        )

    question_text: str      = question_data.get("question", "")
    expected_concepts: list = question_data.get("expected_concepts", [])
    if not isinstance(expected_concepts, list):
        expected_concepts = []

    evaluation = _evaluate_answer(
        question_text,
        expected_concepts,
        candidate_answer,
    )

    return {
        "current_evaluation": evaluation,
    }


# ===========================================================================
# NODE 5 — run_adaptive_engine
# (registered in the graph as "adaptive_decision" for route compatibility)
# ===========================================================================

def run_adaptive_engine(state: InterviewState) -> dict:
    """
    Decide the next topic and difficulty using the existing pure function.
    Append the completed turn to interview_history.
    Set is_finished if the question limit or early-exit conditions are met.

    Reads:
        current_evaluation, current_topic, current_difficulty,
        topics_covered, role_topics, candidate_topics, available_topics,
        question_count, max_questions,
        current_question, current_answer, interview_history

    Writes:
        adaptive_decision  — the decision dict from decide_next_step
        current_topic      — updated for the next question
        current_difficulty — updated for the next question
        is_finished        — True if interview should end
        interview_history  — appended with the current turn record

    Raises:
        RuntimeError: if current_evaluation is missing or not a dict.
    """
    evaluation         = state.get("current_evaluation")
    current_topic      = state["current_topic"]
    current_difficulty = state["current_difficulty"]
    topics_covered: list[str]   = list(state.get("topics_covered", []))
    role_topics: list[str]      = list(state.get("role_topics", []))
    candidate_topics: list[str] = list(state.get("candidate_topics", []))
    available_topics: list[str] = list(state.get("available_topics", []))
    question_count: int         = state.get("question_count", 0)
    max_questions: int          = state["max_questions"]

    if not evaluation or not isinstance(evaluation, dict):
        raise RuntimeError(
            "run_adaptive_engine: current_evaluation is missing or invalid."
        )

    decision = _decide_next_step(
        evaluation=evaluation,
        current_topic=current_topic,
        current_difficulty=current_difficulty,
        topics_covered=topics_covered,
        role_topics=role_topics,
        candidate_topics=candidate_topics,
    )

    next_topic: str      = decision.get("next_topic", current_topic)
    next_difficulty: str = decision.get("difficulty", current_difficulty)

    # Append the completed turn FIRST so the current evaluation is included
    # in the early-exit score calculations below.
    history: list = list(state.get("interview_history", []))
    turn_record = {
        "turn":              question_count,
        "question":          state.get("current_question"),
        "answer":            state.get("current_answer"),
        "evaluation":        evaluation,
        "adaptive_decision": decision,
    }
    history = history + [turn_record]

    # Primary termination: question count limit reached.
    is_finished: bool = question_count >= max_questions

    # Adaptive early-termination (requires at least 5 completed turns).
    if not is_finished and question_count >= 5:
        scores    = [t.get("evaluation", {}).get("score", 0) for t in history]
        avg_score = sum(scores) / len(scores) if scores else 0

        # Early success: all available topics covered AND candidate scoring well.
        covered_lower   = {t.strip().lower() for t in topics_covered}
        available_lower = {t.strip().lower() for t in available_topics}
        covered_all     = covered_lower >= available_lower

        if covered_all and avg_score >= 7.5:
            is_finished = True
            logger.info(
                "Adaptive early finish: all topics covered, avg_score=%.1f", avg_score
            )

        # Early exit: candidate consistently struggling.
        elif avg_score < 3.0:
            is_finished = True
            logger.info(
                "Adaptive early finish: low avg_score=%.1f after %d questions",
                avg_score, question_count,
            )

    return {
        "adaptive_decision":  decision,
        "current_topic":      next_topic,
        "current_difficulty": next_difficulty,
        "interview_history":  history,
        "is_finished":        is_finished,
    }


# ===========================================================================
# NODE 6 — generate_final_report
# ===========================================================================

def generate_final_report(state: InterviewState) -> dict:
    """
    Summarise the completed interview from interview_history.

    Produces a report dict stored in state under "final_report".

    Uses:
        - state["topics_covered"]  — the actual tracked list (single source of truth)
          rather than re-deriving from history question dicts, which may differ
          if the AI returns a different topic string.
        - interview_history        — for scores, feedback, missing_concepts, actions.

    Note:
        is_finished is NOT re-set here — it was already set True by
        run_adaptive_engine (or should_continue routing logic).
        Setting it again here would be a double-write with no effect,
        but is removed for clarity.
    """
    history: list       = state.get("interview_history", [])
    role: str           = state.get("role", "")
    user_id             = state.get("user_id")
    question_count: int = state.get("question_count", 0)

    # Use the canonical topics_covered list from state — single source of truth.
    # This is the list maintained by generate_question (case-deduped).
    topics_covered: list[str] = list(state.get("topics_covered", []))

    # Aggregate scores.
    scores = [
        turn.get("evaluation", {}).get("score", 0)
        for turn in history
        if turn.get("evaluation")
    ]
    overall_score: float = round(sum(scores) / len(scores), 2) if scores else 0.0

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

    # Collect adaptive actions from history.
    adaptive_actions: list[str] = [
        turn.get("adaptive_decision", {}).get("next_action", "")
        for turn in history
        if turn.get("adaptive_decision", {}).get("next_action")
    ]

    # Generate narrative via AI (with graceful fallback).
    try:
        narrative = _generate_narrative(
            role=role,
            overall_score=overall_score,
            topics_covered=topics_covered,
            history=history,
        )
    except Exception:
        logger.warning("Narrative generation failed", exc_info=True)
        narrative = {
            "strengths":       ["Completed the interview session."],
            "weaknesses":      ["Could not generate weaknesses due to service error."],
            "recommendations": ["Review the questions asked."],
            "summary":         "The candidate completed the interview, but narrative generation failed.",
        }

    report = {
        "user_id":          user_id,
        "role":             role,
        "total_questions":  question_count,
        "overall_score":    overall_score,
        "topics_covered":   topics_covered,          # from state, not re-derived
        "adaptive_actions": adaptive_actions,
        "missing_concepts": unique_missing,
        "feedback_notes":   feedback_notes,
        "turn_details":     history,
        "strengths":        narrative.get("strengths", []),
        "weaknesses":       narrative.get("weaknesses", []),
        "recommendations":  narrative.get("recommendations", []),
        "summary":          narrative.get("summary", ""),
    }

    return {
        "final_report": report,
        # is_finished is already True from run_adaptive_engine — not re-set here.
    }


# ===========================================================================
# CONDITIONAL ROUTER — should_continue
# ===========================================================================

def should_continue(state: InterviewState) -> str:
    """
    Route after run_adaptive_engine:

        "finish"   → generate_final_report
        "continue" → generate_question  (loop)

    Single source of truth: is_finished (set by run_adaptive_engine).
    The router is intentionally thin — all business logic lives in the node.
    """
    return "finish" if state.get("is_finished", False) else "continue"


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

        # Start: runs plan → generate_question → wait_for_answer, then pauses.
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
    builder.add_node("wait_for_answer",       wait_for_answer)
    builder.add_node("evaluate_answer",       evaluate_answer)
    builder.add_node("adaptive_decision",     run_adaptive_engine)   # node name kept for graph compat
    builder.add_node("generate_final_report", generate_final_report)

    # ------------------------------------------------------------------
    # Edges — linear flow
    # ------------------------------------------------------------------
    builder.add_edge(START,                   "create_interview_plan")
    builder.add_edge("create_interview_plan", "generate_question")
    builder.add_edge("generate_question",     "wait_for_answer")
    builder.add_edge("wait_for_answer",       "evaluate_answer")
    builder.add_edge("evaluate_answer",       "adaptive_decision")

    # ------------------------------------------------------------------
    # Conditional edge — loop or finish
    # ------------------------------------------------------------------
    builder.add_conditional_edges(
        "adaptive_decision",
        should_continue,
        {
            "continue": "generate_question",
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
# Public lazy proxy — maintains backwards compatibility.
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

    __slots__ = ()   # no instance dict — all attrs delegate to the real graph

    def __getattr__(self, name: str):
        return getattr(get_interview_graph(), name)

    def __call__(self, *args, **kwargs):
        return get_interview_graph()(*args, **kwargs)


interview_graph = _LazyGraphProxy()

