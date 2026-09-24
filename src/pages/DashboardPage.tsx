import React from 'react';
import { Link } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { AnimatedNumber } from '../components/common/AnimatedNumber';
import {
  Sparkles,
  PlayCircle,
  Target,
  Trophy,
  ArrowUpRight,
  ChevronRight,
  FileText,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { mockHistory, mockRoles } from '../mock/mockData';

export const DashboardPage: React.FC = () => {
  const { user, activeResume } = useAuth();

  const performanceTrendData = [
    { session: 'ML Engineer', score: 78, benchmark: 72 },
    { session: 'Backend Dev', score: 81, benchmark: 75 },
    { session: 'Software Eng', score: 84, benchmark: 78 },
    { session: 'Python Dev', score: 88, benchmark: 80 },
    { session: 'System Design', score: 92, benchmark: 82 },
  ];

  return (
    <PageWrapper className="space-y-8">
      {/* 1. Welcome / Candidate Overview Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-widest">
              Candidate Overview
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
            Welcome back, {user?.name.split(' ')[0] || 'Candidate'} 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Targeting: <strong className="text-slate-800 dark:text-slate-200">{user?.targetRole || 'ML Engineer'}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/profile">
            <Button variant="outline" size="md">
              <UserCheck className="w-4 h-4 mr-1.5 text-cyan-600" />
              Candidate Profile
            </Button>
          </Link>
          <Link to="/roles">
            <Button size="md" className="shadow-lg shadow-brand-500/25">
              <PlayCircle className="w-4 h-4 mr-1.5" />
              Start Interview
            </Button>
          </Link>
        </div>
      </div>

      {/* 2 & 3. Resume Status & Profile Completion + Stat Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Profile Completion */}
        <Card hoverEffect className="p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Profile Completion
            </span>
            <div className="text-3xl font-black text-brand-600 dark:text-brand-400 mt-1">
              <AnimatedNumber value={94} suffix="%" />
            </div>
            <Link to="/profile" className="inline-flex items-center text-[10px] font-bold text-cyan-600 dark:text-cyan-400 mt-1 hover:underline">
              View Profile Details →
            </Link>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
        </Card>

        {/* Resume Status */}
        <Card hoverEffect className="p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Resume Status
            </span>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span>Verified & Active</span>
            </div>
            <Link to="/profile" className="text-[10px] text-slate-400 hover:underline mt-1 block">
              {activeResume?.filename || 'Resume_2026.pdf'}
            </Link>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
        </Card>

        {/* Avg Evaluation Score */}
        <Card hoverEffect className="p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Recent Performance
            </span>
            <div className="text-3xl font-black text-slate-900 dark:text-white mt-1">
              <AnimatedNumber value={81} suffix="/100" />
            </div>
            <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              <ArrowUpRight className="w-3 h-3 mr-0.5" /> 8.1 / 10 Tier
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
            <Trophy className="w-6 h-6" />
          </div>
        </Card>

        {/* Readiness Score */}
        <Card hoverEffect className="p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Readiness Score
            </span>
            <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              <AnimatedNumber value={92} suffix="%" />
            </div>
            <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 mt-1 block">
              FAANG Ready Tier
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
        </Card>
      </div>

      {/* 4. AVAILABLE INTERVIEW ROLES (Section 2 in User Spec) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-brand-500" />
              Available Interview Roles
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select an engineering track to launch an AI mock session.
            </p>
          </div>
          <Link to="/roles" className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline">
            View All Tracks ({mockRoles.length}) →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {mockRoles.slice(0, 3).map((r) => (
            <Card key={r.id} hoverEffect className="p-5 flex flex-col justify-between space-y-4 border border-slate-200/80 dark:border-border-dark">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                    {r.difficulty}
                  </span>
                  <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                    {r.matchScore}% Match
                  </span>
                </div>

                <h4 className="font-bold text-base text-slate-900 dark:text-white">{r.title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                  {r.description}
                </p>

                <div className="flex flex-wrap gap-1.5 mt-3">
                  {r.requiredSkills.slice(0, 3).map((s) => (
                    <span
                      key={s}
                      className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-surface-dark-elevated text-slate-700 dark:text-slate-300"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <Link to={`/interview/config/${r.id}`}>
                <Button size="sm" className="w-full shadow-md shadow-brand-500/20">
                  <PlayCircle className="w-4 h-4 mr-1.5" /> Start Interview
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      </div>

      {/* 5 & 6. RECENT PERFORMANCE CHART & PREVIOUS INTERVIEWS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recharts Performance Area Chart */}
        <Card className="lg:col-span-7 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Score Progression Trend
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Evaluation trajectory across your recent sessions
              </p>
            </div>
            <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">
              Avg: 85%
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceTrendData}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(156, 163, 175, 0.15)" />
                <XAxis dataKey="session" stroke="#94A3B8" fontSize={10} />
                <YAxis domain={[60, 100]} stroke="#94A3B8" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E1B4B',
                    borderColor: '#4338CA',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#6366F1"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#scoreGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* PREVIOUS INTERVIEWS SUMMARY TABLE */}
        <Card className="lg:col-span-5 p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Previous Interviews
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Recent evaluations & score cards
                </p>
              </div>
              <Link to="/history">
                <Button variant="ghost" size="sm" className="text-xs">
                  All <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </Button>
              </Link>
            </div>

            <div className="space-y-3">
              {mockHistory.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-surface-dark-elevated border border-slate-200/80 dark:border-white/5 flex items-center justify-between"
                >
                  <div>
                    <h5 className="font-bold text-xs text-slate-900 dark:text-white">{item.roleTitle}</h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">{item.date} • {item.durationMinutes}m</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-sm text-brand-600 dark:text-brand-400">
                      {(item.overallScore / 10).toFixed(1)}/10
                    </span>
                    <Link to={`/report/${item.id}`}>
                      <Button size="sm" variant="outline" className="text-xs px-2.5 py-1">
                        Report
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Link to="/roles" className="pt-2">
            <Button size="sm" className="w-full">
              <PlayCircle className="w-4 h-4 mr-1.5" /> Start New Interview
            </Button>
          </Link>
        </Card>
      </div>
    </PageWrapper>
  );
};
