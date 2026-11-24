import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, Settings2, Check, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCookie } from '../../context/CookieContext';
import { Button } from './Button';

export const CookieBanner: React.FC = () => {
  const { hasConsented, acceptAllCookies, rejectNonEssentialCookies, openPreferencesModal } = useCookie();

  if (hasConsented) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="fixed bottom-4 left-4 right-4 sm:left-6 sm:right-6 md:left-auto md:right-8 md:max-w-xl z-50 pointer-events-auto"
      >
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-border-dark bg-white/95 dark:bg-surface-dark-card/95 backdrop-blur-md shadow-2xl shadow-slate-900/10 dark:shadow-black/40 space-y-3.5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800/60 shrink-0">
              <Cookie className="w-5 h-5" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Cookie & Privacy Notice
                </h4>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800/40 flex items-center gap-0.5">
                  <Shield className="w-2.5 h-2.5" />
                  GDPR & CCPA
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Mockora uses necessary cookies to manage interview sessions and securely authenticate your account.
                We also use optional functional cookies to remember themes and improve AI latency.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <Link to="/privacy" className="hover:text-brand-600 dark:hover:text-brand-400 underline transition-colors">
                Privacy Policy
              </Link>
              <span>•</span>
              <button
                type="button"
                onClick={openPreferencesModal}
                className="hover:text-brand-600 dark:hover:text-brand-400 flex items-center gap-1 transition-colors"
              >
                <Settings2 className="w-3 h-3" />
                Customize
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={rejectNonEssentialCookies}
                className="text-xs px-3 py-1.5 rounded-xl border-slate-200 dark:border-slate-700"
              >
                Decline Optional
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={acceptAllCookies}
                className="text-xs px-4 py-1.5 font-bold rounded-xl shadow-md flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                Accept All
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
