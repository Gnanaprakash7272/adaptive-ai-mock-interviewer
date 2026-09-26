import os
import json
import time
import random

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv(override=True)
from gemini_config import get_api_keys, get_model_chain


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

1. Stay aligned with the selected role. The question must assess the candidate's capability for this role.

2. Do not repeat previously asked questions.

3. Do not repeatedly use the same project. Rotate through different projects if multiple are available.

4. Use project context only when relevant to the current role/topic. Do not force project context if it does not fit the topic.

5. Prefer uncovered role topics when adaptive_action = new_topic.

6. Follow the adaptive action exactly.

7. Difficulty must be exactly one of: "easy", "medium", "hard".

8. question_type must be exactly one of: "technical", "project", "conceptual", "problem_solving".

9. expected_concepts must contain the main concepts expected in a strong answer.

10. Return ONLY one valid JSON object following the exact output schema.
"""


def build_question_prompt(
    candidate_profile: dict,
    role: str,
    topic: str,
    difficulty: str,
    interview_history: list,
    adaptive_action: str
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

    history_text = "No previous questions."
    if interview_history:
        history_lines = []
        for i, turn in enumerate(interview_history):
            q_topic = turn.get("question", {}).get("topic", "")
            q_diff = turn.get("question", {}).get("difficulty", "")
            q_text = turn.get("question", {}).get("question", "")
            ans_text = turn.get("answer", "")
            score = turn.get("evaluation", {}).get("score", 0)
            missing = ", ".join(turn.get("evaluation", {}).get("missing_concepts", []))
            
            history_lines.append(f"Turn {i+1}:")
            history_lines.append(f"  Topic: {q_topic} ({q_diff})")
            history_lines.append(f"  Q: {q_text}")
            history_lines.append(f"  A: {ans_text}")
            history_lines.append(f"  Score: {score}/10")
            if missing:
                history_lines.append(f"  Missing Concepts: {missing}")
        history_text = "\n".join(history_lines)

    action_instructions = {
        "follow_up": "ACTION: ask a follow-up based on the candidate's previous answer and missing concepts. Dig deeper into their previous response.",
        "easier": "ACTION: simplify the conceptual/technical difficulty. The candidate struggled with the previous question.",
        "harder": "ACTION: increase depth/complexity. The candidate did well on the previous question.",
        "new_topic": "ACTION: move to the new topic as requested."
    }
    action_text = action_instructions.get(adaptive_action, "")

    return f"""
Generate one personalized interview question.

CRITICAL INSTRUCTIONS:
- Stay aligned with the selected role.
- Do not repeat previously asked questions.
- Do not repeatedly use the same project.
- Use project context only when relevant to the current role/topic.
- Prefer uncovered role topics when adaptive_action = new_topic.
- Follow the adaptive action exactly.
{action_text}

SELECTED ROLE:
{role}

INTERVIEW TOPIC:
{topic}

TARGET DIFFICULTY:
{difficulty}

ADAPTIVE ACTION:
{adaptive_action if adaptive_action else "None"}

INTERVIEW HISTORY:
{history_text}

CANDIDATE PROFILE:
{profile_json}

OUTPUT SCHEMA:
{schema_json}

Return ONLY the JSON object.
"""


# _get_api_keys and _get_model_chain have been moved to gemini_config.py


def _is_quota_error(error_text: str) -> bool:
    return "429" in error_text or "RESOURCE_EXHAUSTED" in error_text


def _is_unavailable_error(error_text: str) -> bool:
    return "503" in error_text or "UNAVAILABLE" in error_text


def _is_auth_error(error_text: str) -> bool:
    return "401" in error_text


def _is_permission_error(error_text: str) -> bool:
    return "403" in error_text


def _is_not_found_error(error_text: str) -> bool:
    return "404" in error_text or "NOT_FOUND" in error_text


def _call_gemini(
    system_prompt: str,
    user_prompt: str
) -> str:

    api_key_entries = get_api_keys()
    if not api_key_entries:
        raise RuntimeError(
            "No Gemini API keys found. "
            "Set GEMINI_API_KEY in your .env file."
        )

    model_chain = get_model_chain()
    max_retries_503 = 3

    for model in model_chain:

        all_keys_quota_failed = True

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
                            max_output_tokens=1000,
                            response_mime_type="application/json"
                        )
                    )

                    print(
                        f"[Gemini] SUCCESS model={model} key={key_label}"
                    )
                    return response.text

                except Exception as exc:

                    error_text = str(exc)

                    if _is_not_found_error(error_text):
                        print(
                            f"[Gemini] NOT_FOUND ERROR (404) "
                            f"key={key_label} model={model}. "
                            f"Advancing to next model."
                        )
                        all_keys_quota_failed = False
                        break  # Break attempt loop, break key loop below

                    if _is_auth_error(error_text) or _is_permission_error(error_text):
                        raise RuntimeError(
                            f"[Gemini] AUTH/PERMISSION ERROR (401/403) "
                            f"key={key_label} model={model}. "
                            f"Check that the API key is valid and has the "
                            f"Generative Language API enabled. "
                            f"Detail: {error_text}"
                        )

                    if _is_quota_error(error_text):
                        keys_left = len(api_key_entries) - (
                            [k for k, _ in api_key_entries].index(key_label) + 1
                        )
                        print(
                            f"[Gemini] QUOTA_EXHAUSTED "
                            f"key={key_label} model={model} "
                            f"keys_remaining_for_model={keys_left}"
                        )
                        break

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
                            break

                    raise RuntimeError(
                        f"[Gemini] UNEXPECTED ERROR "
                        f"key={key_label} model={model}: {error_text}"
                    )

            else:
                pass

            if not all_keys_quota_failed:
                break

        else:
            pass

        if all_keys_quota_failed:
            print(
                f"[Gemini] All {len(api_key_entries)} key(s) quota-exhausted "
                f"for model={model}. Trying next model in fallback chain..."
            )

    raise RuntimeError(
        "[Gemini] All models and API keys have exhausted their daily quota or models are unavailable.\n"
        "Models tried: " + ", ".join(model_chain) + "\n"
        "Keys tried:   " + ", ".join(k for k, _ in api_key_entries) + "\n"
        "To fix: visit https://aistudio.google.com/app/apikey, create a key "
        "from a NEW Google account/project, and add it as GEMINI_API_KEY_2 "
        "(or _3, _4 …) in your .env file."
    )


def generate_question(
    candidate_profile: dict,
    role: str,
    topic: str,
    difficulty: str,
    interview_history: list = None,
    adaptive_action: str = ""
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
        difficulty,
        interview_history or [],
        adaptive_action or ""
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