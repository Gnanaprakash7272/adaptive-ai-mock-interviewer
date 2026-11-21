"""adaptive_engine.py

Closed-loop feedback engine that dynamically adjusts the candidate's
learning roadmap based on mock interview rubric scores.
"""

from __future__ import annotations

import logging
from typing import Any

from intelligence.career_coach.state import LearningTask, PivotPlan, PlanAdjustment

logger = logging.getLogger(__name__)


def adjust_roadmap_after_mock(
    current_plan: PivotPlan,
    mock_topic: str,
    score: float,
    weak_concepts: list[str] | None = None,
    interview_id: str | None = None,
) -> PlanAdjustment:
    """
    Evaluates mock interview result and updates roadmap:
    - Score < 6.5: REMEDIATE -> inject targeted remediation drills, pause advancing.
    - Score >= 8.5: ADVANCE -> mark current milestone mastered, unlock fast-track topics.
    - 6.5 <= Score < 8.5: REINFORCE -> add 1 practice drill, keep steady velocity.
    """
    weak_concepts = weak_concepts or []
    weak_str = ", ".join(weak_concepts) if weak_concepts else "core design trade-offs"

    if not current_plan.roadmap:
        return PlanAdjustment(
            interview_id=interview_id,
            topic=mock_topic,
            score=score,
            action="reinforce",
            reason="Roadmap has no milestones to adapt.",
            affected_weeks=[],
            added_tasks=[],
        )

    # Identify matching milestone: priority to in_progress, then pending, fallback to last week
    active_week = None
    for m in current_plan.roadmap:
        if m.status == "in_progress":
            active_week = m.week_number
            break
    if active_week is None:
        for m in current_plan.roadmap:
            if m.status == "pending":
                active_week = m.week_number
                break
    if active_week is None:
        active_week = current_plan.roadmap[-1].week_number

    total_weeks = len(current_plan.roadmap)
    max_week_num = max(m.week_number for m in current_plan.roadmap)

    if score < 6.5:
        action = "remediate"
        reason = (
            f"Mock interview on '{mock_topic}' scored {score:.1f}/10. "
            f"Identified weak areas: {weak_str}. Injected targeted deep-dive tasks to reinforce fundamentals before moving forward."
        )
        added_tasks = [
            LearningTask(
                id=f"rem-{active_week}-1",
                title=f"Remediation Drill: Deep-dive review into {weak_str}",
                category="theory",
                estimated_hours=2.5,
                resources=["Mockora Answer Feedback Breakdown", "System Architecture Primer"],
            ),
            LearningTask(
                id=f"rem-{active_week}-2",
                title=f"Hands-on Implementation: Refactor architecture to resolve {weak_str}",
                category="coding_lab",
                estimated_hours=3.5,
            ),
            LearningTask(
                id=f"rem-{active_week}-3",
                title=f"Re-take Checkpoint Mock on '{mock_topic}' aiming for >= 7.5 score",
                category="mock_prep",
                estimated_hours=1.5,
            ),
        ]
        affected = [active_week]

        # Apply in-place to roadmap
        for m in current_plan.roadmap:
            if m.week_number == active_week:
                m.checkpoint_score = score
                m.status = "in_progress"
                m.tasks.extend(added_tasks)

    elif score >= 8.5:
        action = "advance"
        is_last_week = active_week >= max_week_num
        reason = (
            f"Exceptional performance! Score {score:.1f}/10 on '{mock_topic}'. "
            + ("All curriculum phases completed with hiring-bar mastery!"
               if is_last_week
               else "You have demonstrated hiring-bar mastery. Marking milestone as completed and advancing to next phase.")
        )
        added_tasks = [
            LearningTask(
                id=f"adv-{active_week}-1",
                title=f"Staff-Level Stretch: Research high-availability edge cases for {mock_topic}",
                category="theory",
                estimated_hours=1.5,
            )
        ]
        affected = [active_week] if is_last_week else [active_week, active_week + 1]

        # Mark current week completed and next week in_progress
        for m in current_plan.roadmap:
            if m.week_number == active_week:
                m.checkpoint_score = score
                m.status = "completed"
                for t in m.tasks:
                    t.completed = True
                if is_last_week:
                    m.tasks.extend(added_tasks)
            elif not is_last_week and m.week_number == active_week + 1:
                m.status = "in_progress"
                m.tasks.extend(added_tasks)

    else:
        action = "reinforce"
        reason = (
            f"Solid foundation shown ({score:.1f}/10) on '{mock_topic}', with minor gaps in {weak_str}. "
            "Maintaining pace while adding 1 review exercise."
        )
        added_tasks = [
            LearningTask(
                id=f"reinf-{active_week}-1",
                title=f"Targeted Review: Analyze rubrics on {weak_str}",
                category="mock_prep",
                estimated_hours=2.0,
            )
        ]
        affected = [active_week]

        for m in current_plan.roadmap:
            if m.week_number == active_week:
                m.checkpoint_score = score
                m.tasks.extend(added_tasks)

    return PlanAdjustment(
        interview_id=interview_id,
        topic=mock_topic,
        score=score,
        action=action,
        reason=reason,
        affected_weeks=affected,
        added_tasks=added_tasks,
    )
