# AI MOCKORA

AI MOCKORA is a sophisticated, AI-powered platform designed for practicing technical interviews. It provides an adaptive, conversational mock interview experience tailored specifically to a candidate's uploaded resume and their target engineering role.

The application leverages Large Language Models (LLMs) to dynamically evaluate answers, adjust difficulty, and generate a comprehensive performance report.

## System Architecture

The platform is built on a modern, decoupled architecture:

- **Frontend**: A sleek, responsive Single Page Application (SPA) built with React 19, TypeScript, Vite, Tailwind CSS, and Framer Motion. (Located in `scratch_frontend/`)
- **Backend**: A high-performance REST API built with FastAPI (Python 3.13). Handles authentication, database interactions, file processing, and API routing. (Located in `api/`)
- **AI Orchestration**: Powered by **LangGraph**, the interview flow is modeled as a state machine. This allows for robust state persistence, multi-turn conversational memory, and resilience against AI service interruptions. (Located in `langgraph_workflow/`)
- **LLM Integration**: Google Gemini 3.5 is utilized for resume parsing, question generation, answer evaluation, and final narrative reporting.
- **Database**: Supabase PostgreSQL is used as the primary data store. It stores user accounts, candidate profiles, interview session metadata, questions, answers, evaluations, and LangGraph binary checkpoints via `PostgresSaver`.

## Key Features

- **Resume Parsing**: Upload a PDF resume. The system extracts text and uses AI to identify core skills and potential interview topics.
- **Adaptive Interview Engine**: The difficulty of subsequent questions adapts based on the candidate's performance on previous questions.
- **Detailed Evaluation**: Every answer is scored on correctness, completeness, and technical depth. Missing concepts are identified for constructive feedback.
- **Comprehensive Reports**: At the end of an interview, a final report highlights demonstrated strengths, knowledge gaps, and actionable recommendations.
- **Robust Authentication**: Secure JWT-based authentication with PBKDF2 password hashing and an Email OTP fallback mechanism for password resets.

## Prerequisites

- **Python**: 3.13 or newer, using [uv](https://docs.astral.sh/uv/) for lightning-fast dependency management.
- **Node.js**: v18+ and `npm`.
- **Supabase**: A Supabase project with a PostgreSQL database.
- **Gemini API Key**: An active Google Gemini API key.

## Local Setup

### 1. Database Configuration

1. Initialize your Supabase project.
2. Run the migration scripts in the `docs/` or `scratch/` folder to provision the necessary tables (`users`, `resumes`, `interviews`, `questions`, `answers`, `evaluations`, `adaptive_decisions`, `interview_reports`, `password_reset_otps`).
3. Note your Supabase connection strings. LangGraph's `PostgresSaver` requires a connection that supports pipeline mode (use the session pooler URL or direct connection).

### 2. Backend Setup

1. Copy `.env.example` to `.env` in the root directory.
2. Fill in the required environment variables:
   - `SUPABASE_URL` and `SUPABASE_KEY`
   - `DATABASE_URL` (Supabase connection string)
   - `JWT_SECRET_KEY`
   - `GEMINI_API_KEY`
3. Install Python dependencies:
   ```bash
   uv sync
   ```
4. Start the FastAPI development server:
   ```bash
   uv run uvicorn api.main:app --reload
   ```
5. The API will be available at `http://localhost:8000`. API documentation is automatically generated at `http://localhost:8000/docs`.

### 3. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd scratch_frontend
   ```
2. Copy `.env.example` to `.env.local` and configure `VITE_API_BASE_URL` to point to your backend (e.g., `http://localhost:8000`).
3. Install Node dependencies:
   ```bash
   npm install
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```
5. Access the application in your browser at `http://localhost:5173`.

## Testing & Quality Assurance

AI MOCKORA includes a comprehensive test suite to ensure stability and reliability.

- **Backend Unit & Integration Tests**:
  ```bash
  uv run pytest api/
  ```
  These tests are heavily mocked to run locally without requiring live database or Gemini connections. They cover all critical logic including authentication gates, repository state management, error handling, and robust edge-case coverage (expired JWTs, duplicate submissions, invalid IDs).

- **LangGraph Workflow Tests**:
  ```bash
  uv run pytest langgraph_workflow/
  ```

- **End-to-End Validation**:
  The `test_e2e_flow.py` script performs a complete live integration test spanning user signup, resume upload, and a full mock interview loop, verifying that AI generation and database persistence function flawlessly together. (Requires live configuration).

## Security & Privacy

- **Data Isolation**: LangGraph threads are firmly tied to specific `interview_id`s, and the API enforces strict ownership checks ensuring users can only interact with their own data.
- **Exception Handling**: Global exception handlers ensure that internal stack traces or AI API keys are never leaked to the client during a failure.
- **Passwords**: Never stored in plaintext; hashed securely using PBKDF2.
