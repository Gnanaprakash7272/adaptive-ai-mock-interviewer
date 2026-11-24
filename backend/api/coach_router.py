"""coach_router.py

FastAPI router for the AI Career Pivot Coach agent workflow.
Integrates intake, skill gap mapping, week-by-week roadmapping,
portfolio blueprint generation, closed-loop mock adaptation, and application tracking.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

try:
    from datetime import UTC
except ImportError:
    UTC = timezone.utc
from typing import Any, Literal
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from api.auth import UserInfo, get_current_user, limiter, security
import api.coach_repository as coach_repo
from intelligence.career_coach.adaptive_engine import adjust_roadmap_after_mock
from intelligence.career_coach.villain_agent import villain_agent_chat, villain_agent_chat_stream
from intelligence.career_coach.application_tracker import (
    analyze_application_trends,
    generate_application_recommendations,
)
from intelligence.career_coach.gap_analyzer import analyze_skill_gaps
from intelligence.career_coach.portfolio_architect import generate_portfolio_projects
from intelligence.career_coach.roadmap_generator import generate_learning_roadmap
from intelligence.career_coach.state import (
    JobApplication,
    LearningTask,
    PivotPlan,
    PlanAdjustment,
    PortfolioProject,
    SkillGapMap,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/coach", tags=["Career Pivot Coach"])


def _get_optional_or_default_user(request: Request) -> UserInfo:
    """Helper to return authenticated user or default guest candidate."""
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
        try:
            from api.auth import decode_access_token
            payload = decode_access_token(token)
            user_id = payload.get("user_id")
            if user_id:
                return UserInfo(
                    user_id=int(user_id) if str(user_id).isdigit() else 1,
                    email=payload.get("email", "candidate@mockora.com"),
                    username=payload.get("username", "candidate"),
                    name=payload.get("name", "Candidate"),
                )
        except Exception:
            pass

    return UserInfo(
        user_id=1,
        email="candidate@mockora.com",
        username="candidate",
        name="Candidate",
    )


# =============================================================================
# Request / Response Models
# =============================================================================

class IntakeRequest(BaseModel):
    current_role: str = Field(default="Full Stack Developer", min_length=2)
    target_role: str = Field(..., min_length=2, description="Target role e.g. 'Senior Backend Engineer'")
    experience_years: float = Field(default=2.0, ge=0.0, le=40.0)
    weekly_hours: int = Field(default=15, ge=4, le=60)
    job_description: str | None = Field(default=None, description="Pasted real job posting description")
    resume_text: str | None = Field(default=None, description="Pasted resume text or summary")


class AdaptRequest(BaseModel):
    mock_topic: str = Field(..., min_length=2)
    score: float = Field(..., ge=0.0, le=10.0)
    weak_concepts: list[str] = Field(default_factory=list)
    interview_id: str | None = None


class CreateApplicationRequest(BaseModel):
    company: str = Field(..., min_length=1)
    role_title: str = Field(..., min_length=1)
    job_url: str | None = None
    applied_date: str | None = None
    status: Literal["applied", "screening", "interview", "offer", "rejected"] = "applied"
    match_score: int = Field(default=75, ge=0, le=100)
    notes: str | None = None


class UpdateApplicationRequest(BaseModel):
    status: Literal["applied", "screening", "interview", "offer", "rejected"] | None = None
    match_score: int | None = None
    notes: str | None = None
    response_received: bool | None = None


# =============================================================================
# Endpoints
# =============================================================================

@router.post("/intake", response_model=PivotPlan)
def career_pivot_intake(request: Request, body: IntakeRequest, background_tasks: BackgroundTasks):
    """
    Intake candidate profile + target role + optional JD.
    Heavy AI pipeline runs in a background task to avoid 504 timeouts on slow Gemini calls.
    Returns the saved plan immediately after kicking off background processing.
    Executes:
    1. 3-bucket skill gap analysis with market readiness score.
    2. Dynamic week-by-week learning roadmap with mock checkpoints.
    3. Production-grade portfolio project blueprints.
    Persists and returns the new PivotPlan.
    """
    user = _get_optional_or_default_user(request)

    # 1. Analyze skill gaps (fast, synchronous — needed to assemble the plan object below)
    gap_map = analyze_skill_gaps(
        candidate_profile_or_text=body.resume_text or f"Role: {body.current_role}, {body.experience_years} years experience",
        target_role=body.target_role,
        job_description=body.job_description,
    )

    # 2. Generate roadmap
    roadmap = generate_learning_roadmap(
        gap_map=gap_map,
        target_role=body.target_role,
        weeks=6,
        hours_per_week=body.weekly_hours,
    )

    # 3. Generate portfolio projects
    portfolio = generate_portfolio_projects(
        gap_map=gap_map,
        target_role=body.target_role,
    )

    # 4. Assemble and save plan
    plan = PivotPlan(
        plan_id=str(uuid4()),
        user_id=user.user_id,
        current_role=body.current_role,
        target_role=body.target_role,
        experience_years=body.experience_years,
        weekly_hours=body.weekly_hours,
        gap_map=gap_map,
        roadmap=roadmap,
        portfolio_projects=portfolio,
        created_at=datetime.now(UTC).isoformat(),
        updated_at=datetime.now(UTC).isoformat(),
    )

    return coach_repo.save_pivot_plan(plan)


@router.get("/plan", response_model=PivotPlan)
def get_user_plan(request: Request):
    """Returns candidate's active Pivot Plan or generates a starter plan."""
    user = _get_optional_or_default_user(request)
    plan = coach_repo.get_pivot_plan(user.user_id)

    if plan:
        return plan

    # Auto-seed a default plan tailored for students/freshers if user doesn't have one yet
    default_gap = analyze_skill_gaps(
        candidate_profile_or_text="College Student (CS / IT Fresher) with foundational knowledge of Python, Java, or JavaScript",
        target_role="Software Engineer (SDE-1)",
    )
    default_roadmap = generate_learning_roadmap(default_gap, "Software Engineer (SDE-1)", 6, 15)
    default_portfolio = generate_portfolio_projects(default_gap, "Software Engineer (SDE-1)")

    starter_plan = PivotPlan(
        plan_id=str(uuid4()),
        user_id=user.user_id,
        current_role="College Student (CS / IT Fresher)",
        target_role="Software Engineer (SDE-1)",
        experience_years=0.0,
        weekly_hours=15,
        gap_map=default_gap,
        roadmap=default_roadmap,
        portfolio_projects=default_portfolio,
    )
    return coach_repo.save_pivot_plan(starter_plan)


