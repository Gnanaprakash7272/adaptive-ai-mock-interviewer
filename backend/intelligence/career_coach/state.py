"""Data models for Career Pivot Coach agent."""

from __future__ import annotations

from datetime import datetime, timezone

try:
    from datetime import UTC
except ImportError:
    UTC = timezone.utc
from typing import Any, Literal
from pydantic import BaseModel, Field


class SkillGapMap(BaseModel):
    """3-bucket skill classification and market readiness analysis."""
    target_role: str = Field(..., description="Target role name e.g. 'Senior Backend Engineer'")
    seniority_level: str = Field(default="Mid-Level", description="Expected seniority")
    market_readiness_score: int = Field(default=50, ge=0, le=100, description="Readiness percentage 0-100")
    summary: str = Field(..., description="Executive summary of the candidate's pivot feasibility")
    transferable_strengths: list[str] = Field(
        default_factory=list,
        description="Bucket 1: Strong skills directly transferable to the target role"
    )
    missing_core_skills: list[str] = Field(
        default_factory=list,
        description="Bucket 2: Mandatory industry requirements currently missing or weak"
    )
    critical_blindspots: list[str] = Field(
        default_factory=list,
        description="Bucket 3: High-frequency interview traps or system design blindspots"
    )
    suggested_focus_areas: list[str] = Field(
        default_factory=list,
        description="Prioritized order of technical domains to tackle"
    )


class LearningTask(BaseModel):
    """An actionable, measurable task within a weekly milestone."""
    id: str = Field(..., description="Unique task identifier e.g. 't1-1'")
    title: str = Field(..., description="Actionable task title")
    category: Literal["theory", "coding_lab", "project", "mock_prep"] = Field(
        default="theory",
        description="Category of study task"
    )
    estimated_hours: float = Field(default=2.0, ge=0.5, description="Estimated study duration")
    completed: bool = Field(default=False, description="Whether the user checked off this task")
    resources: list[str] = Field(default_factory=list, description="Recommended docs, articles, or repos")


class WeeklyMilestone(BaseModel):
    """A week-by-week curriculum module."""
    week_number: int = Field(..., ge=1, le=24, description="Sequential week number")
    title: str = Field(..., description="Weekly theme title e.g. 'Distributed Caching & Redis'")
    theme: str = Field(default="", description="High-level focus area")
    goals: list[str] = Field(default_factory=list, description="Core competencies to achieve this week")
    tasks: list[LearningTask] = Field(default_factory=list, description="Actionable study checklist")
    checkpoint_mock_topic: str = Field(
        default="System Design",
        description="Topic for mock interview check at the end of the week"
    )
    checkpoint_score: float | None = Field(
        default=None,
        ge=0.0,
        le=10.0,
        description="Candidate's latest score on this week's mock interview"
    )
    status: Literal["pending", "in_progress", "completed"] = Field(
        default="pending",
        description="Milestone status"
    )


class PortfolioProject(BaseModel):
    """Production-grade portfolio project blueprint designed to prove missing skills."""
    id: str = Field(..., description="Unique project id")
    title: str = Field(..., description="Project name")
    difficulty: Literal["Intermediate", "Advanced", "Staff"] = Field(default="Advanced")
    description: str = Field(..., description="Problem statement and business value")
    tech_stack: list[str] = Field(default_factory=list, description="Modern technologies used")
    target_gaps_addressed: list[str] = Field(
        default_factory=list,
        description="List of skill gaps proven by building this"
    )
    architecture_summary: str = Field(..., description="Architecture and system design notes")
    key_deliverables: list[str] = Field(default_factory=list, description="Bullet deliverables")
    github_blueprint: list[str] = Field(
        default_factory=list,
        description="Recommended repo layout or implementation milestones"
    )
    interview_trap_question: str | None = Field(default=None, description="Toughest question an interviewer will grill candidate on")
    staff_defense_answer: str | None = Field(default=None, description="How to answer like a staff engineer")
    architecture_diagram: str | None = Field(default=None, description="ASCII or text topology diagram")


class JobApplication(BaseModel):
    """Tracked job application with outcome data for machine learning pattern analysis."""
    id: str = Field(..., description="Unique application ID")
    company: str = Field(..., description="Target company")
    role_title: str = Field(..., description="Role title applied for")
    job_url: str | None = Field(default=None, description="Posting link")
    applied_date: str = Field(default_factory=lambda: datetime.now(UTC).strftime("%Y-%m-%d"))
    status: Literal["applied", "screening", "interview", "offer", "rejected"] = Field(
        default="applied"
    )
    match_score: int = Field(default=75, ge=0, le=100, description="Match score calculated by coach")
    notes: str | None = Field(default=None, description="Candidate or interview notes")
    response_received: bool = Field(default=False, description="Did the company reply/callback")


class PivotPlan(BaseModel):
    """The central state of the candidate's career pivot journey."""
    plan_id: str = Field(..., description="Unique plan UUID")
    user_id: int | str = Field(..., description="User ID owning this plan")
    current_role: str = Field(..., description="Candidate's current or previous role")
    target_role: str = Field(..., description="Aspirational pivot role")
    experience_years: float = Field(default=1.0, ge=0.0)
    weekly_hours: int = Field(default=12, ge=4, le=60)
    gap_map: SkillGapMap
    roadmap: list[WeeklyMilestone] = Field(default_factory=list)
    portfolio_projects: list[PortfolioProject] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())


class PlanAdjustment(BaseModel):
    """Dynamic plan adjustment generated by closed-loop mock interview feedback."""
    interview_id: str | None = None
    topic: str
    score: float
    action: Literal["remediate", "advance", "reinforce"]
    reason: str
    affected_weeks: list[int] = Field(default_factory=list)
    added_tasks: list[LearningTask] = Field(default_factory=list)


class ATSAnalysisResult(BaseModel):
    """Deep ATS and Job Description benchmark analysis."""
    match_score: int = Field(ge=0, le=100)
    summary: str
    matched_keywords: list[str] = Field(default_factory=list)
    missing_critical_keywords: list[str] = Field(default_factory=list)
    bullet_point_rewrites: list[dict[str, str]] = Field(default_factory=list)
    formatting_feedback: list[str] = Field(default_factory=list)


class NegotiationStrategy(BaseModel):
    """Offer negotiation and down-leveling defense kit for career pivoters."""
    target_role: str
    down_leveling_defense: list[str] = Field(default_factory=list)
    counter_offer_script: str
    verbal_talking_points: list[str] = Field(default_factory=list)
    benchmarks: dict[str, str] = Field(default_factory=dict)
    leverage_strategies: list[str] = Field(default_factory=list)


class PersonalBrandKit(BaseModel):
    """LinkedIn personal brand reframing and cold outreach kit."""
    linkedin_headlines: list[str] = Field(default_factory=list)
    about_narrative: str
    hiring_manager_outreach_dm: str
    recruiter_search_keywords: list[str] = Field(default_factory=list)
    portfolio_hook_statement: str

