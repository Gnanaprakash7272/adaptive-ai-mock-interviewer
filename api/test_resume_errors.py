"""
api/test_resume_errors.py

Comprehensive tests for Task 1: API Error-Handling Foundation.
Verifies all 10 required failure and success scenarios for POST /resume/analyze
and global exception handling, ensuring:
- Correct HTTP status codes
- Standard error envelope: {"success": false, "error": {"code": "...", "message": "..."}}
- No sensitive internal details (stack traces, keys, file paths) exposed
- Gemini and DB calls are cleanly mocked
"""

import io
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from api.auth import create_access_token
from api.main import app
from api.errors import (
    CODE_EMPTY_FILE,
    CODE_INVALID_FILE_TYPE,
    CODE_INVALID_PDF,
    CODE_FILE_TOO_LARGE,
    CODE_EMPTY_RESUME,
    CODE_RESUME_CLEANING_FAILED,
    CODE_AI_SERVICE_UNAVAILABLE,
    CODE_AI_SERVICE_TIMEOUT,
    CODE_RESUME_ANALYSIS_FAILED,
    CODE_INTERNAL_SERVER_ERROR,
    MAX_RESUME_SIZE,
)

client = TestClient(app)


# ---------------------------------------------------------------------------
# Test Helpers
# ---------------------------------------------------------------------------

def get_auth_headers(user_id: int = 1, email: str = "test@example.com") -> dict:
    """Generate a valid Authorization header for testing endpoints."""
    token = create_access_token({"sub": str(user_id), "user_id": user_id, "email": email})
    return {"Authorization": f"Bearer {token}"}


def make_minimal_pdf_bytes() -> bytes:
    """Return raw bytes of a minimal valid single-page PDF containing text."""
    # A standard bare-bones PDF document with stream text
    pdf_content = (
        b"%PDF-1.4\n"
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
        b"4 0 obj\n<< /Length 55 >>\nstream\n"
        b"BT /F1 12 Tf 72 712 Td (John Doe Python Developer Experience) Tj ET\n"
        b"endstream\nendobj\n"
        b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
        b"xref\n0 6\n0000000000 65535 f \n"
        b"0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n"
        b"0000000249 00000 n \n0000000355 00000 n \n"
        b"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n434\n%%EOF\n"
    )
    return pdf_content


# ---------------------------------------------------------------------------
# 1. Valid PDF -> 200 OK
# ---------------------------------------------------------------------------

def test_1_valid_pdf_success():
    """Verify that a valid PDF returns HTTP 200 with candidate_profile and resume_id."""
    headers = get_auth_headers()
    pdf_bytes = make_minimal_pdf_bytes()

    mock_profile = {
        "candidate": {"name": "John Doe", "email": "john@example.com"},
        "skills": {"programming_languages": ["Python"]},
    }

    with patch("api.main.extract_text", return_value="John Doe Python Developer Experience"):
        with patch("api.main.clean_resume_text", return_value="John Doe Python Developer Experience"):
            with patch("api.main.analyze_resume", return_value=mock_profile):
                with patch("api.main.save_candidate_profile", return_value="mock-resume-uuid-123"):
                    response = client.post(
                        "/resume/analyze",
                        headers=headers,
                        files={"file": ("resume.pdf", pdf_bytes, "application/pdf")},
                    )

    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert data["success"] is True
    assert data["resume_id"] == "mock-resume-uuid-123"
    assert data["candidate_profile"]["candidate"]["name"] == "John Doe"


# ---------------------------------------------------------------------------
# 2. Empty Upload -> 400 EMPTY_FILE
# ---------------------------------------------------------------------------

def test_2_empty_upload():
    """Verify that uploading a 0-byte file returns HTTP 400 with code EMPTY_FILE."""
    headers = get_auth_headers()
    response = client.post(
        "/resume/analyze",
        headers=headers,
        files={"file": ("empty.pdf", b"", "application/pdf")},
    )

    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == CODE_EMPTY_FILE
    assert "empty" in data["error"]["message"].lower()


# ---------------------------------------------------------------------------
# 3. Non-PDF MIME Type -> 400 INVALID_FILE_TYPE
# ---------------------------------------------------------------------------

