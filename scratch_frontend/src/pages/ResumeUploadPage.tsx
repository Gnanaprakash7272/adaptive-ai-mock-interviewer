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
    setCurrentStep('analysing');

    try {
      await apiService.analyzeResume(file);

      setCurrentStep('ready');

      addToast(
        'success',
        'Profile Extraction Complete!',
        `Successfully extracted information and built candidate profile.`
      );

      navigate('/profile', { replace: true });
    } catch (err: any) {
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
            <div className="p-8 sm:p-12">
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
                className={`group relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-10 text-center transition-all cursor-pointer ${
                  isDragging
                    ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/30'
                    : 'border-slate-300 bg-slate-50/50 hover:border-brand-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40 dark:hover:border-brand-600'
                }`}
              >
                <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-500/10 text-brand-600 transition-transform duration-300 group-hover:scale-105 dark:text-brand-400">
                  <UploadCloud className="h-10 w-10" />
                  <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white shadow-md">
                    <Sparkles className="h-3 w-3" />
                  </div>
                </div>

                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Drop your resume PDF here, or <span className="text-brand-600 underline underline-offset-4 dark:text-brand-400">browse</span>
                </h3>

                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Standard PDF files supported · Maximum file size: 10MB
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200/70 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <FileCheck className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
                    PDF format only
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200/70 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    Processed via API
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200/70 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <Cpu className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
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
            <div className="space-y-8 p-8 sm:p-12">

              {/* Progress Header */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                    Active File: {selectedFileName} {fileDetails ? `(${fileDetails.size})` : ''}
                  </span>
                  <h3 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
                    {currentStep === 'ready' ? 'Candidate Profile Ready! 🎉' : 'Analysing your resume...'}
                  </h3>
                </div>
              </div>

              {/* Progress Track */}
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full w-full rounded-full bg-gradient-to-r from-brand-600 via-rose-500 to-brand-500 shadow-sm animate-pulse"
                />
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
                      className={`relative overflow-hidden rounded-2xl border p-4 transition-all ${
                        isCompleted
                          ? 'border-emerald-500/30 bg-emerald-50/60 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300'
                          : isCurrent
                          ? 'border-brand-500 bg-brand-50/60 text-brand-900 shadow-sm dark:border-brand-600 dark:bg-brand-950/30 dark:text-brand-300'
                          : 'border-slate-200 bg-slate-50/60 text-slate-400 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-500'
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider opacity-70">
                          Step 0{idx + 1}
                        </span>

                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        ) : isCurrent ? (
                          <Loader2 className="h-5 w-5 animate-spin text-brand-600 dark:text-brand-400" />
                        ) : (
                          <div className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700" />
                        )}
                      </div>

                      <h4 className="text-xs font-bold leading-tight">
                        {step.label}
                      </h4>

                      <p className="mt-1 text-[11px] leading-snug opacity-80">
                        {step.desc}
                      </p>
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
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <Sparkles className="h-5 w-5 text-brand-600 dark:text-brand-400" />
              Current Candidate Profile
            </h3>

            <Link
              to="/profile"
              className="text-xs font-bold text-brand-600 hover:underline dark:text-brand-400"
            >
              View Full Profile →
            </Link>
          </div>

          <Card className="p-6 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                  <UserCheck className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">
                    {candidateProfile.candidate?.name || 'Candidate Name'}
                  </h4>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {candidateProfile.candidate?.email || 'Email not provided'} · {candidateProfile.candidate?.phone || 'Phone not provided'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Profile Ready
                </span>

                <Link to="/roles">
                  <Button size="sm">
                    Start Mock Interview
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Extracted Tech Stack Chips */}
            <div className="mt-5">
              <span className="mb-3 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Extracted Tech Stack & Core Competencies
              </span>
              <div className="flex flex-wrap gap-2">
                {candidateProfile.skills && Object.keys(candidateProfile.skills).length > 0 ? (
                  Object.values(candidateProfile.skills).flat().slice(0, 15).map((skill: any) => (
                    <span
                      key={skill}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-800 transition-colors hover:border-brand-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">No skill tags extracted.</span>
                )}
              </div>
            </div>
          </Card>
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
