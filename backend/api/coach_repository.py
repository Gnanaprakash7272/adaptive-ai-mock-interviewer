"""coach_repository.py

Persistence layer for Career Pivot Coach.
Supports Supabase table storage with automatic graceful in-memory fallback.
"""

from __future__ import annotations

import json
import logging
from typing import Any
from uuid import uuid4

from api.db import supabase
from intelligence.career_coach.state import (
    JobApplication,
    LearningTask,
    PivotPlan,
    PortfolioProject,
    SkillGapMap,
    WeeklyMilestone,
)

logger = logging.getLogger(__name__)

# In-memory persistence fallback (keyed by str(user_id))
_IN_MEMORY_PLANS: dict[str, PivotPlan] = {}
_IN_MEMORY_APPLICATIONS: dict[str, list[JobApplication]] = {}


def save_pivot_plan(plan: PivotPlan) -> PivotPlan:
    """Save or update a candidate's PivotPlan."""
    user_key = str(plan.user_id)
    _IN_MEMORY_PLANS[user_key] = plan

    # Attempt Supabase sync if table exists
    try:
        data = {
            "plan_id": plan.plan_id,
            "user_id": int(plan.user_id) if str(plan.user_id).isdigit() else 1,
            "current_role": plan.current_role,
            "target_role": plan.target_role,
            "experience_years": plan.experience_years,
            "weekly_hours": plan.weekly_hours,
            "gap_map": plan.gap_map.model_dump(),
            "roadmap": [m.model_dump() for m in plan.roadmap],
            "portfolio_projects": [p.model_dump() for p in plan.portfolio_projects],
            "updated_at": plan.updated_at,
        }
        supabase.table("career_pivot_plans").upsert(data).execute()
    except Exception as exc:
        logger.debug("Supabase table 'career_pivot_plans' unavailable or error (%s); in-memory used", exc)

    return plan


def get_pivot_plan(user_id: int | str) -> PivotPlan | None:
    """Retrieve the candidate's active PivotPlan."""
    user_key = str(user_id)

    # Check in-memory first
    if user_key in _IN_MEMORY_PLANS:
        return _IN_MEMORY_PLANS[user_key]

    # Attempt Supabase query
    try:
        numeric_id = int(user_id) if str(user_id).isdigit() else 1
        res = (
            supabase.table("career_pivot_plans")
            .select("*")
            .eq("user_id", numeric_id)
            .order("updated_at", desc=True)
            .limit(1)
            .execute()
        )
        if res.data and len(res.data) > 0:
            row = res.data[0]
            plan = PivotPlan(
                plan_id=row.get("plan_id", str(uuid4())),
                user_id=user_id,
                current_role=row.get("current_role", "Software Engineer"),
                target_role=row.get("target_role", "Senior Software Engineer"),
                experience_years=float(row.get("experience_years", 2.0)),
                weekly_hours=int(row.get("weekly_hours", 12)),
                gap_map=SkillGapMap(**row["gap_map"]),
                roadmap=[WeeklyMilestone(**m) for m in row.get("roadmap", [])],
                portfolio_projects=[PortfolioProject(**p) for p in row.get("portfolio_projects", [])],
                created_at=row.get("created_at", ""),
                updated_at=row.get("updated_at", ""),
            )
            _IN_MEMORY_PLANS[user_key] = plan
            return plan
    except Exception as exc:
        logger.debug("Supabase get plan fallback to memory: %s", exc)

    return None


def get_applications(user_id: int | str) -> list[JobApplication]:
    """Retrieve all job applications for user."""
    user_key = str(user_id)
    if user_key not in _IN_MEMORY_APPLICATIONS:
        # Seed default sample data so UI is immediately rich on first run
        _IN_MEMORY_APPLICATIONS[user_key] = [
            JobApplication(
                id="app-1",
                company="Stripe",
                role_title="Backend Software Engineer - Payments",
                job_url="https://stripe.com/jobs",
                applied_date="2026-11-14",
                status="interview",
                match_score=88,
                notes="Completed initial technical screen. System design interview scheduled next week.",
                response_received=True,
            ),
            JobApplication(
                id="app-2",
                company="Datadog",
                role_title="Distributed Systems Engineer",
                job_url="https://datadoghq.com/careers",
                applied_date="2026-11-16",
                status="screening",
                match_score=82,
                notes="Recruiter screen booked via Calendly.",
                response_received=True,
            ),
            JobApplication(
                id="app-3",
                company="Uber",
                role_title="Software Engineer II - Core Infrastructure",
                job_url="https://uber.com/careers",
                applied_date="2026-11-18",
                status="applied",
                match_score=76,
                notes="Referred by college alumni. Waiting on recruiter review.",
                response_received=False,
            ),
        ]
    return list(_IN_MEMORY_APPLICATIONS[user_key])


def save_application(user_id: int | str, app: JobApplication) -> JobApplication:
    """Save or add an application."""
    user_key = str(user_id)
    apps = get_applications(user_id)

    # Update existing or append
    for i, existing in enumerate(apps):
        if existing.id == app.id:
            apps[i] = app
            _IN_MEMORY_APPLICATIONS[user_key] = apps
            return app

    apps.insert(0, app)
    _IN_MEMORY_APPLICATIONS[user_key] = apps
    return app


def delete_application(user_id: int | str, app_id: str) -> bool:
    """Delete an application."""
    user_key = str(user_id)
    apps = get_applications(user_id)
    initial_len = len(apps)
    apps = [a for a in apps if a.id != app_id]
    _IN_MEMORY_APPLICATIONS[user_key] = apps
    return len(apps) < initial_len
