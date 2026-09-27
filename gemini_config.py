import json
import logging
import os
import random
import time
from typing import Any

from google import genai
from google.genai import types

logging.getLogger("google_genai").setLevel(logging.ERROR)
logger = logging.getLogger(__name__)


def get_api_keys() -> list[tuple[str, str]]:
    """
    Reads GEMINI_API_KEY, GEMINI_API_KEY_2, GEMINI_API_KEY_3, … from env.
    Returns a list of (label, key) tuples, e.g.:
        [("GEMINI_API_KEY", "AQ.xxx"), ("GEMINI_API_KEY_2", "AQ.yyy")]
    """
    entries = []
    primary = os.environ.get("GEMINI_API_KEY", "").strip()
    if primary:
        entries.append(("GEMINI_API_KEY", primary))
    i = 2
    while True:
        key = os.environ.get(f"GEMINI_API_KEY_{i}", "").strip()
        if not key:
            break
        entries.append((f"GEMINI_API_KEY_{i}", key))
        i += 1
    return entries


def get_model_chain() -> list[str]:
    """
    Reads the primary model and ordered fallback list from env.
    Primary default: gemini-3.5-flash-lite
    Fallback default: gemini-3.5-flash
    """
    primary = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash-lite").strip()
    fallback_str = os.environ.get("GEMINI_MODEL_FALLBACKS", "gemini-3.5-flash").strip()

    fallbacks = [m.strip() for m in fallback_str.split(",") if m.strip()]
    return [primary] + fallbacks


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


def strip_json_fences(raw: str) -> str:
    text = (raw or "").strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    return text


def call_gemini(
    system_prompt: str,
    user_prompt: str,
    *,
    max_output_tokens: int = 1200,
) -> str:
    """
    Shared Gemini text call with key/model fallback and 503 retries.
    Returns raw response text. Does not parse JSON.
    """
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
                    logger.info(
                        "Gemini request model=%s key=%s attempt=%s/%s",
                        model, key_label, attempt, max_retries_503,
                    )
                    response = client.models.generate_content(
                        model=model,
                        contents=user_prompt,
                        config=types.GenerateContentConfig(
                            system_instruction=system_prompt,
                            max_output_tokens=max_output_tokens,
                            response_mime_type="application/json",
                        ),
                    )
                    logger.info("Gemini success model=%s key=%s", model, key_label)
                    return response.text

                except Exception as exc:
                    error_text = str(exc)

                    if _is_not_found_error(error_text):
                        logger.warning(
                            "Gemini NOT_FOUND key=%s model=%s — next model",
                            key_label, model,
                        )
                        all_keys_quota_failed = False
                        break

                    if _is_auth_error(error_text) or _is_permission_error(error_text):
                        raise RuntimeError(
                            f"[Gemini] AUTH/PERMISSION ERROR (401/403) "
                            f"key={key_label} model={model}. "
                            f"Detail: {error_text}"
                        )

                    if _is_quota_error(error_text):
                        logger.warning(
                            "Gemini quota exhausted key=%s model=%s",
                            key_label, model,
                        )
                        break

                    if _is_unavailable_error(error_text):
                        if attempt < max_retries_503:
                            wait = (2 ** attempt) + random.uniform(0, 1)
                            logger.warning(
                                "Gemini unavailable key=%s model=%s retry in %.2fs",
                                key_label, model, wait,
                            )
                            time.sleep(wait)
                            continue
                        logger.warning(
                            "Gemini unavailable max retries key=%s model=%s",
                            key_label, model,
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
            logger.warning(
                "All %s key(s) quota-exhausted for model=%s",
                len(api_key_entries), model,
            )

    raise RuntimeError(
        "[Gemini] All models and API keys have exhausted their daily quota or models are unavailable.\n"
        "Models tried: " + ", ".join(model_chain) + "\n"
        "Keys tried:   " + ", ".join(k for k, _ in api_key_entries)
    )


def call_gemini_json(
    system_prompt: str,
    user_prompt: str,
    *,
    max_output_tokens: int = 1200,
    parse_attempts: int = 2,
) -> dict[str, Any]:
    """Call Gemini and parse a JSON object. Retries parse_attempts times."""
    last_error: Exception | None = None
    raw_response = ""
    for attempt in range(1, parse_attempts + 1):
        raw_response = call_gemini(
            system_prompt,
            user_prompt,
            max_output_tokens=max_output_tokens,
        )
        try:
            parsed = json.loads(strip_json_fences(raw_response))
        except json.JSONDecodeError as exc:
            last_error = exc
            logger.warning("Gemini JSON parse failed attempt=%s: %s", attempt, exc)
            continue
        if not isinstance(parsed, dict):
            last_error = RuntimeError("Gemini JSON was not an object")
            continue
        return parsed

    raise RuntimeError(
        "Gemini returned invalid JSON.\n"
        f"Raw response:\n{raw_response}"
    ) from last_error
