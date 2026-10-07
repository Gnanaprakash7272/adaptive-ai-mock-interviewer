import unittest
from unittest.mock import patch

from question_intelligence.question_generator import (
    build_fallback_follow_up,
    generate_question,
    is_genuine_follow_up,
)


class TestFollowUpValidation(unittest.TestCase):
    def test_genuine_follow_up_mentions_missing_concept(self):
        self.assertTrue(
            is_genuine_follow_up(
                "You mentioned regularisation. How would you use cross-validation to detect overfitting?",
                "Explain how you would prevent overfitting.",
                "I would use more training data and regularisation.",
                ["cross-validation", "validation set"],
                "Machine Learning",
            )
        )

    def test_generic_new_topic_is_not_follow_up(self):
        self.assertFalse(
            is_genuine_follow_up(
                "What is Docker and how do you write a Dockerfile?",
                "Explain overfitting.",
                "I would use more training data and regularisation.",
                ["cross-validation"],
                "Machine Learning",
            )
        )

    def test_fallback_follow_up_references_answer_and_gap(self):
        result = build_fallback_follow_up(
            "Machine Learning",
            "medium",
            "I would use more training data and regularisation.",
            ["cross-validation"],
        )
        self.assertIn("regularisation", result["question"].lower())
        self.assertIn("cross-validation", result["question"].lower())
        self.assertTrue(
            is_genuine_follow_up(
                result["question"],
                "Explain overfitting.",
                "I would use more training data and regularisation.",
                ["cross-validation"],
                "Machine Learning",
            )
        )


class TestQuestionGenerationContext(unittest.TestCase):
    def test_prompt_uses_project_not_email(self):
        captured = {}

        def fake_json(system_prompt, user_prompt, **kwargs):
            captured["prompt"] = user_prompt
            return {
                "question": "In Customer Churn Prediction, how did you evaluate the model?",
                "topic": "Machine Learning",
                "difficulty": "medium",
                "question_type": "project",
                "expected_concepts": ["train/test split", "metrics"],
            }

        profile = {
            "candidate": {"email": "secret@example.com", "phone": "111"},
            "skills": {"programming_languages": ["Python"]},
            "projects": [{
                "name": "Customer Churn Prediction",
                "description": "Churn classifier",
                "technologies": ["Python", "Scikit-learn"],
            }],
            "experience": [{
                "company": "DataCo",
                "role": "Intern",
                "technologies": ["Python"],
            }],
        }
        with patch(
            "question_intelligence.question_generator.call_gemini_json",
            side_effect=fake_json,
        ):
            question = generate_question(
                profile,
                "ML Engineer",
                "Machine Learning",
                "medium",
            )
        self.assertIn("Customer Churn Prediction", captured["prompt"])
        self.assertIn("DataCo", captured["prompt"])
        self.assertNotIn("secret@example.com", captured["prompt"])
        self.assertNotIn("111", captured["prompt"])
        self.assertIn("Customer Churn Prediction", question["question"])

    def test_follow_up_retries_then_falls_back(self):
        generic = {
            "question": "What is Kubernetes autoscaling?",
            "topic": "Machine Learning",
            "difficulty": "medium",
            "question_type": "technical",
            "expected_concepts": ["pods"],
        }
        history = [{
            "question": {"question": "Explain overfitting.", "topic": "Machine Learning"},
            "answer": "I would use more training data and regularisation.",
            "evaluation": {"missing_concepts": ["cross-validation"], "feedback": "Shallow."},
        }]
        with patch(
            "question_intelligence.question_generator.call_gemini_json",
            return_value=generic,
        ):
            result = generate_question(
                {"skills": {"programming_languages": ["Python"]}},
                "ML Engineer",
                "Machine Learning",
                "medium",
                interview_history=history,
                adaptive_action="follow_up",
            )
        self.assertTrue(
            is_genuine_follow_up(
                result["question"],
                "Explain overfitting.",
                "I would use more training data and regularisation.",
                ["cross-validation"],
                "Machine Learning",
            )
        )


if __name__ == "__main__":
    unittest.main()
