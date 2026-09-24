import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { ScoreCircle } from '../components/common/ScoreCircle';
import { Sparkles, Trophy, CheckCircle2, ArrowRight, LineChart, RotateCcw } from 'lucide-react';
import { mockSampleReport } from '../mock/mockData';

export const InterviewCompletePage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();

  return (
    <PageWrapper className="max-w-3xl space-y-8 text-center py-6">
      {/* Animated Header Badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center"
      >
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4 shadow-lg">
          <Trophy className="w-8 h-8" />
        </div>
        <span className="text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">
          Interview Session Finished
        </span>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white mt-1">
          Evaluation Report Generated!
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md">
          Our AI engine has finished processing your speech cadence, fiber reconciler breakdown, and system architecture answers.
        </p>
      </motion.div>

      {/* SCORE SNAPSHOT CARD */}
      <Card className="p-8 space-y-6 glass-panel-light dark:glass-panel-dark">
        <div className="flex justify-center">
          <ScoreCircle
            score={mockSampleReport.overallScore}
            size={200}
            label="Overall Assessment Score"
            sublabel="Top 4% Candidate Tier"
          />
        </div>

        {/* Immediate Feedback Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left pt-4 border-t border-slate-100 dark:border-white/5">
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
            <h4 className="font-bold text-xs text-emerald-900 dark:text-emerald-200 mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Primary Strength
            </h4>
            <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
              Exceptional deep explanation of React 18 Fiber reconciliation and priority scheduling.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800/60">
            <h4 className="font-bold text-xs text-brand-900 dark:text-brand-200 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-brand-500" />
              Key Opportunity
            </h4>
            <p className="text-xs text-brand-800 dark:text-brand-300 leading-relaxed">
              Elaborate slightly more on Shadow DOM CSS encapsulation boundaries for micro-frontends.
            </p>
          </div>
        </div>
      </Card>

      {/* ACTION BUTTONS */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link to={`/report/${sessionId || 'sess_9912a'}`} className="w-full sm:w-auto">
          <Button size="lg" className="w-full shadow-xl">
            <LineChart className="w-4 h-4 mr-2" />
            View Full Granular Report & Charts
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>

        <Link to="/roles" className="w-full sm:w-auto">
          <Button variant="outline" size="lg" className="w-full">
            <RotateCcw className="w-4 h-4 mr-2" />
            Take Another Track
          </Button>
        </Link>
      </div>
    </PageWrapper>
  );
};
