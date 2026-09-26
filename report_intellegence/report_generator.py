import os
import time
import random
import json
from google import genai
from google.genai import types
from gemini_config import get_api_keys, get_model_chain

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
1. The summary should synthesize the overall impression of the candidate based on the calculated overall score and transcript.
2. Keep feedback constructive and actionable.
3. List explicit strengths, weaknesses, and recommendations.
"""

def _call_gemini(system_prompt: str, user_prompt: str) -> str:
    api_key_entries = get_api_keys()

    if not api_key_entries:
        raise RuntimeError("No Gemini API keys found. Set GEMINI_API_KEY in your .env file.")

    model_chain = get_model_chain()
    max_retries_503 = 3

    for model in model_chain:
        for key_label, api_key in api_key_entries:
            client = genai.Client(api_key=api_key)
            skip_key = False
            skip_model = False

            for attempt in range(1, max_retries_503 + 1):
                try:
                    print(f"[Gemini] model={model} key={key_label} attempt={attempt}/{max_retries_503}")
                    response = client.models.generate_content(
                        model=model,
                        contents=user_prompt,
                        config=types.GenerateContentConfig(
                            system_instruction=system_prompt,
                            max_output_tokens=3000,
                            response_mime_type="application/json"
                        )
                    )
                    print(f"[Gemini] SUCCESS model={model} key={key_label}")
                    return response.text
                except Exception as exc:
                    error_text = str(exc)
                    if "404" in error_text or "NOT_FOUND" in error_text:
                        print(f"[Gemini] NOT_FOUND ERROR (404) key={key_label} model={model}. Advancing to next model.")
                        skip_model = True
                        break
                    if "401" in error_text or "403" in error_text:
                        raise RuntimeError(f"[Gemini] AUTH ERROR (401/403) key={key_label} model={model}. Detail: {error_text}")
                    if "429" in error_text or "RESOURCE_EXHAUSTED" in error_text:
                        print(f"[Gemini] QUOTA_EXHAUSTED key={key_label} model={model}.")
                        skip_key = True
                        break
                    if "503" in error_text or "UNAVAILABLE" in error_text:
                        if attempt < max_retries_503:
                            wait = (2 ** attempt) + random.uniform(0, 1)
                            print(f"[Gemini] UNAVAILABLE key={key_label} model={model} retrying in {wait:.2f}s (attempt {attempt}/{max_retries_503})")
                            time.sleep(wait)
                            continue
                        else:
                            print(f"[Gemini] UNAVAILABLE — max retries reached key={key_label} model={model}. Advancing to next model.")
                            skip_model = True
                            break
                    raise  # Re-raise other errors
            if skip_model:
                break
        if skip_model:
            continue
    raise RuntimeError("Gemini daily quota exhausted or models unavailable. Please try again later.")

def generate_narrative(role: str, overall_score: float, topics_covered: list, history: list) -> dict:
    history_str = json.dumps(history, indent=2)
    user_prompt = f"Role: {role}\nCalculated Overall Score: {overall_score}\nTopics Covered: {', '.join(topics_covered)}\nInterview History:\n{history_str}"
    
    raw_response = _call_gemini(SYSTEM_PROMPT, user_prompt)
    
    try:
        return json.loads(raw_response)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Failed to parse report generator output as JSON: {raw_response}") from exc