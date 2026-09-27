"""
role_intelligence.py

Deterministic Role Intelligence Engine for AI MOCKORA.

Architecture:
    Candidate Profile
        ├── skills{}                    → flat candidate skill pool
        ├── projects[]{technologies[]}  → project evidence
        └── experience[]{technologies[]}→ experience evidence (if available)
            ↓
    Skill Normalisation          (normalize_skill / _ALIASES / _build_skill_tokens)
        ↓
    Evidence Extraction          (extract_candidate_evidence)
        ↓
    Skill Matching               (match_role_skills)
        ↓
    Score Calculation            (compute_role_score)
        ↓
    Reason Generation            (generate_reason)
        ↓
    RoleMatchResult

NO LLM calls are made here — this is a fully deterministic engine.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple

# =============================================================================
# WEIGHTS — single place to adjust scoring
# =============================================================================

REQUIRED_WEIGHT: float = 0.50
PREFERRED_WEIGHT: float = 0.15
PROJECT_WEIGHT: float = 0.15
EXPERIENCE_WEIGHT: float = 0.10
RELATED_WEIGHT: float = 0.10

# These must sum to 1.0 — validated at import time.
assert abs((REQUIRED_WEIGHT + PREFERRED_WEIGHT + PROJECT_WEIGHT + EXPERIENCE_WEIGHT + RELATED_WEIGHT) - 1.0) < 1e-9, (
    "Role intelligence weights must sum to 1.0"
)

# =============================================================================
# SKILL ALIASES — canonical normalisation map
#
# Rules:
#   - Keys are lowercase alias tokens.
#   - Values are the canonical canonical skill name.
#   - Token-aware: only match exact whitespace-delimited tokens or the whole
#     string. This prevents "java" matching "javascript".
# =============================================================================

_ALIASES: Dict[str, str] = {
    # Python
    "py": "python",

    # PostgreSQL
    "postgres": "postgresql",
    "postgres db": "postgresql",
    "psql": "postgresql",
    "pg": "postgresql",

    # Scikit-learn
    "sklearn": "scikit-learn",
    "scikit learn": "scikit-learn",

    # TensorFlow
    "tf": "tensorflow",

    # PyTorch
    "torch": "pytorch",

    # Machine Learning
    "ml": "machine learning",

    # Deep Learning
    "dl": "deep learning",

    # NumPy
    "numpy": "numpy",

    # Pandas
    "pd": "pandas",

    # FastAPI
    "fast api": "fastapi",

    # React
    "reactjs": "react",
    "react js": "react",
    "react.js": "react",

    # Node.js
    "node": "node.js",
    "nodejs": "node.js",

    # Docker
    "containerisation": "docker",
    "containerization": "docker",

    # Kubernetes
    "k8s": "kubernetes",

    # LangChain
    "lang chain": "langchain",

    # LangGraph
    "lang graph": "langgraph",

    # Natural Language Processing
    "nlp": "natural language processing",

    # Computer Vision
    "cv": "computer vision",

    # AWS
    "amazon web services": "aws",

    # GCP
    "google cloud platform": "gcp",
    "google cloud": "gcp",

    # REST APIs
    "rest api": "rest apis",
    "restful": "rest apis",
    "restful api": "rest apis",
    "restful apis": "rest apis",
    "http api": "rest apis",

    # CI/CD
    "continuous integration": "ci/cd",
    "continuous deployment": "ci/cd",
    "continuous delivery": "ci/cd",
    "cicd": "ci/cd",

    # Data Structures
    "dsa": "data structures",

    # Object-Oriented Programming
    "oop": "oop design",
    "object oriented": "oop design",
    "object-oriented": "oop design",
    "object oriented programming": "oop design",

    # TypeScript
    "ts": "typescript",

    # JavaScript
    "js": "javascript",

    # SQL
    "structured query language": "sql",

    # OpenAI
    "openai": "openai api",
    "gpt": "openai api",
    "gpt4": "openai api",
    "chatgpt": "openai api",

    # Algorithms
    "algorithm": "algorithms",
    "algo": "algorithms",

    # System Design
    "system architecture": "system design",

    # Apache Spark
    "spark": "apache spark",
    "pyspark": "apache spark",

    # Apache Kafka
    "kafka": "kafka",

    # Apache Airflow
    "airflow": "apache airflow",
}


def normalize_skill(raw: str) -> str:
    """
    Normalize a raw skill string to its canonical form.

    Steps:
      1. Lowercase and strip whitespace.
      2. Check exact match in alias table.
      3. Check token-level match (each word token against alias keys).
      4. Return canonical or cleaned original.

    Examples:
      "postgres"      → "postgresql"
      "sklearn"       → "scikit-learn"
      "JS"            → "javascript"
      "PyTorch"       → "pytorch"
      "Python 3.12"   → "python"  (token match on "python")
    """
    cleaned = raw.strip().lower()
    cleaned = re.sub(r"\s+", " ", cleaned)  # collapse internal whitespace

    # Exact alias match
    if cleaned in _ALIASES:
        return _ALIASES[cleaned]

    # Token alias: if the first significant word of the skill hits an alias
    tokens = cleaned.split()
    if tokens and tokens[0] in _ALIASES:
        return _ALIASES[tokens[0]]

    # No alias → return cleaned original
    return cleaned


def _build_skill_tokens(raw_skills: List[str]) -> Set[str]:
    """Return a set of normalised canonical skill tokens from a raw list."""
    result: Set[str] = set()
    for s in raw_skills:
        if s:
            result.add(normalize_skill(str(s)))
    return result


# =============================================================================
# EVIDENCE TYPES
# =============================================================================

@dataclass
class SkillEvidence:
    """Records where a matched role skill was found in the candidate's profile."""
    skill: str          # canonical role skill name (display form)
    source: str         # "project" | "experience" | "skill"
    context: str        # project name or company name


