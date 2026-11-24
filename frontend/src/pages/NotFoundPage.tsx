import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Compass,
  ArrowLeft,
  LayoutDashboard,
  PlayCircle,
  Clock,
  Trophy,
  HelpCircle,
  Home,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { PageWrapper } from '../components/layout/PageWrapper';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const quickLinks = [
    {
      title: 'Interview Studio',
      description: 'Start a technical or behavioral mock round',
      icon: PlayCircle,
      path: '/roles',
      color: 'text-brand-500 bg-brand-50 dark:bg-brand-950/40 border-brand-200 dark:border-brand-800/40',
    },
    {
      title: 'Candidate Dashboard',
      description: 'Track your readiness scores and skill radar',
      icon: LayoutDashboard,
      path: isAuthenticated ? '/dashboard' : '/login',
      color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/40',
    },
    {
      title: 'Session History',
      description: 'Review your past answers and AI evaluations',
      icon: Clock,
      path: isAuthenticated ? '/history' : '/login',
      color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/40',
    },
    {
      title: 'Global Leaderboard',
      description: 'See where you rank against top engineering peers',
      icon: Trophy,
      path: isAuthenticated ? '/leaderboard' : '/login',
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40',
    },
  ];

  return (
    <PageWrapper className="min-h-[82vh] flex flex-col justify-center items-center py-10">
      <div className="w-full max-w-3xl mx-auto text-center space-y-8">
        {/* Animated Badge & Graphic */}
        <div className="relative flex flex-col items-center">
          {/* Subtle Background Glow */}
          <div className="absolute -top-12 w-64 h-64 bg-brand-500/15 dark:bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />

          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800/60 shadow-sm mb-4"
          >
            <Compass className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '10s' }} />
            404 • Lost in Space
          </motion.div>

          {/* Hero 404 Headline */}
          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.35 }}
            className="relative"
          >
            <h1 className="text-7xl sm:text-9xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 dark:from-brand-400 dark:via-indigo-300 dark:to-purple-400 select-none">
              404
            </h1>
            <div className="absolute inset-0 flex items-center justify-center opacity-10 dark:opacity-20 pointer-events-none">
              <span className="text-8xl sm:text-[10rem] font-black blur-md select-none text-brand-600">
                404
              </span>
            </div>
          </motion.div>

          <motion.h2
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.18, duration: 0.35 }}
            className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2"
          >
            Page or Session Not Found
          </motion.h2>

          <motion.p
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.24, duration: 0.35 }}
            className="max-w-xl mx-auto text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-3 leading-relaxed"
          >
            The interview room, candidate evaluation, or page you are looking for doesn&apos;t exist,
            has expired, or was relocated.
          </motion.p>
        </div>

        {/* Primary Action Buttons */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.35 }}
          className="flex flex-wrap items-center justify-center gap-3 pt-2"
        >
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-2 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </Button>

          {isAuthenticated ? (
            <Link to="/dashboard">
              <Button
                variant="primary"
                className="px-6 py-2.5 text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-brand-500/20"
              >
                <LayoutDashboard className="w-4 h-4" />
                Return to Dashboard
              </Button>
            </Link>
          ) : (
            <Link to="/">
              <Button
                variant="primary"
                className="px-6 py-2.5 text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-brand-500/20"
              >
                <Home className="w-4 h-4" />
                Go to Home
              </Button>
            </Link>
          )}

          <Link to="/roles">
            <Button
              variant="secondary"
              className="px-5 py-2.5 text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-2 border border-slate-200 dark:border-white/10"
            >
              <Sparkles className="w-4 h-4 text-brand-500" />
              Practice Interviews
            </Button>
          </Link>
        </motion.div>

        {/* Suggested Portals Grid */}
        <motion.div
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.38, duration: 0.35 }}
          className="pt-6"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Explore Popular Workspaces
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-left">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.title} to={item.path} className="group">
                  <Card
                    hoverEffect
                    className="p-4 h-full flex items-start gap-3.5 transition-all duration-200 group-hover:border-brand-500/40 dark:group-hover:border-brand-500/40"
                  >
                    <div
                      className={`p-2.5 rounded-xl border shrink-0 transition-transform duration-200 group-hover:scale-105 ${item.color}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                          {item.title}
                        </h3>
                        <span className="text-xs text-slate-400 group-hover:translate-x-0.5 transition-transform">
                          &rarr;
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        {item.description}
                      </p>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </motion.div>
      </div>
    </PageWrapper>
  );
};