@router.post("/portfolio/add", response_model=PivotPlan)
def add_portfolio_project(request: Request, body: PortfolioProject):
    """Adds a custom or villain-generated project into the candidate's active portfolio."""
    user = _get_optional_or_default_user(request)
    plan = coach_repo.get_pivot_plan(user.user_id)
    if not plan:
        raise HTTPException(status_code=404, detail="No active pivot plan found")

    existing_ids = {p.id for p in plan.portfolio_projects}
    if body.id not in existing_ids:
        plan.portfolio_projects.insert(0, body)
        plan.updated_at = datetime.now(UTC).isoformat()
        plan = coach_repo.save_pivot_plan(plan)

    return plan


@router.post("/milestone/{week_number}/task/{task_id}/toggle", response_model=PivotPlan)
def toggle_task_completion(week_number: int, task_id: str, request: Request):
    """Toggle a specific learning task's completed state."""
    user = _get_optional_or_default_user(request)
    plan = coach_repo.get_pivot_plan(user.user_id)
    if not plan:
        raise HTTPException(status_code=404, detail="No active pivot plan found")

    found = False
    for m in plan.roadmap:
        if m.week_number == week_number:
            for t in m.tasks:
                if t.id == task_id:
                    t.completed = not t.completed
                    found = True
                    break

            # If all tasks are completed, mark milestone completed and advance next
            all_done = len(m.tasks) > 0 and all(t.completed for t in m.tasks)
            if all_done:
                m.status = "completed"
                for next_m in plan.roadmap:
                    if next_m.week_number == week_number + 1 and next_m.status == "pending":
                        next_m.status = "in_progress"
                        break
            elif m.status == "completed" and not all_done:
                m.status = "in_progress"
            break

    if not found:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found in week {week_number}")

    plan.updated_at = datetime.now(UTC).isoformat()
    return coach_repo.save_pivot_plan(plan)


