"""
process_answer asks one combined Gemini call for the evaluation AND a proposed
next question. The proposal is only accepted when its topic matches the
engine's decision, it passes the style check, and (for follow-ups) it is
grounded in the candidate's answer. Otherwise the graph falls back to the
dedicated question generator.
"""
import unittest
from unittest.mock import patch

from langgraph_workflow import interview_graph as g

ANSWER = "We put a Redis cache in front of Postgres to speed up reads."

EVALUATION = {
    "score": 6,
    "correctness": 7,
    "completeness": 4,
    "technical_depth": 4,
    "confidence": 0.8,
    "missing_concepts": ["cache invalidation"],
    "needs_followup": True,
    "feedback": "Good start, but invalidation is missing.",
}


def _state():
    return {
        "current_question": {
            "question": "How would you speed up a read-heavy service?",
            "topic": "Caching",
            "difficulty": "medium",
            "expected_concepts": ["cache invalidation"],
        },
        "question_count": 1,
        "current_topic": "Caching",
        "current_difficulty": "medium",
        "max_questions": 8,
        "topics_covered": [],
        "role_topics": ["Caching", "Databases"],
        "candidate_topics": [],
        "interview_history": [],
        "role": "Backend Engineer",
    }


def _proposal(question, topic="Caching"):
    return {
        "question": question,
        "topic": topic,
        "difficulty": "medium",
        "question_type": "technical",
        "expected_concepts": ["cache invalidation"],
    }


class TestProposalQualityGate(unittest.TestCase):
    def _run(self, proposal):
        output = {"evaluation": dict(EVALUATION), "question_proposal": proposal}
        with patch.object(g, "interrupt", return_value=ANSWER), patch.object(
            g, "_process_candidate_answer", return_value=output
        ):
            return g.process_answer(_state())

    def test_good_grounded_follow_up_is_accepted(self):
        result = self._run(
            _proposal("You mentioned Redis in front of Postgres. How would you invalidate cache entries when rows change?")
        )
        self.assertEqual(result["adaptive_decision"]["next_action"], "follow_up")
        self.assertFalse(result["adaptive_decision"]["use_fallback_generate"])
        self.assertIsNotNone(result["current_question"])

    def test_robotic_proposal_is_rejected(self):
        result = self._run(_proposal("Great answer! Could you elaborate on caching?"))
        self.assertTrue(result["adaptive_decision"]["use_fallback_generate"])
        self.assertIsNone(result["current_question"])

    def test_ungrounded_follow_up_is_rejected(self):
        result = self._run(_proposal("What is your preferred approach to container orchestration at scale?"))
        self.assertEqual(result["adaptive_decision"]["next_action"], "follow_up")
        self.assertTrue(result["adaptive_decision"]["use_fallback_generate"])

    def test_wrong_topic_is_still_rejected(self):
        result = self._run(
            _proposal("You mentioned Redis. How would you invalidate cache entries?", topic="Databases")
        )
        self.assertTrue(result["adaptive_decision"]["use_fallback_generate"])


if __name__ == "__main__":
    unittest.main()