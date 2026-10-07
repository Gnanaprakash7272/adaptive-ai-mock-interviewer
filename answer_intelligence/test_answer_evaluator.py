"""
Proper pytest tests for answer_evaluator.

Replaces the old script-style test that had no assertions.
All Gemini calls are mocked.
"""
from unittest.mock import patch

import pytest

from answer_intelligence.answer_evaluator import evaluate_answer


VALID_EVALUATION = {
    "score": 7,
    "correctness": 7,
    "completeness": 6,
    "technical_depth": 7,
    "missing_concepts": ["Non-blocking I/O details"],
    "confidence": 0.85,
    "needs_followup": False,
    "feedback": "Good answer with solid fundamentals.",
}

SAMPLE_QUESTION = "Explain how FastAPI handles async requests."
SAMPLE_CONCEPTS = ["asyncio", "coroutines", "event loop"]
SAMPLE_ANSWER = "FastAPI uses asyncio to handle requests asynchronously."


class TestEvaluateAnswer:
    def test_success_returns_evaluation_dict(self):
        with patch("answer_intelligence.answer_evaluator.call_gemini_json",
                   return_value=VALID_EVALUATION):
            result = evaluate_answer(SAMPLE_QUESTION, SAMPLE_CONCEPTS, SAMPLE_ANSWER)
        assert result["score"] == 7
        assert isinstance(result["missing_concepts"], list)
        assert "feedback" in result

    def test_propagates_runtime_error(self):
        with patch("answer_intelligence.answer_evaluator.call_gemini_json",
                   side_effect=RuntimeError("quota exhausted")):
            with pytest.raises(RuntimeError):
                evaluate_answer(SAMPLE_QUESTION, SAMPLE_CONCEPTS, SAMPLE_ANSWER)

    def test_score_range_validated(self):
        """Scores outside 0-10 should be rejected by the schema validator."""
        invalid = dict(VALID_EVALUATION, score=15)
        with patch("answer_intelligence.answer_evaluator.call_gemini_json",
                   return_value=invalid):
            with pytest.raises(Exception):
                evaluate_answer(SAMPLE_QUESTION, SAMPLE_CONCEPTS, SAMPLE_ANSWER)

    def test_empty_missing_concepts_accepted(self):
        response = dict(VALID_EVALUATION, missing_concepts=[])
        with patch("answer_intelligence.answer_evaluator.call_gemini_json",
                   return_value=response):
            result = evaluate_answer(SAMPLE_QUESTION, SAMPLE_CONCEPTS, SAMPLE_ANSWER)
        assert result["missing_concepts"] == []

    def test_uncertainty_answer_handled(self):
        """'I don't know' answers should still produce a valid evaluation."""
        with patch("answer_intelligence.answer_evaluator.call_gemini_json",
                   return_value=dict(VALID_EVALUATION, score=0, feedback="Did not answer.")):
            result = evaluate_answer(SAMPLE_QUESTION, SAMPLE_CONCEPTS, "I don't know")
        assert result["score"] == 0