@router.post("/adapt", response_model=PlanAdjustment)
def adapt_plan(request: Request, body: AdaptRequest):
    """
    Closed-loop adaptation:
    Feeds mock interview score & rubric weaknesses into the coach agent,
    dynamically adjusting subsequent weeks.
    """
    user = _get_optional_or_default_user(request)
    plan = coach_repo.get_pivot_plan(user.user_id)
    if not plan:
        raise HTTPException(status_code=404, detail="No active pivot plan found to adapt")

    adjustment = adjust_roadmap_after_mock(
        current_plan=plan,
        mock_topic=body.mock_topic,
        score=body.score,
        weak_concepts=body.weak_concepts,
        interview_id=body.interview_id,
    )

    plan.updated_at = datetime.now(UTC).isoformat()
    coach_repo.save_pivot_plan(plan)
    return adjustment


@router.get("/applications", response_model=list[JobApplication])
def get_user_applications(request: Request):
    """List tracked job applications."""
    user = _get_optional_or_default_user(request)
    return coach_repo.get_applications(user.user_id)


@router.post("/applications", response_model=JobApplication)
def add_application(request: Request, body: CreateApplicationRequest):
    """Record a new job application."""
    user = _get_optional_or_default_user(request)
    app = JobApplication(
        id=f"app-{uuid4().hex[:8]}",
        company=body.company,
        role_title=body.role_title,
        job_url=body.job_url,
        applied_date=body.applied_date or datetime.now(UTC).strftime("%Y-%m-%d"),
        status=body.status,
        match_score=body.match_score,
        notes=body.notes,
        response_received=body.status in ("screening", "interview", "offer"),
    )
    return coach_repo.save_application(user.user_id, app)


@router.patch("/applications/{app_id}", response_model=JobApplication)
def update_application(app_id: str, request: Request, body: UpdateApplicationRequest):
    """Update application status or notes."""
    user = _get_optional_or_default_user(request)
    apps = coach_repo.get_applications(user.user_id)
    target = next((a for a in apps if a.id == app_id), None)
    if not target:
        raise HTTPException(status_code=404, detail=f"Application {app_id} not found")

    if body.status is not None:
        target.status = body.status
        if body.status in ("screening", "interview", "offer"):
            target.response_received = True
    if body.match_score is not None:
        target.match_score = body.match_score
    if body.notes is not None:
        target.notes = body.notes
    if body.response_received is not None:
        target.response_received = body.response_received

    return coach_repo.save_application(user.user_id, target)


@router.delete("/applications/{app_id}")
def delete_application(app_id: str, request: Request):
    """Delete a tracked application."""
    user = _get_optional_or_default_user(request)
    deleted = coach_repo.delete_application(user.user_id, app_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Application {app_id} not found")
    return {"success": True, "message": f"Application {app_id} deleted"}


# =============================================================================
# POST /coach/villain/chat — Career Villain Portfolio Agent
# =============================================================================

class VillainChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="Student's latest message")
    conversation_history: list[dict] = Field(
        default_factory=list,
        description="Previous turns: [{role: 'user'|'agent', content: '...'}]"
    )
    resume_context: dict[str, Any] | str | None = Field(default=None, description="Optional pasted or explicit resume context")
    target_role: str | None = Field(default=None, description="Optional target role context")


