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

from langgraph.graph import StateGraph, END, START
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import interrupt, Command  # noqa: F401 — Command re-exported for callers

from langgraph_workflow.interview_state import InterviewState

# ---------------------------------------------------------------------------
# Import existing pure AI functions — zero logic duplication.
# ---------------------------------------------------------------------------
from question_intellegence.question_generator import generate_question as _generate_question
from answer_intellegence.answer_evaluator import evaluate_answer as _evaluate_answer
from adaptive_intellegence.adaptive_engine import decide_next_step as _decide_next_step


# ===========================================================================
# NODE 1 — create_interview_plan
# ===========================================================================

def create_interview_plan(state: InterviewState) -> dict:
    """
    Validate and initialise interview session state.

    Responsibilities:
        - Confirm required fields are present (user_id, role, candidate_profile).
        - Extract available_topics from the candidate profile.
        - Set the initial topic and difficulty if they were not pre-set.
        - Reset counters and history accumulators to known-good values.

    Does NOT:
        - Call Supabase.
        - Call any AI API.
        - Generate questions.
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

    # Extract interview topics from the profile.
    available_topics: list = candidate_profile.get(
        "potential_interview_topics", []
    )
    if not isinstance(available_topics, list):
        available_topics = []

    # Use the first available topic if none is pre-set.
    current_topic = state.get("current_topic", "").strip()
    if not current_topic:
        if available_topics:
            current_topic = available_topics[0]
        else:
            raise ValueError(
                "create_interview_plan: no interview topics found in "
                "candidate_profile and no current_topic was pre-set."
            )

    # Use "medium" as a sensible default starting difficulty.
    current_difficulty = state.get("current_difficulty", "medium")
    if current_difficulty not in ("easy", "medium", "hard"):
        current_difficulty = "medium"

    max_questions = state.get("max_questions")
    if not isinstance(max_questions, int) or max_questions <= 0:
        raise ValueError(
            "create_interview_plan: max_questions must be a positive integer."
        )

    return {
        "available_topics": available_topics,
        "current_topic": current_topic,
        "current_difficulty": current_difficulty,
        "topics_covered": [],
        "current_question": None,
        "current_answer": None,
        "current_evaluation": None,
        "adaptive_decision": None,
        "question_count": 0,
        "is_finished": False,
        "interview_history": [],
        "final_report": None,
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
        topics_covered, question_count

    Writes:
        current_question, topics_covered, question_count,
        current_evaluation (cleared), adaptive_decision (cleared),
        current_answer (cleared)
    """
    candidate_profile = state["candidate_profile"]
    role = state["role"]
    current_topic = state["current_topic"]
    current_difficulty = state["current_difficulty"]
    topics_covered: list = list(state.get("topics_covered", []))
    question_count: int = state.get("question_count", 0)

    # Generate question via the existing pure function.
    question_data = _generate_question(
        candidate_profile,
        role,
        current_topic,
        current_difficulty,
    )

    # Track the topic.
    if current_topic not in topics_covered:
        topics_covered = topics_covered + [current_topic]

    question_count = question_count + 1

    return {
        "current_question": question_data,
        "topics_covered": topics_covered,
        "question_count": question_count,
        "current_answer": None,       # clear answer from prior turn
        "current_evaluation": None,   # clear stale evaluation from prior turn
        "adaptive_decision": None,    # clear stale decision from prior turn
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

        graph.invoke(Command(resume=<answer_string>), config)

    LangGraph replays this node from the interrupt() call, and the return
    value of interrupt(...) becomes the answer string.

    Writes:
        current_answer — the candidate's raw answer text
    """
    current_question = state.get("current_question", {})
    question_count = state.get("question_count", 0)

    # interrupt() pauses the graph.  The value returned by interrupt()
    # on resume is whatever is passed to Command(resume=<value>).
    candidate_answer: str = interrupt(
        {
            "event": "answer_required",
            "question": current_question,
            "turn": question_count,
        }
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
    """
    question_data = state.get("current_question")
    candidate_answer = state.get("current_answer")

    if not question_data or not isinstance(question_data, dict):
        raise RuntimeError(
            "evaluate_answer: current_question is missing or invalid."
        )

    if not candidate_answer or not str(candidate_answer).strip():
        raise RuntimeError(
            "evaluate_answer: current_answer is empty."
        )

    question_text: str = question_data.get("question", "")
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
# NODE 5 — adaptive_decision
# ===========================================================================

def adaptive_decision(state: InterviewState) -> dict:
    """
    Decide the next topic and difficulty using the existing pure function.
    Append the completed turn to interview_history.

    Reads:
        current_evaluation, current_topic, current_difficulty,
        topics_covered, available_topics, question_count, max_questions

    Writes:
        adaptive_decision
        current_topic
        current_difficulty
        is_finished
        interview_history  (appended)
    """
    evaluation = state.get("current_evaluation")
    current_topic = state["current_topic"]
    current_difficulty = state["current_difficulty"]
    topics_covered: list = list(state.get("topics_covered", []))
    available_topics: list = list(state.get("available_topics", []))
    question_count: int = state.get("question_count", 0)
    max_questions: int = state["max_questions"]

    if not evaluation or not isinstance(evaluation, dict):
        raise RuntimeError(
            "adaptive_decision: current_evaluation is missing or invalid."
        )

    # Call the existing pure decision function.
    decision = _decide_next_step(
        evaluation=evaluation,
        current_topic=current_topic,
        current_difficulty=current_difficulty,
        topics_covered=topics_covered,
        available_topics=available_topics,
    )

    # Determine next topic and difficulty from the decision.
    next_topic: str = decision.get("next_topic", current_topic)
    next_difficulty: str = decision.get("difficulty", current_difficulty)

    # Record this completed turn in interview_history.
    history: list = list(state.get("interview_history", []))
    turn_record = {
        "turn": question_count,
        "question": state.get("current_question"),
        "answer": state.get("current_answer"),
        "evaluation": evaluation,
        "adaptive_decision": decision,
    }
    history = history + [turn_record]

    # Mark finished if question limit has been reached.
    is_finished: bool = question_count >= max_questions

    return {
        "adaptive_decision": decision,
        "current_topic": next_topic,
        "current_difficulty": next_difficulty,
        "interview_history": history,
        "is_finished": is_finished,
    }


# ===========================================================================
# NODE 6 — generate_final_report
# ===========================================================================

def generate_final_report(state: InterviewState) -> dict:
    """
    Summarise the completed interview from interview_history.

    For Step 2, the report is an in-memory dict only.
    No Supabase writes.  No Gemini calls.

    The report dict is stored in state under the key "final_report"
    (part of InterviewState as of Step 1 revision).
    """
    history: list = state.get("interview_history", [])
    role: str = state.get("role", "")
    user_id = state.get("user_id")
    question_count: int = state.get("question_count", 0)

    # Aggregate scores across turns.
    scores = [
        turn.get("evaluation", {}).get("score", 0)
        for turn in history
        if turn.get("evaluation")
    ]
    overall_score: float = (
        round(sum(scores) / len(scores), 2) if scores else 0.0
    )

    # Collect all feedback strings.
    feedback_notes = [
        turn.get("evaluation", {}).get("feedback", "")
        for turn in history
        if turn.get("evaluation", {}).get("feedback")
    ]

    # Collect missing concepts across all turns.
    all_missing: list = []
    for turn in history:
        missing = turn.get("evaluation", {}).get("missing_concepts", [])
        if isinstance(missing, list):
            all_missing.extend(missing)
    # Deduplicate while preserving order.
    seen: set = set()
    unique_missing: list = []
    for concept in all_missing:
        key = str(concept).strip().lower()
        if key and key not in seen:
            seen.add(key)
            unique_missing.append(concept)

    # Collect topics and adaptive actions for summary.
    topics_interviewed = [
        turn.get("question", {}).get("topic", "")
        for turn in history
        if turn.get("question", {}).get("topic")
    ]
    adaptive_actions = [
        turn.get("adaptive_decision", {}).get("next_action", "")
        for turn in history
        if turn.get("adaptive_decision", {}).get("next_action")
    ]

    report = {
        "user_id": user_id,
        "role": role,
        "total_questions": question_count,
        "overall_score": overall_score,
        "topics_covered": topics_interviewed,
        "adaptive_actions": adaptive_actions,
        "missing_concepts": unique_missing,
        "feedback_notes": feedback_notes,
        "turn_details": history,
    }

    return {
        "final_report": report,
        "is_finished": True,
    }


# ===========================================================================
# CONDITIONAL ROUTER — should_continue
# ===========================================================================

def should_continue(state: InterviewState) -> str:
    """
    Route after adaptive_decision:

        "finish"   → generate_final_report
        "continue" → generate_question  (loop)

    Termination conditions (either is sufficient):
        1. question_count >= max_questions
        2. is_finished is already True (set by adaptive_decision)
    """
    if state.get("is_finished", False):
        return "finish"

    question_count: int = state.get("question_count", 0)
    max_questions: int = state.get("max_questions", 0)

    if question_count >= max_questions:
        return "finish"

    return "continue"


# ===========================================================================
# GRAPH ASSEMBLY
# ===========================================================================

def build_interview_graph(checkpointer=None):
    """
    Assemble and compile the interview graph.

    Args:
        checkpointer: A LangGraph checkpointer instance.
                      Defaults to MemorySaver() for in-process use.
                      Pass a custom checkpointer for production.

    Returns:
        A compiled LangGraph CompiledStateGraph ready for invoke/stream.

    Usage:
        graph = build_interview_graph()
        config = {"configurable": {"thread_id": "interview-42"}}

        # Start: runs plan + generate_question + wait_for_answer, then pauses.
        graph.invoke(initial_state, config)

        # Read the committed question from state.
        question = graph.get_state(config).values["current_question"]

        # Resume with candidate's answer.
        from langgraph.types import Command
        graph.invoke(Command(resume="My answer text"), config)
    """
    if checkpointer is None:
        checkpointer = MemorySaver()

    builder = StateGraph(InterviewState)

    # ------------------------------------------------------------------
    # Register nodes
    # ------------------------------------------------------------------
    builder.add_node("create_interview_plan", create_interview_plan)
    builder.add_node("generate_question",     generate_question)
    builder.add_node("wait_for_answer",       wait_for_answer)
    builder.add_node("evaluate_answer",       evaluate_answer)
    builder.add_node("adaptive_decision",     adaptive_decision)
    builder.add_node("generate_final_report", generate_final_report)

    # ------------------------------------------------------------------
    # Edges — linear flow
    # ------------------------------------------------------------------
    builder.add_edge(START,                    "create_interview_plan")
    builder.add_edge("create_interview_plan",  "generate_question")
    builder.add_edge("generate_question",      "wait_for_answer")
    # wait_for_answer → evaluate_answer  (after interrupt/resume)
    builder.add_edge("wait_for_answer",        "evaluate_answer")
    builder.add_edge("evaluate_answer",        "adaptive_decision")

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

    # ------------------------------------------------------------------
    # Compile
    # ------------------------------------------------------------------
    return builder.compile(checkpointer=checkpointer)


# ===========================================================================
# Module-level default graph instance
# (used by tests and the future FastAPI router)
# ===========================================================================

interview_graph = build_interview_graph()
