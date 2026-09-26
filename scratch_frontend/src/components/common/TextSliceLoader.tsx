import React from 'react';

interface TextSliceLoaderProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg' | string;
  subtext?: string;
  className?: string;
}

export const TextSliceLoader: React.FC<TextSliceLoaderProps> = ({
  text = 'LOADING',
  size = 'md',
  subtext,
  className = '',
}) => {
  const getFontSize = () => {
    switch (size) {
      case 'sm':
        return '2rem';
      case 'md':
        return '3.2rem';
      case 'lg':
        return '4.5rem';
      default:
        return size;
    }
  };

  const displayText = text.toUpperCase();

  return (
    <div className={`flex flex-col items-center justify-center py-6 select-none ${className}`}>
      <div
        className="uiverse-text-loader"
        style={{ '--main-size': getFontSize() } as React.CSSProperties}
      >
        <div className="text"><span>{displayText}</span></div>
        <div className="text"><span>{displayText}</span></div>
        <div className="text"><span>{displayText}</span></div>
        <div className="text"><span>{displayText}</span></div>
        <div className="text"><span>{displayText}</span></div>
        <div className="text"><span>{displayText}</span></div>
        <div className="text"><span>{displayText}</span></div>
        <div className="text"><span>{displayText}</span></div>
        <div className="text"><span>{displayText}</span></div>
        <div className="line" />
      </div>

      {subtext && (
        <p className="text-xs sm:text-sm font-semibold tracking-wide text-slate-500 dark:text-slate-400 mt-4 animate-pulse">
          {subtext}
        </p>
      )}
    </div>
  );
};

export default TextSliceLoader;
