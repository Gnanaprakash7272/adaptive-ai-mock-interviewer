import json

from ai_schemas import NarrativeOutput, ValidationError, parse_model
from gemini_config import call_gemini_json

REPORT_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "strengths": {
            "type": "array",
            "items": {"type": "string"}
        },
        "weaknesses": {
            "type": "array",
            "items": {"type": "string"}
        },
        "recommendations": {
            "type": "array",
            "items": {"type": "string"}
        }
    },
    "required": [
        "summary",
        "strengths",
        "weaknesses",
        "recommendations"
    ]
}

SYSTEM_PROMPT = f"""
You are an expert technical interviewer and hiring manager.
Your task is to review the complete transcript of an AI-led technical interview and generate a final evaluation report.

Return a JSON object that perfectly matches the following schema:
{json.dumps(REPORT_SCHEMA, indent=2)}

Rules:
1. Distinguish resume/profile strengths from skills demonstrated in the interview answers.
2. Do not claim the candidate knows something merely because it appeared on the resume.
3. Keep feedback constructive and actionable.
4. List explicit strengths, weaknesses, and recommendations based on interview answers.
"""


def generate_narrative(
    role: str,
    overall_score: float,
    topics_covered: list,
    history: list,
    interview_brief: dict = None,
    profile_strengths: list = None,
    interview_demonstrated_strengths: list = None,
    interview_knowledge_gaps: list = None,
) -> dict:
    compact_history = []
    for turn in history or []:
        compact_history.append({
            "turn": turn.get("turn"),
            "topic": (turn.get("question") or {}).get("topic"),
            "question": (turn.get("question") or {}).get("question"),
            "answer": turn.get("answer"),
            "score": (turn.get("evaluation") or {}).get("score"),
            "missing_concepts": (turn.get("evaluation") or {}).get("missing_concepts", []),
            "feedback": (turn.get("evaluation") or {}).get("feedback", ""),
            "next_action": (turn.get("adaptive_decision") or {}).get("next_action"),
        })

    user_prompt = (
        f"Role: {role}\n"
        f"Calculated Overall Score: {overall_score}\n"
        f"Topics sufficiently covered in interview: {', '.join(topics_covered or [])}\n"
        f"Resume/profile strengths (not automatically demonstrated): "
        f"{json.dumps(profile_strengths or [])}\n"
        f"Interview-demonstrated strengths: "
        f"{json.dumps(interview_demonstrated_strengths or [])}\n"
        f"Interview knowledge gaps: "
        f"{json.dumps(interview_knowledge_gaps or [])}\n"
        f"Interview History:\n{json.dumps(compact_history, indent=2)}\n"
    )
    if interview_brief:
        user_prompt += (
            "\nSanitized brief (skills/projects only):\n"
            + json.dumps(
                {
                    "matched_skills": interview_brief.get("matched_skills", []),
                    "skill_gaps": interview_brief.get("skill_gaps", []),
                    "required_skills": interview_brief.get("required_skills", []),
                },
                indent=2,
            )
        )

    payload = call_gemini_json(SYSTEM_PROMPT, user_prompt, max_output_tokens=3000)
    try:
        return parse_model(NarrativeOutput, payload)
    except ValidationError:
        payload = call_gemini_json(
            SYSTEM_PROMPT,
            user_prompt + "\nRETRY: Return valid JSON matching the schema.",
            max_output_tokens=3000,
        )
        return parse_model(NarrativeOutput, payload)
