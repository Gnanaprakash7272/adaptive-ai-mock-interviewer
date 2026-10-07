DIFFICULTY_LEVELS = [
    "easy",
    "medium",
    "hard",
]

MAX_FOLLOWUPS_PER_TOPIC = 2


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
    topics_visited: list,
    role_topics: list,
    candidate_topics: list,
):
    """
    Return the next topic to ask about.

    Priority:
      1. Role topics not yet visited (in order).
      2. Candidate topics not yet visited (in order).
      3. Role topics not yet *covered* (i.e. may revisit a visited-but-weak topic).
      4. Candidate topics not yet covered.
      5. None — no fresh topic available.

    `topics_visited` tracks *every* topic the engine has moved to (regardless of
    score), so weak topics are still eventually cycled through before repeating.
    `topics_covered` tracks topics where the candidate showed mastery (score ≥
    TOPIC_MASTERY_SCORE), so those are truly exhausted.
    """
    current_lower = current_topic.strip().lower()
    covered_lower = {str(t).strip().lower() for t in topics_covered}
    visited_lower = {str(t).strip().lower() for t in topics_visited}

    # Pass 1: unvisited role topics
    for topic in role_topics:
        normalized = str(topic).strip().lower()
        if not normalized or normalized == current_lower:
            continue
        if normalized not in visited_lower:
            return topic

    # Pass 2: unvisited candidate topics
    for topic in candidate_topics:
        normalized = str(topic).strip().lower()
        if not normalized or normalized == current_lower:
            continue
        if normalized not in visited_lower:
            return topic

    # Pass 3: revisit a role topic that was visited but not mastered
    for topic in role_topics:
        normalized = str(topic).strip().lower()
        if not normalized or normalized == current_lower:
            continue
        if normalized not in covered_lower:
            return topic

    # Pass 4: revisit a candidate topic that was visited but not mastered
    for topic in candidate_topics:
        normalized = str(topic).strip().lower()
        if not normalized or normalized == current_lower:
            continue
        if normalized not in covered_lower:
            return topic

    return None


def _score(evaluation: dict, key: str, default: int = 0) -> int:
    try:
        return int(evaluation.get(key, default) or default)
    except (TypeError, ValueError):
        return default


def _has_missing_concepts(evaluation: dict) -> bool:
    missing = evaluation.get("missing_concepts") or []
    return isinstance(missing, list) and any(str(item).strip() for item in missing)


def _is_strong(evaluation: dict) -> bool:
    return (
        _score(evaluation, "score") >= 8
        and _score(evaluation, "correctness") >= 7
        and _score(evaluation, "technical_depth") >= 6
    )


def _is_shallow(evaluation: dict) -> bool:
    if "completeness" not in evaluation and "technical_depth" not in evaluation:
        return False
    correctness = _score(evaluation, "correctness", _score(evaluation, "score"))
    completeness = _score(evaluation, "completeness")
    depth = _score(evaluation, "technical_depth")
    return correctness >= 5 and (completeness < 6 or depth < 6)


def _failed_follow_up(evaluation: dict, previous_action: str) -> bool:
    return previous_action == "follow_up" and (
        _score(evaluation, "score") < 5 or _score(evaluation, "correctness") < 5
    )


def _action(
    next_action: str,
    next_topic: str,
    difficulty: str,
    reason: str,
) -> dict:
    return {
        "next_action": next_action,
        "next_topic": next_topic,
        "difficulty": difficulty,
        "reason": reason,
    }


