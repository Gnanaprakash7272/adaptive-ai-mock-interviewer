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

load_dotenv(override=True)
import os
import json
from gemini_config import get_api_keys, get_model_chain



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
# 4. CALL GEMINI  —  key-rotation + model-fallback
# ============================================================

# _get_api_keys and _get_model_chain have been moved to gemini_config.py


# Error classification helpers
def _is_quota_error(error_text: str) -> bool:
    return "429" in error_text or "RESOURCE_EXHAUSTED" in error_text


def _is_unavailable_error(error_text: str) -> bool:
    return "503" in error_text or "UNAVAILABLE" in error_text


def _is_auth_error(error_text: str) -> bool:
    return "401" in error_text or "403" in error_text


def _call_gemini(
    system_prompt: str,
    user_prompt: str
) -> str:
    """
    Sends the prompt to Gemini with a two-dimensional fallback strategy.

    Fallback strategy
    -----------------
    Outer loop  → models  (GEMINI_MODEL → GEMINI_MODEL_FALLBACKS)
    Inner loop  → API keys (GEMINI_API_KEY → GEMINI_API_KEY_2 → …)

    Per cell (model × key):
      - 429 / RESOURCE_EXHAUSTED  → rotate to the next key for the same model.
        If all keys are exhausted for this model → advance to the next model.
      - 503 / UNAVAILABLE         → exponential-backoff retry on the same
        key/model; after max retries advance to the next model.
      - 401 / 403                 → hard failure, never treated as quota.
      - Other errors              → hard failure, never treated as quota.

    Only raises "all keys exhausted" after EVERY key returned a genuine
    quota-429 for EVERY model in the chain.
    """

    import time
    import random

    from google import genai
    from google.genai import types

    api_key_entries = get_api_keys()
    if not api_key_entries:
        raise RuntimeError(
            "No Gemini API keys found. "
            "Set GEMINI_API_KEY in your .env file."
        )

    model_chain = get_model_chain()
    max_retries_503 = 3

    for model in model_chain:

        all_keys_quota_failed = True  # assume worst; disprove below

        for key_label, api_key in api_key_entries:

            client = genai.Client(api_key=api_key)

            for attempt in range(1, max_retries_503 + 1):

                try:
                    print(
                        f"[Gemini] model={model} key={key_label} "
                        f"attempt={attempt}/{max_retries_503}"
                    )

                    response = client.models.generate_content(
                        model=model,
                        contents=user_prompt,
                        config=types.GenerateContentConfig(
                            system_instruction=system_prompt,
                            max_output_tokens=8192,
                            response_mime_type="application/json"
                        )
                    )

                    print(
                        f"[Gemini] SUCCESS model={model} key={key_label}"
                    )
                    return response.text

                except Exception as exc:

                    error_text = str(exc)

                    # ── Auth errors: hard stop, never rotate ──────────────
                    if _is_auth_error(error_text):
                        raise RuntimeError(
                            f"[Gemini] AUTH ERROR (401/403) "
                            f"key={key_label} model={model}. "
                            f"Check that the API key is valid and has the "
                            f"Generative Language API enabled. "
                            f"Detail: {error_text}"
                        )

                    # ── Quota exhausted: rotate to next key ───────────────
                    if _is_quota_error(error_text):
                        keys_left = len(api_key_entries) - (
                            [k for k, _ in api_key_entries].index(key_label) + 1
                        )
                        print(
                            f"[Gemini] QUOTA_EXHAUSTED "
                            f"key={key_label} model={model} "
                            f"keys_remaining_for_model={keys_left}"
                        )
                        # This key is truly quota-limited; break to next key
                        break

                    # ── Service unavailable: backoff, then next model ─────
                    if _is_unavailable_error(error_text):
                        if attempt < max_retries_503:
                            wait = (2 ** attempt) + random.uniform(0, 1)
                            print(
                                f"[Gemini] UNAVAILABLE "
                                f"key={key_label} model={model} "
                                f"retrying in {wait:.2f}s "
                                f"(attempt {attempt}/{max_retries_503})"
                            )
                            time.sleep(wait)
                            continue
                        else:
                            print(
                                f"[Gemini] UNAVAILABLE — max retries reached "
                                f"key={key_label} model={model}. "
                                f"Advancing to next model."
                            )
                            all_keys_quota_failed = False
                            break  # break attempt loop → break key loop below

                    else:
                        # ── Unknown/unexpected error ──────────────────────
                        raise RuntimeError(
                            f"[Gemini] UNEXPECTED ERROR "
                            f"key={key_label} model={model}: {error_text}"
                        )

            else:
                # attempt loop completed without break → unreachable normally
                pass

            # If 503 max-retries hit, stop trying more keys for this model
            if not all_keys_quota_failed:
                break

        else:
            # All keys finished their inner loop.
            # If every key was a quota-429, all_keys_quota_failed stays True.
            # Otherwise (e.g. 503 broke out) at least one non-quota outcome.
            pass

        if all_keys_quota_failed:
            print(
                f"[Gemini] All {len(api_key_entries)} key(s) quota-exhausted "
                f"for model={model}. Trying next model in fallback chain..."
            )
        # continue outer model loop

    # Every model × every key failed with quota-429
    raise RuntimeError(
        "[Gemini] All models and API keys have exhausted their daily quota.\n"
        "Models tried: " + ", ".join(model_chain) + "\n"
        "Keys tried:   " + ", ".join(k for k, _ in api_key_entries) + "\n"
        "To fix: visit https://aistudio.google.com/app/apikey, create a key "
        "from a NEW Google account/project, and add it as GEMINI_API_KEY_2 "
        "(or _3, _4 …) in your .env file."
    )

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