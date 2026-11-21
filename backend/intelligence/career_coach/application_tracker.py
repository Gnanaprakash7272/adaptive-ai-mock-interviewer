"""application_tracker.py

Tracks candidate job applications and learns patterns on which types of roles,
titles, seniority levels, and company sizes get responses / interview callbacks.
"""

from __future__ import annotations

import logging
from collections import Counter
from typing import Any

from intelligence.career_coach.state import JobApplication

logger = logging.getLogger(__name__)


def analyze_application_trends(applications: list[JobApplication]) -> dict[str, Any]:
    """
    Computes callback metrics, response rate, and keyword correlations:
    - Overall response rate (percentage getting callbacks / screening / interview / offer)
    - High-conversion vs low-conversion keywords
    - Funnel stage counts
    """
    total = len(applications)
    if total == 0:
        return {
            "total_applications": 0,
            "response_rate": 0.0,
            "funnel": {
                "applied": 0,
                "screening": 0,
                "interview": 0,
                "offer": 0,
                "rejected": 0,
            },
            "top_converting_keywords": [],
            "low_converting_keywords": [],
            "insights": [
                "Track at least 3-5 job applications to let the AI coach learn which role titles and descriptions generate the highest interview callbacks."
            ],
        }

    funnel_counts: dict[str, int] = {
        "applied": 0,
        "screening": 0,
        "interview": 0,
        "offer": 0,
        "rejected": 0,
    }

    positive_keywords: list[str] = []
    neutral_keywords: list[str] = []

    positive_statuses = {"screening", "interview", "offer"}

    for app in applications:
        st = app.status.lower()
        if st in funnel_counts:
            funnel_counts[st] += 1
        else:
            funnel_counts["applied"] += 1

        is_positive = bool(app.response_received) or (st in positive_statuses)

        # Tokenize role title defensively
        title_raw = (app.role_title or "").strip()
        words = [w.strip(" ,.-/()").title() for w in title_raw.split() if len(w) > 2]
        if is_positive:
            positive_keywords.extend(words)
        else:
            neutral_keywords.extend(words)

    pos_count = sum(
        1 for a in applications
        if bool(a.response_received) or (a.status.lower() in positive_statuses)
    )
    response_rate = round((pos_count / total) * 100, 1)

    # Word frequencies
    pos_freq = Counter(positive_keywords)
    top_converting = [w for w, _ in pos_freq.most_common(5)]

    insights: list[str] = []
    if response_rate >= 30.0:
        insights.append(f"Strong response velocity! {response_rate}% of submitted applications converted into recruiter screenings or interview rounds.")
    elif total >= 5 and response_rate < 15.0:
        insights.append("Callback rate is below industry average (15%). Recommend pivoting resume keywords towards specific technologies in your Portfolio Projects.")

    if top_converting:
        top_str = ", ".join(top_converting[:3])
        insights.append(f"Roles mentioning '{top_str}' have your highest callback conversion rate.")

    if funnel_counts["interview"] > 0:
        insights.append(f"{funnel_counts['interview']} active interview loops in flight. Schedule targeted checkpoint mocks before round dates.")

    return {
        "total_applications": total,
        "response_rate": response_rate,
        "funnel": funnel_counts,
        "top_converting_keywords": top_converting,
        "insights": insights,
    }


def generate_application_recommendations(
    applications: list[JobApplication],
    target_role: str,
) -> list[str]:
    """Returns AI recommendations on where to focus application energy."""
    metrics = analyze_application_trends(applications)
    recs: list[str] = []

    if metrics["total_applications"] < 5:
        recs.append(f"Aim for 5-10 tailored applications this week targeting '{target_role}' positions.")
        recs.append("Include your top Portfolio Project link at the very top of your resume and GitHub profile.")
    else:
        top_keys = metrics.get("top_converting_keywords", [])
        if top_keys:
            recs.append(f"Double down on postings featuring '{top_keys[0]}' in the job spec.")
        recs.append("Follow up with recruiter or hiring manager on LinkedIn within 5 days of submission.")

    return recs
