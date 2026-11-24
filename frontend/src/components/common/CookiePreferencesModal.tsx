import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Cookie, X, Check, Lock, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCookie } from '../../context/CookieContext';
import { useToast } from '../../context/ToastContext';
import { Button } from './Button';

export const CookiePreferencesModal: React.FC = () => {
  const {
    isModalOpen,
    closePreferencesModal,
    preferences,
    saveCustomPreferences,
    acceptAllCookies,
    rejectNonEssentialCookies,
  } = useCookie();

  const { addToast } = useToast();

  const [functional, setFunctional] = useState(preferences.functional);
  const [analytics, setAnalytics] = useState(preferences.analytics);

  if (!isModalOpen) return null;

  const handleSave = () => {
    saveCustomPreferences({ functional, analytics });
    addToast('success', 'Preferences Updated', 'Your cookie choices have been successfully saved.');
  };

  const handleAcceptAll = () => {
    acceptAllCookies();
    addToast('success', 'All Cookies Accepted', 'Full personalization and performance telemetry enabled.');
  };

  const handleRejectAll = () => {
    rejectNonEssentialCookies();
    addToast('info', 'Non-Essential Rejected', 'Only essential security and authentication cookies are active.');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-xl bg-white dark:bg-surface-dark-card border border-slate-200 dark:border-border-dark rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-slate-200/80 dark:border-border-dark flex items-center justify-between bg-slate-50/50 dark:bg-surface-dark-elevated/40">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800/60">
                <Cookie className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  Cookie & Privacy Preferences
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Manage how Mockora uses cookies and local device storage.
                </p>
              </div>
            </div>

            <button
              onClick={closePreferencesModal}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-left">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              We respect your right to privacy. You can choose not to allow some types of cookies.
              Essential cookies cannot be disabled as they are required for secure candidate authentication
              and mock interview room communication.
            </p>

            {/* Category 1: Strictly Necessary */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-surface-dark-elevated/40 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                    Strictly Necessary Cookies
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    Always Active
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                Required for core platform security, Supabase JWT auth sessions, CSRF protection, and
                preventing duplicate requests during interview question generation.
              </p>
            </div>

            {/* Category 2: Functional */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-surface-dark-elevated/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                  Functional & Preferences
                </span>
                <button
                  type="button"
                  onClick={() => setFunctional(!functional)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    functional ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  aria-pressed={functional}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      functional ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                Enables Mockora to remember your theme choice (Light vs Dark mode), custom API endpoint
                overrides, audio input microphone preferences, and sidebar state.
              </p>
            </div>

            {/* Category 3: Analytics */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-surface-dark-elevated/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                  Performance & Diagnostics
                </span>
                <button
                  type="button"
                  onClick={() => setAnalytics(!analytics)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    analytics ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  aria-pressed={analytics}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      analytics ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                Gathers anonymous telemetry on AI response times, audio streaming latency, and question
                error rates to help us maintain system reliability.
              </p>
            </div>

            {/* Policy Link */}
            <div className="pt-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-brand-500" />
                <span>Zero third-party data broker sharing.</span>
              </div>
              <Link
                to="/privacy"
                onClick={closePreferencesModal}
                className="text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
              >
                Privacy Policy <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-border-dark flex flex-wrap items-center justify-between gap-2.5 bg-slate-50/50 dark:bg-surface-dark-elevated/40">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRejectAll}
                className="text-xs rounded-xl"
              >
                Reject Non-Essential
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAcceptAll}
                className="text-xs rounded-xl"
              >
                Accept All
              </Button>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              className="text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              Save Preferences
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
