from adaptive_intellegence.adaptive_engine import decide_next_step
from answer_intellegence.answer_evaluator import evaluate_answer
from question_intellegence.question_generator import generate_question

from interview_engine.interview_engine import (
    InterviewEngine,
    start_interview,
)


def create_profile():
    return {
        "name": "Test Candidate",
        "skills": [
            "Python",
            "FastAPI",
            "PostgreSQL",
        ],
        "potential_interview_topics": [
            "FastAPI",
            "REST API Design",
            "PostgreSQL",
        ],
    }


def fake_question_fn(
    candidate_profile,
    role,
    topic,
    difficulty,
):
    return {
        "question": (
            f"Question about {topic} ({difficulty})"
        ),
        "topic": topic,
        "difficulty": difficulty,
        "question_type": "technical",
        "expected_concepts": [
            topic,
        ],
    }


def make_fake_eval_fn(scores):
    state = {
        "index": 0
    }

    def fake_eval_fn(
        question,
        expected_concepts,
        candidate_answer,
    ):
        index = state["index"]

        if index >= len(scores):
            score = scores[-1]
        else:
            score = scores[index]

        state["index"] += 1

        if score < 4:
            return {
                "score": score,
                "correctness": score,
                "completeness": score,
                "technical_depth": score,
                "missing_concepts": ["important concept"],
                "confidence": 0.5,
                "needs_followup": False,
                "feedback": "Needs improvement.",
            }

        if score == 5:
            return {
                "score": score,
                "correctness": score,
                "completeness": score,
                "technical_depth": score,
                "missing_concepts": ["missing concept"],
                "confidence": 0.6,
                "needs_followup": True,
                "feedback": "Needs more depth.",
            }

        return {
            "score": score,
            "correctness": score,
            "completeness": score,
            "technical_depth": score,
            "missing_concepts": [],
            "confidence": 0.9,
            "needs_followup": False,
            "feedback": "Good answer.",
        }

    return fake_eval_fn


# --------------------------------------------------
# TEST 1
# Initial interview creation
# --------------------------------------------------

def test_1_initial_interview_creation():

    engine = start_interview(
        create_profile(),
        "Python Backend Developer",
        "FastAPI",
        "medium",
        6,
        question_fn=fake_question_fn,
        eval_fn=make_fake_eval_fn([5]),
    )

    assert isinstance(engine, InterviewEngine)
    assert engine.role == "Python Backend Developer"
    assert engine.current_topic == "FastAPI"
    assert engine.current_difficulty == "medium"
    assert engine.current_question is not None
    assert engine.turn_count == 1
    assert engine.topics_covered == ["FastAPI"]

    print("PASS  test_1_initial_interview_creation")


# --------------------------------------------------
# TEST 2
# FOLLOW UP
# --------------------------------------------------

def test_2_follow_up_branch():

    engine = start_interview(
        create_profile(),
        "Python Backend Developer",
        "FastAPI",
        "medium",
        3,
        question_fn=fake_question_fn,
        eval_fn=make_fake_eval_fn([5]),
    )

    result = engine.submit_answer(
        "FastAPI uses dependency injection."
    )

    decision = result["adaptive_decision"]

    assert decision["next_action"] == "follow_up"
    assert decision["next_topic"] == "FastAPI"
    assert decision["difficulty"] == "medium"

    assert result["next_question"] is not None
    assert engine.current_topic == "FastAPI"
    assert engine.current_difficulty == "medium"

    print("PASS  test_2_follow_up_branch")


# --------------------------------------------------
# TEST 3
# EASIER
# --------------------------------------------------

def test_3_easier_branch():

    engine = start_interview(
        create_profile(),
        "Python Backend Developer",
        "FastAPI",
        "hard",
        3,
        question_fn=fake_question_fn,
        eval_fn=make_fake_eval_fn([2]),
    )

    result = engine.submit_answer(
        "I am not sure."
    )

    decision = result["adaptive_decision"]

    assert decision["next_action"] == "easier"
    assert decision["next_topic"] == "FastAPI"
    assert decision["difficulty"] == "medium"

    assert engine.current_difficulty == "medium"

    print("PASS  test_3_easier_branch")


