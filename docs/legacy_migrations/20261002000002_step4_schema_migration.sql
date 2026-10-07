-- =============================================================================
-- AI MOCKORA — Step 4A Schema Migration
-- File   : supabase/migrations/20261002000002_step4_schema_migration.sql
-- Status : PREPARED — NOT APPLIED
-- Author : AI MOCKORA backend team
-- Date   : 2026-09-24
-- =============================================================================
--
-- PURPOSE
-- -------
-- Extend the existing interview-related tables to support full LangGraph
-- interview-session persistence.  All additions are backward-compatible:
--   • New columns are nullable (or carry safe defaults).
--   • No existing columns are modified.
--   • No existing FK relationships are changed.
--   • No existing data is at risk.
--
-- VERIFIED PRECONDITIONS  (read-only inspection performed 2026-09-24)
-- -------------------------------------------------------------------
--   resumes.resume_id          bigint  NOT NULL  PRIMARY KEY   ✓
--   users.user_id              bigint  NOT NULL  PRIMARY KEY   ✓
--   interviews.interview_id    bigint  NOT NULL  PRIMARY KEY   ✓
--   questions.question_id      bigint  NOT NULL  PRIMARY KEY   ✓
--   answers.answer_id          bigint  NOT NULL  PRIMARY KEY   ✓
--   evaluations.answer_id      bigint  NOT NULL  FK            ✓
--   technical_depth            integer 0-10 per evaluator system prompt  ✓
--   No existing migration directory found in repository                  ✓
--   No existing SQL files found in repository                            ✓
--
-- HOW TO APPLY  (requires explicit approval — DO NOT run speculatively)
-- --------------------------------------------------------------------
--   Option A: Supabase Dashboard → SQL Editor → paste and run.
--   Option B: supabase db push (if Supabase CLI is configured).
--   Option C: psql -h <host> -U postgres -d postgres -f step4_schema_migration.sql
--
-- HOW TO ROLL BACK
-- ----------------
--   Run the DOWN section at the bottom of this file.
-- =============================================================================


-- =============================================================================
-- TRANSACTION WRAPPER
-- All changes succeed together or none are applied.
-- =============================================================================

BEGIN;


-- =============================================================================
-- 1.  TABLE: interviews
--     Add five columns supporting LangGraph session-control state.
-- =============================================================================

-- 1a. resume_id
--     Links the interview to the candidate's uploaded resume (optional).
--     Type: bigint — matches resumes.resume_id (verified: bigint PK).
--     Nullable because an interview may be started without uploading a resume.

ALTER TABLE interviews
    ADD COLUMN IF NOT EXISTS resume_id bigint NULL
        REFERENCES resumes (resume_id)
        ON DELETE SET NULL;

-- 1b. current_topic
--     The interview topic currently active in the LangGraph session.
--     Populated from candidate_profile.potential_interview_topics.
--     Nullable because it is set by create_interview_plan node, not at row creation.

ALTER TABLE interviews
    ADD COLUMN IF NOT EXISTS current_topic varchar NULL;

-- 1c. current_difficulty
--     The current difficulty level managed by the adaptive engine.
--     One of: 'easy' | 'medium' | 'hard'
--     Nullable; populated by the adaptive_decision LangGraph node.

ALTER TABLE interviews
    ADD COLUMN IF NOT EXISTS current_difficulty varchar NULL;

-- 1d. question_count
--     Running count of questions asked in this session.
--     Matches InterviewState.question_count.
--     Default 0 — safe for all existing rows.

ALTER TABLE interviews
    ADD COLUMN IF NOT EXISTS question_count integer NOT NULL DEFAULT 0;

-- 1e. max_questions
--     Maximum questions requested by the user when starting the interview.
--     Default 10 — matches StartInterviewRequest default and InterviewState default.

ALTER TABLE interviews
    ADD COLUMN IF NOT EXISTS max_questions integer NOT NULL DEFAULT 10;


-- =============================================================================
-- 2.  TABLE: questions
--     Add expected_concepts — the structured concept list produced by the
--     question generator and stored in InterviewState.current_question.
-- =============================================================================

-- 2a. expected_concepts
--     JSONB array of concept strings, e.g. ["variables", "data types"]
--     Nullable because historical rows predate this column.
--     JSONB chosen (not JSON) for indexability and operator support.

ALTER TABLE questions
    ADD COLUMN IF NOT EXISTS expected_concepts jsonb NULL;


-- =============================================================================
-- 3.  TABLE: evaluations
--     Add technical_depth — missing from the original schema but present in
--     every evaluation dict returned by answer_evaluator.py.
-- =============================================================================

-- 3a. technical_depth
--     Integer score 0–10 as defined in EVALUATION_SCHEMA and enforced by the
--     Gemini system prompt: "must be integers from 0 to 10" (answer_evaluator.py line 41).
--     Type: integer  — consistent with score, correctness, completeness columns
--     (all 0-10 integer values in practice, even though those columns are typed
--     as text/numeric in the existing schema — we do NOT change those columns here).
--     Nullable because historical evaluations rows predate this column.

ALTER TABLE evaluations
    ADD COLUMN IF NOT EXISTS technical_depth integer NULL;

-- NOTE: The existing evaluations columns (score, correctness, completeness,
--       confidence, missing_concepts, feedback, needs_followup) are NOT modified.
--       missing_concepts remains text in this migration.


-- =============================================================================
-- 4.  TABLE: interview_reports
--     Add summary and topics_covered — fields produced by generate_final_report
--     in interview_graph.py but missing from the current schema.
-- =============================================================================

-- 4a. summary
--     A free-text narrative summary of the completed interview.
--     Nullable; historical report rows will remain NULL.

ALTER TABLE interview_reports
    ADD COLUMN IF NOT EXISTS summary text NULL;

-- 4b. topics_covered
--     JSONB array of topic strings covered during the interview session.
--     e.g. ["Python", "OOP", "SQL"]
--     JSONB chosen for consistency with expected_concepts and for operator support.
--     Nullable; historical report rows will remain NULL.

ALTER TABLE interview_reports
    ADD COLUMN IF NOT EXISTS topics_covered jsonb NULL;


-- =============================================================================
-- COMMIT
-- =============================================================================

COMMIT;


-- =============================================================================
-- DOWN / ROLLBACK  (run separately only if rolling back this migration)
-- =============================================================================

-- BEGIN;
--
-- ALTER TABLE interview_reports DROP COLUMN IF EXISTS topics_covered;
-- ALTER TABLE interview_reports DROP COLUMN IF EXISTS summary;
--
-- ALTER TABLE evaluations       DROP COLUMN IF EXISTS technical_depth;
--
-- ALTER TABLE questions         DROP COLUMN IF EXISTS expected_concepts;
--
-- ALTER TABLE interviews        DROP COLUMN IF EXISTS max_questions;
-- ALTER TABLE interviews        DROP COLUMN IF EXISTS question_count;
-- ALTER TABLE interviews        DROP COLUMN IF EXISTS current_difficulty;
-- ALTER TABLE interviews        DROP COLUMN IF EXISTS current_topic;
-- ALTER TABLE interviews        DROP COLUMN IF EXISTS resume_id;
--
-- COMMIT;