# =============================================================================
# CANDIDATE INTELLIGENCE PROFILE
# =============================================================================

@dataclass
class CandidateIntelligence:
    """
    A normalised, flattened view of candidate profile data
    used exclusively by the matching engine.
    """
    # All skills from the skills dict (lower-cased, normalised)
    skill_tokens: Set[str] = field(default_factory=set)

    # {canonical_skill_token → list of (project_name)}
    project_skill_map: Dict[str, List[str]] = field(default_factory=dict)

    # {canonical_skill_token → list of (company_name)}
    experience_skill_map: Dict[str, List[str]] = field(default_factory=dict)

    @property
    def all_tokens(self) -> Set[str]:
        """All tokens reachable from any source."""
        combined = set(self.skill_tokens)
        combined.update(self.project_skill_map.keys())
        combined.update(self.experience_skill_map.keys())
        return combined


def extract_candidate_evidence(profile: Dict) -> CandidateIntelligence:
    """
    Build a CandidateIntelligence from a raw candidate profile dict.

    Reads:
      profile["skills"]         → dict of category → list[str]
      profile["projects"]       → list of {name, technologies}
      profile["experience"]     → list of {company, role, technologies}
      profile["potential_interview_topics"] → list[str]
    """
    intel = CandidateIntelligence()

    # 1. Skills dict
    skills_dict = profile.get("skills", {}) or {}
    for skill_list in skills_dict.values():
        if isinstance(skill_list, list):
            for s in skill_list:
                tok = normalize_skill(str(s))
                if tok:
                    intel.skill_tokens.add(tok)

    # 2. Potential interview topics (treated as skills for breadth)
    for topic in profile.get("potential_interview_topics", []) or []:
        tok = normalize_skill(str(topic))
        if tok:
            intel.skill_tokens.add(tok)

    # 3. Projects
    for proj in profile.get("projects", []) or []:
        proj_name = str(proj.get("name", "")).strip() or "Project"
        for tech in proj.get("technologies", []) or []:
            tok = normalize_skill(str(tech))
            if tok:
                intel.project_skill_map.setdefault(tok, [])
                if proj_name not in intel.project_skill_map[tok]:
                    intel.project_skill_map[tok].append(proj_name)

    # 4. Experience — technologies field (may not always be populated)
    for exp in profile.get("experience", []) or []:
        company = str(exp.get("company", "")).strip() or str(exp.get("role", "")).strip() or "Experience"
        for tech in exp.get("technologies", []) or []:
            tok = normalize_skill(str(tech))
            if tok:
                intel.experience_skill_map.setdefault(tok, [])
                if company not in intel.experience_skill_map[tok]:
                    intel.experience_skill_map[tok].append(company)

    return intel


# =============================================================================
# SKILL MATCHING HELPER
# =============================================================================

def _skill_matches(candidate_tokens: Set[str], role_skill: str) -> bool:
    """
    Test whether a candidate token set covers a role skill.

    Matching strategy (in order):
      1. Exact normalised match.
      2. Candidate token is a meaningful prefix/suffix of the role skill
         (min 4 chars, token-aware — avoids "java" → "javascript").

    The 4-char minimum prevents trivial short matches.
    """
    role_norm = normalize_skill(role_skill)

    # Exact match
    if role_norm in candidate_tokens:
        return True

    # Token-aware bidirectional containment (min 4 chars)
    for tok in candidate_tokens:
        if len(tok) < 4:
            continue
        # tok is a whole word inside role_norm? (word boundary check)
        if re.search(r'\b' + re.escape(tok) + r'\b', role_norm):
            return True
        # role_norm is a whole word inside tok?
        if len(role_norm) >= 4 and re.search(r'\b' + re.escape(role_norm) + r'\b', tok):
            return True

    return False


