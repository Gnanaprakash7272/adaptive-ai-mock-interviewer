"""
test_e2e_flow.py

LIVE end-to-end test: signup -> login -> resume upload -> interview start
-> answer loop -> report.

This is NOT a unit test. It requires:
  1. Your FastAPI server already running:
         uv run uvicorn api.main:app --reload
  2. A real .env with valid SUPABASE_URL / SUPABASE_KEY / GEMINI_API_KEY
  3. A real sample resume PDF on disk — set E2E_RESUME_PATH env var.

It makes REAL calls to Gemini and REAL writes to Supabase. Every run creates
a brand-new throwaway user (random email) so it never collides with your
existing data, and is safe to re-run repeatedly.

Run it on its own, not mixed with the rest of the mocked suite:
    uv run pytest test_e2e_flow.py -v -s -m e2e

-s is important — it lets you see the print() progress output as it runs,
since some steps (Gemini calls) can take several seconds each.
"""

import os
import time
import uuid

import pytest
import requests

pytestmark = pytest.mark.e2e   # applies to every test in this module

BASE_URL = os.environ.get("E2E_BASE_URL", "http://127.0.0.1:8000").rstrip("/")

# Resume path MUST be provided via environment variable.
# There is intentionally no fallback to a personal path so the test
# fails fast with a clear message rather than picking up the wrong file.
RESUME_PATH = os.environ.get("E2E_RESUME_PATH", "")

TEST_PASSWORD = "E2ETestPass123!"
MAX_QUESTIONS = 3          # keep small: each question = one live Gemini call
ANSWER_TEXT = (
    "I used Python and FastAPI to build the service, with PostgreSQL for "
    "persistence and Docker for containerization. I focused on clear "
    "separation of concerns between the API layer and the business logic."
)


@pytest.fixture(scope="module")
def session():
    """A requests.Session reused across the whole flow (keeps things simple)."""
    return requests.Session()


@pytest.fixture(scope="module")
def resume_path():
    if not os.path.isfile(RESUME_PATH):
        pytest.skip(
            f"No resume PDF found at {RESUME_PATH}. "
            f"Set E2E_RESUME_PATH to a real PDF file to run this test."
        )
    return RESUME_PATH


@pytest.fixture(scope="module")
def test_user():
    """A brand-new random user for this test run."""
    unique = uuid.uuid4().hex[:10]
    return {
        "email": f"e2e_test_{unique}@example.com",
        "password": TEST_PASSWORD,
    }


def _check_server_up():
    try:
        r = requests.get(f"{BASE_URL}/", timeout=5)
        return r.status_code == 200
    except requests.exceptions.ConnectionError:
        return False


