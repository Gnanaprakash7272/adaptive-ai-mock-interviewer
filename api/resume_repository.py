import logging
from typing import Any

from api.db import supabase

log = logging.getLogger(__name__)


def _safe_str(value: Any) -> str:
    """Return string representation of value, returning '' for None."""
    if value is None:
        return ""
    return str(value)

def _parse_resume_date(d: Any) -> str | None:
    if not d:
        return None
    s = str(d).strip()
    if not s or s.lower() == "present":
        return None
    
    import re
    from datetime import datetime
    
    # Already YYYY-MM-DD
    if re.match(r"^\d{4}-\d{2}-\d{2}$", s):
        return s
    
    # YYYY
    if len(s) == 4 and s.isdigit():
        return f"{s}-01-01"
        
    # YYYY-MM
    if len(s) == 7 and re.match(r"^\d{4}-\d{2}$", s):
        return f"{s}-01"
        
    # Try fuzzy parsing common formats like 'Nov 2026'
    for fmt in ("%b %Y", "%B %Y", "%m/%Y", "%m-%Y", "%Y"):
        try:
            return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except ValueError:
            pass
            
    # If we really can't parse it, drop it to prevent DB crash
    return None

def save_candidate_profile(user_id: int, profile: dict[str, Any]) -> int:
    """Saves a candidate profile (nested dict) into relational tables and returns resume_id."""
    # 1. Upsert into resumes (insert if new, update if this user already has a resume)
    candidate = profile.get("candidate", {})
    resume_name = candidate.get("name", "Unknown Candidate")
    email = candidate.get("email", "")
    phone = candidate.get("phone", "")
    location = candidate.get("location", "")

    profile_metadata = {
        "potential_interview_topics": profile.get("potential_interview_topics", []),
        "expertise_areas": profile.get("expertise_areas", []),
        "achievements": profile.get("achievements", []),
        "competitive_programming": profile.get("competitive_programming", {}),
        "languages": profile.get("languages", []),
        "interests": profile.get("interests", []),
        "publications": profile.get("publications", [])
    }

    try:
        res = supabase.table("resumes").upsert({
            "user_id": user_id,
            "name": resume_name,
            "email": email,
            "phone": phone,
            "location": location,
            "profile_metadata": profile_metadata
        }, on_conflict="user_id").execute()
    except Exception as e:
        # Re-raise — do not silently fall back to an incomplete schema.
        # If the new columns don't exist, run the migration SQL first.
        raise RuntimeError(
            f"Failed to insert resume for user_id={user_id}. "
            f"Ensure the resumes table has email, phone, location, and profile_metadata columns. "
            f"Error: {e}"
        ) from e

    if not res.data:
        raise Exception("Failed to insert resume")
    resume_id = res.data[0]["resume_id"]

    # Re-upload case: clear old child rows tied to this resume before inserting fresh ones
    try:
        supabase.table("education").delete().eq("resume_id", resume_id).execute()
        supabase.table("skills").delete().eq("resume_id", resume_id).execute()
        supabase.table("experiences").delete().eq("resume_id", resume_id).execute()

        existing_projects = supabase.table("projects").select("project_id").eq("resume_id", resume_id).execute()
        for p in existing_projects.data:
            supabase.table("project_technologies").delete().eq("project_id", p["project_id"]).execute()
        supabase.table("projects").delete().eq("resume_id", resume_id).execute()

        supabase.table("certifications").delete().eq("resume_id", resume_id).execute()
    except Exception as e:
        import logging
        logging.error(f"Failed to clear old child rows for resume_id={resume_id}: {e}")

    # 2. Insert education
    education_list = profile.get("education", [])
    if education_list:
        ed_rows = []
        for ed in education_list:
            try:
                sy = ed.get("start_year")
                ey = ed.get("end_year")
                ed_rows.append({
                    "resume_id": resume_id,
                    "degree": str(ed.get("degree", "")),
                    "field": str(ed.get("field", "")),
                    "institution": str(ed.get("institution", "")),
                    "start_year": int(str(sy).strip()) if sy and str(sy).strip().isdigit() else None,
                    "end_year": int(str(ey).strip()) if ey and str(ey).strip().isdigit() else None,
                    "cgpa": str(ed.get("cgpa", "")),
                    "details": str(ed.get("details", ""))
                })
            except Exception as e:
                import logging
                logging.warning(f"Skipping an education row due to error: {e}")

        if ed_rows:
            try:
                supabase.table("education").insert(ed_rows).execute()
            except Exception as e:
                raise RuntimeError(f"Failed to insert education for resume_id={resume_id}: {e}") from e

    # 3. Insert skills
    skills_dict = profile.get("skills", {})
    skill_rows = []
    for category, skill_list in skills_dict.items():
        if isinstance(skill_list, list):
            for skill in skill_list:
                skill_rows.append({
                    "resume_id": resume_id,
                    "category": str(category),
                    "skill_name": str(skill)
                })
    if skill_rows:
        try:
            supabase.table("skills").insert(skill_rows).execute()
        except Exception as e:
            raise RuntimeError(f"Failed to insert skills for resume_id={resume_id}: {e}") from e

    # 4. Insert experiences
    experience_list = profile.get("experience", [])
    if experience_list:
        exp_rows = []
        for exp in experience_list:
            exp_row = {
                "resume_id": resume_id,
                "company": _safe_str(exp.get("company")),
                "role": _safe_str(exp.get("role")),
                "location": _safe_str(exp.get("location")),
                "responsibilities": "\n".join(exp.get("responsibilities", [])) if isinstance(exp.get("responsibilities"), list) else _safe_str(exp.get("responsibilities")),
                "technologies": exp.get("technologies") if isinstance(exp.get("technologies"), list) else [],
            }
            # Parse dates safely
            sd = _parse_resume_date(exp.get("start_date"))
            if sd: exp_row["start_date"] = sd
            
            ed = _parse_resume_date(exp.get("end_date"))
            if ed: exp_row["end_date"] = ed
            exp_rows.append(exp_row)
        try:
            if exp_rows:
                supabase.table("experiences").insert(exp_rows).execute()
        except Exception as exc:
            raise RuntimeError(f"Failed to insert experiences for resume_id={resume_id}: {exc}") from exc

    # 5. Insert projects and project_technologies
    projects_list = profile.get("projects", [])
    for proj in projects_list:
        try:
            p_res = supabase.table("projects").insert({
                "resume_id": resume_id,
                "name": _safe_str(proj.get("name")),
                "description": _safe_str(proj.get("description")),
                "domain": _safe_str(proj.get("domain")),
                "role": _safe_str(proj.get("role")),
                "duration": _safe_str(proj.get("duration"))
            }).execute()
            if p_res.data:
                project_id = p_res.data[0]["project_id"]
                techs = proj.get("technologies", [])
                if techs:
                    t_rows = [{"project_id": project_id, "technology": _safe_str(t)} for t in techs]
                    supabase.table("project_technologies").insert(t_rows).execute()
        except Exception as exc:
            raise RuntimeError(f"Failed to insert project for resume_id={resume_id}: {exc}") from exc

    # 6. Insert certifications
    certs = profile.get("certifications", [])
    if certs:
        c_rows = []
        for c in certs:
            c_rows.append({
                "resume_id": resume_id,
                "name": str(c.get("name", "")),
                "issuer": str(c.get("issuer", "")),
                "year": str(c.get("year", ""))
            })
        try:
            if c_rows:
                supabase.table("certifications").insert(c_rows).execute()
        except Exception as exc:
            raise RuntimeError(f"Failed to insert certifications for resume_id={resume_id}: {exc}") from exc

    return resume_id

