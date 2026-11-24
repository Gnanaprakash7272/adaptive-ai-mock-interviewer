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
  FileUp,
  UserCheck,
  Bookmark,
  Check,
  ShieldAlert,
  Terminal,
  Cpu,
  MessageSquare,
  FolderGit2,
  Lightbulb,
  Trash2,
  Target,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { coachApi, apiService } from '../../services/apiService';
import type { VillainChatMessage, VillainChatResponse, VillainProjectCard } from '../../types/coach';
import type { CandidateProfile } from '../../types';

const QUICK_STARTERS = [
  {
    icon: '📄',
    label: 'Match Resume to Roles',
    subtitle: 'Evaluate your background for realistic vs aspirational roles',
    prompt:
      'Analyze my uploaded resume and skills. What roles should I realistically target right now, what red flags are holding me back, and what aspirational role could I aim for?',
  },
  {
    icon: '🎯',
    label: 'Target Role Gap Audit',
    subtitle: 'Brutal breakdown of missing skills from your current status',
    prompt:
      'I want to land a high-paying role matching my career goals. Look at my current status and tell me what brutal gaps I need to fix and step-by-step what I must do.',
  },
  {
    icon: '🛠️',
    label: 'Recommend Modern Projects',
    subtitle: 'Standout blueprints using real modern industry tools',
    prompt:
      'What standout portfolio projects should I build using real industry tools that fit my target role and will actually get me interview calls?',
  },
  {
    icon: '🔥',
    label: 'Roast an Existing Project',
    subtitle: 'Turn basic clones into offer-winning architecture',
    prompt:
      'Look at the projects on my resume. Roast their architectural weaknesses and show me how to level them up into production scale.',
  },
];

