import React from 'react';
import { motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends HTMLMotionProps<'div'> {
  hoverEffect?: boolean;
  tiltOnHover?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  hoverEffect = false,
  tiltOnHover = false,
  children,
  className,
  ...props
}) => {
  return (
    <motion.div
      whileHover={
        tiltOnHover
          ? { scale: 1.015, rotateX: 3, rotateY: -3, translateY: -3 }
          : hoverEffect
          ? { translateY: -3 }
          : undefined
      }
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={tiltOnHover ? { perspective: 1000 } : undefined}
      className={twMerge(
        clsx(
          'rounded-2xl border transition-all duration-200',
          'bg-surface-light-card border-slate-200/80 shadow-card-light',
          'dark:bg-surface-dark-card dark:border-border-dark dark:shadow-none dark:hover:border-border-dark-accent',
          hoverEffect && 'hover:shadow-card-hover-light dark:hover:bg-surface-dark-elevated',
          className
        )
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
};
