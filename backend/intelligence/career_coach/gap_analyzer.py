"""gap_analyzer.py

Analyzes candidate profile / resume against target role & industry job descriptions.
Produces a 3-bucket classification:
  1. Transferable Strengths (what to highlight)
  2. Missing Core Skills (mandatory requirements to learn)
  3. Critical Blindspots (edge-cases / high-frequency interview gotchas)
Plus calculates an initial Market Readiness Score (0-100).
"""

from __future__ import annotations

import logging
from typing import Any

from gemini_config import call_gemini_json
from intelligence.career_coach.state import SkillGapMap
from resume_intelligence.text_clean import strip_pii

logger = logging.getLogger(__name__)

GAP_ANALYZER_SYSTEM_PROMPT = """You are an elite Silicon Valley Tech Recruiter and Principal Staff Career Coach.
Your goal is to conduct a rigorous, objective skill-gap analysis for an engineering candidate transitioning to a target role.

Analyze the candidate's existing background vs the target role requirements and (if provided) real job description text.
NOTE: If the candidate is a college student, fresher, or has 0 years of experience, calibrate the expectations to an Entry-Level / SDE-1 hiring bar: focus on strong CS fundamentals, Data Structures & Algorithms, clean API design, and production portfolio proofs rather than multi-year enterprise legacy systems.

Categorize findings into exactly three buckets:
1. transferable_strengths: Existing strong competencies that will transfer and provide leverage.
2. missing_core_skills: Hard technical competencies, tools, frameworks, and architecture patterns mandatory for this target role that the candidate lacks.
3. critical_blindspots: Subtle or advanced interview expectations, failure modes, concurrency/scale traps, or depth areas often quizzed in top-tier tech rounds.

Also determine:
- seniority_level: e.g. "Entry-Level / Fresher", "Junior", "Mid-Level", "Senior", "Lead"
- market_readiness_score: Integer 0-100 representing how close they currently are to passing target interviews.
- summary: A crisp 2-3 sentence strategic coaching summary.
- suggested_focus_areas: 3-5 high-priority technical domains to master first.

Return ONLY valid JSON matching this schema:
{
  "target_role": "string",
  "seniority_level": "string",
  "market_readiness_score": 65,
  "summary": "string",
  "transferable_strengths": ["string"],
  "missing_core_skills": ["string"],
  "critical_blindspots": ["string"],
  "suggested_focus_areas": ["string"]
}"""


def _build_user_prompt(
    candidate_profile_or_text: str | dict[str, Any],
    target_role: str,
    job_description: str | None = None,
) -> str:
    if isinstance(candidate_profile_or_text, dict):
        skills = candidate_profile_or_text.get("skills", {})
        experience = candidate_profile_or_text.get("experience", [])
        projects = candidate_profile_or_text.get("projects", [])
        candidate_summary = f"""Candidate Skills:
{skills}

Past Projects / Work:
{projects}
{experience}"""
    else:
        cleaned = strip_pii(str(candidate_profile_or_text))[:3000]
        candidate_summary = f"Candidate Profile & Experience:\n{cleaned}"

    jd_summary = ""
    if job_description and job_description.strip():
        clean_jd = job_description.strip()[:2500]
        jd_summary = f"\n\nTarget Job Description (Real Market Posting):\n{clean_jd}"

    return f"""Target Role: {target_role}
{jd_summary}

Candidate Background:
{candidate_summary}

Analyze the candidate's profile and generate the structured 3-bucket skill-gap map."""


