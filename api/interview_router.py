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
import time
import uuid
import os
from typing import Any, Dict, List, Optional

latency_file = open("latency_metrics.log", "a")
def log_latency(msg, *args):
    formatted = msg % args
    logger.info(formatted)
    latency_file.write(formatted + "\n")
    latency_file.flush()

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from api.auth import UserInfo, get_current_user, limiter
from langgraph.types import Command
from langgraph_workflow.interview_graph import interview_graph
import api.interview_repository as repo

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/interview", tags=["Interview Workflow"])


def _public_question(question: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Return the question payload candidates may see. Never includes the rubric."""
    if not question or not isinstance(question, dict):
        return question
    return {
        "question": question.get("question", ""),
        "topic": question.get("topic", ""),
        "difficulty": question.get("difficulty", ""),
        "question_type": question.get("question_type", ""),
    }


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

def _public_question(question: dict | None) -> dict | None:
    """Strip hidden grading fields before returning a question to the client."""
    if not question or not isinstance(question, dict):
        return question
    return {
        "question": question.get("question", ""),
        "topic": question.get("topic", ""),
        "difficulty": question.get("difficulty", ""),
        "question_type": question.get("question_type", ""),
    }


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
        "question": _public_question(current_q),
        "question_number": values.get("question_count"),
        "max_questions": values.get("max_questions"),
        "status": "waiting_for_answer",
    }


# =============================================================================
# POST /interview/{interview_id}/answer
# =============================================================================

@router.post("/{interview_id}/answer", status_code=status.HTTP_200_OK)
@limiter.limit("30/minute")
def answer_question(
    interview_id: str,
    request: Request,
    body: AnswerRequest,
    current_user: UserInfo = Depends(get_current_user),
):
    """
    Submit the candidate's answer and continue the interview.
    """
    answer_text = body.answer.strip()
    if not answer_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Answer cannot be empty or whitespace only.",
        )

    # --- Stage A: request entry ---
    _t_start = time.monotonic()
    log_latency("[LATENCY] interview_answer start interview_id=%s", interview_id)

    # --- Parse interview_id once at the top ---
    try:
        int_id = int(interview_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid interview_id format. Must be a numeric ID.",
        )

    # --- Stage B: DB ownership check ---
    _t_b0 = time.monotonic()
    interview_row = repo.get_interview(int_id)
    log_latency(
        "[LATENCY] state_load interview_id=%s duration=%.3fs",
        interview_id, time.monotonic() - _t_b0,
    )
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

    # --- Stage C: LangGraph checkpoint read ---
    _t_c0 = time.monotonic()
    snap = _get_snapshot(interview_id)
    log_latency(
        "[LATENCY] graph_state_read interview_id=%s duration=%.3fs",
        interview_id, time.monotonic() - _t_c0,
    )

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

    if "process_answer" in snap.next:
        # Normal flow: graph is paused waiting for an answer
        invoke_input = Command(resume=answer_text)
    elif set(snap.next).intersection({"generate_final_report", "generate_question"}):
        # Recovery flow: The graph previously consumed the answer but crashed during evaluation.
        # We can just resume the graph execution (it already has the answer in its state).
        invoke_input = None
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Interview is not currently waiting for an answer. (State: {snap.next})",
        )

    # --- Stage D: DB question lookup + answer persist ---
    _t_d0 = time.monotonic()
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
    log_latency(
        "[LATENCY] db_question_and_answer_persist interview_id=%s duration=%.3fs",
        interview_id, time.monotonic() - _t_d0,
    )

    config = {"configurable": {"thread_id": interview_id}}

    # --- Stage E: LangGraph invoke (eval + adaptive + question gen) ---
    _t_e0 = time.monotonic()
    try:
        interview_graph.invoke(invoke_input, config)
    except Exception as exc:
        logger.exception("LangGraph invocation failed on answer")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process your answer. Please try again.",
        )
    log_latency(
        "[LATENCY] langgraph_invoke interview_id=%s duration=%.3fs",
        interview_id, time.monotonic() - _t_e0,
    )

    # --- Stage F: snapshot read-back ---
    _t_f0 = time.monotonic()
    new_snap = _get_snapshot(interview_id)
    log_latency(
        "[LATENCY] graph_state_read_back interview_id=%s duration=%.3fs",
        interview_id, time.monotonic() - _t_f0,
    )
    if new_snap is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve interview state after processing.",
        )

    new_values = new_snap.values

    # --- Stage G: DB result persistence (eval, decision, state, next question) ---
    _t_g0 = time.monotonic()
    history = new_values.get("interview_history", [])
    if history:
        last_turn = history[-1]
        evaluation = last_turn.get("evaluation")
        decision = last_turn.get("adaptive_decision")

        try:
            _t_ts = time.monotonic()
            
            # Prepare arguments for the transaction
            kwargs = {
                "answer_id": answer_id,
                "interview_id": int_id,
                "current_topic": new_values.get("current_topic"),
                "current_difficulty": new_values.get("current_difficulty"),
                "question_count": new_values.get("question_count"),
                "max_questions": new_values.get("max_questions"),
                "status": "completed" if new_values.get("is_finished") else "in_progress",
            }
            
            if evaluation:
                kwargs.update({
                    "score": evaluation.get("score"),
                    "correctness": evaluation.get("correctness"),
                    "completeness": evaluation.get("completeness"),
                    "technical_depth": evaluation.get("technical_depth"),
                    "confidence": evaluation.get("confidence"),
                    "missing_concepts": evaluation.get("missing_concepts"),
                    "feedback": evaluation.get("feedback"),
                    "needs_followup": evaluation.get("needs_followup")
                })
                
                if decision:
                    kwargs.update({
                        "next_action": decision.get("next_action"),
                        "next_topic": decision.get("next_topic"),
                        "difficulty": decision.get("difficulty"),
                        "reason": decision.get("reason")
                    })
                    
            if not new_values.get("is_finished"):
                next_q = new_values.get("current_question")
                if next_q:
                    kwargs.update({
                        "question_text": next_q.get("question", ""),
                        "question_topic": next_q.get("topic"),
                        "question_difficulty": next_q.get("difficulty"),
                        "expected_concepts": next_q.get("expected_concepts")
                    })
                    
            repo.save_interview_turn_transaction(**kwargs)
            log_latency("[LATENCY] transactional_state_save interview_id=%s duration=%.3fs", interview_id, time.monotonic() - _t_ts)

        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to persist turn evaluation: {exc}",
            )
    log_latency(
        "[LATENCY] state_save interview_id=%s duration=%.3fs",
        interview_id, time.monotonic() - _t_g0,
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
                    topics_covered=report.get("topics_covered"),
                    profile_strengths=report.get("profile_strengths"),
                    interview_demonstrated_strengths=report.get("interview_demonstrated_strengths"),
                    interview_knowledge_gaps=report.get("interview_knowledge_gaps")
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

        # --- Stage H+I: response construction + total ---
        _t_total = time.monotonic() - _t_start
        log_latency(
            "[LATENCY] interview_answer interview_id=%s status=completed total=%.3fs",
            interview_id, _t_total,
        )
        return {
            "success": True,
            "status": "completed",
            "interview_id": interview_id,
            "interviewer_feedback": new_values.get("interviewer_feedback") or "",
            "final_report": report or {},
        }

    # --- Another question is ready ---
    _t_total = time.monotonic() - _t_start
    log_latency(
        "[LATENCY] interview_answer interview_id=%s status=continuing total=%.3fs",
        interview_id, _t_total,
    )
    return {
        "success": True,
        "status": "waiting_for_answer",
        "interview_id": interview_id,
        "interviewer_feedback": new_values.get("interviewer_feedback") or "",
        "question": _public_question(new_values.get("current_question")),
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

    breakdown = repo.get_interview_breakdown(int_id)
    questions = []
    for q in breakdown:
        answer_text = ""
        score = None
        missing = []
        answers_data = q.get("answers")
        if answers_data:
            ans = answers_data[0] if isinstance(answers_data, list) else answers_data
            answer_text = ans.get("answer_text", "")
            evals_data = ans.get("evaluations")
            if evals_data:
                ev = evals_data[0] if isinstance(evals_data, list) else evals_data
                score = ev.get("score")
                missing = ev.get("missing_concepts", [])
                
        questions.append({
            "question": q.get("question_text", ""),
            "answer": answer_text,
            "score": score,
            "missing_concepts": missing
        })

    return {
        "created_at": interview_row.get("created_at"),
        "role": interview_row.get("role"),
        "overall_score": report_row.get("overall_score"),
        "strengths": report_row.get("strengths", []),
        "weaknesses": report_row.get("weaknesses", []),
        "recommendations": report_row.get("recommendations", []),
        "summary": report_row.get("summary", ""),
        "topics_covered": report_row.get("topics_covered", []),
        "profile_strengths": report_row.get("profile_strengths", []),
        "interview_demonstrated_strengths": report_row.get("interview_demonstrated_strengths", []),
        "interview_knowledge_gaps": report_row.get("interview_knowledge_gaps", []),
        "questions": questions,
    }


# =============================================================================
# GET /interviews  — history list
# =============================================================================

# NOTE: This router uses prefix="/interview" so this route is registered as
# GET /interview/history. The history router below is added to the main app
# without a prefix conflict. See interview_history_router in main.py.
