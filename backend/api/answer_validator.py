import re
from dataclasses import dataclass


@dataclass
class AnswerValidationResult:
    valid: bool
    reason: str


UNCERTAINTY_PHRASES = {
    "i don't know",
    "i dont know",
    "don't know",
    "dont know",
    "no idea",
    "not sure",
    "i am not sure",
    "i'm not sure",
    "cannot answer",
    "can't answer",
    "no idea about this",
}


def _normalise(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def _is_uncertainty_answer(text: str) -> bool:
    normalised = _normalise(text)
    return normalised in UNCERTAINTY_PHRASES


def _has_meaningful_words(text: str) -> bool:
    words = re.findall(r"[a-zA-Z]+", text.lower())

    if not words:
        return False

    # At least one reasonably natural word.
    return any(len(word) >= 2 for word in words)


def _looks_like_gibberish(text: str) -> bool:
    words = re.findall(r"[a-zA-Z]+", text.lower())

    if not words:
        return True

    # Very long single-token random strings are suspicious.
    if len(words) == 1 and len(words[0]) >= 15:
        return True

    # Excessive repeated characters: "aaaaaaaaaaaa"
    if re.search(r"(.)\1{5,}", text.lower()):
        return True

    # Typical keyboard/random typing pattern.
    keyboard_patterns = (
        "asdfghjkl",
        "qwertyuiop",
        "zxcvbnm",
    )

    compact = re.sub(r"[^a-z]", "", text.lower())

    if compact in keyboard_patterns:
        return True

    return False


def validate_answer(answer: str) -> AnswerValidationResult:
    if not isinstance(answer, str):
        return AnswerValidationResult(
            valid=False,
            reason="invalid_type",
        )

    answer = answer.strip()

    if not answer:
        return AnswerValidationResult(
            valid=False,
            reason="empty_answer",
        )

    # Meaningful uncertainty is still a valid candidate response.
    if _is_uncertainty_answer(answer):
        return AnswerValidationResult(
            valid=True,
            reason="uncertainty",
        )

    if _looks_like_gibberish(answer):
        return AnswerValidationResult(
            valid=False,
            reason="meaningless_input",
        )

    if not _has_meaningful_words(answer):
        return AnswerValidationResult(
            valid=False,
            reason="meaningless_input",
        )

    return AnswerValidationResult(
        valid=True,
        reason="valid_answer",
    )
