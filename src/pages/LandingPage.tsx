import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../components/common/Button';
import { ArrowRight } from 'lucide-react';
import { Logo } from '../components/common/Logo';

export const LandingPage: React.FC = () => {
  const dynamicPhrases = [
    'AI-Powered Guidance',
    'Personalized AI Coaching',
    'Intelligent AI Feedback',
    'Adaptive AI Insights',
  ];

  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayText, setDisplayText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentFullText = dynamicPhrases[phraseIndex];
    let timer: ReturnType<typeof setTimeout>;

    if (!isDeleting) {
      if (displayText.length < currentFullText.length) {
        timer = setTimeout(() => {
          setDisplayText(currentFullText.slice(0, displayText.length + 1));
        }, 70);
      } else {
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, 2000);
      }
    } else {
      if (displayText.length > 0) {
        timer = setTimeout(() => {
          setDisplayText(currentFullText.slice(0, displayText.length - 1));
        }, 35);
      } else {
        setIsDeleting(false);
        setPhraseIndex((prev) => (prev + 1) % dynamicPhrases.length);
      }
    }

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, phraseIndex]);

  return (
    <div className="w-full h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] overflow-hidden flex flex-col justify-between relative subtle-mesh-light dark:subtle-mesh-dark px-4 sm:px-6 lg:px-8 py-4">
      {/* CENTERED HERO CONTAINER (SINGLE FRAME) */}
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col items-center justify-center text-center my-auto">
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center max-w-3xl mx-auto"
        >
          {/* Centered Brand Tag Badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-cyan-500/10 dark:bg-cyan-500/15 border border-cyan-500/30 text-cyan-800 dark:text-cyan-300 text-xs font-semibold mb-6 shadow-sm">
            <img src="/logo.png" alt="Mockora Logo" className="w-4 h-4 object-contain" />
            <span>Next-Generation AI Interview Practice Platform</span>
          </div>

          {/* Main Headline with Dynamic Golden Rotating Words */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.2]">
            Master Technical Interviews With{' '}
            <span className="inline-block bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 dark:from-yellow-300 dark:via-amber-400 dark:to-yellow-400 bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(245,158,11,0.25)]">
              {displayText}
            </span>
            <span className="inline-block w-[3px] h-[0.9em] bg-amber-500 dark:bg-yellow-400 ml-1.5 align-middle animate-pulse" />
          </h1>

          {/* Subtitle Paragraph */}
          <p className="mt-5 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto">
            Experience hyper-realistic mock interviews with conversational AI. Get evaluated on system design, algorithmic efficiency, and communication clarity with line-by-line feedback.
          </p>

          {/* Centered Action Button */}
          <div className="mt-8 flex items-center justify-center">
            <Link to="/signup">
              <Button size="lg" className="rounded-full px-8 py-3.5 shadow-xl shadow-brand-500/30 text-sm sm:text-base font-bold bg-brand-600 hover:bg-brand-700">
                Start Free Practice <ArrowRight className="w-4 h-4 ml-1.5 inline" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* COMPACT FOOTER */}
      <footer className="w-full border-t border-slate-200/80 dark:border-border-dark py-3 text-xs text-slate-400 shrink-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Logo size="xs" showText={true} />
            <span className="text-slate-400 text-xs">© 2026. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-5 text-xs">
            <a href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">API Spec</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
