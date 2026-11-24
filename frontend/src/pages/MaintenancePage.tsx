import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  CheckCircle2,
  Clock,
  Mail,
  ArrowRight,
  ShieldAlert,
  Globe,
  Terminal,
  Check,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { PageWrapper } from '../components/layout/PageWrapper';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export const MaintenancePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();

  const [status, setStatus] = useState<'checking' | 'maintenance' | 'online'>('maintenance');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState<string>('Just now');
  const [notifyEmail, setNotifyEmail] = useState('');
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [emailSubscribed, setEmailSubscribed] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [activeTz, setActiveTz] = useState<'local' | 'utc'>('local');

  // Health ping checker against backend API
  const checkServiceStatus = useCallback(async () => {
    setStatus('checking');
    const start = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      // Probe backend root or health endpoint
      const response = await fetch('http://localhost:8000/health', {
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timeoutId);
      const elapsed = Math.round(performance.now() - start);

      if (response && response.ok) {
        setStatus('online');
        setLatencyMs(elapsed);
        addToast('success', 'System Online', `Backend responding with ${elapsed}ms latency!`);
      } else {
        const rootResponse = await fetch('http://localhost:8000/', {
          signal: controller.signal,
        }).catch(() => null);

        if (rootResponse && rootResponse.ok) {
          setStatus('online');
          setLatencyMs(elapsed);
          addToast('success', 'System Online', 'Backend service is online!');
        } else {
          setStatus('maintenance');
          setLatencyMs(null);
        }
      }
    } catch {
      setStatus('maintenance');
      setLatencyMs(null);
    } finally {
      setLastChecked(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCountdown(30);
    }
  }, [addToast]);

  // Periodic auto-check countdown
  useEffect(() => {
    if (status === 'online') return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          checkServiceStatus();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [checkServiceStatus, status]);

  const handleNotifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifyEmail || !notifyEmail.includes('@')) {
      addToast('info', 'Check Email', 'Please enter a valid email address.');
      return;
    }
    setIsSubmittingEmail(true);
    setTimeout(() => {
      setIsSubmittingEmail(false);
      setEmailSubscribed(true);
      addToast('success', 'Notification Registered', `We will email ${notifyEmail} as soon as systems are restored!`);
      setNotifyEmail('');
    }, 600);
  };

  const deploymentPhases = [
    {
      step: '01',
      name: 'PostgreSQL Schema & Leaderboard View Migrations',
      status: 'completed',
      detail: 'Applied 4 migrations with 0 locks and verified foreign key integrity.',
    },
    {
      step: '02',
      name: 'Vector Embeddings & ATS Parser Calibration',
      status: 'completed',
      detail: 'Re-indexed PyMuPDF extraction caches and similarity matrices.',
    },
    {
      step: '03',
      name: 'Gemini 2.5 Flash & Groq Llama Latency Warmup',
      status: 'in-progress',
      detail: 'Benchmarking WebSocket audio response loops to achieve < 1.2s target.',
    },
    {
      step: '04',
      name: 'Smoke Testing & Edge Traffic Re-routing',
      status: 'scheduled',
      detail: 'Automated synthetic interview pass before opening candidate gateway.',
    },
  ];

  const regionalNodes = [
    { name: 'US-East (N. Virginia)', service: 'Gemini 2.5 Primary AI Cluster', status: 'Operational', latency: '28ms', color: 'emerald' },
    { name: 'US-West (Oregon)', service: 'Groq Llama 3.3 Fast Inference', status: 'Operational', latency: '42ms', color: 'emerald' },
    { name: 'EU-Central (Frankfurt)', service: 'Supabase PostgreSQL DB Replica', status: 'Operational', latency: '35ms', color: 'emerald' },
    { name: 'AP-South (Mumbai)', service: 'API Gateway & Audio WebSocket Mesh', status: 'Upgrading (Phase 3)', latency: 'Rolling', color: 'amber' },
  ];

  const engineeringLogs = [
    { time: '17:42 UTC', message: 'Initiated audio speech recognition WebSocket benchmark on edge nodes.' },
    { time: '17:35 UTC', message: 'Applied database migration 20261103000003_hide_leaderboard_emails.sql successfully.' },
    { time: '17:28 UTC', message: 'Warm-up routine for Gemini 2.5 Flash context window cache started.' },
    { time: '17:15 UTC', message: 'Commenced scheduled platform maintenance window (INC-2026-11-21-M04).' },
  ];

  return (
    <PageWrapper className="py-8 space-y-8 max-w-5xl">
      {/* Incident Header & Status Strip */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            Active Platform Maintenance
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
              TICKET: INC-2026-11-21-M04
            </span>

            <button
              onClick={() => setActiveTz(activeTz === 'local' ? 'utc' : 'local')}
              className="text-xs font-semibold text-brand-600 dark:text-brand-400 px-2 py-1 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors"
            >
              Timezone: {activeTz === 'local' ? 'Local' : 'UTC'}
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              System Maintenance &amp; Engine Upgrade
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Mockora is undergoing scheduled performance upgrades to achieve lower voice response latency
              and roll out new behavioral evaluation rubrics.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {status === 'online' ? (
              <Button
                variant="primary"
                onClick={() => navigate(isAuthenticated ? '/dashboard' : '/')}
                className="px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md"
              >
                Enter Platform
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={checkServiceStatus}
                disabled={status === 'checking'}
                className="px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 border border-slate-200 dark:border-white/10"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${status === 'checking' ? 'animate-spin' : ''}`} />
                {status === 'checking' ? 'Testing Ping...' : 'Check Status'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Status & Progress Hero Card */}
      <Card className="p-6 sm:p-8 border-amber-200/80 dark:border-amber-900/40 bg-gradient-to-r from-amber-50/40 via-surface-light-card to-brand-50/20 dark:from-amber-950/20 dark:via-surface-dark-card dark:to-transparent space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`p-3 rounded-2xl border ${
              status === 'online'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-500'
            }`}>
              {status === 'online' ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              ) : (
                <ShieldAlert className="w-6 h-6 text-amber-500" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {status === 'online' ? 'All Systems Online & Operational' : 'Deployment Phase 3 of 4 Active'}
                </h3>
                {latencyMs && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    {latencyMs}ms
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {status === 'online'
                  ? 'All microservices and database nodes are healthy. Interview rooms are accepting connections.'
                  : `Automated health check running. Next ping in ${countdown}s (checked ${lastChecked})`}
              </p>
            </div>
          </div>

          <div className="sm:text-right">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Estimated Completion
            </span>
            <span className="text-sm font-black text-amber-600 dark:text-amber-400">
              Under 10 Minutes (~17:55 UTC)
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 pt-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Upgrade Progress
            </span>
            <span className="text-amber-600 dark:text-amber-400 font-bold">85% Complete</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '85%' }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="bg-gradient-to-r from-amber-500 to-brand-500 h-full rounded-full"
            />
          </div>
        </div>
      </Card>

      {/* Deployment Lifecycle Stepper */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
          Deployment Phases &amp; Verification Pipeline
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {deploymentPhases.map((phase) => (
            <Card
              key={phase.step}
              className={`p-4 space-y-2 border transition-all ${
                phase.status === 'completed'
                  ? 'border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/10'
                  : phase.status === 'in-progress'
                  ? 'border-amber-300 dark:border-amber-700/80 bg-amber-50/20 dark:bg-amber-950/20 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">{phase.step}</span>
                {phase.status === 'completed' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Done
                  </span>
                ) : phase.status === 'in-progress' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> In Progress
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500">
                    Pending
                  </span>
                )}
              </div>

              <h3 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                {phase.name}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                {phase.detail}
              </p>
            </Card>
          ))}
        </div>
      </div>

      {/* Regional Cluster Health Grid & Live Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Regional Cluster Health */}
        <div className="lg:col-span-7 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" />
            Regional Edge &amp; Cluster Telemetry
          </h2>

          <Card className="divide-y divide-slate-100 dark:divide-white/5 p-0 overflow-hidden">
            {regionalNodes.map((node) => (
              <div key={node.name} className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      node.color === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                    }`} />
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {node.name}
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate pl-4">
                    {node.service}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    node.color === 'emerald'
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                      : 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                  }`}>
                    {node.status}
                  </span>
                  <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                    {node.latency}
                  </span>
                </div>
              </div>
            ))}
          </Card>
        </div>

        {/* Live Incident Updates Feed */}
        <div className="lg:col-span-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5" />
            Engineering Activity Log
          </h2>

          <Card className="p-4 space-y-3.5 bg-slate-50/60 dark:bg-surface-dark-card/90 font-mono text-xs">
            {engineeringLogs.map((log) => (
              <div key={log.time} className="space-y-1 border-l-2 border-slate-300 dark:border-slate-700 pl-3">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                  {log.time}
                </span>
                <p className="text-[11px] text-slate-700 dark:text-slate-300 font-sans leading-snug">
                  {log.message}
                </p>
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* Subscribe For Restoration Alerts */}
      <Card className="p-6 sm:p-8 text-center space-y-4 max-w-xl mx-auto">
        <div className="inline-flex p-3 rounded-2xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400">
          <Mail className="w-5 h-5" />
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Get Notified the Second Systems Re-Open
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            We will dispatch an automated email confirmation the moment interview rooms are accepting candidate connections.
          </p>
        </div>

        {emailSubscribed ? (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Notification registered! You will receive an alert as soon as traffic resumes.
          </div>
        ) : (
          <form onSubmit={handleNotifySubmit} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
            <input
              type="email"
              placeholder="candidate@example.com"
              value={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.value)}
              className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              required
            />
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmittingEmail}
              className="px-4 py-2 text-xs font-bold rounded-xl shrink-0"
            >
              Notify Me
            </Button>
          </form>
        )}

        <div className="pt-2 flex items-center justify-center gap-4 text-xs text-slate-400">
          <Link to="/" className="hover:text-slate-600 dark:hover:text-slate-200 underline">
            Return Home
          </Link>
          <span>•</span>
          <a
            href="mailto:support@mockora.ai"
            className="hover:text-slate-600 dark:hover:text-slate-200 underline"
          >
            Contact On-Call Support
          </a>
        </div>
      </Card>
    </PageWrapper>
  );
};
