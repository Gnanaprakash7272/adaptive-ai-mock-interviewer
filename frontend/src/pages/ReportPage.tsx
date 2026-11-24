import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { ScoreCircle } from '../components/common/ScoreCircle';
import {
  CheckCircle2,
  AlertCircle,
  Award,
  ArrowLeft,
  RotateCcw,
  BookOpen,
  Sparkles,
  Target,
  Loader2,
  AlertTriangle,
  Printer,
  Share2,
  Check,
  TrendingUp,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { apiService } from '../services/apiService';
import { useToast } from '../context/ToastContext';
import type { BackendFinalReport } from '../types';

export const ReportPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const { addToast } = useToast();

  const [finalReport, setFinalReport] = useState<BackendFinalReport | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Record<number, boolean>>({});

  useEffect(() => {
    async function initializeReport() {
      const state = location.state as { finalReport?: BackendFinalReport } | null;
      if (state?.finalReport) {
        setFinalReport(state.finalReport);
        setIsInitializing(false);
        return;
      }

      if (!sessionId) {
        setErrorMsg('No interview ID provided.');
        setIsInitializing(false);
        return;
      }

      try {
        const reportData = await apiService.getInterviewReport(sessionId);
        setFinalReport(reportData);
        setIsInitializing(false);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to restore interview report.';
        setErrorMsg(errorMessage);
        setIsInitializing(false);
      }
    }
    initializeReport();
  }, [sessionId, location.state]);

  const ensureArray = (val: unknown): string[] => {
    if (Array.isArray(val)) return val as string[];
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed as string[];
      } catch {
        // ignore malformed JSON strings
      }
      return [val];
    }
    return [];
  };

  const reportDerived = useMemo(() => {
    if (!finalReport) return null;

    let demonstratedStrengths = ensureArray(finalReport.interview_demonstrated_strengths);
    if (demonstratedStrengths.length === 0) {
      demonstratedStrengths = ensureArray(finalReport.strengths);
    }

    let knowledgeGaps = ensureArray(finalReport.interview_knowledge_gaps);
    if (knowledgeGaps.length === 0) {
      knowledgeGaps = ensureArray(finalReport.weaknesses);
    }

    const overallScore = Number(finalReport.overall_score || 0);

    const getVerdict = (score: number) => {
      if (score >= 8.5) {
        return {
          title: 'Strong Hire',
          badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
          tier: 'Top 5% • FAANG & Tier-1 Ready',
          summary: 'Exceptional depth, thorough technical accuracy, and articulate architectural explanations.',
        };
      }
      if (score >= 7.0) {
        return {
          title: 'Hire',
          badgeClass: 'bg-brand-500/15 text-brand-700 dark:text-brand-300 border-brand-500/30',
          tier: 'Top 20% • Production Ready Senior',
          summary: 'Strong technical baseline, clear logical flow, with minor edge cases remaining for polish.',
        };
      }
      if (score >= 5.0) {
        return {
          title: 'Lean Hire',
          badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
          tier: 'Borderline • Targeted Polish Recommended',
          summary: 'Solid foundation demonstrated. Focused revision on missing concepts will boost performance.',
        };
      }
      return {
        title: 'Needs Practice',
        badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
        tier: 'Core Development • Targeted Review',
        summary: 'Key fundamentals require reinforcement. Review recommended concepts and retake.',
      };
    };

    return {
      profileStrengths: ensureArray(finalReport.profile_strengths),
      demonstratedStrengths,
      knowledgeGaps,
      interviewSummaryText: finalReport.summary || 'No summary available.',
      recommendationsList: ensureArray(finalReport.recommendations),
      topicsCovered: ensureArray(finalReport.topics_covered),
      formattedDate: finalReport.created_at
        ? new Date(finalReport.created_at).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        : 'Recent Session',
      verdict: getVerdict(overallScore),
      overallScore,
    };
  }, [finalReport]);

  const toggleQuestion = (idx: number) => {
    setExpandedQuestions((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    addToast('success', 'Report Link Copied', 'Sharable link copied to clipboard.');
  };

  const handlePrint = () => {
    window.print();
  };

  if (isInitializing) {
    return (
      <PageWrapper className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center text-center space-y-4" aria-live="polite">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Synthesizing your AI performance report...
          </p>
        </div>
      </PageWrapper>
    );
  }

  if (errorMsg || !finalReport || !reportDerived) {
    return (
      <PageWrapper className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center text-center space-y-4 max-w-sm" aria-live="assertive">
          <AlertTriangle className="w-10 h-10 text-red-500" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Could not load report</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {errorMsg || 'No report data found.'}
          </p>
          <Link to="/roles">
            <Button variant="primary">Start New Interview</Button>
          </Link>
        </div>
      </PageWrapper>
    );
  }

  const {
    profileStrengths,
    demonstratedStrengths,
    knowledgeGaps,
    interviewSummaryText,
    recommendationsList,
    topicsCovered,
    formattedDate,
    verdict,
    overallScore,
  } = reportDerived;

  const questionsList = finalReport.questions || [];
  const answeredCount = questionsList.length;

  return (
    <PageWrapper className="space-y-8 max-w-5xl pb-16">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div>
          <Link
            to="/history"
            className="inline-flex items-center text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to History
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Performance Analysis Report
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Target Role: <strong className="text-slate-900 dark:text-slate-200">{finalReport.role || 'Engineering Candidate'}</strong> • Completed {formattedDate}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button size="sm" variant="secondary" onClick={handlePrint} className="hidden sm:inline-flex">
            <Printer className="w-4 h-4 mr-1.5" /> Print / PDF
          </Button>
          <Button size="sm" variant="secondary" onClick={handleCopyLink}>
            <Share2 className="w-4 h-4 mr-1.5" /> Share
          </Button>
          <Link to="/roles">
            <Button size="sm" variant="primary">
              <RotateCcw className="w-4 h-4 mr-1.5" /> Retake
            </Button>
          </Link>
        </div>
      </div>

      {/* VERDICT HERO BANNER */}
      <Card className="p-6 sm:p-7 relative overflow-hidden bg-gradient-to-br from-brand-50/70 via-white to-purple-50/40 dark:from-surface-dark-card dark:via-surface-dark-elevated dark:to-surface-dark border border-brand-200/50 dark:border-brand-900/30 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className={`text-xs uppercase tracking-wider font-extrabold px-3 py-1 rounded-full border ${verdict.badgeClass}`}>
                {verdict.title}
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {verdict.tier}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Executive Evaluation Verdict
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              {verdict.summary}
            </p>
          </div>

          <div className="flex items-center gap-6 sm:border-l sm:border-slate-200 dark:sm:border-slate-800 sm:pl-8 shrink-0">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Questions
              </span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {answeredCount}
              </span>
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                Evaluation
              </span>
              <span className="text-2xl font-black text-brand-600 dark:text-brand-400">
                {overallScore.toFixed(1)}<span className="text-sm font-semibold text-slate-400">/10</span>
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* OVERALL SCORE & TOPIC MASTERY BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Score Circle Card */}
        <Card className="lg:col-span-5 p-6 flex flex-col items-center justify-center text-center shadow-sm">
          <ScoreCircle
            score={overallScore}
            maxScore={10}
            size={180}
            strokeWidth={14}
            label="Overall Score"
            sublabel={`${overallScore.toFixed(1)} / 10 Evaluation`}
          />

          <div className="grid grid-cols-2 gap-3 w-full mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-dark-elevated text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Completion
              </span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                100% Finished
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-dark-elevated text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Session Status
              </span>
              <span className="text-sm font-black text-brand-600 dark:text-brand-400 mt-0.5 block">
                Verified Report
              </span>
            </div>
          </div>
        </Card>

        {/* TOPICS COVERED PILLS */}
        <Card className="lg:col-span-7 p-6 space-y-4 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-brand-500" />
                Evaluated Competency Areas
              </h3>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-surface-dark-elevated text-slate-600 dark:text-slate-300">
                {topicsCovered.length} Topics
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              These skill domains and situational topics were actively explored by the adaptive interviewer:
            </p>

            <div className="flex flex-wrap gap-2.5">
              {topicsCovered.map((topic, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-surface-dark-elevated border border-slate-200/80 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-2xs"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>{topic}</span>
                </div>
              ))}
              {topicsCovered.length === 0 && (
                <p className="text-xs text-slate-400">Core engineering competencies evaluated.</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-4 border-t border-slate-100 dark:border-slate-800 text-slate-500">
            <span className="flex items-center gap-1.5 font-medium">
              <TrendingUp className="w-3.5 h-3.5 text-brand-500" /> Adaptive Depth Analysis
            </span>
            <span className="font-bold text-brand-600 dark:text-brand-400">
              {answeredCount > 0 ? `${answeredCount} Deep-Dives Analyzed` : 'Completed'}
            </span>
          </div>
        </Card>
      </div>

      {/* STRENGTHS & KNOWLEDGE GAPS (3-COLUMN MATRIX) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Strengths */}
        <Card className="p-6 space-y-4 shadow-sm border-t-4 border-t-emerald-500">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-500" />
            Profile Strengths
          </h3>
          <ul className="space-y-2.5 text-xs">
            {profileStrengths.map((item, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/50 text-emerald-950 dark:text-emerald-200 font-medium leading-relaxed"
              >
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
            {profileStrengths.length === 0 && (
              <li className="text-xs text-slate-500 italic p-3 rounded-xl bg-slate-50 dark:bg-surface-dark-elevated">
                Solid foundational qualifications aligned with role standards.
              </li>
            )}
          </ul>
        </Card>

        {/* Demonstrated Strengths */}
        <Card className="p-6 space-y-4 shadow-sm border-t-4 border-t-brand-500">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-500" />
            Demonstrated Strengths
          </h3>
          <ul className="space-y-2.5 text-xs">
            {demonstratedStrengths.map((item, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-brand-50/50 dark:bg-brand-950/30 border border-brand-200/50 dark:border-brand-800/50 text-brand-950 dark:text-brand-200 font-medium leading-relaxed"
              >
                <Check className="w-3.5 h-3.5 text-brand-500 shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
            {demonstratedStrengths.length === 0 && (
              <li className="text-xs text-slate-500 italic p-3 rounded-xl bg-slate-50 dark:bg-surface-dark-elevated">
                Clear answers provided across core scenarios.
              </li>
            )}
          </ul>
        </Card>

        {/* Knowledge Gaps */}
        <Card className="p-6 space-y-4 shadow-sm border-t-4 border-t-amber-500">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            Knowledge Gaps & Blindspots
          </h3>
          <ul className="space-y-2.5 text-xs">
            {knowledgeGaps.map((item, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/50 text-amber-950 dark:text-amber-200 font-medium leading-relaxed"
              >
                <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
            {knowledgeGaps.length === 0 && (
              <li className="text-xs text-emerald-600 dark:text-emerald-400 p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 font-medium">
                No critical knowledge gaps detected during this interview.
              </li>
            )}
          </ul>
        </Card>
      </div>

      {/* INTERVIEW SUMMARY & ACTION PLAN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Interview Summary */}
        <Card className="p-6 space-y-3 bg-gradient-to-br from-brand-50/30 via-white to-brand-50/10 dark:from-surface-dark-card dark:to-surface-dark-elevated border border-brand-200/40 dark:border-brand-900/20 shadow-sm">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-500" />
            AI Executive Synthesis
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
            {interviewSummaryText}
          </p>
        </Card>

        {/* Recommendations & Action Plan */}
        <Card className="p-6 space-y-3 bg-gradient-to-br from-brand-50/30 via-white to-brand-50/10 dark:from-surface-dark-card dark:to-surface-dark-elevated border border-brand-200/40 dark:border-brand-900/20 shadow-sm">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-brand-500" />
            Targeted Action Plan & Recommendations
          </h3>
          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
            {recommendationsList.map((rec, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{rec}</span>
              </li>
            ))}
            {recommendationsList.length === 0 && (
              <li className="text-slate-500 italic">Review key trade-offs and practice explaining real project metrics.</li>
            )}
          </ul>
        </Card>
      </div>

      {/* PER-QUESTION AUDIT BREAKDOWN */}
      {questionsList.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-500" />
              Detailed Question Breakdown & Review
            </h2>
            <span className="text-xs font-semibold text-slate-500">
              {questionsList.length} Questions
            </span>
          </div>

          <div className="space-y-4">
            {questionsList.map((q, idx) => {
              const isExpanded = expandedQuestions[idx] !== false; // Default open
              const scoreVal = q.score !== undefined && q.score !== null ? Number(q.score) : null;

              const getScoreColor = (sc: number | null) => {
                if (sc === null) return 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300';
                if (sc >= 8) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300/40';
                if (sc >= 6) return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300/40';
                return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300/40';
              };

              return (
                <Card key={idx} className="p-5 sm:p-6 space-y-4 shadow-sm border border-slate-200/80 dark:border-white/10">
                  <div
                    className="flex items-start justify-between gap-4 cursor-pointer select-none"
                    onClick={() => toggleQuestion(idx)}
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 font-bold text-xs shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-relaxed">
                        {q.question}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      {scoreVal !== null && (
                        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${getScoreColor(scoreVal)}`}>
                          Score: {scoreVal}/10
                        </span>
                      )}
                      <button type="button" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="space-y-3.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      {/* Candidate Answer Box */}
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-surface-dark-elevated border border-slate-200/60 dark:border-white/5 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Your Submitted Answer
                        </span>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic whitespace-pre-line">
                          {q.answer ? `"${q.answer}"` : 'No answer recorded.'}
                        </p>
                      </div>

                      {/* Missing Concepts */}
                      {q.missing_concepts && q.missing_concepts.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Key Concepts Missed / To Strengthen:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {q.missing_concepts.map((concept, cIdx) => (
                              <span
                                key={cIdx}
                                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200/60 dark:border-amber-800/40 font-medium"
                              >
                                • {concept}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* BOTTOM ACTION CTA */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <Link to="/history" className="w-full sm:w-auto">
          <Button variant="ghost" className="w-full sm:w-auto text-slate-500">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to History
          </Button>
        </Link>
        <Link to="/roles" className="w-full sm:w-auto">
          <Button size="lg" variant="primary" className="w-full sm:w-auto shadow-lg shadow-brand-500/25 px-8">
            <RotateCcw className="w-4 h-4 mr-2" /> Practice Another Role
          </Button>
        </Link>
      </div>
    </PageWrapper>
  );
};
