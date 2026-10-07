import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import {
  Mail,
  GraduationCap,
  Code,
  Briefcase,
  Award,
  Sparkles,
  BookOpen,
  Target,
  ArrowRight,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  Cpu,
  FileText,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';
import type { CandidateProfile } from '../types';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<
    'unauthorized' | 'not_found' | 'server_error' | null
  >(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      setErrorType(null);

      try {
        const data = await apiService.getCandidateProfile();
        setProfile(data);
      } catch (err: any) {
        const msg = err?.message || 'Unable to load candidate profile.';

        if (
          msg.includes('expired') ||
          msg.includes('401') ||
          msg.includes('Unauthorized') ||
          msg.includes('credentials') ||
          msg.includes('token')
        ) {
          setErrorType('unauthorized');
        } else if (
          msg.includes('not found') ||
          msg.includes('404') ||
          msg.includes('No profile')
        ) {
          setErrorType('not_found');
        } else {
          setErrorType('server_error');
        }

        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const allSkills = useMemo(() => {
    if (!profile?.skills) return [];

    return Object.values(profile.skills)
      .flat()
      .filter(Boolean)
      .map((skill) => String(skill).trim())
      .filter(Boolean);
  }, [profile]);

  const uniqueSkills = useMemo(
    () => [...new Set(allSkills)],
    [allSkills]
  );

  const initials = useMemo(() => {
    const name =
      profile?.candidate?.name ||
      user?.name ||
      user?.email ||
      'Candidate';

    const parts = name.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }, [profile, user]);

  const avatarUrl = profile?.avatarUrl || user?.avatarUrl;

  const handleRetry = () => {
    window.location.reload();
  };

  if (loading) {
    return (
      <PageWrapper className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />

        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Loading Candidate Profile
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Preparing your AI-powered profile...
          </p>
        </div>
      </PageWrapper>
    );
  }

  if (errorType === 'unauthorized') {
    return (
      <PageWrapper className="flex min-h-[60vh] flex-col items-center justify-center space-y-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-amber-600 shadow-sm dark:bg-amber-900/30 dark:text-amber-400">
          <ShieldCheck className="h-10 w-10" />
        </div>

        <div className="max-w-md text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Session Expired
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            Your login session has expired. Please log in again to continue.
          </p>
        </div>

        <Link to="/login">
          <Button size="lg">Log In Again</Button>
        </Link>
      </PageWrapper>
    );
  }

  if (errorType === 'not_found' || (!profile && !error)) {
    return (
      <PageWrapper className="flex min-h-[60vh] flex-col items-center justify-center space-y-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-400">
          <FileText className="h-10 w-10" />
        </div>

        <div className="max-w-md text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            No Candidate Profile Yet
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            Upload your resume to generate your AI-powered candidate profile.
          </p>
        </div>

        <Link to="/resume/upload">
          <Button size="lg" className="flex items-center gap-2">
            Upload Resume
            <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>
      </PageWrapper>
    );
  }

  if (errorType === 'server_error' || (error && !profile)) {
    return (
      <PageWrapper className="flex min-h-[60vh] flex-col items-center justify-center space-y-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-rose-100 text-rose-600 shadow-sm dark:bg-rose-900/30 dark:text-rose-400">
          <Target className="h-10 w-10" />
        </div>

        <div className="max-w-lg text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Could Not Load Profile
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
            We couldn't retrieve your candidate profile right now.
          </p>
        </div>

        <Button size="lg" variant="outline" onClick={handleRetry}>
          Try Again
        </Button>
      </PageWrapper>
    );
  }

  if (!profile) return null;

  return (
    <PageWrapper className="max-w-7xl space-y-6 pb-12">
      {/* =========================================================
          1. CANDIDATE IDENTITY HEADER
      ========================================================== */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-border-dark dark:bg-surface-dark-card">
        {/* Header banner */}
        <div className="relative h-32 overflow-hidden bg-gradient-to-r from-brand-600/15 via-brand-500/10 to-indigo-500/15 dark:from-brand-900/40 dark:via-brand-950/30 dark:to-indigo-950/30">
          <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(#6366f1_1px,transparent_1px)] [background-size:18px_18px]" />

          <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand-500/10 blur-3xl" />
          <div className="absolute -left-20 -bottom-28 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
        </div>

        <div className="px-5 pb-6 sm:px-7">
          <div className="-mt-14 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            {/* Identity */}
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end sm:text-left">
              {/* Avatar */}
              <div className="relative shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={`${profile.candidate.name} profile`}
                    className="h-28 w-28 rounded-2xl object-cover shadow-xl ring-4 ring-white dark:ring-surface-dark-card"
                  />
                ) : (
                  <div
                    className="flex h-28 w-28 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-600 text-3xl font-black text-white shadow-xl ring-4 ring-white dark:ring-surface-dark-card"
                    aria-label={`${profile.candidate.name} profile`}
                  >
                    {initials}
                  </div>
                )}

                {/* Profile readiness indicator — not identity verification */}
                <span
                  className="absolute bottom-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-white dark:ring-surface-dark-card"
                  title="Candidate profile available"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </span>
              </div>

              {/* Candidate information */}
              <div className="min-w-0 space-y-2 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center gap-2.5 sm:justify-start">
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                    {profile.candidate.name}
                  </h1>

                  {profile.targetRole && (
                    <span className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 dark:border-brand-800 dark:bg-brand-950/70 dark:text-brand-300">
                      {profile.targetRole}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-medium text-slate-500 sm:justify-start dark:text-slate-400">
                  {profile.candidate.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" />
                      {profile.candidate.email}
                    </span>
                  )}

                  {profile.candidate.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {profile.candidate.location}
                    </span>
                  )}

                  <span className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="h-3.5 w-3.5" />
                    AI Profile Ready
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
              <Link to="/resume/upload">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white text-xs dark:bg-surface-dark"
                >
                  <FileText className="mr-1.5 h-3.5 w-3.5" />
                  Update Resume
                </Button>
              </Link>

              <Link to="/roles">
                <Button
                  size="sm"
                  className="bg-brand-600 text-xs shadow-md shadow-brand-500/20 hover:bg-brand-700"
                >
                  <Target className="mr-1.5 h-3.5 w-3.5" />
                  Start Interview
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Candidate metrics */}
          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-4 dark:border-white/5">
            <Metric
              label="Candidate Track"
              value={profile.targetRole || 'Not specified'}
            />

            <Metric
              label="AI-Identified Skills"
              value={`${uniqueSkills.length} competencies`}
            />

            <Metric
              label="Projects"
              value={`${profile.projects.length}`}
            />

            <Metric
              label="Experience"
              value={`${profile.experience.length}`}
            />
          </div>
        </div>
      </section>

      {/* =========================================================
          2. AI INTERVIEW INTELLIGENCE
      ========================================================== */}
      {profile.potential_interview_topics?.length > 0 && (
        <Card className="overflow-hidden border-brand-200/70 bg-gradient-to-br from-brand-50/70 via-white to-indigo-50/40 p-0 shadow-sm dark:border-brand-500/20 dark:from-surface-dark-card dark:via-surface-dark-elevated dark:to-surface-dark">
          <div className="border-b border-brand-100 px-5 py-5 sm:px-6 dark:border-white/5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                  <Sparkles className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-extrabold text-slate-900 dark:text-white">
                    AI Interview Intelligence
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Technical areas identified from your candidate profile for
                    interview preparation.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 p-5 sm:grid-cols-2 lg:grid-cols-3 sm:p-6">
            {profile.potential_interview_topics.map((topic, index) => (
              <div
                key={`${topic}-${index}`}
                className="flex items-start gap-3 rounded-xl border border-slate-200/70 bg-white p-3 transition-colors hover:border-brand-400/60 dark:border-white/10 dark:bg-surface-dark-card"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-[10px] font-black text-brand-700 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-300">
                  {index + 1}
                </span>

                <span className="text-xs font-semibold leading-5 text-slate-800 dark:text-slate-200">
                  {topic}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* =========================================================
          3. PROFILE INFORMATION
      ========================================================== */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* LEFT */}
        <div className="space-y-6 lg:col-span-5">
          {/* Skills */}
          <Card className="space-y-4 border-slate-200/80 bg-white p-5 shadow-sm dark:border-border-dark dark:bg-surface-dark-card">
            <SectionHeader
              icon={<Code className="h-4 w-4" />}
              title="Technical Competencies"
              meta={`${uniqueSkills.length} technologies`}
            />

            {uniqueSkills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {uniqueSkills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-lg border border-slate-200/80 bg-slate-100/80 px-2.5 py-1 text-xs font-semibold text-slate-800 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-white/5 dark:bg-surface-dark-elevated dark:text-slate-200 dark:hover:bg-brand-950/50 dark:hover:text-brand-300"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <EmptyText text="No technical skills detected yet." />
            )}
          </Card>

          {/* Expertise */}
          <Card className="space-y-4 border-slate-200/80 bg-white p-5 shadow-sm dark:border-border-dark dark:bg-surface-dark-card">
            <SectionHeader
              icon={<Cpu className="h-4 w-4" />}
              title="Core Architecture & Systems"
            />

            {profile.expertise_areas?.length > 0 ? (
              <ul className="space-y-2">
                {profile.expertise_areas.map((area, index) => (
                  <li
                    key={`${area}-${index}`}
                    className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs text-slate-700 dark:border-white/5 dark:bg-surface-dark-elevated dark:text-slate-300"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <span className="font-medium leading-5">{area}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyText text="No architecture expertise detected yet." />
            )}
          </Card>

          {/* Education */}
          <Card className="space-y-4 border-slate-200/80 bg-white p-5 shadow-sm dark:border-border-dark dark:bg-surface-dark-card">
            <SectionHeader
              icon={<GraduationCap className="h-4 w-4" />}
              title="Education"
            />

            {profile.education?.length > 0 ? (
              <div className="space-y-3">
                {profile.education.map((education, index) => (
                  <div
                    key={`${education.degree}-${index}`}
                    className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-white/5 dark:bg-surface-dark-elevated"
                  >
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      {education.degree}
                    </h3>

                    <p className="mt-1 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      {education.institution}
                    </p>

                    <p className="mt-1 text-[10px] font-bold text-brand-600 dark:text-brand-400">
                      {education.start_year} - {education.end_year}
                      {education.cgpa ? ` • ${education.cgpa}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyText text="No education information available." />
            )}
          </Card>

          {/* Certifications */}
          <Card className="space-y-4 border-slate-200/80 bg-white p-5 shadow-sm dark:border-border-dark dark:bg-surface-dark-card">
            <SectionHeader
              icon={<Award className="h-4 w-4" />}
              title="Industry Certifications"
            />

            {profile.certifications?.length > 0 ? (
              <div className="space-y-2">
                {profile.certifications.map((certification, index) => (
                  <div
                    key={`${certification.name}-${index}`}
                    className="flex items-center gap-2 rounded-xl border border-slate-200/70 bg-slate-50/80 p-3 text-xs font-semibold text-slate-800 dark:border-white/5 dark:bg-surface-dark-elevated dark:text-slate-200"
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />

                    <span>
                      {certification.name}
                      {certification.year
                        ? ` (${certification.year})`
                        : ''}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyText text="No certifications detected." />
            )}
          </Card>
        </div>

        {/* RIGHT */}
        <div className="space-y-6 lg:col-span-7">
          {/* Experience */}
          <Card className="space-y-5 border-slate-200/80 bg-white p-6 shadow-sm dark:border-border-dark dark:bg-surface-dark-card">
            <SectionHeader
              icon={<Briefcase className="h-4 w-4" />}
              title="Professional Experience"
              meta="Career History"
            />

            {profile.experience?.length > 0 ? (
              <div className="relative space-y-7 before:absolute before:bottom-2 before:left-2 before:top-2 before:w-px before:bg-slate-200 dark:before:bg-slate-700">
                {profile.experience.map((experience, index) => (
                  <div
                    key={`${experience.company}-${experience.role}-${index}`}
                    className="relative pl-7"
                  >
                    <span className="absolute left-0 top-1 flex h-4 w-4 rounded-full bg-brand-600 ring-4 ring-white dark:ring-surface-dark-card" />

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                          {experience.role}
                        </h3>

                        <p className="mt-0.5 text-xs font-semibold text-brand-600 dark:text-brand-400">
                          {experience.company}
                        </p>
                      </div>

                      <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {experience.start_date} - {experience.end_date}
                      </span>
                    </div>

                    {experience.responsibilities?.length > 0 && (
                      <ul className="mt-3 space-y-1.5">
                        {experience.responsibilities.map(
                          (responsibility, responsibilityIndex) => (
                            <li
                              key={`${responsibility}-${responsibilityIndex}`}
                              className="flex items-start gap-2 text-xs leading-5 text-slate-600 dark:text-slate-300"
                            >
                              <span className="mt-0.5 font-bold text-brand-500">
                                •
                              </span>

                              <span>{responsibility}</span>
                            </li>
                          )
                        )}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyText text="No professional experience detected." />
            )}
          </Card>

          {/* Projects */}
          <Card className="space-y-5 border-slate-200/80 bg-white p-6 shadow-sm dark:border-border-dark dark:bg-surface-dark-card">
            <SectionHeader
              icon={<BookOpen className="h-4 w-4" />}
              title="Engineering Systems & Projects"
              meta="Project Evidence"
            />

            {profile.projects?.length > 0 ? (
              <div className="space-y-4">
                {profile.projects.map((project, index) => (
                  <div
                    key={`${project.name}-${index}`}
                    className="space-y-3 rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 transition-colors hover:border-brand-400/50 dark:border-white/5 dark:bg-surface-dark-elevated"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {project.name}
                      </h3>
                    </div>

                    <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">
                      {project.description}
                    </p>

                    {project.technologies?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {project.technologies.map((technology) => (
                          <span
                            key={technology}
                            className="rounded-md border border-slate-200/80 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:border-white/5 dark:bg-slate-800 dark:text-slate-300"
                          >
                            {technology}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyText text="No projects detected yet." />
            )}
          </Card>

          {/* Profile action */}
          <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-brand-200/70 bg-brand-50/60 p-5 sm:flex-row dark:border-brand-500/20 dark:bg-brand-950/20">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Ready for your next interview?
              </h3>

              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Use your AI candidate profile to generate a personalized
                technical interview.
              </p>
            </div>

            <Link to="/roles">
              <Button className="whitespace-nowrap bg-brand-600 hover:bg-brand-700">
                Explore Interview Roles
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

/* ===============================================================
   REUSABLE UI HELPERS
================================================================ */

interface MetricProps {
  label: string;
  value: string;
}

const Metric: React.FC<MetricProps> = ({ label, value }) => {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 dark:border-white/5 dark:bg-surface-dark-elevated">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </span>

      <span className="mt-1 block text-sm font-extrabold text-slate-900 dark:text-white">
        {value}
      </span>
    </div>
  );
};

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  meta?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon,
  title,
  meta,
}) => {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
        <span className="text-brand-600 dark:text-brand-400">{icon}</span>
        {title}
      </h2>

      {meta && (
        <span className="text-[10px] font-bold text-slate-400">
          {meta}
        </span>
      )}
    </div>
  );
};

const EmptyText: React.FC<{ text: string }> = ({ text }) => {
  return (
    <p className="rounded-xl border border-dashed border-slate-200 px-4 py-5 text-center text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
      {text}
    </p>
  );
};