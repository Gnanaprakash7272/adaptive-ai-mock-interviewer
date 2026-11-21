"""Unit and integration tests for Career Pivot Coach Agent."""

from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient

from api.main import app
from intelligence.career_coach.adaptive_engine import adjust_roadmap_after_mock
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
    SkillGapMap,
    WeeklyMilestone,
)


@pytest.fixture
def sample_gap_map() -> SkillGapMap:
    return SkillGapMap(
        target_role="Senior Distributed Systems Engineer",
        seniority_level="Senior",
        market_readiness_score=65,
        summary="Solid backend fundamentals with gaps in distributed consensus and caching.",
        transferable_strengths=["Python", "REST APIs", "SQL"],
        missing_core_skills=["Distributed Caching / Redis", "Raft Consensus", "Kafka Streaming"],
        critical_blindspots=["Split-brain scenarios", "Thundering herd problem"],
        suggested_focus_areas=["Distributed Systems", "Message Brokers", "High-Scale Database"],
    )


@pytest.fixture
def sample_plan(sample_gap_map) -> PivotPlan:
    return PivotPlan(
        plan_id="plan-test-123",
        user_id="test_user",
        current_role="Junior Backend Developer",
        target_role="Senior Distributed Systems Engineer",
        experience_years=2.0,
        weekly_hours=15,
        gap_map=sample_gap_map,
        roadmap=[
            WeeklyMilestone(
                week_number=1,
                title="Week 1: Caching Foundations",
                theme="Redis & In-Memory Stores",
                goals=["Understand eviction policies"],
                tasks=[
                    LearningTask(id="w1-1", title="Build LRU cache", category="coding_lab", estimated_hours=2.0)
                ],
                checkpoint_mock_topic="System Design",
                status="in_progress",
            ),
            WeeklyMilestone(
                week_number=2,
                title="Week 2: Consensus",
                theme="Raft & Paxos",
                goals=["Leader election"],
                tasks=[
                    LearningTask(id="w2-1", title="Simulate Raft heartbeat", category="coding_lab", estimated_hours=3.0)
                ],
                checkpoint_mock_topic="Concurrency & Multithreading",
                status="pending",
            ),
        ],
        portfolio_projects=[],
    )


def test_gap_analyzer_fallback():
    """Verify fallback gap analysis categorizes into exactly 3 buckets."""
    gap = analyze_skill_gaps(
        candidate_profile_or_text="Fullstack developer with React and Node.js",
        target_role="Senior AI Engineer",
    )
    assert gap.target_role == "Senior AI Engineer"
    assert 0 <= gap.market_readiness_score <= 100
    assert len(gap.transferable_strengths) > 0
    assert len(gap.missing_core_skills) > 0
    assert len(gap.critical_blindspots) > 0


def test_roadmap_generator_fallback(sample_gap_map):
    """Verify learning roadmap generates 6 weeks with checkpoint topics."""
    roadmap = generate_learning_roadmap(sample_gap_map, "Senior Distributed Systems Engineer", weeks=6)
    assert len(roadmap) == 6
    assert roadmap[0].week_number == 1
    assert roadmap[0].status == "in_progress"
    assert len(roadmap[0].tasks) > 0
    assert roadmap[0].checkpoint_mock_topic != ""


def test_portfolio_architect_fallback(sample_gap_map):
    """Verify portfolio blueprints have architecture and tech stacks."""
    projects = generate_portfolio_projects(sample_gap_map, "Senior Distributed Systems Engineer")
    assert len(projects) >= 2
    for p in projects:
        assert p.title != ""
        assert len(p.tech_stack) > 0
        assert len(p.target_gaps_addressed) > 0
        assert p.architecture_summary != ""


def test_adaptive_engine_remediation(sample_plan):
    """Score < 6.5 triggers remediation action and injects tasks."""
    adj = adjust_roadmap_after_mock(
        current_plan=sample_plan,
        mock_topic="System Design",
        score=5.2,
        weak_concepts=["Cache stampede", "Write-behind caching"],
    )
    assert adj.action == "remediate"
    assert 1 in adj.affected_weeks
    assert len(adj.added_tasks) > 0
    assert sample_plan.roadmap[0].checkpoint_score == 5.2
    assert sample_plan.roadmap[0].status == "in_progress"


def test_adaptive_engine_advance(sample_plan):
    """Score >= 8.5 marks current week complete and advances to next."""
    adj = adjust_roadmap_after_mock(
        current_plan=sample_plan,
        mock_topic="System Design",
        score=9.0,
    )
    assert adj.action == "advance"
    assert sample_plan.roadmap[0].status == "completed"
    assert sample_plan.roadmap[1].status == "in_progress"


def test_application_tracker_trends():
    """Verify funnel analysis and response rate calculation."""
    apps = [
        JobApplication(id="1", company="A", role_title="Distributed Systems", status="interview", response_received=True),
        JobApplication(id="2", company="B", role_title="Senior Backend", status="screening", response_received=True),
        JobApplication(id="3", company="C", role_title="Junior Dev", status="applied", response_received=False),
        JobApplication(id="4", company="D", role_title="Fullstack", status="rejected", response_received=False),
    ]
    trends = analyze_application_trends(apps)
    assert trends["total_applications"] == 4
    assert trends["funnel"]["interview"] == 1
    assert trends["funnel"]["screening"] == 1
    assert trends["response_rate"] == 50.0
    assert len(trends["insights"]) > 0

    recs = generate_application_recommendations(apps, "Distributed Systems Engineer")
    assert len(recs) > 0


def test_fastapi_coach_endpoints():
    """Integration test for /coach endpoints using TestClient."""
    client = TestClient(app)

    # 1. GET /coach/plan
    resp = client.get("/coach/plan")
    assert resp.status_code == 200
    plan_data = resp.json()
    assert "roadmap" in plan_data
    assert "gap_map" in plan_data

    # 2. POST /coach/intake
    intake_payload = {
        "current_role": "Backend Developer",
        "target_role": "Staff Platform Engineer",
        "experience_years": 4.0,
        "weekly_hours": 15,
        "job_description": "We are seeking a Staff Platform Engineer with deep Kubernetes and Go expertise."
    }
    intake_resp = client.post("/coach/intake", json=intake_payload)
    assert intake_resp.status_code == 200
    new_plan = intake_resp.json()
    assert new_plan["target_role"] == "Staff Platform Engineer"
    assert len(new_plan["roadmap"]) == 6

    # 3. POST /coach/adapt
    adapt_payload = {
        "mock_topic": "System Design",
        "score": 5.8,
        "weak_concepts": ["Load balancer session stickiness", "Distributed locking"],
    }
    adapt_resp = client.post("/coach/adapt", json=adapt_payload)
    assert adapt_resp.status_code == 200
    adj = adapt_resp.json()
    assert adj["action"] == "remediate"

    # 4. Applications endpoints
    app_payload = {
        "company": "Google",
        "role_title": "Software Engineer III - Cloud",
        "status": "applied",
        "match_score": 85,
    }
    create_app = client.post("/coach/applications", json=app_payload)
    assert create_app.status_code == 200
    created_id = create_app.json()["id"]

    # 5. GET /coach/applications
    apps_list = client.get("/coach/applications")
    assert apps_list.status_code == 200
    assert any(a["id"] == created_id for a in apps_list.json())

    # 6. GET /coach/analytics
    analytics = client.get("/coach/analytics")
    assert analytics.status_code == 200
    assert "funnel" in analytics.json()
    assert "response_rate" in analytics.json()
