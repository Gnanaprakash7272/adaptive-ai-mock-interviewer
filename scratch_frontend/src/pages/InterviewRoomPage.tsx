import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import {
  Mic,
  Clock,
  Send,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Trophy,
} from 'lucide-react';
import type { Question, BackendFinalReport } from '../types';
import { apiService } from '../services/apiService';
import { useToast } from '../context/ToastContext';
import { TextSliceLoader } from '../components/common/TextSliceLoader';

export const InterviewRoomPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [totalQuestions, setTotalQuestions] = useState<number>(5);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswerText, setUserAnswerText] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(180);
  const [isInitializing, setIsInitializing] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Submission & evaluation states
  const [submissionPhase, setSubmissionPhase] = useState<'idle' | 'submitting' | 'evaluating' | 'feedback' | 'completed'>('idle');
  const [finalReport, setFinalReport] = useState<BackendFinalReport | null>(null);
  const [roleTitle, setRoleTitle] = useState('Engineer');

  useEffect(() => {
    async function initializeInterview() {
      const state = location.state as any;
      
      // If we have state from InterviewConfigPage, use it immediately
      if (state?.firstQuestion) {
        const firstBackendQuestion = state.firstQuestion;
        const initialQ: Question = {
          id: 'q_1',
          number: 1,
          title: firstBackendQuestion.topic,
          category: firstBackendQuestion.topic as any,
          prompt: firstBackendQuestion.question,
          expectedKeywords: firstBackendQuestion.expected_concepts || [],
          hints: [],
          timeLimitSeconds: 180,
        };
        setQuestions([initialQ]);
        setTotalQuestions(state.maxQuestions || 5);
        setRoleTitle(state.roleTitle || 'Engineer');
        setIsInitializing(false);
        return;
      }

      // Otherwise, we are recovering state via the backend
      if (!sessionId) {
        setErrorMsg('No interview ID provided.');
        setIsInitializing(false);
        return;
      }

      try {
        const interviewData = await apiService.getInterview(sessionId);
        
        if (interviewData.status === 'completed') {
          // If the interview is already completed, they shouldn't be here.
          // They should be on the report page. Navigate them there!
          navigate(`/report/${sessionId}`, { replace: true });
          return;
        }

        const restoredQ: Question = {
          id: `q_restored_${Date.now()}`,
          number: interviewData.question_number || 1,
          title: interviewData.question.topic,
          category: interviewData.question.topic as any,
          prompt: interviewData.question.question,
          expectedKeywords: interviewData.question.expected_concepts || [],
          hints: [],
          timeLimitSeconds: 180,
        };
        setQuestions([restoredQ]);
        setTotalQuestions(interviewData.max_questions || 5);
        setRoleTitle(interviewData.role || 'Engineer');
        setCurrentQuestionIndex(0); // We only hold the current active question in state when recovering
        setIsInitializing(false);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to restore interview state.');
        setIsInitializing(false);
      }
    }
    initializeInterview();
  }, [sessionId, location.state, navigate]);

  const currentQuestion = questions[currentQuestionIndex];



  useEffect(() => {
    // Timer countdown
    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [currentQuestionIndex]);

  const handleSubmitAnswer = async (autoSubmit: boolean = false) => {
    if (!autoSubmit && !userAnswerText.trim()) {
      addToast('warning', 'Answer empty', 'Please type or speak your answer before submitting.');
      return;
    }
    if (submissionPhase !== 'idle') return;

    setSubmissionPhase('submitting');
    
    // Fake transition to 'evaluating' after a brief delay for UI feedback
    const evaluationTimer = setTimeout(() => {
      setSubmissionPhase('evaluating');
    }, 1500);

    try {
      const result = await apiService.submitAnswer(
        sessionId!,
        { answer: autoSubmit ? (userAnswerText.trim() || 'No answer provided (Time out)') : userAnswerText }
      );
      clearTimeout(evaluationTimer);

      if (result.status === 'completed') {
        setFinalReport(result.final_report ?? null);
        setSubmissionPhase('completed');
      } else if (result.status === 'waiting_for_answer' && result.question) {
        // Render the backend-generated next question
        const nextQ: Question = {
          id: `q_${Date.now()}`,
          number: result.question_number || (currentQuestionIndex + 2),
          title: result.question.topic,
          category: result.question.topic as any,
          prompt: result.question.question,
          expectedKeywords: result.question.expected_concepts || [],
          hints: [],
          timeLimitSeconds: 180,
        };

        setQuestions((prev) => [...prev, nextQ]);
        setCurrentQuestionIndex((prev) => prev + 1);
        setUserAnswerText('');
        setShowHint(false);
        setTimeLeftSeconds(180);
        setSubmissionPhase('idle');
      } else {
        // Unexpected format
        throw new Error("Unexpected response format from backend.");
      }
    } catch (err: any) {
      clearTimeout(evaluationTimer);
      setSubmissionPhase('idle');
      addToast('error', 'API error', err.message || 'Could not evaluate answer. Please retry.');
    }
  };

  useEffect(() => {
    if (timeLeftSeconds === 0 && submissionPhase === 'idle') {
      handleSubmitAnswer(true);
    }
  }, [timeLeftSeconds, submissionPhase]);



  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (isInitializing) {
    return (
      <PageWrapper className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center text-center space-y-4">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Restoring your interview session...
          </p>
        </div>
      </PageWrapper>
    );
  }

  if (errorMsg) {
    return (
      <PageWrapper className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center text-center space-y-4 max-w-sm">
          <AlertTriangle className="w-10 h-10 text-red-500" />
          <p className="text-base font-bold text-slate-800 dark:text-white">
            Could not restore interview
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {errorMsg}
          </p>
          <Button variant="primary" onClick={() => navigate('/dashboard')}>
            Return to Dashboard
          </Button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="space-y-6 max-w-4xl">
      {/* 7. Interactive Interview Header (Matching Exact Prompt Wireframe) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-surface-dark-card border border-slate-200 dark:border-border-dark shadow-sm">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
            {roleTitle} Interview
          </h2>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-700 dark:text-brand-300 font-semibold border border-brand-500/20">
            {currentQuestion?.category || 'General'}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-surface-dark-elevated text-xs font-bold text-slate-700 dark:text-slate-300">
            <Clock className="w-3.5 h-3.5 text-brand-500" />
            <span>{formatTimer(timeLeftSeconds)}</span>
          </div>

          <div className="text-sm font-black text-slate-900 dark:text-white px-3 py-1 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
            Question {currentQuestionIndex + 1}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
        <motion.div
          animate={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
          transition={{ duration: 0.3 }}
          className="h-full bg-gradient-to-r from-brand-500 to-brand-500 rounded-full"
        />
      </div>

      {/* QUESTION BOX */}
      <Card className="p-6 space-y-4 border-l-4 border-l-brand-500">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold uppercase tracking-wider text-slate-400">
            Question #{currentQuestionIndex + 1}
          </span>
          <button
            onClick={() => setShowHint(!showHint)}
            className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            {showHint ? 'Hide Hint' : 'Show Topic Hint'}
          </button>
        </div>

        <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-relaxed">
          {currentQuestion.prompt}
        </h3>

        {showHint && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200"
          >
            💡 <strong className="font-semibold">Hint:</strong>{' '}
            {currentQuestion.hints?.length ? currentQuestion.hints[0] : (currentQuestion.expectedKeywords?.join(', ') || 'No hints available.')}
          </motion.div>
        )}
      </Card>

      {/* YOUR ANSWER TEXTBOX */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Your Answer
          </label>
          <Button
            variant="ghost"
            size="sm"
            disabled
            title="Voice input coming soon"
            className="text-xs text-slate-400 cursor-not-allowed opacity-60"
          >
            <Mic className="w-3.5 h-3.5 mr-1" /> Voice (Coming Soon)
          </Button>
        </div>

        <textarea
          rows={7}
          value={userAnswerText}
          onChange={(e) => setUserAnswerText(e.target.value)}
          disabled={submissionPhase !== 'idle'}
          placeholder="Type your technical answer here in detail... Include core concepts, architectural reasoning, and trade-offs."
          className="w-full p-4 text-sm rounded-xl bg-slate-50 dark:bg-surface-dark-elevated border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 resize-y font-sans leading-relaxed"
        />

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-400">
            {userAnswerText.trim().split(/\s+/).filter(Boolean).length} words typed
          </span>

          <Button
            size="md"
            onClick={() => handleSubmitAnswer(false)}
            disabled={submissionPhase !== 'idle' || !userAnswerText.trim()}
            className="shadow-lg shadow-brand-500/25 px-6"
          >
            {submissionPhase === 'submitting' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...
              </>
            ) : submissionPhase === 'evaluating' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin text-brand-400" /> AI Evaluating...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" /> Submit Answer
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* EVALUATION / SUBMISSION KINETIC TEXT LOADER */}
      <AnimatePresence>
        {(submissionPhase === 'submitting' || submissionPhase === 'evaluating') && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-8 rounded-3xl bg-white/95 dark:bg-surface-dark-card/95 backdrop-blur-md border border-brand-500/30 shadow-2xl flex flex-col items-center justify-center text-center my-4"
          >
            <TextSliceLoader
              text={submissionPhase === 'submitting' ? 'SUBMITTING' : 'EVALUATING'}
              size="md"
              subtext={
                submissionPhase === 'submitting'
                  ? 'Transmitting answer payload to FastAPI backend & LangGraph node...'
                  : 'Gemini AI is analyzing technical depth, correctness & missing concepts...'
              }
            />
          </motion.div>
        )}
      </AnimatePresence>



      {/* 10. INTERVIEW COMPLETION MODAL */}
      <AnimatePresence>
        {submissionPhase === 'completed' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <Card className="w-full max-w-md p-8 text-center space-y-6 shadow-2xl glass-panel-light dark:glass-panel-dark border border-slate-200 dark:border-border-dark">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  Interview Completed ✓
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Interview complete! AI MOCKORA has completed your adaptive evaluation.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-surface-dark-elevated border border-slate-200/80 dark:border-white/5 flex items-center justify-between text-xs font-semibold">
                <span>Evaluated Track:</span>
                <span className="font-bold text-brand-600 dark:text-brand-400">{roleTitle}</span>
              </div>

              <Button
                size="lg"
                onClick={() => navigate(`/report/${sessionId}`, { state: { finalReport } })}
                className="w-full shadow-xl shadow-brand-500/30"
              >
                <Trophy className="w-4 h-4 mr-2" />
                View Performance Report
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
};
