"""
Sanitized interview brief + role-grounded topic planning.

Does not send PII to Gemini. Does not invent candidate experience.
"""
from __future__ import annotations

import os
import re
from typing import Any, Optional

from api.role_catalogue import ROLE_CATALOGUE
from api.role_intelligence import (
    extract_candidate_evidence,
    match_role_skills,
    normalize_skill,
)

# Kept as fallback for unknown/custom role titles.
ROLE_TOPIC_MAP: dict[str, list[str]] = {
    "react":            ["React", "JavaScript", "TypeScript", "Frontend Architecture", "State Management"],
    "machine learning": ["Python", "Machine Learning", "Deep Learning", "Data Processing", "MLOps", "Model Evaluation"],
    "ml engineer":      ["Python", "Machine Learning", "Deep Learning", "Data Processing", "MLOps", "Model Evaluation"],
    "backend":          ["API Design", "Databases", "Microservices", "System Architecture", "Security", "Backend Frameworks"],
    "frontend":         ["JavaScript", "CSS/HTML", "Frontend Frameworks", "Web Performance", "State Management"],
    "data scientist":   ["SQL", "Data Pipelines", "Data Warehousing", "Python", "Data Modeling"],
    "data engineer":    ["SQL", "Data Pipelines", "Data Warehousing", "Python", "Data Modeling"],
    "devops":           ["CI/CD", "Docker", "Kubernetes", "Cloud Platforms", "Infrastructure as Code", "Monitoring"],
    "full stack":       ["Frontend Frameworks", "Backend Architecture", "Databases", "API Design", "Deployment"],
    "software":         ["Data Structures", "Algorithms", "System Design", "Problem Solving", "Software Engineering Principles"],
}

DEFAULT_TOPICS: list[str] = [
    "Technical Skills", "System Design", "Problem Solving", "Domain Knowledge", "Best Practices",
]

_TITLE_NORMALIZE = (
    ("machine learning", "ml"),
    ("artificial intelligence", "ai"),
    ("full stack", "fullstack"),
    ("full-stack", "fullstack"),
    ("node.js", "nodejs"),
    ("site reliability engineer (sre)", "sre"),
    ("site reliability engineer", "sre"),
)


def max_followups_per_topic() -> int:
    raw = os.getenv("INTERVIEW_MAX_FOLLOWUPS_PER_TOPIC", "2").strip()
    try:
        value = int(raw)
    except ValueError:
        return 2
    return max(0, min(value, 5))


def _normalize_title(value: str) -> str:
    text = re.sub(r"\s+", " ", (value or "").strip().lower())
    for src, dst in _TITLE_NORMALIZE:
        text = text.replace(src, dst)
    return text


def _title_match_score(query: str, role_title: str) -> int:
    qn = _normalize_title(query)
    tn = _normalize_title(role_title)
    if not qn or not tn:
        return 0
    if qn == tn:
        return 100
    if tn in qn or qn in tn:
        return 90 + min(len(tn), 9)
    q_tokens = set(qn.split())
    t_tokens = set(tn.split())
    if t_tokens and t_tokens <= q_tokens:
        return 70 + min(20, 5 * len(t_tokens))
    overlap = len(q_tokens & t_tokens)
    if overlap == 0:
        return 0
    return overlap * 20


def find_catalogue_role(role_title: str) -> Optional[dict[str, Any]]:
    """Return the best catalogue role for a title, or None for unknown roles."""
    if not role_title or not role_title.strip():
        return None

    best: Optional[dict[str, Any]] = None
    best_score = 0
    for role in ROLE_CATALOGUE:
        score = _title_match_score(role_title, str(role.get("title", "")))
        if score > best_score:
            best_score = score
            best = role
    if best_score < 60:
        return None
    return best


def fallback_role_topics(role_title: str) -> list[str]:
    normalized_role = (role_title or "").lower()
    role_topics: list[str] = []
    best_key_len = 0
    for key, topics in ROLE_TOPIC_MAP.items():
        if key in normalized_role and len(key) > best_key_len:
            role_topics = list(topics)
            best_key_len = len(key)
    return role_topics or list(DEFAULT_TOPICS)


def _flatten_candidate_skills(profile: dict[str, Any]) -> list[str]:
    skills: list[str] = []
    seen: set[str] = set()
    skills_dict = profile.get("skills") or {}
    if isinstance(skills_dict, dict):
        for group in skills_dict.values():
            if not isinstance(group, list):
                continue
            for skill in group:
                text = str(skill).strip()
                key = text.lower()
                if text and key not in seen:
                    seen.add(key)
                    skills.append(text)
    for extra in profile.get("expertise_areas") or []:
        text = str(extra).strip()
        key = text.lower()
        if text and key not in seen:
            seen.add(key)
            skills.append(text)
    return skills


def _sanitize_project(project: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": str(project.get("name") or "").strip(),
        "description": str(project.get("description") or "").strip(),
        "technologies": [
            str(t).strip() for t in (project.get("technologies") or []) if str(t).strip()
        ],
        "key_contributions": [
            str(c).strip() for c in (project.get("key_contributions") or []) if str(c).strip()
        ][:6],
    }


def _sanitize_experience(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "company": str(item.get("company") or "").strip(),
        "role": str(item.get("role") or "").strip(),
        "technologies": [
            str(t).strip() for t in (item.get("technologies") or []) if str(t).strip()
        ],
        "responsibilities": [
            str(r).strip() for r in (item.get("responsibilities") or []) if str(r).strip()
        ][:6],
    }


