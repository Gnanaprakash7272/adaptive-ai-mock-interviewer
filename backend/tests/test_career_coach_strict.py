"""Strict comprehensive unit and integration test suite for Career Pivot Coach.
Tests every single function, branch, and edge case across:
- gap_analyzer
- roadmap_generator
- portfolio_architect
- adaptive_engine
- application_tracker
- coach_repository
- coach_router
"""

from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient

from api.main import app
import api.coach_repository as coach_repo
from intelligence.career_coach.adaptive_engine import adjust_roadmap_after_mock
from intelligence.career_coach.application_tracker import (
    analyze_application_trends,
    generate_application_recommendations,
)
from intelligence.career_coach.gap_analyzer import (
    _build_user_prompt,
    _fallback_gap_analysis,
    analyze_skill_gaps,
)
from intelligence.career_coach.portfolio_architect import (
    _fallback_projects,
    generate_portfolio_projects,
)
from intelligence.career_coach.roadmap_generator import (
    _fallback_roadmap,
    generate_learning_roadmap,
)
from intelligence.career_coach.state import (
    JobApplication,
    LearningTask,
    PivotPlan,
    PortfolioProject,
    SkillGapMap,
    WeeklyMilestone,
)


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture
def senior_gap_map() -> SkillGapMap:
    return SkillGapMap(
        target_role="Senior Distributed Systems Engineer",
        seniority_level="Senior",
        market_readiness_score=62,
        summary="Experienced engineer bridging distributed caching & message brokers.",
        transferable_strengths=["Python", "PostgreSQL", "FastAPI"],
        missing_core_skills=["Distributed Caching", "Kafka Message Queues", "System Scalability"],
        critical_blindspots=["Split-Brain Consensus", "Thundering Herd Problem"],
        suggested_focus_areas=["Redis Architecture", "Kafka Streaming"],
    )


@pytest.fixture
def fresher_gap_map() -> SkillGapMap:
    return SkillGapMap(
        target_role="Software Engineer (SDE-1)",
        seniority_level="Entry-Level / Fresher",
        market_readiness_score=70,
        summary="Strong CS fundamentals with focus on DSA and deployed projects.",
        transferable_strengths=["OOP", "Data Structures", "OS Fundamentals"],
        missing_core_skills=["Cloud Deployment (Docker/Vercel)", "Production REST APIs"],
        critical_blindspots=["Boundary condition testing in live coding"],
        suggested_focus_areas=["LeetCode Medium Patterns", "Production Full-Stack App"],
    )


@pytest.fixture
def sample_pivot_plan(senior_gap_map) -> PivotPlan:
    return PivotPlan(
        plan_id="strict-plan-1",
        user_id="strict-user",
        current_role="Full Stack Developer",
        target_role="Senior Distributed Systems Engineer",
        experience_years=3.0,
        weekly_hours=15,
        gap_map=senior_gap_map,
        roadmap=[
            WeeklyMilestone(
                week_number=1,
                title="Week 1: Caching",
                theme="Redis",
                goals=["Master caching"],
                tasks=[
                    LearningTask(id="w1-1", title="Task 1", category="theory", estimated_hours=2.0),
                    LearningTask(id="w1-2", title="Task 2", category="coding_lab", estimated_hours=3.0),
                ],
                checkpoint_mock_topic="Backend Systems & Databases",
                status="in_progress",
            ),
            WeeklyMilestone(
                week_number=2,
                title="Week 2: Queues",
                theme="Kafka",
                goals=["Master queues"],
                tasks=[
                    LearningTask(id="w2-1", title="Task 3", category="coding_lab", estimated_hours=4.0),
                ],
                checkpoint_mock_topic="System Design",
                status="pending",
            ),
        ],
        portfolio_projects=[],
    )


# =============================================================================
# 1. GAP ANALYZER TESTS
# =============================================================================

