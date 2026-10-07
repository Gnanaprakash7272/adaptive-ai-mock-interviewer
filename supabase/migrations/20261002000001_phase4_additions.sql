-- Migration: Phase 4 Additions
-- Date: 2026-10-02
-- Description: Adds missing columns, types, and indexes to the remote schema

BEGIN;

-- 1. Add missing columns
ALTER TABLE "public"."users" 
    ADD COLUMN IF NOT EXISTS "token_version" integer NOT NULL DEFAULT 0;

ALTER TABLE "public"."experiences" 
    ADD COLUMN IF NOT EXISTS "technologies" jsonb DEFAULT '[]'::jsonb;

-- 2. Convert evaluation text fields to numeric
ALTER TABLE "public"."evaluations"
    ALTER COLUMN "correctness" TYPE numeric USING "correctness"::numeric,
    ALTER COLUMN "completeness" TYPE numeric USING "completeness"::numeric,
    ALTER COLUMN "confidence" TYPE numeric USING "confidence"::numeric;

-- 3. Add missing performance indexes for foreign keys
CREATE INDEX IF NOT EXISTS "idx_resumes_user_id" ON "public"."resumes"("user_id");
CREATE INDEX IF NOT EXISTS "idx_interviews_user_id" ON "public"."interviews"("user_id");
CREATE INDEX IF NOT EXISTS "idx_interviews_resume_id" ON "public"."interviews"("resume_id");
CREATE INDEX IF NOT EXISTS "idx_experiences_resume_id" ON "public"."experiences"("resume_id");
CREATE INDEX IF NOT EXISTS "idx_education_resume_id" ON "public"."education"("resume_id");
CREATE INDEX IF NOT EXISTS "idx_skills_resume_id" ON "public"."skills"("resume_id");
CREATE INDEX IF NOT EXISTS "idx_projects_resume_id" ON "public"."projects"("resume_id");
CREATE INDEX IF NOT EXISTS "idx_certifications_resume_id" ON "public"."certifications"("resume_id");
CREATE INDEX IF NOT EXISTS "idx_questions_interview_id" ON "public"."questions"("interview_id");
CREATE INDEX IF NOT EXISTS "idx_answers_question_id" ON "public"."answers"("question_id");
CREATE INDEX IF NOT EXISTS "idx_evaluations_answer_id" ON "public"."evaluations"("answer_id");
CREATE INDEX IF NOT EXISTS "idx_interview_reports_interview_id" ON "public"."interview_reports"("interview_id");
CREATE INDEX IF NOT EXISTS "idx_project_technologies_project_id" ON "public"."project_technologies"("project_id");
CREATE INDEX IF NOT EXISTS "idx_adaptive_decisions_evaluation_id" ON "public"."adaptive_decisions"("evaluation_id");

COMMIT;