def get_candidate_profile(user_id: int) -> dict[str, Any] | None:
    # Get most recent resume
    res = supabase.table("resumes").select("*").eq("user_id", user_id).order("resume_id", desc=True).limit(1).execute()
    if not res.data:
        return None
    resume = res.data[0]
    resume_id = resume["resume_id"]

    metadata = resume.get("profile_metadata") or {}

    profile = {
        "resume_id": resume_id,
        "candidate": {
            "name": resume.get("name", ""),
            "email": resume.get("email", ""),
            "phone": resume.get("phone", ""),
            "location": resume.get("location", "")
        },
        "education": [],
        "skills": {},
        "projects": [],
        "experience": [],
        "certifications": [],
        "potential_interview_topics": metadata.get("potential_interview_topics", []),
        "expertise_areas": metadata.get("expertise_areas", []),
        "achievements": metadata.get("achievements", []),
        "competitive_programming": metadata.get("competitive_programming", {
            "platforms": [],
            "problems_solved": "",
            "ratings": ""
        }),
        "languages": metadata.get("languages", []),
        "interests": metadata.get("interests", []),
        "publications": metadata.get("publications", [])
    }

    # Fetch education
    ed_res = supabase.table("education").select("*").eq("resume_id", resume_id).execute()
    for ed in ed_res.data:
        profile["education"].append({
            "degree": ed.get("degree", ""),
            "field": ed.get("field", ""),
            "institution": ed.get("institution", ""),
            "start_year": str(ed.get("start_year")) if ed.get("start_year") else "",
            "end_year": str(ed.get("end_year")) if ed.get("end_year") else "",
            "cgpa": ed.get("cgpa", ""),
            "details": ed.get("details", "")
        })

    # Fetch skills
    sk_res = supabase.table("skills").select("*").eq("resume_id", resume_id).execute()
    for sk in sk_res.data:
        cat = sk.get("category", "other")
        if cat not in profile["skills"]:
            profile["skills"][cat] = []
        profile["skills"][cat].append(sk.get("skill_name"))

    # Fetch experiences
    ex_res = supabase.table("experiences").select("*").eq("resume_id", resume_id).execute()
    for ex in ex_res.data:
        profile["experience"].append({
            "company": ex.get("company", ""),
            "role": ex.get("role", ""),
            "location": ex.get("location", ""),
            "start_date": _safe_str(ex.get("start_date")),
            "end_date": _safe_str(ex.get("end_date")),
            "responsibilities": ex.get("responsibilities", "").split("\n") if ex.get("responsibilities") else [],
            "technologies": ex.get("technologies") if isinstance(ex.get("technologies"), list) else [],
        })

    # Fetch projects
    pr_res = supabase.table("projects").select("*, project_technologies(technology)").eq("resume_id", resume_id).execute()
    for pr in pr_res.data:
        techs = [t["technology"] for t in pr.get("project_technologies", [])]
        profile["projects"].append({
            "name": pr.get("name", ""),
            "description": pr.get("description", ""),
            "domain": pr.get("domain", ""),
            "role": pr.get("role", ""),
            "duration": pr.get("duration", ""),
            "technologies": techs,
            "key_contributions": []
        })

    # Fetch certifications
    cert_res = supabase.table("certifications").select("*").eq("resume_id", resume_id).execute()
    for cert in cert_res.data:
        profile["certifications"].append({
            "name": cert.get("name", ""),
            "issuer": cert.get("issuer", ""),
            "year": cert.get("year", "")
        })

    return profile
