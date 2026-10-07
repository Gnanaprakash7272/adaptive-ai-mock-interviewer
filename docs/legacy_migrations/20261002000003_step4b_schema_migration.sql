BEGIN;

ALTER TABLE interview_reports ADD COLUMN IF NOT EXISTS strengths jsonb NULL;
ALTER TABLE interview_reports ADD COLUMN IF NOT EXISTS weaknesses jsonb NULL;
ALTER TABLE interview_reports ADD COLUMN IF NOT EXISTS recommendations jsonb NULL;

COMMIT;
