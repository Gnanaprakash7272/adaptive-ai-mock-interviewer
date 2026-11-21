import json
import logging
import os
import random
import re
import time
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

# Ensure root .env is loaded into environment
_root_env = Path(__file__).resolve().parent.parent / ".env"
if _root_env.exists():
    load_dotenv(dotenv_path=_root_env, override=False)
else:
    load_dotenv(override=False)

import requests
from google import genai
from google.genai import types

# ---------------------------------------------------------------------------
# Structured error types — available in google-genai >= 0.7.
# Fall back gracefully if the import path changes between SDK versions.
# ---------------------------------------------------------------------------
try:
    from google.genai import errors as _genai_errors  # type: ignore[attr-defined]
    _ClientError = _genai_errors.ClientError  # type: ignore[attr-defined]
except (ImportError, AttributeError):
    _ClientError = None  # String-matching fallback will be used instead.

logging.getLogger("google_genai").setLevel(logging.ERROR)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Per-key client cache — avoids reconstructing genai.Client on every call.
# Keys never change at runtime so a plain module-level dict is safe.
# ---------------------------------------------------------------------------
_client_cache: dict[str, genai.Client] = {}

# Request timeout in seconds (configurable via env; 0 = no timeout).
_TIMEOUT_SECONDS: float = float(os.environ.get("GEMINI_REQUEST_TIMEOUT_SECONDS", "60"))
_GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"


def _get_client(api_key: str) -> genai.Client:
    """Return a cached genai.Client for the given API key."""
    if api_key not in _client_cache:
        _client_cache[api_key] = genai.Client(api_key=api_key)
    return _client_cache[api_key]


def get_api_keys() -> list[tuple[str, str]]:
    """
    Reads GEMINI_API_KEY, GEMINI_API_KEY_2, GEMINI_API_KEY_3, … from env.
    Returns a list of (label, key) tuples, e.g.:
        [("GEMINI_API_KEY", "AQ.xxx"), ("GEMINI_API_KEY_2", "AQ.yyy")]

    Note: discovery stops at the first missing suffix
    (e.g. if _3 is absent but _4 is set, _4 is silently ignored).
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
    Primary default: gemini-2.0-flash
    Fallback default: gemini-1.5-flash
    """
    primary = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash").strip()
    fallback_str = os.environ.get("GEMINI_MODEL_FALLBACKS", "gemini-1.5-flash").strip()

    fallbacks = [m.strip() for m in fallback_str.split(",") if m.strip()]
    return [primary] + fallbacks


def _configured_provider() -> str:
    """Return the configured provider, defaulting to Gemini for compatibility."""
    provider = os.environ.get("AI_PROVIDER", "gemini").strip().lower()
    if provider not in {"gemini", "groq"}:
        raise RuntimeError(
            f"Unsupported AI_PROVIDER={provider!r}. Expected 'gemini' or 'groq'."
        )
    return provider


def _call_groq(
    system_prompt: str,
    user_prompt: str,
    *,
    max_output_tokens: int,
    temperature: float,
    operation: str,
) -> str:
    """Call Groq's OpenAI-compatible API and return the response text."""
    api_key = os.environ.get("GROQ_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("No Groq API key found. Set GROQ_API_KEY in your .env file.")

    primary = os.environ.get("GROQ_MODEL", "openai/gpt-oss-20b").strip()
    fallback_str = os.environ.get(
        "GROQ_MODEL_FALLBACKS", "openai/gpt-oss-120b,qwen/qwen3.8-27b,llama-3.3-70b-versatile"
    ).strip()
    models = [primary] + [m.strip() for m in fallback_str.split(",") if m.strip() and m.strip() != primary]

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    last_error: Exception | None = None
    for model in models:
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "max_tokens": max_output_tokens,
            "temperature": temperature,
            "response_format": {"type": "json_object"},
        }

        for attempt in range(1, 4):
            started = time.monotonic()
            try:
                response = requests.post(
                    _GROQ_API_URL,
                    headers=headers,
                    json=payload,
                    timeout=_TIMEOUT_SECONDS if _TIMEOUT_SECONDS > 0 else None,
                )
                duration = time.monotonic() - started
                logger.info(
                    "[LATENCY] groq op=%s model=%s duration=%.3fs status=%s",
                    operation,
                    model,
                    duration,
                    response.status_code,
                )

                if response.status_code == 200:
                    body = response.json()
                    try:
                        return body["choices"][0]["message"]["content"]
                    except (KeyError, IndexError, TypeError) as exc:
                        raise RuntimeError("Groq returned an invalid response shape.") from exc

                # If 404 (model not found / deprecated) or 429 (rate-limited), rotate to next model immediately
                if response.status_code in (404, 429):
                    logger.warning(
                        "Groq model %s returned %s; rotating to next available model",
                        model,
                        response.status_code,
                    )
                    last_error = RuntimeError(f"Groq model {model} returned {response.status_code}")
                    break

                if response.status_code >= 500:
                    if attempt < 3:
                        wait = (2 ** attempt) + random.uniform(0, 1)
                        logger.warning(
                            "Groq temporary failure status=%s model=%s retry in %.2fs",
                            response.status_code,
                            model,
                            wait,
                        )
                        time.sleep(wait)
                        continue

                detail = response.text[:500]
                last_error = RuntimeError(
                    f"[Groq] API request failed with status {response.status_code}: {detail}"
                )
                break
            except requests.RequestException as exc:
                duration = time.monotonic() - started
                logger.info(
                    "[LATENCY] groq op=%s model=%s duration=%.3fs status=error",
                    operation,
                    model,
                    duration,
                )
                if attempt < 3:
                    wait = (2 ** attempt) + random.uniform(0, 1)
                    logger.warning("Groq request failed; retry in %.2fs: %s", wait, exc)
                    time.sleep(wait)
                    continue
                last_error = RuntimeError(f"[Groq] Request failed: {exc}")
                break

    raise last_error or RuntimeError(f"[Groq] Request failed after trying models={models}.")


