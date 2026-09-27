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
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(180);
  const [isInitializing, setIsInitializing] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Submission & evaluation states
  const [submissionPhase, setSubmissionPhase] = useState<
    'idle' | 'submitting' | 'evaluating' | 'feedback' | 'completed'
  >('idle');

  const [finalReport, setFinalReport] =
    useState<BackendFinalReport | null>(null);

  const [interviewerFeedback, setInterviewerFeedback] = useState('');
  const [pendingNextQuestion, setPendingNextQuestion] =
    useState<Question | null>(null);

  const [pendingCompleted, setPendingCompleted] = useState(false);
  const [roleTitle, setRoleTitle] = useState('Engineer');

  // ============================================================
  // INITIALIZE / RESTORE INTERVIEW
  // ============================================================

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
          expectedKeywords: [],
          hints: [],
          timeLimitSeconds: 180,
        };

        setQuestions([initialQ]);
        setTotalQuestions(state.maxQuestions || 5);
        setRoleTitle(state.roleTitle || 'Engineer');
        setIsInitializing(false);
        return;
      }

      // Otherwise, recover state via backend
      if (!sessionId) {
        setErrorMsg('No interview ID provided.');
        setIsInitializing(false);
        return;
      }

      try {
        const interviewData = await apiService.getInterview(sessionId);

        if (interviewData.status === 'completed') {
          // Completed interviews should go directly to report
          navigate(`/report/${sessionId}`, { replace: true });
          return;
        }

        const restoredQ: Question = {
          id: `q_restored_${Date.now()}`,
          number: interviewData.question_number || 1,
          title: interviewData.question.topic,
          category: interviewData.question.topic as any,
          prompt: interviewData.question.question,
          expectedKeywords: [],
          hints: [],
          timeLimitSeconds: 180,
        };

        setQuestions([restoredQ]);
        setTotalQuestions(interviewData.max_questions || 5);
        setRoleTitle(interviewData.role || 'Engineer');
        setCurrentQuestionIndex(0);
        setIsInitializing(false);
      } catch (err: any) {
        setErrorMsg(
          err.message || 'Failed to restore interview state.'
        );
        setIsInitializing(false);
      }
    }

    initializeInterview();
  }, [sessionId, location.state, navigate]);

  const currentQuestion = questions[currentQuestionIndex];

  // ============================================================
  // TIMER
  // ============================================================

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [currentQuestionIndex]);

  // ============================================================
  // SUBMIT ANSWER
  // ============================================================

  const handleSubmitAnswer = async (autoSubmit: boolean = false) => {
    if (!autoSubmit && !userAnswerText.trim()) {
      addToast(
        'warning',
        'Answer empty',
        'Please type or speak your answer before submitting.'
      );
      return;
    }

    if (submissionPhase !== 'idle') return;

    setSubmissionPhase('submitting');

    // Small UI transition before evaluation state
    const evaluationTimer = setTimeout(() => {
      setSubmissionPhase('evaluating');
    }, 1500);

    try {
      const result = await apiService.submitAnswer(sessionId!, {
        answer: autoSubmit
          ? userAnswerText.trim() || 'No answer provided (Time out)'
          : userAnswerText,
      });

      clearTimeout(evaluationTimer);

      // --------------------------------------------------------
      // INTERVIEW COMPLETED
      // --------------------------------------------------------

      if (result.status === 'completed') {
        setInterviewerFeedback(result.interviewer_feedback || '');
        setFinalReport(result.final_report ?? null);
        setPendingNextQuestion(null);
        setPendingCompleted(true);

        setSubmissionPhase(
          result.interviewer_feedback ? 'feedback' : 'completed'
        );
      }

      // --------------------------------------------------------
      // NEXT QUESTION AVAILABLE
      // --------------------------------------------------------

      else if (
        result.status === 'waiting_for_answer' &&
        result.question
      ) {
        const nextQ: Question = {
          id: `q_${Date.now()}`,
          number:
            result.question_number ||
            currentQuestionIndex + 2,
          title: result.question.topic,
          category: result.question.topic as any,
          prompt: result.question.question,
          expectedKeywords: [],
          hints: [],
          timeLimitSeconds: 180,
        };

        setInterviewerFeedback(
          result.interviewer_feedback || ''
        );

        setPendingNextQuestion(nextQ);
        setPendingCompleted(false);
        setSubmissionPhase('feedback');
      }

      // --------------------------------------------------------
      // UNEXPECTED RESPONSE
      // --------------------------------------------------------

      else {
        throw new Error(
          'Unexpected response format from backend.'
        );
      }
    } catch (err: any) {
      clearTimeout(evaluationTimer);
      setSubmissionPhase('idle');

      addToast(
        'error',
        'API error',
        err.message ||
        'Could not evaluate answer. Please retry.'
      );
    }
  };

  // ============================================================
  // CONTINUE TO NEXT QUESTION
  // ============================================================

  const handleContinueFromFeedback = () => {
    if (pendingCompleted) {
      setSubmissionPhase('completed');
      setInterviewerFeedback('');
      return;
    }

    if (pendingNextQuestion) {
      setQuestions((prev) => [
        ...prev,
        pendingNextQuestion,
      ]);

      setCurrentQuestionIndex((prev) => prev + 1);

      setPendingNextQuestion(null);
    }

    setUserAnswerText('');
    setTimeLeftSeconds(180);
    setInterviewerFeedback('');
    setSubmissionPhase('idle');

    // Return to top for the new question
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  // ============================================================
  // AUTO SUBMIT ON TIMEOUT
  // ============================================================

  useEffect(() => {
    if (
      timeLeftSeconds === 0 &&
      submissionPhase === 'idle'
    ) {
      handleSubmitAnswer(true);
    }
  }, [timeLeftSeconds, submissionPhase]);

  // ============================================================
  // TIMER FORMAT
  // ============================================================

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;

    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // ============================================================
  // INITIALIZATION SCREEN
  // ============================================================

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

  // ============================================================
  // ERROR SCREEN
  // ============================================================

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

          <Button
            variant="primary"
            onClick={() => navigate('/dashboard')}
          >
            Return to Dashboard
          </Button>
        </div>
      </PageWrapper>
    );
  }

  // ============================================================
  // MAIN INTERVIEW ROOM
  // ============================================================

  return (
    <PageWrapper className="h-[calc(100vh-74px)] max-w-none overflow-hidden px-4 py-3 lg:px-6 lg:py-4">
      <div className="h-full flex flex-col gap-3 min-h-0">

        {/* ======================================================
            INTERVIEW HEADER
        ======================================================= */}

        <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white dark:bg-surface-dark-card border border-slate-200 dark:border-border-dark shadow-sm">

          <div className="flex items-center gap-3 min-w-0">

            <span className="w-2.5 h-2.5 shrink-0 rounded-full bg-emerald-500 animate-pulse" />

            <h2 className="font-black text-sm sm:text-base text-slate-900 dark:text-white truncate">
              {roleTitle} Interview
            </h2>

            <span className="hidden sm:inline-flex text-xs px-2.5 py-1 rounded-lg bg-brand-500/10 text-brand-700 dark:text-brand-300 font-semibold border border-brand-500/20 truncate max-w-[180px]">
              {currentQuestion?.category || 'General'}
            </span>

          </div>

          <div className="flex items-center gap-2 shrink-0">

            {/* Timer */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-surface-dark-elevated text-xs font-bold text-slate-700 dark:text-slate-300">
              <Clock className="w-3.5 h-3.5 text-brand-500" />
              <span>
                {formatTimer(timeLeftSeconds)}
              </span>
            </div>

            {/* Question counter */}
            <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white px-2.5 py-1 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
              Q {currentQuestionIndex + 1}/{totalQuestions}
            </div>

          </div>

        </div>

        {/* ======================================================
            PROGRESS BAR
        ======================================================= */}

        <div className="shrink-0 w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">

          <motion.div
            animate={{
              width: `${((currentQuestionIndex + 1) /
                totalQuestions) *
                100
                }%`,
            }}
            transition={{ duration: 0.3 }}
            className="h-full bg-brand-500 rounded-full"
          />

        </div>

        {/* ======================================================
            MAIN INTERVIEW WORKSPACE

            Desktop:
            Question | Answer

            Mobile:
            Question
            Answer
        ======================================================= */}

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[0.95fr_1.25fr] gap-3">

          {/* ====================================================
              QUESTION PANEL
          ===================================================== */}

          <Card className="min-h-0 p-5 pt-8 border-l-4 border-l-brand-500 flex flex-col justify-start overflow-hidden">

            <div className="mb-4 shrink-0">

              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Question #{currentQuestionIndex + 1}
              </span>

            </div>

            <h3 className="text-base xl:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
              {currentQuestion?.prompt}
            </h3>

            <div className="mt-6 flex items-center gap-2 shrink-0">

              <span className="text-xs px-2.5 py-1 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold">
                {currentQuestion?.category ||
                  'Technical'}
              </span>

              <span className="text-xs text-slate-400">
                Technical Interview
              </span>

            </div>

          </Card>

          {/* ====================================================
              RIGHT WORKSPACE
          ===================================================== */}

          <div className="min-h-0 flex flex-col gap-3">

            {/* ==================================================
                ANSWER PANEL
            =================================================== */}

            <Card className="p-4 flex-1 min-h-0 flex flex-col">

              <div className="flex items-center justify-between shrink-0 mb-3">

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
                  <Mic className="w-3.5 h-3.5 mr-1" />
                  Voice (Coming Soon)
                </Button>

              </div>

              {/* Answer input */}
              <textarea
                value={userAnswerText}
                onChange={(e) =>
                  setUserAnswerText(e.target.value)
                }
                disabled={submissionPhase !== 'idle'}
                placeholder="Type your technical answer here..."
                className="flex-1 min-h-[150px] w-full p-4 text-sm rounded-xl bg-slate-50 dark:bg-surface-dark-elevated border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50 resize-none font-sans leading-relaxed"
              />

              {/* Answer controls */}
              <div className="flex items-center justify-between pt-3 shrink-0">

                <span className="text-xs text-slate-400">
                  {
                    userAnswerText
                      .trim()
                      .split(/\s+/)
                      .filter(Boolean).length
                  }{' '}
                  words
                </span>

                <Button
                  size="md"
                  onClick={() =>
                    handleSubmitAnswer(false)
                  }
                  disabled={
                    submissionPhase !== 'idle' ||
                    !userAnswerText.trim()
                  }
                  className="shadow-lg shadow-brand-500/25 px-5"
                >
                  {submissionPhase ===
                    'submitting' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : submissionPhase ===
                    'evaluating' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin text-brand-400" />
                      AI Evaluating...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Answer
                    </>
                  )}
                </Button>

              </div>

            </Card>

            {/* ==================================================
                AI EVALUATING STATE
            =================================================== */}

            <AnimatePresence>

              {(submissionPhase ===
                'submitting' ||
                submissionPhase ===
                'evaluating') && (

                  <motion.div
                    initial={{
                      opacity: 0,
                      y: 8,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    exit={{
                      opacity: 0,
                      y: -8,
                    }}
                    className="shrink-0 p-3 rounded-xl bg-white dark:bg-surface-dark-card border border-brand-500/30 shadow-sm flex items-center justify-center text-center"
                  >

                    <TextSliceLoader
                      text={
                        submissionPhase ===
                          'submitting'
                          ? 'SUBMITTING'
                          : 'EVALUATING'
                      }
                      size="sm"
                      subtext={
                        submissionPhase ===
                          'submitting'
                          ? 'Processing your answer...'
                          : 'AI is analyzing technical depth and correctness...'
                      }
                    />

                  </motion.div>

                )}

            </AnimatePresence>

            {/* ==================================================
                INTERVIEWER FEEDBACK
            =================================================== */}

            <AnimatePresence>

              {submissionPhase ===
                'feedback' && (

                  <motion.div
                    initial={{
                      opacity: 0,
                      y: 8,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    exit={{
                      opacity: 0,
                      y: -8,
                    }}
                    className="shrink-0"
                  >

                    <Card className="p-4 border-l-4 border-l-emerald-500">

                      <div className="flex items-center gap-2 mb-2">

                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />

                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Interviewer Feedback
                        </p>

                      </div>

                      <div className="flex items-start justify-between gap-4">

                        <p className="flex-1 min-w-0 text-sm leading-6 text-slate-800 dark:text-slate-100 whitespace-normal break-words">
                          {interviewerFeedback ||
                            'Thanks. Let us continue.'}
                        </p>

                        <Button
                          size="md"
                          onClick={
                            handleContinueFromFeedback
                          }
                          className="shrink-0"
                        >
                          {pendingCompleted
                            ? 'See Results'
                            : 'Next Question'}
                        </Button>

                      </div>

                    </Card>

                  </motion.div>

                )}

            </AnimatePresence>

          </div>

        </div>

        {/* ======================================================
            COMPLETION MODAL
        ======================================================= */}

        <AnimatePresence>

          {submissionPhase ===
            'completed' && (

              <motion.div
                initial={{
                  opacity: 0,
                  scale: 0.95,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                }}
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

                    <span>
                      Evaluated Track:
                    </span>

                    <span className="font-bold text-brand-600 dark:text-brand-400">
                      {roleTitle}
                    </span>

                  </div>

                  <Button
                    size="lg"
                    onClick={() =>
                      navigate(
                        `/report/${sessionId}`,
                        {
                          state: {
                            finalReport,
                          },
                        }
                      )
                    }
                    className="w-full shadow-xl shadow-brand-500/30"
                  >
                    <Trophy className="w-4 h-4 mr-2" />
                    View Performance Report
                  </Button>

                </Card>

              </motion.div>

            )}

        </AnimatePresence>

      </div>
    </PageWrapper>
  );
};