# AI MOCKORA
**Your Adaptive, AI-Powered Mock Interviewer**

---

## Demo
- **Live Demo:** https://mockora-ai.vercel.app

---

## Project Overview
**AI MOCKORA** is a sophisticated, AI-driven platform that simulates highly realistic technical interviews. Unlike static question banks, MOCKORA reads your resume, understands your target role, and conducts an adaptive, multi-turn interview. It evaluates each answer immediately, adjusts the difficulty of follow-up questions, and provides a deep, actionable feedback report to help you land your dream job.

---

## Problem Statement
Preparing for technical interviews is broken:
- Human mock interviews are **expensive** and **hard to schedule**.
- Generic coding platforms lack **verbal/system-design** context.
- Most AI tools ask **static, canned questions** that don't reflect a candidate's actual resume or dynamically adapt to their real-time performance.

**MOCKORA solves this** by acting as an expert, dynamic technical interviewer available 24/7.

---

## Key Features
- **Deep Resume Parsing**: Extracts structured skills and experiences directly from uploaded PDFs.
- **Adaptive Difficulty**: AI adjusts the interview's difficulty and topic based on the technical depth of your previous answers.
- **Immediate Evaluation**: Every answer is scored for correctness, completeness, and missing concepts.
- **Comprehensive Final Reports**: Generates actionable insights, highlighting your demonstrated strengths and knowledge gaps.
- **Resilient AI Orchestration**: Multi-turn conversational memory powered by LangGraph ensures state is never lost.

---

## Why MOCKORA?

Traditional mock interviews are often static:

`Candidate → Question → Answer → Score`

MOCKORA introduces an adaptive loop:

```text
Candidate Profile
        ↓
Role Intelligence
        ↓
    Question
        ↓
     Answer
        ↓
   Evaluation
        ↓
Adaptive Decision
        ↓
Follow-up / New Topic / Difficulty Change
        ↓
   Final Report
```

---



## System Architecture

MOCKORA is built on a modern, decoupled architecture designed for scale and maintainability:
- **Frontend**: A sleek Single Page Application (SPA) providing a responsive conversational interview interface.
- **Backend API**: A robust REST API routing requests, enforcing security, and interfacing with the database.
- **AI Orchestration Layer**: A separate graph-based state machine handling complex LLM reasoning chains.
- **Database**: Relational data store handling users, interview transcripts, and binary graph checkpoints.

### Architecture Diagram

```text
                    ┌──────────────────┐
                    │    Candidate     │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ React + Vite UI  │
                    └────────┬─────────┘
                             │ REST
                             ▼
                    ┌──────────────────┐
                    │     FastAPI      │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
       Resume Intelligence  Role       Authentication
                           Intelligence
              │              │
              └───────┬──────┘
                      ▼
              ┌─────────────────┐
              │    LangGraph    │
              │ Interview State │
              └────────┬────────┘
                       │
                       ▼
                  ┌─────────┐
                  │ Gemini  │
                  └────┬────┘
                       │
                       ▼
              ┌─────────────────┐
              │ Supabase        │
              │ PostgreSQL      │
              └─────────────────┘
```

---

## AI Architecture

### LLM vs Application Control

MOCKORA separates language intelligence from application control.

**The LLM is responsible for:**
- Question generation
- Answer evaluation
- Feedback generation
- Final report generation

**The deterministic application layer is responsible for:**
- Interview state
- Topic coverage
- Difficulty transitions
- Follow-up limits
- User ownership
- Persistence
- Workflow routing

LangGraph coordinates these components as a stateful interview workflow.
- **Nodes**: Distinct steps (Plan, Generate Question, Evaluate, Decide Next Step, Generate Report).
- **Checkpointer**: Uses `PostgresSaver` to serialize and save the exact interview state to the database after every node. This ensures the interview can gracefully recover from network failures, server restarts, or duplicated requests.

---

## Tech Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, Lucide Icons.
- **Backend**: FastAPI, Python 3.13, `uv` (dependency management), PyJWT.
- **AI / LLM**: Google Gemini API, LangGraph, PyMuPDF (PDF parsing).
- **Database**: Supabase (PostgreSQL), `supabase-py`, `asyncpg`.

---

## Project Structure
```text
adaptive-ai-mock-interviewer/
├── adaptive_intelligence/ # Core adaptive logic and difficulty tuning
├── answer_intelligence/   # Answer evaluation and feedback generation
├── api/                   # FastAPI backend, routers, auth, repositories
├── supabase/migrations/   # Database schema migrations
├── langgraph_workflow/    # Orchestration, state definitions, graph nodes
├── question_intelligence/ # Generates dynamic follow-ups and new questions
├── report_intelligence/   # Final evaluation report generation logic
├── resume_intelligence/   # PDF parsing and candidate profile extraction
├── scratch_frontend/      # React + Vite frontend application
├── ai_schemas.py          # Pydantic schemas for LLM structured outputs
├── gemini_config.py       # Centralized Gemini model configuration
├── pyproject.toml         # Python project metadata
├── pytest.ini             # Pytest configuration
├── requirements.txt       # Dependencies
├── uv.lock                # Locked dependencies for uv
└── README.md              # Project documentation
```