class TestGapAnalyzer:
    def test_build_user_prompt_with_dict(self):
        profile = {
            "skills": {"languages": ["Python", "Go"]},
            "experience": ["3 years at FinTech startup"],
            "projects": ["Payment gateway integration"],
        }
        prompt = _build_user_prompt(profile, "Senior Backend Engineer", "Looking for Go/K8s exp")
        assert "Candidate Skills:" in prompt
        assert "Payment gateway integration" in prompt
        assert "Target Role: Senior Backend Engineer" in prompt
        assert "Looking for Go/K8s exp" in prompt

    def test_build_user_prompt_with_long_string_truncation(self):
        long_resume = "Expert developer " * 1000
        long_jd = "Requirements for role " * 1000
        prompt = _build_user_prompt(long_resume, "Staff Engineer", long_jd)
        assert len(prompt) < 10000
        assert "Target Role: Staff Engineer" in prompt

    def test_fallback_fresher_keywords(self):
        fresher_inputs = [
            "Final year college student studying computer science",
            "Recent graduate with 0 years experience seeking entry level job",
            "B.Tech CS Fresher looking for SDE-1 position",
            "Bootcamp student with zero YOE",
            "0.0 years experience",
        ]
        for inp in fresher_inputs:
            gap = _fallback_gap_analysis("Software Engineer (SDE-1)", inp)
            assert gap.seniority_level == "Entry-Level / Fresher"
            assert "Entry-Level" in gap.seniority_level or "Fresher" in gap.seniority_level
            assert any("DSA" in s or "Algorithmic" in s or "Data Structures" in s for s in gap.transferable_strengths)

    def test_fallback_ai_ml_role(self):
        gap = _fallback_gap_analysis("AI & Machine Learning Engineer", "Backend dev with 3 years Python")
        assert "AI" in gap.summary or "ML" in gap.summary
        assert any("RAG" in s or "LLM" in s for s in gap.missing_core_skills)

    def test_fallback_general_backend(self):
        gap = _fallback_gap_analysis("Senior DevOps Engineer", "Developer with 4 years experience")
        assert len(gap.missing_core_skills) >= 3
        assert len(gap.critical_blindspots) >= 2

    def test_analyze_skill_gaps_llm_success(self, senior_gap_map):
        mock_response = {
            "target_role": "Agentic AI Engineer",
            "seniority_level": "Senior",
            "market_readiness_score": 75,
            "summary": "AI Engineer ready to deploy multi-agent systems.",
            "transferable_strengths": ["FastAPI", "Python"],
            "missing_core_skills": ["LangGraph", "ChromaDB"],
            "critical_blindspots": ["Context window bloat"],
            "suggested_focus_areas": ["RAG Evaluation"],
        }
        with patch("intelligence.career_coach.gap_analyzer.call_gemini_json", return_value=mock_response):
            gap = analyze_skill_gaps("Python backend engineer", "Agentic AI Engineer")
            assert gap.target_role == "Agentic AI Engineer"
            assert gap.market_readiness_score == 75
            assert "LangGraph" in gap.missing_core_skills

    def test_analyze_skill_gaps_llm_fallback(self):
        with patch("intelligence.career_coach.gap_analyzer.call_gemini_json", side_effect=RuntimeError("Quota exceeded")):
            gap = analyze_skill_gaps("College student fresher", "SDE-1")
            assert gap.seniority_level == "Entry-Level / Fresher"
            assert gap.market_readiness_score > 0


# =============================================================================
# 2. ROADMAP GENERATOR TESTS
# =============================================================================