def _role_skill_tokens(role: dict[str, Any]) -> set[str]:
    tokens: set[str] = set()
    for key in ("requiredSkills", "preferredSkills", "relatedSkills"):
        for skill in role.get(key) or []:
            tokens.add(normalize_skill(str(skill)))
    return tokens


def _item_overlaps_role(technologies: list, role_tokens: set[str]) -> bool:
    for tech in technologies or []:
        if normalize_skill(str(tech)) in role_tokens:
            return True
        for role_tok in role_tokens:
            if role_tok and role_tok in normalize_skill(str(tech)):
                return True
    return False


def _select_projects(profile: dict[str, Any], role: Optional[dict[str, Any]]) -> list[dict[str, Any]]:
    projects = [p for p in (profile.get("projects") or []) if isinstance(p, dict)]
    if not projects:
        return []
    role_tokens = _role_skill_tokens(role) if role else set()
    relevant = []
    others = []
    for project in projects:
        cleaned = _sanitize_project(project)
        if not cleaned["name"]:
            continue
        if role_tokens and _item_overlaps_role(cleaned["technologies"], role_tokens):
            relevant.append(cleaned)
        else:
            others.append(cleaned)
    selected = relevant or others[:2]
    return selected[:4]


def _select_experience(profile: dict[str, Any], role: Optional[dict[str, Any]]) -> list[dict[str, Any]]:
    experience = [e for e in (profile.get("experience") or []) if isinstance(e, dict)]
    if not experience:
        return []
    role_tokens = _role_skill_tokens(role) if role else set()
    relevant = []
    others = []
    for item in experience:
        cleaned = _sanitize_experience(item)
        if not cleaned["company"] and not cleaned["role"]:
            continue
        if role_tokens and _item_overlaps_role(cleaned["technologies"], role_tokens):
            relevant.append(cleaned)
        else:
            others.append(cleaned)
    selected = relevant or others[:2]
    return selected[:4]


def _dedupe_topics(topics: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for topic in topics:
        text = str(topic).strip()
        key = text.lower()
        if not text or key in seen:
            continue
        seen.add(key)
        result.append(text)
    return result


def build_interview_brief(
    role_title: str,
    candidate_profile: dict[str, Any],
) -> dict[str, Any]:
    """
    Build a PII-free brief for question generation and planning.
    """
    role = find_catalogue_role(role_title)
    candidate_skills = _flatten_candidate_skills(candidate_profile)
    projects = _select_projects(candidate_profile, role)
    experience = _select_experience(candidate_profile, role)

    if role:
        intel = extract_candidate_evidence(candidate_profile)
        match = match_role_skills(intel, role)
        skill_gaps = list(match.skill_gaps.required) + list(match.skill_gaps.preferred)
        return {
            "role": role.get("title") or role_title,
            "category": role.get("category") or "",
            "description": role.get("description") or "",
            "required_skills": list(role.get("requiredSkills") or []),
            "preferred_skills": list(role.get("preferredSkills") or []),
            "related_skills": list(role.get("relatedSkills") or []),
            "candidate_skills": candidate_skills,
            "relevant_projects": projects,
            "relevant_experience": experience,
            "role_match_score": match.match_score,
            "matched_skills": list(match.matched_skills),
            "skill_gaps": skill_gaps,
            "source": "catalogue",
        }

    fallback_topics = fallback_role_topics(role_title)
    profile_topics = [
        str(t).strip()
        for t in (candidate_profile.get("potential_interview_topics") or [])
        if str(t).strip()
    ]
    matched = []
    gaps = []
    profile_lower = {t.lower() for t in profile_topics + candidate_skills}
    for topic in fallback_topics:
        if topic.lower() in profile_lower:
            matched.append(topic)
        else:
            gaps.append(topic)

    return {
        "role": role_title,
        "category": "",
        "description": "",
        "required_skills": list(fallback_topics),
        "preferred_skills": [],
        "related_skills": [],
        "candidate_skills": candidate_skills,
        "relevant_projects": projects,
        "relevant_experience": experience,
        "role_match_score": 0,
        "matched_skills": matched,
        "skill_gaps": gaps,
        "source": "fallback",
    }


def plan_interview_topics(
    brief: dict[str, Any],
    candidate_profile: dict[str, Any],
) -> tuple[list[str], list[str], list[str]]:
    """
    Returns (role_topics, candidate_topics, available_topics).
    Role-specific requirements win over generic defaults.
    """
    role_topics = _dedupe_topics(
        list(brief.get("required_skills") or [])
        + list(brief.get("preferred_skills") or [])
    )

    extras: list[str] = []
    for gap in brief.get("skill_gaps") or []:
        extras.append(str(gap))
    if brief.get("relevant_projects"):
        extras.append("Project Discussion")
    if brief.get("relevant_experience"):
        extras.append("Experience Discussion")
    extras.extend(brief.get("related_skills") or [])
    extras.extend(candidate_profile.get("potential_interview_topics") or [])

    if not role_topics:
        role_topics = fallback_role_topics(str(brief.get("role") or ""))

    candidate_topics = []
    role_lower = {t.lower() for t in role_topics}
    for topic in _dedupe_topics(extras):
        if topic.lower() not in role_lower:
            candidate_topics.append(topic)

    available_topics = _dedupe_topics(role_topics + candidate_topics)
    return role_topics, candidate_topics, available_topics
