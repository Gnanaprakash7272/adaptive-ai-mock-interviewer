import React from 'react';
import { clsx } from 'clsx';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  textClassName?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
  textClassName = '',
}) => {
  const sizeMap = {
    xs: { box: 'w-6 h-6 rounded-lg p-0.5', text: 'text-sm' },
    sm: { box: 'w-8 h-8 rounded-lg p-1', text: 'text-base' },
    md: { box: 'w-10 h-10 rounded-xl p-1', text: 'text-xl' },
    lg: { box: 'w-16 h-16 rounded-2xl p-2', text: 'text-2xl' },
    xl: { box: 'w-20 h-20 rounded-3xl p-2.5', text: 'text-3xl' },
  }[size];

  return (
    <div className={clsx('flex items-center gap-2.5 select-none', className)}>
      <div
        className={clsx(
          sizeMap.box,
          'relative flex items-center justify-center shrink-0 overflow-hidden',
          'bg-gradient-to-tr from-brand-500/10 via-brand-500/10 to-brand-500/10 dark:bg-slate-800/80',
          'border border-brand-500/20 dark:border-brand-500/30 shadow-sm shadow-brand-500/10',
          'transition-all duration-300'
        )}
      >
        <img
          src="/logo.png"
          alt="Mockora Logo"
          className="w-full h-full object-contain filter drop-shadow-sm transition-transform duration-300 hover:scale-105"
        />
      </div>

      {showText && (
        <span
          className={clsx(
            sizeMap.text,
            'font-black tracking-tight text-slate-900 dark:text-white flex items-center leading-none',
            textClassName
          )}
        >
          Mockora
          <span className="text-brand-600 dark:text-brand-400">.ai</span>
        </span>
      )}
    </div>
  );
};
