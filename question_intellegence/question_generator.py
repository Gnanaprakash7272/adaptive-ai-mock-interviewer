import os
import json
import time

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()


QUESTION_SCHEMA = {
    "question": "",
    "topic": "",
    "difficulty": "",
    "question_type": "",
    "expected_concepts": []
}


SYSTEM_PROMPT = """
You are an AI technical interviewer.

Your task is to generate ONE personalized interview question.

You will receive:
1. The candidate's structured profile
2. The selected job role
3. The interview topic
4. The target difficulty

You must combine all of these to create a relevant interview question.

STRICT RULES:

1. Use only skills, projects, experience, education, and technologies
   present in the candidate profile.

2. The question must be relevant to the selected role.

3. The question must focus on the provided interview topic.

4. The question must match the provided target difficulty.

5. Do not invent candidate experience.

6. Do not ask generic questions when a candidate-specific question
   can be created.

7. Difficulty must be exactly one of:
   "easy", "medium", "hard"

8. question_type must be exactly one of:
   "technical", "project", "conceptual", "problem_solving"

9. expected_concepts must contain the main concepts expected
   in a strong answer.

10. Return ONLY one valid JSON object.

11. Follow the exact output schema.
"""


def build_question_prompt(
    candidate_profile: dict,
    role: str,
    topic: str,
    difficulty: str
) -> str:

    profile_json = json.dumps(
        candidate_profile,
        indent=2,
        ensure_ascii=False
    )

    schema_json = json.dumps(
        QUESTION_SCHEMA,
        indent=2
    )

    return f"""
Generate one personalized interview question.

SELECTED ROLE:
{role}

INTERVIEW TOPIC:
{topic}

TARGET DIFFICULTY:
{difficulty}

CANDIDATE PROFILE:
{profile_json}

OUTPUT SCHEMA:
{schema_json}

Return ONLY the JSON object.
"""


def _call_gemini(
    system_prompt: str,
    user_prompt: str
) -> str:

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
                f"Question Generator: "
                f"attempt {attempt}/{max_attempts}"
            )

            response = client.models.generate_content(
                model=model,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    max_output_tokens=1000,
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
                    f"Gemini unavailable after "
                    f"{max_attempts} attempts.\n"
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


def generate_question(
    candidate_profile: dict,
    role: str,
    topic: str,
    difficulty: str
) -> dict:

    if not candidate_profile:
        raise ValueError(
            "Candidate profile is empty."
        )

    if not role or not role.strip():
        raise ValueError(
            "Selected role is required."
        )

    if not topic or not topic.strip():
        raise ValueError(
            "Interview topic is required."
        )

    if difficulty not in ["easy", "medium", "hard"]:
        raise ValueError(
            "Difficulty must be easy, medium, or hard."
        )

    user_prompt = build_question_prompt(
        candidate_profile,
        role,
        topic,
        difficulty
    )

    raw_response = _call_gemini(
        SYSTEM_PROMPT,
        user_prompt
    )

    try:
        question_data = json.loads(
            raw_response
        )

    except json.JSONDecodeError as exc:
        raise RuntimeError(
            "Gemini returned invalid JSON.\n"
            f"Raw response:\n{raw_response}"
        ) from exc

    return question_data