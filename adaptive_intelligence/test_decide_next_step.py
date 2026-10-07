from adaptive_intelligence.adaptive_engine import decide_next_step

ROLE_TOPICS = ["Python", "Docker", "System Design"]
CANDIDATE_TOPICS = ["Pandas"]


def _eval(**overrides):
    base = {
        "score": 6,
        "correctness": 6,
        "completeness": 6,
        "technical_depth": 6,
        "missing_concepts": [],
        "confidence": 0.7,
        "needs_followup": False,
        "feedback": "ok",
    }
    base.update(overrides)
    return base


def _decide(evaluation, **kwargs):
    defaults = dict(
        current_topic="Python",
        current_difficulty="medium",
        topics_covered=["Python"],
        role_topics=ROLE_TOPICS,
        candidate_topics=CANDIDATE_TOPICS,
    )
    defaults.update(kwargs)
    return decide_next_step(evaluation=evaluation, **defaults)


def test_missing_concepts_follow_up_even_if_score_low():
    result = _decide(_eval(score=3, correctness=4, missing_concepts=["lists"], needs_followup=True))
    assert result["next_action"] == "follow_up"


def test_failed_follow_up_goes_easier():
    result = _decide(
        _eval(score=3, correctness=3, missing_concepts=["lists"]),
        previous_action="follow_up",
        followups_on_topic=1,
    )
    assert result["next_action"] == "easier"
    assert result["difficulty"] == "easy"


def test_strong_answer_goes_harder():
    result = _decide(_eval(score=9, correctness=9, completeness=8, technical_depth=8))
    assert result["next_action"] == "harder"
    assert result["difficulty"] == "hard"


def test_strong_hard_moves_topic():
    result = _decide(
        _eval(score=9, correctness=9, completeness=8, technical_depth=8),
        current_difficulty="hard",
    )
    assert result["next_action"] == "new_topic"
    assert result["next_topic"] == "Docker"


def test_follow_up_limit():
    result = _decide(
        _eval(score=6, correctness=6, completeness=4, technical_depth=4, missing_concepts=["gil"], needs_followup=True),
        followups_on_topic=2,
        max_followups=2,
    )
    assert result["next_action"] != "follow_up"


def test_shallow_answer_follow_up():
    result = _decide(_eval(score=6, correctness=7, completeness=4, technical_depth=3, needs_followup=True))
    assert result["next_action"] == "follow_up"
