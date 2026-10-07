-- =============================================================================
-- Migration: Add new report distinction fields to interview_reports
-- =============================================================================

BEGIN;

ALTER TABLE interview_reports
    ADD COLUMN IF NOT EXISTS profile_strengths jsonb NULL;

ALTER TABLE interview_reports
    ADD COLUMN IF NOT EXISTS interview_demonstrated_strengths jsonb NULL;

ALTER TABLE interview_reports
    ADD COLUMN IF NOT EXISTS interview_knowledge_gaps jsonb NULL;

COMMIT;
