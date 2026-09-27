"""
test_interview_repository.py

Unit tests for api/interview_repository.py.

All Supabase calls are mocked — no live database required.
No network access. No environment variables required.

Each test gets a fresh MagicMock injected into repo.supabase to ensure
complete isolation — no side_effect bleed between tests.
"""

import json
import unittest
from unittest.mock import MagicMock, patch
import sys
import types

# ---------------------------------------------------------------------------
# Bootstrap: If api.db is missing env vars, mock it so we can import.
# ---------------------------------------------------------------------------

try:
    import api.db
except ValueError:
    import sys, types
    from unittest.mock import MagicMock
    _fake_db = types.ModuleType("api.db")
    _fake_db.supabase = MagicMock()
    sys.modules.setdefault("api", types.ModuleType("api"))
    sys.modules["api.db"] = _fake_db

import api.interview_repository as repo  # noqa: E402



# ---------------------------------------------------------------------------
# Base class: gives each test a freshly-built supabase mock
# ---------------------------------------------------------------------------

class RepoTestCase(unittest.TestCase):
    """
    Before every test, replace repo.supabase with a brand-new MagicMock.
    This ensures no side_effect / return_value bleed between tests.
    """

    def setUp(self):
        self.db = MagicMock()
        repo.supabase = self.db

    # ------------------------------------------------------------------
    # Helpers to build fluent mock chains
    # ------------------------------------------------------------------

    def _result(self, data: list) -> MagicMock:
        m = MagicMock()
        m.data = data
        return m

    def _insert_chain(self, table_name: str, rows: list):
        """Mock: db.table(table_name).insert(...).execute() → _result(rows)"""
        self.db.table.return_value.insert.return_value.execute.return_value = (
            self._result(rows)
        )

    def _insert_chain_raises(self, exc: Exception):
        self.db.table.return_value.insert.return_value.execute.side_effect = exc

    def _update_chain(self, rows: list):
        """Mock: db.table().update().eq().execute() → _result(rows)"""
        (self.db.table.return_value
             .update.return_value
             .eq.return_value
             .execute.return_value) = self._result(rows)

    def _update_chain_raises(self, exc: Exception):
        (self.db.table.return_value
             .update.return_value
             .eq.return_value
             .execute.side_effect) = exc

    def _select_chain(self, rows: list):
        """Mock: db.table().select().eq().limit().execute() → _result(rows)"""
        (self.db.table.return_value
             .select.return_value
             .eq.return_value
             .limit.return_value
             .execute.return_value) = self._result(rows)

    def _select_chain_raises(self, exc: Exception):
        (self.db.table.return_value
             .select.return_value
             .eq.return_value
             .limit.return_value
             .execute.side_effect) = exc

    def _select_order_chain(self, rows: list):
        """Mock: db.table().select().eq().order().execute() → _result(rows)"""
        (self.db.table.return_value
             .select.return_value
             .eq.return_value
             .order.return_value
             .execute.return_value) = self._result(rows)

    def _select_order_chain_raises(self, exc: Exception):
        (self.db.table.return_value
             .select.return_value
             .eq.return_value
             .order.return_value
             .execute.side_effect) = exc

    def _last_insert_payload(self) -> dict:
        return self.db.table.return_value.insert.call_args[0][0]

    def _last_update_payload(self) -> dict:
        return self.db.table.return_value.update.call_args[0][0]


# ===========================================================================
# 1-2  create_interview
# ===========================================================================