# =============================================================================
# MATCH RESULT
# =============================================================================

@dataclass
class SkillGroupMatch:
    matched: List[str]
    total: int

    @property
    def count(self) -> int:
        return len(self.matched)

    def pct(self) -> float:
        if self.total == 0:
            return 0.0
        return self.count / self.total


@dataclass
class SkillGaps:
    required: List[str] = field(default_factory=list)
    preferred: List[str] = field(default_factory=list)


@dataclass
class RoleMatchResult:
    role_id: str
    role_title: str
    category: str
    match_score: int                        # 0-100

    matched_skills: List[str]               # all matched skill display names (deduped)
    skill_gaps: SkillGaps

    required_match: SkillGroupMatch
    preferred_match: SkillGroupMatch
    related_match: SkillGroupMatch

    project_evidence: List[SkillEvidence]
    experience_evidence: List[SkillEvidence]

    reason: str


# =============================================================================
# ROLE SCORING
# =============================================================================

def _collect_evidence(
    intel: CandidateIntelligence,
    role_skill: str,
) -> Tuple[bool, Optional[SkillEvidence]]:
    """
    Check if role_skill is supported by experience evidence first,
    then project evidence, then plain skill pool.
    Returns (found: bool, evidence: SkillEvidence | None).
    Evidence is None when the skill is only in the flat skills pool.
    """
    role_norm = normalize_skill(role_skill)

    # Experience evidence (strongest signal)
    for tok in intel.experience_skill_map:
        if _skill_matches({tok}, role_skill):
            companies = intel.experience_skill_map[tok]
            return True, SkillEvidence(
                skill=role_skill,
                source="experience",
                context=companies[0] if companies else "Experience",
            )

    # Project evidence
    for tok in intel.project_skill_map:
        if _skill_matches({tok}, role_skill):
            projects = intel.project_skill_map[tok]
            return True, SkillEvidence(
                skill=role_skill,
                source="project",
                context=projects[0] if projects else "Project",
            )

    # Plain skills pool
    if _skill_matches(intel.skill_tokens, role_skill):
        return True, None

    return False, None


def match_role_skills(
    intel: CandidateIntelligence,
    role: Dict,
) -> RoleMatchResult:
    """
    Full match computation for a single role.

    Returns a RoleMatchResult with score, evidence, gaps, and reason.
    """
    required_skills: List[str] = role.get("requiredSkills", [])
    preferred_skills: List[str] = role.get("preferredSkills", [])
    related_skills: List[str] = role.get("relatedSkills", [])

    matched_required: List[str] = []
    missed_required: List[str] = []
    matched_preferred: List[str] = []
    missed_preferred: List[str] = []
    matched_related: List[str] = []

    proj_evidence: List[SkillEvidence] = []
    exp_evidence: List[SkillEvidence] = []

    all_matched_display: List[str] = []
    seen_matched: Set[str] = set()

    def _process(skill_list: List[str], matched_out: List[str], missed_out: List[str]):
        for skill in skill_list:
            found, ev = _collect_evidence(intel, skill)
            if found:
                matched_out.append(skill)
                norm = normalize_skill(skill)
                if norm not in seen_matched:
                    seen_matched.add(norm)
                    all_matched_display.append(skill)
                if ev:
                    if ev.source == "project":
                        proj_evidence.append(ev)
                    elif ev.source == "experience":
                        exp_evidence.append(ev)
            else:
                missed_out.append(skill)

    _process(required_skills, matched_required, missed_required)
    _process(preferred_skills, matched_preferred, missed_preferred)
    _process(related_skills, matched_related, [])

    # --- Score calculation ---
    req_pct = len(matched_required) / len(required_skills) if required_skills else 0.0
    pref_pct = len(matched_preferred) / len(preferred_skills) if preferred_skills else 0.0
    proj_bonus = min(1.0, len(proj_evidence) / max(1, len(required_skills)))
    exp_bonus = min(1.0, len(exp_evidence) / max(1, len(required_skills)))
    rel_pct = len(matched_related) / len(related_skills) if related_skills else 0.0

    raw_score = (
        req_pct  * REQUIRED_WEIGHT
        + pref_pct * PREFERRED_WEIGHT
        + proj_bonus * PROJECT_WEIGHT
        + exp_bonus * EXPERIENCE_WEIGHT
        + rel_pct * RELATED_WEIGHT
    )
    match_score = round(raw_score * 100)
    match_score = max(0, min(100, match_score))

    # --- Reason ---
    reason = generate_reason(
        role_title=role["title"],
        matched_required=matched_required,
        proj_evidence=proj_evidence,
        exp_evidence=exp_evidence,
        match_score=match_score,
    )

    return RoleMatchResult(
        role_id=role["id"],
        role_title=role["title"],
        category=role.get("category", role.get("department", "")),
        match_score=match_score,
        matched_skills=all_matched_display,
        skill_gaps=SkillGaps(
            required=missed_required,
            preferred=missed_preferred,
        ),
        required_match=SkillGroupMatch(matched=matched_required, total=len(required_skills)),
        preferred_match=SkillGroupMatch(matched=matched_preferred, total=len(preferred_skills)),
        related_match=SkillGroupMatch(matched=matched_related, total=len(related_skills)),
        project_evidence=proj_evidence,
        experience_evidence=exp_evidence,
        reason=reason,
    )


