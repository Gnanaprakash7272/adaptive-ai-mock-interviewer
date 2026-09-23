"""
text_clean.py

Responsibility: Raw Text -> Clean Text

This module ONLY normalizes whitespace and removes obvious PDF
extraction noise. It does NOT rewrite, summarize, categorize,
or extract structured information from the resume. That happens
in a later LLM stage.
"""

import re

# Lines that are almost always PDF header/footer noise, not resume
# content. We only strip a line if it matches one of these patterns
# AND it repeats multiple times in the document (see _is_repeated_noise).
_NOISE_PATTERNS = [
    re.compile(r"^\s*page\s*\d+(\s*/\s*\d+)?\s*$", re.IGNORECASE),  # "Page 2", "Page 2/5"
    re.compile(r"^\s*\d+\s*/\s*\d+\s*$"),                            # "2/5"
    re.compile(r"^\s*\d+\s*$"),                                      # a lone page number
]


def clean_resume_text(text: str) -> str:
    """
    Clean raw resume text extracted from a PDF.

    This removes formatting noise (extra blank lines, stray spaces,
    repeated page numbers/headers) while preserving the original
    wording, order, and meaning of the resume content.

    Args:
        text: Raw text as returned by extract_text().

    Returns:
        A cleaned version of the same text.
    """
    if not text or not text.strip():
        return ""

    lines = text.split("\n")

    # Step 1: trim leading/trailing spaces on every line.
    lines = [line.strip() for line in lines]

    # Step 2: find lines that look like noise AND repeat several times
    # (a one-off number could be a real resume detail, e.g. a score).
    lines = _remove_repeated_noise_lines(lines)

    # Step 3: collapse multiple internal spaces into one (keeps words
    # like "Python API" readable if the PDF inserted extra spaces).
    lines = [re.sub(r"[ \t]{2,}", " ", line) for line in lines]

    # Step 4: drop empty lines, then collapse consecutive blank
    # sections into a single blank line for readability.
    cleaned_lines = []
    previous_was_blank = True  # avoid a leading blank line
    for line in lines:
        is_blank = line == ""
        if is_blank and previous_was_blank:
            continue
        cleaned_lines.append(line)
        previous_was_blank = is_blank

    cleaned_text = "\n".join(cleaned_lines).strip()
    return cleaned_text


def _remove_repeated_noise_lines(lines: list[str]) -> list[str]:
    """
    Remove lines that match a known noise pattern (page numbers,
    "Page X of Y", etc.) ONLY if that exact line appears more than
    once in the document. A single occurrence is left alone, since
    it might be genuine resume content rather than a repeated footer.
    """
    counts: dict[str, int] = {}
    for line in lines:
        if line:
            counts[line] = counts.get(line, 0) + 1

    result = []
    for line in lines:
        looks_like_noise = any(pattern.match(line) for pattern in _NOISE_PATTERNS)
        repeats = counts.get(line, 0) > 1
        if looks_like_noise and repeats:
            continue
        result.append(line)

    return result