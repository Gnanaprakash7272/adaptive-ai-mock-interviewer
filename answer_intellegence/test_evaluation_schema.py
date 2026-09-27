import unittest
from unittest.mock import patch

from ai_schemas import EvaluationOutput, ValidationError, parse_model
from answer_intellegence.answer_evaluator import evaluate_answer


VALID = {
    "score": 7,
    "correctness": 7,
    "completeness": 6,
    "technical_depth": 6,
    "missing_concepts": ["indexes"],
    "confidence": 0.8,
    "needs_followup": True,
    "feedback": "Solid start, but talk through indexing.",
}


class TestEvaluationSchema(unittest.TestCase):
    def test_valid_payload(self):
        parsed = parse_model(EvaluationOutput, VALID)
        self.assertEqual(parsed["score"], 7)

    def test_score_outside_range_rejected(self):
        with self.assertRaises(ValidationError):
            parse_model(EvaluationOutput, {**VALID, "score": 15})

    def test_confidence_outside_range_rejected(self):
        with self.assertRaises(ValidationError):
            parse_model(EvaluationOutput, {**VALID, "confidence": 1.5})

    def test_invalid_json_then_valid_retry(self):
        with patch(
            "answer_intellegence.answer_evaluator.call_gemini_json",
            side_effect=[{"score": 99}, VALID],
        ) as mock_call:
            result = evaluate_answer(
                "What is an index?",
                ["B-tree"],
                "A lookup structure.",
                role="Backend Developer",
                difficulty="medium",
            )
        self.assertEqual(result["score"], 7)
        self.assertEqual(mock_call.call_count, 2)

    def test_invalid_output_raises_after_retry(self):
        with patch(
            "answer_intellegence.answer_evaluator.call_gemini_json",
            return_value={"score": 99, "feedback": "bad"},
        ):
            with self.assertRaises(RuntimeError):
                evaluate_answer("Q", ["a"], "answer")


if __name__ == "__main__":
    unittest.main()
