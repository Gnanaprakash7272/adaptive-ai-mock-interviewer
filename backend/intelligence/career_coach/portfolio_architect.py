"""portfolio_architect.py

Generates 2-3 production-grade portfolio project blueprints tailored specifically
to bridge the candidate's verified skill gaps.
"""

from __future__ import annotations

import logging
from typing import Any

from gemini_config import call_gemini_json
from intelligence.career_coach.state import PortfolioProject, SkillGapMap

logger = logging.getLogger(__name__)

PORTFOLIO_SYSTEM_PROMPT = """You are a Principal Software Architect and Staff Hiring Manager.
Given a candidate's target role and their identified skill gaps (missing core competencies, system design blindspots),
design 2 to 3 production-grade, non-trivial portfolio projects.

CRITICAL CRITERIA:
- Avoid generic "to-do apps" or basic CRUD clones.
- Each project must be a production-grade system that directly demonstrates the candidate's missing competencies.
- Include architectural rationale, concrete tech stack, key deliverables, and GitHub repository layout blueprint.

Return valid JSON:
{
  "projects": [
    {
      "id": "proj-1",
      "title": "string",
      "difficulty": "Advanced",
      "description": "string",
      "tech_stack": ["string"],
      "target_gaps_addressed": ["string"],
      "architecture_summary": "string",
      "key_deliverables": ["string"],
      "github_blueprint": ["string"]
    }
  ]
}"""


