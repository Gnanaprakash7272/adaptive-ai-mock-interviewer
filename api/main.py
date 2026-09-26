import os
import logging
from typing import Optional

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware

from resume_intellegence.text_extract import extract_text
from resume_intellegence.text_clean import clean_resume_text
from resume_intellegence.resume_analyzer import analyze_resume
from api.auth import router as auth_router, get_current_user, UserInfo
from api.interview_router import router as interview_router
from api.resume_repository import save_candidate_profile, get_candidate_profile
from api.role_catalogue import ROLE_CATALOGUE
import api.interview_repository as repo

logger = logging.getLogger(__name__)

app = FastAPI(title="AI MOCKORA API")

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
    if file.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="Only PDF resumes are supported."
        )

    pdf_bytes = await file.read()

    try:
        raw_text = extract_text(pdf_bytes)
        cleaned_text = clean_resume_text(raw_text)
        candidate_profile = analyze_resume(cleaned_text)

        user_id = current_user.user_id
        resume_id = save_candidate_profile(user_id, candidate_profile)

        return {
            "success": True,
            "resume_id": resume_id,
            "candidate_profile": candidate_profile
        }

    except Exception as error:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


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

def _compute_match(
    candidate_skills: set,
    role_required: list,
) -> tuple:
    """
    Deterministic skill-alignment score.

    Formula:
      matched   = { s ∈ role_required | s (case-insensitive substring match) ∈ candidate_skills }
      score     = |matched| / |role_required|   (0.0 – 1.0)
      matchPct  = round(score * 100)

    Substring matching is bidirectional: a candidate skill 'fastapi' matches
    a required skill 'FastAPI / Python', and vice-versa.
    """
    matched, gaps = [], []
    for req in role_required:
        req_lower = req.lower().strip()
        found = any(
            cand in req_lower or req_lower in cand
            for cand in candidate_skills
        )
        (matched if found else gaps).append(req)
    pct = round((len(matched) / len(role_required)) * 100) if role_required else 0
    return matched, gaps, pct


@app.get("/roles/recommend")
def recommend_roles(current_user: UserInfo = Depends(get_current_user)):
    """
    Returns up to 5 role recommendations ranked by deterministic skill-alignment score.

    Algorithm:
      1. Retrieve authenticated user's most recent candidate profile from Supabase.
      2. Flatten all candidate skills (programming_languages, frameworks, libraries,
         databases, ai_ml, cloud_devops, tools, other) plus project technologies
         into a single lower-cased set.
      3. For every role in ROLE_CATALOGUE compute _compute_match().
      4. Keep roles with matchScore > 0, sort descending, return top 5.

    Ownership: only the authenticated user's own profile is used — no cross-user data.
    """
    user_id = current_user.user_id
    profile = get_candidate_profile(user_id)

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="No candidate profile found. Please upload your resume first."
        )

    # Build flat lower-cased skill set from profile
    candidate_skills: set = set()

    skills_dict = profile.get("skills", {})
    for skill_list in skills_dict.values():
        if isinstance(skill_list, list):
            for s in skill_list:
                candidate_skills.add(str(s).lower().strip())

    for proj in profile.get("projects", []):
        for t in proj.get("technologies", []):
            candidate_skills.add(str(t).lower().strip())

    for exp in profile.get("experience", []):
        for t in exp.get("technologies", []):
            candidate_skills.add(str(t).lower().strip())

    for topic in profile.get("potential_interview_topics", []):
        candidate_skills.add(str(topic).lower().strip())

    results = []
    for role in ROLE_CATALOGUE:
        matched, gaps, pct = _compute_match(candidate_skills, role["requiredSkills"])
        if pct == 0:
            continue

        if pct >= 80:
            reason = "Excellent match — your skills strongly align with this role."
        elif pct >= 50:
            reason = "Good match — your experience covers the core requirements."
        else:
            reason = "Partial match — some overlapping skills found."

        results.append({
            **role,
            "matchScore": pct,
            "matchedSkills": matched,
            "skillGaps": gaps,
            "reason": reason,
        })

    results.sort(key=lambda r: r["matchScore"], reverse=True)
    return results[:5]


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