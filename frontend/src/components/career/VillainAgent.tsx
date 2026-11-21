import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  RefreshCw,
  Skull,
  Sparkles,
  Zap,
  ChevronDown,
  Layers,
  Trophy,
  GitBranch,
  Copy,
  CheckCheck,
  Flame,
  ArrowRight,
  FileText,
  FileUp,
  UserCheck,
  Bookmark,
  Check,
  ShieldAlert,
  Terminal,
  Cpu,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { coachApi, apiService } from '../../services/apiService';
import type { VillainChatMessage, VillainChatResponse, VillainProjectCard } from '../../types/coach';
import type { CandidateProfile } from '../../types';

const QUICK_STARTERS = [
  {
    label: '📄 Analyze Resume & Suggest Role',
    prompt: 'Analyze my uploaded resume and skills. What roles should I realistically target right now, what red flags are holding me back, and what aspirational role could I aim for?',
  },
  {
    label: '🎯 Target Role Gap: What should I do from my current status?',
    prompt: 'I want to land a high-paying Backend Systems Engineer role. Look at my current status and tell me what brutal gaps I need to fix and step-by-step what I must do.',
  },
  {
    label: '🛠️ Recommend Elite Projects with Modern Tools (Kafka, Redis, Docker)',
    prompt: 'What standout portfolio projects should I build using real industry tools (Kafka, Redis, Docker, PostgreSQL) that will actually get me interview calls?',
  },
  {
    label: '🤖 Real Agentic AI Engineering Project (No OpenAI Wrapper)',
    prompt: 'I want to build an AI engineering project that is NOT a basic OpenAI API wrapper. Give me production architecture with vector search and evals.',
  },
  {
    label: '🍕 Roast my MERN Food Delivery App',
    prompt: 'I built a food delivery app with React, Node.js and MongoDB. Can you roast it and level it up into production-scale architecture?',
  },
  {
    label: '📝 Roast my To-Do & Weather App',
    prompt: 'I built a To-Do list app and a Weather forecast app. What should I build instead to stand out to hiring managers?',
  },
];

const THINKING_MESSAGES = [
  'Deconstructing your architecture & resume signals...',
  'Simulating senior hiring manager review & screening traps...',
  'Analyzing concurrency bottlenecks & race conditions...',
  'Synthesizing production blueprints with real industry tools...',
];

// Helper to parse bold, inline code, and formatting inside text spans
const parseFormattedSpan = (text: string, keyPrefix: string): React.ReactNode => {
  // Regex to split by bold (**bold**) and inline code (`code`)
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return (
    <React.Fragment key={keyPrefix}>
      {parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={idx} className="font-bold text-slate-900 dark:text-white">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code
              key={idx}
              className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-100 dark:bg-surface-dark text-brand-600 dark:text-brand-300 font-mono text-xs border border-slate-200 dark:border-border-dark"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return part;
      })}
    </React.Fragment>
  );
};

