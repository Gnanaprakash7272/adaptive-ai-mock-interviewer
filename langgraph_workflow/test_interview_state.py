"""
test_interview_state.py

Unit tests for the InterviewState definition.

Tests:
    1. InterviewState imports successfully.
    2. All expected field names are present in INTERVIEW_STATE_FIELDS.
    3. The module source has NO reference to Gemini.
    4. The module source has NO reference to Supabase.
    5. The module imports without starting FastAPI.

This test requires NO external services, NO environment variables,
and makes NO network calls.
"""

import sys
import os
import unittest
import inspect


# ---------------------------------------------------------------------------
# Ensure project root is on the path when run with:
#     uv run python -m langgraph_workflow.test_interview_state
# ---------------------------------------------------------------------------

_PROJECT_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..")
)
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)


class TestInterviewStateImport(unittest.TestCase):
    """Test 1 — InterviewState imports successfully."""

    def test_import_interview_state(self):
        """Importing the module must not raise any exception."""
        try:
            from langgraph_workflow.interview_state import (
                InterviewState,
                INTERVIEW_STATE_FIELDS,
            )
        except ImportError as exc:
            self.fail(f"Failed to import InterviewState: {exc}")

    def test_interview_state_class_exists(self):
        """InterviewState must be a class after import."""
        from langgraph_workflow.interview_state import InterviewState
        self.assertTrue(
            isinstance(InterviewState, type),
            "InterviewState must be a class (type).",
        )

    def test_fields_tuple_exists(self):
        """INTERVIEW_STATE_FIELDS must be a non-empty tuple after import."""
        from langgraph_workflow.interview_state import INTERVIEW_STATE_FIELDS
        self.assertIsInstance(INTERVIEW_STATE_FIELDS, tuple,
                              "INTERVIEW_STATE_FIELDS must be a tuple.")
        self.assertGreater(len(INTERVIEW_STATE_FIELDS), 0,
                           "INTERVIEW_STATE_FIELDS must not be empty.")


class TestInterviewStateFields(unittest.TestCase):
    """Test 2 — All expected field names exist in INTERVIEW_STATE_FIELDS."""

    # Canonical field list — single source of truth for these tests.
    EXPECTED_FIELDS = (
        "user_id",
        "interview_id",
        "candidate_profile",
        "role",
        "role_topics",
        "candidate_topics",
        "available_topics",
        "current_topic",
        "current_difficulty",
        "topics_covered",
        "topics_visited",       # Added Phase 1: ping-pong prevention
        "current_question",
        "current_answer",
        "current_evaluation",
        "adaptive_decision",
        "question_count",
        "max_questions",
        "is_finished",
        "interview_history",
        "interview_brief",
        "followups_on_current_topic",
        "max_followups_per_topic",
        "interviewer_feedback",
        "final_report",
    )

    def _get_fields(self):
        from langgraph_workflow.interview_state import INTERVIEW_STATE_FIELDS
        return INTERVIEW_STATE_FIELDS

    def test_all_expected_fields_present(self):
        """Every expected field must appear in INTERVIEW_STATE_FIELDS."""
        fields = self._get_fields()
        missing = [f for f in self.EXPECTED_FIELDS if f not in fields]
        self.assertEqual(missing, [], f"Missing fields: {missing}")

    def test_no_extra_fields(self):
        """INTERVIEW_STATE_FIELDS must not contain undeclared fields."""
        fields = self._get_fields()
        extra = [f for f in fields if f not in self.EXPECTED_FIELDS]
        self.assertEqual(extra, [], f"Unexpected extra fields: {extra}")

    def test_total_field_count(self):
        """INTERVIEW_STATE_FIELDS must contain exactly 24 entries."""
        fields = self._get_fields()
        self.assertEqual(
            len(fields), 24,
            f"Expected 24 fields, got {len(fields)}: {fields}",
        )

    def test_identity_fields_present(self):
        fields = self._get_fields()
        for field in ("user_id", "interview_id"):
            self.assertIn(field, fields, f"Identity field '{field}' is missing.")

    def test_profile_fields_present(self):
        fields = self._get_fields()
        for field in ("candidate_profile", "role", "role_topics",
                      "candidate_topics", "available_topics"):
            self.assertIn(field, fields, f"Profile field '{field}' is missing.")

    def test_context_fields_present(self):
        fields = self._get_fields()
        for field in ("current_topic", "current_difficulty", "topics_covered"):
            self.assertIn(field, fields, f"Context field '{field}' is missing.")

    def test_current_turn_fields_present(self):
        fields = self._get_fields()
        for field in ("current_question", "current_answer",
                      "current_evaluation", "adaptive_decision"):
            self.assertIn(field, fields, f"Current-turn field '{field}' is missing.")

    def test_progress_fields_present(self):
        fields = self._get_fields()
        for field in ("question_count", "max_questions", "is_finished"):
            self.assertIn(field, fields, f"Progress field '{field}' is missing.")

    def test_history_field_present(self):
        fields = self._get_fields()
        self.assertIn("interview_history", fields)

    def test_excluded_fields_not_present(self):
        """Fields explicitly excluded from state must NOT appear."""
        fields = self._get_fields()
        for field in ("raw_resume_text", "resume_id", "report"):
            self.assertNotIn(field, fields,
                             f"Excluded field '{field}' must not be in state.")


class TestInterviewStateNoGeminiDependency(unittest.TestCase):
    """Test 3 — The module source has NO reference to Gemini."""

    def _src(self):
        import langgraph_workflow.interview_state as m
        return inspect.getsource(m)

    def test_no_gemini_import(self):
        self.assertNotIn("google.genai", self._src())

    def test_no_genai_reference(self):
        self.assertNotIn("genai", self._src())

    def test_no_gemini_api_key_reference(self):
        self.assertNotIn("GEMINI_API_KEY", self._src())


class TestInterviewStateNoSupabaseDependency(unittest.TestCase):
    """Test 4 — The module source has NO reference to Supabase."""

    def _src(self):
        import langgraph_workflow.interview_state as m
        return inspect.getsource(m)

    def test_no_supabase_import(self):
        self.assertNotIn("import supabase", self._src())

    def test_no_supabase_client_call(self):
        self.assertNotIn("supabase.table", self._src())

    def test_no_supabase_url_reference(self):
        self.assertNotIn("SUPABASE_URL", self._src())


class TestInterviewStateNoFastAPI(unittest.TestCase):
    """Test 5 — The module can be imported without starting FastAPI."""

    def _src(self):
        import langgraph_workflow.interview_state as m
        return inspect.getsource(m)

    def test_no_fastapi_import(self):
        src = self._src()
        self.assertNotIn("import fastapi", src)
        self.assertNotIn("from fastapi", src)

    def test_module_is_importable_without_env(self):
        """Import must succeed even when environment variables are absent."""
        env_keys = ["SUPABASE_URL", "SUPABASE_KEY", "GEMINI_API_KEY", "JWT_SECRET_KEY"]
        saved = {}
        for key in env_keys:
            saved[key] = os.environ.pop(key, None)
        try:
            import importlib
            import langgraph_workflow.interview_state as module
            importlib.reload(module)
            from langgraph_workflow.interview_state import InterviewState
            self.assertIsNotNone(InterviewState)
        except Exception as exc:
            self.fail(f"interview_state.py failed to import without env vars: {exc}")
        finally:
            for key, value in saved.items():
                if value is not None:
                    os.environ[key] = value


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    unittest.main(verbosity=2)