---

## Adaptive Interview Logic

After each answer, MOCKORA evaluates:
- Correctness
- Completeness
- Technical depth
- Missing concepts
- Confidence
- Follow-up requirement

The adaptive engine combines these signals with the current interview history and topic coverage to determine the next action.

**Possible actions include:**
- Ask a targeted follow-up
- Increase difficulty
- Maintain difficulty
- Reduce difficulty
- Move to a new topic
- Complete the interview

A topic is not considered fully covered simply because a candidate answered one question. The engine can use follow-up questions to verify understanding before moving forward.

---

## Resume Intelligence
MOCKORA doesn't just read text; it understands context.
- **Extraction**: `PyMuPDF` reads the raw PDF bytes.
- **Sanitization**: Regular expressions clean out control characters and formatting artifacts.
- **Structuring**: The Gemini model parses the raw text into a strict JSON schema containing potential interview topics, skills, and experience.

---

## Authentication
- **Authentication**: JWT-based authentication
- **Password Security**: PBKDF2 password hashing with random salts
- **Recovery**: Email OTP-based password reset

---

## Database Design
MOCKORA relies on a highly normalized PostgreSQL schema hosted on Supabase:
- `users`: Core identity and authentication.
- `interviews`: Session metadata (role, status, timestamps).
- `questions` & `answers`: The chronological transcript of the session.
- `interview_reports`: The final aggregated output.
- `password_reset_otps`: Time-bound codes for account recovery.

---

## Setup & Installation

### Prerequisites
- Python 3.13+ and [uv](https://docs.astral.sh/uv/)
- Node.js v18+ and `npm`
- A Supabase PostgreSQL database
- A Google Gemini API Key

### Clone the Repository
```bash
git clone https://github.com/Gnanaprakash7272/adaptive-ai-mock-interviewer.git
cd adaptive-ai-mock-interviewer
```

---

## Environment Variables
Copy `.env.example` to `.env` in the root directory and populate:
```env
# Supabase
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_KEY="your-anon-or-service-key"
DATABASE_URL="postgresql://user:pass@host:5432/postgres" # Session Pooler or Direct

# AI
GEMINI_API_KEY="your-google-gemini-key"

# Security
JWT_SECRET_KEY="a-very-secure-random-string"

# SMTP (Optional, for Password Resets)
SMTP_SERVER="smtp.gmail.com"
SMTP_PORT=587
SMTP_USERNAME="youremail@gmail.com"
SMTP_PASSWORD="your-app-password"
```

---

## Running the Project

**1. Start the Backend API:**
```bash
uv sync
uv run uvicorn api.main:app --reload
```
*API runs on `http://localhost:8000`. Swagger docs at `/docs`.*

**2. Start the Frontend Application:**
```bash
cd scratch_frontend
npm install
# Ensure you copy .env.example to .env.local and set VITE_API_BASE_URL=http://localhost:8000
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## Testing
MOCKORA includes a comprehensive, decoupled test suite.

**Primary Documented Command:**
```bash
uv run pytest -q
```

**Latest Validation:**
- Python 3.13.13
- 224 tests passed
- 3 tests skipped

---

## Deployment
The platform is designed to be deployed effortlessly to **Vercel** utilizing Vercel Services:
- The React application is deployed as the primary frontend project.
- The FastAPI backend is configured as Serverless Functions via a `vercel.json` rewrite configuration.

---

## Security
- **Data Isolation**: Application logic strictly enforces that users can only access their own `interview_id` records.
- **Fail-Safe Orchestration**: Graph exceptions are intercepted and converted to generic 500 API errors, preventing stack-trace or API key leakage.
- **Injection Protection**: Direct database queries use parameterized `asyncpg` execution, while REST queries use the validated `supabase-py` client.

---

## Team / Contributions
Contributions are welcome! Please open an issue first to discuss what you would like to change.
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## Future Enhancements
- 🎙️ **Voice / Audio Mode**: Speech-to-text inputs and text-to-speech AI voices for real-time verbal conversations.
- 💻 **Integrated Code Editor**: A Monaco-powered coding scratchpad for live algorithmic rounds.
- 📊 **Historical Analytics Dashboards**: Tracking candidate performance over time across multiple interviews.
- ⚡ **WebSocket Streaming**: Streaming AI responses chunk-by-chunk for an immediate, sub-second TTFB (Time to First Byte).

---

## License
Distributed under the MIT License. See `LICENSE` for more information.
