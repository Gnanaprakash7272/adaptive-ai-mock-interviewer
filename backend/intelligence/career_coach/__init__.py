"""Career Pivot Coach Intelligence Package.

Provides agentic capabilities for:
- Skill-gap mapping from resume & target job descriptions
- Dynamic week-by-week learning roadmaps
- Portfolio project blueprint generation
- Closed-loop roadmap adaptation from mock interview rubrics
- Job application tracking and callback pattern learning
"""

from intelligence.career_coach.state import (
    JobApplication,
    LearningTask,
    PivotPlan,
    PlanAdjustment,
    PortfolioProject,
    SkillGapMap,
    WeeklyMilestone,
)
from intelligence.career_coach.gap_analyzer import analyze_skill_gaps
from intelligence.career_coach.roadmap_generator import generate_learning_roadmap
from intelligence.career_coach.portfolio_architect import generate_portfolio_projects
from intelligence.career_coach.adaptive_engine import adjust_roadmap_after_mock
from intelligence.career_coach.application_tracker import (
    analyze_application_trends,
    generate_application_recommendations,
)

__all__ = [
    "SkillGapMap",
    "LearningTask",
    "WeeklyMilestone",
    "PortfolioProject",
    "JobApplication",
    "PivotPlan",
    "PlanAdjustment",
    "analyze_skill_gaps",
    "generate_learning_roadmap",
    "generate_portfolio_projects",
    "adjust_roadmap_after_mock",
    "analyze_application_trends",
    "generate_application_recommendations",
]
