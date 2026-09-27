from dotenv import load_dotenv

load_dotenv(override=True)

import json

from ai_schemas import EvaluationOutput, ValidationError, parse_model
from gemini_config import call_gemini_json

EVALUATION_SCHEMA = {
    "score": 0,
    "correctness": 0,
    "completeness": 0,
    "technical_depth": 0,
    "missing_concepts": [],
    "confidence": 0.0,
    "needs_followup": False,
    "feedback": "",
}

SYSTEM_PROMPT = """
You are an expert technical interview evaluator.

Your task is to evaluate a candidate's answer to an interview question.

Evaluate ONLY the answer provided. Do not invent resume facts.

Calibrate expectations to the given role and difficulty.
Use recent turns only to detect contradiction or missing follow-through.

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
   should be improved. Do not mention numeric scores or hidden rubrics.
8. Return ONLY valid JSON.
9. Follow the exact output schema.
"""


def build_evaluation_prompt(
    question: str,
    expected_concepts: list,
    candidate_answer: str,
    role: str = "",
    difficulty: str = "medium",
    recent_turns: list = None,
    interview_brief: dict = None,
) -> str:
    expected_json = json.dumps(expected_concepts, indent=2, ensure_ascii=False)
    schema_json = json.dumps(EVALUATION_SCHEMA, indent=2)

    recent = []
    for turn in (recent_turns or [])[-2:]:
        recent.append({
            "question": (turn.get("question") or {}).get("question", ""),
            "answer": turn.get("answer", ""),
            "score": (turn.get("evaluation") or {}).get("score"),
            "missing_concepts": (turn.get("evaluation") or {}).get("missing_concepts", []),
        })

    brief_context = {}
    if interview_brief:
        brief_context = {
            "matched_skills": interview_brief.get("matched_skills", []),
            "skill_gaps": interview_brief.get("skill_gaps", []),
            "required_skills": interview_brief.get("required_skills", []),
        }

    return f"""
Evaluate the following interview answer.

ROLE:
{role or "n/a"}

DIFFICULTY:
{difficulty}

INTERVIEW QUESTION:
{question}

EXPECTED CONCEPTS:
{expected_json}

CANDIDATE ANSWER:
{candidate_answer}

PREVIOUS 1-2 TURNS:
{json.dumps(recent, indent=2, ensure_ascii=False) if recent else "None"}

CANDIDATE PROFILE CONTEXT (skills only, not evidence of this answer):
{json.dumps(brief_context, indent=2, ensure_ascii=False)}

OUTPUT SCHEMA:
{schema_json}

Return ONLY the JSON object.
"""


def _validate_evaluation(payload: dict) -> dict:
    return parse_model(EvaluationOutput, payload)


def evaluate_answer(
    question: str,
    expected_concepts: list,
    candidate_answer: str,
    role: str = "",
    difficulty: str = "medium",
    recent_turns: list = None,
    interview_brief: dict = None,
) -> dict:
    if not question or not question.strip():
        raise ValueError("Question is required.")

    if not candidate_answer or not candidate_answer.strip():
        raise ValueError("Candidate answer is required.")

    if not isinstance(expected_concepts, list):
        raise ValueError("expected_concepts must be a list.")

    user_prompt = build_evaluation_prompt(
        question,
        expected_concepts,
        candidate_answer,
        role=role,
        difficulty=difficulty,
        recent_turns=recent_turns,
        interview_brief=interview_brief,
    )

    last_error: Exception | None = None
    for _ in range(2):
        payload = call_gemini_json(SYSTEM_PROMPT, user_prompt, max_output_tokens=1200)
        try:
            return _validate_evaluation(payload)
        except ValidationError as exc:
            last_error = exc
            user_prompt = user_prompt + (
                "\n\nRETRY: Previous JSON failed validation. "
                "Scores must be integers 0-10. confidence must be 0.0-1.0. "
                "needs_followup must be a boolean."
            )

    raise RuntimeError(
        "Gemini returned an evaluation that failed validation."
    ) from last_error
