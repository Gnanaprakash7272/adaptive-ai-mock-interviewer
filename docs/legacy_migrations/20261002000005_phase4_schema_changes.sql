-- =============================================================================
-- Migration: Phase 4 Schema Enhancements and RLS
-- Date: 2026-10-02
-- =============================================================================

BEGIN;

-- 1. Add missing token_version and technologies columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE experiences ADD COLUMN IF NOT EXISTS technologies JSONB DEFAULT '[]'::jsonb;

-- 2. Add indexes for foreign key and lookup performance
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_interviews_user_id ON interviews(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_interview_id ON questions(interview_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_answer_id ON evaluations(answer_id);

-- 3. Safely cast evaluation fields from text to numeric
-- NOTE: Requires all existing text values to be castable to numeric.
-- See preflight check: docs/numeric_preflight_checks.sql
ALTER TABLE evaluations 
    ALTER COLUMN correctness TYPE NUMERIC USING correctness::numeric,
    ALTER COLUMN completeness TYPE NUMERIC USING completeness::numeric,
    ALTER COLUMN confidence TYPE NUMERIC USING confidence::numeric;

-- 4. Enable RLS (Backend-only / Service-role Defense-in-Depth)
-- By enabling RLS without ANY policies, we create a strict default-deny 
-- for all direct client/public access (including custom JWTs).
-- The backend uses the Supabase service-role key, which bypasses RLS safely.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE education ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_technologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE adaptive_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_reports ENABLE ROW LEVEL SECURITY;

-- 5. Explicitly alter existing foreign keys to add ON DELETE CASCADE
-- (Requires dropping the old constraints and re-adding them, as CREATE TABLE IF NOT EXISTS
-- in the base schema does not retrofit existing DBs)

-- Helper DO block to conditionally drop and recreate constraints dynamically if they exist
DO $$
DECLARE
    row record;
    existing_conname text;
    existing_action char;
    desired_action_char char;
    drop_cmd text;
    add_cmd text;
BEGIN
    -- Define the constraints we want to enforce
    CREATE TEMP TABLE desired_fks (
        table_name text,
        column_name text,
        target_table text,
        target_column text,
        cascade_action text
    );

    INSERT INTO desired_fks VALUES
        ('password_reset_otps', 'user_id', 'users', 'user_id', 'CASCADE'),
        ('resumes', 'user_id', 'users', 'user_id', 'CASCADE'),
        ('education', 'resume_id', 'resumes', 'resume_id', 'CASCADE'),
        ('skills', 'resume_id', 'resumes', 'resume_id', 'CASCADE'),
        ('experiences', 'resume_id', 'resumes', 'resume_id', 'CASCADE'),
        ('projects', 'resume_id', 'resumes', 'resume_id', 'CASCADE'),
        ('project_technologies', 'project_id', 'projects', 'project_id', 'CASCADE'),
        ('certifications', 'resume_id', 'resumes', 'resume_id', 'CASCADE'),
        ('interviews', 'user_id', 'users', 'user_id', 'CASCADE'),
        ('interviews', 'resume_id', 'resumes', 'resume_id', 'SET NULL'),
        ('questions', 'interview_id', 'interviews', 'interview_id', 'CASCADE'),
        ('answers', 'question_id', 'questions', 'question_id', 'CASCADE'),
        ('evaluations', 'answer_id', 'answers', 'answer_id', 'CASCADE'),
        ('adaptive_decisions', 'evaluation_id', 'evaluations', 'evaluation_id', 'CASCADE'),
        ('interview_reports', 'interview_id', 'interviews', 'interview_id', 'CASCADE');

    FOR row IN SELECT * FROM desired_fks LOOP
        -- Map string action to Postgres char
        IF row.cascade_action = 'CASCADE' THEN
            desired_action_char := 'c';
        ELSIF row.cascade_action = 'SET NULL' THEN
            desired_action_char := 'n';
        ELSE
            desired_action_char := 'a';
        END IF;

        existing_conname := NULL;

        -- Find exact existing FK matching child/parent tables and columns in public schema
        SELECT c.conname, c.confdeltype 
        INTO existing_conname, existing_action
        FROM pg_catalog.pg_constraint c
        JOIN pg_catalog.pg_class t1 ON c.conrelid = t1.oid
        JOIN pg_catalog.pg_namespace n1 ON t1.relnamespace = n1.oid
        JOIN pg_catalog.pg_attribute a1 ON a1.attnum = c.conkey[1] AND a1.attrelid = t1.oid
        JOIN pg_catalog.pg_class t2 ON c.confrelid = t2.oid
        JOIN pg_catalog.pg_namespace n2 ON t2.relnamespace = n2.oid
        JOIN pg_catalog.pg_attribute a2 ON a2.attnum = c.confkey[1] AND a2.attrelid = t2.oid
        WHERE c.contype = 'f'
          AND n1.nspname = 'public'
          AND n2.nspname = 'public'
          AND t1.relname = row.table_name
          AND a1.attname = row.column_name
          AND t2.relname = row.target_table
          AND a2.attname = row.target_column
          AND cardinality(c.conkey) = 1
          AND cardinality(c.confkey) = 1
        LIMIT 1;

        IF existing_conname IS NOT NULL THEN
            IF existing_action = desired_action_char THEN
                -- Exact FK already exists with correct action
                CONTINUE;
            ELSE
                -- Wrong action, drop it carefully
                drop_cmd := format('ALTER TABLE %I DROP CONSTRAINT %I;', row.table_name, existing_conname);
                EXECUTE drop_cmd;
            END IF;
        END IF;

        -- Create the new constraint
        add_cmd := format(
            'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I(%I) ON DELETE %s;', 
            row.table_name,
            row.table_name || '_' || row.column_name || '_fkey',
            row.column_name, 
            row.target_table, 
            row.target_column, 
            row.cascade_action
        );
        EXECUTE add_cmd;
    END LOOP;

    DROP TABLE desired_fks;
END $$;

COMMIT;
