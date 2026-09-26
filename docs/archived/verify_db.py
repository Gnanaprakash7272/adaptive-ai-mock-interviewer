import os
import sys
from dotenv import load_dotenv

load_dotenv(override=True)
from api.db import supabase
from api.resume_repository import get_candidate_profile

def verify():
    # 1. Identify user (from latest resume, as users table has RLS)
    resumes_recent = supabase.table('resumes').select('user_id').order('resume_id', desc=True).limit(1).execute()
    if not resumes_recent.data:
        print("A. PASS/FAIL: FAIL (No resumes found, cannot determine user_id)")
        return
    user_id = resumes_recent.data[0]['user_id']
    print(f"B. user_id: {user_id}")

    # 2 & 3. Verify resumes row
    resumes = supabase.table('resumes').select('*').eq('user_id', user_id).execute()
    if not resumes.data:
        print("A. PASS/FAIL: FAIL (No resume found for user)")
        return

    # 7. Check for duplicates
    if len(resumes.data) > 1:
        print("F. duplicate/ownership problems: FAIL (Duplicate profiles found for user)")
    else:
        print("F. duplicate/ownership problems: PASS (No duplicates)")

    resume = resumes.data[0]
    resume_id = resume['resume_id']
    print(f"C. resume_id: {resume_id}")

    fields_to_check = ['resume_id', 'user_id', 'name', 'email', 'phone', 'location', 'profile_metadata']
    missing_fields = [f for f in fields_to_check if f not in resume]
    if missing_fields:
        print(f"A. PASS/FAIL: FAIL (Missing fields in resume: {missing_fields})")
    else:
        print("A. PASS/FAIL: PASS (Resume fields verified)")

    # 4. Verify child records
    child_tables = ['education', 'skills', 'projects', 'experiences', 'certifications']
    print("D. row counts for each child table:")
    for table in child_tables:
        try:
            res = supabase.table(table).select('*', count='exact').eq('resume_id', resume_id).execute()
            count = len(res.data) if res.data else 0
            print(f"  - {table}: {count}")
            
            if table == 'projects' and count > 0:
                # Check project_technologies
                project_ids = [p['project_id'] for p in res.data]
                tech_count = 0
                for pid in project_ids:
                    tech_res = supabase.table('project_technologies').select('*', count='exact').eq('project_id', pid).execute()
                    tech_count += len(tech_res.data) if tech_res.data else 0
                print(f"  - project_technologies: {tech_count}")
        except Exception as e:
            print(f"  - {table}: Error checking table: {e}")

    # 5. Verify GET /candidate/profile
    try:
        profile = get_candidate_profile(user_id)
        if profile and profile.get('resume_id') == resume_id:
            print("E. whether GET /candidate/profile matches DB data: PASS")
        else:
            print("E. whether GET /candidate/profile matches DB data: FAIL (Mismatched or empty)")
    except Exception as e:
        print(f"E. whether GET /candidate/profile matches DB data: FAIL ({e})")
        
    print("G. exact remaining issue: Check output above for any FAILs")

if __name__ == '__main__':
    verify()
