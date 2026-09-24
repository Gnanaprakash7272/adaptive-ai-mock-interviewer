import os
import json
import time

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()


EVALUATION_SCHEMA = {
    "score": 0,
    "correctness": 0,
    "completeness": 0,
    "technical_depth": 0,
    "missing_concepts": [],
    "confidence": 0.0,
    "needs_followup": False,
    "feedback": ""
}


SYSTEM_PROMPT = """
You are an expert technical interview evaluator.

Your task is to evaluate a candidate's answer to an interview question.

You will receive:
1. The interview question
2. Expected concepts
3. Candidate's answer

Evaluate ONLY the answer provided.

STRICT RULES:

1. Do not invent information about the candidate.
2. Judge correctness based on the question and expected concepts.
3. score, correctness, completeness, and technical_depth
   must be integers from 0 to 10.
4. confidence must be a number between 0 and 1.
5. missing_concepts must contain concepts the candidate failed
   to explain or explained incorrectly.
6. needs_followup must be true when the answer lacks enough
   depth or contains important missing concepts.
7. feedback must clearly explain what was done well and what
   should be improved.
8. Return ONLY valid JSON.
9. Follow the exact output schema.
"""


def build_evaluation_prompt(
    question: str,
    expected_concepts: list,
    candidate_answer: str
) -> str:

    expected_json = json.dumps(
        expected_concepts,
        indent=2,
        ensure_ascii=False
    )

    schema_json = json.dumps(
        EVALUATION_SCHEMA,
        indent=2
    )

    return f"""
Evaluate the following interview answer.

INTERVIEW QUESTION:
{question}

EXPECTED CONCEPTS:
{expected_json}

CANDIDATE ANSWER:
{candidate_answer}

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
                f"Answer Evaluator: "
                f"attempt {attempt}/{max_attempts}"
            )

            response = client.models.generate_content(
                model=model,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    max_output_tokens=1200,
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


def evaluate_answer(
    question: str,
    expected_concepts: list,
    candidate_answer: str
) -> dict:

    if not question or not question.strip():
        raise ValueError(
            "Question is required."
        )

    if not candidate_answer or not candidate_answer.strip():
        raise ValueError(
            "Candidate answer is required."
        )

    if not isinstance(expected_concepts, list):
        raise ValueError(
            "expected_concepts must be a list."
        )

    user_prompt = build_evaluation_prompt(
        question,
        expected_concepts,
        candidate_answer
    )

    raw_response = _call_gemini(
        SYSTEM_PROMPT,
        user_prompt
    )

    try:
        evaluation = json.loads(
            raw_response
        )

    except json.JSONDecodeError as exc:
        raise RuntimeError(
            "Gemini returned invalid JSON.\n"
            f"Raw response:\n{raw_response}"
        ) from exc

    return evaluation