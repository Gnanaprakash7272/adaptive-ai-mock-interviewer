import logging
import os
import sys
from pathlib import Path

# Ensure backend and intelligence directories are in sys.path so sibling packages are discoverable
_backend_dir = str(Path(__file__).resolve().parent.parent)
_intelligence_dir = str(Path(__file__).resolve().parent.parent / "intelligence")
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)
if _intelligence_dir not in sys.path:
    sys.path.insert(0, _intelligence_dir)

from fastapi import Depends, FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import api.interview_repository as repo
from api.auth import UserInfo, get_current_user, limiter
from api.auth import router as auth_router
from api.errors import (
    CODE_INTERNAL_SERVER_ERROR,
    CODE_VALIDATION_ERROR,
    MAX_RESUME_SIZE,
    AIServiceTimeoutError,
    AIServiceUnavailableError,
    APIError,
    EmptyFileError,
    EmptyResumeError,
    FileTooLargeError,
    InternalServerError,
    InvalidFileTypeError,
    InvalidPDFError,
    ResumeAnalysisFailedError,
    ResumeCleaningFailedError,
    make_error_response,
)
from api.coach_router import router as coach_router
from api.interview_router import router as interview_router
from api.resume_repository import get_candidate_profile, save_candidate_profile
from api.role_catalogue import ROLE_CATALOGUE
from resume_intelligence.resume_analyzer import analyze_resume
from resume_intelligence.text_clean import clean_resume_text, strip_pii
from resume_intelligence.text_extract import extract_text

logger = logging.getLogger(__name__)

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

app = FastAPI(title="AI MOCKORA API")

# Register SlowAPI rate limiter
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def custom_rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """Return JSON for rate-limit errors so frontend clients can parse them cleanly."""
    return JSONResponse(
        status_code=429,
        content={
            "success": False,
            "error": {
                "code": "RATE_LIMIT_EXCEEDED",
                "message": f"Too many requests. Please wait a minute and try again ({exc.detail}).",
            },
            "detail": f"Rate limit exceeded: {exc.detail}",
        },
    )


# =============================================================================
# GLOBAL EXCEPTION HANDLERS
# =============================================================================

@app.exception_handler(APIError)
async def api_error_handler(request, exc: APIError):
    """Handles all structured application domain errors."""
    return make_error_response(
        status_code=exc.status_code,
        code=exc.code,
        message=exc.message,
        headers=exc.headers,
    )


from fastapi.encoders import jsonable_encoder


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
    """
    Format request validation errors consistently without exposing raw internals.
    Preserves detail field for client inspection.
    """
    error_messages = []
    for err in exc.errors():
        loc = " -> ".join(str(l) for l in err.get("loc", []))
        msg = err.get("msg", "Invalid value")
        error_messages.append(f"{loc}: {msg}" if loc else msg)
    summary_message = "; ".join(error_messages) if error_messages else "Request validation failed."

    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": {
                "code": CODE_VALIDATION_ERROR,
                "message": summary_message,
            },
            "detail": jsonable_encoder(exc.errors()),
        },
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc: HTTPException):
    """
    Standardize standard FastAPI/Starlette HTTPExceptions while preserving backward compatibility.
    """
    detail = exc.detail
    message = str(detail) if isinstance(detail, str) else "An error occurred processing the request."
    code = f"HTTP_{exc.status_code}"
    return JSONResponse(
        status_code=exc.status_code,
        headers=exc.headers,
        content={
            "success": False,
            "error": {
                "code": code,
                "message": message,
            },
            "detail": detail,
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc: Exception):
    """
    Catch-all exception handler for unexpected server errors.
    Logs full traceback internally, never leaks stack traces or internals to the client.
    """
    logger.exception("Unhandled server exception processing request %s", getattr(request, "url", ""))
    return make_error_response(
        status_code=500,
        code=CODE_INTERNAL_SERVER_ERROR,
        message="Something went wrong. Please try again.",
    )


# ---------------------------------------------------------------------------
# CORS — driven by env var for easy per-environment configuration
# ---------------------------------------------------------------------------
_raw_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:3000,http://127.0.0.1:3000"
)
_allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(interview_router)
app.include_router(coach_router)


@app.get("/")
def root():
    return {"message": "AI MOCKORA API is running"}


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "AI MOCKORA API"}