class TestCreateInterview(RepoTestCase):

    def test_01_success_returns_row_with_interview_id(self):
        row = {"interview_id": 5, "user_id": 1, "role": "Backend Engineer",
               "status": "started", "max_questions": 10, "question_count": 0}
        self._insert_chain("interviews", [row])

        result = repo.create_interview(user_id=1, role="Backend Engineer", max_questions=10)

        self.assertEqual(result["interview_id"], 5)
        self.assertEqual(result["status"], "started")
        self.assertEqual(result["question_count"], 0)

    def test_01b_resume_id_omitted_when_not_given(self):
        self._insert_chain("interviews", [{"interview_id": 6}])
        repo.create_interview(user_id=1, role="DevOps", max_questions=5)
        self.assertNotIn("resume_id", self._last_insert_payload())

    def test_01c_resume_id_included_when_given(self):
        self._insert_chain("interviews", [{"interview_id": 7}])
        repo.create_interview(user_id=2, role="ML Engineer", max_questions=8, resume_id=3)
        self.assertEqual(self._last_insert_payload()["resume_id"], 3)

    def test_01d_status_always_started(self):
        self._insert_chain("interviews", [{"interview_id": 8}])
        repo.create_interview(user_id=1, role="Dev", max_questions=10)
        self.assertEqual(self._last_insert_payload()["status"], "started")

    def test_01e_question_count_always_zero(self):
        self._insert_chain("interviews", [{"interview_id": 9}])
        repo.create_interview(user_id=1, role="Dev", max_questions=10)
        self.assertEqual(self._last_insert_payload()["question_count"], 0)

    def test_02_propagates_error_as_runtime_error(self):
        self._insert_chain_raises(Exception("connection refused"))
        with self.assertRaises(RuntimeError) as ctx:
            repo.create_interview(user_id=1, role="Dev", max_questions=10)
        self.assertIn("create_interview failed", str(ctx.exception))


# ===========================================================================
# 3-5  update_interview_state
# ===========================================================================

class TestUpdateInterviewState(RepoTestCase):

    def test_03_success_returns_updated_row(self):
        self._update_chain([{"interview_id": 1, "current_topic": "Python",
                             "current_difficulty": "hard", "question_count": 2}])
        result = repo.update_interview_state(
            1, current_topic="Python", current_difficulty="hard", question_count=2
        )
        self.assertEqual(result["current_topic"], "Python")

    def test_03b_only_supplied_fields_in_payload(self):
        self._update_chain([{"interview_id": 1, "current_topic": "SQL"}])
        repo.update_interview_state(1, current_topic="SQL")
        payload = self._last_update_payload()
        self.assertIn("current_topic", payload)
        self.assertNotIn("current_difficulty", payload)
        self.assertNotIn("question_count", payload)

    def test_03c_all_optional_fields_can_be_set(self):
        self._update_chain([{"interview_id": 1}])
        repo.update_interview_state(
            1, current_topic="Go", current_difficulty="easy",
            question_count=3, max_questions=5, status="in_progress"
        )
        payload = self._last_update_payload()
        for key in ("current_topic", "current_difficulty",
                    "question_count", "max_questions", "status"):
            self.assertIn(key, payload)

    def test_04_raises_value_error_when_no_fields_given(self):
        with self.assertRaises(ValueError):
            repo.update_interview_state(1)

    def test_05_propagates_error_as_runtime_error(self):
        self._update_chain_raises(Exception("timeout"))
        with self.assertRaises(RuntimeError) as ctx:
            repo.update_interview_state(1, current_topic="Go")
        self.assertIn("update_interview_state failed", str(ctx.exception))


# ===========================================================================
# 6-7  create_question
# ===========================================================================

