"""
interview_router.py

FastAPI router for the AI MOCKORA interview workflow.

Endpoints:
    POST /interview/start
    POST /interview/{interview_id}/answer
    GET  /interview/{interview_id}
    GET  /interview/{interview_id}/report
    GET  /interviews           ← history list for the authenticated user
"""

import logging
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from api.auth import UserInfo, get_current_user
from langgraph.types import Command
from langgraph_workflow.interview_graph import interview_graph
import api.interview_repository as repo

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/interview", tags=["Interview Workflow"])


# =============================================================================
# Pydantic Request/Response Models
# =============================================================================

class StartInterviewRequest(BaseModel):
    """Minimum information required to begin a new interview session."""
    role: str = Field(..., min_length=1, description="Target job role, e.g. 'Backend Engineer'.")

    max_questions: int = Field(
        default=10,
        gt=0,
        le=20,
        description="Total questions to ask in this session (1–20).",
    )


class AnswerRequest(BaseModel):
    """Candidate's answer to the current question."""
    answer: str = Field(..., min_length=1, description="Non-empty answer text.")


# =============================================================================
# Helper: get graph state safely
# =============================================================================

def _get_snapshot(thread_id: str):
    """Return the graph's StateSnapshot for the given thread_id, or None."""
    config = {"configurable": {"thread_id": thread_id}}
    try:
        snap = interview_graph.get_state(config)
        # An empty-values snapshot means the thread doesn't exist yet.
        if not snap.values:
            return None
        return snap
    except Exception:
        return None


def _rebuild_graph_state_from_db(int_id: int, interview_row: dict, user_id: int) -> bool:
    """
    Relational interview rows do not contain the complete LangGraph state,
    so they cannot safely reconstruct a missing checkpoint. The caller can
    still use GET /interview/{id} to retrieve the latest persisted question.

    Returns False when the graph checkpoint is unavailable.
    """
    return False


# =============================================================================
# POST /interview/start
# =============================================================================

@router.post("/start", status_code=status.HTTP_200_OK)
def start_interview(
    request: StartInterviewRequest,
    current_user: UserInfo = Depends(get_current_user),
):
    """
    Start a new AI MOCKORA interview session.

    1. Authenticate the user via JWT.
    2. Load the candidate profile from DB.
    3. Create a Supabase interview row.
    4. Build initial InterviewState and invoke the LangGraph.
    5. Return the first question.
    """
    from api.resume_repository import get_candidate_profile
    profile = get_candidate_profile(current_user.user_id)
    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Candidate profile not found. Please upload a resume first."
        )

    topics = profile.get("potential_interview_topics")
    if not isinstance(topics, list) or len(topics) == 0:
        topics = ["General Software Engineering", "Problem Solving"]
        profile["potential_interview_topics"] = topics

    user_id = current_user.user_id

    # Create the Supabase interview row
    try:
        resume_id = profile.get("resume_id")
        if resume_id is not None:
            resume_id = int(resume_id)

        int_row = repo.create_interview(
            user_id=user_id,
            role=request.role.strip(),
            max_questions=request.max_questions,
            resume_id=resume_id
        )
        int_id = int_row["interview_id"]
        interview_id = str(int_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create interview in database: {exc}",
        )

    config = {"configurable": {"thread_id": interview_id}}

    initial_state = {
        "user_id": user_id,
        "interview_id": int_id,
        "role": request.role.strip(),
        "candidate_profile": profile,
        "max_questions": request.max_questions,
        "available_topics": [],
        "current_topic": "",
        "current_difficulty": "medium",
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

    try:
        interview_graph.invoke(initial_state, config)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        logger.exception("LangGraph invocation failed on start")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start interview session. Please try again.",
        )

    snap = _get_snapshot(interview_id)
    if snap is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Interview session could not be initialised.",
        )

    values = snap.values
    current_q = values.get("current_question")

    try:
        if current_q:
            repo.create_question(
                interview_id=int_id,
                question_text=current_q.get("question", ""),
                topic=current_q.get("topic"),
                difficulty=current_q.get("difficulty"),
                question_type=current_q.get("question_type"),
                question_order=values.get("question_count"),
                expected_concepts=current_q.get("expected_concepts")
            )

        repo.update_interview_state(
            interview_id=int_id,
            current_topic=values.get("current_topic"),
            current_difficulty=values.get("current_difficulty"),
            question_count=values.get("question_count")
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to persist initial interview state: {exc}",
        )

    return {
        "success": True,
        "interview_id": interview_id,
        "question": current_q,
        "question_number": values.get("question_count"),
        "max_questions": values.get("max_questions"),
        "status": "waiting_for_answer",
    }