class TestRoadmapGenerator:
    def test_fallback_roadmap_full_weeks(self, senior_gap_map):
        roadmap = _fallback_roadmap(senior_gap_map, "Senior Distributed Systems Engineer")
        assert len(roadmap) == 6
        assert roadmap[0].week_number == 1
        assert roadmap[0].status == "in_progress"
        assert all(m.checkpoint_mock_topic != "" for m in roadmap)
        assert all(len(m.tasks) > 0 for m in roadmap)

    def test_fallback_roadmap_empty_gaps(self):
        empty_gap = SkillGapMap(
            target_role="Full Stack Dev",
            seniority_level="Mid-Level",
            market_readiness_score=50,
            summary="Empty gap",
            transferable_strengths=[],
            missing_core_skills=[],
            critical_blindspots=[],
            suggested_focus_areas=[],
        )
        roadmap = _fallback_roadmap(empty_gap, "Full Stack Dev")
        assert len(roadmap) == 6
        assert "Mastering" in roadmap[0].theme

    def test_generate_learning_roadmap_llm_success(self, senior_gap_map):
        mock_data = {
            "roadmap": [
                {
                    "week_number": 1,
                    "title": "Week 1: Core Async",
                    "theme": "AsyncIO",
                    "goals": ["Master event loops"],
                    "tasks": [
                        {"id": "w1-1", "title": "Build async pool", "category": "coding_lab", "estimated_hours": 3.0}
                    ],
                    "checkpoint_mock_topic": "Concurrency & Multithreading",
                }
            ]
        }
        with patch("intelligence.career_coach.roadmap_generator.call_gemini_json", return_value=mock_data):
            roadmap = generate_learning_roadmap(senior_gap_map, "Senior Backend Engineer")
            assert len(roadmap) == 1
            assert roadmap[0].title == "Week 1: Core Async"
            assert roadmap[0].status == "in_progress"


# =============================================================================
# 3. PORTFOLIO ARCHITECT TESTS
# =============================================================================

class TestPortfolioArchitect:
    def test_fallback_projects_fresher(self, fresher_gap_map):
        projects = _fallback_projects(fresher_gap_map, "Software Engineer (SDE-1)")
        assert len(projects) >= 2
        assert any("Microservice" in p.title or "Algorithmic" in p.title for p in projects)
        assert all(len(p.tech_stack) > 0 for p in projects)
        assert all(len(p.key_deliverables) > 0 for p in projects)
        assert all(len(p.github_blueprint) > 0 for p in projects)

    def test_fallback_projects_senior(self, senior_gap_map):
        projects = _fallback_projects(senior_gap_map, "Senior Distributed Systems Engineer")
        assert len(projects) >= 2
        assert any("Distributed" in p.title or "RAG" in p.title for p in projects)

    def test_generate_portfolio_projects_llm_success(self, senior_gap_map):
        mock_data = {
            "projects": [
                {
                    "id": "p-1",
                    "title": "Real-time Vector Search Engine",
                    "difficulty": "Advanced",
                    "description": "High performance vector search with HNSW",
                    "tech_stack": ["Rust", "Python", "gRPC"],
                    "target_gaps_addressed": ["Vector indexing"],
                    "architecture_summary": "gRPC gateway over Rust engine",
                    "key_deliverables": ["Sub-10ms search benchmark"],
                    "github_blueprint": ["src/lib.rs"],
                }
            ]
        }
        with patch("intelligence.career_coach.portfolio_architect.call_gemini_json", return_value=mock_data):
            projects = generate_portfolio_projects(senior_gap_map, "Senior Backend Engineer")
            assert len(projects) == 1
            assert projects[0].title == "Real-time Vector Search Engine"


# =============================================================================
# 4. ADAPTIVE ENGINE TESTS (STRICT BOUNDARY COVERAGE)
# =============================================================================

