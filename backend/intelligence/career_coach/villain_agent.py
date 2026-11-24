"""villain_agent.py

Career Villain Portfolio & Career Architect Agent — Brutally honest, highly intelligent senior engineering mentor.
Capabilities:
1. Resume Analysis & Role Recommendation: Analyzes candidate's real resume, skills, and projects,
   identifying realistic target roles, aspirational roles, and red flags.
2. Target Job Gap Analysis: Compares candidate's current status against a target role,
   explaining the exact gaps and what must be learned.
3. Tool-Driven Production Portfolio Recommendations: Recommends standout projects using real industry tools
   (Kafka, Redis, Docker, PostgreSQL, pgvector, Prometheus) with architecture blueprints.
4. Project Roaster: Dynamically roasts generic clones and levels them up into offer-winning architectures.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Generator

from gemini_config import call_gemini_json, get_api_keys, get_model_chain, _get_client

logger = logging.getLogger(__name__)

VILLAIN_SYSTEM_PROMPT = """You are the "Career Villain" — an elite Silicon Valley Tech Lead and Staff Hiring Bar Raiser with 12+ years of production experience at FAANG and high-growth unicorns.
You have reviewed 2,500+ engineering resumes, conducted 600+ technical and system design interview rounds, and made hundreds of hire/no-hire decisions.

YOUR CORE RULES (STRICT):
1. COMPLETE & UNRESTRICTED RESUME ACCESS:
   - You have 100% full access to the candidate's complete uploaded resume dossier provided under `=== CANDIDATE RESUME & COMPLETE PROFILE DOSSIER ===`.
   - It contains their full education, CGPA, every skill category, work experiences with dates and responsibilities, all projects with tech stacks and contributions, certifications, achievements, and competitive programming profiles.
   - ALWAYS reference their exact resume data by specific name (e.g. their actual college name, their real project titles, their actual company names, their exact skills, their real certifications).
   - NEVER say "I don't have access to your resume" or "Please upload your resume" if resume data exists in the prompt. You see EVERYTHING on their resume with complete fidelity.
2. DIRECTLY ANSWER THE CANDIDATE'S SPECIFIC QUESTION:
   - Your absolute highest priority in "villain_message" is to answer the EXACT question or topic asked in CURRENT CANDIDATE MESSAGE.
   - Do NOT ignore what they asked. Do NOT repeat previous resume evaluations unless specifically asked about their resume.
   - Understand English, Tamil, and Tanglish (e.g., "en resume la enna irukku", "enna role try pannalam", "ithuku enna pannanum", "status enna", "enna project pannalam", "chatbot ku full access erukanum") fluently and respond directly with high clarity.
3. NEAT, STRUCTURED & HIGHLY READABLE PRESENTATION:
   - Always present your answer neatly and cleanly with structured Markdown.
   - Start with a direct 1-line verdict or summary answer.
   - Use clean Markdown subheadings with emojis (e.g. `### 📄 Resume Audit & Roles`, `### 🛠️ What You Must Do Next`, `### 🚨 Critical Red Flags`).
   - Use bolding (`**term**`) for technical keywords, roles, tools, and metrics.
   - Use bullet points (`- `) or numbered steps (`1. `, `2. `) instead of dense paragraphs.
   - Never write unbroken walls of text. Keep sections neat, skimmable, and well-spaced.
4. ONLY RETURN "projects" WHEN EXPLICITLY RELEVANT & KEEP THEM DISTINCT FROM TEXT:
   - ONLY return items in "projects": [ ... ] IF the candidate explicitly asks for project ideas, portfolio recommendations, what to build, OR asks to roast/level up an existing project.
   - If returning "projects", keep "villain_message" focused on the strategic reasoning, role fit, and advice. Let the structured "projects" array carry the granular architecture, deliverables, and repo blueprints. Do NOT duplicate the entire project file tree and paragraphs inside "villain_message".
   - If the candidate asked a resume question ("What skills are on my resume?", "What role fits me?"), a technical question, or general query, return `"projects": []`!
5. ROLE-ADAPTIVE ENGINEERING REALISM (NO ONE-SIZE-FITS-ALL BUZZWORDS):
   - Zero corporate fluff. Brutally honest, highly technical, and constructive.
   - ADAPT YOUR ADVICE AND TECH STACK INTELLIGENTLY TO THE CANDIDATE'S ACTUAL TARGET ROLE:
     * Generative AI / LLM Engineer: Vector databases (pgvector, Qdrant), semantic chunking, hybrid search (BM25 + vector), RAG evaluation frameworks (DeepEval, Ragas), vLLM / Ollama serving, agentic routing (LangGraph), token streaming, and cost/latency tradeoffs.
     * Backend / Distributed Systems Engineer: Concurrency, race conditions, atomic operations, Redis distributed locks, connection pooling, Kafka/event streams, idempotent consumer groups, DB indexing/partitioning, and Locust/k6 load benchmarks.
     * Fullstack / Web Architect: Next.js App Router, SSR/SSG caching tiers, WebSocket state sync, optimistic UI, WebRTC, WASM, API contracts (tRPC/OpenAPI), and Core Web Vitals.
     * ML / Data Engineer: Apache Spark, dbt, Apache Airflow, Iceberg/BigLake, feature stores, data lineage, and Parquet columnar storage.
   - NEVER force Kafka and Redis on a candidate if their question or background is about AI, Frontend, or Data! Choose the exact modern production tools that FAANG / top startup hiring managers look for in THAT SPECIFIC ROLE.