def test_3_non_pdf_mime_type():
    """Verify that non-application/pdf content types return HTTP 400 with code INVALID_FILE_TYPE."""
    headers = get_auth_headers()
    response = client.post(
        "/resume/analyze",
        headers=headers,
        files={"file": ("document.docx", b"%PDF-dummy", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
    )

    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == CODE_INVALID_FILE_TYPE
    assert "only pdf" in data["error"]["message"].lower()


# ---------------------------------------------------------------------------
# 4. Fake PDF / Wrong Signature -> 400 INVALID_PDF
# ---------------------------------------------------------------------------

def test_4_fake_pdf_signature():
    """Verify that a file marked as PDF but lacking %PDF- magic bytes returns HTTP 400 INVALID_PDF."""
    headers = get_auth_headers()
    fake_bytes = b"Hello, this is not a PDF at all!"
    response = client.post(
        "/resume/analyze",
        headers=headers,
        files={"file": ("fake.pdf", fake_bytes, "application/pdf")},
    )

    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == CODE_INVALID_PDF
    assert "valid pdf" in data["error"]["message"].lower()


# ---------------------------------------------------------------------------
# 5. Oversized PDF (>10MB) -> 413 FILE_TOO_LARGE
# ---------------------------------------------------------------------------

def test_5_oversized_pdf():
    """Verify that a file exceeding 10 MB returns HTTP 413 FILE_TOO_LARGE."""
    headers = get_auth_headers()
    # Create 10MB + 1KB of dummy data starting with %PDF-
    large_size = MAX_RESUME_SIZE + 1024
    large_bytes = b"%PDF-" + (b"0" * (large_size - 5))

    response = client.post(
        "/resume/analyze",
        headers=headers,
        files={"file": ("large.pdf", large_bytes, "application/pdf")},
    )

    assert response.status_code == 413
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == CODE_FILE_TOO_LARGE
    assert "10 mb" in data["error"]["message"].lower()


# ---------------------------------------------------------------------------
# 6. Corrupted / Unreadable PDF -> 422 INVALID_PDF
# ---------------------------------------------------------------------------

def test_6_corrupted_pdf():
    """Verify that a PDF that begins with %PDF- but is corrupted PyMuPDF can't open returns HTTP 422 INVALID_PDF."""
    headers = get_auth_headers()
    corrupt_bytes = b"%PDF-1.4\nCorrupted garbage trailer data that cannot be parsed by PyMuPDF"

    response = client.post(
        "/resume/analyze",
        headers=headers,
        files={"file": ("corrupt.pdf", corrupt_bytes, "application/pdf")},
    )

    assert response.status_code == 422
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == CODE_INVALID_PDF
    assert "could not be read" in data["error"]["message"].lower()


# ---------------------------------------------------------------------------
# 7. PDF With No Readable Text -> 422 EMPTY_RESUME
# ---------------------------------------------------------------------------

def test_7_empty_resume_text():
    """Verify that a PDF which produces empty/whitespace-only text returns HTTP 422 EMPTY_RESUME."""
    headers = get_auth_headers()
    pdf_bytes = make_minimal_pdf_bytes()

    # Mock extract_text returning empty whitespace string
    with patch("api.main.extract_text", return_value="   \n\t  "):
        response = client.post(
            "/resume/analyze",
            headers=headers,
            files={"file": ("scanned.pdf", pdf_bytes, "application/pdf")},
        )

    assert response.status_code == 422
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == CODE_EMPTY_RESUME
    assert "no readable text" in data["error"]["message"].lower()


# ---------------------------------------------------------------------------
# 8. Text Cleaning Failure -> 422 RESUME_CLEANING_FAILED
# ---------------------------------------------------------------------------

def test_8_text_cleaning_failure():
    """Verify that a failure during clean_resume_text returns HTTP 422 RESUME_CLEANING_FAILED."""
    headers = get_auth_headers()
    pdf_bytes = make_minimal_pdf_bytes()

    with patch("api.main.extract_text", return_value="Valid text from resume"):
        with patch("api.main.clean_resume_text", side_effect=Exception("Regex recursion error")):
            response = client.post(
                "/resume/analyze",
                headers=headers,
                files={"file": ("resume.pdf", pdf_bytes, "application/pdf")},
            )

    assert response.status_code == 422
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == CODE_RESUME_CLEANING_FAILED
    assert "could not be processed" in data["error"]["message"].lower()
    # Ensure internal exception was NOT leaked
    assert "Regex recursion error" not in response.text


# ---------------------------------------------------------------------------
# 9. AI / Gemini Failure -> 503 AI_SERVICE_UNAVAILABLE & 504 AI_SERVICE_TIMEOUT
# ---------------------------------------------------------------------------

def test_9a_ai_service_unavailable():
    """Verify that an unrecoverable Gemini failure returns HTTP 503 AI_SERVICE_UNAVAILABLE."""
    headers = get_auth_headers()
    pdf_bytes = make_minimal_pdf_bytes()

    with patch("api.main.extract_text", return_value="Valid text"):
        with patch("api.main.clean_resume_text", return_value="Valid text"):
            with patch("api.main.analyze_resume", side_effect=RuntimeError("All fallback Gemini models failed after max attempts.")):
                response = client.post(
                    "/resume/analyze",
                    headers=headers,
                    files={"file": ("resume.pdf", pdf_bytes, "application/pdf")},
                )

    assert response.status_code == 503
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == CODE_AI_SERVICE_UNAVAILABLE
    assert "temporarily unavailable" in data["error"]["message"].lower()
    # Confirm raw internal exception is not exposed
    assert "fallback Gemini models" not in response.text


def test_9b_ai_service_timeout():
    """Verify that a Gemini timeout returns HTTP 504 AI_SERVICE_TIMEOUT."""
    headers = get_auth_headers()
    pdf_bytes = make_minimal_pdf_bytes()

    with patch("api.main.extract_text", return_value="Valid text"):
        with patch("api.main.clean_resume_text", return_value="Valid text"):
            with patch("api.main.analyze_resume", side_effect=TimeoutError("Request timed out after 30s")):
                response = client.post(
                    "/resume/analyze",
                    headers=headers,
                    files={"file": ("resume.pdf", pdf_bytes, "application/pdf")},
                )

    assert response.status_code == 504
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == CODE_AI_SERVICE_TIMEOUT
    assert "timed out" in data["error"]["message"].lower()
    assert "after 30s" not in response.text


def test_9c_resume_analysis_invalid_format():
    """Verify that a ValueError (malformed/unusable JSON from AI) returns HTTP 502 RESUME_ANALYSIS_FAILED."""
    headers = get_auth_headers()
    pdf_bytes = make_minimal_pdf_bytes()

    with patch("api.main.extract_text", return_value="Valid text"):
        with patch("api.main.clean_resume_text", return_value="Valid text"):
            with patch("api.main.analyze_resume", side_effect=ValueError("Gemini returned corrupted non-JSON")):
                response = client.post(
                    "/resume/analyze",
                    headers=headers,
                    files={"file": ("resume.pdf", pdf_bytes, "application/pdf")},
                )

    assert response.status_code == 502
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == CODE_RESUME_ANALYSIS_FAILED
    assert "could not be analysed" in data["error"]["message"].lower()
    assert "corrupted non-JSON" not in response.text


# ---------------------------------------------------------------------------
# 10. Unexpected Exception -> 500 INTERNAL_SERVER_ERROR
# ---------------------------------------------------------------------------

def test_10_unexpected_internal_error():
    """Verify that an unexpected exception during processing returns HTTP 500 without leaking stack traces or internal secrets."""
    headers = get_auth_headers()
    pdf_bytes = make_minimal_pdf_bytes()

    # Simulate an unexpected critical crash inside database saving
    with patch("api.main.extract_text", return_value="Valid text"):
        with patch("api.main.clean_resume_text", return_value="Valid text"):
            with patch("api.main.analyze_resume", return_value={"candidate": {}}):
                with patch("api.main.save_candidate_profile", side_effect=Exception("FATAL: secret_db_key_123 failed connection")):
                    response = client.post(
                        "/resume/analyze",
                        headers=headers,
                        files={"file": ("resume.pdf", pdf_bytes, "application/pdf")},
                    )

    assert response.status_code == 500
    data = response.json()
    assert data["success"] is False
    assert data["error"]["code"] == CODE_INTERNAL_SERVER_ERROR
    assert data["error"]["message"] == "Something went wrong. Please try again."
    # Strict security assertion: no internal exception or secret leaked to client
    assert "secret_db_key_123" not in response.text
    assert "Traceback" not in response.text