def _classify_error(exc: Exception) -> str:
    """
    Classify an API exception into one of:
      'quota'    – 429 / RESOURCE_EXHAUSTED
      'unavail'  – 503 / UNAVAILABLE
      'auth'     – 401 / UNAUTHENTICATED
      'perm'     – 403 / PERMISSION_DENIED
      'notfound' – 404 / NOT_FOUND
      'other'    – anything else

    Priority:
      1. Structured code/status from google-genai ClientError (most accurate).
      2. Canonical status-string substrings (no false-positives from digits).
      3. Word-boundary regex on HTTP status codes (last resort).
    """
    # --- Structured path (google-genai ClientError) ---
    if _ClientError is not None and isinstance(exc, _ClientError):
        code: int | None = getattr(exc, "code", None)
        status: str = (getattr(exc, "status", "") or "").upper()
        if code == 429 or status == "RESOURCE_EXHAUSTED":
            return "quota"
        if code in (503, 504, 408) or status in ("UNAVAILABLE", "DEADLINE_EXCEEDED"):
            return "unavail"
        if code == 401 or status in ("UNAUTHENTICATED", "UNAUTHORIZED"):
            return "auth"
        if code == 403 or status == "PERMISSION_DENIED":
            return "perm"
        if code == 404 or status == "NOT_FOUND":
            return "notfound"

    # --- Canonical status strings (safe; no false-positives from digits) ---
    text_upper = str(exc).upper()
    for substr, kind in (
        ("RESOURCE_EXHAUSTED", "quota"),
        ("UNAVAILABLE", "unavail"),
        ("DEADLINE_EXCEEDED", "unavail"),
        ("GATEWAY_TIMEOUT", "unavail"),
        ("UNAUTHENTICATED", "auth"),
        ("UNAUTHORIZED", "auth"),
        ("PERMISSION_DENIED", "perm"),
        ("NOT_FOUND", "notfound"),
    ):
        if substr in text_upper:
            return kind

    # --- Last resort: numeric HTTP codes at word boundaries ---
    text_raw = str(exc)
    for pattern, kind in (
        (r"\b429\b", "quota"),
        (r"\b503\b", "unavail"),
        (r"\b504\b", "unavail"),
        (r"\b408\b", "unavail"),
        (r"\b401\b", "auth"),
        (r"\b403\b", "perm"),
        (r"\b404\b", "notfound"),
    ):
        if re.search(pattern, text_raw):
            return kind

    return "other"


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
    temperature: float = 1.0,
    operation: str = "gemini_call",
) -> str:
    """
    Shared Gemini text call with key/model fallback and 503 retries.
    Returns raw response text. Does not parse JSON.

    Fallback strategy (per model, then across models):
    • 429 quota        → rotate to next key; after all keys exhausted, try next model.
    • 503 unavailable  → retry up to max_retries_503 times with exponential back-off,
                         then rotate to next key (NOT the next model).
    • 404 not-found    → model doesn't exist; skip remaining keys, try next model.
    • 401/403 auth/perm→ log warning and rotate to next key; raise only if all keys fail.
    • None response    → treated as transient failure (safety block); rotates to next key.
    • Other            → raises RuntimeError immediately.

    Args:
        temperature: Sampling temperature. Use 0.2 for evaluation/parsing
                     calls where determinism matters; default 1.0 for
                     question generation where creativity is desirable.
    """
    provider = _configured_provider()
    if provider == "groq":
        try:
            return _call_groq(
                system_prompt,
                user_prompt,
                max_output_tokens=max_output_tokens,
                temperature=temperature,
                operation=operation,
            )
        except RuntimeError:
            if os.environ.get("AI_PROVIDER_FALLBACK", "").strip().lower() != "gemini":
                raise
            logger.warning("Groq call failed; falling back to Gemini", exc_info=True)

    api_key_entries = get_api_keys()
    if not api_key_entries:
        raise RuntimeError(
            "No Gemini API keys found. "
            "Set GEMINI_API_KEY in your .env file."
        )

    model_chain = get_model_chain()
    max_retries_503 = 3

    for model in model_chain:
        # Build config once per model — it does not depend on the API key.
        http_opts = (
            types.HttpOptions(timeout=int(_TIMEOUT_SECONDS * 1000))
            if _TIMEOUT_SECONDS > 0
            else None
        )
        gen_config = types.GenerateContentConfig(
            system_instruction=system_prompt,
            max_output_tokens=max_output_tokens,
            temperature=temperature,
            response_mime_type="application/json",
            http_options=http_opts,
        )

        # True while every key tried so far failed with quota (429).
        all_keys_quota_failed = True

        # Signals that the current model should be abandoned immediately
        # (e.g. NOT_FOUND — no point trying other keys for a missing model).
        skip_remaining_keys = False

        for key_label, api_key in api_key_entries:
            if skip_remaining_keys:
                break

            client = _get_client(api_key)

            for attempt in range(1, max_retries_503 + 1):
                _t0 = time.monotonic()
                try:
                    logger.info(
                        "Gemini request model=%s key=%s attempt=%s/%s timeout=%.0fs",
                        model, key_label, attempt, max_retries_503, _TIMEOUT_SECONDS,
                    )
                    response = client.models.generate_content(
                        model=model,
                        contents=user_prompt,
                        config=gen_config,
                    )
                    _dur = time.monotonic() - _t0
                    logger.info(
                        "[LATENCY] gemini op=%s model=%s key=%s duration=%.3fs status=ok",
                        operation, model, key_label, _dur,
                    )

                    text = response.text
                    if text is None:
                        # Safety block or empty candidates — treat as transient.
                        logger.warning(
                            "Gemini returned None text (safety block / empty candidates) "
                            "key=%s model=%s attempt=%s — skipping key",
                            key_label, model, attempt,
                        )
                        all_keys_quota_failed = False
                        break  # Try next key.

                    return text

                except Exception as exc:
                    _dur = time.monotonic() - _t0
                    logger.info(
                        "[LATENCY] gemini op=%s model=%s key=%s duration=%.3fs status=error",
                        operation, model, key_label, _dur,
                    )
                    kind = _classify_error(exc)

                    if kind == "notfound":
                        logger.warning(
                            "Gemini NOT_FOUND key=%s model=%s — skipping to next model",
                            key_label, model,
                        )
                        skip_remaining_keys = True
                        all_keys_quota_failed = False
                        break

                    if kind in ("auth", "perm"):
                        # A single bad/restricted key must not abort the entire
                        # call — rotate to the next key instead.
                        logger.warning(
                            "Gemini %s error key=%s model=%s — skipping key",
                            kind.upper(), key_label, model,
                        )
                        all_keys_quota_failed = False
                        break  # Try next key.

                    if kind == "quota":
                        logger.warning(
                            "Gemini quota exhausted key=%s model=%s",
                            key_label, model,
                        )
                        # all_keys_quota_failed stays True; key loop continues.
                        break  # Try next key.

                    if kind == "unavail":
                        if attempt < max_retries_503:
                            wait = (2 ** attempt) + random.uniform(0, 1)
                            logger.warning(
                                "Gemini unavailable key=%s model=%s retry in %.2fs",
                                key_label, model, wait,
                            )
                            time.sleep(wait)
                            continue
                        # 503 retries exhausted — rotate to next KEY, not next model.
                        logger.warning(
                            "Gemini unavailable max retries key=%s model=%s — skipping key",
                            key_label, model,
                        )
                        break

                    # Unexpected error — surface immediately.
                    raise RuntimeError(
                        f"[Gemini] UNEXPECTED ERROR "
                        f"key={key_label} model={model}: {exc}"
                    ) from exc

        if all_keys_quota_failed:
            logger.warning(
                "All %s key(s) quota-exhausted for model=%s",
                len(api_key_entries), model,
            )

    raise RuntimeError(
        "[Gemini] All models and API keys have exhausted their daily quota or are unavailable.\n"
        "Models tried: " + ", ".join(model_chain) + "\n"
        "Keys tried:   " + ", ".join(k for k, _ in api_key_entries)
    )


def call_gemini_json(
    system_prompt: str,
    user_prompt: str,
    *,
    max_output_tokens: int = 1200,
    parse_attempts: int = 2,
    temperature: float = 1.0,
    operation: str = "gemini_call",
) -> dict[str, Any]:
    """Call Gemini and parse a JSON object. Retries parse_attempts times.

    On the second and subsequent parse attempts the token budget is doubled
    to handle cases where the model produced truncated JSON at the original
    limit.

    Args:
        temperature: Passed through to call_gemini. Use 0.2 for
                     deterministic evaluation/parsing; default 1.0
                     for creative question generation.
        operation: Short label included in [LATENCY] logs.
    """
    last_error: Exception | None = None
    raw_response = ""
    for attempt in range(1, parse_attempts + 1):
        # Increase the token budget on retry — truncated JSON is a common
        # cause of parse failures when response_mime_type="application/json".
        tokens = max_output_tokens if attempt == 1 else max_output_tokens * 2
        raw_response = call_gemini(
            system_prompt,
            user_prompt,
            max_output_tokens=tokens,
            temperature=temperature,
            operation=operation,
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
