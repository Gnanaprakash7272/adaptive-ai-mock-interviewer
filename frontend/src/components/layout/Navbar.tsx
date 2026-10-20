import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sun, Moon, LogOut, ChevronDown, LayoutDashboard, Target, History, UserCheck } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Logo } from '../common/Logo';

export const Navbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/60 dark:border-border-dark bg-white/90 dark:bg-surface-dark/90 backdrop-blur-md transition-colors duration-200">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Logo & Title (Aligned to Corner) */}
        <div className="flex items-center gap-6">
          <Link to={user ? '/dashboard' : '/'} className="flex items-center group">
            <Logo size="md" className="transition-transform group-hover:scale-[1.02]" />
          </Link>
        </div>

        <div className="flex-1"></div>

        {/* Right Action Icons & User Dropdown */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Theme Toggle Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-surface-dark-elevated dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-white/10 transition-colors"
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4 text-brand-600" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
          </motion.button>

          {user ? (
            <>
              {/* User Profile Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 dark:bg-surface-dark-elevated dark:hover:bg-slate-800 border border-slate-200/80 dark:border-white/10 transition-colors"
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.username}
                      className="w-7 h-7 rounded-lg object-cover ring-2 ring-brand-500/40"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-lg bg-brand-600 text-white flex items-center justify-center text-xs font-bold ring-2 ring-brand-500/40">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 hidden sm:inline-block">
                    {user.username}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-surface-dark-card border border-slate-200 dark:border-border-dark shadow-2xl p-2 z-50">
                    <div className="p-3 border-b border-slate-100 dark:border-white/5 mb-1">
                      <p className="font-bold text-xs text-slate-900 dark:text-slate-100">{user.username}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                    </div>

                    <Link
                      to="/dashboard"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 rounded-xl transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4 text-brand-500" />
                      Dashboard
                    </Link>

                    <Link
                      to="/profile"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 rounded-xl transition-colors"
                    >
                      <UserCheck className="w-4 h-4 text-brand-500" />
                      Candidate Profile
                    </Link>

                    <Link
                      to="/roles"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 rounded-xl transition-colors"
                    >
                      <Target className="w-4 h-4 text-brand-500" />
                      Interview Roles
                    </Link>

                    <Link
                      to="/history"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 rounded-xl transition-colors"
                    >
                      <History className="w-4 h-4 text-amber-500" />
                      Past History
                    </Link>

                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        logout();
                        addToast('info', 'Logged out successfully');
                        navigate('/login');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors mt-1"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="text-xs font-bold px-5 py-2.5 rounded-full bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/25 transition-all"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