# =============================================================================
# POST /interview/{interview_id}/answer
# =============================================================================

@router.post("/{interview_id}/answer", status_code=status.HTTP_200_OK)
def answer_question(
    interview_id: str,
    request: AnswerRequest,
    current_user: UserInfo = Depends(get_current_user),
):
    """
    Submit the candidate's answer and continue the interview.
    """
    answer_text = request.answer.strip()
    if not answer_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Answer cannot be empty or whitespace only.",
        )

    # --- Parse interview_id once at the top ---
    try:
        int_id = int(interview_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid interview_id format. Must be a numeric ID.",
        )

    # --- Ownership check via durable relational record ---
    interview_row = repo.get_interview(int_id)
    if not interview_row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview not found.",
        )

    if interview_row["user_id"] != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this interview.",
        )

    if interview_row.get("status") == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Interview is already completed.",
        )

    # --- Look up the LangGraph thread ---
    snap = _get_snapshot(interview_id)

    if snap is None:
        # The relational record may still be available even when the workflow
        # checkpoint is not. GET /interview/{id} can return the latest question.
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Interview session state was lost (server may have restarted). "
                "Please refresh the page to restore your interview from the database."
            ),
        )

    values = snap.values

    # --- Double-check LangGraph ownership matches JWT (defence in depth) ---
    if values.get("user_id") != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this interview.",
        )

    # --- Check interview is paused waiting for an answer ---
    if not snap.next:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Interview is already completed.",
        )

    if "wait_for_answer" in snap.next:
        # Normal flow: graph is paused waiting for an answer
        invoke_input = Command(resume=answer_text)
    elif set(snap.next).intersection({"evaluate_answer", "adaptive_decision", "generate_final_report", "generate_question"}):
        # Recovery flow: The graph previously consumed the answer but crashed during evaluation.
        # We can just resume the graph execution (it already has the answer in its state).
        invoke_input = None
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Interview is not currently waiting for an answer. (State: {snap.next})",
        )

    # --- Identify the current question_id ---
    try:
        db_questions = repo.get_interview_questions(int_id)
        if not db_questions:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Interview questions not found in database.",
            )
        current_question_db = db_questions[-1]
        question_id = current_question_db["question_id"]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve question from database: {exc}",
        )

    # --- Persist the submitted answer (idempotent on duplicate) ---
    try:
        answer_row = repo.create_answer(question_id=question_id, answer_text=answer_text)
        answer_id = answer_row["answer_id"]
    except Exception as exc:
        exc_str = str(exc)
        if "unique" in exc_str.lower() or "duplicate" in exc_str.lower() or "23505" in exc_str:
            try:
                existing_answer = repo.get_answer_by_question_id(question_id)
                if not existing_answer:
                    raise RuntimeError("Answer exists but could not be retrieved.")
                answer_id = existing_answer["answer_id"]
            except Exception as inner_exc:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to recover from duplicate answer: {inner_exc}",
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to persist answer: {exc}",
            )

    config = {"configurable": {"thread_id": interview_id}}

    try:
        interview_graph.invoke(invoke_input, config)
    except Exception as exc:
        logger.exception("LangGraph invocation failed on answer")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process your answer. Please try again.",
        )

    new_snap = _get_snapshot(interview_id)
    if new_snap is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve interview state after processing.",
        )

    new_values = new_snap.values

    # --- Persist the results of this turn ---
    history = new_values.get("interview_history", [])
    if history:
        last_turn = history[-1]
        evaluation = last_turn.get("evaluation")
        decision = last_turn.get("adaptive_decision")

        try:
            if evaluation:
                eval_row = repo.create_evaluation(
                    answer_id=answer_id,
                    score=evaluation.get("score"),
                    correctness=evaluation.get("correctness"),
                    completeness=evaluation.get("completeness"),
                    technical_depth=evaluation.get("technical_depth"),
                    confidence=evaluation.get("confidence"),
                    missing_concepts=evaluation.get("missing_concepts"),
                    feedback=evaluation.get("feedback"),
                    needs_followup=evaluation.get("needs_followup")
                )
                eval_id = eval_row["evaluation_id"]

                if decision:
                    repo.create_adaptive_decision(
                        evaluation_id=eval_id,
                        next_action=decision.get("next_action"),
                        next_topic=decision.get("next_topic"),
                        difficulty=decision.get("difficulty"),
                        reason=decision.get("reason")
                    )

            repo.update_interview_state(
                interview_id=int_id,
                current_topic=new_values.get("current_topic"),
                current_difficulty=new_values.get("current_difficulty"),
                question_count=new_values.get("question_count"),
                max_questions=new_values.get("max_questions"),
                status="completed" if new_values.get("is_finished") else "in_progress"
            )

            if not new_values.get("is_finished"):
                next_q = new_values.get("current_question")
                if next_q:
                    repo.create_question(
                        interview_id=int_id,
                        question_text=next_q.get("question", ""),
                        topic=next_q.get("topic"),
                        difficulty=next_q.get("difficulty"),
                        question_type=next_q.get("question_type"),
                        question_order=new_values.get("question_count"),
                        expected_concepts=next_q.get("expected_concepts")
                    )

        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to persist turn evaluation: {exc}",
            )

    # --- Finished? ---
    is_finished = not new_snap.next or new_values.get("is_finished")
    if is_finished:
        # Always mark the interview complete in DB, even if report persistence fails.
        report = new_values.get("final_report")
        report_error: Optional[str] = None

        try:
            if report:
                repo.create_interview_report(
                    interview_id=int_id,
                    overall_score=report.get("overall_score"),
                    strengths=report.get("strengths"),
                    weaknesses=report.get("weaknesses"),
                    recommendations=report.get("recommendations"),
                    summary=report.get("summary"),
                    topics_covered=report.get("topics_covered")
                )
        except Exception as exc:
            report_error = str(exc)
            logger.error("Failed to persist interview report for interview_id=%s: %s", int_id, exc)

        try:
            repo.complete_interview(int_id)
        except Exception as exc:
            logger.error("Failed to mark interview completed for interview_id=%s: %s", int_id, exc)

        if report_error:
            logger.warning(
                "Interview %s completed but report persistence failed: %s",
                int_id, report_error
            )

        return {
            "success": True,
            "status": "completed",
            "interview_id": interview_id,
            "final_report": report or {},
        }

    # --- Another question is ready ---
    return {
        "success": True,
        "status": "waiting_for_answer",
        "interview_id": interview_id,
        "question": new_values.get("current_question"),
        "question_number": new_values.get("question_count"),
        "max_questions": new_values.get("max_questions"),
    }