class TestAdaptiveEngine:
    def test_remediation_score_under_6_5(self, sample_pivot_plan):
        adj = adjust_roadmap_after_mock(
            current_plan=sample_pivot_plan,
            mock_topic="Backend Systems",
            score=4.5,
            weak_concepts=["Deadlocks", "Connection pool starvation"],
        )
        assert adj.action == "remediate"
        assert adj.score == 4.5
        assert 1 in adj.affected_weeks
        assert len(adj.added_tasks) == 3
        assert sample_pivot_plan.roadmap[0].status == "in_progress"
        assert sample_pivot_plan.roadmap[0].checkpoint_score == 4.5

    def test_reinforce_score_between_6_5_and_8_4(self, sample_pivot_plan):
        adj = adjust_roadmap_after_mock(
            current_plan=sample_pivot_plan,
            mock_topic="System Design",
            score=7.2,
            weak_concepts=["Cache eviction policies"],
        )
        assert adj.action == "reinforce"
        assert adj.score == 7.2
        assert 1 in adj.affected_weeks
        assert len(adj.added_tasks) == 1
        assert sample_pivot_plan.roadmap[0].checkpoint_score == 7.2

    def test_advance_score_8_5_and_above(self, sample_pivot_plan):
        adj = adjust_roadmap_after_mock(
            current_plan=sample_pivot_plan,
            mock_topic="System Design",
            score=8.5,
        )
        assert adj.action == "advance"
        assert sample_pivot_plan.roadmap[0].status == "completed"
        assert all(t.completed for t in sample_pivot_plan.roadmap[0].tasks)
        assert sample_pivot_plan.roadmap[1].status == "in_progress"
        assert len(sample_pivot_plan.roadmap[1].tasks) >= 2

    def test_advance_on_final_week_no_overflow(self, sample_pivot_plan):
        """When user scores >= 8.5 on the LAST week of the roadmap, no out-of-bounds error happens."""
        sample_pivot_plan.roadmap[0].status = "completed"
        sample_pivot_plan.roadmap[1].status = "in_progress"  # Week 2 is the last week in sample_pivot_plan

        adj = adjust_roadmap_after_mock(
            current_plan=sample_pivot_plan,
            mock_topic="Final Comprehensive Mock",
            score=9.5,
        )
        assert adj.action == "advance"
        assert sample_pivot_plan.roadmap[1].status == "completed"
        assert adj.affected_weeks == [2]
        assert any(t.id == "adv-2-1" for t in sample_pivot_plan.roadmap[1].tasks)

    def test_empty_roadmap_safeguard(self, sample_pivot_plan):
        sample_pivot_plan.roadmap = []
        adj = adjust_roadmap_after_mock(
            current_plan=sample_pivot_plan,
            mock_topic="System Design",
            score=8.0,
        )
        assert adj.action == "reinforce"
        assert adj.affected_weeks == []

    def test_no_in_progress_week_defaults_to_pending(self, sample_pivot_plan):
        sample_pivot_plan.roadmap[0].status = "completed"
        sample_pivot_plan.roadmap[1].status = "pending"
        adj = adjust_roadmap_after_mock(
            current_plan=sample_pivot_plan,
            mock_topic="System Design",
            score=6.0,
        )
        assert adj.action == "remediate"
        assert 2 in adj.affected_weeks


# =============================================================================
# 5. APPLICATION TRACKER TESTS
# =============================================================================

class TestApplicationTracker:
    def test_empty_applications(self):
        metrics = analyze_application_trends([])
        assert metrics["total_applications"] == 0
        assert metrics["response_rate"] == 0.0
        assert len(metrics["insights"]) > 0

    def test_accurate_response_rate_with_response_received_flag(self):
        """Tests that response_received=True is counted even if status is applied."""
        apps = [
            JobApplication(id="1", company="A", role_title="Backend Engineer", status="applied", response_received=True),
            JobApplication(id="2", company="B", role_title="Backend Engineer", status="applied", response_received=False),
        ]
        metrics = analyze_application_trends(apps)
        assert metrics["total_applications"] == 2
        assert metrics["response_rate"] == 50.0

    def test_empty_or_whitespace_role_title_handling(self):
        apps = [
            JobApplication(id="1", company="A", role_title="", status="screening", response_received=True),
            JobApplication(id="2", company="B", role_title="   ", status="applied", response_received=False),
        ]
        metrics = analyze_application_trends(apps)
        assert metrics["total_applications"] == 2
        assert metrics["response_rate"] == 50.0

    def test_high_response_rate_insight(self):
        apps = [
            JobApplication(id="1", company="A", role_title="AI Engineer", status="interview", response_received=True),
            JobApplication(id="2", company="B", role_title="AI Engineer", status="offer", response_received=True),
        ]
        metrics = analyze_application_trends(apps)
        assert metrics["response_rate"] == 100.0
        assert any("Strong response velocity" in s for s in metrics["insights"])

    def test_recommendations_thresholds(self):
        few_apps = [JobApplication(id="1", company="A", role_title="SWE", status="applied")]
        recs_few = generate_application_recommendations(few_apps, "Software Engineer")
        assert any("5-10 tailored applications" in r for r in recs_few)

        many_apps = [
            JobApplication(id=str(i), company=f"Company {i}", role_title="Agentic AI Engineer", status="screening", response_received=True)
            for i in range(6)
        ]
        recs_many = generate_application_recommendations(many_apps, "Agentic AI Engineer")
        assert any("Double down" in r or "Follow up" in r for r in recs_many)


