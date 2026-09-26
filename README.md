# Mockora.ai

Mockora.ai is an AI-powered platform for practicing technical interviews with questions tailored to a candidate's resume and target role.

## Architecture

- **Frontend:** React 19, TypeScript, and Vite in `scratch_frontend/`.
- **Backend:** FastAPI application at `api.main:app`, with resume, question, answer-evaluation, adaptive-interview, and reporting modules.
- **AI:** Google Gemini powers resume analysis, question generation, answer evaluation, and report narratives.
- **Workflow:** LangGraph coordinates interview turns and persists checkpoints in Supabase PostgreSQL through `PostgresSaver`.
- **Data:** Supabase stores user, resume, interview, and report records.

The target production deployment is one Vercel project using Vercel Services: the Vite frontend service uses `scratch_frontend/`, and the FastAPI service uses the repository root. This Services configuration is not yet present; the frontend build command is `npm run build` with output directory `dist`.

## Requirements

- Python 3.13 or newer and [uv](https://docs.astral.sh/uv/)
- Node.js and npm
- Supabase project credentials and a Google Gemini API key

## Local Development

### Backend

1. Copy `.env.example` to `.env` and set the required backend values.
2. Install dependencies with `uv sync`.
3. Start the API with `uv run uvicorn api.main:app --reload`.

The API is available at `http://localhost:8000`; its interactive OpenAPI page is at `/docs`.

### Frontend

```powershell
cd scratch_frontend
npm install
```

Copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL` to the backend URL. Start the dev server with `npm run dev`; create a production build with `npm run build`.

## Environment Variables

Backend settings are documented by the placeholder values in the root `.env.example`. Required values are `SUPABASE_URL`, `SUPABASE_KEY`, `DATABASE_URL`, `JWT_SECRET_KEY`, and `GEMINI_API_KEY`; `JWT_ALGORITHM`, `JWT_ACCESS_TOKEN_EXPIRE_MINUTES`, `GEMINI_MODEL`, `GEMINI_MODEL_FALLBACKS`, and `CORS_ORIGINS` are configurable. `LANGGRAPH_STRICT_MSGPACK=true` enables checkpoint deserialization protection. Never commit real credentials.

`DATABASE_URL` must be a server-side Supabase PostgreSQL connection string. LangGraph's PostgresSaver uses PostgreSQL pipeline mode, which Supabase's transaction pooler does not support; use the Supabase session pooler (or a supported direct connection) for this value. Checkpoint tables are initialized once per process under a PostgreSQL advisory lock. Keep the URL out of all `VITE_*` variables.

`VITE_API_BASE_URL` is for local development or a separately hosted API. A same-origin Vercel Services deployment must use relative API URLs; the current frontend still defaults to `http://localhost:8000` and needs that client-side adjustment before such a deployment. Only public frontend configuration belongs in `VITE_*` variables; do not put Gemini, JWT, or Supabase service credentials in frontend environment variables.

## Tests

Run backend unit tests with `uv run pytest --ignore=test_e2e_flow.py`. PostgreSQL checkpointer integration tests run only when `LANGGRAPH_TEST_DATABASE_URL` points to a disposable database. `test_e2e_flow.py` is a separate live integration test that calls Gemini and writes to Supabase; follow its instructions and use a disposable test account when running it.

Database migrations and schema notes are in `docs/`. Verify the required migrations have been applied to the target Supabase database before deploying the backend.
