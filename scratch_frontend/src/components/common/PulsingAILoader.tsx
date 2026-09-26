import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface PulsingAILoaderProps {
  message?: string;
  subtext?: string;
}

export const PulsingAILoader: React.FC<PulsingAILoaderProps> = ({
  message = 'AI is evaluating your response...',
  subtext = 'Analyzing speech cadence, keyword relevance, and architectural depth',
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center my-6">
      {/* Wave Visualizer Container */}
      <div className="relative flex items-center justify-center w-24 h-24 mb-6">
        {/* Glowing Background Pulsing Ring */}
        <motion.div
          animate={{ scale: [1, 1.35, 1], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 rounded-full bg-brand-500/20 dark:bg-brand-500/30 blur-lg"
        />

        <div className="relative z-10 w-16 h-16 rounded-full bg-gradient-to-tr from-brand-600 to-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/30 text-white">
          <Sparkles className="w-8 h-8 animate-spin" style={{ animationDuration: '6s' }} />
        </div>

        {/* Dynamic Voice Bars */}
        <div className="absolute inset-0 flex items-center justify-center gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.span
              key={i}
              animate={{ height: ['12px', '36px', '12px'] }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.15,
                ease: 'easeInOut',
              }}
              className="w-1 bg-brand-400 dark:bg-brand-300 rounded-full"
            />
          ))}
        </div>
      </div>

      <motion.h4
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.8, repeat: Infinity }}
        className="font-bold text-lg text-slate-900 dark:text-slate-100"
      >
        {message}
      </motion.h4>
      {subtext && (
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1.5 leading-relaxed">
          {subtext}
        </p>
      )}
    </div>
  );
};
