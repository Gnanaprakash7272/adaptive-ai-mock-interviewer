# AI MOCKORA - Backend API

This directory contains the FastAPI backend for AI MOCKORA.
It manages user authentication, resume parsing, AI mock interview orchestration, and database persistence.

## Architecture & Stack

- **Framework**: FastAPI (Python 3.13+)
- **Authentication**: JWT-based with PBKDF2 password hashing. Email OTP for password reset.
- **Database**: Supabase PostgreSQL.
- **ORM / DB Access**: `supabase-py` (REST API).

## Directory Structure

- `main.py`: The FastAPI application entrypoint. Configures CORS, exception handlers, and includes routers.
- `auth.py`: Authentication router (`/auth/*`), JWT token generation, password hashing, OTP generation.
- `interview_router.py`: Interview workflow endpoints (`/interview/start`, `/interview/{id}/answer`). Connects HTTP requests to the LangGraph AI workflow.
- `interview_repository.py`: Data access layer for interviews, questions, answers, and evaluations.
- `resume_repository.py`: Data access layer for parsed candidate profiles and skills.
- `db.py`: Supabase client initialization.
- `errors.py`: Standardized error codes and HTTP exception definitions.
- `role_catalogue.py` / `role_intelligence.py`: Manages the available interview engineering tracks and role descriptions.
- `test_*.py`: Comprehensive unit and integration tests for all backend modules.

## Key Workflows

### 1. Authentication
Users sign up with email and password. A JWT is issued upon successful login, which must be passed in the `Authorization: Bearer <token>` header for protected endpoints. The system also supports a robust Email OTP workflow for password resets, utilizing standard SMTP servers.

### 2. Resume Processing
Resumes are uploaded as PDFs, parsed into raw text, cleaned, and evaluated by Gemini to extract structured `candidate_profile` JSON data containing skills, experience, and potential interview topics.

### 3. Interview Orchestration
The API delegates the conversational state management to the `langgraph_workflow` module. When a user submits an answer, the router resumes the LangGraph thread, evaluates the answer, adapts the difficulty, and streams back the next question or the final report.

## Running Locally

Ensure your `.env` is configured correctly (see root README).

Start the server:
```bash
uv run uvicorn api.main:app --reload
```

## Running Tests

Run the test suite using `pytest`:
```bash
uv run pytest api/
```
Tests are completely isolated and do not make live DB or Gemini calls (except `test_e2e_flow.py` in the root).
