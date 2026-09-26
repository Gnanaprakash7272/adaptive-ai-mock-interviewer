import React from 'react';
import { motion } from 'framer-motion';

interface ScoreCircleProps {
  score: number;
  maxScore?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
}

export const ScoreCircle: React.FC<ScoreCircleProps> = ({
  score,
  maxScore = 100,
  size = 180,
  strokeWidth = 14,
  label = 'Overall Score',
  sublabel = 'Top 4% Candidate',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = (score / maxScore) * 100;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getScoreColor = (val: number) => {
    if (val >= 90) return { stroke: '#6366F1', glow: 'rgba(99, 102, 241, 0.4)', text: 'text-brand-600 dark:text-brand-400' };
    if (val >= 75) return { stroke: '#10B981', glow: 'rgba(16, 185, 129, 0.4)', text: 'text-emerald-600 dark:text-emerald-400' };
    if (val >= 60) return { stroke: '#F59E0B', glow: 'rgba(245, 158, 11, 0.4)', text: 'text-amber-600 dark:text-amber-400' };
    return { stroke: '#EF4444', glow: 'rgba(239, 68, 68, 0.4)', text: 'text-rose-600 dark:text-rose-400' };
  };

  const colors = getScoreColor(percentage);

  return (
    <motion.div
      whileHover={{ scale: 1.03, rotateX: 6, rotateY: -6 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      style={{ perspective: 800 }}
      className="relative flex flex-col items-center justify-center cursor-pointer p-4 group"
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Track Circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-200 dark:text-slate-800"
            fill="transparent"
          />
          {/* Animated Progress Circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
            strokeLinecap="round"
            fill="transparent"
            style={{
              filter: `drop-shadow(0px 0px 8px ${colors.glow})`,
            }}
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className={`text-4xl font-extrabold tracking-tight ${colors.text}`}
          >
            {score}
          </motion.span>
          <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500 mt-0.5">
            Out of {maxScore}
          </span>
        </div>
      </div>

      {label && (
        <div className="text-center mt-3">
          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{label}</h4>
          {sublabel && (
            <span className="inline-block text-xs text-brand-600 dark:text-brand-400 font-medium mt-0.5 px-2.5 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800">
              {sublabel}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
};
