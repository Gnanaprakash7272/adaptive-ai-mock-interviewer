import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';

import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  History,
  PlayCircle,
  Target,
  Upload,
  UserCheck,
  Award,
  Zap,
  Code2,
  Users,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { apiService, cacheManager } from '../services/apiService';
import type { CandidateProfile, HistoryItem } from '../types';

interface DashboardStat {
  label: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const [profile, setProfile] = useState<CandidateProfile | null>(() =>
    cacheManager.get<CandidateProfile>('candidate_profile')
  );
  const [recentInterviews, setRecentInterviews] = useState<HistoryItem[]>(() =>
    cacheManager.get<HistoryItem[]>('interviews_history') || []
  );
  const [loading, setLoading] = useState<boolean>(() =>
    !cacheManager.get<CandidateProfile>('candidate_profile')
  );

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        const [profileData, historyData] = await Promise.all([
          apiService.getCandidateProfile().catch(() => null),
          apiService.getHistory().catch(() => [])
        ]);
        if (!isMounted) return;
        if (profileData) setProfile(profileData);
        if (historyData) setRecentInterviews(historyData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  const profileStats = useMemo(() => {
    if (!profile) {
      return {
        skills: 0,
        projects: 0,
        experience: 0,
      };
    }

    const skills = profile.skills
      ? Object.values(profile.skills as Record<string, unknown>).reduce(
        (total: number, value: unknown) => {
          return total + (Array.isArray(value) ? value.length : 0);
        },
        0
      )
      : 0;

    return {
      skills,
      projects: profile.projects?.length ?? 0,
      experience: profile.experience?.length ?? 0,
    };
  }, [profile]);

  const topSkills = useMemo(() => {
    if (!profile?.skills) return [];
    const all: string[] = [];
    Object.values(profile.skills as Record<string, unknown>).forEach((val) => {
      if (Array.isArray(val)) {
        all.push(...(val as string[]));
      }
    });
    return all.slice(0, 6);
  }, [profile]);

  const avgScore = useMemo(() => {
    const scored = recentInterviews.filter(
      (i) => typeof i.overallScore === 'number' && i.overallScore > 0
    );
    if (scored.length === 0) return null;
    const total = scored.reduce((acc, i) => acc + (i.overallScore || 0), 0);
    return (total / scored.length).toFixed(1);
  }, [recentInterviews]);

  const readinessPercentage = useMemo(() => {
    if (!profile) return 25;
    let score = 50;
    if (profileStats.skills >= 5) score += 15;
    if (profileStats.projects > 0) score += 15;
    if (recentInterviews.length > 0) score += 20;
    return Math.min(100, score);
  }, [profile, profileStats, recentInterviews]);

  const stats: DashboardStat[] = [
    {
      label: 'Skills Detected',
      value: profileStats.skills,
      description: 'Extracted from resume',
      icon: Target,
    },
    {
      label: 'Interviews Taken',
      value: recentInterviews.length,
      description: 'Practice sessions',
      icon: History,
    },
    {
      label: 'Average Score',
      value: avgScore ? `${avgScore} / 10` : '—',
      description: 'Mock performance',
      icon: Award,
    },
    {
      label: 'Interview Readiness',
      value: `${readinessPercentage}%`,
      description: 'Skill & practice depth',
      icon: Zap,
    },
  ];

  const displayName = profile?.candidate?.name || user?.username || 'Candidate';

  return (
    <PageWrapper className="mx-auto max-w-7xl space-y-8 pb-12">

      {/* ============================================================
          HERO
      ============================================================ */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        {/* Background decorations */}
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-purple-500/5 blur-3xl" />

        <div className="relative z-10 grid gap-8 p-8 sm:p-10 lg:grid-cols-[1fr_auto] lg:p-12 items-center">

          <div className="max-w-2xl">
            <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl lg:text-5xl">
              Welcome back,{' '}
              <span className="text-brand-600 dark:text-brand-400">
                {displayName}
              </span>
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-400">
              Master technical coding fundamentals, system architecture, and behavioral rounds with adaptive AI interviews tailored to your experience.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/roles">
                <Button size="lg" className="group shadow-lg shadow-brand-500/20">
                  <PlayCircle className="mr-2 h-5 w-5" />
                  Start Interview
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>

              <Link to="/resume/upload">
                <Button variant="outline" size="lg">
                  <Upload className="mr-2 h-5 w-5" />
                  Update Resume
                </Button>
              </Link>
            </div>
          </div>

          {/* Profile completion status */}
          <div className="flex items-center justify-center lg:justify-end">
            <div className="w-full sm:min-w-[260px] rounded-3xl border border-slate-200 bg-slate-50/80 p-6 dark:border-slate-800 dark:bg-slate-950/80 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Candidate Profile
                  </p>
                  <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                    {profile ? 'Active & Ready' : 'Incomplete'}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                  {profile ? (
                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  ) : (
                    <UserCheck className="h-6 w-6" />
                  )}
                </div>
              </div>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: profile ? '100%' : '25%' }}
                  transition={{ duration: 0.8 }}
                  className={`h-full rounded-full ${profile ? 'bg-emerald-500' : 'bg-brand-500'}`}
                />
              </div>

              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {profile
                  ? `${profileStats.skills} skills & ${profileStats.projects} projects linked to your profile.`
                  : 'Upload your resume to unlock personalised questions.'}
              </p>
            </div>
          </div>

        </div>
      </motion.section>

      {/* ============================================================
          QUICK STATS
      ============================================================ */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              Your Workspace
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
              Preparation Overview
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;

            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.35,
                  delay: index * 0.07,
                }}
              >
                <Card className="group h-full p-5 transition-all hover:-translate-y-1 hover:shadow-md border border-slate-200/80 dark:border-white/5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {stat.label}
                      </p>
                      <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
                        {loading ? '—' : stat.value}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {stat.description}
                      </p>
                    </div>

                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 transition-colors group-hover:bg-brand-500 group-hover:text-white dark:text-brand-400">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ============================================================
          QUICK LAUNCH: INTERVIEW TRACKS
      ============================================================ */}
      <section>
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
            Interview Tracks
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
            Choose Your Practice Mode
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Technical Round Card */}
          <Link to="/roles" className="block group">
            <Card className="p-6 h-full border-2 border-slate-200 dark:border-white/10 hover:border-brand-500 dark:hover:border-brand-500 transition-all hover:shadow-lg bg-gradient-to-br from-white via-white to-brand-50/20 dark:from-surface-dark-card dark:via-surface-dark-card dark:to-brand-950/20">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                  <Code2 className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  Coding & Architecture
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Technical Interview Round
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                Coding fundamentals, system design trade-offs, architecture patterns, and algorithm challenges adapted to your target level.
              </p>
              <div className="mt-5 flex items-center text-xs font-bold text-brand-600 dark:text-brand-400 group-hover:translate-x-1 transition-transform">
                Start Technical Mock <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </Card>
          </Link>

          {/* HR / Behavioral Round Card */}
          <Link to="/roles" className="block group">
            <Card className="p-6 h-full border-2 border-slate-200 dark:border-white/10 hover:border-purple-500 dark:hover:border-purple-500 transition-all hover:shadow-lg bg-gradient-to-br from-white via-white to-purple-50/20 dark:from-surface-dark-card dark:via-surface-dark-card dark:to-purple-950/20">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <Users className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                  STAR Method
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                HR & Behavioral Round
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                STAR framework evaluation, leadership, conflict resolution, project ownership, and team culture scenarios anchored to your actual projects.
              </p>
              <div className="mt-5 flex items-center text-xs font-bold text-purple-600 dark:text-purple-400 group-hover:translate-x-1 transition-transform">
                Start Behavioral Mock <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </Card>
          </Link>
        </div>
      </section>

      {/* ============================================================
          MAIN DASHBOARD GRID (ACTIVITY & CANDIDATE PROFILE)
      ============================================================ */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.35fr_0.65fr]">

        {/* ==========================================================
            RECENT INTERVIEWS
        ========================================================== */}
        <Card className="overflow-hidden shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-slate-800">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Interview Activity
              </p>
              <h3 className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                Recent Interviews
              </h3>
            </div>

            <Link to="/history">
              <Button variant="outline" size="sm">
                View History
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {recentInterviews.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center px-6 py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                <Clock3 className="h-7 w-7" />
              </div>

              <h4 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">
                Your interview history starts here
              </h4>

              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                Complete your first AI mock interview and your score, evaluation, and improvement areas will appear here.
              </p>

              <Link to="/roles" className="mt-6">
                <Button>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Start First Interview
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentInterviews.slice(0, 4).map((interview) => {
                const score = interview.overallScore;
                const getScoreColor = (sc: number | undefined) => {
                  if (typeof sc !== 'number') return 'text-slate-400';
                  if (sc >= 7.5) return 'text-emerald-600 dark:text-emerald-400';
                  if (sc >= 5) return 'text-amber-600 dark:text-amber-400';
                  return 'text-rose-600 dark:text-rose-400';
                };

                return (
                  <div
                    key={interview.id}
                    className="flex flex-col gap-4 p-5 sm:p-6 transition-colors hover:bg-slate-50 dark:hover:bg-slate-950/50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                        <BarChart3 className="h-5 w-5" />
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                          {interview.roleTitle}
                        </h4>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {interview.date}
                          {interview.durationMinutes ? ` · ${interview.durationMinutes} min` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 justify-between sm:justify-end">
                      {score !== undefined && (
                        <div className="text-right">
                          <p className={`text-xl font-black ${getScoreColor(score)}`}>
                            {score}
                          </p>
                          <p className="text-[10px] font-bold uppercase text-slate-400">
                            Score
                          </p>
                        </div>
                      )}

                      <Link to={`/report/${interview.id}`}>
                        <Button variant="outline" size="sm">
                          Report
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* ==========================================================
            CANDIDATE INTELLIGENCE & QUICK ACTIONS (RIGHT COLUMN)
        ========================================================== */}
        <div className="space-y-6">
          {/* Candidate Profile Summary */}
          <Card className="p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Profile Snapshot
                </p>
                <h4 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  Extracted Skills
                </h4>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                {profileStats.skills} Total
              </span>
            </div>

            {topSkills.length > 0 ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {topSkills.map((skill, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 border border-brand-200/50 dark:border-brand-900/30 text-xs font-semibold"
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <span>{profileStats.projects} Projects recorded</span>
                  <Link
                    to="/profile"
                    className="font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center"
                  >
                    View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-slate-500">
                <p>Upload a resume to auto-extract skills.</p>
                <Link to="/resume/upload" className="mt-3 inline-block">
                  <Button size="sm" variant="secondary">
                    Upload Resume
                  </Button>
                </Link>
              </div>
            )}
          </Card>

          {/* Quick Links */}
          <Card className="p-6 shadow-sm space-y-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
              Workspace Shortcuts
            </h4>

            <Link to="/resume/upload" className="block">
              <div className="group flex items-center gap-3 rounded-xl border border-slate-200/80 p-3 transition-all hover:border-brand-300 hover:bg-brand-50/50 dark:border-slate-800 dark:hover:border-brand-900 dark:hover:bg-brand-950/20">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                  <Upload className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-xs text-slate-900 dark:text-white">
                    Update Resume
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    Re-parse skills & experience
                  </p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>

            <Link to="/roles" className="block">
              <div className="group flex items-center gap-3 rounded-xl border border-slate-200/80 p-3 transition-all hover:border-brand-300 hover:bg-brand-50/50 dark:border-slate-800 dark:hover:border-brand-900 dark:hover:bg-brand-950/20">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600">
                  <PlayCircle className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-xs text-slate-900 dark:text-white">
                    Browse All Roles
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    Targeted engineering domains
                  </p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          </Card>
        </div>

      </section>

      {/* ============================================================
          INTERVIEW JOURNEY WORKFLOW
      ============================================================ */}
      <section>
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
            Mockora Workflow
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
            Your Interview Journey
          </h2>
        </div>

        <Card className="p-6 sm:p-8 shadow-sm">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
            {[
              {
                step: '01',
                title: 'Resume',
                description: 'Extract skills & projects',
                icon: FileText,
              },
              {
                step: '02',
                title: 'Role Track',
                description: 'Choose engineering target',
                icon: Target,
              },
              {
                step: '03',
                title: 'Live Mock',
                description: 'Adaptive AI questioning',
                icon: PlayCircle,
              },
              {
                step: '04',
                title: 'Evaluation',
                description: 'Depth & missing concepts',
                icon: BarChart3,
              },
              {
                step: '05',
                title: 'Report',
                description: 'FAANG readiness score',
                icon: CheckCircle2,
              },
            ].map((item, index) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.step}
                  className="relative flex flex-col items-center text-center"
                >
                  <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                    <Icon className="h-6 w-6" />
                  </div>

                  <span className="mt-3 text-[10px] font-black tracking-widest text-slate-400">
                    {item.step}
                  </span>

                  <h4 className="mt-1 font-bold text-slate-900 dark:text-white text-sm">
                    {item.title}
                  </h4>

                  <p className="mt-1 text-xs text-slate-500">
                    {item.description}
                  </p>

                  {index < 4 && (
                    <div className="absolute left-[calc(50%+36px)] top-6.5 hidden h-px w-[calc(100%-20px)] bg-slate-200 dark:bg-slate-800 md:block" />
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </section>

    </PageWrapper>
  );
};

export default DashboardPage;
