DIFFICULTY_LEVELS = [
    "easy",
    "medium",
    "hard"
]


def _increase_difficulty(current_difficulty: str) -> str:
    if current_difficulty == "easy":
        return "medium"

    if current_difficulty == "medium":
        return "hard"

    return "hard"


def _decrease_difficulty(current_difficulty: str) -> str:
    if current_difficulty == "hard":
        return "medium"

    if current_difficulty == "medium":
        return "easy"

    return "easy"


def _get_next_topic(
    current_topic: str,
    topics_covered: list,
    available_topics: list
):
    covered = {
        str(topic).strip().lower()
        for topic in topics_covered
    }

    for topic in available_topics:
        normalized = str(topic).strip().lower()

        if not normalized:
            continue

        if normalized == current_topic.strip().lower():
            continue

        if normalized not in covered:
            return topic

    return None


def decide_next_step(
    evaluation: dict,
    current_topic: str,
    current_difficulty: str,
    topics_covered: list,
    available_topics: list
) -> dict:

    if not isinstance(evaluation, dict):
        raise ValueError("evaluation must be a dictionary.")

    if not current_topic or not current_topic.strip():
        raise ValueError("current_topic is required.")

    if current_difficulty not in DIFFICULTY_LEVELS:
        raise ValueError(
            "current_difficulty must be easy, medium, or hard."
        )

    if not isinstance(topics_covered, list):
        raise ValueError("topics_covered must be a list.")

    if not isinstance(available_topics, list):
        raise ValueError("available_topics must be a list.")

    score = evaluation.get("score", 0)

    needs_followup = evaluation.get(
        "needs_followup",
        False
    )

    missing_concepts = evaluation.get(
        "missing_concepts",
        []
    )

    # Rule 1: missing concepts -> follow-up
    if needs_followup and missing_concepts:
        return {
            "next_action": "follow_up",
            "next_topic": current_topic,
            "difficulty": current_difficulty,
            "reason": (
                "Important concepts are missing. "
                "Ask a follow-up question on the same topic."
            )
        }

    # Rule 2: very weak answer -> easier
    if score < 4:
        return {
            "next_action": "easier",
            "next_topic": current_topic,
            "difficulty": _decrease_difficulty(
                current_difficulty
            ),
            "reason": (
                "The candidate struggled with the current "
                "question. Reduce difficulty."
            )
        }

    # Rule 3: strong answer -> new topic or harder
    if score >= 8:

        next_topic = _get_next_topic(
            current_topic=current_topic,
            topics_covered=topics_covered,
            available_topics=available_topics
        )

        if next_topic:
            return {
                "next_action": "new_topic",
                "next_topic": next_topic,
                "difficulty": current_difficulty,
                "reason": (
                    "The candidate demonstrated strong "
                    "understanding. Move to a new topic."
                )
            }

        return {
            "next_action": "harder",
            "next_topic": current_topic,
            "difficulty": _increase_difficulty(
                current_difficulty
            ),
            "reason": (
                "The candidate performed strongly and "
                "there are no new topics available."
            )
        }

    # Rule 4: moderate answer -> harder
    return {
        "next_action": "harder",
        "next_topic": current_topic,
        "difficulty": _increase_difficulty(
            current_difficulty
        ),
        "reason": (
            "The candidate demonstrated reasonable "
            "understanding. Increase difficulty gradually."
        )
    }