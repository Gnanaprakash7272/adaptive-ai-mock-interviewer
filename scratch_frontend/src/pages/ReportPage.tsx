import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { ScoreCircle } from '../components/common/ScoreCircle';
import {
  Download,
  Share2,
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
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { apiService } from '../services/apiService';
import type { BackendFinalReport } from '../types';

export const ReportPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const { addToast } = useToast();

  const [finalReport, setFinalReport] = useState<BackendFinalReport | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function initializeReport() {
      const state = location.state as any;
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
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to restore interview report.');
        setIsInitializing(false);
      }
    }
    initializeReport();
  }, [sessionId, location.state]);

  const handleDownloadPDF = () => {
    addToast('success', 'PDF Export Complete!', 'Downloading Report.pdf');
    // @TODO: Implement real PDF generation and download
  };

  if (isInitializing) {
    return (
      <PageWrapper className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center text-center space-y-4">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Fetching your performance report...
          </p>
        </div>
      </PageWrapper>
    );
  }

  if (errorMsg || !finalReport) {
    return (
      <PageWrapper className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center text-center space-y-4 max-w-sm">
          <AlertTriangle className="w-10 h-10 text-red-500" />
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

  // UI mapping logic: map available backend fields, omit unsupported ones without inventing values.
  // topicPerformance variable removed as it was unused
  
  const ensureArray = (val: any): string[] => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // ignore
      }
      return [val];
    }
    return [];
  };

  const profileStrengths = ensureArray(finalReport.profile_strengths);
  
  let demonstratedStrengths = ensureArray(finalReport.interview_demonstrated_strengths);
  if (demonstratedStrengths.length === 0) {
    demonstratedStrengths = ensureArray(finalReport.strengths);
  }

  let knowledgeGaps = ensureArray(finalReport.interview_knowledge_gaps);
  if (knowledgeGaps.length === 0) {
    knowledgeGaps = ensureArray(finalReport.weaknesses);
  }

  const interviewSummaryText = finalReport.summary || 'No summary available.';
  const recommendationsList = ensureArray(finalReport.recommendations);
  const topicsCovered = ensureArray(finalReport.topics_covered);

  return (
    <PageWrapper className="space-y-8 max-w-5xl">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/history"
            className="inline-flex items-center text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-1"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to History
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            Performance Analysis Report
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Role Track: <strong className="text-slate-800 dark:text-slate-200">{(finalReport as any).role || 'Mock Session'}</strong> • {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => addToast('info', 'Share link copied to clipboard')}>
            <Share2 className="w-4 h-4 mr-1.5" /> Share
          </Button>
          <Button size="sm" onClick={handleDownloadPDF} className="shadow-lg">
            <Download className="w-4 h-4 mr-1.5" /> Export PDF
          </Button>
          <Link to="/roles">
            <Button size="sm" variant="secondary">
              <RotateCcw className="w-4 h-4 mr-1.5" /> Retake
            </Button>
          </Link>
        </div>
      </div>

      {/* 11. OVERALL SCORE BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Overall Score Circle Card */}
        <Card className="lg:col-span-5 p-6 flex flex-col items-center justify-center text-center glass-panel-light dark:glass-panel-dark">
          <ScoreCircle
            score={finalReport.overall_score || 0}
            maxScore={10}
            size={180}
            strokeWidth={14}
            label="Overall Score"
            sublabel={finalReport.overall_score ? `${Number(finalReport.overall_score).toFixed(1)} / 10 Evaluation` : "N/A"}
          />


        </Card>

        {/* TOPIC PERFORMANCE BARS */}
        <Card className="lg:col-span-7 p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-brand-500" />
                Topics Covered
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              The following topics were discussed during your interview.
            </p>

            <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              {topicsCovered.map((topic, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
                  {topic}
                </li>
              ))}
              {topicsCovered.length === 0 && (
                <li className="text-slate-500">No topics recorded.</li>
              )}
            </ul>
          </div>

          {/* Quick Stats Footer */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 dark:border-white/5">
            <span>Evaluation Duration: N/A (Not provided)</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              Percentile Rank: N/A
            </span>
          </div>
        </Card>
      </div>

      {/* STRENGTHS & KNOWLEDGE GAPS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Profile Strengths */}
        <Card className="p-6 space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-500" />
            Profile Strengths
          </h3>
          <ul className="space-y-2.5 text-xs">
            {profileStrengths.map((item, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 font-medium leading-relaxed"
              >
                <span>{item}</span>
              </li>
            ))}
            {profileStrengths.length === 0 && (
               <li className="text-slate-500">No profile strengths recorded.</li>
            )}
          </ul>
        </Card>

        {/* Demonstrated Strengths */}
        <Card className="p-6 space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-500" />
            Demonstrated Strengths
          </h3>
          <ul className="space-y-2.5 text-xs">
            {demonstratedStrengths.map((item, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/60 text-blue-900 dark:text-blue-200 font-medium leading-relaxed"
              >
                <span>{item}</span>
              </li>
            ))}
            {demonstratedStrengths.length === 0 && (
               <li className="text-slate-500">No demonstrated strengths recorded.</li>
            )}
          </ul>
        </Card>

        {/* Knowledge Gaps */}
        <Card className="p-6 space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            Knowledge Gaps
          </h3>
          <ul className="space-y-2.5 text-xs">
            {knowledgeGaps.map((item, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 font-medium leading-relaxed"
              >
                <span>{item}</span>
              </li>
            ))}
            {knowledgeGaps.length === 0 && (
               <li className="text-slate-500">No knowledge gaps recorded.</li>
            )}
          </ul>
        </Card>
      </div>

      {/* INTERVIEW SUMMARY & RECOMMENDATIONS (Section 11) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Interview Summary */}
        <Card className="p-6 space-y-3 bg-gradient-to-br from-brand-50/40 via-white to-brand-50/20 dark:from-surface-dark-card dark:to-surface-dark-elevated border-brand-500/20">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-500" />
            Interview Summary (AI Generated)
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {interviewSummaryText}
          </p>
        </Card>

        {/* Recommendations */}
        <Card className="p-6 space-y-3 bg-gradient-to-br from-brand-50/40 via-white to-brand-50/20 dark:from-surface-dark-card dark:to-surface-dark-elevated border-brand-500/20">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-brand-500" />
            Recommended Revisions
          </h3>
          <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
            {recommendationsList.map((rec, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-brand-500 shrink-0 mt-0.5" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </PageWrapper>
  );
};
