import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  FileText,
  Target,
  BarChart3,
  CheckCircle2,
  Compass,
  Code2,
  Cpu,
  Layers,
  ShieldCheck,
  ChevronDown,
  Zap,
  Award,
  Terminal,
  Sparkles,
} from 'lucide-react';

import { Button } from '../components/common/Button';
import { Logo } from '../components/common/Logo';

export const LandingPage: React.FC = () => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const tracks = [
    {
      title: 'Full Stack Engineering',
      desc: 'System flow, REST/GraphQL, database indexing, caching strategies, and frontend state synchronization.',
      icon: Layers,
      skills: ['React', 'Node.js', 'PostgreSQL', 'System Design'],
    },
    {
      title: 'Backend & Distributed Systems',
      desc: 'High-throughput architecture, microservices, concurrency, message queues, and consensus protocols.',
      icon: Cpu,
      skills: ['Go / Python', 'Kafka', 'Redis', 'Distributed Data'],
    },
    {
      title: 'Frontend Architecture',
      desc: 'Component design systems, web performance, Core Web Vitals, memory leak profiling, and browser internals.',
      icon: Code2,
      skills: ['TypeScript', 'Next.js', 'Performance', 'DOM APIs'],
    },
    {
      title: 'Machine Learning & AI',
      desc: 'LLM fine-tuning, RAG pipelines, model deployment, vector embeddings, and evaluation benchmarks.',
      icon: Sparkles,
      skills: ['PyTorch', 'LangChain', 'Vector DBs', 'Model Serving'],
    },
    {
      title: 'Cloud & DevOps Engineering',
      desc: 'Kubernetes orchestration, CI/CD security, infrastructure as code, observability, and cloud cost tuning.',
      icon: Terminal,
      skills: ['Kubernetes', 'Terraform', 'AWS/GCP', 'Observability'],
    },
    {
      title: 'Staff+ System Design',
      desc: 'Large-scale distributed design, trade-off reasoning, fault tolerance, reliability, and CAP theorem.',
      icon: Award,
      skills: ['High Scalability', 'Fault Tolerance', 'SLA/SLO', 'Event Sourcing'],
    },
  ];

  const steps = [
    {
      number: '01',
      title: 'Upload Resume & Calibrate Track',
      desc: 'Drop your PDF resume to instantly extract past technologies and career highlights, or pick a specialized role track and seniority level.',
      icon: FileText,
    },
    {
      number: '02',
      title: 'Live Adaptive AI Interview',
      desc: 'Engage in a dynamic technical conversation. The AI probes deeper when you excel, or pivots gracefully to test foundational fundamentals.',
      icon: Zap,
    },
    {
      number: '03',
      title: 'Comprehensive Evaluation Report',
      desc: 'Get immediate granular scoring across Technical Depth, Clarity, Problem-Solving, and Edge-Case awareness with actionable coaching.',
      icon: BarChart3,
    },
  ];

  const faqs = [
    {
      question: 'How does the adaptive difficulty algorithm work?',
      answer:
        'Mockora tracks your technical accuracy, depth, and communication on every turn. When you give an insightful answer, the interviewer dynamically challenges you with advanced follow-ups (e.g., edge cases, race conditions, scaling limits). If an area is shaky, it gauges your core foundation without getting stuck.',
    },
    {
      question: 'Does the interview evaluate real code or architectural design?',
      answer:
        'Yes! Mockora supports both technical reasoning, coding algorithms, and architectural system design questions tailored to your chosen seniority level from Junior to Staff Engineer.',
    },
    {
      question: 'Can I upload my own custom resume?',
      answer:
        'Absolutely. You can upload your PDF resume, and Mockora extracts your tech stack, past achievements, and project highlights to ask realistic, resume-grounded interview questions just like real tech companies.',
    },
    {
      question: 'Is my interview history and resume kept private?',
      answer:
        'Your privacy is our priority. Your resumes, mock sessions, audio, and performance reports are strictly private and isolated to your authenticated account.',
    },
  ];

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-white text-slate-900 transition-colors duration-200 dark:bg-surface-dark dark:text-slate-100">
      {/* ───────────────────────── AMBIENT GLOWS ───────────────────────── */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 top-24 h-[500px] w-[500px] rounded-full bg-red-100/50 blur-3xl dark:bg-brand-950/20" />
        <div className="absolute right-[-180px] top-20 h-[650px] w-[650px] rounded-full bg-rose-100/50 blur-3xl dark:bg-brand-900/15" />
        <div className="absolute bottom-[-250px] left-1/3 h-[500px] w-[700px] rounded-full bg-red-50/70 blur-3xl dark:bg-brand-950/15" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_35%,rgba(254,226,226,0.45),transparent_35%)] dark:bg-[radial-gradient(circle_at_70%_35%,rgba(239,68,68,0.06),transparent_40%)]" />
      </div>

      {/* ───────────────────────── HERO SECTION ───────────────────────── */}
      <main className="relative z-10">
        <section className="mx-auto flex min-h-[calc(100vh-14rem)] max-w-7xl items-center px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
          <div className="grid w-full items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-8">
            {/* ───────────── LEFT CONTENT ───────────── */}
            <motion.div
              className="relative z-10 max-w-2xl"
              initial={{ opacity: 0, x: -35 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.65, ease: 'easeOut' }}
            >
              {/* Heading */}
              <h1 className="max-w-[650px] text-5xl font-black leading-[1.02] tracking-[-0.035em] text-slate-950 sm:text-6xl lg:text-[4rem] xl:text-[4.35rem] dark:text-white">
                Master Technical
                <br />
                Interviews with
                <br />
                <span className="text-brand-600 dark:text-brand-500">
                  AI-Powered
                </span>
                <br />
                <span className="text-brand-600 dark:text-brand-500">
                  Adaptive Practice
                </span>
              </h1>

              {/* Description */}
              <p className="mt-7 max-w-xl text-base leading-7 text-slate-600 sm:text-lg dark:text-slate-300">
                Upload your resume, choose your target role, and practice with
                an AI interviewer that adapts questions dynamically based on your answers,
                skills, and knowledge gaps.
              </p>

              {/* CTA Buttons */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link to="/signup">
                  <Button
                    size="lg"
                    className="group rounded-full bg-brand-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-brand-500/30 transition-all hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-brand-500/40 dark:bg-brand-500 dark:hover:bg-brand-600"
                  >
                    Start Free Practice
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>

                <Link to="/roles">
                  <Button
                    variant="outline"
                    size="lg"
                    className="rounded-full border-slate-300 bg-white/80 px-7 py-4 text-base font-semibold text-slate-700 backdrop-blur-sm transition-all hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:bg-surface-dark-card/80 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-white"
                  >
                    <Compass className="mr-2 h-5 w-5 text-brand-500" />
                    Explore Roles
                  </Button>
                </Link>
              </div>

              {/* Feature Strip */}
              <div className="mt-10 grid max-w-2xl grid-cols-1 gap-5 sm:grid-cols-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      Resume Aware
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Personalized questions
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
                    <Target className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      Role Specific
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Tailored to your goals
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      Adaptive Practice
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Focus on weak areas
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ───────────── RIGHT HERO IMAGE + FLOATING BADGES ───────────── */}
            <motion.div
              className="relative flex w-full items-center justify-center lg:justify-end"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.75, delay: 0.1, ease: 'easeOut' }}
            >
              {/* Soft Glow Behind Robot */}
              <div className="absolute right-5 top-1/2 h-[430px] w-[430px] -translate-y-1/2 rounded-full bg-red-100/70 blur-3xl dark:bg-brand-950/30" />

              {/* Floating Badge Top Left */}
              <motion.div
                className="absolute left-2 top-8 z-20 hidden rounded-2xl border border-white/60 bg-white/90 p-3.5 shadow-xl shadow-slate-200/50 backdrop-blur-md sm:flex sm:items-center sm:gap-3 dark:border-white/10 dark:bg-surface-dark-card/90 dark:shadow-none"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Live Adaptive Evaluation
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Dynamic difficulty scaling
                  </p>
                </div>
              </motion.div>

              {/* Floating Badge Bottom Right */}
              <motion.div
                className="absolute -bottom-4 right-4 z-20 hidden rounded-2xl border border-white/60 bg-white/90 p-3.5 shadow-xl shadow-slate-200/50 backdrop-blur-md sm:flex sm:items-center sm:gap-3 dark:border-white/10 dark:bg-surface-dark-card/90 dark:shadow-none"
                animate={{ y: [0, 6, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Evaluation Score: 94 / 100
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Deep Architectural Trade-offs
                  </p>
                </div>
              </motion.div>

              <motion.img
                src="/mockora-ai-interviewer.png"
                alt="Mockora AI adaptive interviewer"
                className="relative z-10 w-full max-w-[580px] object-contain select-none sm:max-w-[620px] lg:max-w-[660px]"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                draggable={false}
              />
            </motion.div>
          </div>
        </section>

        {/* ───────────────────────── METRICS / SOCIAL PROOF ───────────────────────── */}
        <section className="relative z-10 border-y border-slate-100 bg-slate-50/60 py-10 dark:border-white/5 dark:bg-surface-dark-card/30">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              <div className="text-center">
                <p className="text-3xl font-extrabold text-slate-950 sm:text-4xl dark:text-white">
                  10,000+
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm dark:text-slate-400">
                  Mock Questions Evaluated
                </p>
              </div>

              <div className="text-center">
                <p className="text-3xl font-extrabold text-brand-600 sm:text-4xl dark:text-brand-400">
                  15+
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm dark:text-slate-400">
                  Specialized Engineering Tracks
                </p>
              </div>

              <div className="text-center">
                <p className="text-3xl font-extrabold text-slate-950 sm:text-4xl dark:text-white">
                  94%
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm dark:text-slate-400">
                  Candidate Confidence Rate
                </p>
              </div>

              <div className="text-center">
                <p className="text-3xl font-extrabold text-brand-600 sm:text-4xl dark:text-brand-400">
                  &lt; 1.5s
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm dark:text-slate-400">
                  Adaptive Feedback Latency
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ───────────────────────── HOW IT WORKS ───────────────────────── */}
        <section className="relative z-10 py-24 sm:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-2xl text-center">
              <span className="text-xs font-extrabold uppercase tracking-widest text-brand-600 dark:text-brand-400">
                How It Works
              </span>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl dark:text-white">
                From Preparation to Offer in 3 Steps
              </h2>
              <p className="mt-4 text-base text-slate-600 dark:text-slate-400">
                Experience technical interviews that simulate real hiring managers, complete with adaptive follow-ups and comprehensive scorecards.
              </p>
            </div>

            <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.number}
                    className="relative flex flex-col rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:border-brand-200 hover:shadow-md dark:border-white/5 dark:bg-surface-dark-card dark:hover:border-brand-500/20"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-3xl font-black text-brand-100 dark:text-white/10">
                        {step.number}
                      </span>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400">
                        <Icon className="h-6 w-6" />
                      </div>
                    </div>
                    <h3 className="mt-6 text-xl font-bold text-slate-900 dark:text-white">
                      {step.title}
                    </h3>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {step.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ───────────────────────── INTERACTIVE EVALUATION SHOWCASE ───────────────────────── */}
        <section className="relative z-10 border-t border-slate-100 bg-slate-50/50 py-24 sm:py-28 dark:border-white/5 dark:bg-surface-dark-card/20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
              <div className="lg:col-span-5">
                <span className="text-xs font-extrabold uppercase tracking-widest text-brand-600 dark:text-brand-400">
                  Live Intelligence
                </span>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">
                  See How the AI Evaluates Your Answers
                </h2>
                <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-400">
                  Mockora doesn’t just look for buzzwords. It evaluates technical accuracy, architectural trade-offs, and communication clarity to provide human-caliber interview feedback.
                </p>

                <div className="mt-8 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      <strong className="font-semibold text-slate-950 dark:text-white">Adaptive Follow-ups:</strong> Questions evolve dynamically based on the depth of your prior answers.
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      <strong className="font-semibold text-slate-950 dark:text-white">Multi-Dimensional Scoring:</strong> Get scored across Technical Accuracy, Depth, Communication, and Edge-Case Coverage.
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      <strong className="font-semibold text-slate-950 dark:text-white">Actionable Coaching:</strong> Precise feedback notes showing what was missing and how to phrase ideal answers.
                    </p>
                  </div>
                </div>

                <div className="mt-8">
                  <Link to="/signup">
                    <Button variant="primary" className="rounded-full">
                      Try An Interactive Session
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Mockup Card */}
              <div className="lg:col-span-7">
                <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/50 dark:border-white/10 dark:bg-surface-dark-card dark:shadow-none">
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4 dark:border-white/5 dark:bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-red-400" />
                      <div className="h-3 w-3 rounded-full bg-amber-400" />
                      <div className="h-3 w-3 rounded-full bg-emerald-400" />
                      <span className="ml-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                        Senior Distributed Systems · Question 3 of 5
                      </span>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                      Live Session
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 space-y-5 sm:p-8">
                    {/* Question Box */}
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-white/5 dark:bg-surface-dark">
                      <div className="flex items-center gap-2 text-xs font-bold text-brand-600 dark:text-brand-400">
                        <Cpu className="h-4 w-4" />
                        INTERVIEWER QUESTION
                      </div>
                      <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                        "How would you handle cache stampede and herd effects on high-traffic Redis key expiries in a microservices architecture?"
                      </p>
                    </div>

                    {/* Candidate Answer Sample */}
                    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-surface-dark-elevated">
                      <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        CANDIDATE RESPONSE
                      </div>
                      <p className="mt-2 text-xs text-slate-700 leading-relaxed dark:text-slate-300">
                        "I would implement mutual exclusion locks (Redlock or distributed mutex) so only one worker recomputes the database query upon cache miss. Alternatively, we can use probabilistic early expiration (XFetch algorithm) so hot keys are refreshed in background threads before hard TTL expiry."
                      </p>
                    </div>

                    {/* AI Feedback Breakdown */}
                    <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-4 dark:border-brand-500/20 dark:bg-brand-950/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-brand-700 dark:text-brand-300">
                          <Sparkles className="h-4 w-4" />
                          ADAPTIVE AI EVALUATION
                        </div>
                        <span className="text-xs font-black text-brand-600 dark:text-brand-400">
                          Overall: 94 / 100
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <div className="rounded-xl bg-white/80 p-2 text-center shadow-xs dark:bg-surface-dark-card">
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">Technical Depth</p>
                          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">96%</p>
                        </div>
                        <div className="rounded-xl bg-white/80 p-2 text-center shadow-xs dark:bg-surface-dark-card">
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">Architecture</p>
                          <p className="text-xs font-bold text-brand-600 dark:text-brand-400">94%</p>
                        </div>
                        <div className="rounded-xl bg-white/80 p-2 text-center shadow-xs dark:bg-surface-dark-card">
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">Clarity</p>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">92%</p>
                        </div>
                      </div>

                      <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
                        <strong className="text-slate-900 dark:text-white">Interviewer Note:</strong> Excellent mention of the XFetch algorithm. Next follow-up will probe fallback behavior during Redis cluster partitioning.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ───────────────────────── ROLE CATALOGUE ───────────────────────── */}
        <section className="relative z-10 py-24 sm:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
              <div className="max-w-xl">
                <span className="text-xs font-extrabold uppercase tracking-widest text-brand-600 dark:text-brand-400">
                  Specialized Tracks
                </span>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">
                  Tailored For Top Tech Roles
                </h2>
                <p className="mt-3 text-base text-slate-600 dark:text-slate-400">
                  Select your exact target specialization to receive industry-relevant questions designed to mirror top tech hiring standards.
                </p>
              </div>

              <Link to="/roles">
                <Button variant="outline" className="rounded-full">
                  Browse All Tracks
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {tracks.map((track) => {
                const Icon = track.icon;
                return (
                  <div
                    key={track.title}
                    className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-7 shadow-sm transition-all hover:-translate-y-1 hover:border-brand-200 hover:shadow-md dark:border-white/5 dark:bg-surface-dark-card dark:hover:border-brand-500/20"
                  >
                    <div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white dark:bg-brand-950/50 dark:text-brand-400 dark:group-hover:bg-brand-500 dark:group-hover:text-white">
                        <Icon className="h-6 w-6" />
                      </div>
                      <h3 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">
                        {track.title}
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                        {track.desc}
                      </p>
                    </div>

                    <div className="mt-6 pt-5 border-t border-slate-100 dark:border-white/5">
                      <div className="flex flex-wrap gap-1.5">
                        {track.skills.map((skill) => (
                          <span
                            key={skill}
                            className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-white/5 dark:text-slate-300"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ───────────────────────── FREQUENTLY ASKED QUESTIONS ───────────────────────── */}
        <section className="relative z-10 border-t border-slate-100 bg-slate-50/50 py-24 sm:py-28 dark:border-white/5 dark:bg-surface-dark-card/20">
          <div className="mx-auto max-w-4xl px-5 sm:px-8 lg:px-10">
            <div className="text-center">
              <span className="text-xs font-extrabold uppercase tracking-widest text-brand-600 dark:text-brand-400">
                Got Questions?
              </span>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">
                Frequently Asked Questions
              </h2>
              <p className="mt-3 text-base text-slate-600 dark:text-slate-400">
                Everything you need to know about practicing with Mockora.
              </p>
            </div>

            <div className="mt-14 space-y-4">
              {faqs.map((faq, index) => {
                const isOpen = activeFaq === index;
                return (
                  <div
                    key={faq.question}
                    className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white transition-colors dark:border-white/5 dark:bg-surface-dark-card"
                  >
                    <button
                      type="button"
                      onClick={() => toggleFaq(index)}
                      className="flex w-full items-center justify-between p-6 text-left"
                    >
                      <span className="text-base font-bold text-slate-900 dark:text-white">
                        {faq.question}
                      </span>
                      <ChevronDown
                        className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-brand-600' : ''
                        }`}
                      />
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="border-t border-slate-100 px-6 pb-6 pt-3 text-sm leading-relaxed text-slate-600 dark:border-white/5 dark:text-slate-400">
                            {faq.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ───────────────────────── BOTTOM HIGH-CONVERTING CTA BANNER ───────────────────────── */}
        <section className="relative z-10 py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-red-600 via-rose-600 to-red-700 px-8 py-16 text-center text-white shadow-2xl shadow-red-500/25 sm:px-16 sm:py-20">
              {/* Background ambient pattern */}
              <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-black/10 blur-2xl" />

              <div className="relative z-10 mx-auto max-w-3xl">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-1 text-xs font-semibold backdrop-blur-md">
                  <ShieldCheck className="h-4 w-4" />
                  Free 100% Interactive Evaluation
                </span>

                <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-5xl">
                  Ready to Land Your Dream Tech Offer?
                </h2>

                <p className="mx-auto mt-5 max-w-xl text-base text-red-50 sm:text-lg">
                  Join thousands of software engineers practicing with adaptive AI before stepping into high-stakes interviews.
                </p>

                <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
                  <Link to="/signup">
                    <Button
                      size="lg"
                      className="rounded-full bg-white px-9 py-4 text-base font-bold text-red-600 shadow-xl transition-all hover:-translate-y-0.5 hover:bg-red-50"
                    >
                      Start Free Practice Now
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link to="/roles">
                    <Button
                      variant="outline"
                      size="lg"
                      className="rounded-full border-white/40 bg-white/10 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm hover:bg-white/20"
                    >
                      Browse Roles
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ───────────────────────── FOOTER ───────────────────────── */}
      <footer className="relative z-20 border-t border-slate-200/80 bg-white/70 backdrop-blur-sm dark:border-white/5 dark:bg-surface-dark-card/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-6 sm:flex-row sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <Logo size="xs" showText={true} />
            <span className="text-xs text-slate-400 dark:text-slate-500">
              © {new Date().getFullYear()} Mockora.ai. All rights reserved.
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-500 dark:text-slate-400">
            <Link to="/roles" className="transition-colors hover:text-brand-600 dark:hover:text-brand-400">
              Tracks
            </Link>
            <Link to="/login" className="transition-colors hover:text-brand-600 dark:hover:text-brand-400">
              Sign In
            </Link>
            <Link to="/signup" className="transition-colors hover:text-brand-600 dark:hover:text-brand-400">
              Get Started
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;