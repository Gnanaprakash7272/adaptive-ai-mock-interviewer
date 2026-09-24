import json

from adaptive_intellegence.adaptive_engine import decide_next_step


def run_test(
    test_name,
    evaluation,
    current_topic,
    current_difficulty,
    topics_covered,
    available_topics
):
    print(f"\n========== {test_name} ==========")

    result = decide_next_step(
        evaluation=evaluation,
        current_topic=current_topic,
        current_difficulty=current_difficulty,
        topics_covered=topics_covered,
        available_topics=available_topics
    )

    print(json.dumps(result, indent=2))


if __name__ == "__main__":

    print("Running Adaptive Interview Engine Tests...")

    # --------------------------------------------------
    # TEST 1: FOLLOW UP
    # --------------------------------------------------

    run_test(
        test_name="TEST 1 - FOLLOW UP",
        evaluation={
            "score": 4,
            "correctness": 5,
            "completeness": 3,
            "technical_depth": 3,
            "missing_concepts": [
                "Kafka consumer integration",
                "Non-blocking I/O",
                "High-throughput streams"
            ],
            "confidence": 0.9,
            "needs_followup": True,
            "feedback": "The answer lacks technical depth."
        },
        current_topic="FastAPI & Kafka Integration",
        current_difficulty="hard",
        topics_covered=[
            "FastAPI & Kafka Integration"
        ],
        available_topics=[
            "FastAPI & Kafka Integration",
            "Python Async Programming",
            "PostgreSQL",
            "REST API Design"
        ]
    )

    # --------------------------------------------------
    # TEST 2: EASIER
    # --------------------------------------------------

    run_test(
        test_name="TEST 2 - EASIER",
        evaluation={
            "score": 2,
            "correctness": 2,
            "completeness": 2,
            "technical_depth": 1,
            "missing_concepts": [],
            "confidence": 0.4,
            "needs_followup": False,
            "feedback": "The candidate struggled with the question."
        },
        current_topic="PostgreSQL",
        current_difficulty="hard",
        topics_covered=[
            "PostgreSQL"
        ],
        available_topics=[
            "PostgreSQL",
            "REST API Design"
        ]
    )

    # --------------------------------------------------
    # TEST 3: NEW TOPIC
    # --------------------------------------------------

    run_test(
        test_name="TEST 3 - NEW TOPIC",
        evaluation={
            "score": 9,
            "correctness": 9,
            "completeness": 9,
            "technical_depth": 9,
            "missing_concepts": [],
            "confidence": 0.95,
            "needs_followup": False,
            "feedback": "Excellent technical answer."
        },
        current_topic="PostgreSQL",
        current_difficulty="medium",
        topics_covered=[
            "PostgreSQL"
        ],
        available_topics=[
            "PostgreSQL",
            "REST API Design",
            "FastAPI",
            "Python Async Programming"
        ]
    )

    # --------------------------------------------------
    # TEST 4: HARDER - NO NEW TOPIC
    # --------------------------------------------------

    run_test(
        test_name="TEST 4 - HARDER / NO NEW TOPIC",
        evaluation={
            "score": 9,
            "correctness": 9,
            "completeness": 9,
            "technical_depth": 9,
            "missing_concepts": [],
            "confidence": 0.95,
            "needs_followup": False,
            "feedback": "Excellent answer."
        },
        current_topic="PostgreSQL",
        current_difficulty="medium",
        topics_covered=[
            "PostgreSQL",
            "REST API Design"
        ],
        available_topics=[
            "PostgreSQL",
            "REST API Design"
        ]
    )

    # --------------------------------------------------
    # TEST 5: MODERATE ANSWER
    # --------------------------------------------------

    run_test(
        test_name="TEST 5 - MODERATE ANSWER",
        evaluation={
            "score": 6,
            "correctness": 6,
            "completeness": 6,
            "technical_depth": 5,
            "missing_concepts": [],
            "confidence": 0.7,
            "needs_followup": False,
            "feedback": "The answer is reasonable but can be deeper."
        },
        current_topic="REST API Design",
        current_difficulty="easy",
        topics_covered=[
            "REST API Design"
        ],
        available_topics=[
            "REST API Design",
            "PostgreSQL"
        ]
    )

    print("\n==========================================")
    print("All Adaptive Engine tests executed.")
    print("==========================================")