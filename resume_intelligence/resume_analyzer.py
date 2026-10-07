"""
resume_analyzer.py

Purpose:
    Clean Resume Text
        ↓
    Gemini LLM (via gemini_config.call_gemini_json)
        ↓
    Structured Candidate Profile (dict)

This file ONLY handles:
    1. Building the prompt
    2. Sending cleaned resume text to Gemini
    3. Validating and cleaning the JSON
"""
import json
import logging
import os

from gemini_config import call_gemini_json

logger = logging.getLogger(__name__)


# ============================================================
# 1. CANDIDATE PROFILE SCHEMA
# ============================================================

CANDIDATE_PROFILE_SCHEMA = {
    "candidate": {
        "name": "",
        "email": "",
        "phone": "",
        "location": ""
    },

    "education": [
        {
            "degree": "",
            "field": "",
            "institution": "",
            "start_year": "",
            "end_year": "",
            "cgpa": "",
            "details": ""
        }
    ],

    "skills": {
        "programming_languages": [],
        "frameworks": [],
        "libraries": [],
        "databases": [],
        "ai_ml": [],
        "cloud_devops": [],
        "tools": [],
        "other": []
    },

    "projects": [
        {
            "name": "",
            "description": "",
            "technologies": [],
            "domain": "",
            "role": "",
            "duration": "",
            "key_contributions": []
        }
    ],

    "experience": [
        {
            "company": "",
            "role": "",
            "location": "",
            "start_date": "",
            "end_date": "",
            "responsibilities": [],
            "technologies": []
        }
    ],

    "certifications": [
        {
            "name": "",
            "issuer": "",
            "year": ""
        }
    ],

    "achievements": [],

    "publications": [],

    "competitive_programming": {
        "platforms": [],
        "problems_solved": "",
        "ratings": ""
    },

    "languages": [],

    "interests": [],

    "expertise_areas": [],

    "potential_interview_topics": []
}


# ============================================================
# 2. SYSTEM PROMPT
# ============================================================

SYSTEM_PROMPT = """
You are an expert resume parser and technical recruiter assistant.

Your ONLY job is to read a candidate's resume text and convert it
into a structured JSON candidate profile.

You must be precise, conservative, and strictly evidence-based.

STRICT RULES:

1. ONLY use information explicitly present in the resume text.

2. NEVER invent, assume, or infer information that is not written
   in the resume.

3. NEVER add a technology or skill to a project unless that
   project's own description explicitly mentions it.

4. Do not copy skills from the general Skills section into
   unrelated projects.

5. If information is missing:
   - use "" for string fields
   - use [] for array fields

6. Remove duplicate skills and duplicate projects.

7. "expertise_areas" must contain concise labels such as:
   "Python Backend Development"
   "Machine Learning"
   "Generative AI"

   These must be directly supported by the resume.

8. "potential_interview_topics" must contain ONLY technical
   topics clearly supported by the candidate's actual:
   - skills
   - projects
   - experience
   - education
   - certifications

9. Do NOT generate interview questions.
   Only generate topic names.

10. Output MUST be a single valid JSON object.

11. The JSON must follow the exact schema provided.

12. Do NOT add extra keys.

13. Do NOT wrap JSON inside Markdown code fences.

14. Do NOT provide explanations outside the JSON object.
"""


# ============================================================
# 3. BUILD USER PROMPT
# ============================================================

def build_user_prompt(cleaned_text: str) -> str:
    """
    Creates the user prompt containing:
        - schema
        - cleaned resume text
    """
    schema_json = json.dumps(CANDIDATE_PROFILE_SCHEMA, indent=2)

    return f"""
Extract a structured candidate profile from the resume text below.

Return a single JSON object that follows EXACTLY this schema.

Rules:
- Same keys
- Same nesting
- Same data types
- No extra keys
- Use real information from the resume
- Use "" when information is missing
- Use [] when a list is missing

SCHEMA:

{schema_json}


RESUME TEXT:

\"\"\"
{cleaned_text}
\"\"\"

Return ONLY the JSON object.
"""


# ============================================================
# 4. TYPE VALIDATION HELPERS
# ============================================================

def _ensure_type(value, default):
    """Makes sure the LLM returned the expected data type."""
    if isinstance(default, list):
        return value if isinstance(value, list) else []
    if isinstance(default, dict):
        return value if isinstance(value, dict) else {}
    if isinstance(default, str):
        return value if isinstance(value, str) else ""
    return value if value is not None else default


def _merge_with_schema(data: dict, schema: dict) -> dict:
    """Ensures that the final profile contains every expected field from the schema."""
    result = {}
    for key, default_value in schema.items():
        if key not in data:
            result[key] = default_value
            continue
        value = data[key]
        if isinstance(default_value, dict):
            value = _ensure_type(value, default_value)
            result[key] = _merge_with_schema(value, default_value)
        else:
            result[key] = _ensure_type(value, default_value)
    return result


def _dedupe_list(items):
    """Removes duplicate strings while preserving order."""
    if not isinstance(items, list):
        return items
    seen = set()
    deduped = []
    for item in items:
        if isinstance(item, str):
            key = item.strip().lower()
            if key and key not in seen:
                seen.add(key)
                deduped.append(item)
        else:
            deduped.append(item)
    return deduped


def _clean_profile(profile: dict) -> dict:
    """Final cleanup: deduplicate skills, projects, and simple lists."""
    # Clean skills
    skills = profile.get("skills", {})
    for skill_key, skill_list in skills.items():
        skills[skill_key] = _dedupe_list(skill_list)

    # Clean projects (dedupe by name)
    seen_project_names: set = set()
    unique_projects = []
    for project in profile.get("projects", []):
        name_key = str(project.get("name", "")).strip().lower()
        if name_key and name_key in seen_project_names:
            continue
        if name_key:
            seen_project_names.add(name_key)
        unique_projects.append(project)
    profile["projects"] = unique_projects

    # Clean simple lists
    for key in ("achievements", "publications", "languages", "interests",
                "expertise_areas", "potential_interview_topics"):
        profile[key] = _dedupe_list(profile.get(key, []))

    return profile


# ============================================================
# 5. MAIN FUNCTION
# ============================================================

def analyze_resume(cleaned_text: str) -> dict:
    """
    Main function used by the application.

    Input:
        cleaned resume text

    Output:
        structured candidate profile as Python dictionary

    Raises:
        ValueError: if input is empty or Gemini returns invalid JSON
        RuntimeError: if all Gemini API keys/models are exhausted
    """
    if not cleaned_text or not cleaned_text.strip():
        raise ValueError("cleaned_text is empty. Nothing to analyze.")

    user_prompt = build_user_prompt(cleaned_text)

    logger.info("Sending resume to Gemini for analysis (text_length=%d)", len(cleaned_text))

    # call_gemini_json handles key rotation, model fallback, 503 retries, and JSON parsing.
    parsed = call_gemini_json(
        SYSTEM_PROMPT,
        user_prompt,
        max_output_tokens=8192,
        temperature=0.2,  # low temperature for structured extraction
    )

    if not isinstance(parsed, dict):
        raise ValueError(
            "Gemini response was valid JSON but not a JSON object."
        )

    logger.info("Resume analysis succeeded; merging with schema")

    profile = _merge_with_schema(parsed, CANDIDATE_PROFILE_SCHEMA)
    profile = _clean_profile(profile)

    return profile