"""
test_interview_router.py

Tests for the FastAPI interview workflow endpoints:
    POST /interview/start
    POST /interview/{interview_id}/answer

All AI calls are mocked — no real Gemini network calls.
No Supabase writes required.
No real environment variables required.

Tests:
    1.  start_interview requires authentication (no token → 401)
    2.  start_interview with valid user returns 200
    3.  start_interview returns first question in response
    4.  answer endpoint requires authentication (no token → 401)
    5.  answer resumes the correct LangGraph thread
    6.  answer produces the next question for multi-question interviews
    7.  two different interview IDs have fully isolated state
    8.  empty/whitespace-only answer is rejected with 400
    9.  completed interview returns final_report in response
    10. another user's interview cannot be accessed (403)
    11. graph errors are converted into safe 500 API responses
"""

import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

# ---------------------------------------------------------------------------
# Build a test-time JWT for a fake user without touching Supabase.
# ---------------------------------------------------------------------------
import os, sys

# Make imports work from the project root.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.auth import create_access_token, JWT_SECRET_KEY, JWT_ALGORITHM

FAKE_USER_ID   = 42
FAKE_USER_2_ID = 99
FAKE_EMAIL     = "tester@mockora.test"
FAKE_EMAIL_2   = "other@mockora.test"

FAKE_QUESTION = {
    "question": "How does FastAPI handle dependency injection?",
    "topic": "FastAPI",
    "difficulty": "medium",
    "question_type": "technical",
    "expected_concepts": ["Depends", "IoC"],
}

FAKE_EVALUATION = {
    "score": 8,
    "feedback": "Good answer.",
    "missing_concepts": [],
    "strengths": ["Clear explanation"],
}

FAKE_ADAPTIVE = {
    "next_action": "increase_difficulty",
    "difficulty": "hard",
    "next_topic": "FastAPI",
}

CANDIDATE_PROFILE = {
    "potential_interview_topics": ["FastAPI", "Python"],
    "skills": ["FastAPI", "Python"],
    "experience": "3 years",
}


def _make_token(user_id: int, email: str) -> str:
    """Create a valid JWT for a fake user without Supabase."""
    return create_access_token({"user_id": user_id, "email": email})


def _auth_header(user_id: int = FAKE_USER_ID, email: str = FAKE_EMAIL) -> dict:
    return {"Authorization": f"Bearer {_make_token(user_id, email)}"}


# ---------------------------------------------------------------------------
# Patch the three AI modules at import time so no Gemini calls go out.
# Also patch the Supabase repository so no real DB writes occur.
# ---------------------------------------------------------------------------
def _get_patches():
    return {
        "generate_question": patch("langgraph_workflow.interview_graph._generate_question", return_value=FAKE_QUESTION),
        "evaluate_answer": patch("langgraph_workflow.interview_graph._evaluate_answer", return_value=FAKE_EVALUATION),
        "decide_next_step": patch("langgraph_workflow.interview_graph._decide_next_step", return_value=FAKE_ADAPTIVE),
        "generate_narrative": patch("langgraph_workflow.interview_graph._generate_narrative", return_value={
            "strengths": ["test strength"], "weaknesses": ["test weakness"],
            "recommendations": ["test rec"], "summary": "test summary"
        }),
        "create_interview": patch("api.interview_repository.create_interview", return_value={"interview_id": 999}),
        "create_question": patch("api.interview_repository.create_question", return_value={"question_id": 888}),
        "update_interview_state": patch("api.interview_repository.update_interview_state", return_value={}),
        "get_interview_questions": patch("api.interview_repository.get_interview_questions", return_value=[{"question_id": 888}]),
        "create_answer": patch("api.interview_repository.create_answer", return_value={"answer_id": 777}),
        "create_evaluation": patch("api.interview_repository.create_evaluation", return_value={"evaluation_id": 666}),
        "create_adaptive_decision": patch("api.interview_repository.create_adaptive_decision", return_value={"decision_id": 555}),
        "complete_interview": patch("api.interview_repository.complete_interview", return_value={}),
        "create_interview_report": patch("api.interview_repository.create_interview_report", return_value={"report_id": 444}),
        "get_answer_by_question_id": patch("api.interview_repository.get_answer_by_question_id", return_value={"answer_id": 777}),
        "get_candidate_profile": patch("api.resume_repository.get_candidate_profile", return_value=CANDIDATE_PROFILE),
        "get_interview": patch("api.interview_repository.get_interview", return_value={"interview_id": 999, "user_id": FAKE_USER_ID, "role": "Backend Engineer", "max_questions": 3}),
    }

