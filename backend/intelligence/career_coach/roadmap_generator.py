"""roadmap_generator.py

Generates a week-by-week structured learning plan tailored to bridge the candidate's
specific missing skills and blindspots.
Each week culminates in a checkpoint mock interview topic.
"""

from __future__ import annotations

import logging
from typing import Any

from gemini_config import call_gemini_json
from intelligence.career_coach.state import LearningTask, SkillGapMap, WeeklyMilestone

logger = logging.getLogger(__name__)

ROADMAP_SYSTEM_PROMPT = """You are a Principal Engineering Career Mentor.
Given a candidate's target role and their specific skill gap map (strengths, missing skills, blindspots),
generate an intensive, practical week-by-week learning roadmap (typically 4 to 8 weeks).

For each week:
- week_number: 1, 2, 3...
- title: Concise thematic title (e.g., "Week 1: Foundations of Distributed Caching")
- theme: Broad focus area
- goals: 2-3 specific learning outcomes
- tasks: List of 3-5 concrete tasks with:
    - id: e.g. "w1-1", "w1-2"
    - title: Clear, actionable task statement (e.g. "Build a Redis LRU Cache wrapper with TTL in Python")
    - category: "theory" | "coding_lab" | "project" | "mock_prep"
    - estimated_hours: float between 1.0 and 5.0
    - resources: 1-2 documentation links or topic references
- checkpoint_mock_topic: One of ["System Design", "Backend Systems & Databases", "Concurrency & Multithreading", "API & Microservices Architecture", "Data Structures & Algorithms", "Behavioral & Leadership"]
- status: "in_progress" for week 1, "pending" for subsequent weeks.

Return valid JSON with key "roadmap": [ ... list of weekly milestones ... ]."""


def _fallback_roadmap(gap_map: SkillGapMap, target_role: str) -> list[WeeklyMilestone]:
    """Fallback 6-week curriculum tailored to core software & AI/backend topics."""
    missing = gap_map.missing_core_skills
    m1 = missing[0] if len(missing) > 0 else "Advanced Data Structures & Concurrency"
    m2 = missing[1] if len(missing) > 1 else "Distributed Systems & Caching"
    m3 = missing[2] if len(missing) > 2 else "Scalable Database Design & Query Optimization"

    return [
        WeeklyMilestone(
            week_number=1,
            title="Core Mastery & Architecture Deep-Dive",
            theme=f"Mastering {m1}",
            goals=[
                f"Understand deep mechanical sympathy of {m1}",
                "Identify common architectural failure modes in production",
            ],
            tasks=[
                LearningTask(
                    id="w1-1",
                    title=f"Study core design patterns and concurrency models related to {m1}",
                    category="theory",
                    estimated_hours=3.0,
                    resources=["Official Documentation", "Martin Kleppmann - Designing Data-Intensive Applications"],
                ),
                LearningTask(
                    id="w1-2",
                    title="Implement a zero-dependency prototype handling edge cases and backpressure",
                    category="coding_lab",
                    estimated_hours=4.0,
                    resources=["GitHub open-source reference implementations"],
                ),
                LearningTask(
                    id="w1-3",
                    title="Run benchmark tests comparing throughput and latency under 1,000 concurrent requests",
                    category="project",
                    estimated_hours=3.5,
                ),
                LearningTask(
                    id="w1-4",
                    title="Prepare STAR method stories explaining architecture trade-offs",
                    category="mock_prep",
                    estimated_hours=2.0,
                ),
            ],
            checkpoint_mock_topic="Backend Systems & Databases",
            status="in_progress",
        ),
        WeeklyMilestone(
            week_number=2,
            title="Distributed Caching & High-Throughput IO",
            theme=f"Scaling with {m2}",
            goals=[
                "Implement Redis caching patterns (Cache-Aside, Write-Through)",
                "Avoid cache stampedes, penetration, and thundering herd problems",
            ],
            tasks=[
                LearningTask(
                    id="w2-1",
                    title="Read Redis architecture guide: In-memory data structures, replication & pub/sub",
                    category="theory",
                    estimated_hours=2.5,
                    resources=["Redis Documentation - Data Types and Memory Optimization"],
                ),
                LearningTask(
                    id="w2-2",
                    title="Build a FastAPI middleware implementing token-bucket rate limiting via Redis",
                    category="coding_lab",
                    estimated_hours=4.5,
                ),
                LearningTask(
                    id="w2-3",
                    title="Set up Distributed Locking with Redlock algorithm and lease expiration",
                    category="coding_lab",
                    estimated_hours=3.0,
                ),
            ],
            checkpoint_mock_topic="Concurrency & Multithreading",
            status="pending",
        ),
        WeeklyMilestone(
            week_number=3,
            title="Database Internals & Storage Engines",
            theme=f"Optimizing {m3}",
            goals=[
                "Master B-Trees, LSM-Trees, and PostgreSQL indexing strategies (GIN, GiST, BRIN)",
                "Perform query plan analysis using EXPLAIN ANALYZE to eliminate sequential scans",
            ],
            tasks=[
                LearningTask(
                    id="w3-1",
                    title="Analyze query execution plans: nested loops vs hash joins vs merge joins",
                    category="theory",
                    estimated_hours=3.0,
                    resources=["Use The Index, Luke! - SQL Indexing Explained"],
                ),
                LearningTask(
                    id="w3-2",
                    title="Refactor slow N+1 ORM queries into optimized batch CTE statements with connection pooling",
                    category="coding_lab",
                    estimated_hours=4.0,
                ),
                LearningTask(
                    id="w3-3",
                    title="Simulate database partition strategies and read-replica replication lag",
                    category="project",
                    estimated_hours=3.5,
                ),
            ],
            checkpoint_mock_topic="Backend Systems & Databases",
            status="pending",
        ),
        WeeklyMilestone(
            week_number=4,
            title="Event-Driven Microservices & Asynchronous Queues",
            theme="Message Brokers & Resilient Messaging",
            goals=[
                "Design decoupled systems using Kafka/RabbitMQ",
                "Ensure at-least-once delivery, idempotency, and dead-letter queues",
            ],
            tasks=[
                LearningTask(
                    id="w4-1",
                    title="Deep dive into Kafka partitions, consumer groups, and offset management",
                    category="theory",
                    estimated_hours=3.0,
                ),
                LearningTask(
                    id="w4-2",
                    title="Build an idempotent consumer with Redis-based de-duplication window",
                    category="coding_lab",
                    estimated_hours=4.5,
                ),
                LearningTask(
                    id="w4-3",
                    title="Implement Saga pattern with compensation transactions across two microservices",
                    category="project",
                    estimated_hours=5.0,
                ),
            ],
            checkpoint_mock_topic="API & Microservices Architecture",
            status="pending",
        ),
        WeeklyMilestone(
            week_number=5,
            title="System Design at Scale & High Availability",
            theme="End-to-End System Design for Target Role",
            goals=[
                "Design a high-QPS system (e.g., URL shortener, Rate limiter, or Distributed Log)",
                "Calculate capacity estimations: QPS, bandwidth, storage, cache sizing",
            ],
            tasks=[
                LearningTask(
                    id="w5-1",
                    title="Draft complete architectural diagram for target company scale (100M DAU)",
                    category="theory",
                    estimated_hours=3.5,
                ),
                LearningTask(
                    id="w5-2",
                    title="Practice back-of-the-envelope math calculations for storage and network throughput",
                    category="coding_lab",
                    estimated_hours=3.0,
                ),
                LearningTask(
                    id="w5-3",
                    title="Conduct timed 45-minute self-guided whiteboard design walkthrough",
                    category="mock_prep",
                    estimated_hours=2.5,
                ),
            ],
            checkpoint_mock_topic="System Design",
            status="pending",
        ),
        WeeklyMilestone(
            week_number=6,
            title="Final Mock Interview Calibration & Portfolio Review",
            theme="Hiring Bar Calibration & Executive Presence",
            goals=[
                "Achieve a score >= 8.5/10 on the end-to-end target role mock interview",
                "Polish portfolio repository Readme, architecture diagrams, and live demos",
            ],
            tasks=[
                LearningTask(
                    id="w6-1",
                    title="Complete Mockora Comprehensive Senior Mock Interview loop",
                    category="mock_prep",
                    estimated_hours=2.5,
                ),
                LearningTask(
                    id="w6-2",
                    title="Publish portfolio project with CI/CD pipeline, Docker container, and architecture diagram",
                    category="project",
                    estimated_hours=4.0,
                ),
                LearningTask(
                    id="w6-3",
                    title="Tailor resume bullet points using quantified business metrics (X-Y-Z formula)",
                    category="theory",
                    estimated_hours=2.0,
                ),
            ],
            checkpoint_mock_topic="Behavioral & Leadership",
            status="pending",
        ),
    ]


