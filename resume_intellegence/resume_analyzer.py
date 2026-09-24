"""
resume_analyzer.py

Purpose:
    Clean Resume Text
        ↓
    Gemini LLM
        ↓
    Structured Candidate Profile (dict)

This file ONLY handles:
    1. Building the prompt
    2. Sending cleaned resume text to Gemini
    3. Receiving JSON
    4. Validating and cleaning the JSON
"""
from dotenv import load_dotenv

load_dotenv()
import os
import json


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

    schema_json = json.dumps(
        CANDIDATE_PROFILE_SCHEMA,
        indent=2
    )

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
# 4. CALL GEMINI
# ============================================================

def _call_gemini(
    system_prompt: str,
    user_prompt: str
) -> str:
    """
    Sends the resume prompt to Gemini
    and returns the raw JSON response.
    """

    import time

    from google import genai
    from google.genai import types

    api_key = os.environ.get("GEMINI_API_KEY")

    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY environment variable is not set."
        )

    model = os.environ.get(
        "GEMINI_MODEL",
        "gemini-3.6-flash"
    )

    client = genai.Client(
        api_key=api_key
    )

    max_attempts = 4

    for attempt in range(1, max_attempts + 1):

        try:
            print(
                f"Gemini request: "
                f"attempt {attempt}/{max_attempts}"
            )

            response = client.models.generate_content(
                model=model,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    max_output_tokens=4000,
                    response_mime_type="application/json"
                )
            )

            return response.text

        except Exception as exc:

            error_text = str(exc)

            temporary_error = (
                "503" in error_text
                or "UNAVAILABLE" in error_text
                or "429" in error_text
                or "RESOURCE_EXHAUSTED" in error_text
            )

            if not temporary_error:
                raise

            if attempt == max_attempts:
                raise RuntimeError(
                    "Gemini is temporarily unavailable "
                    f"after {max_attempts} attempts.\n"
                    f"Original error: {exc}"
                ) from exc

            wait_seconds = 2 ** attempt

            print(
                "Gemini temporarily unavailable."
            )

            print(
                f"Retrying in {wait_seconds} seconds..."
            )

            time.sleep(wait_seconds)

# ============================================================
# 5. REMOVE MARKDOWN CODE FENCES
# ============================================================

def _strip_code_fences(text: str) -> str:
    """
    Sometimes an LLM may return:

    ```json
    {...}
    ```

    This function removes those code fences.
    """

    cleaned = text.strip()

    if cleaned.startswith("```"):

        cleaned = cleaned.strip("`")

        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:]

    return cleaned.strip()


# ============================================================
# 6. TYPE VALIDATION
# ============================================================

def _ensure_type(value, default):
    """
    Makes sure the LLM returned the expected data type.
    """

    # Expected list
    if isinstance(default, list):

        if isinstance(value, list):
            return value

        return []

    # Expected dictionary
    if isinstance(default, dict):

        if isinstance(value, dict):
            return value

        return {}

    # Expected string
    if isinstance(default, str):

        if isinstance(value, str):
            return value

        return ""

    return value if value is not None else default


# ============================================================
# 7. MERGE LLM RESPONSE WITH SCHEMA
# ============================================================

def _merge_with_schema(
    data: dict,
    schema: dict
) -> dict:
    """
    Ensures that the final profile contains
    every expected field from the schema.
    """

    result = {}

    for key, default_value in schema.items():

        # Field missing from LLM response
        if key not in data:

            result[key] = default_value
            continue

        value = data[key]

        # Nested dictionary
        if isinstance(default_value, dict):

            value = _ensure_type(
                value,
                default_value
            )

            result[key] = _merge_with_schema(
                value,
                default_value
            )

        # List
        elif isinstance(default_value, list):

            result[key] = _ensure_type(
                value,
                default_value
            )

        # String
        else:

            result[key] = _ensure_type(
                value,
                default_value
            )

    return result


# ============================================================
# 8. REMOVE DUPLICATE ITEMS
# ============================================================

def _dedupe_list(items):
    """
    Removes duplicate strings while preserving order.
    """

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


# ============================================================
# 9. CLEAN FINAL PROFILE
# ============================================================

def _clean_profile(profile: dict) -> dict:
    """
    Final cleanup:
        - duplicate skills
        - duplicate projects
        - duplicate simple lists
    """

    # --------------------------------------------------------
    # Clean skills
    # --------------------------------------------------------

    skills = profile.get(
        "skills",
        {}
    )

    for skill_key, skill_list in skills.items():

        skills[skill_key] = _dedupe_list(
            skill_list
        )

    # --------------------------------------------------------
    # Clean projects
    # --------------------------------------------------------

    seen_project_names = set()

    unique_projects = []

    for project in profile.get(
        "projects",
        []
    ):

        name_key = str(
            project.get("name", "")
        ).strip().lower()

        if name_key and name_key in seen_project_names:
            continue

        if name_key:
            seen_project_names.add(
                name_key
            )

        unique_projects.append(project)

    profile["projects"] = unique_projects

    # --------------------------------------------------------
    # Clean simple lists
    # --------------------------------------------------------

    simple_lists = [
        "achievements",
        "publications",
        "languages",
        "interests",
        "expertise_areas",
        "potential_interview_topics"
    ]

    for key in simple_lists:

        profile[key] = _dedupe_list(
            profile.get(key, [])
        )

    return profile


# ============================================================
# 10. MAIN FUNCTION
# ============================================================

def analyze_resume(cleaned_text: str) -> dict:
    """
    Main function used by the application.

    Input:
        cleaned resume text

    Output:
        structured candidate profile as Python dictionary
    """

    # --------------------------------------------------------
    # Validate input
    # --------------------------------------------------------

    if not cleaned_text or not cleaned_text.strip():

        raise ValueError(
            "cleaned_text is empty. Nothing to analyze."
        )

    # --------------------------------------------------------
    # Build prompt
    # --------------------------------------------------------

    user_prompt = build_user_prompt(
        cleaned_text
    )

    # --------------------------------------------------------
    # Call Gemini
    # --------------------------------------------------------

    try:

        raw_response = _call_gemini(
            SYSTEM_PROMPT,
            user_prompt
        )

    except RuntimeError:

        raise

    except Exception as exc:

        raise RuntimeError(
            f"Gemini API call failed: {exc}"
        ) from exc

    # --------------------------------------------------------
    # Check response
    # --------------------------------------------------------

    if not raw_response or not raw_response.strip():

        raise ValueError(
            "Gemini returned an empty response."
        )

    # --------------------------------------------------------
    # Clean response
    # --------------------------------------------------------

    cleaned_json_text = _strip_code_fences(
        raw_response
    )

    # --------------------------------------------------------
    # Convert JSON → Python dictionary
    # --------------------------------------------------------

    try:

        parsed = json.loads(
            cleaned_json_text
        )

    except json.JSONDecodeError as exc:

        raise ValueError(
            f"Failed to parse Gemini response as JSON.\n"
            f"Error: {exc}\n\n"
            f"Raw response:\n{raw_response}"
        ) from exc

    # --------------------------------------------------------
    # Make sure response is a dictionary
    # --------------------------------------------------------

    if not isinstance(parsed, dict):

        raise ValueError(
            "Gemini response was valid JSON "
            "but not a JSON object."
        )

    # --------------------------------------------------------
    # Fill missing fields
    # --------------------------------------------------------

    profile = _merge_with_schema(
        parsed,
        CANDIDATE_PROFILE_SCHEMA
    )

    # --------------------------------------------------------
    # Final cleanup
    # --------------------------------------------------------

    profile = _clean_profile(
        profile
    )

    return profile