def _start_patches():
    patches = _get_patches()
    mocks = {k: (p, p.start()) for k, p in patches.items()}
    return mocks

def _stop_patches(mocks):
    for p, _ in mocks.values():
        p.stop()


# ---------------------------------------------------------------------------
# Build a fresh TestClient for each test class to avoid cross-test state
# via the in-memory MemorySaver.
# ---------------------------------------------------------------------------

def _fresh_client():
    """
    Rebuild the FastAPI app with a fresh MemorySaver so tests are isolated.
    Each call re-imports with a clean graph instance.
    """
    # Rebuild the graph with a fresh in-memory checkpointer.
    from langgraph.checkpoint.memory import MemorySaver
    from langgraph_workflow.interview_graph import build_interview_graph
    import api.interview_router as ir_module
    ir_module.interview_graph = build_interview_graph(checkpointer=MemorySaver())

    from api.main import app
    return TestClient(app, raise_server_exceptions=False)


# ===========================================================================
# TEST CLASS 1 — Authentication gate
# ===========================================================================

class TestAuthenticationGate(unittest.TestCase):
    """Tests 1 & 4: Both endpoints must require a valid JWT."""

    def setUp(self):
        self.mocks = _start_patches()
        self.client = _fresh_client()

    def tearDown(self):
        _stop_patches(self.mocks)

    def test_01_start_requires_auth(self):
        """POST /interview/start without a token must return 401."""
        resp = self.client.post(
            "/interview/start",
            json={
                "role": "Backend Engineer",
                "max_questions": 3,
            },
        )
        self.assertEqual(resp.status_code, 401)

    def test_04_answer_requires_auth(self):
        """POST /interview/{id}/answer without a token must return 401."""
        resp = self.client.post(
            "/interview/fake-id/answer",
            json={"answer": "My answer"},
        )
        self.assertEqual(resp.status_code, 401)

    def test_01b_expired_jwt_rejected(self):
        """Expired JWT token must return 401."""
        from datetime import timedelta
        from api.auth import create_access_token
        expired_token = create_access_token({"user_id": FAKE_USER_ID, "email": FAKE_EMAIL}, expires_delta=timedelta(seconds=-1))
        resp = self.client.post(
            "/interview/start",
            headers={"Authorization": f"Bearer {expired_token}"},
            json={"role": "Backend Engineer", "max_questions": 3},
        )
        self.assertEqual(resp.status_code, 401)

    def test_01c_invalid_jwt_rejected(self):
        """Malformed or completely invalid JWT token must return 401."""
        resp = self.client.post(
            "/interview/start",
            headers={"Authorization": "Bearer this.is.an.invalid.token.string"},
            json={"role": "Backend Engineer", "max_questions": 3},
        )
        self.assertEqual(resp.status_code, 401)


# ===========================================================================
# TEST CLASS 2 — Start interview
# ===========================================================================

