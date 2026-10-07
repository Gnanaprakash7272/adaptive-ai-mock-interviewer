from adaptive_intelligence.adaptive_engine import _get_next_topic, decide_next_step

def test_topic_rotation():
    role_topics = ["Python", "Machine Learning", "Statistics"]
    candidate_topics = ["SQL", "Fraud Detection"]

    # 1. Start with Python covered. Unvisited role topics: ML, Stats → expect ML.
    #    topics_visited is the same as topics_covered (visited ⊇ covered).
    next_topic = _get_next_topic("Python", ["Python"], ["Python"], role_topics, candidate_topics)
    assert next_topic == "Machine Learning", f"Expected ML, got {next_topic}"

    # 2. Cover ML; Stats should be next unvisited role topic.
    next_topic = _get_next_topic(
        "Machine Learning",
        ["Python", "Machine Learning"],
        ["Python", "Machine Learning"],
        role_topics,
        candidate_topics,
    )
    assert next_topic == "Statistics", f"Expected Stats, got {next_topic}"

    # 3. All role topics covered/visited → fall back to candidate_topics (SQL).
    next_topic = _get_next_topic(
        "Statistics",
        ["Python", "Machine Learning", "Statistics"],
        ["Python", "Machine Learning", "Statistics"],
        role_topics,
        candidate_topics,
    )
    assert next_topic == "SQL", f"Expected SQL, got {next_topic}"

    # 4. follow_up stays on current topic.
    eval_followup = {"score": 6, "needs_followup": True, "missing_concepts": ["concept"]}
    dec = decide_next_step(eval_followup, "Python", "medium", ["Python"], role_topics, candidate_topics)
    assert dec["next_action"] == "follow_up" and dec["next_topic"] == "Python"

    # 5. easier stays on current topic and lowers difficulty.
    eval_easy = {"score": 3, "needs_followup": False, "missing_concepts": []}
    dec = decide_next_step(eval_easy, "Python", "medium", ["Python"], role_topics, candidate_topics)
    assert dec["next_action"] == "easier" and dec["next_topic"] == "Python" and dec["difficulty"] == "easy"

    # 6. harder stays on current topic and raises difficulty.
    eval_hard = {"score": 9, "needs_followup": False, "missing_concepts": []}
    dec = decide_next_step(eval_hard, "Python", "medium", ["Python"], role_topics, candidate_topics)
    assert dec["next_action"] == "harder" and dec["next_topic"] == "Python" and dec["difficulty"] == "hard"

if __name__ == "__main__":
    test_topic_rotation()
    print("ALL TESTS PASSED!")
