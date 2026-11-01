"""
Strict Pydantic schemas for Gemini JSON outputs.

Malformed model output must not enter interview state or persistence.
"""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator


class QuestionOutput(BaseModel):
    model_config = ConfigDict(extra="ignore")

    question: str = Field(min_length=1)
    topic: str = Field(min_length=1)
    difficulty: Literal["easy", "medium", "hard"]
    question_type: Literal["technical", "project", "conceptual", "problem_solving", "follow_up"]
    expected_concepts: list[str] = Field(default_factory=list)

    @field_validator("question", "topic", mode="before")
    @classmethod
    def _strip_text(cls, value: Any) -> Any:
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("difficulty", "question_type", mode="before")
    @classmethod
    def _normalize_enum(cls, value: Any) -> Any:
        if isinstance(value, str):
            return value.strip().lower().replace(" ", "_")
        return value

    @field_validator("expected_concepts", mode="before")
    @classmethod
    def _list_of_strings(cls, value: Any) -> list[str]:
        if value is None:
            return []
        if not isinstance(value, list):
            raise ValueError("expected_concepts must be a list")
        return [str(item).strip() for item in value if str(item).strip()]


class EvaluationOutput(BaseModel):
    model_config = ConfigDict(extra="ignore")

    score: int
    correctness: int
    completeness: int
    technical_depth: int
    missing_concepts: list[str] = Field(default_factory=list)
    confidence: float
    needs_followup: bool
    feedback: str = Field(min_length=1)

    @field_validator("score", "correctness", "completeness", "technical_depth", mode="before")
    @classmethod
    def _int_score(cls, value: Any) -> int:
        if isinstance(value, bool) or value is None:
            raise ValueError("score fields must be integers from 0 to 10")
        try:
            number = int(value)
        except (TypeError, ValueError) as exc:
            raise ValueError("score fields must be integers from 0 to 10") from exc
        if number < 0 or number > 10:
            raise ValueError("score fields must be integers from 0 to 10")
        return number

    @field_validator("confidence", mode="before")
    @classmethod
    def _confidence_range(cls, value: Any) -> float:
        if isinstance(value, bool) or value is None:
            raise ValueError("confidence must be a number between 0.0 and 1.0")
        try:
            number = float(value)
        except (TypeError, ValueError) as exc:
            raise ValueError("confidence must be a number between 0.0 and 1.0") from exc
        if number < 0.0 or number > 1.0:
            raise ValueError("confidence must be a number between 0.0 and 1.0")
        return number

    @field_validator("needs_followup", mode="before")
    @classmethod
    def _bool_flag(cls, value: Any) -> bool:
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            lowered = value.strip().lower()
            if lowered in ("true", "1", "yes"):
                return True
            if lowered in ("false", "0", "no"):
                return False
        raise ValueError("needs_followup must be a boolean")

    @field_validator("missing_concepts", mode="before")
    @classmethod
    def _missing_list(cls, value: Any) -> list[str]:
        if value is None:
            return []
        if not isinstance(value, list):
            raise ValueError("missing_concepts must be a list")
        return [str(item).strip() for item in value if str(item).strip()]

    @field_validator("feedback", mode="before")
    @classmethod
    def _feedback_text(cls, value: Any) -> Any:
        if isinstance(value, str):
            return value.strip()
        return value


class NarrativeOutput(BaseModel):
    model_config = ConfigDict(extra="ignore")

    summary: str = Field(min_length=1)
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)

    @field_validator("strengths", "weaknesses", "recommendations", mode="before")
    @classmethod
    def _string_lists(cls, value: Any) -> list[str]:
        if value is None:
            return []
        if not isinstance(value, list):
            raise ValueError("narrative lists must be arrays of strings")
        return [str(item).strip() for item in value if str(item).strip()]


class ProcessAnswerOutput(BaseModel):
    model_config = ConfigDict(extra="ignore")

    evaluation: EvaluationOutput
    question_proposal: QuestionOutput | None = None


def parse_model(model_cls: type[BaseModel], payload: dict[str, Any]) -> dict[str, Any]:
    """Validate a parsed JSON dict. Raises ValidationError on failure."""
    return model_cls.model_validate(payload).model_dump()


__all__ = [
    "EvaluationOutput",
    "NarrativeOutput",
    "QuestionOutput",
    "ProcessAnswerOutput",
    "ValidationError",
    "parse_model",
]
