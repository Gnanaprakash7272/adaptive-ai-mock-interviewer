import os
import logging

logging.getLogger("google_genai").setLevel(logging.ERROR)


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
