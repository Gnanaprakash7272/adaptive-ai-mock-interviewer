BEGIN;

CREATE INDEX IF NOT EXISTS idx_interviews_leaderboard
    ON public.interviews (status, user_id, completed_at)
    WHERE status = 'completed';

CREATE INDEX IF NOT EXISTS idx_interview_reports_interview_score
    ON public.interview_reports (interview_id, overall_score);

CREATE OR REPLACE VIEW public.leaderboard_scores
WITH (security_invoker = true)
AS
WITH interview_metrics AS (
    SELECT
        i.user_id,
        COUNT(*)::integer AS interviews_completed,
        (AVG(r.overall_score) * 10)::numeric AS performance_score,
        CASE
            WHEN COUNT(*) = 1 THEN 50::numeric
            ELSE GREATEST(0::numeric, 100 - COALESCE(STDDEV_POP(r.overall_score), 0) * 20)
        END AS consistency_score
    FROM public.interviews AS i
    JOIN public.interview_reports AS r ON r.interview_id = i.interview_id
    WHERE i.status = 'completed'
      AND r.overall_score IS NOT NULL
    GROUP BY i.user_id
),
profile_metrics AS (
    SELECT
        u.user_id,
        COUNT(DISTINCT s.skill_id)::numeric * 10
            + COUNT(DISTINCT p.project_id)::numeric * 15
            + COUNT(DISTINCT e.experience_id)::numeric * 15
            + COUNT(DISTINCT ed.education_id)::numeric * 10
            + COUNT(DISTINCT c.certification_id)::numeric * 5
            + CASE WHEN MAX(r.resume_id) IS NOT NULL THEN 20 ELSE 0 END AS profile_score
    FROM public.users AS u
    LEFT JOIN public.resumes AS r ON r.user_id = u.user_id
    LEFT JOIN public.skills AS s ON s.resume_id = r.resume_id
    LEFT JOIN public.projects AS p ON p.resume_id = r.resume_id
    LEFT JOIN public.experiences AS e ON e.resume_id = r.resume_id
    LEFT JOIN public.education AS ed ON ed.resume_id = r.resume_id
    LEFT JOIN public.certifications AS c ON c.resume_id = r.resume_id
    GROUP BY u.user_id
)
SELECT
    u.user_id,
    u.name,
    im.interviews_completed,
    ROUND(im.performance_score, 2) AS performance_score,
    ROUND(im.consistency_score, 2) AS consistency_score,
    LEAST(100::numeric, ROUND(pm.profile_score, 2)) AS profile_score,
    ROUND(
        im.performance_score * 0.50
        + im.consistency_score * 0.30
        + LEAST(100::numeric, pm.profile_score) * 0.20,
        2
    ) AS leaderboard_score
FROM public.users AS u
JOIN interview_metrics AS im ON im.user_id = u.user_id
JOIN profile_metrics AS pm ON pm.user_id = u.user_id
WHERE COALESCE(NULLIF(TRIM(u.name), ''), '') <> '';

GRANT SELECT ON public.leaderboard_scores TO service_role;

COMMIT;