def decide_next_step(
    evaluation: dict,
    current_topic: str,
    current_difficulty: str,
    topics_covered: list,
    role_topics: list,
    candidate_topics: list,
    followups_on_topic: int = 0,
    max_followups: int = MAX_FOLLOWUPS_PER_TOPIC,
    previous_action: str = "",
    topics_visited: list | None = None,
) -> dict:
    """
    Decide the next interview action given the evaluation of the current answer.

    Args:
        evaluation:          Dict with score, correctness, technical_depth,
                             completeness, missing_concepts, needs_followup.
        current_topic:       The topic that was just asked about.
        current_difficulty:  "easy" | "medium" | "hard"
        topics_covered:      Topics where the candidate demonstrated mastery.
        role_topics:         Topics derived from the target role.
        candidate_topics:    Topics derived from the candidate profile.
        followups_on_topic:  Number of follow-ups already issued on this topic.
        max_followups:       Maximum follow-ups allowed per topic.
        previous_action:     The last engine action (e.g. "follow_up").
        topics_visited:      Every topic the engine has moved to so far.
                             Defaults to topics_covered when not supplied
                             (backward-compatible).

    Returns:
        dict with keys: next_action, next_topic, difficulty, reason.
    """
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

    if not isinstance(role_topics, list):
        raise ValueError("role_topics must be a list.")

    if not isinstance(candidate_topics, list):
        raise ValueError("candidate_topics must be a list.")

    # Backward-compatible default: if topics_visited is not passed, treat
    # topics_covered as the visited set (old behaviour, no regression).
    if topics_visited is None:
        topics_visited = list(topics_covered)

    if not isinstance(topics_visited, list):
        raise ValueError("topics_visited must be a list.")

    can_follow = followups_on_topic < max(0, int(max_followups))
    score = _score(evaluation, "score")
    needs_followup = bool(evaluation.get("needs_followup", False))

    def maybe_new_topic(reason: str, difficulty: str) -> dict:
        next_topic = _get_next_topic(
            current_topic=current_topic,
            topics_covered=topics_covered,
            topics_visited=topics_visited,
            role_topics=role_topics,
            candidate_topics=candidate_topics,
        )
        if next_topic:
            return _action("new_topic", next_topic, difficulty, reason)
        # No new topic — stay on the current topic but hold difficulty.
        # (Previously returned "harder" which was misleading for weak candidates.)
        return _action(
            "same_topic",
            current_topic,
            current_difficulty,
            f"{reason} No new topics available; continuing current topic.",
        )

    # Failed follow-up → easier (or leave topic if already easy).
    if _failed_follow_up(evaluation, previous_action):
        if current_difficulty == "easy":
            return maybe_new_topic(
                "The follow-up still showed weak understanding. Move to a new topic.",
                "medium",
            )
        return _action(
            "easier",
            current_topic,
            _decrease_difficulty(current_difficulty),
            "The follow-up did not recover the missing concepts. Reduce difficulty.",
        )

    # Important missing concepts → follow_up (including low overall score).
    if can_follow and _has_missing_concepts(evaluation) and (needs_followup or score < 8):
        return _action(
            "follow_up",
            current_topic,
            current_difficulty,
            "Important concepts are missing. Ask a follow-up on the same topic.",
        )

    # Shallow but directionally correct → follow_up.
    if can_follow and _is_shallow(evaluation):
        return _action(
            "follow_up",
            current_topic,
            current_difficulty,
            "The answer was directionally correct but shallow. Probe for depth.",
        )

    # Strong answer → harder on same topic, or new topic if already hard.
    if _is_strong(evaluation) or score >= 8:
        if current_difficulty != "hard":
            return _action(
                "harder",
                current_topic,
                _increase_difficulty(current_difficulty),
                "The candidate demonstrated strong understanding. Increase difficulty.",
            )
        next_topic = _get_next_topic(
            current_topic=current_topic,
            topics_covered=topics_covered,
            topics_visited=topics_visited,
            role_topics=role_topics,
            candidate_topics=candidate_topics,
        )
        if next_topic:
            return _action(
                "new_topic",
                next_topic,
                "medium",
                "The candidate has mastered the current topic. Move to a new topic.",
            )
        return _action(
            "harder",
            current_topic,
            "hard",
            "The candidate performed strongly and there are no new topics available.",
        )

    # Weak answer with no useful follow-up left.
    if score < 4:
        if current_difficulty == "easy":
            return maybe_new_topic(
                "The candidate struggled at easy difficulty. Move to a new topic.",
                "easy",
            )
        return _action(
            "easier",
            current_topic,
            _decrease_difficulty(current_difficulty),
            "The candidate struggled and a follow-up is not useful. Reduce difficulty.",
        )

    # Moderate answer (4-7): if no gaps, hold difficulty; if gaps, go harder gradually.
    if not _has_missing_concepts(evaluation):
        return _action(
            "same_topic",
            current_topic,
            current_difficulty,
            "Moderate answer with no missing concepts. Holding difficulty steady.",
        )

    return _action(
        "harder",
        current_topic,
        _increase_difficulty(current_difficulty),
        "The candidate demonstrated reasonable understanding. Increase difficulty gradually.",
    )