class TestFullInterviewFlow:
    """
    One continuous flow, step by step. Steps are ordered methods on a class
    so pytest runs them in definition order and each can assert on state
    stored on `self` from the previous step.
    """

    token = None
    resume_id = None
    interview_id = None
    max_questions = None

    def test_00_server_is_up(self):
        if not _check_server_up():
            pytest.fail(
                f"Server not reachable at {BASE_URL}. "
                f"Start it first: uv run uvicorn api.main:app --reload"
            )

    def test_01_signup(self, session, test_user):
        print(f"\n[E2E] Signing up as {test_user['email']}")
        r = session.post(f"{BASE_URL}/auth/signup", json=test_user)
        assert r.status_code == 201, f"Signup failed: {r.status_code} {r.text}"
        data = r.json()
        assert "user_id" in data
        assert data["email"] == test_user["email"]
        print(f"[E2E] Signed up. user_id={data['user_id']}")

    def test_02_login(self, session, test_user):
        print(f"[E2E] Logging in as {test_user['email']}")
        r = session.post(
            f"{BASE_URL}/auth/login",
            json={"email": test_user["email"], "password": test_user["password"]},
        )
        assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
        data = r.json()
        assert "access_token" in data
        TestFullInterviewFlow.token = data["access_token"]
        session.headers.update({"Authorization": f"Bearer {TestFullInterviewFlow.token}"})
        print("[E2E] Logged in, token acquired.")

    def test_03_upload_resume(self, session, resume_path):
        assert TestFullInterviewFlow.token, "No token from login step"
        print(f"[E2E] Uploading resume: {resume_path}")
        with open(resume_path, "rb") as f:
            files = {"file": (os.path.basename(resume_path), f, "application/pdf")}
            r = session.post(f"{BASE_URL}/resume/analyze", files=files, timeout=120)
        assert r.status_code == 200, f"Resume analyze failed: {r.status_code} {r.text}"
        data = r.json()
        assert data.get("success") is True
        assert "candidate_profile" in data
        TestFullInterviewFlow.resume_id = data.get("resume_id")
        print(f"[E2E] Resume analyzed. resume_id={TestFullInterviewFlow.resume_id}")

    def test_04_get_candidate_profile(self, session):
        print("[E2E] Fetching candidate profile")
        r = session.get(f"{BASE_URL}/candidate/profile")
        assert r.status_code == 200, f"Get profile failed: {r.status_code} {r.text}"
        profile = r.json()
        assert profile.get("candidate", {}).get("name"), "Profile has no candidate name"
        print(f"[E2E] Profile confirmed for: {profile['candidate']['name']}")

    def test_05_start_interview(self, session):
        print("[E2E] Starting interview")
        r = session.post(
            f"{BASE_URL}/interview/start",
            json={"role": "Backend Engineer", "max_questions": MAX_QUESTIONS},
            timeout=60,
        )
        assert r.status_code == 200, f"Interview start failed: {r.status_code} {r.text}"
        data = r.json()
        assert data.get("success") is True
        assert data.get("status") == "waiting_for_answer"
        assert data.get("question"), "No question returned on start"

        TestFullInterviewFlow.interview_id = data["interview_id"]
        TestFullInterviewFlow.max_questions = data.get("max_questions", MAX_QUESTIONS)

        print(
            f"[E2E] Interview started. interview_id={TestFullInterviewFlow.interview_id} "
            f"Q1: {data['question'].get('question', '')[:80]}..."
        )

    def test_06_answer_loop_until_complete(self, session):
        assert TestFullInterviewFlow.interview_id, "No interview_id from start step"
        interview_id = TestFullInterviewFlow.interview_id

        # Safety cap so a stuck loop doesn't hang forever
        max_turns = (TestFullInterviewFlow.max_questions or MAX_QUESTIONS) + 3

        for turn in range(1, max_turns + 1):
            print(f"[E2E] Submitting answer, turn {turn}")
            r = session.post(
                f"{BASE_URL}/interview/{interview_id}/answer",
                json={"answer": ANSWER_TEXT},
                timeout=60,
            )
            assert r.status_code == 200, (
                f"Answer submission failed on turn {turn}: {r.status_code} {r.text}"
            )
            data = r.json()
            assert data.get("success") is True

            status_val = data.get("status")
            print(f"[E2E] Turn {turn} -> status={status_val}")

            if status_val == "completed":
                assert "final_report" in data
                print("[E2E] Interview completed.")
                return

            assert status_val == "waiting_for_answer", f"Unexpected status: {data}"
            assert data.get("question"), f"No next question in turn {turn}: {data}"

        pytest.fail(
            f"Interview did not complete within {max_turns} turns "
            f"(max_questions={TestFullInterviewFlow.max_questions})"
        )

    def test_07_get_report(self, session):
        interview_id = TestFullInterviewFlow.interview_id
        assert interview_id, "No interview_id available"
        print(f"[E2E] Fetching final report for interview_id={interview_id}")

        # Report persistence happens right after completion; small retry
        # in case of a race between the response and the DB write.
        report = None
        for attempt in range(3):
            r = session.get(f"{BASE_URL}/interview/{interview_id}/report")
            if r.status_code == 200:
                report = r.json()
                break
            time.sleep(1)

        assert report is not None, f"Report not available after retries: {r.status_code} {r.text}"
        assert "overall_score" in report
        assert "summary" in report
        print(f"[E2E] Report received. overall_score={report.get('overall_score')}")
        print(f"[E2E] Summary: {report.get('summary', '')[:150]}...")

    def test_08_history_contains_this_interview(self, session):
        print("[E2E] Checking /interviews history")
        r = session.get(f"{BASE_URL}/interviews")
        assert r.status_code == 200, f"History fetch failed: {r.status_code} {r.text}"
        history = r.json()
        assert isinstance(history, list)
        ids_in_history = [item.get("id") for item in history]
        assert TestFullInterviewFlow.interview_id in ids_in_history, (
            f"interview_id {TestFullInterviewFlow.interview_id} not found in history: "
            f"{ids_in_history}"
        )
        print("[E2E] Interview found in history. Full flow verified end to end.")