class TestCreateQuestion(RepoTestCase):

    def test_06_success_returns_row_with_question_id(self):
        self._insert_chain("questions", [{"question_id": 10, "interview_id": 1}])
        result = repo.create_question(
            interview_id=1, question_text="What is OOP?",
            topic="Python", difficulty="medium", question_type="technical",
            question_order=1, expected_concepts=["classes", "inheritance"]
        )
        self.assertEqual(result["question_id"], 10)

    def test_07_expected_concepts_stored_as_list(self):
        self._insert_chain("questions", [{"question_id": 11}])
        concepts = ["closures", "decorators", "generators"]
        repo.create_question(interview_id=1, question_text="Closures?",
                             expected_concepts=concepts)
        payload = self._last_insert_payload()
        self.assertIsInstance(payload["expected_concepts"], list)
        self.assertEqual(payload["expected_concepts"], concepts)

    def test_07b_expected_concepts_none_not_in_payload(self):
        self._insert_chain("questions", [{"question_id": 12}])
        repo.create_question(interview_id=1, question_text="What is REST?")
        self.assertNotIn("expected_concepts", self._last_insert_payload())

    def test_07c_optional_fields_omitted_when_none(self):
        self._insert_chain("questions", [{"question_id": 13}])
        repo.create_question(interview_id=1, question_text="Q?")
        payload = self._last_insert_payload()
        for field in ("topic", "difficulty", "question_type", "question_order"):
            self.assertNotIn(field, payload)


# ===========================================================================
# 8-9  create_answer
# ===========================================================================

class TestCreateAnswer(RepoTestCase):

    def test_08_success_returns_row_with_answer_id(self):
        self._insert_chain("answers", [{"answer_id": 20, "question_id": 10}])
        result = repo.create_answer(question_id=10, answer_text="OOP is ...")
        self.assertEqual(result["answer_id"], 20)

    def test_08b_correct_fields_in_payload(self):
        self._insert_chain("answers", [{"answer_id": 21}])
        repo.create_answer(question_id=10, answer_text="My answer")
        payload = self._last_insert_payload()
        self.assertEqual(payload["question_id"], 10)
        self.assertEqual(payload["answer_text"], "My answer")

    def test_09_propagates_error(self):
        self._insert_chain_raises(Exception("unique violation"))
        with self.assertRaises(RuntimeError) as ctx:
            repo.create_answer(question_id=10, answer_text="dup")
        self.assertIn("create_answer failed", str(ctx.exception))

    def test_09b_get_answer_returns_row_when_found(self):
        self._select_chain([{"answer_id": 22, "question_id": 11, "answer_text": "text"}])
        result = repo.get_answer_by_question_id(11)
        self.assertIsNotNone(result)
        self.assertEqual(result["answer_id"], 22)

    def test_09c_get_answer_returns_none_when_not_found(self):
        self._select_chain([])
        result = repo.get_answer_by_question_id(999)
        self.assertIsNone(result)

    def test_09d_get_answer_propagates_error(self):
        self._select_chain_raises(Exception("DB error"))
        with self.assertRaises(RuntimeError) as ctx:
            repo.get_answer_by_question_id(10)
        self.assertIn("get_answer_by_question_id failed", str(ctx.exception))


# ===========================================================================
# 10-12  create_evaluation
# ===========================================================================

class TestCreateEvaluation(RepoTestCase):

    def test_10_success_returns_row_with_evaluation_id(self):
        self._insert_chain("evaluations", [{"evaluation_id": 30, "answer_id": 20}])
        result = repo.create_evaluation(
            answer_id=20, score=8, correctness=8, completeness=7,
            technical_depth=7, confidence=0.9,
            missing_concepts=["GC"], feedback="Good.", needs_followup=False
        )
        self.assertEqual(result["evaluation_id"], 30)

    def test_11_missing_concepts_json_serialised_to_string(self):
        self._insert_chain("evaluations", [{"evaluation_id": 31}])
        concepts = ["memory management", "pointers"]
        repo.create_evaluation(answer_id=21, missing_concepts=concepts)
        payload = self._last_insert_payload()
        stored = payload["missing_concepts"]
        self.assertIsInstance(stored, str, "missing_concepts must be a TEXT string")
        self.assertEqual(json.loads(stored), concepts,
                         "JSON round-trip must recover original list")

    def test_12_missing_concepts_none_not_in_payload(self):
        self._insert_chain("evaluations", [{"evaluation_id": 32}])
        repo.create_evaluation(answer_id=22, score=6)
        self.assertNotIn("missing_concepts", self._last_insert_payload())

    def test_12b_technical_depth_coerced_to_int(self):
        self._insert_chain("evaluations", [{"evaluation_id": 33}])
        repo.create_evaluation(answer_id=23, technical_depth=7.9)
        payload = self._last_insert_payload()
        self.assertIsInstance(payload["technical_depth"], int)
        self.assertEqual(payload["technical_depth"], 7)

    def test_12c_needs_followup_coerced_to_bool(self):
        self._insert_chain("evaluations", [{"evaluation_id": 34}])
        repo.create_evaluation(answer_id=24, needs_followup=1)
        payload = self._last_insert_payload()
        self.assertIsInstance(payload["needs_followup"], bool)
        self.assertTrue(payload["needs_followup"])


