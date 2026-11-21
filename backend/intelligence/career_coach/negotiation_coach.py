"""negotiation_coach.py

Offer negotiation and down-leveling defense engine specifically crafted
for career pivoters and high-growth engineers.
Provides:
1. Down-leveling defense scripts (protecting L4/L5 senior titles vs recruiters claiming "lack of direct past title")
2. Word-for-word counter-offer email templates
3. Phone negotiation talking points and leverage levers (equity vs base vs sign-on)
4. Market compensation benchmarks (P50, P75, P90)
"""

from __future__ import annotations

import logging
from typing import Any

from gemini_config import call_gemini_json
from intelligence.career_coach.state import NegotiationStrategy

logger = logging.getLogger(__name__)

NEGOTIATION_SYSTEM_PROMPT = """You are a Silicon Valley Executive Compensation Negotiator and Former Tech VP.
Your mission is to equip an engineering candidate with a high-leverage offer negotiation and down-leveling defense strategy.
Career pivoters frequently face "down-leveling" attempts from recruiters who argue that their past title does not match 1:1.

Provide:
1. down_leveling_defense: 3-4 bullet arguments reframing past engineering background as a multidisciplinary superpower and parity with target level.
2. counter_offer_script: A professional, polished, high-leverage email template the candidate can customize and send to the recruiter.
3. verbal_talking_points: 3-4 concise conversational points for a live phone call with HR/recruiter.
4. benchmarks: Salary bands (P50, P75, P90) for this role.
5. leverage_strategies: 3 tactical negotiation levers (e.g. accelerating first performance review to 6 months, expanding sign-on bonus to bridge equity vesting, or performance milestones).

Return ONLY valid JSON matching this schema:
{
  "target_role": "string",
  "down_leveling_defense": ["string"],
  "counter_offer_script": "string",
  "verbal_talking_points": ["string"],
  "benchmarks": {
    "P50_Market": "$135,000 - $150,000",
    "P75_Competitive": "$155,000 - $175,000",
    "P90_Top_Tier": "$180,000 - $210,000"
  },
  "leverage_strategies": ["string"]
}"""


def _fallback_negotiation(
    target_role: str,
    years_of_experience: float,
    offered_base: float | None = None,
    target_base: float | None = None,
    competing_offers: bool = False,
) -> NegotiationStrategy:
    """Deterministic negotiation and down-leveling defense toolkit."""
    offered_str = f"${int(offered_base):,}" if offered_base else "$130,000"
    target_str = f"${int(target_base):,}" if target_base else "$155,000"

    comp_note = (
        "I am currently in final interview rounds with two other teams with target compensation in the $150k-$165k range. "
        if competing_offers
        else "Based on market benchmarks for this scope and my track record of independent execution, "
    )

    counter_script = f"""Subject: Re: Offer from [Company Name] - {target_role} - [Your Name]

Hi [Recruiter Name],

Thank you so much for the offer to join [Company Name] as a {target_role}! I thoroughly enjoyed meeting the team, and I am genuinely excited about the engineering challenges we discussed.

After reviewing the initial compensation details ({offered_str} base), I wanted to discuss aligning the package with the senior impact and technical breadth required for this position. {comp_note}I would be thrilled to sign immediately if we can adjust the base compensation to {target_str} (or bridge the difference via an initial signing bonus of $20,000).

Given my background bringing cross-functional engineering execution and the production portfolio architectures I shared during technical rounds, I know I will deliver immediate value from Day 1.

Could we schedule a brief 10-minute call tomorrow to discuss how we can make this work for both sides?

Best regards,
[Your Name]
[Your Phone Number]"""

    return NegotiationStrategy(
        target_role=target_role,
        down_leveling_defense=[
            "Focus on Execution Proof Over Past Titles: Remind the hiring manager that in technical rounds, your system design, concurrency solutions, and coding performance were evaluated against target hiring bar rubrics.",
            "Reframe Past Experience as Cross-Disciplinary Leverage: Having a background in fullstack/frontend or QA means you build APIs that client teams integrate 2x faster with fewer back-and-forth contract issues.",
            "Request an Accelerated 6-Month Level Review: If the company insists on initial entry at a lower band, secure a contractual agreement for an expedited 6-month promotion/compensation review with explicit written deliverables.",
        ],
        counter_offer_script=counter_script,
        verbal_talking_points=[
            "\"I'm extremely excited about the mission and the team, and I want to make joining an easy decision for both of us.\"",
            "\"My technical interviews demonstrated that I operate at the target scope. Can we adjust the base or equity to reflect market P75 for this level?\"",
            "\"If base salary is constrained by internal band equity, let's explore a one-time sign-on bonus or additional stock grants to bridge the gap.\"",
        ],
        benchmarks={
            "P50_Market": "$125,000 - $145,000 (Base) + $15k Equity",
            "P75_Competitive": "$150,000 - $175,000 (Base) + $35k Equity",
            "P90_Top_Tier_FAANG": "$180,000 - $215,000 (Base) + $80k Equity",
        },
        leverage_strategies=[
            "Sign-on Bonus Bridge: Recruiters have significantly more discretionary budget for one-time sign-on bonuses than permanent base salary bands.",
            "Early Vesting / Equity Refresh: Negotiate a shorter cliff (e.g. monthly vesting after 6 months or an accelerated 1-year refresh cycle).",
            "Remote Stipend & Learning Budget: Secure a guaranteed home-office hardware budget and annual $3,000 conference/learning stipend.",
        ],
    )


def generate_negotiation_strategy(
    target_role: str,
    years_of_experience: float = 2.0,
    offered_base: float | None = None,
    target_base: float | None = None,
    competing_offers: bool = False,
) -> NegotiationStrategy:
    """Generates customized counter-offer scripts and down-leveling defense."""
    user_prompt = f"""Target Role: {target_role}
Years of Experience: {years_of_experience}
Offered Base Salary: {offered_base or 'Not specified yet'}
Target Desired Base Salary: {target_base or 'Market P75'}
Candidate has Competing Offers: {competing_offers}

Generate the comprehensive down-leveling defense and negotiation toolkit."""

    try:
        data = call_gemini_json(
            system_prompt=NEGOTIATION_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            temperature=0.3,
            max_output_tokens=1800,
            operation="career_coach_negotiation",
        )
        return NegotiationStrategy(
            target_role=data.get("target_role", target_role),
            down_leveling_defense=data.get("down_leveling_defense", []),
            counter_offer_script=data.get("counter_offer_script", ""),
            verbal_talking_points=data.get("verbal_talking_points", []),
            benchmarks=data.get("benchmarks", {}),
            leverage_strategies=data.get("leverage_strategies", []),
        )
    except Exception as exc:
        logger.warning("Gemini negotiation generation failed (%s); using fallback toolkit", exc)
        return _fallback_negotiation(target_role, years_of_experience, offered_base, target_base, competing_offers)