const POPULAR_TARGET_ROLES = [
  {
    id: 'genai',
    title: 'Generative AI / LLM Engineer',
    icon: '🤖',
    badge: '🔥 Hot Track',
    badgeClass: 'bg-purple-50 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border-purple-200 dark:border-purple-800/60',
    techHint: 'LangGraph • vLLM • pgvector • Evals',
  },
  {
    id: 'backend',
    title: 'Backend / Systems Engineer',
    icon: '⚡',
    badge: '🚀 High Demand',
    badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
    techHint: 'Kafka • Redis • PostgreSQL • Concurrency',
  },
  {
    id: 'fullstack',
    title: 'Full Stack Engineer',
    icon: '🌐',
    badge: '⭐ Popular',
    badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
    techHint: 'Next.js • React • Node.js • WebSockets',
  },
  {
    id: 'frontend',
    title: 'Frontend Engineer',
    icon: '🎨',
    badge: '✨ UI / UX',
    badgeClass: 'bg-pink-50 text-pink-700 dark:bg-pink-950/70 dark:text-pink-300 border-pink-200 dark:border-pink-800/60',
    techHint: 'React • TypeScript • Tailwind • Web Vitals',
  },
  {
    id: 'devops',
    title: 'DevOps & Cloud Architect',
    icon: '☁️',
    badge: '🛠️ Cloud / Infra',
    badgeClass: 'bg-sky-50 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300 border-sky-200 dark:border-sky-800/60',
    techHint: 'Docker • Kubernetes • Terraform • AWS',
  },
  {
    id: 'data',
    title: 'Data & ML-Ops Engineer',
    icon: '📊',
    badge: '📈 Big Data',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
    techHint: 'Spark • dbt • Airflow • Feature Stores',
  },
  {
    id: 'mobile',
    title: 'Mobile Engineer (iOS / Android)',
    icon: '📱',
    badge: '📱 Mobile Apps',
    badgeClass: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60',
    techHint: 'React Native • Flutter • Swift • Kotlin',
  },
  {
    id: 'sde',
    title: 'Core Software Engineer (SDE)',
    icon: '💻',
    badge: '🎯 Core Track',
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-surface-dark-elevated dark:text-slate-300 border-slate-200 dark:border-border-dark',
    techHint: 'Data Structures • System Design • Clean Code',
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

        const lines = sec.split('\n');
        return (
          <div key={secIdx} className="space-y-2">
            {lines.map((line, lIdx) => {
              const trimmed = line.trim();
              if (!trimmed) {
                return <div key={lIdx} className="h-1" />;
              }

              if (trimmed.startsWith('### ')) {
                return (
                  <div
                    key={lIdx}
                    className="pt-2.5 pb-1 border-b border-slate-100 dark:border-white/5 flex items-center gap-2"
                  >
                    <span className="w-1.5 h-3.5 bg-brand-500 rounded-full shrink-0" />
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">
                      {parseFormattedSpan(trimmed.slice(4), `${secIdx}-${lIdx}`)}
                    </h4>
                  </div>
                );
              }
              if (trimmed.startsWith('## ')) {
                return (
                  <div
                    key={lIdx}
                    className="pt-3 pb-1 border-b border-slate-200/80 dark:border-white/10 flex items-center gap-2"
                  >
                    <span className="w-2 h-4 bg-gradient-to-b from-brand-500 to-brand-700 rounded-full shrink-0" />
                    <h3 className="font-black text-base text-slate-900 dark:text-white tracking-tight">
                      {parseFormattedSpan(trimmed.slice(3), `${secIdx}-${lIdx}`)}
                    </h3>
                  </div>
                );
              }

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

              if (
                trimmed.startsWith('- ') ||
                trimmed.startsWith('* ') ||
                trimmed.startsWith('• ') ||
                trimmed.startsWith('✓ ')
              ) {
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

const SESSION_CHAT_KEY = 'mockora_villain_chat_msgs';
const SESSION_HIST_KEY = 'mockora_villain_chat_hist';

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
  const [savedProjects, setSavedProjects] = useState<Record<string, boolean>>({});
  const [savedBlueprintItems, setSavedBlueprintItems] = useState<VillainProjectCard[]>([]);
  const [savingProjectId, setSavingProjectId] = useState<string | null>(null);
  const [thinkingIdx, setThinkingIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<'chat' | 'blueprints'>('chat');
  const [showQuickIdeas, setShowQuickIdeas] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);

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

  const [selectedRole, setSelectedRole] = useState<string>('Software Engineer');
  const [showRoleModal, setShowRoleModal] = useState<boolean>(false);
  const [customRoleInput, setCustomRoleInput] = useState<string>('');

  const handleSelectRole = (newRole: string) => {
    setSelectedRole(newRole);
    setShowRoleModal(false);
    setMessages((prev) => [
      ...prev,
      {
        role: 'agent',
        content: `Target role updated to **${newRole}**. Ask me what gaps you have for this role or what production projects you should build!`,
      },
    ]);
  };

  const projectCount = useMemo(() => {
    return profileData?.projects?.length || 0;
  }, [profileData?.projects]);

  const [messages, setMessages] = useState<
    Array<
      VillainChatMessage & {
        verdict?: string | null;
        projects?: VillainProjectCard[];
        brutal_truth?: string;
        suggested_prompts?: string[];
      }
    >
  >(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_CHAT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        role: 'agent',
        content:
          "Listen up. I've reviewed 2,500+ software engineering resumes, and 90% get tossed in the trash in 6 seconds because of generic tutorial clones and basic CRUD.\n\nPick a diagnostic below or ask me anything directly about your resume, target role, or portfolio:",
      },
    ];
  });

  const [history, setHistory] = useState<VillainChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_HIST_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // Persist messages & history across page reloads (Session Persistence)
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_CHAT_KEY, JSON.stringify(messages));
    } catch {}
  }, [messages]);

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_HIST_KEY, JSON.stringify(history));
    } catch {}
  }, [history]);

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

  // Load existing saved blueprints from plan
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const plan = await coachApi.getPlan();
        if (!isMounted || !plan) return;
        if (plan.portfolio_projects && Array.isArray(plan.portfolio_projects)) {
          const loaded: VillainProjectCard[] = plan.portfolio_projects.map((p: any) => ({
            id: p.id || `proj-${Math.random()}`,
            title: p.title || 'Untitled Project',
            difficulty: (p.difficulty as any) || 'Advanced',
            description: p.description || '',
            tech_stack: p.tech_stack || [],
            target_gaps_addressed: p.target_gaps_addressed || [],
            architecture_summary: p.architecture_summary || '',
            key_deliverables: p.key_deliverables || [],
            github_blueprint: p.github_blueprint || [],
            villain_pitch: p.villain_pitch,
            interview_trap_question: p.interview_trap_question,
            staff_defense_answer: p.staff_defense_answer,
            architecture_diagram: p.architecture_diagram,
          }));
          setSavedBlueprintItems(loaded);
          const savedMap: Record<string, boolean> = {};
          loaded.forEach((item) => {
            savedMap[item.id] = true;
          });
          setSavedProjects(savedMap);
        }
      } catch {
        // Plan not initialized yet, ignorable
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

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
          if (profile.targetRole) {
            setSelectedRole(profile.targetRole);
          } else if (user?.targetRole) {
            setSelectedRole(user.targetRole);
          }

          const skillsList: string[] = profile.skills
            ? (Array.isArray(profile.skills)
                ? profile.skills
                : Object.values(profile.skills).flat()
              )
                .map(String)
                .filter(Boolean)
                .slice(0, 3)
            : [];
          const skillsSummary =
            skillsList.length > 0 ? ` specializing in **${skillsList.join(', ')}**` : '';

          setMessages((prev) => {
            if (prev.length > 1) return prev;
            return [
              {
                role: 'agent',
                content:
                  `Listen up, **${name}**. I have full access to your uploaded resume (${profile.targetRole || 'Software Engineer'}${skillsSummary}).\n\n` +
                  'I am here to audit your real resume, pinpoint hiring gaps, and recommend production architectures that win offers. Pick a diagnostic below or ask me anything directly:',
              },
            ];
          });
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
    if (activeTab === 'chat') {
      scrollToBottom();
    }
  }, [messages, scrollToBottom, activeTab]);

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
      setStreamingContent('');
      setShowQuickIdeas(false);
      if (activeTab !== 'chat') {
        setActiveTab('chat');
      }

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

      let accumulated = '';
      try {
        await coachApi.villainChatStream(
          {
            message: trimmed,
            conversation_history: updatedHistory,
            resume_context: activeProfile || undefined,
            target_role: selectedRole,
          },
          (chunk: string) => {
            accumulated += chunk;
            setStreamingContent(accumulated);
          },
          (res: VillainChatResponse) => {
            setStreamingContent(null);
            const agentMsg = {
              role: 'agent' as const,
              content: res.villain_message || accumulated,
              verdict: res.verdict,
              projects: res.projects || [],
              brutal_truth: res.brutal_truth,
              suggested_prompts: res.suggested_prompts || [],
            };

            setMessages((prev) => [...prev, agentMsg]);
            setHistory((prev) => [...prev, { role: 'agent', content: res.villain_message || accumulated }]);
            setLoading(false);
          },
          (err: Error) => {
            console.error('[VillainChatStream error]', err);
            setStreamingContent(null);
            setMessages((prev) => [
              ...prev,
              {
                role: 'agent',
                content: 'Sorry, I hit a snag connecting to the neural cortex. Give it another shot.',
              },
            ]);
            setLoading(false);
          }
        );
      } catch {
        setStreamingContent(null);
        setLoading(false);
      }
    },
    [loading, messages, history, profileData, user?.name, selectedRole, activeTab]
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
    const match = QUICK_STARTERS.find(
      (q) => q.label === promptOrLabel || q.prompt === promptOrLabel
    );
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
      setSavedBlueprintItems((prev) => {
        if (prev.some((p) => p.id === proj.id)) return prev;
        return [...prev, proj];
      });
    } catch (err) {
      console.error('Failed to save project to plan:', err);
      setSavedProjects((prev) => ({ ...prev, [proj.id]: true }));
      setSavedBlueprintItems((prev) => {
        if (prev.some((p) => p.id === proj.id)) return prev;
        return [...prev, proj];
      });
    } finally {
      setSavingProjectId(null);
    }
  };

  const handleRemoveBlueprint = (projId: string) => {
    setSavedBlueprintItems((prev) => prev.filter((p) => p.id !== projId));
    setSavedProjects((prev) => {
      const next = { ...prev };
      delete next[projId];
      return next;
    });
  };

  const reset = () => {
    try {
      sessionStorage.removeItem(SESSION_CHAT_KEY);
      sessionStorage.removeItem(SESSION_HIST_KEY);
    } catch {}
    setMessages([
      {
        role: 'agent',
        content:
          "Reset complete. Give me your project idea, target role, or tech stack, and I'll give you the realistic brutal truth on how to stand out.",
      },
    ]);
    setHistory([]);
    setInputValue('');
  };

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
      <div className="px-4 sm:px-6 py-3 border-b border-slate-200/80 dark:border-border-dark bg-white/95 dark:bg-surface-dark-card/95 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shrink-0">
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
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/80 border border-brand-200 dark:border-brand-800/60 px-2 py-0.5 rounded-full">
                <Flame className="w-3 h-3 text-brand-500 fill-brand-500" />
                Staff Bar Raiser
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs truncate max-w-[200px] sm:max-w-none">
              Zero BS • Role-Adaptive Depth • Offer-Winning Architecture
            </p>
          </div>
        </div>

        {/* Studio View Switcher Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-surface-dark border border-slate-200 dark:border-border-dark text-xs font-semibold">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'chat'
                ? 'bg-white dark:bg-surface-dark-card text-brand-600 dark:text-brand-400 shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Bar Raiser Chat</span>
          </button>
          <button
            onClick={() => setActiveTab('blueprints')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'blueprints'
                ? 'bg-white dark:bg-surface-dark-card text-brand-600 dark:text-brand-400 shadow-2xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>Saved Blueprints</span>
            {savedBlueprintItems.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300">
                {savedBlueprintItems.length}
              </span>
            )}
          </button>
        </div>

        {/* Target Role Selector Trigger */}
        <button
          onClick={() => setShowRoleModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 dark:hover:bg-brand-950/90 border border-brand-200 dark:border-brand-800/60 text-xs font-semibold transition-all shadow-2xs hover:scale-[1.01] cursor-pointer"
          title="Change Target Role for evaluation"
        >
          <Target className="w-3.5 h-3.5 text-brand-500" />
          <span className="text-slate-500 dark:text-slate-400 font-normal hidden sm:inline">Role:</span>
          <span className="font-bold text-brand-700 dark:text-brand-300 truncate max-w-[130px] sm:max-w-[170px]">
            {selectedRole}
          </span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>

        {/* User Context & Actions */}
        <div className="flex items-center gap-2">
          {hasResume === true ? (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/90 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-medium">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="truncate max-w-[200px]">
                <strong className="font-bold text-slate-900 dark:text-white">{candidateName}</strong>{' '}
                ({userSkills.length} skills • {projectCount} projects)
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
            >
              <FileUp className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Upload Resume →</span>
            </Link>
          ) : null}

          <button
            onClick={reset}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface-dark-elevated transition-colors border border-transparent hover:border-slate-200 dark:hover:border-border-dark"
            title="Start fresh conversation"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* VIEW 1: BAR RAISER CHAT TAB */}
      {activeTab === 'chat' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/50 dark:bg-surface-dark/40 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
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

                  <div
                    className={`max-w-[94%] sm:max-w-[85%] space-y-3.5 ${
                      isAgent ? '' : 'text-right'
                    }`}
                  >
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
                                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                    Copied
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={() =>
                                setLikedMsgIdx((prev) => ({ ...prev, [i]: !prev[i] }))
                              }
                              className={`flex items-center gap-1 transition-colors px-2 py-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-surface-dark-card ${
                                likedMsgIdx[i]
                                  ? 'text-brand-600 dark:text-brand-400 font-semibold'
                                  : 'hover:text-slate-700 dark:hover:text-slate-200'
                              }`}
                              title="Mark as helpful critique"
                            >
                              <Flame
                                className={`w-3 h-3 ${
                                  likedMsgIdx[i] ? 'fill-brand-500 text-brand-500' : ''
                                }`}
                              />
                              <span>{likedMsgIdx[i] ? 'Helpful' : 'Critique'}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Interactive Starter Action Grid: ONLY on initial empty state */}
                    {i === 0 && messages.length <= 1 && (
                      <div className="pt-2 pb-1 space-y-2.5 text-left">
                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                          Choose A Diagnostic Or Type Anything Below:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {QUICK_STARTERS.map((q, qIdx) => (
                            <button
                              key={qIdx}
                              disabled={loading}
                              onClick={() => handleStarterClick(q.prompt)}
                              className="group text-left p-3.5 rounded-2xl bg-white dark:bg-surface-dark-elevated hover:bg-gradient-to-br hover:from-white hover:to-brand-50/50 dark:hover:from-surface-dark-elevated dark:hover:to-brand-950/20 border border-slate-200/90 dark:border-border-dark hover:border-brand-500/40 dark:hover:border-border-dark-accent shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-1.5 active:scale-[0.99]"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors flex items-center gap-1.5">
                                  <span>{q.icon}</span>
                                  <span>{q.label}</span>
                                </span>
                                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                {q.subtitle}
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
                            {msg.projects.length} curated blueprint
                            {msg.projects.length > 1 ? 's' : ''}
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
                                    <span
                                      className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border shadow-2xs ${getDifficultyBadge(
                                        proj.difficulty
                                      )}`}
                                    >
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
                                    setExpandedProj((prev) => ({
                                      ...prev,
                                      [proj.id]: !isExpanded,
                                    }))
                                  }
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface-dark-elevated transition-colors shrink-0"
                                  title={isExpanded ? 'Collapse Blueprint' : 'Expand Blueprint'}
                                >
                                  <ChevronDown
                                    className={`w-4 h-4 transition-transform ${
                                      isExpanded ? 'rotate-180' : ''
                                    }`}
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
                                          <Layers className="w-3.5 h-3.5 text-brand-500" /> System
                                          Architecture & Concurrency
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
                                            <Cpu className="w-3.5 h-3.5 text-indigo-500" /> Component
                                            Topology Flow
                                          </p>
                                          <button
                                            onClick={() => {
                                              navigator.clipboard?.writeText(
                                                proj.architecture_diagram || ''
                                              );
                                              setCopiedTopoId(proj.id);
                                              setTimeout(() => setCopiedTopoId(null), 2000);
                                            }}
                                            className="text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors flex items-center gap-1 px-1.5 py-0.5 rounded"
                                            title="Copy topology flow"
                                          >
                                            {copiedTopoId === proj.id ? (
                                              <>
                                                <CheckCheck className="w-3 h-3 text-emerald-500" />
                                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                                  Copied
                                                </span>
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

                                    {proj.key_deliverables &&
                                      proj.key_deliverables.length > 0 && (
                                        <div>
                                          <p className="font-bold text-slate-500 dark:text-slate-400 text-[10px] uppercase mb-1.5 flex items-center gap-1.5">
                                            <Trophy className="w-3.5 h-3.5 text-emerald-500" />{' '}
                                            Measurable Interview Proof (Deliverables)
                                          </p>
                                          <ul className="space-y-1.5 text-slate-700 dark:text-slate-300 bg-white dark:bg-surface-dark p-3 rounded-xl border border-slate-200/80 dark:border-border-dark">
                                            {proj.key_deliverables.map((d, dIdx) => (
                                              <li key={dIdx} className="flex items-start gap-2">
                                                <span className="text-emerald-500 font-bold shrink-0">
                                                  ✓
                                                </span>
                                                <span>{d}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}

                                    {proj.github_blueprint &&
                                      proj.github_blueprint.length > 0 && (
                                        <div>
                                          <p className="font-bold text-slate-500 dark:text-slate-400 text-[10px] uppercase mb-1.5 flex items-center gap-1.5">
                                            <GitBranch className="w-3.5 h-3.5 text-indigo-500" />{' '}
                                            Recommended Repository Blueprint
                                          </p>
                                          <div className="bg-slate-900 dark:bg-surface-dark rounded-xl p-3 font-mono text-[11px] text-slate-200 dark:text-slate-300 border border-slate-800 dark:border-border-dark space-y-1 shadow-inner">
                                            {proj.github_blueprint.map((line, lIdx) => (
                                              <div key={lIdx} className="flex items-center gap-1">
                                                <span className="text-slate-500 select-none">
                                                  │{' '}
                                                </span>
                                                <span>{line}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                    {/* Interview Defense Section */}
                                    {(proj.interview_trap_question ||
                                      proj.staff_defense_answer) && (
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
                                            <span>
                                              Interview Defense: How Hiring Managers Grill You
                                            </span>
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
                                        <span className="text-emerald-600 dark:text-emerald-400">
                                          Copied README!
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                                        <span>Copy README</span>
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

                    {/* Dynamic Follow-up Suggestions (Only shown on the latest agent message) */}
                    {msg.suggested_prompts &&
                      msg.suggested_prompts.length > 0 &&
                      i === messages.length - 1 && (
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

            {/* SSE Token Streaming Bubble */}
            {loading && streamingContent && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 justify-start"
              >
                <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-500/20 border border-brand-200 dark:border-brand-500/30 flex items-center justify-center text-brand-600 dark:text-brand-400 shrink-0 mt-0.5 shadow-2xs">
                  <Skull className="w-4 h-4" />
                </div>
                <div className="max-w-[94%] sm:max-w-[85%] space-y-3.5">
                  <div className="rounded-2xl px-4 sm:px-5 py-3.5 text-sm leading-relaxed bg-white dark:bg-surface-dark-elevated border border-slate-200/90 dark:border-border-dark text-slate-800 dark:text-slate-100 rounded-tl-sm shadow-sm">
                    <FormattedMessage content={streamingContent} />
                    <span className="inline-block w-2 h-4 ml-1 bg-brand-500 rounded-xs animate-pulse align-middle" />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Dynamic Realistic Thinking Indicator (Before first token arrives) */}
            {loading && !streamingContent && (
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

          {/* Quick Ideas Collapsible Drawer */}
          <AnimatePresence>
            {showQuickIdeas && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="px-4 py-3 bg-slate-50 dark:bg-surface-dark-elevated border-t border-slate-200 dark:border-border-dark flex flex-wrap gap-2 text-xs"
              >
                <div className="w-full flex items-center justify-between pb-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                    Recommended Diagnostic Prompts:
                  </span>
                  <button
                    onClick={() => setShowQuickIdeas(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                  >
                    ✕
                  </button>
                </div>
                {QUICK_STARTERS.map((q, qIdx) => (
                  <button
                    key={qIdx}
                    onClick={() => handleStarterClick(q.prompt)}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark hover:border-brand-400 text-slate-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 text-left font-medium transition-all shadow-2xs"
                  >
                    {q.icon} {q.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Clean Input Box */}
          <div className="p-3 sm:p-4 border-t border-slate-200/80 dark:border-border-dark bg-white dark:bg-surface-dark-card shrink-0">
            <div className="flex gap-2 items-end bg-slate-50 dark:bg-surface-dark-elevated border border-slate-200/90 dark:border-border-dark rounded-2xl p-2.5 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 dark:focus-within:border-brand-500/40 transition-all shadow-2xs">
              <button
                type="button"
                onClick={() => setShowQuickIdeas(!showQuickIdeas)}
                className={`p-2 rounded-xl transition-all shrink-0 ${
                  showQuickIdeas
                    ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                    : 'text-slate-400 hover:text-amber-500 hover:bg-slate-200/60 dark:hover:bg-surface-dark'
                }`}
                title="Toggle Quick Diagnostic Prompts"
              >
                <Lightbulb className="w-4 h-4" />
              </button>

              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                placeholder="Ask about your resume, target role gaps, or ask what to build... (Enter to send)"
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
                Press{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-surface-dark border border-slate-200 dark:border-white/10 font-mono text-[10px]">
                  Enter ↵
                </kbd>{' '}
                to send,{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-surface-dark border border-slate-200 dark:border-white/10 font-mono text-[10px]">
                  Shift + Enter
                </kbd>{' '}
                for new line
              </span>
              <button
                type="button"
                onClick={() => setShowRoleModal(true)}
                className="text-slate-500 dark:text-slate-400 font-medium hover:text-brand-600 dark:hover:text-brand-400 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Click to switch target career track"
              >
                <span>Target Role:</span>
                <strong className="text-slate-800 dark:text-slate-200 underline decoration-dotted underline-offset-2">
                  {selectedRole}
                </strong>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: SAVED BLUEPRINTS TAB */}
      {activeTab === 'blueprints' && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/50 dark:bg-surface-dark/40 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-border-dark">
            <div>
              <h4 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <FolderGit2 className="w-5 h-5 text-brand-500" />
                Saved Portfolio Blueprints Hub
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Architectures saved from the Bar Raiser. Ready to build, document, and defend in
                interviews.
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800/60">
              {savedBlueprintItems.length} Blueprint{savedBlueprintItems.length !== 1 ? 's' : ''}
            </span>
          </div>

          {savedBlueprintItems.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-3xl bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800/60 flex items-center justify-center text-brand-600 dark:text-brand-400 shadow-md">
                <FolderGit2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h5 className="font-bold text-slate-900 dark:text-white text-base">
                  No Saved Blueprints Yet
                </h5>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  When the Career Villain recommends production blueprints in chat, click{' '}
                  <strong>"Save to My Plan"</strong> to store them here with full architectures,
                  README blueprints, and interview defense cheat sheets.
                </p>
              </div>
              <button
                onClick={() => {
                  setActiveTab('chat');
                  sendMessageWithText(
                    'Recommend standout portfolio projects with real industry tools tailored to my target role that will prove high engineering capability.'
                  );
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generate Production Blueprints in Chat →</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {savedBlueprintItems.map((proj) => (
                <div
                  key={proj.id}
                  className="rounded-2xl border border-slate-200 dark:border-border-dark bg-white dark:bg-surface-dark-card overflow-hidden shadow-sm"
                >
                  <div className="p-4 sm:p-5 flex items-start justify-between gap-3 border-b border-slate-100 dark:border-border-dark bg-gradient-to-r from-brand-50/30 to-white dark:from-brand-950/20 dark:to-surface-dark-card">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border shadow-2xs ${getDifficultyBadge(
                            proj.difficulty
                          )}`}
                        >
                          {proj.difficulty}
                        </span>
                        {proj.villain_pitch && (
                          <span className="text-xs text-brand-600 dark:text-brand-300 italic font-medium">
                            "{proj.villain_pitch}"
                          </span>
                        )}
                      </div>
                      <h4 className="text-slate-900 dark:text-white font-extrabold text-base">
                        {proj.title}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {proj.description}
                      </p>
                    </div>

                    <button
                      onClick={() => handleRemoveBlueprint(proj.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Remove from saved blueprints"
                    >
                      <Trash2 className="w-4 h-4" />
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

                  <div className="p-4 sm:p-5 space-y-3.5 text-xs bg-slate-50/20 dark:bg-surface-dark/30">
                    {proj.architecture_summary && (
                      <div>
                        <p className="font-bold text-slate-500 dark:text-slate-400 text-[10px] uppercase mb-1 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-brand-500" /> System Architecture
                        </p>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-surface-dark p-3 rounded-xl border border-slate-200/80 dark:border-border-dark">
                          {proj.architecture_summary}
                        </p>
                      </div>
                    )}

                    {proj.architecture_diagram && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-bold text-slate-500 dark:text-slate-400 text-[10px] uppercase flex items-center gap-1.5">
                            <Cpu className="w-3.5 h-3.5 text-indigo-500" /> Topology Flow
                          </p>
                          <button
                            onClick={() => {
                              navigator.clipboard?.writeText(proj.architecture_diagram || '');
                              setCopiedTopoId(proj.id);
                              setTimeout(() => setCopiedTopoId(null), 2000);
                            }}
                            className="text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors flex items-center gap-1"
                          >
                            {copiedTopoId === proj.id ? (
                              <>
                                <CheckCheck className="w-3 h-3 text-emerald-500" />
                                <span className="text-emerald-500 font-medium">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Topology</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div className="bg-slate-950 rounded-xl p-3 font-mono text-[11px] text-emerald-400 border border-slate-800 overflow-x-auto leading-relaxed">
                          {proj.architecture_diagram}
                        </div>
                      </div>
                    )}

                    {proj.key_deliverables && proj.key_deliverables.length > 0 && (
                      <div>
                        <p className="font-bold text-slate-500 dark:text-slate-400 text-[10px] uppercase mb-1 flex items-center gap-1.5">
                          <Trophy className="w-3.5 h-3.5 text-emerald-500" /> Deliverables to Prove
                          in Interviews
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

                    {/* Interview Defense */}
                    {(proj.interview_trap_question || proj.staff_defense_answer) && (
                      <div className="space-y-2 p-3 bg-white dark:bg-surface-dark rounded-xl border border-slate-200/90 dark:border-border-dark">
                        {proj.interview_trap_question && (
                          <div>
                            <p className="text-[10px] font-black uppercase text-red-600 dark:text-red-400 mb-0.5">
                              🚨 Interviewer Trap Question:
                            </p>
                            <p className="text-xs text-slate-800 dark:text-slate-200 font-semibold italic">
                              "{proj.interview_trap_question}"
                            </p>
                          </div>
                        )}
                        {proj.staff_defense_answer && (
                          <div className="pt-1.5 border-t border-slate-100 dark:border-white/5">
                            <p className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 mb-0.5">
                              🛡️ How to Defend This Like a Staff Engineer:
                            </p>
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                              {proj.staff_defense_answer}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="px-4 sm:px-5 py-3 border-t border-slate-100 dark:border-border-dark bg-slate-50/80 dark:bg-surface-dark flex flex-wrap items-center justify-between gap-2.5">
                    <button
                      onClick={() => handleCopyReadme(proj)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-surface-dark-elevated hover:bg-slate-100 dark:hover:bg-surface-dark text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all border border-slate-200 dark:border-border-dark shadow-2xs"
                    >
                      {copiedId === proj.id ? (
                        <>
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400">
                            Copied README.md!
                          </span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Copy Complete README.md Blueprint</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('chat');
                        sendMessageWithText(
                          `Tell me how to build "${proj.title}" step by step. What are the critical architectural pitfalls and what interview questions will hiring managers ask me about this?`
                        );
                      }}
                      className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-brand-50 dark:bg-brand-950/50 border border-brand-200 dark:border-brand-800/50 shadow-2xs"
                    >
                      <Flame className="w-3.5 h-3.5 text-brand-500" />
                      <span>Ask How to Build This in Chat →</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Target Role Selection Modal */}
      <AnimatePresence>
        {showRoleModal && (
          <div
            onClick={() => setShowRoleModal(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm transition-all"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="w-full max-w-xl sm:max-w-2xl bg-white dark:bg-surface-dark-card border border-slate-200/90 dark:border-border-dark rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto scrollbar-thin"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-3.5 border-b border-slate-100 dark:border-border-dark gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-brand-500/25 ring-2 ring-brand-500/20 shrink-0">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-base text-slate-900 dark:text-white tracking-tight">
                        Select Target Career Track
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/80 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800/60">
                        8 Tracks Available
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pt-0.5">
                      The Villain bar raiser will audit your resume, pinpoint gaps, and recommend blueprints tailored to this track.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRoleModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface-dark transition-colors shrink-0"
                  title="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 8-Card Balanced (4x2) Preset Tracks Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {POPULAR_TARGET_ROLES.map((r) => {
                  const isSelected =
                    selectedRole.toLowerCase() === r.title.toLowerCase() ||
                    selectedRole.toLowerCase().includes(r.id.toLowerCase());

                  return (
                    <button
                      key={r.id}
                      onClick={() => handleSelectRole(r.title)}
                      className={`group relative p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-br from-brand-50/90 to-brand-100/50 dark:from-brand-950/60 dark:to-brand-900/40 border-brand-500 dark:border-brand-500 shadow-md ring-2 ring-brand-500/20'
                          : 'bg-white dark:bg-surface-dark hover:bg-slate-50 dark:hover:bg-surface-dark-elevated border-slate-200/90 dark:border-border-dark hover:border-brand-400/50 dark:hover:border-border-dark-accent shadow-2xs hover:shadow-sm'
                      }`}
                    >
                      {/* Icon container */}
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-surface-dark-card border border-slate-200/80 dark:border-white/10 flex items-center justify-center text-xl shadow-2xs shrink-0 group-hover:scale-105 transition-transform">
                        {r.icon}
                      </div>

                      {/* Role info */}
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${r.badgeClass}`}
                          >
                            {r.badge}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white leading-snug pt-1 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                          {r.title}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono pt-0.5 truncate">
                          {r.techHint}
                        </p>
                      </div>

                      {/* Active indicator */}
                      {isSelected && (
                        <span className="absolute top-3 right-3 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-brand-600 text-white shadow-2xs">
                          <Check className="w-2.5 h-2.5" />
                          <span>Active</span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Custom Role Input Box */}
              <div className="pt-3 border-t border-slate-100 dark:border-border-dark space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                    Targeting a Different Title or Company Level?
                  </span>
                  <span className="text-[10px] text-slate-400">e.g. Staff AI Architect, Lead Platform Eng</span>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={customRoleInput}
                      onChange={(e) => setCustomRoleInput(e.target.value)}
                      placeholder="Type custom role title (e.g. Senior Machine Learning Engineer at FAANG)..."
                      className="w-full bg-slate-50 dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 font-medium transition-all"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && customRoleInput.trim()) {
                          handleSelectRole(customRoleInput.trim());
                          setCustomRoleInput('');
                        }
                      }}
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (customRoleInput.trim()) {
                        handleSelectRole(customRoleInput.trim());
                        setCustomRoleInput('');
                      }
                    }}
                    disabled={!customRoleInput.trim()}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 via-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-md shadow-brand-500/20 active:scale-95 cursor-pointer shrink-0 flex items-center gap-1.5"
                  >
                    <span>Set Target</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VillainAgent;