# =============================================================================
# GET /interview/{interview_id}
# =============================================================================

@router.get("/{interview_id}", status_code=status.HTTP_200_OK)
def get_interview(
    interview_id: str,
    current_user: UserInfo = Depends(get_current_user),
):
    """
    Recover the state of an interview.
    Used when refreshing the browser during an interview.
    """
    try:
        int_id = int(interview_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid interview ID format")

    interview_row = repo.get_interview(int_id)
    if not interview_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")

    if interview_row["user_id"] != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    if interview_row["status"] == "completed":
        return {
            "interview_id": interview_id,
            "status": "completed",
            "role": interview_row["role"],
            "question_count": interview_row["question_count"],
            "max_questions": interview_row["max_questions"],
        }

    latest_q_row = repo.get_latest_question(int_id)
    if not latest_q_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active question found for this interview")

    current_question = {
        "question": latest_q_row.get("question_text", ""),
        "topic": latest_q_row.get("topic", ""),
        "difficulty": latest_q_row.get("difficulty", ""),
        "question_type": latest_q_row.get("question_type", ""),
        "expected_concepts": latest_q_row.get("expected_concepts", [])
    }

    return {
        "interview_id": interview_id,
        "status": interview_row["status"],
        "role": interview_row["role"],
        "current_topic": interview_row.get("current_topic"),
        "current_difficulty": interview_row.get("current_difficulty"),
        "question_count": interview_row["question_count"],
        "max_questions": interview_row["max_questions"],
        "question": current_question,
        "question_number": interview_row["question_count"],
    }


# =============================================================================
# GET /interview/{interview_id}/report
# =============================================================================

@router.get("/{interview_id}/report", status_code=status.HTTP_200_OK)
def get_interview_report(
    interview_id: str,
    current_user: UserInfo = Depends(get_current_user),
):
    """
    Recover the final report of a completed interview.
    """
    try:
        int_id = int(interview_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid interview ID format")

    interview_row = repo.get_interview(int_id)
    if not interview_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found")

    if interview_row["user_id"] != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    report_row = repo.get_interview_report(int_id)
    if not report_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found for this interview")

    return {
        "overall_score": report_row.get("overall_score"),
        "strengths": report_row.get("strengths", []),
        "weaknesses": report_row.get("weaknesses", []),
        "recommendations": report_row.get("recommendations", []),
        "summary": report_row.get("summary", ""),
        "topics_covered": report_row.get("topics_covered", []),
    }


# =============================================================================
# GET /interviews  — history list
# =============================================================================

# NOTE: This router uses prefix="/interview" so this route is registered as
# GET /interview/history. The history router below is added to the main app
# without a prefix conflict. See interview_history_router in main.py.