// Rich Realistic Markdown Formatter for Villain Messages
const FormattedMessage: React.FC<{ content: string }> = ({ content }) => {
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);

  // Split into code blocks and normal prose
  const rawSections = useMemo(() => {
    return content.split(/(```[\s\S]*?```)/g);
  }, [content]);

  const handleCopyCode = (codeStr: string, idx: number) => {
    navigator.clipboard?.writeText(codeStr);
    setCopiedCodeIdx(idx);
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  return (
    <div className="space-y-2.5 text-sm leading-relaxed text-slate-800 dark:text-slate-100">
      {rawSections.map((sec, secIdx) => {
        if (sec.startsWith('```') && sec.endsWith('```')) {
          const lines = sec.slice(3, -3).trim().split('\n');
          const firstLine = lines[0]?.trim() || '';
          const hasLang = /^[a-zA-Z0-9_-]+$/.test(firstLine);
          const lang = hasLang ? firstLine : '';
          const codeBody = (hasLang ? lines.slice(1) : lines).join('\n');

          return (
            <div
              key={secIdx}
              className="my-3 rounded-2xl overflow-hidden border border-slate-800 bg-[#0d1117] text-slate-200 font-mono text-xs shadow-md"
            >
              <div className="px-3.5 py-2 bg-[#161b22] flex items-center justify-between border-b border-slate-800 text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                  </div>
                  <span className="ml-1.5 font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1 font-mono text-[10px]">
                    <Terminal className="w-3.5 h-3.5 text-brand-400" />
                    {lang || 'TERMINAL'}
                  </span>
                </div>
                <button
                  onClick={() => handleCopyCode(codeBody, secIdx)}
                  className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors px-2 py-0.5 rounded hover:bg-slate-800"
                >
                  {copiedCodeIdx === secIdx ? (
                    <>
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-medium">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 overflow-x-auto leading-relaxed scrollbar-thin scrollbar-thumb-slate-800">
                <code>{codeBody}</code>
              </pre>
            </div>
          );
        }

        // Split text lines to render paragraphs, bullet items, and quotes
        const lines = sec.split('\n');
        return (
          <div key={secIdx} className="space-y-2">
            {lines.map((line, lIdx) => {
              const trimmed = line.trim();
              if (!trimmed) {
                return <div key={lIdx} className="h-1" />;
              }

              // Headings (### or ##)
              if (trimmed.startsWith('### ')) {
                return (
                  <div key={lIdx} className="pt-2.5 pb-1 border-b border-slate-100 dark:border-white/5 flex items-center gap-2">
                    <span className="w-1.5 h-3.5 bg-brand-500 rounded-full shrink-0" />
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">
                      {parseFormattedSpan(trimmed.slice(4), `${secIdx}-${lIdx}`)}
                    </h4>
                  </div>
                );
              }
              if (trimmed.startsWith('## ')) {
                return (
                  <div key={lIdx} className="pt-3 pb-1 border-b border-slate-200/80 dark:border-white/10 flex items-center gap-2">
                    <span className="w-2 h-4 bg-gradient-to-b from-brand-500 to-brand-700 rounded-full shrink-0" />
                    <h3 className="font-black text-base text-slate-900 dark:text-white tracking-tight">
                      {parseFormattedSpan(trimmed.slice(3), `${secIdx}-${lIdx}`)}
                    </h3>
                  </div>
                );
              }

              // Numbered list (e.g. "1. " or "1) " or "(1) ")
              const numMatch = trimmed.match(/^(\(?\d+\)?[\.\)]?)\s+(.*)/);
              if (numMatch) {
                const numStr = numMatch[1].replace(/[\(\)\.\)]/g, '');
                return (
                  <div key={lIdx} className="flex items-start gap-2.5 pl-0.5 py-1">
                    <span className="flex items-center justify-center w-5 h-5 rounded-lg bg-brand-50 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 font-bold text-[11px] shrink-0 mt-0.5 border border-brand-200 dark:border-brand-800/60 shadow-2xs">
                      {numStr}
                    </span>
                    <div className="flex-1 text-slate-700 dark:text-slate-200 leading-relaxed pt-0.5">
                      {parseFormattedSpan(numMatch[2], `${secIdx}-${lIdx}`)}
                    </div>
                  </div>
                );
              }

              // Bullet lists (- or * or • or ✓)
              if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ') || trimmed.startsWith('✓ ')) {
                const bulletChar = trimmed.startsWith('✓ ') ? '✓' : '•';
                const contentStr = trimmed.slice(2);
                return (
                  <div key={lIdx} className="flex items-start gap-2.5 pl-1 py-0.5">
                    <span className="text-brand-500 font-bold text-xs shrink-0 mt-1 select-none">
                      {bulletChar}
                    </span>
                    <div className="flex-1 text-slate-700 dark:text-slate-200 leading-relaxed">
                      {parseFormattedSpan(contentStr, `${secIdx}-${lIdx}`)}
                    </div>
                  </div>
                );
              }

              // Blockquotes (> )
              if (trimmed.startsWith('> ')) {
                return (
                  <blockquote
                    key={lIdx}
                    className="border-l-3 border-brand-500 pl-3 my-2 text-xs italic text-slate-600 dark:text-slate-300 bg-brand-50/50 dark:bg-brand-950/30 p-2.5 rounded-r-xl border border-brand-200/50 dark:border-brand-800/30"
                  >
                    {parseFormattedSpan(trimmed.slice(2), `${secIdx}-${lIdx}`)}
                  </blockquote>
                );
              }

              // Default Paragraph
              return (
                <p key={lIdx} className="leading-relaxed text-slate-700 dark:text-slate-200">
                  {parseFormattedSpan(line, `${secIdx}-${lIdx}`)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

const getDifficultyBadge = (diff?: string) => {
  switch (diff?.toLowerCase()) {
    case 'staff':
      return 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30';
    case 'advanced':
      return 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30';
    default:
      return 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30';
  }
};

interface VillainAgentProps {
  initialPrompt?: string | null;
  onClearInitialPrompt?: () => void;
}

export const VillainAgent: React.FC<VillainAgentProps> = ({
  initialPrompt,
  onClearInitialPrompt,
}) => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<CandidateProfile | null>(null);
  const [hasResume, setHasResume] = useState<boolean | null>(null);
  const [candidateName, setCandidateName] = useState<string | null>(null);
  const [showPasteResume, setShowPasteResume] = useState(false);
  const [pastedResumeText, setPastedResumeText] = useState('');
  const [savedProjects, setSavedProjects] = useState<Record<string, boolean>>({});
  const [savingProjectId, setSavingProjectId] = useState<string | null>(null);
  const [thinkingIdx, setThinkingIdx] = useState(0);

  // Extract skills count and list
  const userSkills: string[] = useMemo(() => {
    if (!profileData?.skills) return [];
    if (Array.isArray(profileData.skills)) {
      return profileData.skills.map(String).filter(Boolean);
    }
    return Object.values(profileData.skills)
      .flat()
      .filter(Boolean)
      .map((s) => String(s).trim());
  }, [profileData]);

  const targetRole = useMemo(() => {
    return profileData?.targetRole || user?.targetRole || 'Software Engineer';
  }, [profileData?.targetRole, user?.targetRole]);

  const projectCount = useMemo(() => {
    return profileData?.projects?.length || 0;
  }, [profileData?.projects]);

  const [messages, setMessages] = useState<Array<VillainChatMessage & {
    verdict?: string | null;
    projects?: VillainProjectCard[];
    brutal_truth?: string;
    suggested_prompts?: string[];
  }>>([
    {
      role: 'agent',
      content:
        "Listen up. I've reviewed over 2,500 software engineering resumes, and 90% get tossed in the trash in 6 seconds because of generic Todo Apps, Weather clones, and tutorial copy-pastes.\n\nHere is how we turn your profile into an interview magnet:\n1. 📄 **Analyze your resume**: Ask what roles you can realistically land vs. aspirational roles\n2. 🎯 **Status-to-Job gap diagnosis**: Tell me your target role and I'll break down your brutal gaps from your current status\n3. 🛠️ **Tool-driven portfolio blueprints**: Ask me for production projects built with real industry tools (Kafka, Redis, Docker, Postgres)\n4. 🔥 **Roast your existing project**: Give me an idea and I'll level it up into production architecture.",
      suggested_prompts: QUICK_STARTERS.slice(0, 3).map((q) => q.label),
    },
  ]);
  const [history, setHistory] = useState<VillainChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedProj, setExpandedProj] = useState<Record<string, boolean>>({});
  const [expandedDefense, setExpandedDefense] = useState<Record<string, boolean>>({});
  const [copiedMsgIdx, setCopiedMsgIdx] = useState<number | null>(null);
  const [likedMsgIdx, setLikedMsgIdx] = useState<Record<number, boolean>>({});
  const [copiedTopoId, setCopiedTopoId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Cycle thinking messages during loading
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setThinkingIdx((prev) => (prev + 1) % THINKING_MESSAGES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [loading]);

  // Check if user has an uploaded resume & personalize intro
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const profile = await apiService.getCandidateProfile();
        if (!isMounted) return;
        if (profile && profile.candidate) {
          setHasResume(true);
          setProfileData(profile);
          const name = profile.candidate.name || user?.name || 'Candidate';
          setCandidateName(name);

          // Extract top 3 skills for personalized intro
          const skillsList: string[] = profile.skills
            ? (Array.isArray(profile.skills)
                ? profile.skills
                : Object.values(profile.skills).flat()
              ).map(String).filter(Boolean).slice(0, 3)
            : [];
          const skillsSummary = skillsList.length > 0 ? ` with background in **${skillsList.join(', ')}**` : '';

          setMessages([
            {
              role: 'agent',
              content:
                `Listen up, **${name}**. I have **100% full access to your uploaded resume** — your education, ${skillsSummary ? `skills (${skillsSummary}), ` : ''}work experience, all projects, and credentials.\n\n` +
                "You can ask me to evaluate anything on your resume:\n" +
                "1. 📄 **Full Resume & Role Matching**: Ask what roles you can realistically land vs. aspirational roles\n" +
                "2. 🔍 **Audit My Projects & Work History**: Ask me to grill, roast, or level up any project on your resume\n" +
                "3. 🎯 **Status-to-Job gap diagnosis**: Tell me your target role and I'll break down your brutal gaps from your current status\n" +
                "4. 🛠️ **Tool-driven portfolio blueprints**: Ask me for production projects built with real industry tools (Kafka, Redis, Docker, Postgres)",
              suggested_prompts: QUICK_STARTERS.slice(0, 3).map((q) => q.label),
            },
          ]);
        } else {
          setHasResume(false);
        }
      } catch {
        if (isMounted) setHasResume(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [user?.name]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessageWithText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMsg = { role: 'user' as const, content: trimmed };
      const updatedMessages = [...messages, userMsg];
      const updatedHistory = [...history, userMsg];

      setMessages(updatedMessages);
      setHistory(updatedHistory);
      setInputValue('');
      setLoading(true);

      // Ensure active resume context is retrieved even if initial state was still loading
      let activeProfile = profileData;
      if (!activeProfile) {
        try {
          activeProfile = await apiService.getCandidateProfile();
          if (activeProfile && activeProfile.candidate) {
            setProfileData(activeProfile);
            setHasResume(true);
            setCandidateName(activeProfile.candidate.name || user?.name || 'Candidate');
          }
        } catch {
          // No profile uploaded yet
        }
      }

      try {
        const res: VillainChatResponse = await coachApi.villainChat({
          message: trimmed,
          conversation_history: updatedHistory,
          resume_context: activeProfile || undefined,
          target_role: activeProfile?.targetRole || user?.targetRole,
        });

        const agentMsg = {
          role: 'agent' as const,
          content: res.villain_message,
          verdict: res.verdict,
          projects: res.projects || [],
          brutal_truth: res.brutal_truth,
          suggested_prompts: res.suggested_prompts || [],
        };

        setMessages((prev) => [...prev, agentMsg]);
        setHistory((prev) => [...prev, { role: 'agent', content: res.villain_message }]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'agent',
            content: "Sorry, I hit a snag connecting to the neural cortex. Give it another shot.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, history, profileData, user?.name, user?.targetRole]
  );

  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      sendMessageWithText(initialPrompt);
      if (onClearInitialPrompt) {
        onClearInitialPrompt();
      }
    }
  }, [initialPrompt, onClearInitialPrompt, sendMessageWithText]);

  const handleStarterClick = (promptOrLabel: string) => {
    const match = QUICK_STARTERS.find((q) => q.label === promptOrLabel || q.prompt === promptOrLabel);
    sendMessageWithText(match ? match.prompt : promptOrLabel);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessageWithText(inputValue);
    }
  };

  const handleCopyReadme = (proj: any) => {
    const text = `# ${proj.title}
Difficulty: ${proj.difficulty}
Description: ${proj.description}

## Architecture
${proj.architecture_summary}

${proj.architecture_diagram ? `## Topology Diagram\n\`\`\`text\n${proj.architecture_diagram}\n\`\`\`\n` : ''}
## Tech Stack
${(proj.tech_stack || []).join(', ')}

## Target Competencies Proven
${(proj.target_gaps_addressed || []).map((g: string) => `- ${g}`).join('\n')}

## Recommended GitHub Blueprint
${(proj.github_blueprint || []).map((b: string) => `- ${b}`).join('\n')}

${proj.interview_trap_question ? `## Interview Defense\n**Interviewer Trap:** ${proj.interview_trap_question}\n**Staff Defense:** ${proj.staff_defense_answer || 'N/A'}\n` : ''}
`;
    navigator.clipboard?.writeText(text);
    setCopiedId(proj.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveToPortfolio = async (proj: any) => {
    try {
      setSavingProjectId(proj.id);
      await coachApi.addPortfolioProject({
        id: proj.id,
        title: proj.title,
        difficulty: proj.difficulty,
        description: proj.description,
        tech_stack: proj.tech_stack || [],
        target_gaps_addressed: proj.target_gaps_addressed || [],
        architecture_summary: proj.architecture_summary || '',
        key_deliverables: proj.key_deliverables || [],
        github_blueprint: proj.github_blueprint || [],
      });
      setSavedProjects((prev) => ({ ...prev, [proj.id]: true }));
    } catch (err) {
      console.error('Failed to save project to plan:', err);
      setSavedProjects((prev) => ({ ...prev, [proj.id]: true }));
    } finally {
      setSavingProjectId(null);
    }
  };

  const reset = () => {
    setMessages([
      {
        role: 'agent',
        content:
          "Reset complete. Give me your project idea, target role, or tech stack, and I'll give you the realistic brutal truth on how to stand out.",
        suggested_prompts: QUICK_STARTERS.slice(0, 3).map((q) => q.label),
      },
    ]);
    setHistory([]);
    setInputValue('');
  };

  // User initials for message bubble
  const userInitials = useMemo(() => {
    const name = candidateName || user?.name || user?.username || 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [candidateName, user?.name, user?.username]);

  return (
    <div className="flex flex-col h-[820px] max-h-[88vh] bg-surface-light-card dark:bg-surface-dark-card border border-slate-200/90 dark:border-border-dark shadow-card-light dark:shadow-glow-dark rounded-3xl overflow-hidden transition-all">
      {/* Top Header Bar */}
      <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200/80 dark:border-border-dark bg-white/95 dark:bg-surface-dark-card/95 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 border border-brand-400/40 flex items-center justify-center text-white shadow-md shadow-brand-500/25 ring-2 ring-brand-500/20">
              <Skull className="w-5 h-5 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-surface-dark-card"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-slate-900 dark:text-white font-extrabold text-sm tracking-tight">
                The Career Villain
              </h3>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/80 border border-brand-200 dark:border-brand-800/60 px-2.5 py-0.5 rounded-full shadow-2xs">
                <Flame className="w-3 h-3 text-brand-500 fill-brand-500 animate-pulse" />
                Staff Hiring Bar Raiser Active
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs">
              Zero BS • Real Concurrency • Offer-Winning Architecture
            </p>
          </div>
        </div>

        {/* User Context & Actions */}
        <div className="flex items-center gap-2">
          {hasResume === true ? (
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/90 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-medium shadow-2xs">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="truncate max-w-[140px] sm:max-w-[340px]">
                Full Resume: <strong className="font-bold text-slate-900 dark:text-white">{candidateName}</strong> ({targetRole} • {userSkills.length} skills • {projectCount} projects)
              </span>
              <Link
                to="/profile"
                className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-semibold ml-0.5 shrink-0"
                title="View full candidate profile"
              >
                Profile →
              </Link>
            </div>
          ) : hasResume === false ? (
            <Link
              to="/upload-resume"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30 rounded-xl text-xs text-amber-700 dark:text-amber-300 font-semibold transition-colors"
              title="Upload your resume so the Villain can tailor advice to your real skills"
            >
              <FileUp className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Upload Resume →</span>
            </Link>
          ) : null}

          <button
            onClick={() => setShowPasteResume(!showPasteResume)}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-surface-dark-elevated dark:hover:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium transition-colors"
            title="Paste resume or skill summary text directly"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>{showPasteResume ? 'Hide Text' : 'Paste Resume'}</span>
          </button>

          <button
            onClick={reset}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface-dark-elevated transition-colors border border-transparent hover:border-slate-200 dark:hover:border-border-dark"
            title="Start fresh conversation"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Collapsible Paste Resume Drawer */}
      <AnimatePresence>
        {showPasteResume && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 bg-slate-50 dark:bg-surface-dark-elevated border-b border-slate-200 dark:border-border-dark space-y-2.5 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-brand-500" />
                Paste Resume Text, Tech Stack, or Project Idea:
              </span>
              <button
                onClick={() => setShowPasteResume(false)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕ Close
              </button>
            </div>
            <textarea
              value={pastedResumeText}
              onChange={(e) => setPastedResumeText(e.target.value)}
              placeholder="Paste your raw resume text, education, current skills, or target role here..."
              rows={3}
              className="w-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl p-3 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 resize-none font-mono transition-all"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  if (!pastedResumeText.trim()) return;
                  sendMessageWithText(
                    `Analyze my profile and resume text. Tell me what role I should realistically target, what my gaps are, and what portfolio projects I should build with modern tools:\n\n${pastedResumeText.trim()}`
                  );
                  setShowPasteResume(false);
                  setPastedResumeText('');
                }}
                disabled={!pastedResumeText.trim()}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 disabled:opacity-40 text-white text-xs font-semibold shadow-md shadow-brand-500/20 transition-all flex items-center gap-1.5"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Roast & Analyze Pasted Context →</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/50 dark:bg-surface-dark/40 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
        {messages.map((msg, i) => {
          const isAgent = msg.role === 'agent';
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${isAgent ? 'justify-start' : 'justify-end'}`}
            >
              {isAgent && (
                <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-500/20 border border-brand-200 dark:border-brand-500/30 flex items-center justify-center text-brand-600 dark:text-brand-400 shrink-0 mt-0.5 shadow-2xs">
                  <Skull className="w-4 h-4" />
                </div>
              )}

              <div className={`max-w-[92%] sm:max-w-[85%] space-y-3.5 ${isAgent ? '' : 'text-right'}`}>
                {/* Message Bubble */}
                <div
                  className={`rounded-2xl px-4 sm:px-5 py-3.5 text-sm leading-relaxed transition-colors ${
                    isAgent
                      ? 'bg-white dark:bg-surface-dark-elevated border border-slate-200/90 dark:border-border-dark text-slate-800 dark:text-slate-100 rounded-tl-sm shadow-sm'
                      : 'bg-gradient-to-r from-brand-600 to-brand-700 text-white rounded-tr-sm font-medium shadow-md shadow-brand-500/25 inline-block text-left'
                  }`}
                >
                  {/* Verdict Badge */}
                  {msg.verdict && (
                    <div className="mb-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-brand-50 dark:bg-brand-950/80 border border-brand-200 dark:border-brand-700/60 text-brand-700 dark:text-brand-300">
                      <Flame className="w-3.5 h-3.5 text-brand-500 fill-brand-500" />
                      <span>Verdict: {msg.verdict}</span>
                    </div>
                  )}

                  {/* Realistic Rich Formatted Content */}
                  <FormattedMessage content={msg.content} />

                  {/* Brutal Truth Box */}
                  {msg.brutal_truth && (
                    <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-white/5 flex items-start gap-2.5 text-xs italic text-brand-800 dark:text-brand-300 bg-brand-50/60 dark:bg-brand-950/30 p-3 rounded-xl border border-brand-200/60 dark:border-brand-800/40">
                      <Zap className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                      <span className="font-medium">"{msg.brutal_truth}"</span>
                    </div>
                  )}

                  {/* Message Action Bar (Copy & Helpful Feedback) */}
                  {isAgent && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1.5 font-medium text-slate-400 dark:text-slate-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Staff AI Review
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            navigator.clipboard?.writeText(msg.content);
                            setCopiedMsgIdx(i);
                            setTimeout(() => setCopiedMsgIdx(null), 2000);
                          }}
                          className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors px-2 py-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-surface-dark-card"
                          title="Copy response"
                        >
                          {copiedMsgIdx === i ? (
                            <>
                              <CheckCheck className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => setLikedMsgIdx((prev) => ({ ...prev, [i]: !prev[i] }))}
                          className={`flex items-center gap-1 transition-colors px-2 py-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-surface-dark-card ${
                            likedMsgIdx[i] ? 'text-brand-600 dark:text-brand-400 font-semibold' : 'hover:text-slate-700 dark:hover:text-slate-200'
                          }`}
                          title="Mark as helpful critique"
                        >
                          <Flame className={`w-3 h-3 ${likedMsgIdx[i] ? 'fill-brand-500 text-brand-500' : ''}`} />
                          <span>{likedMsgIdx[i] ? 'Helpful' : 'Critique'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Interactive Starter Action Grid for Empty/Initial State */}
                {i === 0 && messages.length <= 1 && (
                  <div className="pt-2 pb-1 space-y-2.5 text-left">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                      Jump Straight Into High-Value Prompts:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {QUICK_STARTERS.slice(0, 4).map((q, qIdx) => (
                        <button
                          key={qIdx}
                          disabled={loading}
                          onClick={() => handleStarterClick(q.prompt)}
                          className="group text-left p-3.5 rounded-2xl bg-white dark:bg-surface-dark-elevated hover:bg-gradient-to-br hover:from-white hover:to-brand-50/50 dark:hover:from-surface-dark-elevated dark:hover:to-brand-950/20 border border-slate-200/90 dark:border-border-dark hover:border-brand-500/40 dark:hover:border-border-dark-accent shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-1.5 active:scale-[0.99]"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                              {q.label}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {q.prompt}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Level-Up Production Projects embedded inside Chat */}
                {msg.projects && msg.projects.length > 0 && (
                  <div className="space-y-4 text-left pt-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-extrabold uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        Production Portfolio Blueprints:
                      </p>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {msg.projects.length} curated blueprint{msg.projects.length > 1 ? 's' : ''}
                      </span>
                    </div>

                    {msg.projects.map((proj) => {
                      const isExpanded = expandedProj[proj.id] ?? true;
                      const isDefenseExpanded = expandedDefense[proj.id] ?? false;
                      const isSaved = savedProjects[proj.id] ?? false;
                      const isSaving = savingProjectId === proj.id;

                      return (
                        <div
                          key={proj.id}
                          className="rounded-2xl border border-slate-200 dark:border-border-dark hover:border-brand-500/40 dark:hover:border-border-dark-accent bg-white dark:bg-surface-dark-card overflow-hidden shadow-card-light dark:shadow-none transition-all"
                        >
                          {/* Card Header Banner */}
                          <div className="p-4 sm:p-5 flex items-start justify-between gap-3 bg-gradient-to-r from-brand-50/50 via-white to-white dark:from-brand-950/30 dark:via-surface-dark-card dark:to-surface-dark-card border-b border-slate-100 dark:border-border-dark">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border shadow-2xs ${getDifficultyBadge(proj.difficulty)}`}>
                                  {proj.difficulty}
                                </span>
                                {proj.villain_pitch && (
                                  <span className="text-xs text-brand-600 dark:text-brand-300/90 italic font-medium">
                                    "{proj.villain_pitch}"
                                  </span>
                                )}
                              </div>
                              <h4 className="text-slate-900 dark:text-white font-bold text-base tracking-tight">
                                {proj.title}
                              </h4>
                              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-0.5">
                                {proj.description}
                              </p>
                            </div>

                            <button
                              onClick={() =>
                                setExpandedProj((prev) => ({ ...prev, [proj.id]: !isExpanded }))
                              }
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface-dark-elevated transition-colors shrink-0"
                              title={isExpanded ? 'Collapse Blueprint' : 'Expand Blueprint'}
                            >
                              <ChevronDown
                                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              />
                            </button>
                          </div>

                          {/* Tech stack badge row */}
                          <div className="px-4 sm:px-5 py-2.5 border-b border-slate-100 dark:border-border-dark flex flex-wrap gap-1.5 bg-slate-50/60 dark:bg-surface-dark/60">
                            {proj.tech_stack.map((t) => (
                              <span
                                key={t}
                                className="text-[11px] px-2.5 py-1 rounded-lg bg-white dark:bg-surface-dark-elevated text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 font-mono font-medium shadow-2xs"
                              >
                                {t}
                              </span>
                            ))}
                          </div>

                          {/* Expandable Architecture & Deliverables */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="p-4 sm:p-5 space-y-3.5 text-xs bg-slate-50/30 dark:bg-surface-dark/40"
                              >
                                {proj.architecture_summary && (
                                  <div>
                                    <p className="font-bold text-slate-500 dark:text-slate-400 text-[10px] uppercase mb-1.5 flex items-center gap-1.5">
                                      <Layers className="w-3.5 h-3.5 text-brand-500" /> System Architecture & Concurrency
                                    </p>
                                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-surface-dark p-3 rounded-xl border border-slate-200/80 dark:border-border-dark font-sans">
                                      {proj.architecture_summary}
                                    </p>
                                  </div>
                                )}

                                {/* Architecture Diagram (Topology Flow) */}
                                {proj.architecture_diagram && (
                                  <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                      <p className="font-bold text-slate-500 dark:text-slate-400 text-[10px] uppercase flex items-center gap-1.5">
                                        <Cpu className="w-3.5 h-3.5 text-indigo-500" /> Component Topology Flow
                                      </p>
                                      <button
                                        onClick={() => {
                                          navigator.clipboard?.writeText(proj.architecture_diagram || '');
                                          setCopiedTopoId(proj.id);
                                          setTimeout(() => setCopiedTopoId(null), 2000);
                                        }}
                                        className="text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors flex items-center gap-1 px-1.5 py-0.5 rounded"
                                        title="Copy topology flow"
                                      >
                                        {copiedTopoId === proj.id ? (
                                          <>
                                            <CheckCheck className="w-3 h-3 text-emerald-500" />
                                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Copied</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-3 h-3" />
                                            <span>Copy Topology</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                    <div className="bg-slate-950 rounded-xl p-3 font-mono text-[11px] text-emerald-400 border border-slate-800 overflow-x-auto shadow-inner leading-relaxed">
                                      {proj.architecture_diagram}
                                    </div>
                                  </div>
                                )}

                                {proj.key_deliverables && proj.key_deliverables.length > 0 && (
                                  <div>
                                    <p className="font-bold text-slate-500 dark:text-slate-400 text-[10px] uppercase mb-1.5 flex items-center gap-1.5">
                                      <Trophy className="w-3.5 h-3.5 text-emerald-500" /> Measurable Interview Proof (Deliverables)
                                    </p>
                                    <ul className="space-y-1.5 text-slate-700 dark:text-slate-300 bg-white dark:bg-surface-dark p-3 rounded-xl border border-slate-200/80 dark:border-border-dark">
                                      {proj.key_deliverables.map((d, dIdx) => (
                                        <li key={dIdx} className="flex items-start gap-2">
                                          <span className="text-emerald-500 font-bold shrink-0">✓</span>
                                          <span>{d}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {proj.github_blueprint && proj.github_blueprint.length > 0 && (
                                  <div>
                                    <p className="font-bold text-slate-500 dark:text-slate-400 text-[10px] uppercase mb-1.5 flex items-center gap-1.5">
                                      <GitBranch className="w-3.5 h-3.5 text-indigo-500" /> Recommended Repository Blueprint
                                    </p>
                                    <div className="bg-slate-900 dark:bg-surface-dark rounded-xl p-3 font-mono text-[11px] text-slate-200 dark:text-slate-300 border border-slate-800 dark:border-border-dark space-y-1 shadow-inner">
                                      {proj.github_blueprint.map((line, lIdx) => (
                                        <div key={lIdx} className="flex items-center gap-1">
                                          <span className="text-slate-500 select-none">│ </span>
                                          <span>{line}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Interview Defense Section (Realistic Grill Prep) */}
                                {(proj.interview_trap_question || proj.staff_defense_answer) && (
                                  <div className="pt-1">
                                    <button
                                      onClick={() =>
                                        setExpandedDefense((prev) => ({
                                          ...prev,
                                          [proj.id]: !isDefenseExpanded,
                                        }))
                                      }
                                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-brand-50/60 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800/60 text-brand-700 dark:text-brand-300 font-bold text-xs hover:bg-brand-100/60 dark:hover:bg-brand-950/70 transition-all"
                                    >
                                      <span className="flex items-center gap-2">
                                        <ShieldAlert className="w-4 h-4 text-brand-500" />
                                        <span>Interview Defense: How Hiring Managers Grill You on This</span>
                                      </span>
                                      <ChevronDown
                                        className={`w-3.5 h-3.5 transition-transform ${
                                          isDefenseExpanded ? 'rotate-180' : ''
                                        }`}
                                      />
                                    </button>

                                    <AnimatePresence>
                                      {isDefenseExpanded && (
                                        <motion.div
                                          initial={{ opacity: 0, height: 0 }}
                                          animate={{ opacity: 1, height: 'auto' }}
                                          exit={{ opacity: 0, height: 0 }}
                                          className="mt-2 space-y-2 p-3 bg-white dark:bg-surface-dark rounded-xl border border-slate-200/90 dark:border-border-dark"
                                        >
                                          {proj.interview_trap_question && (
                                            <div>
                                              <p className="text-[10px] font-black uppercase text-red-600 dark:text-red-400 mb-0.5">
                                                🚨 The Trap Question:
                                              </p>
                                              <p className="text-xs text-slate-800 dark:text-slate-200 font-semibold italic">
                                                "{proj.interview_trap_question}"
                                              </p>
                                            </div>
                                          )}
                                          {proj.staff_defense_answer && (
                                            <div className="pt-1.5 border-t border-slate-100 dark:border-white/5">
                                              <p className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 mb-0.5">
                                                🛡️ How to Answer Like a Staff Engineer:
                                              </p>
                                              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                                                {proj.staff_defense_answer}
                                              </p>
                                            </div>
                                          )}
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Actions Bar */}
                          <div className="px-4 sm:px-5 py-3 border-t border-slate-100 dark:border-border-dark bg-slate-50/80 dark:bg-surface-dark flex flex-wrap items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleCopyReadme(proj)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-surface-dark-elevated hover:bg-slate-100 dark:hover:bg-surface-dark text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all border border-slate-200 dark:border-border-dark shadow-2xs"
                              >
                                {copiedId === proj.id ? (
                                  <>
                                    <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                                    <span className="text-emerald-600 dark:text-emerald-400">Copied README.md!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Copy README Blueprint</span>
                                  </>
                                )}
                              </button>

                              <button
                                onClick={() => handleSaveToPortfolio(proj)}
                                disabled={isSaved || isSaving}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border shadow-2xs ${
                                  isSaved
                                    ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                                    : 'bg-white dark:bg-surface-dark-elevated hover:bg-slate-100 dark:hover:bg-surface-dark text-slate-700 dark:text-slate-200 border-slate-200 dark:border-border-dark'
                                }`}
                              >
                                {isSaved ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <span>Saved to My Plan</span>
                                  </>
                                ) : (
                                  <>
                                    <Bookmark className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{isSaving ? 'Saving...' : 'Save to My Plan'}</span>
                                  </>
                                )}
                              </button>
                            </div>

                            <button
                              onClick={() =>
                                sendMessageWithText(
                                  `Tell me how to build "${proj.title}" step by step. What are the critical architectural pitfalls and what interview questions will hiring managers ask me about this?`
                                )
                              }
                              className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-brand-50 dark:bg-brand-950/50 hover:bg-brand-100 dark:hover:bg-brand-950/80 border border-brand-200 dark:border-brand-800/50 shadow-2xs"
                            >
                              <Flame className="w-3.5 h-3.5 text-brand-500" />
                              <span>Ask How to Build This →</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Follow-up suggestions */}
                {msg.suggested_prompts && msg.suggested_prompts.length > 0 && i === messages.length - 1 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {msg.suggested_prompts.map((promptText, pIdx) => (
                      <button
                        key={pIdx}
                        onClick={() => handleStarterClick(promptText)}
                        className="text-xs px-3 py-1.5 rounded-xl bg-white dark:bg-surface-dark-elevated hover:bg-brand-50/60 dark:hover:bg-brand-950/40 border border-slate-200 dark:border-border-dark text-slate-700 dark:text-slate-200 hover:text-brand-600 dark:hover:text-brand-300 hover:border-brand-300 dark:hover:border-brand-500/40 transition-all text-left flex items-center gap-1.5 shadow-2xs"
                      >
                        <span>{promptText}</span>
                        <ArrowRight className="w-3 h-3 text-brand-500 shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {!isAgent && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white flex items-center justify-center font-bold text-xs shadow-sm shadow-brand-500/20 shrink-0 mt-0.5">
                  {userInitials}
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Dynamic Realistic Thinking Indicator */}
        {loading && (
          <div className="flex gap-3 items-center">
            <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-500/20 border border-brand-200 dark:border-brand-500/30 flex items-center justify-center text-brand-600 dark:text-brand-400 shrink-0">
              <Skull className="w-4 h-4" />
            </div>
            <div className="bg-white dark:bg-surface-dark-elevated border border-slate-200/90 dark:border-border-dark rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-3 shadow-sm">
              <span className="text-xs text-brand-600 dark:text-brand-400 font-semibold animate-pulse">
                {THINKING_MESSAGES[thinkingIdx]}
              </span>
              <div className="flex items-center gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 bg-brand-500 rounded-full"
                    animate={{ y: [-2, 2, -2] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Chips Bar */}
      <div className="px-3 sm:px-5 py-2.5 border-t border-slate-200/80 dark:border-border-dark bg-slate-50/90 dark:bg-surface-dark-card/90 flex items-center gap-2 overflow-x-auto scrollbar-none">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 shrink-0 flex items-center gap-1">
          <Zap className="w-3 h-3 text-brand-500" />
          Quick Ask:
        </span>
        {QUICK_STARTERS.map((q, idx) => (
          <button
            key={idx}
            disabled={loading}
            onClick={() => handleStarterClick(q.prompt)}
            className="text-xs px-3 py-1.5 rounded-xl bg-white dark:bg-surface-dark-elevated hover:bg-brand-50/70 dark:hover:bg-brand-950/40 hover:text-brand-600 dark:hover:text-brand-300 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-border-dark transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-2xs disabled:opacity-50 active:scale-95"
          >
            <span>{q.label}</span>
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-3 sm:p-4 border-t border-slate-200/80 dark:border-border-dark bg-white dark:bg-surface-dark-card">
        <div className="flex gap-2 items-end bg-slate-50 dark:bg-surface-dark-elevated border border-slate-200/90 dark:border-border-dark rounded-2xl p-2.5 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 dark:focus-within:border-brand-500/40 transition-all shadow-2xs">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="Ask the Villain about your resume, target role gaps, or ask what to build with Kafka, Redis, Docker... (Enter to send)"
            rows={2}
            className="flex-1 bg-transparent text-slate-800 dark:text-slate-100 text-sm resize-none outline-none placeholder-slate-400 dark:placeholder-slate-500 leading-relaxed max-h-36 scrollbar-thin"
          />
          <button
            onClick={() => sendMessageWithText(inputValue)}
            disabled={!inputValue.trim() || loading}
            className="bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 disabled:opacity-30 disabled:cursor-not-allowed text-white p-2.5 rounded-xl transition-all shrink-0 shadow-md shadow-brand-500/20 active:scale-95"
            title="Send prompt to Career Villain (Enter)"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-2 px-1 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
          <span className="hidden sm:inline">
            Press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-surface-dark border border-slate-200 dark:border-white/10 font-mono text-[10px]">Enter ↵</kbd> to send, <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-surface-dark border border-slate-200 dark:border-white/10 font-mono text-[10px]">Shift + Enter</kbd> for new line
          </span>
          <span className="flex items-center gap-1.5 ml-auto text-emerald-600 dark:text-emerald-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Full Resume Context Active
          </span>
        </div>
      </div>
    </div>
  );
};

export default VillainAgent;
