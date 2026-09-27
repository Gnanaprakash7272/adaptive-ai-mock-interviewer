import unittest

from langgraph_workflow.interview_brief import (
    build_interview_brief,
    find_catalogue_role,
    fallback_role_topics,
    plan_interview_topics,
)


PROFILE = {
    "candidate": {"name": "Ada", "email": "ada@example.com", "phone": "555-0100"},
    "skills": {
        "programming_languages": ["Python", "SQL"],
        "frameworks": ["Scikit-learn", "FastAPI"],
        "ai_ml": ["Machine Learning"],
    },
    "projects": [
        {
            "name": "Customer Churn Prediction",
            "description": "Trained a churn model with scikit-learn.",
            "technologies": ["Python", "Scikit-learn", "Pandas"],
            "key_contributions": ["Feature engineering"],
        }
    ],
    "experience": [
        {
            "company": "DataCo",
            "role": "ML Intern",
            "technologies": ["Python", "Pandas"],
            "responsibilities": ["Built training pipelines"],
            "location": "Remote",
        }
    ],
    "potential_interview_topics": ["Python", "Machine Learning"],
}


class TestRoleLookup(unittest.TestCase):
    def test_ai_engineer_exact(self):
        role = find_catalogue_role("AI Engineer")
        self.assertIsNotNone(role)
        self.assertEqual(role["title"], "AI Engineer")

    def test_machine_learning_engineer_alias(self):
        role = find_catalogue_role("Machine Learning Engineer")
        self.assertIsNotNone(role)
        self.assertEqual(role["title"], "ML Engineer")

    def test_backend_from_python_backend_developer(self):
        role = find_catalogue_role("Python Backend Developer")
        self.assertIsNotNone(role)
        self.assertEqual(role["title"], "Backend Developer")

    def test_unknown_role_is_none(self):
        self.assertIsNone(find_catalogue_role("Wizard Coder 999"))

    def test_unknown_role_fallback_topics(self):
        topics = fallback_role_topics("Wizard Coder 999")
        self.assertIn("Technical Skills", topics)


class TestInterviewBrief(unittest.TestCase):
    def test_brief_strips_pii(self):
        brief = build_interview_brief("ML Engineer", PROFILE)
        blob = str(brief)
        self.assertNotIn("ada@example.com", blob)
        self.assertNotIn("555-0100", blob)

    def test_brief_keeps_real_project(self):
        brief = build_interview_brief("ML Engineer", PROFILE)
        names = [p["name"] for p in brief["relevant_projects"]]
        self.assertIn("Customer Churn Prediction", names)

    def test_brief_keeps_real_experience(self):
        brief = build_interview_brief("ML Engineer", PROFILE)
        companies = [e["company"] for e in brief["relevant_experience"]]
        self.assertIn("DataCo", companies)

    def test_topics_include_role_and_project_discussion(self):
        brief = build_interview_brief("ML Engineer", PROFILE)
        role_topics, candidate_topics, available = plan_interview_topics(brief, PROFILE)
        self.assertIn("Python", role_topics)
        self.assertIn("Machine Learning", role_topics)
        self.assertNotIn("Technical Skills", role_topics)
        self.assertIn("Project Discussion", available)

    def test_does_not_invent_projects(self):
        brief = build_interview_brief("ML Engineer", PROFILE)
        for project in brief["relevant_projects"]:
            self.assertEqual(project["name"], "Customer Churn Prediction")


if __name__ == "__main__":
    unittest.main()
