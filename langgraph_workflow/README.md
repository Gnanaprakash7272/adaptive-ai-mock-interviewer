# AI MOCKORA - LangGraph Workflow

This directory contains the core orchestration layer for the AI MOCKORA interview experience.
We use **LangGraph** to model the interview as a State Machine, ensuring robust checkpointing, memory, and graceful recovery from failures.

## Architecture

- **State Graph**: The interview is defined as a directed graph of nodes (`interview_graph.py`).
- **State Definition**: The `InterviewState` typed dictionary (`interview_state.py`) holds all variables for a single interview session (topics, questions, answers, evaluations, history, and final reports).
- **Checkpointer**: State is persisted using a PostgreSQL Checkpointer (`langgraph.checkpoint.postgres.PostgresSaver`), which saves the exact state of the interview at each step to the Supabase database.

## Workflow Nodes

1. **`create_interview_plan`**: Formulates a plan based on the candidate's parsed resume and the selected role.
2. **`generate_question`**: Prompts the LLM to generate the next interview question, targeted at a specific concept and difficulty level.
3. **`evaluate_answer`**: Evaluates the candidate's submitted answer for correctness, completeness, technical depth, and missing concepts.
4. **`adaptive_decision`**: Based on the evaluation, decides whether to increase, maintain, or decrease the difficulty for the next question, or move to a new topic.
5. **`generate_final_report`**: When `max_questions` is reached, aggregates all evaluations and history to generate a comprehensive, structured JSON report outlining strengths, weaknesses, and actionable recommendations.

## Resilience & Continuity

Because the state is persisted after every step, the system can gracefully handle:
- Server restarts or crashes.
- Network timeouts communicating with the LLM.
- Duplicate answer submissions.

If the graph fails midway (e.g., during `evaluate_answer`), the frontend can simply retry the request, and LangGraph will resume exactly where it left off, avoiding redundant API calls and preventing duplicate questions.

## Running Tests

Tests in this directory verify the logical flow of the state machine, isolating it from both FastAPI and the PostgreSQL checkpointer.

```bash
uv run pytest langgraph_workflow/
```
