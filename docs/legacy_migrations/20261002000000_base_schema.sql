-- Migration: Base Schema (Initial)
-- Date: 2026-10-02

BEGIN;

CREATE TABLE IF NOT EXISTS users (
    user_id BIGSERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT
);

CREATE TABLE IF NOT EXISTS password_reset_otps (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    otp_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_used BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS resumes (
    resume_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    raw_text TEXT,
    file_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS education (
    education_id BIGSERIAL PRIMARY KEY,
    resume_id BIGINT NOT NULL REFERENCES resumes(resume_id) ON DELETE CASCADE,
    institution TEXT,
    degree TEXT,
    field TEXT,
    start_year TEXT,
    end_year TEXT,
    cgpa TEXT,
    details TEXT
);

CREATE TABLE IF NOT EXISTS skills (
    skill_id BIGSERIAL PRIMARY KEY,
    resume_id BIGINT NOT NULL REFERENCES resumes(resume_id) ON DELETE CASCADE,
    category TEXT,
    skill_name TEXT
);

CREATE TABLE IF NOT EXISTS experiences (
    experience_id BIGSERIAL PRIMARY KEY,
    resume_id BIGINT NOT NULL REFERENCES resumes(resume_id) ON DELETE CASCADE,
    company TEXT,
    role TEXT,
    location TEXT,
    start_date TEXT,
    end_date TEXT,
    responsibilities TEXT
);

CREATE TABLE IF NOT EXISTS projects (
    project_id BIGSERIAL PRIMARY KEY,
    resume_id BIGINT NOT NULL REFERENCES resumes(resume_id) ON DELETE CASCADE,
    name TEXT,
    description TEXT,
    domain TEXT,
    role TEXT,
    duration TEXT
);

CREATE TABLE IF NOT EXISTS project_technologies (
    project_tech_id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    technology TEXT
);

CREATE TABLE IF NOT EXISTS certifications (
    certification_id BIGSERIAL PRIMARY KEY,
    resume_id BIGINT NOT NULL REFERENCES resumes(resume_id) ON DELETE CASCADE,
    name TEXT,
    issuer TEXT,
    year TEXT
);

CREATE TABLE IF NOT EXISTS interviews (
    interview_id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS questions (
    question_id BIGSERIAL PRIMARY KEY,
    interview_id BIGINT NOT NULL REFERENCES interviews(interview_id) ON DELETE CASCADE,
    question_order INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    question_type TEXT,
    difficulty VARCHAR,
    asked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS answers (
    answer_id BIGSERIAL PRIMARY KEY,
    question_id BIGINT NOT NULL REFERENCES questions(question_id) ON DELETE CASCADE,
    answer_text TEXT NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evaluations (
    evaluation_id BIGSERIAL PRIMARY KEY,
    answer_id BIGINT NOT NULL REFERENCES answers(answer_id) ON DELETE CASCADE,
    score NUMERIC,
    correctness TEXT,
    completeness TEXT,
    confidence TEXT,
    missing_concepts TEXT,
    feedback TEXT,
    needs_followup BOOLEAN
);

CREATE TABLE IF NOT EXISTS adaptive_decisions (
    decision_id BIGSERIAL PRIMARY KEY,
    evaluation_id BIGINT NOT NULL REFERENCES evaluations(evaluation_id) ON DELETE CASCADE,
    next_action VARCHAR,
    next_topic VARCHAR,
    difficulty VARCHAR,
    reason TEXT,
    decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_reports (
    report_id BIGSERIAL PRIMARY KEY,
    interview_id BIGINT NOT NULL UNIQUE REFERENCES interviews(interview_id) ON DELETE CASCADE,
    overall_score NUMERIC,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