# ===========================================================================
# 13-14  create_adaptive_decision
# ===========================================================================

class TestCreateAdaptiveDecision(RepoTestCase):

    def test_13_success_returns_row_with_decision_id(self):
        self._insert_chain("adaptive_decisions", [
            {"decision_id": 40, "evaluation_id": 30,
             "next_action": "increase_difficulty", "next_topic": "Python"}
        ])
        result = repo.create_adaptive_decision(
            evaluation_id=30, next_action="increase_difficulty",
            next_topic="Python", difficulty="hard", reason="Score was high."
        )
        self.assertEqual(result["decision_id"], 40)
        self.assertEqual(result["next_action"], "increase_difficulty")

    def test_13b_optional_fields_omitted_when_none(self):
        self._insert_chain("adaptive_decisions", [{"decision_id": 41}])
        repo.create_adaptive_decision(evaluation_id=30)
        payload = self._last_insert_payload()
        self.assertEqual(payload, {"evaluation_id": 30})

    def test_14_propagates_error(self):
        self._insert_chain_raises(Exception("FK violation"))
        with self.assertRaises(RuntimeError) as ctx:
            repo.create_adaptive_decision(evaluation_id=999)
        self.assertIn("create_adaptive_decision failed", str(ctx.exception))


# ===========================================================================
# 15-16  complete_interview
# ===========================================================================

class TestCompleteInterview(RepoTestCase):

    def test_15_sets_status_completed_and_timestamp(self):
        self._update_chain([{"interview_id": 1, "status": "completed",
                             "completed_at": "2026-09-24T14:00:00+00:00"}])
        result = repo.complete_interview(1)
        self.assertEqual(result["status"], "completed")

        payload = self._last_update_payload()
        self.assertEqual(payload["status"], "completed")
        self.assertIn("completed_at", payload)
        self.assertIsInstance(payload["completed_at"], str)
        self.assertGreater(len(payload["completed_at"]), 10)

    def test_15b_completed_at_is_utc_iso_string(self):
        self._update_chain([{"interview_id": 1}])
        repo.complete_interview(1)
        ts = self._last_update_payload()["completed_at"]
        # Must be parseable as an ISO datetime with timezone info
        from datetime import datetime
        dt = datetime.fromisoformat(ts)
        self.assertIsNotNone(dt.tzinfo)

    def test_16_propagates_error(self):
        self._update_chain_raises(Exception("network error"))
        with self.assertRaises(RuntimeError) as ctx:
            repo.complete_interview(1)
        self.assertIn("complete_interview failed", str(ctx.exception))


# ===========================================================================
# 17-18  create_interview_report
# ===========================================================================

