import React from 'react';
import { motion } from 'framer-motion';

export const Hero3D: React.FC = () => {
  return (
    <motion.div
      whileHover={{ scale: 1.02, rotateX: 3, rotateY: -3 }}
      transition={{ type: 'spring', stiffness: 250, damping: 20 }}
      style={{ perspective: 1000 }}
      className="w-full relative flex items-center justify-center p-2 group cursor-pointer"
    >
      {/* Background Soft Glow Aura */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-brand-500/20 via-indigo-500/20 to-purple-500/10 blur-xl opacity-75 group-hover:opacity-100 transition-opacity" />

      {/* Image Container with Seamless Blend & Rounded Mask */}
      <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200/60 dark:border-white/10 shadow-lg bg-white dark:bg-surface-dark-card">
        <motion.img
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          src="/hero-interview.jpg"
          alt="AI 3D Interview Evaluation Graphic"
          className="w-full h-auto max-h-[380px] object-cover object-center dark:brightness-95 dark:contrast-105 transition-all duration-300"
        />
        {/* Soft Ambient Blend Overlay */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-white/40 via-transparent to-transparent dark:from-surface-dark-card/60 dark:via-transparent dark:to-transparent" />
      </div>
    </motion.div>
  );
};

export default Hero3D;