# =============================================================================
# POST /resume/analyze
# =============================================================================

def extract_docx_text(docx_bytes: bytes) -> str:
    import zipfile, xml.etree.ElementTree as ET, io
    try:
        with zipfile.ZipFile(io.BytesIO(docx_bytes)) as z:
            xml_content = z.read("word/document.xml")
            root = ET.fromstring(xml_content)
            texts = []
            for p in root.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p"):
                p_text = "".join(p.itertext()).strip()
                if p_text:
                    texts.append(p_text)
            return "\n".join(texts)
    except Exception as exc:
        raise ValueError(f"Could not extract text from Word document: {exc}")


@app.post("/resume/analyze")
@limiter.limit("10/minute")
async def analyze_resume_endpoint(
    request: Request,
    file: UploadFile = File(...),
    current_user: UserInfo = Depends(get_current_user)
):
    # 1. Content-Type and extension check (supports PDF and DOCX)
    fname = (file.filename or "").lower()
    is_docx = fname.endswith(".docx") or file.content_type in [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword"
    ]
    is_pdf = fname.endswith(".pdf") or file.content_type == "application/pdf"
    if not (is_pdf or is_docx):
        raise InvalidFileTypeError("Only PDF and Word (.docx) resumes are supported.")

    # 2. Chunked read to protect memory & enforce size limit (10 MB)
    chunk_size = 64 * 1024  # 64 KB chunks
    pdf_bytes_list = []
    total_size = 0

    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        total_size += len(chunk)
        if total_size > MAX_RESUME_SIZE:
            raise FileTooLargeError("File size exceeds the 10 MB limit.")
        pdf_bytes_list.append(chunk)

    pdf_bytes = b"".join(pdf_bytes_list)

    # 3. Check for empty file
    if len(pdf_bytes) == 0:
        raise EmptyFileError("Uploaded file is empty.")

    # 4. Extract text depending on file format
    if is_docx:
        try:
            raw_text = extract_docx_text(pdf_bytes)
        except Exception as exc:
            logger.warning("DOCX extraction failed: %s", exc)
            raise InvalidPDFError("The uploaded Word document could not be read.", status_code=422)
    else:
        if not pdf_bytes.startswith(b"%PDF-"):
            raise InvalidPDFError("File does not appear to be a valid PDF document.", status_code=400)
        try:
            raw_text = extract_text(pdf_bytes)
        except ValueError as exc:
            logger.warning("PDF extraction failed: %s", exc)
            raise InvalidPDFError("The uploaded PDF could not be read.", status_code=422)
        except Exception as exc:
            logger.warning("Unexpected error during PDF extraction: %s", exc)
            raise InvalidPDFError("The uploaded PDF could not be read.", status_code=422)

    if not raw_text or not raw_text.strip():
        raise EmptyResumeError("No readable text could be extracted from this resume.")

    # 6. Clean text
    try:
        cleaned_text = clean_resume_text(raw_text)
    except Exception as exc:
        logger.exception("Resume text cleaning failed: %s", exc)
        raise ResumeCleaningFailedError("Resume text could not be processed.")

    if not cleaned_text or not cleaned_text.strip():
        raise EmptyResumeError("No readable text could be extracted from this resume.")

    # Pre-extract real email, phone, links before PII stripping
    import re
    email_match = re.search(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", cleaned_text)
    phone_match = re.search(r"(\+?\d{1,3}[\s\-]?)?(\d{10}|\d{5}[\s\-]\d{5}|\d{4}[\s\-]\d{3}[\s\-]\d{3})", cleaned_text)
    linkedin_match = re.search(r"(?:https?://)?(?:www\.)?linkedin\.com/in/([a-zA-Z0-9_-]+)", cleaned_text)
    github_match = re.search(r"(?:https?://)?(?:www\.)?github\.com/([a-zA-Z0-9_-]+)", cleaned_text)

    actual_email = email_match.group(0) if email_match else ""
    actual_phone = phone_match.group(0) if phone_match else ""
    actual_linkedin = linkedin_match.group(0) if linkedin_match else ""
    actual_github = github_match.group(0) if github_match else ""

    # 7. Strip PII (email, phone) before sending to Gemini
    gemini_text = strip_pii(cleaned_text)

    # 8. Analyze resume with Gemini AI
    try:
        candidate_profile = analyze_resume(gemini_text)
    except (TimeoutError, TimeoutException if "TimeoutException" in globals() else TimeoutError) as exc:
        logger.error("AI service timeout during resume analysis: %s", exc)
        raise AIServiceTimeoutError("AI processing timed out. Please try again.")
    except RuntimeError as exc:
        exc_str = str(exc).lower()
        if "timeout" in exc_str or "timed out" in exc_str:
            logger.error("AI service timeout: %s", exc)
            raise AIServiceTimeoutError("AI processing timed out. Please try again.")
        logger.error("AI service failure during resume analysis: %s", exc)
        raise AIServiceUnavailableError("The AI service is temporarily unavailable. Please try again.")
    except ValueError as exc:
        logger.warning("Resume analysis produced invalid format: %s", exc)
        raise ResumeAnalysisFailedError("Your resume could not be analysed. Please try again.", status_code=502)
    except Exception as exc:
        logger.exception("Unexpected error during resume analysis: %s", exc)
        raise AIServiceUnavailableError("The AI service is temporarily unavailable. Please try again.")

    # Restore accurate contact information
    if not isinstance(candidate_profile.get("candidate"), dict):
        candidate_profile["candidate"] = {}
    if actual_email and (not candidate_profile["candidate"].get("email") or "[EMAIL]" in candidate_profile["candidate"]["email"]):
        candidate_profile["candidate"]["email"] = actual_email
    if actual_phone and (not candidate_profile["candidate"].get("phone") or "[PHONE]" in candidate_profile["candidate"]["phone"]):
        candidate_profile["candidate"]["phone"] = actual_phone
    if actual_linkedin and not candidate_profile["candidate"].get("linkedin"):
        candidate_profile["candidate"]["linkedin"] = actual_linkedin
    if actual_github and not candidate_profile["candidate"].get("github"):
        candidate_profile["candidate"]["github"] = actual_github

    # 8. Persist candidate profile
    try:
        user_id = current_user.user_id
        resume_id = save_candidate_profile(user_id, candidate_profile)
    except Exception as exc:
        logger.exception("Database error saving candidate profile for user %s: %s", current_user.user_id, exc)
        raise InternalServerError("Something went wrong. Please try again.")

    return {
        "success": True,
        "resume_id": resume_id,
        "candidate_profile": candidate_profile
    }


# =============================================================================
# GET /candidate/profile
# =============================================================================

@app.get("/candidate/profile")
def get_candidate_profile_endpoint(current_user: UserInfo = Depends(get_current_user)):
    user_id = current_user.user_id
    profile = get_candidate_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Candidate profile not found")
    return profile


# =============================================================================
# PUT /candidate/profile — intentionally not implemented
# Profile data is managed exclusively via POST /resume/analyze (re-upload).
# =============================================================================

@app.put("/candidate/profile")
def update_candidate_profile_endpoint(current_user: UserInfo = Depends(get_current_user)):
    """
    Direct profile editing is not supported in this version.
    Re-upload your resume via POST /resume/analyze to update your profile.
    """
    raise HTTPException(
        status_code=405,
        detail=(
            "Direct profile editing is not supported. "
            "To update your profile, re-upload your resume via POST /resume/analyze."
        )
    )


# =============================================================================
# GET /roles — full role catalogue
# =============================================================================

@app.get("/roles")
def get_roles(
    search: str | None = Query(None),
    difficulty: str | None = Query(None),
):
    """
    Returns the full role catalogue, optionally filtered by search query and difficulty.
    This endpoint is public (no auth required) — roles are not user-specific.
    """
    roles = list(ROLE_CATALOGUE)
    if search:
        q = search.lower()
        roles = [
            r for r in roles
            if q in r["title"].lower()
            or any(q in s.lower() for s in r["requiredSkills"])
        ]
    if difficulty and difficulty != "All":
        roles = [r for r in roles if r["difficulty"] == difficulty]
    # matchScore is not profile-specific; set to 0 as a placeholder
    return [{**r, "matchScore": 0} for r in roles]


# =============================================================================
# GET /roles/recommend — personalised role recommendations
# =============================================================================

from api.role_intelligence import rank_recommendations, serialize_recommendation


@app.get("/roles/recommend")
def recommend_roles(current_user: UserInfo = Depends(get_current_user)):
    """
    Returns up to 5 role recommendations ranked by the Role Intelligence Engine.

    Algorithm:
      1. Retrieve authenticated user's most recent candidate profile from Supabase.
      2. Pass to rank_recommendations, which builds an evidence-based matching score.
      3. Serialize the rich RoleMatchResult back into the API dictionary format.

    Ownership: only the authenticated user's own profile is used — no cross-user data.
    """
    user_id = current_user.user_id
    profile = get_candidate_profile(user_id)

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="No candidate profile found. Please upload your resume first."
        )

    top_matches = rank_recommendations(profile, ROLE_CATALOGUE, top_n=15, min_score=1)

    # Serialize the results back to dictionaries, pairing with the original role dict
    results = []
    for match in top_matches:
        # Find the original role dictionary from the catalogue
        original_role = next((r for r in ROLE_CATALOGUE if r["id"] == match.role_id), None)
        if original_role:
            results.append(serialize_recommendation(match, original_role))

    return results