def generate_learning_roadmap(
    gap_map: SkillGapMap,
    target_role: str,
    weeks: int = 6,
    hours_per_week: int = 15,
) -> list[WeeklyMilestone]:
    """Generates an adaptive week-by-week roadmap via Gemini or deterministic fallback."""
    user_prompt = f"""Target Role: {target_role}
Total Weeks: {weeks}
Weekly Hours Available: {hours_per_week}

Skill Gaps to Solve:
- Missing Core Skills: {gap_map.missing_core_skills}
- Critical Blindspots: {gap_map.critical_blindspots}
- Suggested Focus Areas: {gap_map.suggested_focus_areas}

Generate a comprehensive, week-by-week plan ({weeks} weeks total) designed to systematically turn these weaknesses into interview strengths."""

    try:
        response = call_gemini_json(
            system_prompt=ROADMAP_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            temperature=0.4,
            max_output_tokens=2500,
            operation="career_coach_roadmap",
        )

        raw_milestones = response.get("roadmap") or response.get("milestones") or []
        if not raw_milestones:
            raise ValueError("No milestones returned from LLM")

        milestones: list[WeeklyMilestone] = []
        for i, item in enumerate(raw_milestones, start=1):
            tasks_list = []
            for t in item.get("tasks", []):
                tasks_list.append(
                    LearningTask(
                        id=t.get("id", f"w{i}-{len(tasks_list)+1}"),
                        title=t.get("title", "Practice exercises"),
                        category=t.get("category", "coding_lab"),
                        estimated_hours=float(t.get("estimated_hours", 2.0)),
                        completed=bool(t.get("completed", False)),
                        resources=t.get("resources", []),
                    )
                )

            milestones.append(
                WeeklyMilestone(
                    week_number=int(item.get("week_number", i)),
                    title=item.get("title", f"Week {i} Mastery"),
                    theme=item.get("theme", ""),
                    goals=item.get("goals", []),
                    tasks=tasks_list,
                    checkpoint_mock_topic=item.get("checkpoint_mock_topic", "System Design"),
                    status="in_progress" if i == 1 else "pending",
                )
            )
        return milestones

    except Exception as exc:
        logger.warning("Gemini roadmap generation failed (%s); using fallback roadmap", exc)
        return _fallback_roadmap(gap_map, target_role)
