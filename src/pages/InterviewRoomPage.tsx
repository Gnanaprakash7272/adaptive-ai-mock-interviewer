import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  ArrowRight,
  Loader2,
  Trophy,
} from 'lucide-react';
import { mockQuestions } from '../mock/mockData';
import type { Question } from '../types';
import { apiService, type AnswerSubmissionResult } from '../services/apiService';
import { useToast } from '../context/ToastContext';
import { TextSliceLoader } from '../components/common/TextSliceLoader';

export const InterviewRoomPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [questions, setQuestions] = useState<Question[]>(mockQuestions);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswerText, setUserAnswerText] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(180);

  // Submission & evaluation states
  const [submissionPhase, setSubmissionPhase] = useState<'idle' | 'submitting' | 'evaluating' | 'feedback' | 'completed'>('idle');
  const [currentFeedback, setCurrentFeedback] = useState<AnswerSubmissionResult | null>(null);

  const currentQuestion = questions[currentQuestionIndex] || questions[0];
  const roleTitle = 'ML Engineer';

  // Sample pre-filled speech responses for convenience
  const sampleAnswers = [
    'Supervised learning relies on labeled training datasets where input features (X) map to known ground-truth targets (y). The algorithm optimizes explicit loss functions like Mean Squared Error or Cross-Entropy. Unsupervised learning operates on unlabeled data to discover underlying manifold structures, clusters, or lower-dimensional representations without target supervision, such as K-Means or PCA.',
    'The bias-variance tradeoff represents the tension between model underfitting and overfitting. High bias stems from overly simplistic assumptions, while high variance comes from sensitivity to training noise. We mitigate this using k-fold cross-validation and regularization: L1 (Lasso) enforces weight sparsity, and L2 (Ridge) penalizes large weights to smooth the hypothesis function.',
    'FastAPI leverages Starlette and the Python asyncio event loop. Normal "def" route functions run in an external threadpool, while "async def" functions execute cooperatively on the main event loop. The Depends() dependency injection system manages database connection pool checkouts with auto-cleanup without blocking concurrent incoming I/O.',
    'SQL B-Tree indexes maintain sorted balanced tree structures where leaf nodes are sequentially linked, making them ideal for range scans (BETWEEN, >, <) and order-by operations with O(log N) lookup. Hash indexes offer O(1) point lookups but cannot support range queries.',
    'To build a real-time vector search service with sub-50ms latency, I would employ an approximate nearest neighbors (ANN) index like HNSW (Hierarchical Navigable Small World) combined with product quantization (IVF-PQ) to compress vector dimensions in memory.',
  ];

  useEffect(() => {
    // Timer countdown
    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [currentQuestionIndex]);

  const handleSimulateVoice = () => {
    const text = sampleAnswers[currentQuestionIndex % sampleAnswers.length];
    setUserAnswerText('');
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setUserAnswerText((prev) => prev + text.slice(0, i + 1));
        i += 3;
      } else {
        clearInterval(interval);
      }
    }, 15);
  };

  const handleSubmitAnswer = async () => {
    if (!userAnswerText.trim()) {
      addToast('warning', 'Answer empty', 'Please type or speak your answer before submitting.');
      return;
    }

    setSubmissionPhase('submitting');

    // Simulate / execute submission steps:
    // Submitting... -> Evaluating...
    await new Promise((r) => setTimeout(r, 600));
    setSubmissionPhase('evaluating');

    try {
      const result = await apiService.submitAnswer(
        sessionId || 'sess_ml_991',
        currentQuestion.id,
        userAnswerText,
        currentQuestionIndex,
        questions.length
      );

      setSubmissionPhase('feedback');
      setCurrentFeedback(result);
    } catch {
      setSubmissionPhase('idle');
      addToast('error', 'API error', 'Could not evaluate answer. Please retry.');
    }
  };

  const handleProceedNext = () => {
    if (!currentFeedback) return;

    if (currentFeedback.is_finished || currentQuestionIndex >= questions.length - 1) {
      setSubmissionPhase('completed');
    } else {
      if (currentFeedback.next_question) {
        // If adaptive backend sent specific next question
        setQuestions((prev) => {
          const next = [...prev];
          next[currentQuestionIndex + 1] = currentFeedback.next_question!;
          return next;
        });
      }
      setCurrentQuestionIndex((prev) => prev + 1);
      setUserAnswerText('');
      setShowHint(false);
      setTimeLeftSeconds(180);
      setSubmissionPhase('idle');
      setCurrentFeedback(null);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <PageWrapper className="space-y-6 max-w-4xl">
      {/* 7. Interactive Interview Header (Matching Exact Prompt Wireframe) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-surface-dark-card border border-slate-200 dark:border-border-dark shadow-sm">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
            {roleTitle} Interview
          </h2>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-semibold border border-cyan-500/20">
            {currentQuestion.category}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-surface-dark-elevated text-xs font-bold text-slate-700 dark:text-slate-300">
            <Clock className="w-3.5 h-3.5 text-brand-500" />
            <span>{formatTimer(timeLeftSeconds)}</span>
          </div>

          <div className="text-sm font-black text-slate-900 dark:text-white px-3 py-1 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
            {currentQuestionIndex + 1} / {questions.length}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
        <motion.div
          animate={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
          transition={{ duration: 0.3 }}
          className="h-full bg-gradient-to-r from-cyan-500 to-brand-500 rounded-full"
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

        {showHint && currentQuestion.hints && currentQuestion.hints[0] && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200"
          >
            💡 <strong className="font-semibold">Hint:</strong> {currentQuestion.hints[0]}
          </motion.div>
        )}
      </Card>

      {/* YOUR ANSWER TEXTBOX */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Your Answer
          </label>
          <Button variant="ghost" size="sm" onClick={handleSimulateVoice} className="text-xs text-brand-600">
            <Mic className="w-3.5 h-3.5 mr-1" /> Speech Auto-Dictate
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
            onClick={handleSubmitAnswer}
            disabled={submissionPhase !== 'idle' || !userAnswerText.trim()}
            className="shadow-lg shadow-brand-500/25 px-6"
          >
            {submissionPhase === 'submitting' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...
              </>
            ) : submissionPhase === 'evaluating' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin text-cyan-400" /> AI Evaluating...
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

      {/* 8. EVALUATION FEEDBACK MODAL / DRAWER */}
      <AnimatePresence>
        {submissionPhase === 'feedback' && currentFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="p-6 rounded-2xl bg-gradient-to-br from-white via-cyan-50/30 to-brand-50/20 dark:from-surface-dark-card dark:via-surface-dark-elevated dark:to-surface-dark border-2 border-brand-500/30 shadow-2xl space-y-5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                  ✓
                </div>
                <h4 className="font-black text-base text-slate-900 dark:text-white">
                  Evaluation Feedback
                </h4>
              </div>

              {/* Score Display (8/10) */}
              <div className="px-3.5 py-1.5 rounded-xl bg-brand-600 text-white font-black text-sm shadow-md shadow-brand-500/30">
                Score: {currentFeedback.scoreOutOf10} / 10
              </div>
            </div>

            {/* Score Breakdown Pills */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-2.5 rounded-xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Correctness</span>
                <span className="text-base font-black text-slate-900 dark:text-white">{currentFeedback.correctness} / 10</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Completeness</span>
                <span className="text-base font-black text-slate-900 dark:text-white">{currentFeedback.completeness} / 10</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Technical Depth</span>
                <span className="text-base font-black text-slate-900 dark:text-white">{currentFeedback.technicalDepth} / 10</span>
              </div>
            </div>

            {/* Missing Concepts */}
            {currentFeedback.missingConcepts && currentFeedback.missingConcepts.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-300 block flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Missing Concepts to Review:
                </span>
                <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-0.5 list-disc list-inside">
                  {currentFeedback.missingConcepts.map((concept, idx) => (
                    <li key={idx}>{concept}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Constructive AI Feedback */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-surface-dark-elevated border border-slate-200/80 dark:border-white/5 space-y-1">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">AI Evaluator Commentary:</span>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {currentFeedback.feedback}
              </p>
            </div>

            {/* Next Action Button */}
            <div className="flex justify-end pt-2">
              <Button size="md" onClick={handleProceedNext} className="shadow-lg shadow-brand-500/20">
                {currentQuestionIndex >= questions.length - 1 ? (
                  <>Finish Interview & View Report <ArrowRight className="w-4 h-4 ml-1.5" /></>
                ) : (
                  <>Continue to Next Question <ArrowRight className="w-4 h-4 ml-1.5" /></>
                )}
              </Button>
            </div>
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
                  You answered all {questions.length} questions in this technical evaluation session.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-surface-dark-elevated border border-slate-200/80 dark:border-white/5 flex items-center justify-between text-xs font-semibold">
                <span>Evaluated Track:</span>
                <span className="font-bold text-brand-600 dark:text-brand-400">{roleTitle}</span>
              </div>

              <Button
                size="lg"
                onClick={() => navigate(`/report/${sessionId || 'sess_ml_991'}`)}
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
