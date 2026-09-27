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
  Sparkles,
  Target,
  TrendingUp,
  Upload,
  UserCheck,
  Zap,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';
import type { CandidateProfile } from '../types';

interface DashboardStat {
  label: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
}

interface RecentInterview {
  id: string;
  role: string;
  date: string;
  score?: number;
  questions?: number;
  status: 'completed' | 'in-progress';
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await apiService.getCandidateProfile();
        setProfile(data);
      } catch (error) {
        console.error('Failed to fetch candidate profile:', error);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  /*
   * These values are intentionally derived from the candidate profile.
   * Interview statistics can later be replaced with real API data.
   */
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

  /*
   * Backend integration point.
   *
   * Replace this with:
   * GET /interviews/recent
   *
   * Keeping it empty for now prevents fake interview data.
   */
  const recentInterviews: RecentInterview[] = [];

  const stats: DashboardStat[] = [
    {
      label: 'Skills Detected',
      value: profileStats.skills,
      description: 'From your resume',
      icon: Target,
    },
    {
      label: 'Projects',
      value: profileStats.projects,
      description: 'In your candidate profile',
      icon: FileText,
    },
    {
      label: 'Experience',
      value: profileStats.experience,
      description: 'Experience entries',
      icon: TrendingUp,
    },
    {
      label: 'Interviews',
      value: recentInterviews.length,
      description: 'Completed sessions',
      icon: History,
    },
  ];

  const firstName = user?.name?.split(' ')[0] || 'Candidate';

  return (
    <PageWrapper className="mx-auto max-w-7xl space-y-8">

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
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-red-500/5 blur-3xl" />

        <div className="relative z-10 grid gap-10 p-8 sm:p-10 lg:grid-cols-[1fr_auto] lg:p-12">

          <div className="max-w-3xl">

            {/* Status */}
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              AI MOCKORA Dashboard
            </div>

            <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl lg:text-5xl">
              Welcome back,{' '}
              <span className="text-brand-600 dark:text-brand-400">
                {firstName}
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-400 sm:text-lg">
              Your interview preparation workspace. Build your candidate
              profile, practise role-specific questions, and improve through
              adaptive AI interviews.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">

              <Link to="/roles">
                <Button
                  size="lg"
                  className="group shadow-lg shadow-brand-500/20"
                >
                  <PlayCircle className="mr-2 h-5 w-5" />
                  Start Interview
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>

              <Link to="/resume/upload">
                <Button
                  variant="outline"
                  size="lg"
                >
                  <Upload className="mr-2 h-5 w-5" />
                  Update Resume
                </Button>
              </Link>

            </div>
          </div>

          {/* Profile completion */}
          <div className="flex items-center justify-center lg:justify-end">

            <div className="w-full max-w-[260px] rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">

              <div className="flex items-center justify-between">

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Candidate Profile
                  </p>

                  <p className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                    {profile ? 'Ready' : 'Incomplete'}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                  {profile ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <UserCheck className="h-6 w-6" />
                  )}
                </div>
              </div>

              <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: profile ? '100%' : '25%' }}
                  transition={{ duration: 0.8 }}
                  className="h-full rounded-full bg-brand-500"
                />
              </div>

              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                {profile
                  ? 'Your resume profile is ready for personalised interviews.'
                  : 'Upload your resume to create your candidate profile.'}
              </p>

            </div>
          </div>

        </div>
      </motion.section>

      {/* ============================================================
          QUICK STATS
      ============================================================ */}
      <section>
        <div className="mb-5 flex items-center justify-between">

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
                <Card className="group h-full p-5 transition-all hover:-translate-y-1 hover:shadow-md">

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
          MAIN DASHBOARD GRID
      ============================================================ */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_0.6fr]">

        {/* ==========================================================
            RECENT INTERVIEWS
        ========================================================== */}
        <Card className="overflow-hidden">

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
                Complete your first AI mock interview and your score,
                evaluation, and improvement areas will appear here.
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

              {recentInterviews.map((interview) => (

                <div
                  key={interview.id}
                  className="flex flex-col gap-4 p-6 transition-colors hover:bg-slate-50 dark:hover:bg-slate-950/50 sm:flex-row sm:items-center sm:justify-between"
                >

                  <div className="flex items-center gap-4">

                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                      <BarChart3 className="h-5 w-5" />
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">
                        {interview.role}
                      </h4>

                      <p className="mt-1 text-xs text-slate-500">
                        {interview.date}
                        {interview.questions
                          ? ` · ${interview.questions} questions`
                          : ''}
                      </p>
                    </div>

                  </div>

                  <div className="flex items-center gap-5">

                    {interview.score !== undefined && (
                      <div className="text-right">
                        <p className="text-xl font-black text-slate-900 dark:text-white">
                          {interview.score}
                        </p>
                        <p className="text-[10px] font-bold uppercase text-slate-400">
                          Score
                        </p>
                      </div>
                    )}

                    <Link to={`/reports/${interview.id}`}>
                      <Button variant="outline" size="sm">
                        Report
                      </Button>
                    </Link>

                  </div>

                </div>
              ))}

            </div>
          )}

        </Card>

        {/* ==========================================================
            QUICK ACTIONS
        ========================================================== */}
        <Card className="p-6">

          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              Quick Actions
            </p>

            <h3 className="mt-1 text-xl font-black text-slate-900 dark:text-white">
              Keep Practising
            </h3>
          </div>

          <div className="space-y-3">

            <Link to="/roles" className="block">
              <div className="group flex items-center gap-4 rounded-2xl border border-slate-200 p-4 transition-all hover:border-brand-300 hover:bg-brand-50 dark:border-slate-800 dark:hover:border-brand-900 dark:hover:bg-brand-950/20">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                  <PlayCircle className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900 dark:text-white">
                    Start Interview
                  </p>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Begin an adaptive session
                  </p>
                </div>

                <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1" />

              </div>
            </Link>

            <Link to="/resume/upload" className="block">
              <div className="group flex items-center gap-4 rounded-2xl border border-slate-200 p-4 transition-all hover:border-brand-300 hover:bg-brand-50 dark:border-slate-800 dark:hover:border-brand-900 dark:hover:bg-brand-950/20">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <Upload className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900 dark:text-white">
                    Update Resume
                  </p>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Refresh your candidate profile
                  </p>
                </div>

                <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1" />

              </div>
            </Link>

            <Link to="/profile" className="block">
              <div className="group flex items-center gap-4 rounded-2xl border border-slate-200 p-4 transition-all hover:border-brand-300 hover:bg-brand-50 dark:border-slate-800 dark:hover:border-brand-900 dark:hover:bg-brand-950/20">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
                  <UserCheck className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900 dark:text-white">
                    Candidate Profile
                  </p>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Review your extracted skills
                  </p>
                </div>

                <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1" />

              </div>
            </Link>

          </div>

        </Card>

      </section>

      {/* ============================================================
          PROFILE / RECOMMENDATION
      ============================================================ */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Candidate Profile */}
        <Card className="p-6 sm:p-7">

          <div className="flex items-start justify-between">

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Candidate Intelligence
              </p>

              <h3 className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                Your Profile
              </h3>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <Sparkles className="h-5 w-5" />
            </div>

          </div>

          {profile ? (

            <div className="mt-6 space-y-5">

              <div className="grid grid-cols-3 gap-3">

                <div className="rounded-2xl bg-slate-50 p-4 text-center dark:bg-slate-950">
                  <p className="text-2xl font-black text-slate-900 dark:text-white">
                    {profileStats.skills}
                  </p>

                  <p className="mt-1 text-[11px] font-semibold text-slate-400">
                    Skills
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 text-center dark:bg-slate-950">
                  <p className="text-2xl font-black text-slate-900 dark:text-white">
                    {profileStats.projects}
                  </p>

                  <p className="mt-1 text-[11px] font-semibold text-slate-400">
                    Projects
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 text-center dark:bg-slate-950">
                  <p className="text-2xl font-black text-slate-900 dark:text-white">
                    {profileStats.experience}
                  </p>

                  <p className="mt-1 text-[11px] font-semibold text-slate-400">
                    Experience
                  </p>
                </div>

              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">

                <div className="flex items-start gap-3">

                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

                  <div>
                    <p className="text-sm font-bold text-emerald-800 dark:text-emerald-400">
                      Resume successfully processed
                    </p>

                    <p className="mt-1 text-xs leading-5 text-emerald-700/80 dark:text-emerald-500/80">
                      Your profile can now be used to personalise interview
                      questions.
                    </p>
                  </div>

                </div>

              </div>

              <Link to="/profile">
                <Button variant="outline" className="w-full">
                  View Full Candidate Profile
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>

            </div>

          ) : (

            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">

              <FileText className="mx-auto h-8 w-8 text-slate-400" />

              <h4 className="mt-3 font-bold text-slate-900 dark:text-white">
                Build your candidate profile
              </h4>

              <p className="mt-2 text-sm text-slate-500">
                Upload your resume so Mockora can personalise your interview.
              </p>

              <Link to="/resume/upload" className="mt-5 inline-block">
                <Button>
                  Upload Resume
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>

            </div>
          )}

        </Card>

        {/* Recommended Practice */}
        <Card className="relative overflow-hidden p-6 sm:p-7">

          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-500/10 blur-3xl" />

          <div className="relative">

            <div className="flex items-start justify-between">

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                  Recommended Next Step
                </p>

                <h3 className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                  Start Your First Practice
                </h3>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <Zap className="h-5 w-5" />
              </div>

            </div>

            <div className="mt-6 rounded-2xl border border-brand-100 bg-brand-50/70 p-5 dark:border-brand-900/30 dark:bg-brand-950/20">

              <p className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                Adaptive Interview
              </p>

              <h4 className="mt-2 text-lg font-black text-slate-900 dark:text-white">
                Choose a role and let Mockora build the session
              </h4>

              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                Questions will be generated according to your selected role,
                candidate profile, topic, and difficulty.
              </p>

              <Link to="/roles" className="mt-5 inline-block">
                <Button>
                  Explore Roles
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>

            </div>

          </div>

        </Card>

      </section>

      {/* ============================================================
          INTERVIEW JOURNEY
      ============================================================ */}
      <section>

        <div className="mb-5">

          <p className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
            Mockora Workflow
          </p>

          <h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
            Your Interview Journey
          </h2>

        </div>

        <Card className="p-6 sm:p-8">

          <div className="grid grid-cols-1 gap-6 md:grid-cols-5">

            {[
              {
                step: '01',
                title: 'Resume',
                description: 'Extract profile',
                icon: FileText,
              },
              {
                step: '02',
                title: 'Role',
                description: 'Choose target',
                icon: Target,
              },
              {
                step: '03',
                title: 'Interview',
                description: 'Answer questions',
                icon: PlayCircle,
              },
              {
                step: '04',
                title: 'Evaluation',
                description: 'AI analyses answers',
                icon: BarChart3,
              },
              {
                step: '05',
                title: 'Report',
                description: 'Review performance',
                icon: CheckCircle2,
              },
            ].map((item, index) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.step}
                  className="relative flex flex-col items-center text-center"
                >

                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                    <Icon className="h-6 w-6" />
                  </div>

                  <span className="mt-3 text-[10px] font-black tracking-widest text-slate-400">
                    {item.step}
                  </span>

                  <h4 className="mt-1 font-bold text-slate-900 dark:text-white">
                    {item.title}
                  </h4>

                  <p className="mt-1 text-xs text-slate-500">
                    {item.description}
                  </p>

                  {index < 4 && (
                    <div className="absolute left-[calc(50%+42px)] top-7 hidden h-px w-[calc(100%-30px)] bg-slate-200 dark:bg-slate-800 md:block" />
                  )}

                </div>
              );
            })}

          </div>

        </Card>

      </section>

      {/* ============================================================
          FINAL CTA
      ============================================================ */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-brand-600 to-red-600 p-8 text-white shadow-xl shadow-brand-500/20 sm:p-10">

        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">

          <div className="max-w-2xl">

            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/80">
              <Sparkles className="h-4 w-4" />
              AI MOCKORA
            </div>

            <h2 className="mt-2 text-2xl font-black sm:text-3xl">
              Ready to test your technical skills?
            </h2>

            <p className="mt-2 text-sm leading-6 text-white/80">
              Start an adaptive mock interview and experience questions that
              evolve with your answers.
            </p>

          </div>

          <Link to="/roles">

            <Button
              size="lg"
              className="whitespace-nowrap bg-white text-brand-600 hover:bg-slate-100"
            >
              Start Interview
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

          </Link>

        </div>

      </section>

    </PageWrapper>
  );
};

export default DashboardPage;