@router.post("/villain/chat")
def villain_chat(request: Request, body: VillainChatRequest):
    """
    Career Villain Portfolio & Career Architect Agent.
    Brutally honest, highly technical mentor that analyzes resumes, maps career paths,
    recommends production portfolio projects with industry tools, and roasts generic ideas.
    """
    user = _get_optional_or_default_user(request)

    # 1. Retrieve candidate profile (from request or database)
    candidate_profile = body.resume_context
    db_profile = None
    try:
        from api.resume_repository import get_candidate_profile
        db_profile = get_candidate_profile(user.user_id)
    except Exception as e:
        logger.debug("[VillainAgent] Could not retrieve resume for user %s: %s", user.user_id, e)

    # Combine DB profile and request profile so no child table or field is missed
    if not candidate_profile:
        candidate_profile = db_profile
    elif db_profile and isinstance(candidate_profile, dict):
        for key in [
            "education", "skills", "projects", "experience",
            "certifications", "achievements", "competitive_programming",
            "expertise_areas", "potential_interview_topics",
            "languages", "publications"
        ]:
            if not candidate_profile.get(key) and db_profile.get(key):
                candidate_profile[key] = db_profile[key]
        if not candidate_profile.get("candidate") and db_profile.get("candidate"):
            candidate_profile["candidate"] = db_profile["candidate"]

    # 2. Retrieve target role (from request, profile, or active plan)
    target_role = body.target_role
    if not target_role and isinstance(candidate_profile, dict):
        target_role = candidate_profile.get("target_role") or candidate_profile.get("targetRole")
    if not target_role:
        try:
            plan = coach_repo.get_pivot_plan(user.user_id)
            if plan:
                target_role = plan.target_role
        except Exception:
            pass

    try:
        result = villain_agent_chat(
            user_message=body.message,
            conversation_history=body.conversation_history,
            candidate_profile=candidate_profile,
            target_role=target_role,
        )
        return {"success": True, **result}
    except Exception as exc:
        logger.error("[VillainAgent] Unexpected error: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Career Villain agent encountered an error. Please try again.",
        )


# =============================================================================
# POST /coach/villain/chat/stream — SSE Token Streaming endpoint
# =============================================================================

@router.post("/villain/chat/stream")
async def villain_chat_stream(request: Request, body: VillainChatRequest):
    """
    Career Villain chat with Server-Sent Events (SSE) token streaming.
    Streams word-by-word chunks so the UI renders progressively.
    Final SSE event has done=true and carries the full structured payload.
    """
    user = _get_optional_or_default_user(request)

    candidate_profile = body.resume_context
    db_profile = None
    try:
        from api.resume_repository import get_candidate_profile
        db_profile = get_candidate_profile(user.user_id)
    except Exception as e:
        logger.debug("[VillainAgent/stream] Could not retrieve resume for user %s: %s", user.user_id, e)

    if not candidate_profile:
        candidate_profile = db_profile
    elif db_profile and isinstance(candidate_profile, dict):
        for key in [
            "education", "skills", "projects", "experience",
            "certifications", "achievements", "competitive_programming",
            "expertise_areas", "potential_interview_topics",
            "languages", "publications"
        ]:
            if not candidate_profile.get(key) and db_profile.get(key):
                candidate_profile[key] = db_profile[key]
        if not candidate_profile.get("candidate") and db_profile.get("candidate"):
            candidate_profile["candidate"] = db_profile["candidate"]

    target_role = body.target_role
    if not target_role and isinstance(candidate_profile, dict):
        target_role = candidate_profile.get("target_role") or candidate_profile.get("targetRole")
    if not target_role:
        try:
            plan = coach_repo.get_pivot_plan(user.user_id)
            if plan:
                target_role = plan.target_role
        except Exception:
            pass

    def sse_generator():
        yield from villain_agent_chat_stream(
            user_message=body.message,
            conversation_history=body.conversation_history,
            candidate_profile=candidate_profile,
            target_role=target_role,
        )

    return StreamingResponse(
        sse_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.get("/analytics")
def get_application_analytics(request: Request):
    """
    Returns AI-learned patterns on which job roles, seniority, and titles
    are getting callbacks, plus actionable application advice.
    """
    user = _get_optional_or_default_user(request)
    apps = coach_repo.get_applications(user.user_id)
    plan = coach_repo.get_pivot_plan(user.user_id)
    target_role = plan.target_role if plan else "Senior Software Engineer"

    trends = analyze_application_trends(apps)
    recommendations = generate_application_recommendations(apps, target_role)

    return {
        **trends,
        "recommendations": recommendations,
        "target_role": target_role,
    }