6. CONCISE, FRESH & NON-REPETITIVE:
   - Keep "villain_message" focused (around 120-220 words).
   - NEVER reuse the exact same phrasing, template, or lecture on every turn.
   - If they ask a follow-up, jump STRAIGHT into the new answer without repeating your previous resume analysis or role breakdown unless asked.
   - Make "suggested_prompts" dynamic, context-aware next questions directly following from the current conversation topic (NOT the same static initial questions!).

OUTPUT SCHEMA (Must be valid JSON):
{
  "villain_message": "Your direct, engaging message answering the user's specific question",
  "verdict": "Resume Trash" | "Tutorial Hell" | "Needs Scale" | "Promising" | "Production Ready" | "Elite Blueprint" | null,
  "projects": [
    {
      "id": "proj-1",
      "title": "string",
      "difficulty": "Intermediate" | "Advanced" | "Staff",
      "description": "What this project does and why it proves real engineering capability",
      "tech_stack": ["string"],
      "target_gaps_addressed": ["string"],
      "architecture_summary": "High-level architecture, dataflow, or concurrency model",
      "key_deliverables": ["Concrete bullet points candidate can demonstrate live"],
      "github_blueprint": ["Folder layout and key files"],
      "villain_pitch": "1-2 punchy sentences on why recruiters will respect this project",
      "interview_trap_question": "Toughest question an interviewer will grill candidate on",
      "staff_defense_answer": "How to answer like a staff engineer",
      "architecture_diagram": "Client -> Gateway -> Redis -> Worker Pool -> Postgres"
    }
  ],
  "brutal_truth": "One punchy, memorable one-liner summarizing the hiring reality",
  "suggested_prompts": ["3 short quick-reply suggestions candidate can ask next"]
}"""


def _format_candidate_profile(profile: dict[str, Any] | str | None) -> str:
    """Format candidate profile dict or string into a comprehensive, high-fidelity resume dossier."""
    if not profile:
        return "No uploaded resume on file yet. (Candidate has not uploaded a resume or pasted profile text)."

    if isinstance(profile, str):
        return f"=== CANDIDATE RESUME / PROFILE TEXT ===\n{profile[:6000]}\n=== END OF RESUME TEXT ==="

    sections: list[str] = ["=== FULL CANDIDATE RESUME DOSSIER ==="]

    # 1. Contact & Identity
    cand = profile.get("candidate", {}) if isinstance(profile.get("candidate"), dict) else {}
    name = cand.get("name") or profile.get("user_name") or profile.get("name") or "Candidate"
    contact_parts = [f"Candidate Name: {name}"]
    if cand.get("email"):
        contact_parts.append(f"Email: {cand['email']}")
    if cand.get("phone"):
        contact_parts.append(f"Phone: {cand['phone']}")
    if cand.get("location"):
        contact_parts.append(f"Location: {cand['location']}")
    target_role = profile.get("target_role") or profile.get("targetRole")
    if target_role:
        contact_parts.append(f"Target Role: {target_role}")
    sections.append("Candidate Identity & Contact:\n  " + "\n  ".join(contact_parts))

    # 2. Education (ALL entries, full fidelity)
    edu = profile.get("education", [])
    if edu and isinstance(edu, list):
        edu_lines = []
        for e in edu:
            if isinstance(e, dict):
                parts = []
                deg = str(e.get("degree", "")).strip()
                field = str(e.get("field", "")).strip()
                inst = str(e.get("institution", "")).strip()
                if deg or field:
                    parts.append(f"{deg} in {field}" if deg and field else (deg or field))
                if inst:
                    parts.append(f"at {inst}")
                sy = e.get("start_year")
                ey = e.get("end_year")
                if sy or ey:
                    parts.append(f"({sy or ''} - {ey or 'Present'})")
                if e.get("cgpa"):
                    parts.append(f"[CGPA/GPA: {e['cgpa']}]")
                if e.get("details"):
                    parts.append(f"- {e['details']}")
                if parts:
                    edu_lines.append("  • " + " ".join(parts))
        if edu_lines:
            sections.append("Education:\n" + "\n".join(edu_lines))

    # 3. Complete Skills Inventory (ALL categories)
    skills = profile.get("skills", {})
    if isinstance(skills, dict):
        skills_lines = []
        for cat, items in skills.items():
            if items and isinstance(items, list):
                clean_items = [str(x).strip() for x in items if str(x).strip()]
                if clean_items:
                    formatted_cat = cat.replace("_", " ").title()
                    skills_lines.append(f"  • {formatted_cat}: {', '.join(clean_items)}")
        if skills_lines:
            sections.append("Full Skills Inventory:\n" + "\n".join(skills_lines))
    elif isinstance(skills, list):
        clean_skills = [str(x).strip() for x in skills if str(x).strip()]
        if clean_skills:
            sections.append(f"Skills: {', '.join(clean_skills)}")

    # 4. Work Experience (ALL entries, no truncation, full responsibilities & tech)
    exp = profile.get("experience", [])
    if exp and isinstance(exp, list):
        exp_lines = []
        for idx, e in enumerate(exp, 1):
            if isinstance(e, dict):
                role = str(e.get("role", "Engineer")).strip()
                comp = str(e.get("company", "Company")).strip()
                loc = str(e.get("location", "")).strip()
                loc_str = f" ({loc})" if loc else ""
                sd = str(e.get("start_date", "")).strip()
                ed = str(e.get("end_date", "Present")).strip()
                date_str = f" [{sd} to {ed}]" if (sd or ed) else ""
                header = f"  {idx}. {role} @ {comp}{loc_str}{date_str}"

                details = []
                resp = e.get("responsibilities", [])
                if isinstance(resp, list):
                    for r in resp:
                        if str(r).strip():
                            details.append(f"     - {str(r).strip()}")
                elif isinstance(resp, str) and resp.strip():
                    for line in resp.strip().split("\n"):
                        if line.strip():
                            details.append(f"     - {line.strip()}")

                techs = e.get("technologies", [])
                if isinstance(techs, list) and techs:
                    details.append(f"     * Technologies Used: {', '.join(str(t) for t in techs if str(t).strip())}")

                exp_lines.append(header + ("\n" + "\n".join(details) if details else ""))
        if exp_lines:
            sections.append("Work Experience History:\n" + "\n".join(exp_lines))

    # 5. Projects (ALL projects, no truncation, full details & stacks)
    projects = profile.get("projects", [])
    if projects and isinstance(projects, list):
        proj_lines = []
        for idx, p in enumerate(projects, 1):
            if isinstance(p, dict):
                p_name = str(p.get("name", f"Project {idx}")).strip()
                domain = str(p.get("domain", "")).strip()
                domain_str = f" [Domain: {domain}]" if domain else ""
                duration = str(p.get("duration", "")).strip()
                dur_str = f" ({duration})" if duration else ""
                p_role = str(p.get("role", "")).strip()
                role_str = f" - Role: {p_role}" if p_role else ""

                header = f"  {idx}. {p_name}{domain_str}{dur_str}{role_str}"
                details = []
                desc = str(p.get("description", "")).strip()
                if desc:
                    details.append(f"     Description: {desc}")

                techs = p.get("technologies", [])
                if isinstance(techs, list) and techs:
                    details.append(f"     Tech Stack: {', '.join(str(t) for t in techs if str(t).strip())}")

                contribs = p.get("key_contributions", [])
                if isinstance(contribs, list) and contribs:
                    for c in contribs:
                        if str(c).strip():
                            details.append(f"     * Contribution: {str(c).strip()}")

                proj_lines.append(header + ("\n" + "\n".join(details) if details else ""))
        if proj_lines:
            sections.append("Existing Projects:\n" + "\n".join(proj_lines))

    # 6. Certifications & Licenses (ALL certifications)
    certs = profile.get("certifications", [])
    if certs and isinstance(certs, list):
        cert_lines = []
        for c in certs:
            if isinstance(c, dict):
                c_name = str(c.get("name", "")).strip()
                issuer = str(c.get("issuer", "")).strip()
                year = str(c.get("year", "")).strip()
                str_repr = f"  • {c_name}"
                if issuer:
                    str_repr += f" (Issued by: {issuer})"
                if year:
                    str_repr += f" [{year}]"
                cert_lines.append(str_repr)
            elif isinstance(c, str) and c.strip():
                cert_lines.append(f"  • {c.strip()}")
        if cert_lines:
            sections.append("Certifications & Credentials:\n" + "\n".join(cert_lines))

    # 7. Achievements & Honors
    achievements = profile.get("achievements", [])
    if achievements and isinstance(achievements, list):
        ach_lines = [f"  • {str(a).strip()}" for a in achievements if str(a).strip()]
        if ach_lines:
            sections.append("Achievements & Honors:\n" + "\n".join(ach_lines))

    # 8. Competitive Programming / Problem Solving
    cp = profile.get("competitive_programming", {})
    if isinstance(cp, dict) and any(cp.values()):
        cp_parts = []
        platforms = cp.get("platforms", [])
        if platforms:
            cp_parts.append(f"Platforms: {', '.join(str(p) for p in platforms)}")
        if cp.get("problems_solved"):
            cp_parts.append(f"Problems Solved: {cp['problems_solved']}")
        if cp.get("ratings"):
            cp_parts.append(f"Ratings/Rank: {cp['ratings']}")
        if cp_parts:
            sections.append("Competitive Programming & Problem Solving:\n  • " + " | ".join(cp_parts))

    # 9. Publications & Research
    pubs = profile.get("publications", [])
    if pubs and isinstance(pubs, list):
        pub_lines = [f"  • {str(p).strip()}" for p in pubs if str(p).strip()]
        if pub_lines:
            sections.append("Publications & Research:\n" + "\n".join(pub_lines))

    # 10. Expertise Areas & Potential Interview Topics
    expertise = profile.get("expertise_areas", [])
    if expertise and isinstance(expertise, list):
        exp_strs = [str(x).strip() for x in expertise if str(x).strip()]
        if exp_strs:
            sections.append(f"Identified Expertise Areas: {', '.join(exp_strs)}")

    topics = profile.get("potential_interview_topics", [])
    if topics and isinstance(topics, list):
        top_strs = [str(x).strip() for x in topics if str(x).strip()]
        if top_strs:
            sections.append(f"Potential Interview Topics: {', '.join(top_strs)}")

    # 11. Languages & Interests
    langs = profile.get("languages", [])
    if langs and isinstance(langs, list):
        lang_strs = [str(x).strip() for x in langs if str(x).strip()]
        if lang_strs:
            sections.append(f"Languages: {', '.join(lang_strs)}")

    interests = profile.get("interests", [])
    if interests and isinstance(interests, list):
        int_strs = [str(x).strip() for x in interests if str(x).strip()]
        if int_strs:
            sections.append(f"Interests & Activities: {', '.join(int_strs)}")

    sections.append("=== END OF RESUME DOSSIER ===")
    return "\n\n".join(sections)


def _fallback_villain(
    user_message: str,
    candidate_profile_text: str = "",
    target_role: str | None = None,
) -> dict[str, Any]:
    """Smart deterministic fallback when Gemini API is unavailable."""
    lower = user_message.lower()

    # Extract name if present
    name_line = [l for l in candidate_profile_text.splitlines() if "Candidate Name:" in l]
    cand_name = name_line[0].split("Candidate Name:")[-1].strip() if name_line else "Candidate"
    name_greeting = f"Listen up, **{cand_name}** — " if cand_name != "Candidate" else ""

    # 1. Resume Full Access Confirmation
    if any(k in lower for k in ["full access", "resume access", "access erukanum", "resume la enna", "what is on my resume", "see my resume", "read my resume"]):
        return {
            "villain_message": (
                "### 🛡️ Full Resume Access Confirmed\n\n"
                f"Yes, **{cand_name}**! I have **100% full, unrestricted access to your entire uploaded resume** dossier.\n\n"
                "Here is what I am actively reading from your file:\n"
                f"- **Candidate Name**: **{cand_name}**\n"
                f"- **Target Role**: **{target_role or 'Software Engineer'}**\n"
                "- **Resume Scope**: Complete Education & CGPA, Full Skills Inventory across all categories, Work Experience history with responsibilities, All Projects with tech stacks, and Certifications.\n\n"
                "Ask me anything directly: ask what role fits your exact skills, ask me to roast your specific projects, or ask what technical gaps you must fix right now."
            ),
            "verdict": "Production Ready",
            "projects": [],
            "brutal_truth": "I see every single detail on your resume — and I judge it through the eyes of a hiring manager who decides whether you get an interview or a rejection.",
            "suggested_prompts": [
                "What role should I target based on my skills?",
                "What brutal gaps do I have from my current status?",
                "Roast the projects on my resume"
            ]
        }

    # 2. Resume Analysis & Role Recommendation Fallback
    if any(k in lower for k in ["resume", "role ku", "what role", "analyze my", "analze", "fit for", "profile"]):
        return {
            "villain_message": (
                f"{name_greeting}here is the brutal assessment of your profile:\n\n"
                "📊 **Current Status**: Your profile has core programming foundations, but looks like 90% of CS graduates — lots of tutorial syntax, but zero proof of high-concurrency, database optimization, or cloud deployments.\n\n"
                "🎯 **Recommended Roles To Target Right Now**:\n"
                "1. **Software Engineer (SDE-1 / Fresher Track)**: High hiring volume, but you need 1 flagship systems project to beat the crowd.\n"
                "2. **Junior Backend Developer (Python / Node / Java)**: If you bridge database transaction and Redis caching gaps.\n\n"
                "🚀 **Aspirational Role (Target in 3 months)**:\n"
                "- **Backend Distributed Systems Engineer** or **Agentic AI Engineer**: These pay 2x more, but require real proof of asynchronous task queues, message brokers, and Dockerized deployments.\n\n"
                "Below are 2 production projects built with real industry tools to make your resume impossible to ignore."
            ),
            "verdict": "Needs Scale",
            "projects": [
                {
                    "id": "proj-fresher-1",
                    "title": "High-Throughput Asynchronous Task & Email Queue with Redis Streams",
                    "difficulty": "Intermediate",
                    "description": "A distributed background worker system with Redis Streams, exponential backoff retries, dead-letter exchanges, and worker auto-recovery to demonstrate asynchronous system design.",
                    "tech_stack": ["FastAPI / Node.js", "Redis Streams", "PostgreSQL", "Docker", "Locust"],
                    "target_gaps_addressed": ["Asynchronous Processing", "Message Brokers & Queues", "Fault Tolerance & Retries"],
                    "architecture_summary": "API gateway dispatches tasks to Redis Stream; worker cluster consumes tasks using consumer groups; failed tasks automatically routed to dead-letter queue after 3 retries.",
                    "key_deliverables": [
                        "Docker Compose cluster running 1 API instance + 3 worker processes",
                        "Locust benchmark script achieving 2,500 tasks/second with zero dropped messages",
                        "Prometheus monitoring dashboard measuring worker latency and queue depth"
                    ],
                    "github_blueprint": [
                        "api/ — Task producer with rate limiting",
                        "workers/ — Consumer group worker loop with SIGTERM graceful shutdown",
                        "docker-compose.yml — API, Redis, Postgres, and worker pool configuration"
                    ],
                    "villain_pitch": "Instead of saying 'I know Python and Redis', you prove you can build reliable asynchronous distributed systems.",
                    "architecture_diagram": "Client [HTTP POST /task] -> FastAPI -> Redis Streams (Stream: tasks) -> Worker Group -> Postgres [ACID Commit] -> XACK",
                    "interview_trap_question": "What happens if a worker pulls a task from the stream and immediately gets SIGKILL'd before finishing?",
                    "staff_defense_answer": "We use Redis Streams PEL (Pending Entries List) and XAUTOCLAIM. If a message is unacknowledged for >5 seconds, a healthy worker claims it, and our idempotent database transaction key ensures zero duplicate processing."
                },
                {
                    "id": "proj-fresher-2",
                    "title": "Multi-Tenant Rate Limiter & API Gateway Proxy",
                    "difficulty": "Intermediate",
                    "description": "A production-grade reverse proxy implementing sliding-window rate limiting with Redis Lua scripts, token bucket per API key, and Prometheus latency telemetry.",
                    "tech_stack": ["Go / Python", "Redis (Lua scripting)", "Docker", "Prometheus", "Grafana"],
                    "target_gaps_addressed": ["Concurrency & Race Conditions", "Rate Limiting Algorithms", "Reverse Proxy Architecture"],
                    "architecture_summary": "Atomic sliding-window rate limiter evaluated in Redis via single-trip Lua script; returns HTTP 429 with Retry-After headers; p99 latency < 2ms.",
                    "key_deliverables": [
                        "Load-tested with 5,000 req/sec proving exact quota enforcement",
                        "Middleware drop-in ready for any HTTP service",
                        "Grafana dashboard visualizing 200 vs 429 response ratios"
                    ],
                    "github_blueprint": [
                        "limiter/sliding_window.lua — Atomic Lua script for Redis",
                        "middleware/ — HTTP middleware interceptor",
                        "benchmarks/ — k6/Locust stress testing script"
                    ],
                    "villain_pitch": "Every tech company needs API rate limiting. Having this in your portfolio guarantees deep interview conversations.",
                    "architecture_diagram": "Client [GET /resource] -> Proxy -> Redis Lua [Atomic ZADD + ZREMRANGEBYSCORE] -> Allow (200) / Block (429)",
                    "interview_trap_question": "Why use a Redis Lua script instead of doing two separate Redis GET and INCR commands?",
                    "staff_defense_answer": "Two roundtrips introduce a race condition under concurrency where two simultaneous requests see the count below limit and both succeed, violating the quota. A Lua script executes atomically inside Redis single-threaded engine in a single roundtrip."
                }
            ],
            "brutal_truth": "Recruiters don't care about the 20 syntax languages on your resume. They care if you understand what happens when a database query takes 10 seconds under load.",
            "suggested_prompts": [
                "What should I do to reach SDE-1 Backend from my current status?",
                "Recommend an AI project that isn't a wrapper",
                "Roast my MERN food delivery project"
            ]
        }

    # 2. Roast Generic Clone Fallback
    if any(k in lower for k in ["todo", "weather", "food", "ecommerce", "e-commerce", "clone", "netflix", "blog"]):
        return {
            "villain_message": (
                "Let's be 100% honest: that project is an immediate resume trash-can trigger. "
                "Hiring managers see 50 of these every single day. It proves you can follow a YouTube tutorial; "
                "it doesn't prove you can handle production scale, race conditions, or database latency.\n\n"
                "Here is how you LEVEL UP that exact idea with industry tools into a project that will actually get you interviews:"
            ),
            "verdict": "Weak Clone",
            "projects": [
                {
                    "id": "proj-lvlup-1",
                    "title": "High-Concurrency Flash-Sale & Inventory Reservation Engine",
                    "difficulty": "Advanced",
                    "description": "Instead of a generic store, build a distributed inventory reservation service handling 5,000 req/sec flash sales with Redis distributed locking (Redlock) and idempotency keys to prevent overselling.",
                    "tech_stack": ["FastAPI / Node.js", "Redis (Distributed Locks)", "PostgreSQL", "Docker", "Locust (Load Testing)"],
                    "target_gaps_addressed": ["Distributed Locking & Race Conditions", "High QPS Throughput", "Database Transaction Isolation"],
                    "architecture_summary": "Two-phase commit reservation with TTL expiry; Redis Lua scripts for atomic stock decrement; Locust benchmark script proving zero double-booking under 1,000 concurrent checkout attempts.",
                    "key_deliverables": [
                        "Live deployed API on cloud container with health checks",
                        "Benchmark report proving zero double-spend under 5,000 virtual users",
                        "Alembic database migrations and ACID transaction tests"
                    ],
                    "github_blueprint": [
                        "core/lock.py — Distributed Redis mutex implementation",
                        "services/inventory.py — Atomic reservation with compensation rollback",
                        "tests/load_test.py — Locust stress test simulation",
                        "README.md with Architecture Decision Records (ADRs) and benchmark graphs"
                    ],
                    "villain_pitch": "In an interview, you talk about distributed locking and latency p99 instead of simple CRUD.",
                    "architecture_diagram": "Client [POST /checkout] -> API -> Redis Redlock (Lock SKU with TTL) -> Postgres [Atomic Decrement WHERE stock >= qty] -> Release Lock",
                    "interview_trap_question": "What happens if the client crashes or takes 15 seconds to pay after acquiring the Redis lock?",
                    "staff_defense_answer": "We enforce an automatic 3-second TTL lease on the Redis distributed lock with a background watchdog thread. If payment gateway doesn't respond before TTL, the reservation is automatically aborted and the item returned to stock."
                }
            ],
            "brutal_truth": "Recruiters don't hire people who can make a shopping cart. They hire people who can keep the shopping cart alive when 10,000 users click Checkout at the exact same millisecond.",
            "suggested_prompts": [
                "Analyze my resume and suggest my best role",
                "How do I implement Redis distributed locks?",
                "What projects will get me an SDE-1 offer?"
            ]
        }

    # 3. Default Transition & Portfolio Recommendation Fallback
    target_role_str = target_role or "Software Engineer (SDE-1 / Backend)"
    return {
        "villain_message": (
            f"If your goal is to land **{target_role_str}**, here is where you stand from your current status:\n\n"
            "🔍 **The Gap You Must Bridge**:\n"
            "You know how to write code, but you haven't proven how your code survives in production. "
            "Interviewers want to see that you understand **tools that scale**: Docker containers, Redis caching layers, PostgreSQL connection pooling, and message queues.\n\n"
            "🚀 **Recommended Production Portfolio Blueprints**:"
        ),
        "verdict": "Elite Blueprint",
        "projects": [
            {
                "id": "proj-core-backend",
                "title": "Real-Time Event Streamer & Distributed Job Queue",
                "difficulty": "Advanced",
                "description": "A fault-tolerant asynchronous task execution engine with Redis Streams, worker heartbeats, retry budgets with exponential backoff, and dead-letter exchanges.",
                "tech_stack": ["Python / Go", "Redis Streams", "PostgreSQL", "Docker", "Prometheus"],
                "target_gaps_addressed": ["Asynchronous Queues & Message Brokers", "Fault Tolerance & Crash Recovery", "System Observability"],
                "architecture_summary": "Separation of API gateway from worker pool; transactional outbox pattern in Postgres; zero-message-loss verification during simulated SIGKILL kills.",
                "key_deliverables": [
                    "Production Docker Compose cluster with automated worker scaling",
                    "Prometheus metrics exporter monitoring queue depth and worker lag",
                    "Simulated crash test suite proving zero task loss"
                ],
                "github_blueprint": [
                    "pkg/broker/ — Consumer group offset management",
                    "pkg/worker/ — Graceful shutdown and signal handling",
                    "docs/ARCHITECTURE.md — System topology diagram"
                ],
                "villain_pitch": "Interviewers will spend the entire 45 minutes asking you about your queue architecture instead of LeetCode tricks.",
                "architecture_diagram": "API Gateway [Event Producer] -> Postgres (Transactional Outbox) -> CDC Debezium -> Redis Streams -> Worker Pool -> Consumer Acknowledgment",
                "interview_trap_question": "How do you guarantee exactly-once processing when the message broker delivers at-least-once?",
                "staff_defense_answer": "We enforce end-to-end idempotency: every message carries a unique deterministic idempotency key. The consumer executes within a PostgreSQL database transaction with an INSERT INTO processed_keys ON CONFLICT DO NOTHING, guaranteeing atomic, exactly-once business side effects."
            },
            {
                "id": "proj-agentic-rag",
                "title": "Enterprise Hybrid RAG Engine with Dynamic Re-Ranking",
                "difficulty": "Advanced",
                "description": "A low-latency document intelligence service combining BM25 keyword matching with pgvector HNSW embeddings, Reciprocal Rank Fusion (RRF), and streaming Server-Sent Events (SSE).",
                "tech_stack": ["FastAPI", "PostgreSQL (pgvector)", "Sentence-Transformers", "Gemini API", "FastAPI SSE"],
                "target_gaps_addressed": ["Vector Indexing & Hybrid Search", "LLM Hallucination Guardrails", "Streaming Response Lifecycles"],
                "architecture_summary": "Two-tier retrieval pipeline with cross-encoder re-ranking; dynamic context token budget optimization; automated RAG evaluation with synthetic test suites.",
                "key_deliverables": [
                    "Sub-150ms hybrid retrieval benchmark across 50,000 documents",
                    "RAG evaluation metrics table measuring Answer Faithfulness and Context Recall",
                    "Live working demo with streaming token UI"
                ],
                "github_blueprint": [
                    "retriever/hybrid.py — Reciprocal Rank Fusion algorithm",
                    "eval/ragas_eval.py — Automated context quality benchmark",
                    "README.md with retrieval benchmark comparisons"
                ],
                "villain_pitch": "Every company is trying to build RAG. Demonstrating hybrid search and evals proves you're in the top 5%.",
                "architecture_diagram": "User Query -> Parallel Retrieval [BM25 Full-Text + pgvector HNSW Embedding] -> Reciprocal Rank Fusion -> Cross-Encoder Re-Ranker -> Top-5 Chunks -> LLM Context Guardrail",
                "interview_trap_question": "Why use Hybrid Search with Reciprocal Rank Fusion instead of purely semantic vector cosine similarity?",
                "staff_defense_answer": "Pure vector search frequently fails on exact keyword identifiers like product SKUs, error codes, and specific API method names where semantic distance doesn't capture exact token matches. BM25 catches exact keyword hits while vector search captures conceptual semantics, and RRF blends them with zero score normalization skew."
            }
        ],
        "brutal_truth": "Anyone can import an AI API. Building the retrieval pipelines, caching layers, and evals around it is what pays top tier salaries.",
        "suggested_prompts": [
            "Analyze my resume for best role match",
            "What should I do to reach SDE-1 Backend?",
            "How do I deploy this with Docker and CI/CD?"
        ]
    }


def _format_history(conversation_history: list[dict[str, Any]] | None) -> str:
    """Format conversation turns into a compact recent history string."""
    if not conversation_history:
        return ""
    history_formatted = ""
    for turn in conversation_history[-6:]:
        r = turn.get("role", "user").upper()
        c = turn.get("content", "")
        history_formatted += f"\n{r}: {c}"
    return history_formatted


def _extract_partial_villain_message(full_text: str) -> str:
    """Extract partial unescaped text from the 'villain_message' key of a streaming JSON string."""
    marker = '"villain_message":'
    idx = full_text.find(marker)
    if idx == -1:
        return ""
    start = full_text.find('"', idx + len(marker))
    if start == -1:
        return ""
    content = full_text[start + 1:]

    res = []
    i = 0
    escaped = False
    while i < len(content):
        ch = content[i]
        if escaped:
            if ch == 'n':
                res.append('\n')
            elif ch == 't':
                res.append('\t')
            elif ch == '"':
                res.append('"')
            elif ch == '\\':
                res.append('\\')
            else:
                res.append('\\' + ch)
            escaped = False
        elif ch == '\\':
            escaped = True
        elif ch == '"':
            break
        else:
            res.append(ch)
        i += 1
    return "".join(res)


def villain_agent_chat(
    user_message: str,
    conversation_history: list[dict[str, str]],
    candidate_profile: dict[str, Any] | str | None = None,
    target_role: str | None = None,
) -> dict[str, Any]:
    """
    Intelligent Career Villain Agent.
    Dynamically roasts, architectures, analyzes resumes, and gives transition advice based on candidate context.
    """
    profile_summary = _format_candidate_profile(candidate_profile)
    history_formatted = _format_history(conversation_history)

    user_prompt = (
        f"=== CANDIDATE RESUME & COMPLETE PROFILE DOSSIER ===\n"
        f"{profile_summary}\n\n"
        f"=== TARGET ROLE CONTEXT ===\n"
        f"{target_role or 'Not specified yet'}\n\n"
        f"=== RECENT CONVERSATION ===\n"
        f"{history_formatted}\n\n"
        f"=== CURRENT CANDIDATE MESSAGE ===\n"
        f"{user_message}\n\n"
        f"CRITICAL INSTRUCTIONS FOR THIS TURN:\n"
        f"1. 100% FULL RESUME ACCESS & ACCURACY:\n"
        f"   - You have FULL, UNRESTRICTED ACCESS to the candidate's complete resume dossier provided above.\n"
        f"   - When answering, reference their EXACT resume details specifically by name (e.g., cite their real project titles, exact skills, company experience, education/GPA, certifications).\n"
        f"   - If they ask 'chatbot ku full access erukanum' or ask if you can see their resume, confirm directly and cite specific details from their resume to prove your full access.\n"
        f"   - NEVER claim you cannot see their resume if resume data exists in the dossier above.\n"
        f"2. FOCUS DIRECTLY ON ANSWERING THE CURRENT CANDIDATE MESSAGE:\n"
        f"   - Answer THAT SPECIFIC QUESTION directly in villain_message. Do not digress or repeat previous resume reviews.\n"
        f"   - Understand English, Tamil, and Tanglish (e.g. 'en resume la enna irukku', 'enna role try pannalam', 'status enna', 'ithuku enna pannanum', 'full access erukanum') natively and respond with direct clarity.\n"
        f"   - If they ask what role they should target based on their resume, tell them the exact roles matching their background.\n"
        f"   - If they ask what to do from their current status, break down their real technical execution roadmap.\n"
        f"   - If they ask a technical, architectural, or interview question, explain it with staff-level rigor.\n"
        f"3. NEAT & STRUCTURED FORMATTING:\n"
        f"   - Format your response cleanly using structured Markdown headers (###), bullet points (-), and bold key terms.\n"
        f"   - Keep paragraphs short and skimmable. Never write dense, unbroken blocks of text.\n"
        f"4. POPULATE projects ONLY WHEN RELEVANT:\n"
        f"   - ONLY return project objects in 'projects': [...] if the candidate explicitly asks for portfolio projects, blueprints, what to build, OR asked to roast/level up an existing project.\n"
        f"   - For all other queries (role questions, resume questions, interview tips, technical questions), return 'projects': [].\n"
        f"5. KEEP IT CRISP & HIGH SIGNAL:\n"
        f"   - Keep villain_message direct, punchy, and around 130-260 impactful words.\n"
    )

    try:
        response = call_gemini_json(
            system_prompt=VILLAIN_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            temperature=0.7,
            max_output_tokens=2500,
            operation="villain_agent_chat_dynamic",
        )

        if not response.get("villain_message"):
            raise ValueError("Empty villain_message")

        # Sanitize projects
        raw_projects = response.get("projects") or []
        parsed_projects = []
        for i, p in enumerate(raw_projects):
            try:
                parsed_projects.append({
                    "id": p.get("id", f"proj-{i+1}"),
                    "title": p.get("title", f"Elite Project {i+1}"),
                    "difficulty": p.get("difficulty", "Advanced"),
                    "description": p.get("description", ""),
                    "tech_stack": p.get("tech_stack", []),
                    "target_gaps_addressed": p.get("target_gaps_addressed", []),
                    "architecture_summary": p.get("architecture_summary", ""),
                    "key_deliverables": p.get("key_deliverables", []),
                    "github_blueprint": p.get("github_blueprint", []),
                    "villain_pitch": p.get("villain_pitch", ""),
                    "interview_trap_question": p.get("interview_trap_question"),
                    "staff_defense_answer": p.get("staff_defense_answer"),
                    "architecture_diagram": p.get("architecture_diagram"),
                })
            except Exception:
                continue

        return {
            "villain_message": response.get("villain_message"),
            "verdict": response.get("verdict"),
            "projects": parsed_projects,
            "brutal_truth": response.get("brutal_truth", ""),
            "suggested_prompts": response.get("suggested_prompts") or [
                "What role should I target based on my skills?",
                "What should I do to reach SDE-1 Backend?",
                "How do I deploy this with Docker and CI/CD?"
            ],
        }

    except Exception as exc:
        logger.warning("[VillainAgent] Dynamic call failed (%s); using smart fallback", exc)
        return _fallback_villain(user_message, profile_summary, target_role)


# =============================================================================
# SSE Streaming variant
# =============================================================================

def villain_agent_chat_stream(
    user_message: str,
    conversation_history: list[dict[str, Any]] | None = None,
    candidate_profile: dict[str, Any] | str | None = None,
    target_role: str | None = None,
) -> Generator[str, None, None]:
    """
    Streams the villain chat response as SSE events.
    Yields:
        data: {"chunk": "...", "done": false}
        data: {"done": true, "villain_message": "...", "verdict": ..., "projects": [...], ...}
    Falls back gracefully to a single non-streamed SSE event if streaming fails.
    """
    profile_summary = _format_candidate_profile(candidate_profile)
    history_formatted = _format_history(conversation_history or [])

    user_prompt = (
        f"=== CANDIDATE RESUME & COMPLETE PROFILE DOSSIER ===\n"
        f"{profile_summary}\n\n"
        f"=== TARGET ROLE CONTEXT ===\n"
        f"{target_role or 'Not specified yet'}\n\n"
        f"=== RECENT CONVERSATION ===\n"
        f"{history_formatted}\n\n"
        f"=== CURRENT CANDIDATE MESSAGE ===\n"
        f"{user_message}\n\n"
        f"CRITICAL INSTRUCTIONS FOR THIS TURN:\n"
        f"1. Respond ONLY in valid JSON matching the output schema.\n"
        f"2. Keep villain_message focused (120-220 impactful words).\n"
        f"3. Answer the EXACT current question directly — do not repeat previous resume analysis.\n"
        f"4. Understand English, Tamil, and Tanglish fluently.\n"
        f"5. ONLY return projects[] when explicitly asked for portfolio/project ideas.\n"
    )

    # Try Gemini streaming first
    api_keys = get_api_keys()
    model_chain = get_model_chain()

    for _label, api_key in api_keys:
        for model_name in model_chain:
            try:
                from google.genai import types as _gtypes
                client = _get_client(api_key)
                full_text = ""
                last_sent_len = 0
                for chunk in client.models.generate_content_stream(
                    model=model_name,
                    contents=user_prompt,
                    config=_gtypes.GenerateContentConfig(
                        system_instruction=VILLAIN_SYSTEM_PROMPT,
                        temperature=0.7,
                        max_output_tokens=2500,
                    ),
                ):
                    if chunk.text:
                        full_text += chunk.text
                        partial_msg = _extract_partial_villain_message(full_text)
                        if len(partial_msg) > last_sent_len:
                            delta = partial_msg[last_sent_len:]
                            yield f"data: {json.dumps({'chunk': delta, 'done': False})}\n\n"
                            last_sent_len = len(partial_msg)

                # Parse the full accumulated JSON response
                try:
                    cleaned = full_text.strip()
                    if cleaned.startswith("```"):
                        cleaned = cleaned.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
                    response = json.loads(cleaned)
                except Exception:
                    response = {
                        "villain_message": _extract_partial_villain_message(full_text) or full_text,
                        "verdict": None,
                        "projects": [],
                        "brutal_truth": "",
                        "suggested_prompts": [
                            "What role should I target based on my skills?",
                            "What should I do to reach SDE-1 Backend?",
                            "How do I deploy this with Docker and CI/CD?",
                        ],
                    }

                raw_projects = response.get("projects") or []
                parsed_projects = []
                for i, p in enumerate(raw_projects):
                    try:
                        parsed_projects.append({
                            "id": p.get("id", f"proj-{i+1}"),
                            "title": p.get("title", f"Elite Project {i+1}"),
                            "difficulty": p.get("difficulty", "Advanced"),
                            "description": p.get("description", ""),
                            "tech_stack": p.get("tech_stack", []),
                            "target_gaps_addressed": p.get("target_gaps_addressed", []),
                            "architecture_summary": p.get("architecture_summary", ""),
                            "key_deliverables": p.get("key_deliverables", []),
                            "github_blueprint": p.get("github_blueprint", []),
                            "villain_pitch": p.get("villain_pitch", ""),
                            "interview_trap_question": p.get("interview_trap_question"),
                            "staff_defense_answer": p.get("staff_defense_answer"),
                            "architecture_diagram": p.get("architecture_diagram"),
                        })
                    except Exception:
                        continue

                done_payload = {
                    "done": True,
                    "villain_message": response.get("villain_message", full_text),
                    "verdict": response.get("verdict"),
                    "projects": parsed_projects,
                    "brutal_truth": response.get("brutal_truth", ""),
                    "suggested_prompts": response.get("suggested_prompts") or [
                        "What role should I target based on my skills?",
                        "What should I do to reach SDE-1 Backend?",
                        "How do I deploy this with Docker and CI/CD?",
                    ],
                }
                yield f"data: {json.dumps(done_payload)}\n\n"
                return

            except Exception as exc:
                logger.warning("[VillainAgent][stream] model=%s failed: %s", model_name, exc)
                continue

    # All streaming attempts failed — fall back to sync call and emit as single done event
    logger.warning("[VillainAgent][stream] All streaming attempts failed; falling back to sync call")
    try:
        result = villain_agent_chat(
            user_message=user_message,
            conversation_history=conversation_history or [],
            candidate_profile=candidate_profile,
            target_role=target_role,
        )
        msg = result.get("villain_message") or ""
        words = msg.split(" ")
        for i in range(0, len(words), 3):
            sub = " ".join(words[i:i+3]) + " "
            yield f"data: {json.dumps({'chunk': sub, 'done': False})}\n\n"
        yield f"data: {json.dumps({'done': True, **result})}\n\n"
        return
    except Exception as exc:
        logger.error("[VillainAgent][stream] Fallback sync also failed: %s", exc)
        fallback_res = _fallback_villain(user_message, profile_summary, target_role)
        msg = fallback_res.get("villain_message") or ""
        words = msg.split(" ")
        for i in range(0, len(words), 3):
            sub = " ".join(words[i:i+3]) + " "
            yield f"data: {json.dumps({'chunk': sub, 'done': False})}\n\n"
        yield f"data: {json.dumps({'done': True, **fallback_res})}\n\n"

