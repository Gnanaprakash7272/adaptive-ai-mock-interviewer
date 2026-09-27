import os
import logging
from typing import Optional

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from resume_intellegence.text_extract import extract_text
from resume_intellegence.text_clean import clean_resume_text
from resume_intellegence.resume_analyzer import analyze_resume
from api.auth import router as auth_router, get_current_user, UserInfo
from api.interview_router import router as interview_router
from api.resume_repository import save_candidate_profile, get_candidate_profile
from api.role_catalogue import ROLE_CATALOGUE
import api.interview_repository as repo
from api.errors import (
    APIError,
    EmptyFileError,
    InvalidFileTypeError,
    InvalidPDFError,
    FileTooLargeError,
    EmptyResumeError,
    ResumeCleaningFailedError,
    AIServiceUnavailableError,
    AIServiceTimeoutError,
    ResumeAnalysisFailedError,
    InternalServerError,
    MAX_RESUME_SIZE,
    make_error_payload,
    make_error_response,
    CODE_VALIDATION_ERROR,
    CODE_INTERNAL_SERVER_ERROR,
)

logger = logging.getLogger(__name__)

app = FastAPI(title="AI MOCKORA API")


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
    "http://localhost:5173,http://127.0.0.1:5173"
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


@app.get("/")
def root():
    return {"message": "AI MOCKORA API is running"}


# =============================================================================
# POST /resume/analyze
# =============================================================================

@app.post("/resume/analyze")
async def analyze_resume_endpoint(
    file: UploadFile = File(...),
    current_user: UserInfo = Depends(get_current_user)
):
    # 1. Content-Type check
    if file.content_type != "application/pdf":
        raise InvalidFileTypeError("Only PDF resumes are supported.")

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

    # 4. Check magic bytes (%PDF-)
    if not pdf_bytes.startswith(b"%PDF-"):
        raise InvalidPDFError("File does not appear to be a valid PDF document.", status_code=400)

    # 5. Extract text via PyMuPDF
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

    # 7. Analyze resume with Gemini AI
    try:
        candidate_profile = analyze_resume(cleaned_text)
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
    search: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
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
                from datetime import datetime, timezone
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