def _fallback_gap_analysis(
    target_role: str,
    candidate_profile_or_text: str | dict[str, Any],
) -> SkillGapMap:
    """Deterministic fallback if LLM is unavailable or quota-limited."""
    role_lower = target_role.lower()
    cand_str = str(candidate_profile_or_text).lower()
    is_fresher = (
        any(
            term in cand_str
            for term in [
                "fresher",
                "student",
                "college",
                "graduate",
                "0 year",
                "0.0 year",
                "0.0 years",
                "0 yoe",
                "entry-level",
                "entry level",
                "sophomore",
                "bootcamp",
                "junior",
                "sde-1",
                "sde 1",
            ]
        )
        or "0 years experience" in cand_str
        or "0.0 years experience" in cand_str
    )

    if is_fresher:
        return SkillGapMap(
            target_role=target_role,
            seniority_level="Entry-Level / Fresher",
            market_readiness_score=68,
            summary=f"Strong academic foundations and high growth potential for {target_role}. The strategic key to securing entry-level job offers is pairing algorithmic problem solving (DSA) with 2 production-grade deployed portfolio projects.",
            transferable_strengths=[
                "Object-Oriented Programming & Clean Code Practices",
                "Data Structures & Core Algorithmic Problem Solving",
                "Computer Science Fundamentals (OS, Networks, DBMS)",
                "Academic Projects & Eagerness to Learn",
            ],
            missing_core_skills=[
                "End-to-End Production Deployment & Cloud Hosting (Docker / AWS / Vercel)",
                "Real-World RESTful API Design, Error Handling & Auth Lifecycles",
                "Database Indexing, Query Optimization & Relationship Modeling",
                "Automated Testing, CI/CD Workflows & Git Collaboration",
            ],
            critical_blindspots=[
                "Writing code without testing boundary conditions and edge cases in live rounds",
                "Relying solely on tutorial clones without live deployed URL demos",
                "Explaining architectural trade-offs using STAR method during behavioral rounds",
            ],
            suggested_focus_areas=[
                "Data Structures & Algorithms (LeetCode Medium)",
                "Production Full-Stack / Backend Portfolio Project",
                "Live API Deployment & System Fundamentals",
            ],
        )

    if "ai" in role_lower or "ml" in role_lower or "data" in role_lower:
        return SkillGapMap(
            target_role=target_role,
            seniority_level="Mid-Level",
            market_readiness_score=58,
            summary=f"Strong software fundamentals, but needs hands-on production depth in AI/ML model orchestration, evaluation metrics, and latency optimization for {target_role}.",
            transferable_strengths=[
                "Python & Backend API Architecture",
                "SQL & Relational Data Modeling",
                "Git & CI/CD Development Workflows",
                "Problem Solving & Data Structures",
            ],
            missing_core_skills=[
                "Retrieval-Augmented Generation (RAG) Architecture & Vector DBs (Chroma/pgvector)",
                "LLM Fine-Tuning, Quantization, and Token Budget Management",
                "LangChain / LangGraph Agentic Workflows & Multi-turn State",
                "Production LLM Evaluation Frameworks (Ragas / TruLens)",
            ],
            critical_blindspots=[
                "Context Window limits & Hallucination mitigation strategies",
                "Vector embedding similarity search latency under high QPS",
                "Asynchronous streaming SSE/WebSocket pipelines for generative AI",
            ],
            suggested_focus_areas=[
                "Vector Databases & Hybrid Search",
                "LangGraph Multi-Agent Orchestration",
                "LLM Observability, Latency & Evals",
            ],
        )

    # General / Backend / Fullstack fallback
    return SkillGapMap(
        target_role=target_role,
        seniority_level="Mid-Level",
        market_readiness_score=62,
        summary=f"Solid foundational engineering skills. The pivot to {target_role} requires bridging distributed systems patterns, database query performance, and concurrency.",
        transferable_strengths=[
            "Core Programming & Clean Code Practices",
            "REST API Design & HTTP Lifecycle",
            "Database CRUD & Basic Schema Design",
            "Debugging & Unit Testing",
        ],
        missing_core_skills=[
            "Distributed Caching (Redis patterns: cache-aside, write-through)",
            "Message Brokers & Asynchronous Queues (Kafka / RabbitMQ / Celery)",
            "Database Indexing, Query Optimization & Connection Pooling",
            "System Design for Horizontal Scalability (Load Balancing, Rate Limiting)",
        ],
        critical_blindspots=[
            "Concurrency race conditions and distributed locking strategies",
            "Failure handling: Circuit breakers, idempotency keys, and exponential backoff",
            "Microservices data consistency (Saga pattern vs 2PC)",
        ],
        suggested_focus_areas=[
            "High-Throughput Caching & Redis",
            "Event-Driven Architectures with Message Queues",
            "Production System Design & Scalability",
        ],
    )


def analyze_skill_gaps(
    candidate_profile_or_text: str | dict[str, Any],
    target_role: str,
    job_description: str | None = None,
) -> SkillGapMap:
    """Performs skill-gap analysis using Gemini or deterministic fallback."""
    user_prompt = _build_user_prompt(candidate_profile_or_text, target_role, job_description)

    try:
        data = call_gemini_json(
            system_prompt=GAP_ANALYZER_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            temperature=0.3,
            max_output_tokens=1500,
            operation="career_coach_gap_analysis",
        )

        return SkillGapMap(
            target_role=data.get("target_role", target_role),
            seniority_level=data.get("seniority_level", "Mid-Level"),
            market_readiness_score=int(data.get("market_readiness_score", 60)),
            summary=data.get("summary", f"Strategic gap analysis for {target_role}"),
            transferable_strengths=data.get("transferable_strengths", []),
            missing_core_skills=data.get("missing_core_skills", []),
            critical_blindspots=data.get("critical_blindspots", []),
            suggested_focus_areas=data.get("suggested_focus_areas", []),
        )
    except Exception as exc:
        logger.warning("Gemini gap analysis call failed (%s); using fallback gap map", exc)
        return _fallback_gap_analysis(target_role, candidate_profile_or_text)