# --------------------------------------------------
# TEST 4
# NEW TOPIC
# --------------------------------------------------

def test_4_new_topic_branch():

    engine = start_interview(
        create_profile(),
        "Python Backend Developer",
        "FastAPI",
        "medium",
        3,
        question_fn=fake_question_fn,
        eval_fn=make_fake_eval_fn([9]),
    )

    result = engine.submit_answer(
        "FastAPI provides dependency injection and async support."
    )

    decision = result["adaptive_decision"]

    assert decision["next_action"] == "new_topic"
    assert decision["next_topic"] == "REST API Design"

    assert engine.current_topic == "REST API Design"
    assert "REST API Design" in engine.topics_covered
    assert result["next_question"] is not None

    print("PASS  test_4_new_topic_branch")


# --------------------------------------------------
# TEST 5
# HARDER
# --------------------------------------------------

def test_5_harder_branch():

    profile = {
        "name": "Test Candidate",
        "skills": ["Python"],
        "potential_interview_topics": [
            "FastAPI",
        ],
    }

    engine = start_interview(
        profile,
        "Python Backend Developer",
        "FastAPI",
        "medium",
        3,
        question_fn=fake_question_fn,
        eval_fn=make_fake_eval_fn([6]),
    )

    result = engine.submit_answer(
        "FastAPI is a Python web framework."
    )

    decision = result["adaptive_decision"]

    assert decision["next_action"] == "harder"
    assert decision["next_topic"] == "FastAPI"
    assert decision["difficulty"] == "hard"

    assert engine.current_difficulty == "hard"

    print("PASS  test_5_harder_branch")


# --------------------------------------------------
# TEST 6
# History alignment
# --------------------------------------------------

def test_6_history_alignment():

    engine = start_interview(
        create_profile(),
        "Python Backend Developer",
        "FastAPI",
        "medium",
        6,
        question_fn=fake_question_fn,
        eval_fn=make_fake_eval_fn(
            [5, 9, 6, 2, 9, 6]
        ),
    )

    for i in range(6):
        result = engine.submit_answer(
            f"Candidate answer {i + 1}"
        )

        assert len(engine.questions) == i + 1
        assert len(engine.answers) == i + 1
        assert len(engine.evaluations) == i + 1
        assert len(engine.adaptive_decisions) == i + 1

    assert engine.turn_count == 6
    assert engine.is_finished is True

    print("PASS  test_6_history_alignment")


# --------------------------------------------------
# TEST 7
# Max questions termination
# --------------------------------------------------

def test_7_max_questions_termination():

    engine = start_interview(
        create_profile(),
        "Python Backend Developer",
        "FastAPI",
        "medium",
        3,
        question_fn=fake_question_fn,
        eval_fn=make_fake_eval_fn([6, 6, 6]),
    )

    engine.submit_answer("Answer 1")
    engine.submit_answer("Answer 2")
    result = engine.submit_answer("Answer 3")

    assert engine.turn_count == 3
    assert engine.is_finished is True
    assert result["next_question"] is None

    print("PASS  test_7_max_questions_termination")


# --------------------------------------------------
# TEST 8
# Submit after completion
# --------------------------------------------------

def test_8_submit_after_completion():

    engine = start_interview(
        create_profile(),
        "Python Backend Developer",
        "FastAPI",
        "medium",
        1,
        question_fn=fake_question_fn,
        eval_fn=make_fake_eval_fn([6]),
    )

    engine.submit_answer("Final answer")

    try:
        engine.submit_answer("Another answer")
        assert False
    except RuntimeError:
        pass

    print("PASS  test_8_submit_after_completion")