# =============================================================================
# 6. REPOSITORY TESTS
# =============================================================================

class TestCoachRepository:
    def test_save_and_get_plan(self, sample_pivot_plan):
        coach_repo.save_pivot_plan(sample_pivot_plan)
        retrieved = coach_repo.get_pivot_plan("strict-user")
        assert retrieved is not None
        assert retrieved.plan_id == sample_pivot_plan.plan_id

    def test_application_lifecycle(self):
        user_id = "test-repo-user"
        initial_apps = coach_repo.get_applications(user_id)
        assert len(initial_apps) >= 3  # default seeds

        new_app = JobApplication(
            id="test-new-app-1",
            company="Anthropic",
            role_title="Member of Technical Staff",
            status="applied",
            match_score=92,
        )
        saved = coach_repo.save_application(user_id, new_app)
        assert saved.id == "test-new-app-1"

        # Update
        saved.status = "screening"
        saved.response_received = True
        updated = coach_repo.save_application(user_id, saved)
        assert updated.status == "screening"

        # Delete
        deleted = coach_repo.delete_application(user_id, "test-new-app-1")
        assert deleted is True

        # Delete non-existent
        deleted_fake = coach_repo.delete_application(user_id, "fake-app-999")
        assert deleted_fake is False


# =============================================================================
# 7. ROUTER HTTP ENDPOINTS (INTEGRATION TESTS)
# =============================================================================