def _fallback_projects(gap_map: SkillGapMap, target_role: str) -> list[PortfolioProject]:
    """Production-grade fallback project blueprints with fresher / senior calibration."""
    is_fresher = (
        "fresher" in gap_map.seniority_level.lower()
        or "entry" in gap_map.seniority_level.lower()
    )

    role_lower = target_role.lower()

    # 1. Fresher / Entry-level Track (0 YOE)
    if is_fresher:
        return [
            PortfolioProject(
                id="proj-fresher-production-backend",
                title="Production Scalable Microservice & API Engine",
                difficulty="Intermediate",
                description="A full-featured production REST/GraphQL backend with authentication, Redis caching, PostgreSQL database with automated migrations, Docker containerization, and live CI/CD cloud deployment.",
                tech_stack=["Python / FastAPI", "PostgreSQL", "Redis", "Docker", "GitHub Actions", "Vercel / AWS"],
                target_gaps_addressed=[
                    "End-to-End Production Deployment & Cloud Hosting",
                    "Real-World RESTful API Design & Error Handling",
                    "Database Indexing & Relationship Modeling",
                    "Automated Testing & CI/CD Pipelines",
                ],
                architecture_summary="Clean 3-tier modular architecture with dependency injection; JWT authentication flow with refresh tokens; Redis cache-aside layer; Dockerized container deployment with health-check endpoints.",
                key_deliverables=[
                    "Live deployed working application with SSL and public API documentation (Swagger/OpenAPI)",
                    "Comprehensive test suite achieving >85% code coverage with pytest and GitHub Actions CI",
                    "Database schema migrations with Alembic and indexed query benchmarks",
                ],
                github_blueprint=[
                    "api/ - Route handlers with strict Pydantic request/response schemas",
                    "core/ - Config, DB session lifecycle, and auth middleware",
                    "services/ - Business logic decoupled from transport protocols",
                    ".github/workflows/ci.yml - Automated linting, testing, and deployment pipeline",
                    "README.md with interactive demo link, system architecture diagram, and API docs",
                ],
            ),
            PortfolioProject(
                id="proj-fresher-algoverse",
                title="Algorithmic Visualizer & Realtime Event Streamer",
                difficulty="Intermediate",
                description="Interactive algorithmic execution engine that processes high-concurrency event streams, visualizes data structures in real-time, and benchmarks time/space complexity under simulated memory limits.",
                tech_stack=["TypeScript / React", "Python / FastAPI", "WebSockets", "Docker"],
                target_gaps_addressed=[
                    "Data Structures & Core Algorithmic Problem Solving",
                    "Real-time WebSocket event streaming",
                    "System performance benchmarking",
                ],
                architecture_summary="Frontend canvas rendering algorithm step states pushed via asynchronous WebSockets from backend execution sandbox.",
                key_deliverables=[
                    "Interactive real-time visualization with step-through debugger and step count metrics",
                    "Benchmarking dashboard comparing O(N log N) vs O(N^2) algorithms with live charts",
                    "Live demo deployed with responsive UI",
                ],
                github_blueprint=[
                    "frontend/ - Interactive algorithm visualizer canvas",
                    "backend/engine/ - Sandboxed execution worker",
                    "tests/ - Unit tests verifying algorithmic correctness",
                    "README.md with GIF walkthroughs and time/space complexity proof tables",
                ],
            ),
        ]

    # 2. DevOps / Cloud / SRE Track
    if any(k in role_lower for k in ["devops", "cloud", "sre", "platform", "infrastructure", "kubernetes"]):
        return [
            PortfolioProject(
                id="proj-cloud-gitops",
                title="Multi-Region GitOps Platform & Automated Canary Controller",
                difficulty="Advanced",
                description="A GitOps continuous delivery engine managing Kubernetes clusters with Terraform, ArgoCD, automated canary rollouts, Prometheus metrics analysis, and automated rollback upon SLO breach.",
                tech_stack=["Kubernetes", "Terraform", "Go / Python", "ArgoCD", "Prometheus", "Helm"],
                target_gaps_addressed=[
                    "Infrastructure as Code & Multi-Region Resiliency",
                    "Progressive Delivery & Canary Deployment Strategies",
                    "Prometheus Alerting, SLI/SLO Engineering & Observability",
                ],
                architecture_summary="Argo Rollouts controller polling Prometheus metrics; automated traffic shifting via Istio Service Mesh; Terraform modules managing multi-zone cloud infrastructure.",
                key_deliverables=[
                    "Automated canary deployment benchmark proving zero downtime during simulated failure injections",
                    "Terraform multi-region IaC templates with zero manual cluster configuration",
                    "Production Grafana dashboard visualizing latency p99, error budgets, and deployment stages",
                ],
                github_blueprint=[
                    "terraform/ - Modular cloud infrastructure definition",
                    "k8s/ - Helm charts and Argo Rollout canary manifests",
                    "monitoring/ - Prometheus alerting rules and Grafana dashboards",
                    "README.md with architecture topology diagram and SLO calculation methodology",
                ],
            ),
            PortfolioProject(
                id="proj-chaos-mesh",
                title="Distributed Chaos Engineering & Fault-Injection Mesh",
                difficulty="Advanced",
                description="Simulated network partition and packet drop test harness testing microservice circuit breakers, retry budgets, and distributed fallback behaviors under simulated disaster scenarios.",
                tech_stack=["Go", "Docker", "eBPF / iptables", "FastAPI", "Grafana"],
                target_gaps_addressed=[
                    "Resilience Engineering & Circuit Breaking",
                    "Disaster Recovery & Partition Tolerance (CAP Theorem)",
                ],
                architecture_summary="DaemonSet injecting kernel-level network latency; centralized reporting dashboard measuring error budgets.",
                key_deliverables=[
                    "Simulation reports proving graceful degradation under 40% packet drop",
                    "Open-source CLI tool for running automated chaos drills in CI",
                ],
                github_blueprint=[
                    "cmd/agent/ - Kernel network manipulator",
                    "pkg/scheduler/ - Drill coordinator",
                    "docs/DISASTER_RECOVERY.md - Case study runbook",
                ],
            ),
        ]

    # 3. Data Engineering / Analytics Track
    if any(k in role_lower for k in ["data", "etl", "lakehouse", "spark", "pipeline", "analytics"]):
        return [
            PortfolioProject(
                id="proj-lakehouse-streaming",
                title="High-Throughput Streaming Lakehouse (Kafka, Spark & Apache Iceberg)",
                difficulty="Advanced",
                description="An enterprise real-time streaming ETL lakehouse ingesting 100,000 events/sec via Kafka, micro-batching through Spark Structured Streaming, and writing to ACID Apache Iceberg tables with automated compaction.",
                tech_stack=["Apache Spark", "Apache Kafka", "Apache Iceberg", "Python / PySpark", "MinIO / S3", "Trino"],
                target_gaps_addressed=[
                    "Streaming Architecture & Backpressure Management",
                    "ACID Data Lake Storage Patterns (Iceberg/Delta)",
                    "Data Modeling for Low-Latency Analytical Queries",
                ],
                architecture_summary="Kafka multi-partition event bus consumed by Spark cluster with exactly-once checkpointing; Iceberg table format enabling time-travel queries and schema evolution; Trino query engine for sub-second SQL analytics.",
                key_deliverables=[
                    "End-to-end benchmark demonstrating 100,000 events/sec ingestion with sub-3 second latency",
                    "Automated table maintenance job performing Z-order clustering and snapshot expiration",
                    "Data quality validation suite using Great Expectations blocking malformed events into quarantine queues",
                ],
                github_blueprint=[
                    "producers/ - Synthetic event generator with realistic payload skew",
                    "spark/ - Structured Streaming consumer with exactly-once semantics",
                    "iceberg/ - Schema definitions, partition strategies, and compaction scripts",
                    "tests/ - Data quality and contract tests",
                    "README.md with data flow architecture diagram and query performance benchmarks",
                ],
            ),
            PortfolioProject(
                id="proj-data-anomaly-sentinel",
                title="Automated Data Quality & Pipeline Anomaly Sentinel",
                difficulty="Advanced",
                description="Real-time monitoring daemon computing running statistical profiles across streaming columns, detecting distribution drift, null spikes, and schema violations with automated alerting.",
                tech_stack=["Python", "PostgreSQL", "FastAPI", "Docker", "Slack Webhooks"],
                target_gaps_addressed=[
                    "Data Observability & Drift Detection",
                    "Schema Evolution & Backward Compatibility",
                ],
                architecture_summary="Sliding-window statistical profiler computing z-scores and KL-divergence over streaming data batches.",
                key_deliverables=[
                    "Real-time drift detection alert delivered within 5 seconds of injected schema corruptions",
                    "Interactive dashboard graphing column statistics and data health scores",
                ],
                github_blueprint=[
                    "sentinel/ - Statistical profiling engine",
                    "api/ - Health metric reporter",
                    "README.md with drift detection math explanation",
                ],
            ),
        ]

    # 4. Frontend & Full Stack Track
    if any(k in role_lower for k in ["frontend", "ui", "ux", "react", "full stack", "fullstack", "web"]):
        return [
            PortfolioProject(
                id="proj-realtime-collaborative",
                title="Real-Time Collaborative Canvas & Document Engine",
                difficulty="Advanced",
                description="A high-performance collaborative web application supporting multi-user simultaneous editing, CRDT (Conflict-free Replicated Data Types) consensus, cursor presence broadcasting, and sub-16ms 60fps rendering.",
                tech_stack=["TypeScript / React", "WebSockets", "Node.js / Express", "Yjs / Automerge", "Canvas API", "Redis"],
                target_gaps_addressed=[
                    "Real-Time State Synchronization & Conflict Resolution (CRDTs)",
                    "60fps Canvas Rendering & Performance Optimization",
                    "WebSocket Lifecycle, Reconnection & Heartbeat Resiliency",
                ],
                architecture_summary="Yjs document synchronization over WebSocket rooms; Redis pub/sub broadcasting state deltas across multiple server nodes; OffscreenCanvas rendering for silky smooth 60fps UI performance.",
                key_deliverables=[
                    "Live multi-user demo deployed on Vercel with real-time cursor presence and instant conflict resolution",
                    "Lighthouse performance score 98+ with sub-100ms First Contentful Paint",
                    "Automated end-to-end tests simulating 10 concurrent users typing simultaneously without state desync",
                ],
                github_blueprint=[
                    "src/canvas/ - Offscreen rendering pipeline with gesture transforms",
                    "src/crdt/ - State synchronization provider with Yjs",
                    "server/ - Clustered WebSocket server with Redis adapter",
                    "README.md with CRDT state machine diagram and live preview URL",
                ],
            ),
            PortfolioProject(
                id="proj-distributed-queue",
                title="Distributed Resilient Task Orchestrator & Dashboard",
                difficulty="Advanced",
                description="A distributed, fault-tolerant job queue engine supporting priority scheduling, at-least-once delivery guarantees, dead-letter exchanges, and a live web dashboard visualizing worker health.",
                tech_stack=["Python / FastAPI", "TypeScript / React", "Redis", "PostgreSQL", "Docker"],
                target_gaps_addressed=[
                    "Full-Stack System Architecture & API Contract Design",
                    "High-Throughput Concurrency & Worker Pools",
                ],
                architecture_summary="Separation of REST/WebSocket API from background worker cluster; responsive React dashboard streaming worker metrics.",
                key_deliverables=[
                    "Live deployed application showing interactive task dispatch and real-time completion graphs",
                    "Zero-loss crash recovery benchmark with simulated worker kills",
                ],
                github_blueprint=[
                    "frontend/ - Live monitoring dashboard with WebSockets",
                    "backend/ - Distributed worker pool with Redis Streams",
                    "README.md with setup instructions and architecture charts",
                ],
            ),
        ]

    # 5. Default / Backend Systems & AI Tracks
    return [
        PortfolioProject(
            id="proj-distributed-queue",
            title="Distributed Resilient Task Orchestrator",
            difficulty="Advanced",
            description="A distributed, fault-tolerant job queue engine supporting priority scheduling, at-least-once delivery guarantees, dead-letter exchanges, and worker heartbeat heartbeats.",
            tech_stack=["Python / FastAPI", "Redis", "PostgreSQL", "Docker", "Prometheus"],
            target_gaps_addressed=[
                "Distributed Locking & Race Conditions",
                "Idempotency & Message Deduplication",
                "High-Throughput Concurrency & Worker Pools",
            ],
            architecture_summary="Separation of API gateway ingest from worker cluster via Redis Streams; Postgres transactional outbox pattern for reliable state transitions; Prometheus metrics exporter for worker latency and queue depth.",
            key_deliverables=[
                "Zero-loss crash recovery benchmark with simulated SIGKILL kills",
                "Automated load-testing suite benchmarking 5,000 tasks/second",
                "Interactive CLI and dashboard visualizing queue depth and latency p99",
            ],
            github_blueprint=[
                "cmd/worker/ & cmd/api/ separation",
                "pkg/broker/ - Redis Streams abstraction with consumer groups",
                "pkg/storage/ - Postgres Outbox pattern with transactional guarantees",
                "docker-compose.yml with multi-node simulated network partitions",
                "README.md with Architecture Decision Records (ADRs) and load benchmark charts",
            ],
        ),
        PortfolioProject(
            id="proj-hybrid-rag",
            title="Enterprise Hybrid Search & RAG Intelligence Engine",
            difficulty="Advanced",
            description="A high-performance retrieval service combining dense vector similarity with sparse BM25 keyword search, cross-encoder re-ranking, and dynamic token-budget management.",
            tech_stack=["FastAPI", "pgvector / Qdrant", "HuggingFace SentenceTransformers", "Gemini API", "FastAPI SSE"],
            target_gaps_addressed=[
                "Vector Database Indexing (HNSW / IVF) & Latency Optimization",
                "Context Window Optimization & Hallucination Guardrails",
                "Streaming Server-Sent Events (SSE) for Real-Time LLM Tokens",
            ],
            architecture_summary="Two-tier retrieval pipeline: BM25 candidate generation merged with pgvector HNSW cosine distance via Reciprocal Rank Fusion (RRF); asynchronous streaming pipeline with fallback LLM routing.",
            key_deliverables=[
                "RRF hybrid retrieval algorithm outperforming pure dense search by +22% MRR@10",
                "Evaluation suite using Ragas measuring Context Relevance, Faithfulness, and Answer Recall",
                "Latency telemetry proving sub-150ms retrieval under 200 concurrent queries",
            ],
            github_blueprint=[
                "backend/retriever/ - Hybrid RRF implementation",
                "backend/eval/ - Automated synthetic question generation and evaluation harness",
                "benchmarks/ - Locust latency load testing scripts",
                "docs/ARCHITECTURE.md - Full Mermaid dataflow diagram",
            ],
        ),
    ]


