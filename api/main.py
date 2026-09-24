from fastapi import FastAPI, File, UploadFile, HTTPException

from resume_intellegence.text_extract import extract_text
from resume_intellegence.text_clean import clean_resume_text
from resume_intellegence.resume_analyzer import analyze_resume
from api.auth import router as auth_router


app = FastAPI(title="AI MOCKORA API")
app.include_router(auth_router)



@app.get("/")
def root():
    return {
        "message": "AI MOCKORA API is running"
    }


@app.post("/resume/analyze")
async def analyze_resume_endpoint(file: UploadFile = File(...)):

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

        return {
            "success": True,
            "candidate_profile": candidate_profile
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=str(error)
        )