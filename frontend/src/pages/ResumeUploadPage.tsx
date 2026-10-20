import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';

import {
  UploadCloud,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  UserCheck,
  RefreshCw,
  Loader2,
  Target,
  ShieldCheck,
  Cpu,
  FileCheck,
  Zap,
  HelpCircle,
} from 'lucide-react';


import { useToast } from '../context/ToastContext';
import { apiService } from '../services/apiService';


type ExtractionStep = 'idle' | 'uploading' | 'extracting' | 'cleaning' | 'analysing' | 'ready';

export const ResumeUploadPage: React.FC = () => {

  const { addToast } = useToast();
  const navigate = useNavigate();

  const [isDragging, setIsDragging] = useState(false);
  const [currentStep, setCurrentStep] = useState<ExtractionStep>('idle');
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [fileDetails, setFileDetails] = useState<{ name: string; size: string } | null>(null);
  const [candidateProfile, setCandidateProfile] = useState<any>(null);

  React.useEffect(() => {
    apiService.getCandidateProfile().then(setCandidateProfile).catch(() => {});
  }, []);

  const pipelineSteps = [
    { key: 'uploading', label: 'Uploading PDF', desc: 'Secure multipart transfer to server' },
    { key: 'extracting', label: 'Extracting Content', desc: 'Document structure & text parsing' },
    { key: 'cleaning', label: 'Tokenizing & Cleaning', desc: 'Removing artifacts & structuring JSON' },
    { key: 'analysing', label: 'Gemini AI Analysis', desc: 'Mapping skills, projects & experience' },
    { key: 'ready', label: 'Profile Ready', desc: 'Candidate Intelligence Profile built' },
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateAndProcessFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      addToast('error', 'Invalid File Type', 'Please upload a PDF document (.pdf).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      addToast('error', 'File Too Large', 'Please upload a PDF file smaller than 10MB.');
      return;
    }

    processFileUpload(file);
  };

  const processFileUpload = async (file: File) => {
    const formattedSize = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    setSelectedFileName(file.name);
    setFileDetails({ name: file.name, size: formattedSize });
    
    // Simulate steps moving forward
    setCurrentStep('uploading');
    const steps: ExtractionStep[] = ['uploading', 'extracting', 'cleaning', 'analysing'];
    let stepIndex = 0;
    
    const interval = setInterval(() => {
      stepIndex++;
      if (stepIndex < steps.length) {
        setCurrentStep(steps[stepIndex]);
      } else {
        clearInterval(interval);
      }
    }, 1500); // advance visually every 1.5s

    try {
      await apiService.analyzeResume(file);

      clearInterval(interval);
      setCurrentStep('ready');

      addToast(
        'success',
        'Profile Extraction Complete!',
        `Successfully extracted information and built candidate profile.`
      );

      // Delay navigation slightly to let user see "ready" state
      setTimeout(() => {
        navigate('/profile', { replace: true });
      }, 1500);
    } catch (err: any) {
      clearInterval(interval);
      setCurrentStep('idle');
      addToast('error', 'Upload Failed', err.message || 'Unable to process resume. Please try again.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  const resetUpload = () => {
    setCurrentStep('idle');
    setSelectedFileName('');
    setFileDetails(null);
  };

  return (
    <PageWrapper className="mx-auto max-w-6xl space-y-10">

      {/* ============================================================
          PAGE HEADER
      ============================================================ */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-900/50 dark:bg-brand-950/30 dark:text-brand-400">
            <Sparkles className="h-3.5 w-3.5" />
            Resume Intelligence Engine
          </div>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
            Upload Resume & Build Candidate Profile
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Our multi-stage pipeline extracts your skills, projects, and work history using Gemini AI to personalize your adaptive mock interview questions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/profile">
            <Button variant="outline" size="sm">
              <UserCheck className="mr-1.5 h-4 w-4" />
              View Current Profile
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* ============================================================
          UPLOAD DROPZONE / PIPELINE TRACKER
      ============================================================ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
      >
        <Card className="relative overflow-hidden border border-slate-200 bg-white shadow-xl shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-red-500/5 blur-3xl" />

          {currentStep === 'idle' ? (
            <div className="relative p-8 sm:p-12">
              {/* Animated backdrop glow on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-brand-500/0 via-brand-400/0 to-rose-500/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 dark:from-brand-500/5 dark:to-rose-500/5" />
              
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('resume-file-input')?.click()}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    document.getElementById('resume-file-input')?.click();
                  }
                }}
                className={`group relative z-10 flex flex-col items-center justify-center rounded-[2rem] border-2 border-dashed p-10 text-center transition-all duration-500 cursor-pointer ${
                  isDragging
                    ? 'border-brand-500 bg-brand-50/80 shadow-glow-primary dark:bg-brand-950/40 dark:shadow-glow-dark'
                    : 'border-slate-300 bg-slate-50/50 hover:border-brand-400 hover:bg-white hover:shadow-2xl hover:shadow-glow-primary/50 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-brand-500 dark:hover:bg-slate-900 dark:hover:shadow-glow-dark'
                }`}
              >
                {/* Floating upload icon with animated ring */}
                <div className="relative mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-tr from-brand-100 to-rose-50 text-brand-600 transition-transform duration-500 group-hover:scale-110 group-hover:-translate-y-2 dark:from-brand-900/40 dark:to-rose-900/40 dark:text-brand-400 shadow-xl shadow-brand-500/10">
                  <div className="absolute inset-0 rounded-3xl border border-white/50 dark:border-white/10" />
                  <UploadCloud className="h-12 w-12" />
                  
                  {/* Glowing ping effect on hover */}
                  <div className="absolute -inset-4 rounded-full border border-brand-500/30 opacity-0 scale-50 transition-all duration-700 group-hover:scale-125 group-hover:opacity-100" />
                  <div className="absolute -inset-8 rounded-full border border-rose-500/20 opacity-0 scale-50 transition-all duration-1000 delay-100 group-hover:scale-150 group-hover:opacity-100" />
                  
                  <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-600/40">
                    <Sparkles className="h-4 w-4" />
                  </div>
                </div>

                <h3 className="text-2xl font-extrabold tracking-tight text-slate-900 transition-colors group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-400">
                  Drop your resume PDF here, or <span className="text-brand-600 underline decoration-brand-300 decoration-2 underline-offset-4 dark:text-brand-400 dark:decoration-brand-700">browse</span>
                </h3>

                <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">
                  Standard PDF files supported · Maximum file size: 10MB
                </p>

                {/* Glassmorphic feature tags */}
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200/60 bg-white/60 px-4 py-2 text-xs font-bold text-slate-700 shadow-sm backdrop-blur-md transition-transform hover:-translate-y-0.5 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-300">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50">
                      <FileCheck className="h-3 w-3 text-brand-600 dark:text-brand-400" />
                    </div>
                    PDF format only
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200/60 bg-white/60 px-4 py-2 text-xs font-bold text-slate-700 shadow-sm backdrop-blur-md transition-transform hover:-translate-y-0.5 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-300">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                      <ShieldCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    Processed via API
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200/60 bg-white/60 px-4 py-2 text-xs font-bold text-slate-700 shadow-sm backdrop-blur-md transition-transform hover:-translate-y-0.5 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-300">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/50">
                      <Cpu className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                    </div>
                    Gemini AI Extraction
                  </span>
                </div>

                <input
                  id="resume-file-input"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-10 p-8 sm:p-12">

              {/* Scanning Animation Header */}
              <div className="flex flex-col sm:flex-row items-center gap-10">
                {/* 3D Laser Document Scanner */}
                <div className="relative shrink-0 perspective-[1000px]">
                  <motion.div 
                    animate={currentStep !== 'ready' ? { rotateY: [-5, 5, -5], rotateX: [5, -5, 5] } : { rotateY: 0, rotateX: 0 }}
                    transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                    className="relative flex h-40 w-32 flex-col items-center justify-center rounded-xl border border-slate-200/50 bg-white/80 shadow-2xl shadow-brand-500/20 backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-900/80 overflow-hidden transform-gpu"
                  >
                    {/* Glowing grid background */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:12px_12px]" />
                    
                    {/* Document Lines */}
                    <div className="absolute top-5 left-5 h-1.5 w-12 rounded-full bg-slate-200 dark:bg-slate-700" />
                    <div className="absolute top-9 left-5 h-1.5 w-20 rounded-full bg-slate-200 dark:bg-slate-700" />
                    <div className="absolute top-13 left-5 h-1.5 w-16 rounded-full bg-slate-200 dark:bg-slate-700" />
                    <div className="absolute top-17 left-5 h-1.5 w-14 rounded-full bg-slate-200 dark:bg-slate-700" />
                    <div className="absolute top-21 left-5 h-1.5 w-22 rounded-full bg-brand-200 dark:bg-brand-900/50" />
                    <div className="absolute top-25 left-5 h-1.5 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
                    <div className="absolute top-29 left-5 h-1.5 w-16 rounded-full bg-slate-200 dark:bg-slate-700" />
                    
                    {currentStep !== 'ready' && (
                      <>
                        {/* Laser line with intense glow */}
                        <motion.div
                          animate={{ top: ['-10%', '110%', '-10%'] }}
                          transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                          className="absolute left-0 right-0 h-[2px] bg-brand-400 shadow-glow-primary z-10"
                        />
                        {/* Laser gradient sweep */}
                        <motion.div
                          animate={{ top: ['-10%', '110%', '-10%'] }}
                          transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                          className="absolute left-0 right-0 h-16 bg-gradient-to-t from-brand-500/30 to-transparent z-0 -translate-y-full"
                        />
                      </>
                    )}
                    {currentStep === 'ready' && (
                      <motion.div 
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="absolute inset-0 z-20 flex items-center justify-center bg-emerald-500/20 backdrop-blur-[4px]"
                      >
                        <div className="rounded-full bg-white p-2 shadow-xl dark:bg-emerald-950">
                          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                  
                  {/* Floating data particles when scanning */}
                  {currentStep !== 'ready' && (
                    <>
                      <motion.div animate={{ y: [-10, 10, -10], opacity: [0.5, 1, 0.5] }} transition={{ duration: 3, repeat: Infinity }} className="absolute -left-6 top-10 h-3 w-3 rounded-full bg-brand-400 shadow-glow-primary" />
                      <motion.div animate={{ y: [10, -15, 10], opacity: [0.5, 1, 0.5] }} transition={{ duration: 4, repeat: Infinity }} className="absolute -right-4 bottom-12 h-2 w-2 rounded-full bg-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
                      <motion.div animate={{ y: [-5, 15, -5], opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 2.5, repeat: Infinity }} className="absolute right-6 -top-4 h-2 w-2 rounded-full bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.8)]" />
                    </>
                  )}
                </div>

                {/* Progress Details */}
                <div className="flex-1 w-full text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <FileCheck className="h-3.5 w-3.5 text-brand-500" />
                      {selectedFileName}
                    </span>
                    {fileDetails && (
                      <span className="inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                        {fileDetails.size}
                      </span>
                    )}
                  </div>
                  
                  <h3 className="mt-4 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                    {currentStep === 'ready' ? (
                      <span className="bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">Profile Ready! 🎉</span>
                    ) : (
                      <span className="bg-gradient-to-r from-brand-600 to-rose-500 bg-clip-text text-transparent">Analysing your resume...</span>
                    )}
                  </h3>
                  
                  {/* Premium Progress Track */}
                  <div className="relative mt-6 h-4 w-full overflow-hidden rounded-full bg-slate-100 shadow-inner dark:bg-slate-800/80">
                    <motion.div
                      initial={{ width: '0%' }}
                      animate={{ 
                        width: currentStep === 'uploading' ? '25%' :
                              currentStep === 'extracting' ? '50%' :
                              currentStep === 'cleaning' ? '75%' :
                              currentStep === 'analysing' ? '90%' :
                              currentStep === 'ready' ? '100%' : '0%'
                      }}
                      transition={{ duration: 0.8, ease: "easeInOut" }}
                      className="relative h-full rounded-full bg-gradient-to-r from-brand-600 via-brand-500 to-rose-500 shadow-sm"
                    >
                      {/* Shimmer effect inside the bar */}
                      {currentStep !== 'ready' && (
                        <motion.div 
                          animate={{ x: ['-100%', '200%'] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-0 w-1/2 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                        />
                      )}
                    </motion.div>
                  </div>
                </div>
              </div>

              {/* Step Grid Cards */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
                {pipelineSteps.map((step, idx) => {
                  const stepOrder = ['uploading', 'extracting', 'cleaning', 'analysing', 'ready'];
                  const currentIndex = stepOrder.indexOf(currentStep);
                  const isCompleted = currentIndex > idx || currentStep === 'ready';
                  const isCurrent = currentIndex === idx && currentStep !== 'ready';

                  return (
                    <div
                      key={step.key}
                      className={`relative overflow-hidden rounded-2xl border p-4 transition-all duration-500 ${
                        isCompleted
                          ? 'border-emerald-500/30 bg-emerald-50/60 text-emerald-900 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300'
                          : isCurrent
                          ? 'border-brand-500 bg-white text-brand-900 shadow-lg shadow-brand-500/10 scale-105 z-10 dark:border-brand-500 dark:bg-slate-900 dark:text-brand-300'
                          : 'border-slate-200/60 bg-slate-50/40 text-slate-400 dark:border-slate-800/60 dark:bg-slate-950/20 dark:text-slate-500'
                      }`}
                    >
                      {/* Active step glowing background effect */}
                      {isCurrent && (
                        <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-rose-500/5 animate-pulse" />
                      )}

                      <div className="relative z-10 mb-2 flex items-center justify-between">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${isCurrent ? 'text-brand-600 dark:text-brand-400' : 'opacity-70'}`}>
                          Step 0{idx + 1}
                        </span>

                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 drop-shadow-sm dark:text-emerald-400" />
                        ) : isCurrent ? (
                          <div className="relative flex h-5 w-5 items-center justify-center">
                            <Loader2 className="absolute h-5 w-5 animate-spin text-brand-500 dark:text-brand-400" />
                            <div className="h-1.5 w-1.5 rounded-full bg-brand-500 dark:bg-brand-400" />
                          </div>
                        ) : (
                          <div className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700" />
                        )}
                      </div>

                      <h4 className="relative z-10 text-xs font-bold leading-tight">
                        {step.label}
                      </h4>

                      <p className="relative z-10 mt-1 text-[11px] leading-snug opacity-80">
                        {step.desc}
                      </p>
                      
                      {/* Bottom active line indicator */}
                      {isCurrent && (
                        <motion.div layoutId="activeStepLine" className="absolute bottom-0 left-0 right-0 h-1 bg-brand-500" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Ready State Actions */}
              <AnimatePresence>
                {currentStep === 'ready' && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 dark:border-emerald-900/40 dark:bg-emerald-950/30 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-6 w-6" />
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-900 dark:text-white">
                          Profile extraction completed successfully
                        </h5>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Redirecting to your Candidate Profile in a moment...
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <Button variant="outline" size="sm" onClick={resetUpload}>
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                        Re-upload
                      </Button>

                      <Link to="/profile">
                        <Button size="sm" className="shadow-md shadow-brand-500/20">
                          <UserCheck className="mr-1.5 h-4 w-4" />
                          View Profile
                        </Button>
                      </Link>

                      <Link to="/roles">
                        <Button size="sm" variant="secondary">
                          <Target className="mr-1.5 h-4 w-4 text-brand-600 dark:text-brand-400" />
                          Choose Role
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          )}
        </Card>
      </motion.div>

      {/* ============================================================
          ACTIVE RESUME SNAPSHOT (If candidate already has one)
      ============================================================ */}
      {candidateProfile && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              <Sparkles className="h-6 w-6 text-brand-500" />
              Active Candidate Profile
            </h3>
            <Link
              to="/profile"
              className="group flex items-center gap-1.5 text-sm font-bold text-brand-600 transition-colors hover:text-brand-500 dark:text-brand-400"
            >
              View Full Profile
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-1 shadow-xl shadow-brand-500/5 transition-all hover:shadow-brand-500/10 dark:border-slate-800 dark:bg-slate-950/50">
            {/* Background decorative glow */}
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-500/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

            <div className="relative z-10 flex flex-col gap-6 rounded-[22px] bg-slate-50/50 p-6 backdrop-blur-xl dark:bg-slate-900/50 sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-5">
                  <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 text-white shadow-lg shadow-brand-500/25">
                    <UserCheck className="h-8 w-8" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                      {candidateProfile.candidate?.name || 'Candidate Name'}
                    </h4>
                    <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm font-medium text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {candidateProfile.candidate?.email || 'Email missing'}
                      </span>
                      <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
                      <span className="flex items-center gap-1.5">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {candidateProfile.candidate?.phone || 'Phone missing'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-4 sm:items-end">
                  <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 py-1.5 pl-2.5 pr-3.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                    </span>
                    Profile Ready
                  </div>

                  <Link to="/roles" className="w-full sm:w-auto">
                    <Button className="group w-full bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 sm:w-auto shadow-xl shadow-slate-900/10 dark:shadow-white/10">
                      Start Mock Interview
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Extracted Tech Stack Chips */}
              <div className="mt-4 border-t border-slate-200 pt-6 dark:border-slate-800/60">
                <h5 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Extracted Tech Stack & Core Competencies
                </h5>
                <div className="flex flex-wrap gap-2.5">
                  {candidateProfile.skills && Object.keys(candidateProfile.skills).length > 0 ? (
                    Object.values(candidateProfile.skills)
                      .flat()
                      .slice(0, 15)
                      .map((skill: any, idx) => (
                        <span
                          key={idx}
                          className="flex items-center gap-1.5 rounded-xl border border-slate-200/60 bg-white/60 px-3.5 py-1.5 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:bg-white hover:text-brand-700 hover:shadow-md dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:border-brand-500/50 dark:hover:bg-slate-800 dark:hover:text-brand-300"
                        >
                          <div className="h-1.5 w-1.5 rounded-full bg-brand-500/60" />
                          {skill}
                        </span>
                      ))
                  ) : (
                    <span className="text-sm font-medium text-slate-400">No skill tags extracted.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ============================================================
          HOW IT WORKS / BEST PRACTICES
      ============================================================ */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
            <Cpu className="h-5 w-5" />
          </div>
          <h4 className="mt-4 font-bold text-slate-900 dark:text-white">
            Adaptive Personalization
          </h4>
          <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-400">
            Questions during your mock session are created around the actual projects, languages, and architectures found in your resume.
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Zap className="h-5 w-5" />
          </div>
          <h4 className="mt-4 font-bold text-slate-900 dark:text-white">
            Skill Gap Detection
          </h4>
          <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-400">
            The AI benchmarks your stated competencies against target job descriptions to identify areas where deeper answers will score higher.
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h4 className="mt-4 font-bold text-slate-900 dark:text-white">
            Secure Processing
          </h4>
          <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-400">
            Your resume is securely transmitted to our backend for parsing and candidate profile generation.
          </p>
        </Card>
      </section>

      {/* ============================================================
          HELP / TIPS BANNER
      ============================================================ */}
      <Card className="border-slate-200 bg-slate-50/70 p-6 dark:border-slate-800 dark:bg-slate-950/40">
        <div className="flex items-start gap-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            <strong className="text-slate-900 dark:text-white">Tips for highest parsing accuracy:</strong> Use standard section titles (e.g., <em>Education</em>, <em>Skills</em>, <em>Work Experience</em>, <em>Projects</em>). Ensure your PDF is text-selectable (not a scanned image) to maximize accuracy during AI tokenization.
          </div>
        </div>
      </Card>

    </PageWrapper>
  );
};

export default ResumeUploadPage;