def generate_portfolio_projects(
    gap_map: SkillGapMap,
    target_role: str,
) -> list[PortfolioProject]:
    """Generates 2-3 tailored portfolio project blueprints."""
    user_prompt = f"""Target Role: {target_role}
Skill Gaps to Prove:
- Missing Core Skills: {gap_map.missing_core_skills}
- Critical Blindspots: {gap_map.critical_blindspots}

Design 2 to 3 industry-grade portfolio projects that will immediately impress hiring managers and interviewers."""

    try:
        response = call_gemini_json(
            system_prompt=PORTFOLIO_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            temperature=0.4,
            max_output_tokens=2200,
            operation="career_coach_portfolio",
        )

        raw_projects = response.get("projects", [])
        if not raw_projects:
            raise ValueError("No projects returned from LLM")

        projects: list[PortfolioProject] = []
        for i, p in enumerate(raw_projects, start=1):
            projects.append(
                PortfolioProject(
                    id=p.get("id", f"proj-{i}"),
                    title=p.get("title", f"Production Project {i}"),
                    difficulty=p.get("difficulty", "Advanced"),
                    description=p.get("description", ""),
                    tech_stack=p.get("tech_stack", []),
                    target_gaps_addressed=p.get("target_gaps_addressed", []),
                    architecture_summary=p.get("architecture_summary", ""),
                    key_deliverables=p.get("key_deliverables", []),
                    github_blueprint=p.get("github_blueprint", []),
                )
            )
        return projects

    except Exception as exc:
        logger.warning("Gemini portfolio generator failed (%s); using fallback blueprints", exc)
        return _fallback_projects(gap_map, target_role)