# =============================================================================
# REASON GENERATION — deterministic, template-based, evidence-only
# =============================================================================

def generate_reason(
    role_title: str,
    matched_required: List[str],
    proj_evidence: List[SkillEvidence],
    exp_evidence: List[SkillEvidence],
    match_score: int,
) -> str:
    """
    Build an explainable recommendation reason using ONLY actual evidence.

    Does NOT invent, assume, or fabricate any claim.
    """
    parts: List[str] = []

    # Core skill mention (max 3 names for readability)
    if matched_required:
        skill_names = matched_required[:3]
        skill_str = ", ".join(skill_names)
        if len(matched_required) > 3:
            skill_str += f" and {len(matched_required) - 3} more"
        parts.append(f"your skills in {skill_str}")

    # Experience evidence
    if exp_evidence:
        companies = list(dict.fromkeys(e.context for e in exp_evidence))
        exp_skills = [e.skill for e in exp_evidence[:2]]
        exp_str = " and ".join(exp_skills[:2])
        ctx_str = companies[0]
        parts.append(f"professional use of {exp_str} at {ctx_str}")

    # Project evidence (only if no experience evidence or different skills)
    if proj_evidence:
        proj_skills_in_exp = {e.skill for e in exp_evidence}
        novel_proj = [e for e in proj_evidence if e.skill not in proj_skills_in_exp]
        if novel_proj:
            proj_names = list(dict.fromkeys(e.context for e in novel_proj))
            proj_str = novel_proj[0].skill
            proj_context = proj_names[0]
            parts.append(f"project experience with {proj_str} in '{proj_context}'")
        elif proj_evidence and not exp_evidence:
            e = proj_evidence[0]
            parts.append(f"project experience with {e.skill} in '{e.context}'")

    if not parts:
        if match_score >= 30:
            return f"Some of your skills partially overlap with {role_title} requirements."
        return f"Limited skill overlap with {role_title}."

    base = " and ".join(parts)

    if match_score >= 80:
        return f"Strong alignment with {role_title} based on {base}."
    elif match_score >= 50:
        return f"Good match with {role_title} based on {base}."
    else:
        return f"Partial overlap with {role_title} based on {base}."


# =============================================================================
# RECOMMENDATION RANKING
# =============================================================================

def rank_recommendations(
    profile: Dict,
    role_catalogue: List[Dict],
    top_n: int = 5,
    min_score: int = 1,
) -> List[RoleMatchResult]:
    """
    Run the full Role Intelligence Engine against a candidate profile.

    Returns top_n RoleMatchResult objects sorted by match_score descending.
    Roles with match_score < min_score are excluded.
    """
    if not profile:
        return []

    intel = extract_candidate_evidence(profile)

    if not intel.all_tokens:
        return []

    results: List[RoleMatchResult] = []
    for role in role_catalogue:
        result = match_role_skills(intel, role)
        if result.match_score >= min_score:
            results.append(result)

    results.sort(key=lambda r: r.match_score, reverse=True)
    return results[:top_n]


# =============================================================================
# SERIALISATION — convert RoleMatchResult + role dict to API response dict
# =============================================================================

def serialize_recommendation(result: RoleMatchResult, role: Dict) -> Dict:
    """
    Produce the API response dict for a single recommendation.
    Preserves all existing fields (id, title, department, difficulty, etc.)
    and adds the Role Intelligence fields.
    """
    return {
        # All existing role catalogue fields — preserved exactly
        **role,
        # Intelligence fields
        "matchScore": result.match_score,
        "matchedSkills": result.matched_skills,
        "skillGaps": result.skill_gaps.required + result.skill_gaps.preferred,
        "requiredSkillMatch": {
            "matched": result.required_match.count,
            "total": result.required_match.total,
        },
        "preferredSkillMatch": {
            "matched": result.preferred_match.count,
            "total": result.preferred_match.total,
        },
        "skillGapDetail": {
            "required": result.skill_gaps.required,
            "preferred": result.skill_gaps.preferred,
        },
        "projectEvidence": [
            {"skill": e.skill, "project": e.context}
            for e in result.project_evidence
        ],
        "experienceEvidence": [
            {"skill": e.skill, "company": e.context}
            for e in result.experience_evidence
        ],
        "reason": result.reason,
    }
