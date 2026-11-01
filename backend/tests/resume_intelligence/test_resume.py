"""
Proper pytest tests for resume_analyzer.

Replaces the old script-style test_resume.py that required a personal
PDF file on disk. All Gemini calls are mocked.
"""
import json
from unittest.mock import patch

import pytest

from resume_intelligence.resume_analyzer import (
    CANDIDATE_PROFILE_SCHEMA,
    _clean_profile,
    _dedupe_list,
    _merge_with_schema,
    analyze_resume,
    build_user_prompt,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _minimal_profile(**overrides) -> dict:
    """Return a minimal valid profile based on the schema."""
    p = json.loads(json.dumps(CANDIDATE_PROFILE_SCHEMA))
    p["candidate"]["name"] = "Test Candidate"
    p["potential_interview_topics"] = ["Python", "FastAPI"]
    p.update(overrides)
    return p


# ---------------------------------------------------------------------------
# Unit tests — no I/O
# ---------------------------------------------------------------------------

class TestDedupeList:
    def test_dedupes_case_insensitive(self):
        assert _dedupe_list(["Python", "python", "PYTHON"]) == ["Python"]

    def test_preserves_order(self):
        result = _dedupe_list(["B", "A", "C"])
        assert result == ["B", "A", "C"]

    def test_ignores_non_list(self):
        assert _dedupe_list("not a list") == "not a list"

    def test_non_string_items_kept(self):
        items = [{"a": 1}, {"b": 2}]
        assert _dedupe_list(items) == items


class TestMergeWithSchema:
    def test_fills_missing_keys(self):
        result = _merge_with_schema({}, CANDIDATE_PROFILE_SCHEMA)
        assert "candidate" in result
        assert result["candidate"]["name"] == ""

    def test_preserves_provided_values(self):
        data = {"candidate": {"name": "Alice", "email": "", "phone": "", "location": ""}}
        result = _merge_with_schema(data, CANDIDATE_PROFILE_SCHEMA)
        assert result["candidate"]["name"] == "Alice"

    def test_coerces_wrong_types(self):
        data = {"skills": "not a dict"}
        result = _merge_with_schema(data, CANDIDATE_PROFILE_SCHEMA)
        assert isinstance(result["skills"], dict)


class TestCleanProfile:
    def test_dedupes_skills(self):
        profile = json.loads(json.dumps(CANDIDATE_PROFILE_SCHEMA))
        profile["skills"]["programming_languages"] = ["Python", "python", "Java"]
        result = _clean_profile(profile)
        assert result["skills"]["programming_languages"] == ["Python", "Java"]

    def test_dedupes_projects_by_name(self):
        profile = json.loads(json.dumps(CANDIDATE_PROFILE_SCHEMA))
        profile["projects"] = [
            {"name": "SENTRIX", "description": "a"},
            {"name": "sentrix", "description": "b"},
        ]
        result = _clean_profile(profile)
        assert len(result["projects"]) == 1

    def test_dedupes_simple_lists(self):
        profile = json.loads(json.dumps(CANDIDATE_PROFILE_SCHEMA))
        profile["potential_interview_topics"] = ["Python", "Python", "FastAPI"]
        result = _clean_profile(profile)
        assert result["potential_interview_topics"] == ["Python", "FastAPI"]


class TestBuildUserPrompt:
    def test_contains_resume_text(self):
        prompt = build_user_prompt("some cleaned text")
        assert "some cleaned text" in prompt

    def test_contains_schema(self):
        prompt = build_user_prompt("x")
        assert "potential_interview_topics" in prompt


class TestAnalyzeResume:
    def test_raises_on_empty_input(self):
        with pytest.raises(ValueError, match="empty"):
            analyze_resume("")

    def test_raises_on_whitespace_only(self):
        with pytest.raises(ValueError, match="empty"):
            analyze_resume("   \n  ")

    def test_success_path(self):
        """Happy path: Gemini returns a valid profile dict."""
        valid_profile = _minimal_profile()
        with patch("resume_intelligence.resume_analyzer.call_gemini_json",
                   return_value=valid_profile):
            result = analyze_resume("some resume text")
        assert result["candidate"]["name"] == "Test Candidate"
        assert isinstance(result["skills"], dict)

    def test_propagates_runtime_error(self):
        """Quota/API errors from call_gemini_json are not swallowed."""
        with patch("resume_intelligence.resume_analyzer.call_gemini_json",
                   side_effect=RuntimeError("all keys exhausted")):
            with pytest.raises(RuntimeError, match="all keys exhausted"):
                analyze_resume("resume text")

    def test_non_dict_response_raises(self):
        """If Gemini returns a JSON array instead of an object, raise ValueError."""
        with patch("resume_intelligence.resume_analyzer.call_gemini_json",
                   return_value=[1, 2, 3]):
            with pytest.raises(ValueError, match="not a JSON object"):
                analyze_resume("resume text")

    def test_missing_fields_filled_from_schema(self):
        """Missing fields must be populated from CANDIDATE_PROFILE_SCHEMA defaults."""
        partial = {"candidate": {"name": "Bob", "email": "", "phone": "", "location": ""}}
        with patch("resume_intelligence.resume_analyzer.call_gemini_json",
                   return_value=partial):
            result = analyze_resume("resume text")
        assert "potential_interview_topics" in result
        assert isinstance(result["potential_interview_topics"], list)
