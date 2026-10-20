import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Target,
  History,
  UserCheck,
} from 'lucide-react';
import { clsx } from 'clsx';

interface NavItem {
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
  badge?: string;
}

export const Sidebar: React.FC = () => {
  const navItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Candidate Profile', path: '/profile', icon: UserCheck },
    { label: 'Interview Roles', path: '/roles', icon: Target },
    { label: 'Past History', path: '/history', icon: History },
  ];

  return (
    <>
      {/* Desktop & Tablet Sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-slate-200/80 dark:border-border-dark bg-white/60 dark:bg-surface-dark/60 backdrop-blur-md p-4 min-h-[calc(100vh-4rem)] transition-colors">
        {/* Navigation Group */}
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
            Main Menu
          </p>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group',
                    isActive
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20 dark:bg-brand-600 dark:shadow-glow-primary'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-surface-dark-elevated hover:text-slate-900 dark:hover:text-slate-100'
                  )
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-surface-dark/95 border-t border-slate-200 dark:border-border-dark backdrop-blur-lg px-2 py-2 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center gap-1 p-2 rounded-xl text-[10px] font-semibold transition-colors',
                  isActive
                    ? 'text-brand-600 dark:text-brand-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                )
              }
            >
              <Icon className="w-5 h-5" />
              <span>{item.label.split(' ')[0]}</span>
            </NavLink>
          );
        })}
      </div>
    </>
  );
};
