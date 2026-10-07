"""
interview_state.py

Defines the LangGraph graph state for the AI MOCKORA interview workflow.

This module has NO dependencies on:
    - Gemini API
    - Supabase
    - FastAPI
    - InterviewEngine
    - Any external service

It uses Python standard library typing only.

The state is a TypedDict — every key must be present in the dict
passed to the graph. Optional fields are declared with total=False
in the _InterviewStateOptional mixin so callers are not forced to
supply them at construction time.
"""

from typing import Any, Literal, Optional
try:
    # Python 3.11+
    from typing import TypedDict
except ImportError:
    from typing_extensions import TypedDict


# =============================================================================
# Nested-structure type aliases
# (kept as aliases rather than TypedDicts to avoid over-constraining
#  the AI-function return types, which are validated at runtime)
# =============================================================================

QuestionDict       = dict[str, Any]   # {question, topic, difficulty, question_type, expected_concepts}
EvaluationDict     = dict[str, Any]   # {score, correctness, completeness, technical_depth, …}
AdaptiveDecisionDict = dict[str, Any] # {next_action, next_topic, difficulty, reason}
TurnRecord         = dict[str, Any]   # {turn, question, answer, evaluation, adaptive_decision}
ReportDict         = dict[str, Any]   # {user_id, role, total_questions, overall_score, …}


# =============================================================================
# Required fields — every graph invocation must supply these
# =============================================================================

class _InterviewStateRequired(TypedDict):
    # --- Identity ---
    user_id: int
    """
    Integer user ID from the Supabase users table.
    Comes from the JWT token parsed by get_current_user.
    Used to tie graph state to a real authenticated user.
    """

    # --- Candidate Profile ---
    candidate_profile: dict[str, Any]
    """
    Full structured profile returned by analyze_resume().
    Schema mirrors CANDIDATE_PROFILE_SCHEMA in resume_analyzer.py.
    Includes: candidate, education, skills, projects, experience,
              certifications, achievements, expertise_areas,
              potential_interview_topics.
    Set once at graph start. Never modified during the interview.
    """

    role: str
    """
    Target job role string selected by the user at interview start.
    Example: "Python Backend Developer"
    Passed to generate_question() on every turn.
    """

    role_topics: list[str]
    """
    List of topics derived exclusively from the candidate's target role.
    Populated by create_interview_plan.
    """

    candidate_topics: list[str]
    """
    List of topics derived from the candidate's resume/profile that are
    NOT already in role_topics.
    Populated by create_interview_plan.
    """

    available_topics: list[str]
    """
    Union of role_topics + profile topics (deduped).
    Kept for backwards compatibility. Prefer role_topics / candidate_topics
    for new code.
    """

    # --- Running Interview Context ---
    current_topic: str
    """
    The topic to use for the NEXT question generation call.
    Updated by the adaptive_decision node after every answer.
    Initial value set from the first role topic or user choice.
    """

    current_difficulty: Literal["easy", "medium", "hard"]
    """
    The difficulty level for the NEXT question.
    Updated by the adaptive_decision node after every answer.
    Initial value: "medium" (unless overridden at start).
    """

    topics_covered: list[str]
    """
    Topics the candidate has sufficiently covered: a reasonable score
    (typically >= 7) or a completed follow-up cycle. Not marked merely
    because a question was asked.
    """

    # --- Progress and Termination ---
    question_count: int
    """
    Number of questions generated so far in this interview.
    Incremented by the generate_question node.
    Initial value: 0
    """

    max_questions: int
    """
    Maximum number of questions for this interview session.
    Set at graph start from user/system configuration.
    Typically 5–15. Used as the termination threshold.
    """

    is_finished: bool
    """
    True when the interview has completed.
    Set by the adaptive_decision node; read by should_continue.
    Initial value: False
    """

    # --- History ---
    interview_history: list[TurnRecord]
    """
    Ordered list of completed turn records. Each TurnRecord contains:

        {
            "turn":              int,   # equals question_count at time of recording
            "question":          dict,  # the full question dict
            "answer":            str,   # the candidate's answer text
            "evaluation":        dict,  # the full evaluation dict
            "adaptive_decision": dict,  # the full adaptive decision dict
        }

    Appended by the adaptive_decision node at the end of each turn.
    Used by generate_final_report to build the interview summary.
    Empty list at graph start.
    """


