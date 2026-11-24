import React, { useEffect, useState } from 'react';
import { Award, Medal, Search, ShieldCheck, Star, Trophy, TrendingUp, UserRound, Zap } from 'lucide-react';

import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/common/Card';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';
import type { LeaderboardEntry } from '../types';

export const LeaderboardPage: React.FC = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiService.getLeaderboard()
      .then(setEntries)
      .catch(() => setError('Leaderboard is temporarily unavailable.'))
      .finally(() => setLoading(false));
  }, []);

  const visibleEntries = entries.filter((entry) =>
    entry.fullName.toLowerCase().includes(search.trim().toLowerCase())
  );
  const topEntries = entries.slice(0, 3);

  const scoreTone = (score: number) => (
    score >= 75
      ? 'text-brand-600 dark:text-brand-400'
      : score >= 50
        ? 'text-brand-500 dark:text-brand-300'
        : 'text-slate-600 dark:text-slate-300'
  );

  const getBadge = (entry: LeaderboardEntry) => {
    if (entry.rank === 1) {
      return { label: 'Top performer', icon: Trophy };
    }
    if (entry.interviewsCompleted >= 5 && entry.consistencyScore >= 75) {
      return { label: 'Consistent learner', icon: ShieldCheck };
    }
    if (entry.score >= 75) {
      return { label: 'High achiever', icon: Zap };
    }
    return null;
  };

  const getInitials = (name: string) => name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <PageWrapper className="space-y-8 pb-12">
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-950 via-red-950 to-brand-800 p-7 text-white shadow-2xl shadow-brand-950/20 sm:p-10">
        <div className="pointer-events-none absolute -right-20 -top-32 h-80 w-80 rounded-full bg-brand-500/45 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-1/3 h-72 w-72 rounded-full bg-red-700/35 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-10 [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="relative flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-200/35 bg-red-950/35 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-brand-100">
              <Trophy className="h-3.5 w-3.5 text-brand-300" />
              Community ranking
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
              Interview Leaderboard
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">
              Celebrate progress and see how the community is performing.
              Rankings combine performance, consistency, and profile strength.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/15 bg-white/[0.08] px-4 py-3 shadow-lg shadow-black/10 backdrop-blur transition-transform hover:-translate-y-1">
              <p className="text-2xl font-black tracking-tight">{entries.length}</p>
              <p className="text-[11px] font-semibold text-slate-300">Participants</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/[0.08] px-4 py-3 shadow-lg shadow-black/10 backdrop-blur transition-transform hover:-translate-y-1">
              <p className="text-2xl font-black tracking-tight">{entries.filter((entry) => entry.interviewsCompleted > 0).length}</p>
              <p className="text-[11px] font-semibold text-slate-300">Active learners</p>
            </div>
            <div className="col-span-2 rounded-2xl border border-white/15 bg-white/[0.08] px-4 py-3 shadow-lg shadow-black/10 backdrop-blur transition-transform hover:-translate-y-1 sm:col-span-1">
              <p className="text-2xl font-black tracking-tight">{entries[0]?.score.toFixed(1) ?? '0.0'}</p>
              <p className="text-[11px] font-semibold text-slate-300">Top score</p>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="h-72 animate-pulse rounded-2xl bg-slate-200/60 dark:bg-slate-800/40" />
      ) : error ? (
        <Card className="p-10 text-center text-sm text-rose-500">{error}</Card>
      ) : entries.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-500">
          No users are available yet.
        </Card>
      ) : (
        <>
          <section>
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">
                  Top performers
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                  Leadership List
                </h2>
              </div>
              <p className="hidden text-xs text-slate-400 sm:block">Updated from latest results</p>
            </div>
            <div className="grid items-end gap-4 md:grid-cols-3">
              {topEntries.map((entry) => (
                <Card
                  key={entry.userId}
                  className={`relative overflow-hidden border-slate-200/80 bg-gradient-to-b from-white to-brand-50/30 p-6 text-center dark:border-white/10 dark:from-slate-900 dark:to-brand-950/20 ${entry.rank === 1 ? 'md:-translate-y-4 md:border-brand-300 md:shadow-xl md:shadow-brand-500/10' : ''}`}
                  hoverEffect
                >
                  <div className={`absolute inset-x-0 top-0 h-1 ${entry.rank === 1 ? 'bg-brand-500' : entry.rank === 2 ? 'bg-brand-400' : 'bg-brand-300'}`} />
                  <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-brand-500/5" />
                  {entry.rank === 1 ? (
                    <Trophy className="mx-auto h-8 w-8 text-brand-600 dark:text-brand-400" />
                  ) : entry.rank === 2 ? (
                    <Medal className="mx-auto h-8 w-8 text-brand-500 dark:text-brand-300" />
                  ) : (
                    <Award className="mx-auto h-8 w-8 text-brand-400 dark:text-brand-200" />
                  )}
                  <div className="mx-auto mt-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500 text-lg font-black text-white shadow-lg shadow-brand-500/25">
                    {getInitials(entry.fullName)}
                  </div>
                  <p className="mt-3 text-[11px] font-black uppercase tracking-widest text-slate-400">
                    Rank {entry.rank}
                  </p>
                  <p className="mt-2 truncate font-black text-slate-900 dark:text-white">
                    {entry.fullName}
                  </p>
                  {getBadge(entry) && (() => {
                    const badge = getBadge(entry)!;
                    return (
                      <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-brand-200/60 bg-brand-500/10 px-2.5 py-1 text-[10px] font-bold text-brand-600 dark:border-brand-400/20 dark:text-brand-300">
                        {React.createElement(badge.icon, { className: 'h-3 w-3' })}
                        {badge.label}
                      </span>
                    );
                  })()}
                  <p className={`mt-3 text-3xl font-black ${scoreTone(entry.score)}`}>
                    {entry.score.toFixed(1)}
                    <span className="ml-1 text-xs font-semibold text-slate-400">/100</span>
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-1 text-xs text-slate-400">
                    <Star className="h-3.5 w-3.5 fill-brand-400 text-brand-400" />
                    {entry.interviewsCompleted} interview{entry.interviewsCompleted === 1 ? '' : 's'} completed
                  </div>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">
                  Complete ranking
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-900 dark:text-white">All Users</h2>
              </div>
              <p className="text-xs text-slate-400">Email addresses are never shown</p>
            </div>
            <div className="mb-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-shadow focus-within:border-brand-300 focus-within:ring-4 focus-within:ring-brand-500/10 dark:border-white/10 dark:bg-slate-900">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search candidates by name..."
                aria-label="Search candidates by name"
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="text-xs font-bold text-brand-600 hover:text-brand-500"
                >
                  Clear
                </button>
              )}
            </div>
            {user && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-brand-200/60 bg-brand-50 px-4 py-3 text-xs font-semibold text-brand-700 dark:border-brand-400/20 dark:bg-brand-950/30 dark:text-brand-300">
                <UserRound className="h-4 w-4" />
                Your ranking is highlighted below.
              </div>
            )}
            <Card className="overflow-hidden border-slate-200/80 shadow-sm dark:border-white/10">
            <div className="hidden grid-cols-[64px_1fr_180px_100px] items-center gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:border-white/5 dark:bg-white/[0.03] md:grid">
              <span>Rank</span><span>Candidate</span><span className="text-right">Score breakdown</span><span className="text-right">Total</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {visibleEntries.map((entry) => (
              <div key={entry.userId} className={`grid gap-4 border-l-4 p-5 transition-all md:grid-cols-[64px_1fr_180px_100px] md:items-center ${entry.userId === user?.user_id ? 'border-brand-500 bg-brand-50/70 dark:bg-brand-950/20' : 'border-transparent hover:bg-slate-50/80 dark:hover:border-brand-200/30 dark:hover:bg-white/[0.02]'}`}>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl font-black shadow-sm ${entry.rank <= 3 ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400' : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400'}`}>
                  {entry.rank <= 3 ? <Trophy className="h-4 w-4" /> : `#${entry.rank}`}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-[10px] font-black text-brand-600 dark:text-brand-300">
                      {getInitials(entry.fullName)}
                    </span>
                    <p className="truncate font-bold text-slate-900 dark:text-white">{entry.fullName}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {entry.interviewsCompleted} completed interview{entry.interviewsCompleted === 1 ? '' : 's'}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {entry.userId === user?.user_id && (
                      <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        You
                      </span>
                    )}
                    {getBadge(entry) && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-bold text-brand-600 dark:text-brand-300">
                        {React.createElement(getBadge(entry)!.icon, { className: 'h-3 w-3' })}
                        {getBadge(entry)!.label}
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-semibold text-slate-400"><span>Performance</span><span>{entry.performanceScore.toFixed(0)}</span></div>
                  <div className="h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"><div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(100, entry.performanceScore)}%` }} /></div>
                  <div className="flex justify-between text-[10px] font-semibold text-slate-400"><span>Consistency</span><span>{entry.consistencyScore.toFixed(0)}</span></div>
                  <div className="h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"><div className="h-full rounded-full bg-brand-300" style={{ width: `${Math.min(100, entry.consistencyScore)}%` }} /></div>
                </div>
                <div className={`flex items-center gap-1 font-black md:justify-end ${scoreTone(entry.score)}`}>
                  <TrendingUp className="h-4 w-4" />
                  {entry.score.toFixed(1)}
                  <span className="text-xs font-semibold text-slate-400">/100</span>
                </div>
              </div>
              ))}
            </div>
            {visibleEntries.length === 0 && (
              <div className="p-10 text-center text-sm text-slate-500">
                No candidates match “{search}”.
              </div>
            )}
            </Card>
          </section>
        </>
      )}
    </PageWrapper>
  );
};
