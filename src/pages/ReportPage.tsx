import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
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
  ChevronDown,
  ChevronUp,
  RotateCcw,
  BookOpen,
  Sparkles,
  Target,
} from 'lucide-react';
import { apiService } from '../services/apiService';
import type { PerformanceReport } from '../types';
import { useToast } from '../context/ToastContext';
import { mockSampleReport } from '../mock/mockData';

export const ReportPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { addToast } = useToast();

  const [report, setReport] = useState<PerformanceReport>(mockSampleReport);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string>('q_1');

  useEffect(() => {
    if (sessionId) {
      apiService.getReport(sessionId).then((data) => {
        if (data) setReport(data);
      });
    }
  }, [sessionId]);

  const handleDownloadPDF = () => {
    addToast('success', 'PDF Export Complete!', 'Downloading ML_Engineer_AI_Mockora_Report.pdf');
  };

  const topicPerformance = report.topicPerformance || [
    { topic: 'Python', score: 8, maxScore: 10 },
    { topic: 'Machine Learning', score: 7, maxScore: 10 },
    { topic: 'SQL', score: 9, maxScore: 10 },
    { topic: 'System Design', score: 8, maxScore: 10 },
  ];

  const strengthsList = report.strengths || [
    '✓ Python fundamentals & asynchronous event loop concurrency',
    '✓ SQL indexing internals & query plan optimization',
    '✓ High-throughput API concepts and FastAPI dependency injection',
  ];

  const knowledgeGapsList = report.knowledgeGaps || [
    '• Model evaluation metrics (ROC-AUC vs PR-AUC in imbalanced datasets)',
    '• Bias-variance tradeoff in complex ensemble tree methods',
  ];

  const interviewSummaryText =
    report.interviewSummary ||
    'Candidate demonstrated strong mastery of foundational machine learning algorithms, asynchronous backend architectures, and database design. Answered all questions with comprehensive technical depth.';

  const recommendationsList =
    report.recommendations || [
      'Revise model evaluation edge cases under severe class imbalance (F1-score vs precision-recall curve).',
      'Practice deep-dive architectural trade-offs for distributed vector stores and quantization schemes.',
    ];

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
            Role Track: <strong className="text-slate-800 dark:text-slate-200">{report.roleTitle}</strong> • {report.date}
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

      {/* 11. OVERALL SCORE BREAKDOWN (Section 11 in User Spec) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Overall Score Circle Card */}
        <Card className="lg:col-span-5 p-6 flex flex-col items-center justify-center text-center glass-panel-light dark:glass-panel-dark">
          <ScoreCircle
            score={report.overallScore}
            size={180}
            strokeWidth={14}
            label="Overall Score"
            sublabel={`${(report.overallScore / 10).toFixed(1)} / 10 Evaluation`}
          />

          <div className="grid grid-cols-3 gap-2 w-full mt-5 pt-5 border-t border-slate-100 dark:border-white/5 text-center text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-surface-dark-elevated">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
                Technical
              </span>
              <span className="font-extrabold text-sm text-brand-600 dark:text-brand-400">
                {report.technicalScore ? `${(report.technicalScore / 10).toFixed(1)}/10` : '8.4/10'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-surface-dark-elevated">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
                Completeness
              </span>
              <span className="font-extrabold text-sm text-indigo-600 dark:text-indigo-400">
                {report.completeness ? `${(report.completeness / 10).toFixed(1)}/10` : '8.0/10'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-surface-dark-elevated">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
                Tech Depth
              </span>
              <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                {report.technicalDepth ? `${(report.technicalDepth / 10).toFixed(1)}/10` : '8.2/10'}
              </span>
            </div>
          </div>
        </Card>

        {/* TOPIC PERFORMANCE BARS (Matching Prompt Section 11) */}
        <Card className="lg:col-span-7 p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-cyan-500" />
                Topic Performance Breakdown
              </h3>
              <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">
                Scores out of 10
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Granular evaluation mapped across core technical domains.
            </p>

            <div className="space-y-3.5">
              {topicPerformance.map((item) => (
                <div key={item.topic} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-800 dark:text-slate-200">{item.topic}</span>
                    <span className="text-brand-600 dark:text-brand-400 font-black">
                      {item.score} / {item.maxScore}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${(item.score / item.maxScore) * 100}%` }}
                      className={`h-full rounded-full transition-all duration-700 ${
                        item.score >= 8
                          ? 'bg-emerald-500'
                          : item.score >= 6
                          ? 'bg-brand-500'
                          : 'bg-amber-500'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats Footer */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 dark:border-white/5">
            <span>Evaluation Duration: {report.timeSpentMinutes} mins</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
              Percentile Rank: Top {100 - report.percentileRank}%
            </span>
          </div>
        </Card>
      </div>

      {/* STRENGTHS & KNOWLEDGE GAPS (Matching Exact Prompt Format) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        <Card className="p-6 space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-500" />
            Strengths
          </h3>
          <ul className="space-y-2.5 text-xs">
            {strengthsList.map((item, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 font-medium leading-relaxed"
              >
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Knowledge Gaps */}
        <Card className="p-6 space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            Knowledge Gaps
          </h3>
          <ul className="space-y-2.5 text-xs">
            {knowledgeGapsList.map((item, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 font-medium leading-relaxed"
              >
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* INTERVIEW SUMMARY & RECOMMENDATIONS (Section 11) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Interview Summary */}
        <Card className="p-6 space-y-3 bg-gradient-to-br from-brand-50/40 via-white to-cyan-50/20 dark:from-surface-dark-card dark:to-surface-dark-elevated border-brand-500/20">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-500" />
            Interview Summary (AI Generated)
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {interviewSummaryText}
          </p>
        </Card>

        {/* Recommendations */}
        <Card className="p-6 space-y-3 bg-gradient-to-br from-purple-50/40 via-white to-indigo-50/20 dark:from-surface-dark-card dark:to-surface-dark-elevated border-purple-500/20">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-purple-500" />
            Recommended Revisions
          </h3>
          <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
            {recommendationsList.map((rec, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-500 shrink-0 mt-0.5" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* QUESTION BY QUESTION BREAKDOWN */}
      <Card className="p-6 space-y-6">
        <div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            Question-by-Question Detailed Feedback
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Review your answers, individual scores, and AI suggestions for each question.
          </p>
        </div>

        <div className="space-y-4">
          {report.questionEvaluations.map((evalItem, idx) => {
            const isExpanded = expandedQuestionId === evalItem.questionId;
            return (
              <div
                key={evalItem.questionId}
                className="rounded-2xl border border-slate-200 dark:border-border-dark overflow-hidden transition-all bg-white dark:bg-surface-dark-elevated/40"
              >
                <button
                  onClick={() => setExpandedQuestionId(isExpanded ? '' : evalItem.questionId)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-surface-dark-elevated transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                        Question {idx + 1}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                        {evalItem.aiFeedback}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      {evalItem.score} / 100
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-4 border-t border-slate-100 dark:border-white/5 space-y-4 text-xs bg-slate-50/50 dark:bg-surface-dark/40">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block mb-1">
                        Your Submitted Answer:
                      </span>
                      <p className="p-3 rounded-xl bg-white dark:bg-surface-dark border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                        {evalItem.userAnswerText}
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-brand-600 dark:text-brand-400 block mb-1">
                        AI Evaluator Feedback:
                      </span>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        {evalItem.aiFeedback}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </PageWrapper>
  );
};