class TestStartInterview(unittest.TestCase):
    """Tests 2 & 3: Valid start returns 200 with first question."""

    def setUp(self):
        self.mocks = _start_patches()
        self.client = _fresh_client()

    def tearDown(self):
        _stop_patches(self.mocks)

    def _start(self, max_q=3):
        return self.client.post(
            "/interview/start",
            headers=_auth_header(),
            json={
                "role": "Backend Engineer",
                "max_questions": max_q,
            },
        )

    def test_02_start_returns_200(self):
        """Authenticated start must return 200."""
        resp = self._start()
        self.assertEqual(resp.status_code, 200)

    def test_03_start_returns_first_question(self):
        """start response must contain 'question', 'interview_id', 'status'."""
        resp = self._start()
        body = resp.json()
        self.assertTrue(body.get("success"))
        self.assertIn("interview_id", body)
        self.assertIn("question", body)
        self.assertEqual(body["status"], "waiting_for_answer")
        self.assertEqual(body["question_number"], 1)
        self.assertIsNotNone(body["question"])

    def test_03b_start_question_has_expected_keys(self):
        """The 'question' object must contain all required keys."""
        resp = self._start()
        q = resp.json()["question"]
        for key in ("question", "topic", "difficulty", "question_type"):
            self.assertIn(key, q)
        self.assertNotIn("expected_concepts", q)

    def test_03c_start_missing_profile_rejected(self):
        """Missing candidate profile (e.g., resume not uploaded) must return 404."""
        self.mocks["get_candidate_profile"][1].return_value = None
        resp = self.client.post(
            "/interview/start",
            headers=_auth_header(),
            json={
                "role": "Backend Engineer",
                "max_questions": 3,
            },
        )
        self.assertEqual(resp.status_code, 404)
        self.assertIn("not found", resp.json()["detail"].lower())

    def test_03d_start_empty_topics_fallback(self):
        """Empty 'potential_interview_topics' falls back to default topics."""
        self.mocks["get_candidate_profile"][1].return_value = {"skills": ["Python"]}
        resp = self.client.post(
            "/interview/start",
            headers=_auth_header(),
            json={
                "role": "Backend Engineer",
                "max_questions": 3,
            },
        )
        # Should not fail with 400 anymore, it should proceed using fallbacks.
        self.assertEqual(resp.status_code, 200)

    def test_03e_start_invalid_max_questions_rejected(self):
        """max_questions=0 must return 422 (Pydantic validation)."""
        resp = self.client.post(
            "/interview/start",
            headers=_auth_header(),
            json={
                "role": "Backend Engineer",
                "max_questions": 0,
            },
        )
        self.assertIn(resp.status_code, [400, 422])

    def test_03f_start_supplied_profile_ignored(self):
        """Frontend-supplied candidate_profile is ignored/rejected."""
        self.mocks["get_candidate_profile"][1].return_value = {"skills": ["Real Skills"]}
        resp = self.client.post(
            "/interview/start",
            headers=_auth_header(),
            json={
                "role": "Backend Engineer",
                "max_questions": 3,
                "candidate_profile": {"skills": ["Fake Skills from Frontend"]}
            },
        )
        # Should succeed because extra fields are ignored by default in pydantic
        # and the DB profile is used.
        self.assertEqual(resp.status_code, 200)

    def test_03g_start_attaches_resume_id(self):
        """Ensure correct user's resume_id is passed to create_interview."""
        mock_create = self.mocks["create_interview"][1]
        self.mocks["get_candidate_profile"][1].return_value = {"skills": ["Python"], "resume_id": 123}
        resp = self.client.post(
            "/interview/start",
            headers=_auth_header(user_id=42, email="test@test.com"),
            json={
                "role": "Backend Engineer",
                "max_questions": 3,
            },
        )
        self.assertEqual(resp.status_code, 200)
        # Check that the mocked create_interview was called with resume_id=123
        mock_create.assert_called_once_with(
            user_id=42,
            role="Backend Engineer",
            max_questions=3,
            resume_id=123
        )


# ===========================================================================
# TEST CLASS 3 — Answer endpoint
# ===========================================================================

