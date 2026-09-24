import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Sparkles, Sliders, PlayCircle, ArrowLeft, UserCheck } from 'lucide-react';
import { apiService } from '../services/apiService';
import type { Role, AIPersonaType, RoleDifficulty } from '../types';
import { useToast } from '../context/ToastContext';

export const InterviewConfigPage: React.FC = () => {
  const { roleId } = useParams<{ roleId: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [role, setRole] = useState<Role | null>(null);
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [difficulty, setDifficulty] = useState<RoleDifficulty>('Senior');
  const [aiPersona, setAiPersona] = useState<AIPersonaType>('Deep-Dive Technical');
  const [topicFocus, setTopicFocus] = useState<string[]>([
    'React Concurrent Mode',
    'System Architecture',
    'Core Web Vitals',
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (roleId) {
      apiService.getRoleById(roleId).then((data) => {
        if (data) {
          setRole(data);
          setDifficulty(data.difficulty);
        }
      });
    }
  }, [roleId]);

  const toggleTopic = (topic: string) => {
    setTopicFocus((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const handleStartInterview = async () => {
    setLoading(true);
    try {
      const { sessionId } = await apiService.createInterviewSession({
        roleId: roleId || 'role_fe_arch',
        roleTitle: role?.title || 'Senior Engineer',
        questionCount,
        durationMinutes,
        difficulty,
        aiPersona,
        topicFocus,
        includeSystemDesign: true,
        includeLiveCodingSim: true,
      });

      addToast('success', 'Interview Session Initialized!', `Persona: ${aiPersona}`);
      setLoading(false);
      navigate(`/interview/room/${sessionId}`);
    } catch (err) {
      setLoading(false);
      addToast('error', 'Failed to launch session');
    }
  };

  const personaDescriptions: Record<AIPersonaType, string> = {
    'Supportive': 'Provides subtle hints when stuck, empathetic tone, ideal for warmups.',
    'Strict': 'Zero tolerance for vague answers, demands precise terminology and time complexity.',
    'Deep-Dive Technical': 'Probes follow-up edge cases, fiber internals, and architectural trade-offs.',
    'FAANG Recruiter': 'High-pressure rapid-fire behavioral & system scalability evaluation.',
  };

  return (
    <PageWrapper className="max-w-4xl space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/roles')}
          className="inline-flex items-center text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Role Library
        </button>
        <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
          Session Customization
        </span>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          Configure Interview: {role?.title || 'Senior Engineering Track'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Customize interviewer persona, duration, question count, and topic focus.
        </p>
      </div>

      {/* CONFIGURATION FORM */}
      <div className="space-y-6">
        {/* Question Count & Time Slider */}
        <Card className="p-6 space-y-6">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-brand-500" />
            Session Parameters
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                Difficulty Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Easy', 'Medium', 'Hard'] as const).map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setDifficulty(diff as any)}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                      difficulty === diff || (difficulty === 'Senior' && diff === 'Hard') || (difficulty === 'Mid-Level' && diff === 'Medium')
                        ? 'bg-cyan-600 text-white border-cyan-600 shadow-md shadow-cyan-500/20'
                        : 'bg-slate-50 dark:bg-surface-dark-elevated text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                Number of Questions
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[5, 10, 15].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setQuestionCount(count)}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                      questionCount === count
                        ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-500/20'
                        : 'bg-slate-50 dark:bg-surface-dark-elevated text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10'
                    }`}
                  >
                    {count} Questions
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                Session Duration ({durationMinutes} minutes)
              </label>
              <input
                type="range"
                min={15}
                max={45}
                step={5}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full accent-brand-600 cursor-pointer mt-2"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>15 mins (Express)</span>
                <span>30 mins (Standard)</span>
                <span>45 mins (Deep Dive)</span>
              </div>
            </div>
          </div>
        </Card>

        {/* AI Interviewer Persona Selector */}
        <Card className="p-6 space-y-4">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-indigo-500" />
            AI Interviewer Persona
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(['Supportive', 'Strict', 'Deep-Dive Technical', 'FAANG Recruiter'] as AIPersonaType[]).map(
              (persona) => (
                <button
                  key={persona}
                  type="button"
                  onClick={() => setAiPersona(persona)}
                  className={`p-4 rounded-xl text-left border transition-all ${
                    aiPersona === persona
                      ? 'bg-brand-50/80 dark:bg-brand-950/60 border-brand-500 text-slate-900 dark:text-white ring-1 ring-brand-500'
                      : 'bg-slate-50 dark:bg-surface-dark-elevated border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-xs">
                    <span>{persona}</span>
                    {aiPersona === persona && <Sparkles className="w-4 h-4 text-brand-500" />}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                    {personaDescriptions[persona]}
                  </p>
                </button>
              )
            )}
          </div>
        </Card>

        {/* Topic Focus Checkboxes (Matching Section 6) */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Evaluation Topics (Select all that apply)
            </h3>
            <span className="text-xs text-brand-600 dark:text-brand-400 font-semibold">
              {topicFocus.length} selected
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              'Python',
              'ML',
              'SQL',
              'Scikit-learn',
              'PyTorch',
              'FastAPI',
              'System Design',
              'Algorithms',
            ].map((topic) => {
              const isSelected = topicFocus.includes(topic);
              return (
                <button
                  key={topic}
                  type="button"
                  onClick={() => toggleTopic(topic)}
                  className={`text-xs font-semibold p-3 rounded-xl border flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-brand-50/80 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border-brand-500 shadow-sm'
                      : 'bg-slate-50 dark:bg-surface-dark-elevated text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10'
                  }`}
                >
                  <span>{topic}</span>
                  <span className={`text-xs ${isSelected ? 'text-brand-600 font-bold' : 'text-slate-400'}`}>
                    {isSelected ? '☑' : '☐'}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* START INTERVIEW BUTTON */}
        <Button onClick={handleStartInterview} isLoading={loading} size="lg" className="w-full py-4 shadow-xl shadow-brand-500/30 text-base font-bold">
          <PlayCircle className="w-5 h-5 mr-2" />
          Start Interview
        </Button>
      </div>
    </PageWrapper>
  );
};
