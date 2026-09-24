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
passed to the graph. Optional fields may be None at certain stages.
"""

from typing import Optional


# =============================================================================
# InterviewState
# =============================================================================

class InterviewState(dict):
    """
    LangGraph graph state for one complete AI MOCKORA interview session.

    Lifecycle:
        - Created by FastAPI at POST /interview/start
        - Carried through the LangGraph graph nodes
        - Persisted between HTTP requests via the LangGraph checkpointer
        - Tied to a unique Supabase interview row via interview_id

    Field categories:
        Identity          — who owns this interview and its DB record
        Candidate Profile — resume-derived data, set once at start
        Running Context   — topic/difficulty that change each turn
        Current Turn      — transient per-turn data (cleared each cycle)
        Progress          — counters and termination flag
        History           — accumulated turn records for final report

    NOT in state:
        raw_resume_text   — consumed before the graph starts
        resume_id         — Supabase concern only
        report            — produced at END node, not in running state
    """

    # -------------------------------------------------------------------------
    # Identity
    # -------------------------------------------------------------------------

    user_id: int
    """
    Integer user ID from the Supabase users table.
    Comes from the JWT token parsed by get_current_user.
    Used to tie graph state to a real authenticated user.
    """

    interview_id: Optional[int]
    """
    Integer primary key of the interviews row in Supabase.
    Set by the create_interview_plan node after the DB insert.
    None before that node runs.
    Used as the LangGraph thread_id: str(interview_id).
    """

    # -------------------------------------------------------------------------
    # Candidate Profile
    # -------------------------------------------------------------------------

    candidate_profile: dict
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

    available_topics: list
    """
    List of topic strings from candidate_profile["potential_interview_topics"].
    Extracted at graph start and stored here so decide_next_step()
    can find uncovered topics without re-reading the full profile.
    """

    # -------------------------------------------------------------------------
    # Running Interview Context
    # -------------------------------------------------------------------------

    current_topic: str
    """
    The topic to use for the NEXT question generation call.
    Updated by the adaptive_decision node after every answer.
    Initial value set from the first available topic or user choice.
    """

    current_difficulty: str
    """
    The difficulty level for the NEXT question: "easy", "medium", or "hard".
    Updated by the adaptive_decision node after every answer.
    Initial value: "medium" (unless overridden at start).
    """

    topics_covered: list
    """
    Ordered list of topic strings for which at least one question has
    been generated. Used by decide_next_step() via _get_next_topic()
    to avoid repeating exhausted topics.
    Grows by one entry per generate_question node execution.
    """

    # -------------------------------------------------------------------------
    # Current Turn — transient fields, cleared at the start of each cycle
    # -------------------------------------------------------------------------

    current_question: Optional[dict]
    """
    The question dict returned by generate_question() for the current turn.
    Schema: {question, topic, difficulty, question_type, expected_concepts}
    Set by the generate_question node.
    None before the first question is generated or after the interview ends.
    """

    current_answer: Optional[str]
    """
    The raw answer text submitted by the candidate via the React frontend.
    Injected into graph state by FastAPI when the graph is resumed
    (after the INTERRUPT in the generate_question node).
    None until the candidate submits their answer.
    """

    current_evaluation: Optional[dict]
    """
    The evaluation dict returned by evaluate_answer() for the current turn.
    Schema: {score, correctness, completeness, technical_depth,
             missing_concepts, confidence, needs_followup, feedback}
    Set by the evaluate_answer node.
    None before the first answer is evaluated.
    """

    adaptive_decision: Optional[dict]
    """
    The decision dict returned by decide_next_step() for the current turn.
    Schema: {next_action, next_topic, difficulty, reason}
    next_action is one of: follow_up, easier, harder, new_topic
    Set by the adaptive_decision node.
    None before the first adaptive decision is made.
    """

    # -------------------------------------------------------------------------
    # Progress and Termination
    # -------------------------------------------------------------------------

    question_count: int
    """
    Number of questions generated so far in this interview.
    Incremented by the generate_question node.
    Compared against max_questions by the should_continue router.
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
    True when the interview has completed (question_count >= max_questions).
    Set by the adaptive_decision node before routing to generate_final_report.
    Initial value: False
    """

    # -------------------------------------------------------------------------
    # History — accumulated across all turns
    # -------------------------------------------------------------------------

    interview_history: list
    """
    Ordered list of completed turn records. Each entry is a dict:

        {
            "turn":             int,   # 1-indexed turn number
            "question":         dict,  # the full question dict
            "answer":           str,   # the candidate's answer text
            "evaluation":       dict,  # the full evaluation dict
            "adaptive_decision": dict, # the full adaptive decision dict
        }

    Appended by the adaptive_decision node at the end of each turn.
    Used by generate_final_report to build the interview summary.
    Empty list at graph start.
    """

    final_report: Optional[dict]
    """
    The completed interview report dict produced by generate_final_report.
    None during the running interview.
    Set when the graph reaches the END node.
    Contains: user_id, role, total_questions, overall_score,
              topics_covered, adaptive_actions, missing_concepts,
              feedback_notes, turn_details.
    """


# =============================================================================
# Convenience: all field names for test validation
# =============================================================================

INTERVIEW_STATE_FIELDS: tuple = (
    "user_id",
    "interview_id",
    "candidate_profile",
    "role",
    "available_topics",
    "current_topic",
    "current_difficulty",
    "topics_covered",
    "current_question",
    "current_answer",
    "current_evaluation",
    "adaptive_decision",
    "question_count",
    "max_questions",
    "is_finished",
    "interview_history",
    "final_report",
)
