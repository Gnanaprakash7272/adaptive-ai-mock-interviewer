import React from 'react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { VillainAgent } from '../components/career/VillainAgent';
import { Flame, Sparkles, ShieldAlert, Cpu } from 'lucide-react';

export const CareerCoachPage: React.FC = () => {
  return (
    <PageWrapper className="max-w-5xl mx-auto px-3 sm:px-6 py-6 space-y-5">
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-border-dark">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-brand-50 dark:bg-brand-950/80 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800/60 shadow-2xs">
            <Flame className="w-3.5 h-3.5 fill-brand-500 text-brand-500 animate-pulse" />
            AI Career Villain & Portfolio Studio
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Career Villain & Portfolio Studio
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
            Direct, no-BS career direction tailored to your profile. Roast your resume, identify skill gaps against your target role, and get production-grade portfolio blueprints with real industry tools (Kafka, Redis, Docker, Postgres).
          </p>
        </div>

        {/* Feature Pills */}
        <div className="hidden sm:flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-surface-dark-elevated text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-border-dark">
            <ShieldAlert className="w-3.5 h-3.5 text-brand-500" />
            Zero-BS Critique
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-surface-dark-elevated text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-border-dark">
            <Cpu className="w-3.5 h-3.5 text-indigo-500" />
            Modern Tech Stack
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-surface-dark-elevated text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-border-dark">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            1-Click Blueprints
          </span>
        </div>
      </div>

      {/* Primary Chatbot Interface */}
      <div>
        <VillainAgent />
      </div>
    </PageWrapper>
  );
};

export default CareerCoachPage;