# --------------------------------------------------
# TEST 9
# Missing potential_interview_topics
# --------------------------------------------------

def test_9_missing_topics():

    profile = {
        "name": "Test Candidate",
        "skills": ["Python"],
    }

    engine = start_interview(
        profile,
        "Python Backend Developer",
        "Python",
        "medium",
        1,
        question_fn=fake_question_fn,
        eval_fn=make_fake_eval_fn([6]),
    )

    assert engine.available_topics == []
    assert engine.current_question is not None

    print("PASS  test_9_missing_topics")


# --------------------------------------------------
# TEST 10
# Defaults are real functions
# --------------------------------------------------

def test_10_real_functions_are_defaults():

    engine = InterviewEngine(
        candidate_profile=create_profile(),
        role="Python Backend Developer",
        initial_topic="FastAPI",
        initial_difficulty="medium",
        max_questions=3,
    )

    assert engine.question_fn is generate_question
    assert engine.eval_fn is evaluate_answer
    assert engine.decision_fn is decide_next_step

    print("PASS  test_10_real_functions_are_defaults")


# --------------------------------------------------
# TEST 11
# _ask_question blocked after finish
# --------------------------------------------------

def test_11_ask_question_blocked_after_finish():

    engine = start_interview(
        create_profile(),
        "Python Backend Developer",
        "FastAPI",
        "medium",
        1,
        question_fn=fake_question_fn,
        eval_fn=make_fake_eval_fn([6]),
    )

    engine.submit_answer("Final answer")

    try:
        engine._ask_question()
        assert False
    except RuntimeError:
        pass

    print("PASS  test_11_ask_question_blocked_after_finish")


# --------------------------------------------------
# TEST 12
# Empty answer
# --------------------------------------------------

def test_12_empty_answer():

    engine = start_interview(
        create_profile(),
        "Python Backend Developer",
        "FastAPI",
        "medium",
        3,
        question_fn=fake_question_fn,
        eval_fn=make_fake_eval_fn([6]),
    )

    original_turn_count = engine.turn_count

    try:
        engine.submit_answer("")
        assert False
    except ValueError:
        pass

    assert engine.turn_count == original_turn_count
    assert len(engine.answers) == 0

    print("PASS  test_12_empty_answer")


# --------------------------------------------------
# TEST 13
# Failed evaluation leaves state unchanged
# --------------------------------------------------

def test_13_failed_evaluation_changes_nothing():

    def failing_eval_fn(
        question,
        expected_concepts,
        candidate_answer,
    ):
        raise RuntimeError("Evaluation service unavailable.")

    engine = start_interview(
        create_profile(),
        "Python Backend Developer",
        "FastAPI",
        "medium",
        3,
        question_fn=fake_question_fn,
        eval_fn=failing_eval_fn,
    )

    original_question = engine.current_question
    original_turn_count = engine.turn_count

    try:
        engine.submit_answer("Test answer")
        assert False
    except RuntimeError:
        pass

    assert engine.current_question == original_question
    assert engine.turn_count == original_turn_count
    assert len(engine.questions) == 0
    assert len(engine.answers) == 0
    assert len(engine.evaluations) == 0
    assert len(engine.adaptive_decisions) == 0

    print("PASS  test_13_failed_evaluation_changes_nothing")


# --------------------------------------------------
# RUN ALL TESTS
# --------------------------------------------------

if __name__ == "__main__":

    print("\nRunning Interview Engine Tests...\n")

    test_1_initial_interview_creation()
    test_2_follow_up_branch()
    test_3_easier_branch()
    test_4_new_topic_branch()
    test_5_harder_branch()
    test_6_history_alignment()
    test_7_max_questions_termination()
    test_8_submit_after_completion()
    test_9_missing_topics()
    test_10_real_functions_are_defaults()
    test_11_ask_question_blocked_after_finish()
    test_12_empty_answer()
    test_13_failed_evaluation_changes_nothing()

    print("\n13/13 tests passed.")