class TestCreateInterviewReport(RepoTestCase):

    def test_17_success_returns_row_with_report_id(self):
        self._insert_chain("interview_reports", [
            {"report_id": 50, "interview_id": 1, "overall_score": 8.5}
        ])
        result = repo.create_interview_report(
            interview_id=1, overall_score=8.5,
            strengths=["Good depth."], weaknesses=["Missed edge cases."],
            recommendations=["Practice system design."],
            summary="Strong overall.",
            topics_covered=["Python", "OOP", "REST APIs"],
            profile_strengths=["Python", "AWS"],
            interview_demonstrated_strengths=["OOP"],
            interview_knowledge_gaps=["REST APIs"]
        )
        self.assertEqual(result["report_id"], 50)
        
        payload = self._last_insert_payload()
        self.assertEqual(payload["profile_strengths"], ["Python", "AWS"])
        self.assertEqual(payload["interview_demonstrated_strengths"], ["OOP"])
        self.assertEqual(payload["interview_knowledge_gaps"], ["REST APIs"])

    def test_18_lists_stored_as_lists(self):
        self._insert_chain("interview_reports", [{"report_id": 51}])
        topics = ["FastAPI", "LangGraph", "Supabase"]
        repo.create_interview_report(
            interview_id=2, 
            topics_covered=topics,
            profile_strengths=[],
            interview_demonstrated_strengths=[],
            interview_knowledge_gaps=[]
        )
        payload = self._last_insert_payload()
        self.assertIsInstance(payload["topics_covered"], list)
        self.assertEqual(payload["topics_covered"], topics)
        self.assertEqual(payload["profile_strengths"], [])
        self.assertEqual(payload["interview_demonstrated_strengths"], [])
        self.assertEqual(payload["interview_knowledge_gaps"], [])

    def test_18b_optional_report_fields_omitted_when_none(self):
        self._insert_chain("interview_reports", [{"report_id": 53}])
        repo.create_interview_report(interview_id=4)
        payload = self._last_insert_payload()
        self.assertEqual(set(payload.keys()), {"interview_id"})


# ===========================================================================
# 19-21  get_interview
# ===========================================================================

class TestGetInterview(RepoTestCase):

    def test_19_returns_row_when_found(self):
        self._select_chain([{"interview_id": 1, "user_id": 1, "role": "Backend Engineer"}])
        result = repo.get_interview(1)
        self.assertIsNotNone(result)
        self.assertEqual(result["interview_id"], 1)

    def test_20_returns_none_when_not_found(self):
        self._select_chain([])
        result = repo.get_interview(9999)
        self.assertIsNone(result)

    def test_21_propagates_error(self):
        self._select_chain_raises(Exception("DB error"))
        with self.assertRaises(RuntimeError) as ctx:
            repo.get_interview(1)
        self.assertIn("get_interview failed", str(ctx.exception))


# ===========================================================================
# 22-24  get_interview_questions
# ===========================================================================

class TestGetInterviewQuestions(RepoTestCase):

    def test_22_returns_ordered_list(self):
        q1 = {"question_id": 1, "question_order": 1, "question_text": "Q1"}
        q2 = {"question_id": 2, "question_order": 2, "question_text": "Q2"}
        self._select_order_chain([q1, q2])

        result = repo.get_interview_questions(1)
        self.assertEqual(len(result), 2)
        self.assertEqual(result[0]["question_order"], 1)
        self.assertEqual(result[1]["question_order"], 2)

    def test_22b_order_called_with_correct_args(self):
        self._select_order_chain([])
        repo.get_interview_questions(1)
        order_call = (self.db.table.return_value
                          .select.return_value
                          .eq.return_value
                          .order.call_args)
        self.assertEqual(order_call[0][0], "question_order")
        self.assertFalse(order_call[1].get("desc", True))

    def test_23_returns_empty_list_when_no_questions(self):
        self._select_order_chain([])
        result = repo.get_interview_questions(42)
        self.assertEqual(result, [])

    def test_24_propagates_error(self):
        self._select_order_chain_raises(Exception("timeout"))
        with self.assertRaises(RuntimeError) as ctx:
            repo.get_interview_questions(1)
        self.assertIn("get_interview_questions failed", str(ctx.exception))


if __name__ == "__main__":
    unittest.main(verbosity=2)