# =============================================================================
# GET /interviews — interview history for the current user
# =============================================================================

@app.get("/interviews")
def get_interview_history(current_user: UserInfo = Depends(get_current_user)):
    """
    Return all past interviews for the authenticated user, ordered newest-first.
    Maps DB rows to the HistoryItem shape expected by the frontend.
    """
    user_id = current_user.user_id
    try:
        interviews = repo.get_user_interviews(user_id)
    except Exception as exc:
        logger.error("get_user_interviews failed for user_id=%s: %s", user_id, exc)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve interview history: {exc}"
        )

    history = []
    for row in interviews:
        # Map DB status → frontend status label
        status_map = {
            "completed": "Completed",
            "in_progress": "In Progress",
            "started": "In Progress",
        }
        frontend_status = status_map.get(row.get("status", ""), "In Progress")

        # overall_score is stored as 0-10 float in DB
        overall_score = row.get("overall_score")
        if overall_score is None:
            # Fetch from report if available
            try:
                report_row = repo.get_interview_report(row["interview_id"])
                if report_row:
                    overall_score = report_row.get("overall_score", 0)
            except Exception:
                overall_score = 0
        overall_score = overall_score or 0

        # Duration: use started_at → completed_at if both exist
        duration_minutes = 0
        started_at = row.get("started_at")
        completed_at = row.get("completed_at")
        if started_at and completed_at:
            try:
                from datetime import datetime
                fmt = "%Y-%m-%dT%H:%M:%S"
                # Strip microseconds and timezone suffix for simple parsing
                s = str(started_at)[:19]
                c = str(completed_at)[:19]
                diff = datetime.fromisoformat(c) - datetime.fromisoformat(s)
                duration_minutes = max(1, int(diff.total_seconds() / 60))
            except Exception:
                duration_minutes = 0

        history.append({
            "id": str(row["interview_id"]),
            "roleTitle": row.get("role", "Unknown Role"),
            "date": str(row.get("started_at", ""))[:10],
            "difficulty": "Medium",          # not stored per-interview; use placeholder
            "overallScore": round(float(overall_score), 2),
            "durationMinutes": duration_minutes,
            "status": frontend_status,
        })

    return history


@app.get("/leaderboard")
def get_leaderboard(
    current_user: UserInfo = Depends(get_current_user),
):
    """Return the top candidates by performance, consistency, and profile."""
    del current_user
    try:
        rows = repo.get_leaderboard()
    except Exception as exc:
        logger.error("get_leaderboard failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve leaderboard.",
        ) from exc

    leaderboard = []
    previous_score = None
    current_rank = 0

    for index, row in enumerate(rows, start=1):
        score = round(float(row["leaderboard_score"] or 0), 2)
        if score != previous_score:
            current_rank = index
            previous_score = score

        leaderboard.append({
            "rank": current_rank,
            "userId": row["user_id"],
            "fullName": row["name"],
            "score": score,
            "performanceScore": round(float(row["performance_score"] or 0), 2),
            "consistencyScore": round(float(row["consistency_score"] or 0), 2),
            "profileScore": round(float(row["profile_score"] or 0), 2),
            "interviewsCompleted": row["interviews_completed"],
        })

    return leaderboard
