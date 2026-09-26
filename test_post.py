import json
from resume_intellegence.resume_analyzer import analyze_resume

try:
    result = analyze_resume("John Doe, Software Engineer with 5 years experience in Python and FastAPI. Built scalable web apps.")
    print("SUCCESS")
    print(json.dumps(result, indent=2))
except Exception as e:
    print("FAILED")
    import traceback
    traceback.print_exc()
