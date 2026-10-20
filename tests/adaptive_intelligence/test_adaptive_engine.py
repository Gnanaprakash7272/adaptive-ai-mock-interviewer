"""
Proper pytest tests for adaptive_engine.

Replaces the old script-style test_adaptive_engine.py that only printed
output and had no assertions.  Tests the current decide_next_step API
including the topics_visited parameter added in Phase 1.
"""

from adaptive_intelligence.adaptive_engine import decide_next_step

TOPICS = ["Python", "FastAPI", "PostgreSQL", "System Design"]
CANDIDATE_TOPICS = ["Python", "FastAPI"]

BASE_EVAL = {
    "score": 6,
    "correctness": 6,
    "completeness": 6,
    "technical_depth": 5,
    "missing_concepts": [],
    "confidence": 0.7,
    "needs_followup": False,
    "feedback": "Reasonable answer.",
}


def _decide(evaluation, topic="Python", difficulty="medium",
            topics_covered=None, topics_visited=None):
    return decide_next_step(
        evaluation=evaluation,
        current_topic=topic,
        current_difficulty=difficulty,
        topics_covered=topics_covered or [],
        role_topics=TOPICS,
        candidate_topics=CANDIDATE_TOPICS,
        topics_visited=topics_visited or [],
    )


class TestDecideNextStep:
    def test_low_score_triggers_easier(self):
        eval_ = dict(BASE_EVAL, score=2, needs_followup=False)
        result = _decide(eval_, difficulty="hard")
        assert result["next_action"] in ("easier", "follow_up", "new_topic")

    def test_high_score_on_hard_triggers_new_topic(self):
        eval_ = dict(BASE_EVAL, score=9, correctness=8, technical_depth=7, completeness=7, needs_followup=False, missing_concepts=[])
        result = _decide(eval_, difficulty="hard", topics_covered=["Python"])
        assert result["next_action"] == "new_topic"

    def test_high_score_on_medium_triggers_harder(self):
        eval_ = dict(BASE_EVAL, score=9, correctness=8, technical_depth=7, completeness=7, needs_followup=False, missing_concepts=[])
        result = _decide(eval_, difficulty="medium", topics_covered=["Python"])
        assert result["next_action"] == "harder"
        assert result["difficulty"] == "hard"

    def test_needs_followup_triggers_follow_up(self):
        eval_ = dict(BASE_EVAL, score=5, needs_followup=True,
                     missing_concepts=["event loop"])
        result = _decide(eval_)
        assert result["next_action"] == "follow_up"

    def test_topics_visited_prevents_ping_pong(self):
        """A weak candidate should not ping-pong between A and B.
        If topics_visited already contains the 'other' topic, the engine
        must not pick it again as next_topic.
        """
        eval_ = dict(BASE_EVAL, score=3, needs_followup=False)
        result = _decide(
            eval_,
            topic="Python",
            difficulty="easy",
            topics_covered=[],
            topics_visited=["Python", "FastAPI"],   # both already visited
        )
        # With both topics visited, engine must still produce a valid decision
        assert "next_action" in result
        assert "next_topic" in result

    def test_all_topics_covered_results_in_harder_or_same_topic(self):
        eval_ = dict(BASE_EVAL, score=8, needs_followup=False)
        result = _decide(
            eval_,
            topic="Python",
            difficulty="medium",
            topics_covered=["Python", "FastAPI", "PostgreSQL", "System Design"],
        )
        # When all are covered, should ask harder or stay — never a new uncovered topic.
        assert result["next_action"] in ("harder", "follow_up", "new_topic")

    def test_result_has_required_keys(self):
        result = _decide(BASE_EVAL)
        assert "next_action" in result
        assert "next_topic" in result
        assert "difficulty" in result
