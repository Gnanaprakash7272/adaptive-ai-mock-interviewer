import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Brain, ArrowLeft, ArrowRight, CheckCircle2, Code2, Users } from 'lucide-react';
import { apiService } from '../services/apiService';
import type { Role, CandidateProfile } from '../types';
import { useToast } from '../context/ToastContext';

const BEHAVIORAL_TOPICS = [
  'Conflict Resolution & Team Collaboration',
  'Leadership & Ownership',
  'Handling Deadlines, Pressure & Setbacks',
  'Cross-functional Communication',
  'Technical Decision-Making & Trade-offs',
  'Adaptability & Continuous Learning',
  'Stakeholder Management & Negotiation',
];

export const InterviewConfigPage: React.FC = () => {
  const { roleId } = useParams<{ roleId: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [role, setRole] = useState<Role | null>(null);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const [roundType, setRoundType] = useState<'technical' | 'behavioral'>('technical');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('Senior');
  const [maxQuestions, setMaxQuestions] = useState<number>(10);

  useEffect(() => {
    if (roleId) {
      apiService.getRoleById(roleId).then((data) => {
        if (data) {
          setRole(data);
          // Auto-select difficulty based on role if available
          if (data.difficulty) {
            setSelectedDifficulty(data.difficulty);
          }
        }
      });
    }

    // Fetch candidate profile to get topics for the "Interview Focus" section
    apiService.getCandidateProfile()
      .then((data) => {
        if (data) setProfile(data);
      })
      .catch((err: any) => {
        if (err.status === 404) {
          navigate('/resume/upload', { replace: true });
        } else {
          console.error("Failed to fetch profile", err);
        }
      });
  }, [roleId, navigate]);

  const handleStartInterview = async () => {
    setLoading(true);
    try {
      const response = await apiService.startInterview({
        role: role?.title || 'Senior Engineer',
        role_id: role?.id,
        topic: selectedTopic || undefined,
        difficulty: selectedDifficulty || undefined,
        round_type: roundType,
        max_questions: maxQuestions, 
      } as any);

      addToast(
        'success',
        `${roundType === 'behavioral' ? 'HR / Behavioral' : 'Technical'} Session Initialized!`,
        'First question ready.'
      );
      setLoading(false);
      navigate(`/interview/room/${response.interview_id}`, { 
        state: { 
          firstQuestion: response.question, 
          maxQuestions: response.max_questions,
          roleTitle: role?.title || 'Senior Engineer',
          roundType: roundType
        } 
      });
    } catch (err: any) {
      setLoading(false);
      addToast('error', 'Failed to launch session', err.message);
    }
  };

  return (
    <PageWrapper className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 mb-8 mt-4">
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
          Your Interview is Ready
        </h1>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
          AI MOCKORA will dynamically adapt the interview based on your experience and answers.
        </p>
      </div>

      {/* Round Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => {
            setRoundType('technical');
            setSelectedTopic('');
          }}
          className={`flex items-start gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
            roundType === 'technical'
              ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20 shadow-md ring-2 ring-brand-500/20'
              : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-white dark:bg-surface-dark-card'
          }`}
        >
          <div className={`p-3 rounded-xl shrink-0 ${
            roundType === 'technical'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-white/5 text-slate-500'
          }`}>
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                Technical Round
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                Core
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              System architecture, coding fundamentals, frameworks, design patterns & algorithms.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setRoundType('behavioral');
            setSelectedTopic('');
          }}
          className={`flex items-start gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
            roundType === 'behavioral'
              ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 shadow-md ring-2 ring-purple-500/20'
              : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-white dark:bg-surface-dark-card'
          }`}
        >
          <div className={`p-3 rounded-xl shrink-0 ${
            roundType === 'behavioral'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-white/5 text-slate-500'
          }`}>
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                HR / Behavioral Round
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                STAR Method
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Leadership, conflict resolution, ownership, setbacks & behavioral maturity.
            </p>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Column */}
        <div className="space-y-6">
          {/* Selected Role Card */}
          {role && (
            <Card className="p-6 border-l-4 border-brand-500 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 block mb-1">
                Target Role
              </span>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {role.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {roundType === 'behavioral'
                  ? 'HR & Behavioral round tailored to your leadership and team experience.'
                  : 'Technical interview personalised to your candidate profile.'}
              </p>
            </Card>
          )}

          {/* Adaptive AI Card */}
          <Card className={`p-6 border shadow-sm relative overflow-hidden ${
            roundType === 'behavioral'
              ? 'bg-gradient-to-br from-purple-50/50 via-white to-purple-50/30 dark:from-surface-dark-card dark:via-surface-dark-elevated dark:to-surface-dark border-purple-200/50 dark:border-purple-900/30'
              : 'bg-gradient-to-br from-brand-50/50 via-white to-brand-50/30 dark:from-surface-dark-card dark:via-surface-dark-elevated dark:to-surface-dark border-brand-200/50 dark:border-brand-900/30'
          }`}>
            <div className="flex items-start gap-3 mb-4 relative z-10">
              <div className={`p-2.5 rounded-xl shrink-0 ${
                roundType === 'behavioral'
                  ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400'
                  : 'bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400'
              }`}>
                <Brain className="w-5 h-5" />
              </div>
              <div className="pt-0.5">
                 <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">
                   {roundType === 'behavioral' ? 'Behavioral AI Interview' : 'Adaptive AI Interview'}
                 </h3>
                 <span className="text-[10px] font-semibold text-slate-500 block mt-0.5">
                   Interview Mode: <strong className={roundType === 'behavioral' ? 'text-purple-600 dark:text-purple-400' : 'text-brand-600 dark:text-brand-400'}>
                     {roundType === 'behavioral' ? 'STAR Method Assessment' : 'Fully Adaptive'}
                   </strong>
                 </span>
              </div>
            </div>
            
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4 relative z-10">
              {roundType === 'behavioral'
                ? 'Questions target real situations from your background. The AI evaluates your Situation, Task, Action, and Result (STAR), assessing communication and ownership.'
                : 'Every question is selected based on your previous response. The interviewer can change difficulty, ask follow-up questions, explore weak areas, or move to a new topic automatically.'}
            </p>

            <ul className="space-y-2.5 relative z-10">
              {(roundType === 'behavioral'
                ? [
                    'STAR method structure',
                    'Leadership & initiative evaluation',
                    'Conflict resolution probing',
                    'Actionable behavioral feedback'
                  ]
                : [
                    'Personalized questions',
                    'Dynamic difficulty',
                    'Intelligent follow-ups',
                    'Real-time topic adaptation'
                  ]
              ).map((item, i) => (
                <li key={i} className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Interview Focus */}
          <Card className="p-6 shadow-sm">
            <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1">
              Interview Focus
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
              {roundType === 'behavioral'
                ? 'Select a key leadership or behavioral competency to focus on'
                : 'Based on your AI-generated candidate profile'}
            </p>

            {roundType === 'behavioral' ? (
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Select Core Behavioral Focus
                  </label>
                  <select
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900 text-sm focus:border-purple-500 outline-none text-slate-800 dark:text-slate-200"
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(e.target.value)}
                  >
                    <option value="">Auto (Comprehensive Behavioral & Leadership)</option>
                    {BEHAVIORAL_TOPICS.map((topic, i) => (
                      <option key={i} value={topic}>{topic}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : profile && profile.potential_interview_topics && profile.potential_interview_topics.length > 0 ? (
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Select Core Focus Topic
                  </label>
                  <select
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900 text-sm focus:border-brand-500 outline-none text-slate-800 dark:text-slate-200"
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(e.target.value)}
                  >
                    <option value="">Auto (Let AI decide based on role)</option>
                    {profile.potential_interview_topics.map((topic, i) => (
                      <option key={i} value={topic}>{topic}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-surface-dark-elevated text-xs text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-white/5 text-center mb-4">
                Your interview will begin with general role-relevant topics.
              </div>
            )}
            
            <div className="flex flex-col gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Interview Difficulty
                </label>
                <select
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900 text-sm focus:border-brand-500 outline-none text-slate-800 dark:text-slate-200"
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                >
                  <option value="Junior">Junior</option>
                  <option value="Mid-Level">Mid-Level</option>
                  <option value="Senior">Senior</option>
                  <option value="Staff/Architect">Staff / Architect</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Number of Questions
                </label>
                <select
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900 text-sm focus:border-brand-500 outline-none text-slate-800 dark:text-slate-200"
                  value={maxQuestions}
                  onChange={(e) => setMaxQuestions(parseInt(e.target.value) || 10)}
                >
                  <option value={5}>5 Questions (Short)</option>
                  <option value={10}>10 Questions (Standard)</option>
                  <option value={15}>15 Questions (Long)</option>
                </select>
              </div>
            </div>
          </Card>

          {/* How It Works */}
          <Card className="p-6 shadow-sm">
             <h3 className="font-bold text-base text-slate-900 dark:text-white mb-5">
              How It Works
             </h3>
             <div className="space-y-0 relative">
                <div className="flex items-start gap-3 relative z-10">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ring-4 ring-white dark:ring-surface-dark-card ${
                    roundType === 'behavioral'
                      ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400'
                      : 'bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400'
                  }`}>1</div>
                  <div className="text-xs pt-1 font-medium text-slate-700 dark:text-slate-300">
                    {roundType === 'behavioral' ? 'AI asks a STAR behavioral scenario' : 'AI asks a question'}
                  </div>
                </div>
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 ml-3 -mt-2 mb-1" />
                
                <div className="flex items-start gap-3 relative z-10">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 ring-4 ring-white dark:ring-surface-dark-card">2</div>
                  <div className="text-xs pt-1 font-medium text-slate-700 dark:text-slate-300">
                    {roundType === 'behavioral' ? 'You explain your action & outcome' : 'You answer'}
                  </div>
                </div>
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 ml-3 -mt-2 mb-1" />
                
                <div className="flex items-start gap-3 relative z-10">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ring-4 ring-white dark:ring-surface-dark-card ${
                    roundType === 'behavioral'
                      ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400'
                      : 'bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400'
                  }`}>3</div>
                  <div className="text-xs pt-1 font-medium text-slate-700 dark:text-slate-300 leading-snug">
                    {roundType === 'behavioral' ? 'AI evaluates STAR depth & adapts follow-ups' : 'AI evaluates and adapts the next question'}
                  </div>
                </div>
             </div>
          </Card>
        </div>

      </div>

      {/* CTA Section */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 mt-10 pt-8 border-t border-slate-200 dark:border-border-dark">
        <Button variant="ghost" onClick={() => navigate('/roles')} className="w-full sm:w-auto text-slate-500 hover:text-slate-900 dark:hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-2" /> Change Role
        </Button>
        <Button 
           size="lg" 
           onClick={handleStartInterview} 
           disabled={loading || !role} 
           className={`w-full sm:w-auto shadow-xl group px-8 ${
             roundType === 'behavioral'
               ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/25'
               : 'shadow-brand-500/25'
           }`}
        >
          {loading ? (
             <span className="flex items-center gap-2">
               <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
               Preparing {roundType === 'behavioral' ? 'Behavioral' : 'Adaptive'} AI...
             </span>
          ) : (
             <span className="flex items-center gap-2">
               Start {roundType === 'behavioral' ? 'HR / Behavioral Round' : 'Adaptive Interview'} <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
             </span>
          )}
        </Button>
      </div>
    </PageWrapper>
  );
};