class TestCoachRouterEndpoints:
    def setup_method(self):
        self.client = TestClient(app)

    def test_intake_fresher_track(self):
        payload = {
            "current_role": "College Student (CS / IT Fresher)",
            "target_role": "Software Engineer (SDE-1)",
            "experience_years": 0.0,
            "weekly_hours": 20,
        }
        res = self.client.post("/coach/intake", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["experience_years"] == 0.0
        assert data["target_role"] == "Software Engineer (SDE-1)"
        assert len(data["roadmap"]) == 6
        assert len(data["portfolio_projects"]) >= 2

    def test_toggle_task_and_auto_advance_milestone(self):
        # 1. Get plan to ensure a plan exists
        plan_res = self.client.get("/coach/plan")
        assert plan_res.status_code == 200
        plan = plan_res.json()
        week1 = plan["roadmap"][0]
        task_id = week1["tasks"][0]["id"]

        # 2. Toggle first task
        toggle_res = self.client.post(f"/coach/milestone/1/task/{task_id}/toggle")
        assert toggle_res.status_code == 200
        toggled_plan = toggle_res.json()
        assert toggled_plan["roadmap"][0]["tasks"][0]["completed"] is True

        # 3. Toggle non-existent task -> 404
        bad_toggle = self.client.post("/coach/milestone/1/task/non-existent-task-id/toggle")
        assert bad_toggle.status_code == 404

    def test_adapt_plan_endpoint(self):
        payload = {
            "mock_topic": "System Design",
            "score": 5.0,
            "weak_concepts": ["Distributed Locks"],
        }
        res = self.client.post("/coach/adapt", json=payload)
        assert res.status_code == 200
        adj = res.json()
        assert adj["action"] == "remediate"
        assert adj["score"] == 5.0

    def test_application_crud_endpoints(self):
        # Create
        create_res = self.client.post("/coach/applications", json={
            "company": "Netflix",
            "role_title": "Senior Distributed Systems Engineer",
            "status": "applied",
            "match_score": 90,
        })
        assert create_res.status_code == 200
        app_id = create_res.json()["id"]

        # Patch
        patch_res = self.client.patch(f"/coach/applications/{app_id}", json={
            "status": "interview",
            "notes": "Passed system design round with flying colors",
        })
        assert patch_res.status_code == 200
        assert patch_res.json()["status"] == "interview"
        assert patch_res.json()["response_received"] is True

        # Patch non-existent
        bad_patch = self.client.patch("/coach/applications/non-existent-id", json={"status": "offer"})
        assert bad_patch.status_code == 404

        # Delete
        del_res = self.client.delete(f"/coach/applications/{app_id}")
        assert del_res.status_code == 200
        assert del_res.json()["success"] is True

        # Delete non-existent
        bad_del = self.client.delete("/coach/applications/non-existent-id")
        assert bad_del.status_code == 404

    def test_analytics_endpoint(self):
        res = self.client.get("/coach/analytics")
        assert res.status_code == 200
        data = res.json()
        assert "funnel" in data
        assert "response_rate" in data
        assert "recommendations" in data
        assert "target_role" in data

    def test_villain_chat_endpoint(self):
        res = self.client.post("/coach/villain/chat", json={
            "message": "Analyze my resume and tell me what role to try for",
            "conversation_history": [],
            "resume_context": {
                "candidate": {"name": "Test Candidate"},
                "skills": {"languages": ["Python", "JavaScript"], "databases": ["PostgreSQL"]},
                "projects": [{"name": "Blog App", "description": "CRUD blog", "technologies": ["Python", "Flask"]}],
            },
            "target_role": "Software Engineer (SDE-1)",
        })
        assert res.status_code == 200
        data = res.json()
        assert "villain_message" in data
        assert "verdict" in data
        assert "projects" in data
        assert isinstance(data["projects"], list)

    def test_villain_agent_fallback_scenarios(self):
        from intelligence.career_coach.villain_agent import _fallback_villain

        # 1. Resume analysis
        r1 = _fallback_villain("analyze my resume and tell me what role to target")
        assert "Current Status" in r1["villain_message"]
        assert len(r1["projects"]) >= 1

        # 2. Roast clone
        r2 = _fallback_villain("I built a ToDo list and Weather app")
        assert r2["verdict"] == "Weak Clone"
        assert len(r2["projects"]) >= 1

        # 3. Transition to target job
        r3 = _fallback_villain("I want to become SDE-1 Backend from my current status", target_role="SDE-1 Backend")
        assert "SDE-1 Backend" in r3["villain_message"]
        assert len(r3["projects"]) >= 1

    def test_add_portfolio_project_endpoint(self):
        # Seed plan first
        self.client.get("/coach/plan")

        new_proj = {
            "id": "proj-custom-test-1",
            "title": "Distributed Web Crawler",
            "difficulty": "Advanced",
            "description": "Distributed URL crawler with frontier queues",
            "tech_stack": ["Go", "Redis", "PostgreSQL"],
            "target_gaps_addressed": ["Distributed Queuing"],
            "architecture_summary": "Master-worker architecture with URL deduplication in Bloom filter",
            "key_deliverables": ["Docker Compose cluster", "1,000 pages/min crawler benchmark"],
            "github_blueprint": ["cmd/crawler/main.go", "internal/dedup/bloom.go"],
        }
        res = self.client.post("/coach/portfolio/add", json=new_proj)
        assert res.status_code == 200, res.json()
        plan = res.json()
        assert any(p["id"] == "proj-custom-test-1" for p in plan["portfolio_projects"])
