-- Migration: 20261121000000_career_pivot_coach.sql
-- Description: Tables for Career Pivot Coach Agent (Pivot Plans and Job Application Tracker)

CREATE TABLE IF NOT EXISTS public.career_pivot_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id TEXT NOT NULL UNIQUE,
    user_id BIGINT NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    current_role TEXT NOT NULL,
    target_role TEXT NOT NULL,
    experience_years NUMERIC(4, 1) DEFAULT 2.0,
    weekly_hours INTEGER DEFAULT 15,
    gap_map JSONB NOT NULL DEFAULT '{}'::jsonb,
    roadmap JSONB NOT NULL DEFAULT '[]'::jsonb,
    portfolio_projects JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coach_applications (
    id TEXT PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
    company TEXT NOT NULL,
    role_title TEXT NOT NULL,
    job_url TEXT,
    applied_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'applied' CHECK (status IN ('applied', 'screening', 'interview', 'offer', 'rejected')),
    match_score INTEGER DEFAULT 75 CHECK (match_score BETWEEN 0 AND 100),
    notes TEXT,
    response_received BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_career_pivot_plans_user_id ON public.career_pivot_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_coach_applications_user_id ON public.coach_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_coach_applications_status ON public.coach_applications(status);

-- Enable RLS
ALTER TABLE public.career_pivot_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_applications ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "service_role_pivot_plans_full_access"
ON public.career_pivot_plans
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "service_role_coach_applications_full_access"
ON public.coach_applications
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