# =============================================================================
# Optional fields — absent at construction; set by nodes as the graph runs
# =============================================================================

class _InterviewStateOptional(TypedDict, total=False):
    # --- Identity (optional until set by create_interview_plan) ---
    interview_id: int
    """
    Integer primary key of the interviews row in Supabase.
    Set by the create_interview_plan node after the DB insert.
    Absent before that node runs.
    Convert to str when using as LangGraph thread_id: str(interview_id).
    NOTE: validate this is not None before constructing the thread_id.
    """

    interview_brief: dict[str, Any]
    """
    PII-free role + candidate context used by question generation and evaluation.
    Populated by create_interview_plan.
    """

    followups_on_current_topic: int
    """Number of follow-up questions already asked on current_topic."""

    max_followups_per_topic: int
    """Configurable follow-up limit per topic. Default 2."""

    # --- Current Turn — transient, cleared at the start of each cycle ---
    current_question: QuestionDict
    """
    The question dict returned by generate_question() for the current turn.
    Schema: {question, topic, difficulty, question_type, expected_concepts}
    Set by the generate_question node; cleared at the start of the next.
    """

    current_answer: str
    """
    The raw answer text submitted by the candidate via the React frontend.
    Injected into graph state by FastAPI when the graph is resumed
    (after the INTERRUPT in the wait_for_answer node).
    Cleared at the start of each new question cycle.
    """

    interviewer_feedback: str
    """
    Short candidate-facing reaction after the latest answer.
    Safe to return to the frontend. Never includes expected_concepts.
    """

    current_evaluation: EvaluationDict
    """
    The evaluation dict returned by evaluate_answer() for the current turn.
    Schema: {score, correctness, completeness, technical_depth,
             missing_concepts, confidence, needs_followup, feedback}
    Set by the evaluate_answer node; cleared at the start of the next cycle.
    """

    adaptive_decision: AdaptiveDecisionDict
    """
    The decision dict returned by decide_next_step() for the current turn.
    Schema: {next_action, next_topic, difficulty, reason}
    next_action is one of: "follow_up", "easier", "harder", "new_topic", "same_topic"
    Set by the adaptive_decision node; cleared at the start of the next cycle.
    """

    topics_visited: list[str]
    """
    Every topic the engine has navigated to (including weak ones), regardless
    of mastery score. Used to prevent A→B→A→B ping-pong for weak candidates.
    A topic is added to this list when next_action == "new_topic".
    Initialized from topics_covered for backward compatibility.
    """

    # --- Result ---
    final_report: ReportDict
    """
    The completed interview report dict produced by generate_final_report.
    Absent during the running interview; set when the graph reaches END.
    Contains: user_id, role, total_questions, overall_score,
              topics_covered, adaptive_actions, missing_concepts,
              feedback_notes, turn_details, strengths, weaknesses,
              recommendations, summary.
    """


# =============================================================================
# InterviewState — the public type used throughout the graph
# =============================================================================

class InterviewState(_InterviewStateRequired, _InterviewStateOptional):
    """
    LangGraph graph state for one complete AI MOCKORA interview session.

    Inherits required fields from _InterviewStateRequired and optional
    (total=False) fields from _InterviewStateOptional.

    Lifecycle:
        - Created by FastAPI at POST /interview/start
        - Carried through the LangGraph graph nodes
        - Persisted between HTTP requests via the LangGraph checkpointer
        - Tied to a unique Supabase interview row via interview_id

    NOT in state:
        raw_resume_text   — consumed before the graph starts
        resume_id         — Supabase concern only
        report            — produced at END node, not in running state
    """


# =============================================================================
# Convenience: all field names — derived automatically so they never drift
# =============================================================================

import typing as _typing

INTERVIEW_STATE_FIELDS: tuple = tuple(
    _typing.get_type_hints(InterviewState).keys()
)
