"""
test_interview_state.py

Unit tests for the InterviewState definition.

Tests:
    1. InterviewState imports successfully.
    2. All 16 expected field names are present in INTERVIEW_STATE_FIELDS.
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
            self.fail(
                f"Failed to import InterviewState: {exc}"
            )

    def test_interview_state_class_exists(self):
        """InterviewState must be a class after import."""
        from langgraph_workflow.interview_state import InterviewState
        self.assertTrue(
            isinstance(InterviewState, type),
            "InterviewState must be a class (type)."
        )

    def test_fields_tuple_exists(self):
        """INTERVIEW_STATE_FIELDS must be a non-empty tuple after import."""
        from langgraph_workflow.interview_state import INTERVIEW_STATE_FIELDS
        self.assertIsInstance(
            INTERVIEW_STATE_FIELDS,
            tuple,
            "INTERVIEW_STATE_FIELDS must be a tuple."
        )
        self.assertGreater(
            len(INTERVIEW_STATE_FIELDS),
            0,
            "INTERVIEW_STATE_FIELDS must not be empty."
        )


class TestInterviewStateFields(unittest.TestCase):
    """Test 2 — All 16 expected field names exist in INTERVIEW_STATE_FIELDS."""

    EXPECTED_FIELDS = (
        "user_id",
        "interview_id",
        "candidate_profile",
        "role",
        "available_topics",
        "current_topic",
        "current_difficulty",
        "topics_covered",
        "current_question",
        "current_answer",
        "current_evaluation",
        "adaptive_decision",
        "question_count",
        "max_questions",
        "is_finished",
        "interview_history",
    )

    def _get_fields(self):
        from langgraph_workflow.interview_state import INTERVIEW_STATE_FIELDS
        return INTERVIEW_STATE_FIELDS

    def test_all_expected_fields_present(self):
        """Every expected field must appear in INTERVIEW_STATE_FIELDS."""
        fields = self._get_fields()
        missing = [
            f for f in self.EXPECTED_FIELDS
            if f not in fields
        ]
        self.assertEqual(
            missing,
            [],
            f"Missing fields in INTERVIEW_STATE_FIELDS: {missing}"
        )

    def test_no_extra_fields(self):
        """INTERVIEW_STATE_FIELDS must not contain undeclared fields."""
        fields = self._get_fields()
        extra = [
            f for f in fields
            if f not in self.EXPECTED_FIELDS
        ]
        self.assertEqual(
            extra,
            [],
            f"Unexpected extra fields in INTERVIEW_STATE_FIELDS: {extra}"
        )

    def test_total_field_count(self):
        """INTERVIEW_STATE_FIELDS must contain exactly 16 entries."""
        fields = self._get_fields()
        self.assertEqual(
            len(fields),
            16,
            f"Expected 16 fields, got {len(fields)}: {fields}"
        )

    def test_identity_fields_present(self):
        """Identity fields must exist: user_id, interview_id."""
        fields = self._get_fields()
        for field in ("user_id", "interview_id"):
            self.assertIn(
                field, fields,
                f"Identity field '{field}' is missing."
            )

    def test_profile_fields_present(self):
        """Profile fields must exist: candidate_profile, role, available_topics."""
        fields = self._get_fields()
        for field in ("candidate_profile", "role", "available_topics"):
            self.assertIn(
                field, fields,
                f"Profile field '{field}' is missing."
            )

    def test_context_fields_present(self):
        """Context fields must exist: current_topic, current_difficulty, topics_covered."""
        fields = self._get_fields()
        for field in ("current_topic", "current_difficulty", "topics_covered"):
            self.assertIn(
                field, fields,
                f"Context field '{field}' is missing."
            )

    def test_current_turn_fields_present(self):
        """Per-turn transient fields must exist."""
        fields = self._get_fields()
        for field in (
            "current_question",
            "current_answer",
            "current_evaluation",
            "adaptive_decision",
        ):
            self.assertIn(
                field, fields,
                f"Current-turn field '{field}' is missing."
            )

    def test_progress_fields_present(self):
        """Progress fields must exist: question_count, max_questions, is_finished."""
        fields = self._get_fields()
        for field in ("question_count", "max_questions", "is_finished"):
            self.assertIn(
                field, fields,
                f"Progress field '{field}' is missing."
            )

    def test_history_field_present(self):
        """History field must exist: interview_history."""
        fields = self._get_fields()
        self.assertIn(
            "interview_history", fields,
            "History field 'interview_history' is missing."
        )

    def test_excluded_fields_not_present(self):
        """Fields explicitly excluded from state must NOT appear."""
        fields = self._get_fields()
        excluded = ("raw_resume_text", "resume_id", "report")
        for field in excluded:
            self.assertNotIn(
                field, fields,
                f"Excluded field '{field}' must not be in state."
            )


class TestInterviewStateNoGeminiDependency(unittest.TestCase):
    """Test 3 — The module source has NO reference to Gemini."""

    def _get_module_source(self):
        import langgraph_workflow.interview_state as module
        return inspect.getsource(module)

    def test_no_gemini_import(self):
        """The module must not import google.genai."""
        source = self._get_module_source()
        self.assertNotIn(
            "google.genai",
            source,
            "interview_state.py must not import google.genai (Gemini)."
        )

    def test_no_genai_reference(self):
        """The module must not reference genai."""
        source = self._get_module_source()
        self.assertNotIn(
            "genai",
            source,
            "interview_state.py must not reference 'genai'."
        )

    def test_no_gemini_api_key_reference(self):
        """The module must not reference GEMINI_API_KEY."""
        source = self._get_module_source()
        self.assertNotIn(
            "GEMINI_API_KEY",
            source,
            "interview_state.py must not reference GEMINI_API_KEY."
        )


class TestInterviewStateNoSupabaseDependency(unittest.TestCase):
    """Test 4 — The module source has NO reference to Supabase."""

    def _get_module_source(self):
        import langgraph_workflow.interview_state as module
        return inspect.getsource(module)

    def test_no_supabase_import(self):
        """The module must not import supabase."""
        source = self._get_module_source()
        self.assertNotIn(
            "import supabase",
            source,
            "interview_state.py must not import supabase."
        )

    def test_no_supabase_client_call(self):
        """The module must not reference supabase.table()."""
        source = self._get_module_source()
        self.assertNotIn(
            "supabase.table",
            source,
            "interview_state.py must not call supabase.table()."
        )

    def test_no_supabase_url_reference(self):
        """The module must not reference SUPABASE_URL."""
        source = self._get_module_source()
        self.assertNotIn(
            "SUPABASE_URL",
            source,
            "interview_state.py must not reference SUPABASE_URL."
        )


class TestInterviewStateNoFastAPI(unittest.TestCase):
    """Test 5 — The module can be imported without starting FastAPI."""

    def test_no_fastapi_import(self):
        """interview_state.py must not import fastapi."""
        import langgraph_workflow.interview_state as module
        source = inspect.getsource(module)
        self.assertNotIn(
            "import fastapi",
            source,
            "interview_state.py must not import fastapi."
        )
        self.assertNotIn(
            "from fastapi",
            source,
            "interview_state.py must not import from fastapi."
        )

    def test_module_is_importable_without_env(self):
        """
        Import must succeed even when environment variables are absent.
        Temporarily clears env vars to simulate a cold Python process.
        """
        env_keys = [
            "SUPABASE_URL", "SUPABASE_KEY", "GEMINI_API_KEY", "JWT_SECRET_KEY"
        ]
        saved = {}
        for key in env_keys:
            saved[key] = os.environ.pop(key, None)

        try:
            # Re-import using importlib to force a fresh load
            import importlib
            import langgraph_workflow.interview_state as module
            importlib.reload(module)
            from langgraph_workflow.interview_state import InterviewState
            self.assertIsNotNone(InterviewState)
        except Exception as exc:
            self.fail(
                f"interview_state.py failed to import without env vars: {exc}"
            )
        finally:
            for key, value in saved.items():
                if value is not None:
                    os.environ[key] = value


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    unittest.main(verbosity=2)
