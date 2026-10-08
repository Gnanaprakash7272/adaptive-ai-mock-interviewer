"""
Proper pytest tests for question_generator.

Replaces the old script-style test that required a personal PDF.
All Gemini calls are mocked.
"""
from unittest.mock import patch

import pytest

from question_intelligence.question_generator import generate_question

SAMPLE_PROFILE = {
    "candidate": {"name": "Alice"},
    "skills": {"programming_languages": ["Python"], "frameworks": ["FastAPI"]},
    "projects": [{"name": "API Project", "technologies": ["FastAPI", "PostgreSQL"]}],
    "experience": [],
    "potential_interview_topics": ["FastAPI", "Python Async"],
}

VALID_QUESTION_RESPONSE = {
    "question": "Explain dependency injection in FastAPI.",
    "topic": "FastAPI",
    "difficulty": "medium",
    "question_type": "conceptual",
    "expected_concepts": ["Depends", "injection", "testability"],
}


class TestGenerateQuestion:
    def test_success_returns_question_dict(self):
        with patch("question_intelligence.question_generator.call_gemini_json",
                   return_value=VALID_QUESTION_RESPONSE):
            result = generate_question(SAMPLE_PROFILE, "Python Backend Developer",
                                       "FastAPI", "medium")
        assert result["question"] == "Explain dependency injection in FastAPI."
        assert result["topic"] == "FastAPI"
        assert result["difficulty"] == "medium"

    def test_propagates_runtime_error(self):
        with patch("question_intelligence.question_generator.call_gemini_json",
                   side_effect=RuntimeError("quota exhausted")):
            with pytest.raises(RuntimeError):
                generate_question(SAMPLE_PROFILE, "Backend Dev", "FastAPI", "easy")

    def test_difficulty_normalized_to_lowercase(self):
        """The schema validator should normalize difficulty to lowercase."""
        response = dict(VALID_QUESTION_RESPONSE, difficulty="HARD")
        with patch("question_intelligence.question_generator.call_gemini_json",
                   return_value=response):
            result = generate_question(SAMPLE_PROFILE, "Backend Dev", "FastAPI", "hard")
        assert result["difficulty"] == "hard"

    def test_missing_expected_concepts_defaults_to_empty_list(self):
        response = dict(VALID_QUESTION_RESPONSE)
        response.pop("expected_concepts", None)
        with patch("question_intelligence.question_generator.call_gemini_json",
                   return_value=response):
            result = generate_question(SAMPLE_PROFILE, "Backend Dev", "FastAPI", "medium")
        assert result.get("expected_concepts") == []