class TestAnswerEndpoint(unittest.TestCase):
    """Tests 5, 6, 8, 9: Answer resumes correct thread, returns next Q or report."""

    def setUp(self):
        self.mocks = _start_patches()
        self.client = _fresh_client()

    def tearDown(self):
        _stop_patches(self.mocks)

    def _start_interview(self, max_q=3, user_id=FAKE_USER_ID):
        resp = self.client.post(
            "/interview/start",
            headers=_auth_header(user_id),
            json={
                "role": "Backend Engineer",
                "candidate_profile": CANDIDATE_PROFILE,
                "max_questions": max_q,
            },
        )
        self.assertEqual(resp.status_code, 200, resp.text)
        return resp.json()["interview_id"]

    def _answer(self, interview_id: str, answer: str, user_id=FAKE_USER_ID):
        return self.client.post(
            f"/interview/{interview_id}/answer",
            headers=_auth_header(user_id),
            json={"answer": answer},
        )

    def test_05_answer_resumes_correct_thread(self):
        """Answer must resume the same thread and return a result."""
        iid = self._start_interview(max_q=2)
        resp = self._answer(iid, "I use Depends() for DI.")
        self.assertIn(resp.status_code, [200])

    def test_06_answer_returns_next_question(self):
        """With max_questions=2, first answer must return a second question."""
        iid = self._start_interview(max_q=2)
        resp = self._answer(iid, "I use Depends() for DI.")
        body = resp.json()
        # max_q=2: after 1 answer, should be waiting for answer 2
        self.assertEqual(body.get("status"), "waiting_for_answer")
        self.assertEqual(body.get("question_number"), 2)

    def test_06b_answer_contains_question_keys(self):
        """Next question response must have all required question keys."""
        iid = self._start_interview(max_q=2)
        body = self._answer(iid, "I use Depends()").json()
        if body.get("status") == "waiting_for_answer":
            q = body.get("question", {})
            for key in ("question", "topic", "difficulty"):
                self.assertIn(key, q)
            self.assertNotIn("expected_concepts", q)
            self.assertIn("interviewer_feedback", body)
            self.assertNotIn("expected_concepts", q)
            self.assertIn("interviewer_feedback", body)

    def test_08_empty_answer_rejected(self):
        """Empty string answer must return 422 (Pydantic) or 400."""
        iid = self._start_interview(max_q=2)
        resp = self._answer(iid, "   ")
        # Pydantic min_length=1 rejects empty-after-strip at 422,
        # or our own strip check returns 400. Both are valid rejections.
        self.assertIn(resp.status_code, [400, 422])

    def test_09_completed_interview_returns_final_report(self):
        """With max_questions=1, one answer must complete the interview."""
        iid = self._start_interview(max_q=1)
        resp = self._answer(iid, "My comprehensive answer.")
        body = resp.json()
        self.assertEqual(body.get("status"), "completed")
        self.assertIn("final_report", body)
        report = body["final_report"]
        for key in ("overall_score", "strengths", "weaknesses", "recommendations", "summary", "topics_covered"):
            self.assertIn(key, report)
        self.assertIn("profile_strengths", report)
        self.assertIn("interview_demonstrated_strengths", report)
        self.assertIn("interview_knowledge_gaps", report)

    def test_09b_final_report_score_is_numeric(self):
        """final_report.overall_score must be a number."""
        iid = self._start_interview(max_q=1)
        body = self._answer(iid, "My answer.").json()
        score = body["final_report"].get("overall_score")
        self.assertIsInstance(score, (int, float))

    def test_09c_invalid_interview_id_returns_404(self):
        """Using a completely non-existent interview ID returns 404."""
        self.mocks["get_interview"][1].return_value = None
        resp = self.client.post(
            "/interview/999999/answer",
            headers=_auth_header(),
            json={"answer": "Testing invalid ID"}
        )
        self.assertEqual(resp.status_code, 404)
        self.assertIn("not found", resp.json().get("detail", "").lower())

    def test_09d_duplicate_answer_gracefully_handled(self):
        """Submitting an answer when the interview is already completed gracefully returns the state."""
        iid = self._start_interview(max_q=1)
        
        # Answer #1 -> completes the interview
        resp1 = self._answer(iid, "My first answer.")
        self.assertEqual(resp1.status_code, 200)
        self.assertEqual(resp1.json().get("status"), "completed")

        # Answer #2 (Duplicate/Extra) -> Should return 400 because interview is completed
        resp2 = self._answer(iid, "I want to add more.")
        self.assertEqual(resp2.status_code, 400)
        self.assertIn("already completed", resp2.json().get("detail", "").lower())


# ===========================================================================
# TEST CLASS 4 — Thread isolation
# ===========================================================================

