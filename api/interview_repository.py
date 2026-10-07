"""
interview_repository.py

Clean persistence layer for AI MOCKORA interview data.

All Supabase / PostgREST logic lives here. Nothing outside this module
should hold raw Supabase queries for interview-related tables.

Uses the existing `supabase` client from api.db — no second client created.

Data-type contracts
-------------------
expected_concepts : Python list  → jsonb column  (passed as-is; PostgREST serialises)
topics_covered    : Python list  → jsonb column  (passed as-is; PostgREST serialises)
missing_concepts  : Python list  → text column   (JSON-serialised to string; schema NOT changed)
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from api.db import supabase


# ---------------------------------------------------------------------------
# Internal helper
# ---------------------------------------------------------------------------

def _single(result) -> Dict[str, Any]:
    """Return the first row from a Supabase result or raise RuntimeError."""
    if not result.data:
        raise RuntimeError("Supabase returned no rows for the operation.")
    return result.data[0]


# ---------------------------------------------------------------------------
# 1. create_interview
# ---------------------------------------------------------------------------

def create_interview(
    *,
    user_id: int,
    role: str,
    max_questions: int,
    resume_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Insert a new row into `interviews` and return it.

    Sets:
        status        = "started"
        question_count = 0
        started_at    = DEFAULT (Supabase sets this via column default)

    Returns the full created row including `interview_id`.
    """
    payload: Dict[str, Any] = {
        "user_id": user_id,
        "role": role,
        "max_questions": max_questions,
        "question_count": 0,
        "status": "started",
    }
    if resume_id is not None:
        payload["resume_id"] = resume_id

    try:
        result = supabase.table("interviews").insert(payload).execute()
        return _single(result)
    except RuntimeError:
        raise
    except Exception as exc:
        raise RuntimeError(f"create_interview failed: {exc}") from exc


# ---------------------------------------------------------------------------
# 2. update_interview_state
# ---------------------------------------------------------------------------

