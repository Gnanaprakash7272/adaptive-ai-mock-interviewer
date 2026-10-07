import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import {
  Sun,
  Moon,
  Database,
  Save,
  LogOut,
  User,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getApiBaseUrl } from '../services/apiService';

export const SettingsPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [apiBaseUrl, setApiBaseUrl] = useState(getApiBaseUrl());

  const handleSaveSettings = () => {
    if (import.meta.env.DEV) {
      localStorage.setItem('ai_mockora_api_url', apiBaseUrl.trim());
      addToast('success', 'Preferences Saved!', 'FastAPI endpoint saved in browser storage.');
      return;
    }

    addToast('success', 'Preferences Saved!', 'Your preferences have been saved.');
  };

  return (
    <PageWrapper className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <span className="text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">
          Preferences & Environment Setup
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
          Platform Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configure theme preferences, microphone calibration, and candidate account settings.
        </p>
      </div>

      {import.meta.env.DEV && (
      <Card className="p-6 space-y-4 border-2 border-brand-500/20">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-brand-500" />
            FastAPI + LangGraph Backend Connection
          </h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
            Real Backend Integration
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Configure the base URL of your local or remote FastAPI server (e.g., <code className="text-brand-600 dark:text-brand-400 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">http://localhost:8000</code>).
          The frontend will route <code className="text-brand-600 dark:text-brand-400">/resume/analyze</code>, <code className="text-brand-600 dark:text-brand-400">/interviews</code>, and <code className="text-brand-600 dark:text-brand-400">/candidate/profile</code> to this server.
        </p>

        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            FastAPI Base URL
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="url"
              value={apiBaseUrl}
              onChange={(e) => setApiBaseUrl(e.target.value)}
              placeholder="http://localhost:8000"
              className="flex-1 p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-surface-dark-elevated border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
          </div>
        </div>
      </Card>
      )}

      {/* THEME CONFIGURATION CARD */}
      <Card className="p-6 space-y-4">
        <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
          {theme === 'light' ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-brand-400" />}
          Interface Theme & Display Mode
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Switch between Light mode and Dark mode. Theme preference is automatically saved in your browser.
        </p>

        <div className="flex items-center gap-4 pt-2">
          <button
            onClick={() => theme !== 'light' && toggleTheme()}
            className={`flex-1 p-4 rounded-xl border flex items-center justify-between text-xs font-bold transition-all ${
              theme === 'light'
                ? 'border-brand-500 bg-brand-50/50 text-slate-900 ring-1 ring-brand-500'
                : 'border-slate-200 dark:border-white/10 text-slate-400 hover:bg-slate-50 dark:hover:bg-surface-dark-elevated'
            }`}
          >
            <span className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-500" />
              Light Theme (Default)
            </span>
            {theme === 'light' && <CheckCircle2 className="w-4 h-4 text-brand-500" />}
          </button>

          <button
            onClick={() => theme !== 'dark' && toggleTheme()}
            className={`flex-1 p-4 rounded-xl border flex items-center justify-between text-xs font-bold transition-all ${
              theme === 'dark'
                ? 'border-brand-500 bg-surface-dark-elevated text-white ring-1 ring-brand-500'
                : 'border-slate-200 dark:border-white/10 text-slate-400 hover:bg-slate-50 dark:hover:bg-surface-dark-elevated'
            }`}
          >
            <span className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-brand-400" />
              Dark Theme (Subtle Mesh)
            </span>
            {theme === 'dark' && <CheckCircle2 className="w-4 h-4 text-brand-400" />}
          </button>
        </div>
      </Card>

      {/* ACCOUNT & SECURITY */}
      {user && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <User className="w-5 h-5 text-brand-500" />
              Candidate Account & Authentication
            </h3>
            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" /> Session Authenticated
            </span>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-surface-dark-elevated">
            <div className="flex items-center gap-3">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-xl object-cover ring-2 ring-brand-500/20" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center text-sm font-bold ring-2 ring-brand-500/20">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{user.name}</h4>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                logout();
                addToast('info', 'Logged out successfully');
                navigate('/login');
              }}
              className="text-rose-600 border-rose-200 dark:border-rose-900 hover:bg-rose-50"
            >
              <LogOut className="w-3.5 h-3.5 mr-1" /> Sign Out
            </Button>
          </div>
        </Card>
      )}

      {/* SAVE BUTTON */}
      <Button onClick={handleSaveSettings} size="lg" className="shadow-lg">
        <Save className="w-4 h-4 mr-2" />
        Save All Preferences
      </Button>
    </PageWrapper>
  );
};
