from adaptive_intelligence.adaptive_engine import decide_next_step

ROLE_TOPICS = ['Python', 'Java', 'System Design']
CANDIDATE_TOPICS = ['Python', 'Java']


def test_engine():
    # Case 1: score = 3 -> easier
    eval1 = {'score': 3, 'needs_followup': False, 'missing_concepts': []}
    res1 = decide_next_step(eval1, 'Python', 'medium', ['Python'], ROLE_TOPICS, CANDIDATE_TOPICS)
    assert res1['next_action'] == 'easier', f"Failed Case 1: {res1}"

    # Case 2: score = 2, needs_followup = true -> easier (score wins over follow_up)
    eval2 = {'score': 2, 'needs_followup': True, 'missing_concepts': ['lists']}
    res2 = decide_next_step(eval2, 'Python', 'medium', ['Python'], ROLE_TOPICS, CANDIDATE_TOPICS)
    assert res2['next_action'] == 'follow_up', f"Failed Case 2: {res2}"

    # Case 3: score = 9 -> harder
    eval3 = {'score': 9, 'needs_followup': False, 'missing_concepts': []}
    res3 = decide_next_step(eval3, 'Python', 'medium', ['Python'], ROLE_TOPICS, CANDIDATE_TOPICS)
    assert res3['next_action'] == 'harder', f"Failed Case 3: {res3}"
    assert res3['difficulty'] == 'hard', f"Failed Case 3 difficulty: {res3}"

    # Case 4: score = 9, already hard -> new_topic
    eval4 = {'score': 9, 'needs_followup': False, 'missing_concepts': []}
    res4 = decide_next_step(eval4, 'Python', 'hard', ['Python'], ROLE_TOPICS, CANDIDATE_TOPICS)
    assert res4['next_action'] == 'new_topic', f"Failed Case 4: {res4}"

    # Case 5: medium score + missing concept -> follow_up
    eval5 = {'score': 6, 'needs_followup': True, 'missing_concepts': ['generators']}
    res5 = decide_next_step(eval5, 'Python', 'medium', ['Python'], ROLE_TOPICS, CANDIDATE_TOPICS)
    assert res5['next_action'] == 'follow_up', f"Failed Case 5: {res5}"