def update_interview_state(
    interview_id: int,
    *,
    current_topic: Optional[str] = None,
    current_difficulty: Optional[str] = None,
    question_count: Optional[int] = None,
    max_questions: Optional[int] = None,
    status: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Update mutable session-state fields on an interview row.

    Only fields explicitly passed (non-None) are included in the UPDATE.
    Returns the updated row.
    """
    updates: Dict[str, Any] = {}

    if current_topic is not None:
        updates["current_topic"] = current_topic
    if current_difficulty is not None:
        updates["current_difficulty"] = current_difficulty
    if question_count is not None:
        updates["question_count"] = question_count
    if max_questions is not None:
        updates["max_questions"] = max_questions
    if status is not None:
        updates["status"] = status

    if not updates:
        raise ValueError("update_interview_state: no fields to update were supplied.")

    try:
        result = (
            supabase.table("interviews")
            .update(updates)
            .eq("interview_id", interview_id)
            .execute()
        )
        return _single(result)
    except (ValueError, RuntimeError):
        raise
    except Exception as exc:
        raise RuntimeError(
            f"update_interview_state failed for interview_id={interview_id}: {exc}"
        ) from exc


# ---------------------------------------------------------------------------
# 3. create_question
# ---------------------------------------------------------------------------

def create_question(
    *,
    interview_id: int,
    question_text: str,
    topic: Optional[str] = None,
    difficulty: Optional[str] = None,
    question_type: Optional[str] = None,
    question_order: Optional[int] = None,
    expected_concepts: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Insert a question row linked to an interview.

    `expected_concepts` is a Python list — passed directly to the jsonb column;
    PostgREST handles JSON serialisation.

    Returns the created row including `question_id`.
    """
    payload: Dict[str, Any] = {
        "interview_id": interview_id,
        "question_text": question_text,
    }
    if topic is not None:
        payload["topic"] = topic
    if difficulty is not None:
        payload["difficulty"] = difficulty
    if question_type is not None:
        payload["question_type"] = question_type
    if question_order is not None:
        payload["question_order"] = question_order
    # expected_concepts: list → jsonb (PostgREST accepts a Python list directly)
    if expected_concepts is not None:
        payload["expected_concepts"] = expected_concepts

    try:
        result = supabase.table("questions").insert(payload).execute()
        return _single(result)
    except RuntimeError:
        raise
    except Exception as exc:
        raise RuntimeError(
            f"create_question failed for interview_id={interview_id}: {exc}"
        ) from exc


# ---------------------------------------------------------------------------
# 4. create_answer
# ---------------------------------------------------------------------------

def create_answer(
    *,
    question_id: int,
    answer_text: str,
) -> Dict[str, Any]:
    """
    Insert an answer row for a question.

    `question_id` has a UNIQUE constraint — one answer per question enforced by DB.

    Returns the created row including `answer_id`.
    """
    payload: Dict[str, Any] = {
        "question_id": question_id,
        "answer_text": answer_text,
    }

    try:
        result = supabase.table("answers").insert(payload).execute()
        return _single(result)
    except RuntimeError:
        raise
    except Exception as exc:
        raise RuntimeError(
            f"create_answer failed for question_id={question_id}: {exc}"
        ) from exc


# ---------------------------------------------------------------------------
# 4b. get_answer_by_question_id
# ---------------------------------------------------------------------------

def get_answer_by_question_id(question_id: int) -> Optional[Dict[str, Any]]:
    """
    Fetch an existing answer by its unique question_id.
    Used to recover safely if an answer submission is retried.
    """
    try:
        result = (
            supabase.table("answers")
            .select("*")
            .eq("question_id", question_id)
            .limit(1)
            .execute()
        )
        if not result.data:
            return None
        return result.data[0]
    except Exception as exc:
        raise RuntimeError(
            f"get_answer_by_question_id failed for question_id={question_id}: {exc}"
        ) from exc


# ---------------------------------------------------------------------------
# 5. create_evaluation
# ---------------------------------------------------------------------------

def save_interview_turn_transaction(
    *,
    answer_id: int,
    interview_id: int,
    # evaluation args
    score: Optional[float] = None,
    correctness: Optional[Any] = None,
    completeness: Optional[Any] = None,
    technical_depth: Optional[Any] = None,
    confidence: Optional[Any] = None,
    missing_concepts: Optional[List[str]] = None,
    feedback: Optional[str] = None,
    needs_followup: Optional[bool] = None,
    # decision args
    next_action: Optional[str] = None,
    next_topic: Optional[str] = None,
    difficulty: Optional[str] = None,
    reason: Optional[str] = None,
    # interview args
    current_topic: Optional[str] = None,
    current_difficulty: Optional[str] = None,
    question_count: Optional[int] = None,
    max_questions: Optional[int] = None,
    status: Optional[str] = None,
    # question args
    question_text: Optional[str] = None,
    question_topic: Optional[str] = None,
    question_difficulty: Optional[str] = None,
    expected_concepts: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Save the evaluation, decision, interview state, and optional new question atomically using the save_interview_turn RPC.
    """
    payload: Dict[str, Any] = {
        "p_answer_id": answer_id,
        "p_interview_id": interview_id,
        "p_score": score,
        "p_correctness": float(correctness) if correctness is not None else None,
        "p_completeness": float(completeness) if completeness is not None else None,
        "p_technical_depth": int(technical_depth) if technical_depth is not None else None,
        "p_confidence": float(confidence) if confidence is not None else None,
        "p_missing_concepts": json.dumps(missing_concepts, ensure_ascii=False) if missing_concepts is not None else None,
        "p_feedback": feedback,
        "p_needs_followup": bool(needs_followup) if needs_followup is not None else None,
        "p_next_action": next_action,
        "p_next_topic": next_topic,
        "p_difficulty": difficulty,
        "p_reason": reason,
        "p_current_topic": current_topic,
        "p_current_difficulty": current_difficulty,
        "p_question_count": question_count,
        "p_max_questions": max_questions,
        "p_status": status,
        "p_question_text": question_text,
        "p_question_topic": question_topic,
        "p_question_difficulty": question_difficulty,
        "p_expected_concepts": json.dumps(expected_concepts, ensure_ascii=False) if expected_concepts is not None else None,
    }
    
    # Remove None values to use the SQL DEFAULT NULL defined in the RPC
    payload = {k: v for k, v in payload.items() if v is not None}

    try:
        result = supabase.rpc("save_interview_turn", payload).execute()
        if isinstance(result.data, list):
            if not result.data:
                raise RuntimeError("Supabase returned no rows for the operation.")
            return result.data[0]
        return result.data or {}
    except Exception as exc:
        raise RuntimeError(
            f"save_interview_turn_transaction failed for interview_id={interview_id}: type={type(exc)} repr={repr(exc)}"
        ) from exc


# ---------------------------------------------------------------------------
# 5b. create_evaluation
# ---------------------------------------------------------------------------

def create_evaluation(
    *,
    answer_id: int,
    score: Optional[float] = None,
    correctness: Optional[Any] = None,
    completeness: Optional[Any] = None,
    technical_depth: Optional[Any] = None,
    confidence: Optional[Any] = None,
    missing_concepts: Optional[List[str]] = None,
    feedback: Optional[str] = None,
    needs_followup: Optional[bool] = None,
) -> Dict[str, Any]:
    """
    Insert an evaluation row linked to an answer.

    missing_concepts : Python list → JSON string → TEXT column.
        The database column is TEXT; we JSON-serialise the list so it can be
        reconstructed later without changing the schema.

    All other numeric fields (score, correctness, completeness, technical_depth,
    confidence) are accepted as-is; Supabase coerces them to their column types.

    Returns the created row including `evaluation_id`.
    """
    payload: Dict[str, Any] = {"answer_id": answer_id}

    if score is not None:
        payload["score"] = score
    if correctness is not None:
        payload["correctness"] = float(correctness)
    if completeness is not None:
        payload["completeness"] = float(completeness)
    if technical_depth is not None:
        payload["technical_depth"] = int(technical_depth)
    if confidence is not None:
        payload["confidence"] = float(confidence)
    # missing_concepts: list → JSON string (TEXT column, schema unchanged)
    if missing_concepts is not None:
        payload["missing_concepts"] = json.dumps(missing_concepts, ensure_ascii=False)
    if feedback is not None:
        payload["feedback"] = feedback
    if needs_followup is not None:
        payload["needs_followup"] = bool(needs_followup)

    try:
        result = supabase.table("evaluations").insert(payload).execute()
        return _single(result)
    except RuntimeError:
        raise
    except Exception as exc:
        raise RuntimeError(
            f"create_evaluation failed for answer_id={answer_id}: {exc}"
        ) from exc


# ---------------------------------------------------------------------------
# 6. create_adaptive_decision
# ---------------------------------------------------------------------------

def create_adaptive_decision(
    *,
    evaluation_id: int,
    next_action: Optional[str] = None,
    next_topic: Optional[str] = None,
    difficulty: Optional[str] = None,
    reason: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Insert an adaptive_decisions row linked to an evaluation.

    Returns the created row including `decision_id`.
    """
    payload: Dict[str, Any] = {"evaluation_id": evaluation_id}

    if next_action is not None:
        payload["next_action"] = next_action
    if next_topic is not None:
        payload["next_topic"] = next_topic
    if difficulty is not None:
        payload["difficulty"] = difficulty
    if reason is not None:
        payload["reason"] = reason

    try:
        result = supabase.table("adaptive_decisions").insert(payload).execute()
        return _single(result)
    except RuntimeError:
        raise
    except Exception as exc:
        raise RuntimeError(
            f"create_adaptive_decision failed for evaluation_id={evaluation_id}: {exc}"
        ) from exc


# ---------------------------------------------------------------------------
# 7. complete_interview
# ---------------------------------------------------------------------------

def complete_interview(interview_id: int) -> Dict[str, Any]:
    """
    Mark an interview as completed.

    Sets:
        status       = "completed"
        completed_at = current UTC timestamp (ISO-8601 string)

    Returns the updated row.
    """
    now_utc = datetime.now(timezone.utc).isoformat()
    updates = {
        "status": "completed",
        "completed_at": now_utc,
    }

    try:
        result = (
            supabase.table("interviews")
            .update(updates)
            .eq("interview_id", interview_id)
            .execute()
        )
        return _single(result)
    except RuntimeError:
        raise
    except Exception as exc:
        raise RuntimeError(
            f"complete_interview failed for interview_id={interview_id}: {exc}"
        ) from exc


# ---------------------------------------------------------------------------
# 8. create_interview_report
# ---------------------------------------------------------------------------

def create_interview_report(
    *,
    interview_id: int,
    overall_score: Optional[float] = None,
    strengths: Optional[List[str]] = None,
    weaknesses: Optional[List[str]] = None,
    recommendations: Optional[List[str]] = None,
    summary: Optional[str] = None,
    topics_covered: Optional[List[str]] = None,
    profile_strengths: Optional[List[str]] = None,
    interview_demonstrated_strengths: Optional[List[str]] = None,
    interview_knowledge_gaps: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Insert an interview_reports row.

    topics_covered and new strength/gap lists: Python list → jsonb column
    (passed directly; PostgREST serialises).
    `interview_id` has a UNIQUE constraint — one report per interview enforced by DB.

    Returns the created row including `report_id`.
    """
    payload: Dict[str, Any] = {"interview_id": interview_id}

    if overall_score is not None:
        payload["overall_score"] = overall_score
    if strengths is not None:
        payload["strengths"] = strengths
    if weaknesses is not None:
        payload["weaknesses"] = weaknesses
    if recommendations is not None:
        payload["recommendations"] = recommendations
    if summary is not None:
        payload["summary"] = summary
    if topics_covered is not None:
        payload["topics_covered"] = topics_covered
    if profile_strengths is not None:
        payload["profile_strengths"] = profile_strengths
    if interview_demonstrated_strengths is not None:
        payload["interview_demonstrated_strengths"] = interview_demonstrated_strengths
    if interview_knowledge_gaps is not None:
        payload["interview_knowledge_gaps"] = interview_knowledge_gaps

    try:
        result = supabase.table("interview_reports").insert(payload).execute()
        return _single(result)
    except RuntimeError:
        raise
    except Exception as exc:
        raise RuntimeError(
            f"create_interview_report failed for interview_id={interview_id}: {exc}"
        ) from exc


# ---------------------------------------------------------------------------
# 9. get_interview
# ---------------------------------------------------------------------------

def get_interview(interview_id: int) -> Optional[Dict[str, Any]]:
    """
    Fetch a single interview row by primary key.

    Returns the row dict, or None if not found.
    Used for ownership checks and session recovery.
    """
    try:
        result = (
            supabase.table("interviews")
            .select("*")
            .eq("interview_id", interview_id)
            .limit(1)
            .execute()
        )
        if not result.data:
            return None
        return result.data[0]
    except Exception as exc:
        raise RuntimeError(
            f"get_interview failed for interview_id={interview_id}: {exc}"
        ) from exc


# ---------------------------------------------------------------------------
# 10. get_interview_questions
# ---------------------------------------------------------------------------

def get_interview_questions(interview_id: int) -> List[Dict[str, Any]]:
    """
    Fetch all questions for an interview, ordered by question_order ascending.

    Returns a list of question rows (may be empty if no questions yet).
    """
    try:
        result = (
            supabase.table("questions")
            .select("*")
            .eq("interview_id", interview_id)
            .order("question_order", desc=False)
            .execute()
        )
        return result.data or []
    except Exception as exc:
        raise RuntimeError(
            f"get_interview_questions failed for interview_id={interview_id}: {exc}"
        ) from exc


# ---------------------------------------------------------------------------
# 10a. get_interview_breakdown
# ---------------------------------------------------------------------------

def get_interview_breakdown(interview_id: int) -> List[Dict[str, Any]]:
    """
    Fetch all questions for an interview, alongside their answers and evaluations.
    """
    try:
        result = (
            supabase.table("questions")
            .select("*, answers(*, evaluations(*))")
            .eq("interview_id", interview_id)
            .order("question_order", desc=False)
            .execute()
        )
        return result.data or []
    except Exception as exc:
        raise RuntimeError(
            f"get_interview_breakdown failed for interview_id={interview_id}: {exc}"
        ) from exc


# ---------------------------------------------------------------------------
# 10b. get_latest_question
# ---------------------------------------------------------------------------

def get_latest_question(interview_id: int) -> Optional[Dict[str, Any]]:
    """
    Fetch the most recent question for an interview, ordered by question_order descending.
    """
    try:
        result = (
            supabase.table("questions")
            .select("*")
            .eq("interview_id", interview_id)
            .order("question_order", desc=True)
            .limit(1)
            .execute()
        )
        if not result.data:
            return None
        return result.data[0]
    except Exception as exc:
        raise RuntimeError(
            f"get_latest_question failed for interview_id={interview_id}: {exc}"
        ) from exc


# ---------------------------------------------------------------------------
# 11. get_interview_report
# ---------------------------------------------------------------------------

def get_interview_report(interview_id: int) -> Optional[Dict[str, Any]]:
    """
    Fetch a single interview report row by interview_id.

    Returns the row dict, or None if not found.
    """
    try:
        result = (
            supabase.table("interview_reports")
            .select("*")
            .eq("interview_id", interview_id)
            .limit(1)
            .execute()
        )
        if not result.data:
            return None
        return result.data[0]
    except Exception as exc:
        raise RuntimeError(
            f"get_interview_report failed for interview_id={interview_id}: {exc}"
        ) from exc


# ---------------------------------------------------------------------------
# 12. get_user_interviews
# ---------------------------------------------------------------------------

def get_user_interviews(user_id: int) -> List[Dict[str, Any]]:
    """
    Fetch all interviews for a user, ordered by interview_id descending (newest first).

    Returns a list of interview rows (may be empty).
    """
    try:
        result = (
            supabase.table("interviews")
            .select("*")
            .eq("user_id", user_id)
            .order("interview_id", desc=True)
            .execute()
        )
        return result.data or []
    except Exception as exc:
        raise RuntimeError(
            f"get_user_interviews failed for user_id={user_id}: {exc}"
        ) from exc
