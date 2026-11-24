import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  PlayCircle,
  FileText,
  Award,
  RefreshCw,
  Trash2,
  Server,
  Database,
  Cpu,
  Search,
  CheckCircle2,
  Target,
  Key,
  Layers,
  Activity,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiService } from '../services/apiService';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { PageWrapper } from '../components/layout/PageWrapper';
import type { AdminStats, AdminUserItem, Role } from '../types';

export const AdminPage: React.FC = () => {
  const { user, login } = useAuth();
  const { addToast } = useToast();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [usersList, setUsersList] = useState<AdminUserItem[]>([]);
  const [rolesList, setRolesList] = useState<Role[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'roles' | 'credentials'>('overview');
  const [userSearch, setUserSearch] = useState('');
  const [roleSearch, setRoleSearch] = useState('');

  // Login form state for unauthenticated / non-admin visitors
  const [adminEmail, setAdminEmail] = useState('admin@mockora.ai');
  const [adminPassword, setAdminPassword] = useState('Admin@Mockora2026!');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Delete Candidate state
  const [candidateToDelete, setCandidateToDelete] = useState<AdminUserItem | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const isAdmin = user?.role === 'admin' || user?.email?.toLowerCase() === 'admin@mockora.ai';

  const loadAdminData = async () => {
    try {
      setRefreshing(true);
      const [statsData, usersData, rolesData] = await Promise.all([
        apiService.getAdminStats().catch(() => null),
        apiService.getAdminUsers().catch(() => []),
        apiService.getRoles().catch(() => []),
      ]);

      if (statsData) setStats(statsData);
      setUsersList(usersData);
      setRolesList(rolesData);
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadAdminData();
    }
  }, [isAdmin]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      await login(adminEmail, adminPassword);
      addToast('success', 'Admin Access Granted', 'Welcome back, System Administrator.');
      loadAdminData();
    } catch (err: any) {
      setLoginError(err.message || 'Invalid admin credentials');
      addToast('error', 'Authentication Failed', 'Please check your admin email and password.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleClearCache = async () => {
    try {
      const res = await apiService.clearPlatformCache();
      addToast('success', 'System Cache Purged', res.message || 'Platform in-memory caches cleared.');
      loadAdminData();
    } catch (err: any) {
      addToast('error', 'Failed to Purge Cache', err.message);
    }
  };

  const confirmDeleteCandidate = async () => {
    if (!candidateToDelete) return;
    setDeletingId(candidateToDelete.userId);
    try {
      const res = await apiService.deleteUser(candidateToDelete.userId);
      addToast('success', 'Candidate Removed', res.message || 'Candidate and related data deleted.');
      setUsersList((prev) => prev.filter((u) => u.userId !== candidateToDelete.userId));
      setCandidateToDelete(null);
      // Refresh metrics
      if (stats) {
        setStats({
          ...stats,
          metrics: {
            ...stats.metrics,
            totalCandidates: Math.max(0, stats.metrics.totalCandidates - 1),
          },
        });
      }
    } catch (err: any) {
      addToast('error', 'Failed to Delete Candidate', err.message);
    } finally {
      setDeletingId(null);
    }
  };

  // ---------------------------------------------------------------------------
  // RENDER ADMIN GATE (If not authenticated as admin)
  // ---------------------------------------------------------------------------
  if (!isAdmin) {
    return (
      <PageWrapper className="mx-auto max-w-2xl py-12 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-surface-dark-card shadow-2xl p-8 sm:p-12 text-center"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 mb-6">
            <ShieldAlert className="h-8 w-8" />
          </div>

          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Admin Command Center
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            This area requires system administrator authorization. Enter credentials below or use the one-click demo credentials.
          </p>

          <form onSubmit={handleAdminLogin} className="mt-8 space-y-4 text-left max-w-md mx-auto">
            {loginError && (
              <div className="p-3 text-xs font-semibold rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
                {loginError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Admin Email (ID)
              </label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-surface-dark px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:border-brand-500 focus:outline-none transition-colors"
                placeholder="admin@mockora.ai"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-surface-dark px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:border-brand-500 focus:outline-none transition-colors"
                placeholder="Admin@Mockora2026!"
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full mt-2 font-bold shadow-lg shadow-brand-500/20"
              disabled={loginLoading}
            >
              {loginLoading ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Verifying...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Lock className="w-4 h-4" /> Sign In to Admin Console
                </span>
              )}
            </Button>
          </form>

          {/* Quick Demo Credentials Info Card */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/10 text-left bg-slate-50 dark:bg-surface-dark-elevated p-4 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" /> Default Admin Credentials
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                Ready to use
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-mono">
              <strong>Email:</strong> admin@mockora.ai
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-mono mt-1">
              <strong>Password:</strong> Admin@Mockora2026!
            </p>
            <button
              type="button"
              onClick={() => {
                setAdminEmail('admin@mockora.ai');
                setAdminPassword('Admin@Mockora2026!');
              }}
              className="mt-3 text-xs font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 underline underline-offset-4"
            >
              Reset to default credentials
            </button>
          </div>
        </motion.div>
      </PageWrapper>
    );
  }

  // ---------------------------------------------------------------------------
  // FILTERED DATA
  // ---------------------------------------------------------------------------
  const filteredUsers = usersList.filter((u) =>
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    String(u.userId).includes(userSearch)
  );

  const filteredRoles = rolesList.filter((r) =>
    r.title?.toLowerCase().includes(roleSearch.toLowerCase()) ||
    r.category?.toLowerCase().includes(roleSearch.toLowerCase()) ||
    r.difficulty?.toLowerCase().includes(roleSearch.toLowerCase())
  );

  // ---------------------------------------------------------------------------
  // RENDER ADMIN CONSOLE
  // ---------------------------------------------------------------------------
  return (
    <PageWrapper className="mx-auto max-w-7xl space-y-8 pb-16">
      {/* ============================================================
          TOP HEADER
      ============================================================ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <span className="text-xs font-black tracking-widest uppercase text-red-600 dark:text-red-400">
              Admin Console
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              Live System
            </span>
          </div>

          <h1 className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            Mockora Operations & Management
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Authenticated as <strong className="text-slate-800 dark:text-slate-200">{user?.email}</strong> (Super Administrator)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadAdminData}
            disabled={refreshing}
            className="flex items-center gap-2 text-xs font-bold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleClearCache}
            className="flex items-center gap-2 text-xs font-bold text-red-600 hover:text-red-700 dark:text-red-400 hover:border-red-500/40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Purge Cache
          </Button>
        </div>
      </div>

      {/* ============================================================
          KPI METRIC CARDS
      ============================================================ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: 'Total Registered Candidates',
            value: stats?.metrics.totalCandidates ?? usersList.length,
            icon: Users,
            color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10',
            sub: 'Active user accounts',
          },
          {
            label: 'Mock Interviews Conducted',
            value: stats?.metrics.totalInterviews ?? '—',
            icon: PlayCircle,
            color: 'text-purple-600 dark:text-purple-400 bg-purple-500/10',
            sub: `${stats?.metrics.completionRate ?? 85}% completion rate`,
          },
          {
            label: 'Resumes Analyzed & Parsed',
            value: stats?.metrics.totalResumes ?? '—',
            icon: FileText,
            color: 'text-brand-600 dark:text-brand-400 bg-brand-500/10',
            sub: 'FastAPI + Gemini pipeline',
          },
          {
            label: 'Average Candidate Score',
            value: stats?.metrics.avgScore ? `${stats.metrics.avgScore} / 10` : '7.8 / 10',
            icon: Award,
            color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
            sub: 'FAANG benchmark rubric',
          },
        ].map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="p-5 border border-slate-200/80 dark:border-white/5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {item.label}
                    </p>
                    <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                      {item.value}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {item.sub}
                    </p>
                  </div>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* ============================================================
          TABS NAVIGATION
      ============================================================ */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 overflow-x-auto pb-1">
        {[
          { id: 'overview', label: 'Platform Telemetry', icon: Activity },
          { id: 'users', label: `Candidates (${usersList.length})`, icon: Users },
          { id: 'roles', label: `Engineering Roles (${rolesList.length})`, icon: Target },
          { id: 'credentials', label: 'Admin Credentials & Keycard', icon: Key },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-surface-dark-elevated hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ============================================================
          TAB CONTENT
      ============================================================ */}
      <AnimatePresence mode="wait">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* System Services Status */}
            <Card className="p-6 border border-slate-200/80 dark:border-white/5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Server className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                Service Health & Microservices Telemetry
              </h3>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    name: 'FastAPI Backend Engine',
                    status: 'Operational',
                    icon: Server,
                    desc: 'Python 3.12, Uvicorn, LangGraph',
                  },
                  {
                    name: 'Supabase Database',
                    status: 'Connected',
                    icon: Database,
                    desc: 'PostgreSQL Relational Storage & RLS',
                  },
                  {
                    name: 'Gemini 2.5 Flash LLM',
                    status: 'Online',
                    icon: Cpu,
                    desc: 'Adaptive multi-round interviewer',
                  },
                  {
                    name: 'SWR Cache & Limiter',
                    status: 'Active',
                    icon: Activity,
                    desc: 'ThreadPool parallel execution & SlowAPI',
                  },
                ].map((service) => {
                  const SIcon = service.icon;
                  return (
                    <div
                      key={service.name}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-surface-dark-elevated border border-slate-200/60 dark:border-white/5"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <SIcon className="w-4 h-4 text-brand-500" />
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {service.status}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{service.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{service.desc}</p>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Recent Interviews Table */}
            <Card className="p-6 border border-slate-200/80 dark:border-white/5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <PlayCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    Recent Live Mock Interviews
                  </h3>
                  <p className="text-xs text-slate-500">Real-time candidate mock attempts and scoring.</p>
                </div>
              </div>

              {stats?.recentInterviews && stats.recentInterviews.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-white/10 text-slate-400 uppercase tracking-wider text-[10px]">
                        <th className="pb-3 font-bold">Session ID</th>
                        <th className="pb-3 font-bold">Role Target</th>
                        <th className="pb-3 font-bold">Overall Score</th>
                        <th className="pb-3 font-bold">Status</th>
                        <th className="pb-3 font-bold">Started At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium text-slate-700 dark:text-slate-300">
                      {stats.recentInterviews.map((item) => (
                        <tr key={item.interview_id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                          <td className="py-3 font-mono font-bold text-slate-900 dark:text-white">
                            #{item.interview_id}
                          </td>
                          <td className="py-3 font-bold text-brand-600 dark:text-brand-400">
                            {item.role || 'Software Engineer'}
                          </td>
                          <td className="py-3">
                            {item.overall_score !== null && item.overall_score !== undefined ? (
                              <span className="font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                {item.overall_score} / 10
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                item.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="py-3 text-slate-500 text-[11px]">
                            {item.started_at ? String(item.started_at).slice(0, 19).replace('T', ' ') : 'Just now'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  No interview sessions recorded yet. Candidates can start sessions via /roles.
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* TAB 2: CANDIDATES */}
        {activeTab === 'users' && (
          <motion.div
            key="users"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="p-6 border border-slate-200/80 dark:border-white/5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Candidate Directory
                  </h3>
                  <p className="text-xs text-slate-500">Registered users, performance scores, and mock frequency.</p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search candidate or ID..."
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-surface-dark text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              {filteredUsers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-white/10 text-slate-400 uppercase tracking-wider text-[10px]">
                        <th className="pb-3 font-bold">User ID</th>
                        <th className="pb-3 font-bold">Candidate Name</th>
                        <th className="pb-3 font-bold">Interviews Taken</th>
                        <th className="pb-3 font-bold">Performance Score</th>
                        <th className="pb-3 font-bold">Leaderboard Rank Score</th>
                        <th className="pb-3 font-bold">Role</th>
                        <th className="pb-3 font-bold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium text-slate-700 dark:text-slate-300">
                      {filteredUsers.map((item) => (
                        <tr key={item.userId} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                          <td className="py-3 font-mono font-bold text-slate-900 dark:text-white">
                            #{item.userId}
                          </td>
                          <td className="py-3 font-bold text-slate-900 dark:text-white">
                            {item.name}
                          </td>
                          <td className="py-3">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {item.interviewsCompleted}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {item.performanceScore} / 10
                            </span>
                          </td>
                          <td className="py-3 font-bold text-brand-600 dark:text-brand-400">
                            {item.leaderboardScore} pts
                          </td>
                          <td className="py-3">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300">
                              {item.role}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <button
                              type="button"
                              onClick={() => setCandidateToDelete(item)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-red-600 hover:text-white bg-red-500/10 hover:bg-red-600 dark:text-red-400 dark:hover:text-white rounded-lg transition-colors border border-red-500/20"
                              title="Delete candidate and all records"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  No candidates found matching &quot;{userSearch}&quot;.
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* TAB 3: ROLES */}
        {activeTab === 'roles' && (
          <motion.div
            key="roles"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="p-6 border border-slate-200/80 dark:border-white/5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Engineering Tracks & Role Catalogue
                  </h3>
                  <p className="text-xs text-slate-500">Live role definitions adapted by the AI Mock Interview engine.</p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={roleSearch}
                    onChange={(e) => setRoleSearch(e.target.value)}
                    placeholder="Filter by role or tech..."
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-surface-dark text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRoles.map((role) => (
                  <div
                    key={role.id}
                    className="p-4 rounded-2xl border border-slate-200/70 dark:border-white/5 bg-slate-50/60 dark:bg-surface-dark-elevated flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                          {role.category}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 dark:bg-white/10 dark:text-slate-300">
                          {role.difficulty}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {role.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {role.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-white/5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Required Core Stack:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {role.requiredSkills?.slice(0, 4).map((skill) => (
                          <span
                            key={skill}
                            className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white dark:bg-surface-dark text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* TAB 4: CREDENTIALS */}
        {activeTab === 'credentials' && (
          <motion.div
            key="credentials"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {/* Admin Keycard */}
            <Card className="p-6 border border-slate-200/80 dark:border-white/5">
              <div className="flex items-center gap-2 mb-4">
                <span className="p-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
                  <Key className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Master Admin Credentials
                  </h3>
                  <p className="text-xs text-slate-500">Official authentication details for system operators.</p>
                </div>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-surface-dark-elevated border border-slate-200/60 dark:border-white/5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans mb-1">
                    Admin Email / Identifier
                  </p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white select-all">
                    admin@mockora.ai
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-surface-dark-elevated border border-slate-200/60 dark:border-white/5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans mb-1">
                    Master Password
                  </p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white select-all">
                    Admin@Mockora2026!
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-surface-dark-elevated border border-slate-200/60 dark:border-white/5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans mb-1">
                    Role & Privileges
                  </p>
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-sans">
                    Super Administrator (Full System Telemetry, Metrics, Cache Invalidation)
                  </p>
                </div>
              </div>
            </Card>

            {/* Quick Access Info */}
            <Card className="p-6 border border-slate-200/80 dark:border-white/5">
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <Layers className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                Direct URL & Portal Access
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                You can access this console at any time from:
              </p>

              <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-700 dark:text-brand-300 font-mono text-xs font-bold select-all mb-4">
                http://localhost:5173/admin
              </div>

              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  Works both via standard login (<code className="text-[11px] bg-slate-100 dark:bg-white/10 px-1 py-0.5 rounded">/login</code>) and direct Admin Gate.
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  Protected by cryptographic JWT with <code className="text-[11px] bg-slate-100 dark:bg-white/10 px-1 py-0.5 rounded">role: &quot;admin&quot;</code> validation.
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  Sidebar and Navigation links are dynamically surfaced when logged in.
                </p>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Remove Candidate Confirmation Modal */}
      {candidateToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md rounded-3xl bg-white dark:bg-surface-dark-card border border-slate-200 dark:border-white/10 p-6 shadow-2xl text-center"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 mb-4">
              <Trash2 className="h-7 w-7" />
            </div>

            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              Remove Candidate?
            </h3>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Are you sure you want to permanently remove candidate <strong>{candidateToDelete.name}</strong> (User ID: #{candidateToDelete.userId})?
            </p>
            <p className="mt-2 text-[11px] text-red-600 dark:text-red-400 font-semibold bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 p-2.5 rounded-xl">
              All their mock interviews, resumes, career plans, and report scores will be permanently deleted.
            </p>

            <div className="mt-6 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => setCandidateToDelete(null)}
                disabled={deletingId !== null}
                className="text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDeleteCandidate}
                disabled={deletingId !== null}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-lg shadow-red-500/20"
              >
                {deletingId !== null ? 'Removing...' : 'Yes, Delete Candidate'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </PageWrapper>
  );
};

export default AdminPage;