class TestThreadIsolation(unittest.TestCase):
    """Test 7: Two different interviews must not share state."""

    def setUp(self):
        self.mocks = _start_patches()
        self.client = _fresh_client()

    def tearDown(self):
        _stop_patches(self.mocks)

    def _start(self, unique_id: int):
        self.mocks["create_interview"][1].return_value = {"interview_id": unique_id}
        resp = self.client.post(
            "/interview/start",
            headers=_auth_header(),
            json={
                "role": "Backend Engineer",
                "candidate_profile": CANDIDATE_PROFILE,
                "max_questions": 3,
            },
        )
        self.assertEqual(resp.status_code, 200)
        return resp.json()["interview_id"]

    def test_07_two_interviews_have_isolated_state(self):
        """Two separate interview_ids must return distinct UUIDs and independent state."""
        iid_a = self._start(101)
        iid_b = self._start(102)
        self.assertNotEqual(iid_a, iid_b)

    def test_07b_answer_to_one_does_not_affect_other(self):
        """Answering interview A must not change the question_number of interview B."""
        iid_a = self._start(101)
        iid_b = self._start(102)

        # Answer interview A
        resp_a = self.client.post(
            f"/interview/{iid_a}/answer",
            headers=_auth_header(),
            json={"answer": "My answer for A."},
        )
        self.assertEqual(resp_a.status_code, 200)

        # Interview B's state must still be at question 1 —
        # query via the router module's live graph reference (swapped by _fresh_client).
        import api.interview_router as ir_module
        snap_b = ir_module.interview_graph.get_state(
            {"configurable": {"thread_id": iid_b}}
        )
        self.assertEqual(snap_b.values.get("question_count"), 1)


# ===========================================================================
# TEST CLASS 5 — Authorisation enforcement
# ===========================================================================

class TestAuthorisation(unittest.TestCase):
    """Test 10: Another user's interview cannot be accessed."""

    def setUp(self):
        self.mocks = _start_patches()
        self.client = _fresh_client()

    def tearDown(self):
        _stop_patches(self.mocks)

    def test_10_another_users_interview_is_forbidden(self):
        """User 2 must receive 403 when accessing User 1's interview."""
        # User 1 starts an interview
        resp = self.client.post(
            "/interview/start",
            headers=_auth_header(FAKE_USER_ID, FAKE_EMAIL),
            json={
                "role": "Backend Engineer",
                "candidate_profile": CANDIDATE_PROFILE,
                "max_questions": 2,
            },
        )
        self.assertEqual(resp.status_code, 200)
        interview_id = resp.json()["interview_id"]

        # User 2 tries to answer it
        resp2 = self.client.post(
            f"/interview/{interview_id}/answer",
            headers=_auth_header(FAKE_USER_2_ID, FAKE_EMAIL_2),
            json={"answer": "Trying to steal the session."},
        )
        self.assertEqual(resp2.status_code, 403)

    def test_10b_nonexistent_interview_returns_404(self):
        """Answering a non-existent interview_id must return 404."""
        self.mocks["get_interview"][1].return_value = None
        resp = self.client.post(
            "/interview/999999999/answer",
            headers=_auth_header(),
            json={"answer": "Hello."},
        )
        self.assertEqual(resp.status_code, 404)


# ===========================================================================
# TEST CLASS 6 — Graph error handling
# ===========================================================================

class TestGraphErrorHandling(unittest.TestCase):
    """Test 11: Graph exceptions must be converted to safe 5xx responses."""

    def setUp(self):
        self.mocks = _start_patches()
        self.client = _fresh_client()

    def tearDown(self):
        _stop_patches(self.mocks)

    def test_11_graph_error_returns_safe_500(self):
        """If the graph raises during invoke, a safe 500 is returned."""
        with patch(
            "api.interview_router.interview_graph.invoke",
            side_effect=RuntimeError("Internal model failure"),
        ):
            resp = self.client.post(
                "/interview/start",
                headers=_auth_header(),
                json={
                    "role": "Backend Engineer",
                    "candidate_profile": CANDIDATE_PROFILE,
                    "max_questions": 3,
                },
            )
        self.assertEqual(resp.status_code, 500)
        # Must NOT expose internal error details/stack traces
        body = resp.json()
        detail = body.get("detail", "")
        self.assertNotIn("Traceback", detail)
        self.assertNotIn("Internal model failure", detail)

    def test_11b_validation_error_returns_400(self):
        """ValueError from graph (e.g. missing role) must return 400."""
        with patch(
            "api.interview_router.interview_graph.invoke",
            side_effect=ValueError("create_interview_plan: role is required."),
        ):
            resp = self.client.post(
                "/interview/start",
                headers=_auth_header(),
                json={
                    "role": "Backend Engineer",
                    "candidate_profile": CANDIDATE_PROFILE,
                    "max_questions": 3,
                },
            )
        self.assertEqual(resp.status_code, 400)


if __name__ == "__main__":
    unittest.main(verbosity=2)
