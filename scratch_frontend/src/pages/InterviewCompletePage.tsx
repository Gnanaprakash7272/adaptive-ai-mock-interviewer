import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Trophy, CheckCircle2, ArrowRight, LineChart, RotateCcw } from 'lucide-react';



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

      {/* COMPLETION CARD */}
      <Card className="p-8 space-y-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            All questions answered!
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
            The AI has finished evaluating your responses. Open your performance report below for strengths, gaps, and improvement recommendations.
          </p>
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
