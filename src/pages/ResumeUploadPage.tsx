import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  UserCheck,
  RefreshCw,
  Loader2,
  Target,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiService } from '../services/apiService';
import type { Resume } from '../types';
import { mockResume } from '../mock/mockData';

type ExtractionStep = 'idle' | 'uploading' | 'extracting' | 'cleaning' | 'analysing' | 'ready';

export const ResumeUploadPage: React.FC = () => {
  const { activeResume, setActiveResume } = useAuth();
  const { addToast } = useToast();

  const [isDragging, setIsDragging] = useState(false);
  const [currentStep, setCurrentStep] = useState<ExtractionStep>('idle');
  const [progressPercent, setProgressPercent] = useState(0);
  const [selectedFileName, setSelectedFileName] = useState<string>('');

  const pipelineSteps = [
    { key: 'uploading', label: 'Uploading PDF', desc: 'Secure multipart transfer to FastAPI server' },
    { key: 'extracting', label: 'Extracting Content', desc: 'PDF text extraction & metadata parsing' },
    { key: 'cleaning', label: 'Cleaning & Tokenizing', desc: 'Removing artifacts & structuring JSON fields' },
    { key: 'analysing', label: 'AI Analysing Profile', desc: 'Gemini model mapping skills, projects & topics' },
    { key: 'ready', label: 'Profile Ready ✓', desc: 'Candidate Profile generated successfully' },
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFileUpload = async (file: File) => {
    setSelectedFileName(file.name);
    setCurrentStep('uploading');
    setProgressPercent(20);

    // Step 1: Uploading...
    await new Promise((r) => setTimeout(r, 600));
    setCurrentStep('extracting');
    setProgressPercent(45);

    // Step 2: Extracting...
    await new Promise((r) => setTimeout(r, 700));
    setCurrentStep('cleaning');
    setProgressPercent(70);

    // Step 3: Cleaning...
    await new Promise((r) => setTimeout(r, 600));
    setCurrentStep('analysing');
    setProgressPercent(90);

    // Step 4: Analysing (Calls FastAPI /resume/analyze)...
    try {
      const parsedProfile = await apiService.analyzeResume(file);
      const newResume: Resume = {
        ...mockResume,
        id: `res_${Date.now().toString().slice(-4)}`,
        filename: file.name,
        uploadDate: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
        fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        techStackSummary: parsedProfile.skills.slice(0, 10),
      };

      setProgressPercent(100);
      setCurrentStep('ready');
      setActiveResume(newResume);

      addToast(
        'success',
        'Profile Ready!',
        `Successfully extracted ${parsedProfile.skills.length} skills and projects with Gemini AI.`
      );
    } catch {
      setCurrentStep('idle');
      addToast('error', 'Upload failed', 'Please try again.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFileUpload(e.target.files[0]);
    }
  };

  const currentResume = activeResume || mockResume;

  return (
    <PageWrapper className="space-y-8 max-w-5xl">
      {/* Page Header */}
      <div>
        <span className="text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">
          Step 3: Resume Intelligence
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
          Resume Upload & AI Profile Extraction
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Upload your resume PDF to trigger the multi-stage extraction pipeline (POST <code className="text-brand-600 dark:text-brand-400 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">/resume/analyze</code>) and auto-build your candidate profile.
        </p>
      </div>

      {/* UPLOAD DROPZONE & PIPELINE VISUALIZER */}
      <Card className="p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-surface-dark-card transition-all">
        {currentStep === 'idle' ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center text-center p-6 rounded-2xl transition-colors cursor-pointer ${
              isDragging ? 'bg-brand-500/10 border-brand-500' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
          >
            <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-4 shadow-inner">
              <UploadCloud className="w-8 h-8" />
            </div>

            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Drop your Resume PDF here or click to browse
            </h3>
            <p className="text-xs text-slate-400 mt-1">Supports PDF (up to 10MB)</p>

            <label className="mt-5 cursor-pointer">
              <Button size="md" className="pointer-events-none shadow-lg">
                <FileText className="w-4 h-4 mr-2" />
                Select PDF File
              </Button>
              <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
            </label>
          </div>
        ) : (
          <div className="py-4 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                  Processing: {selectedFileName || 'Candidate_Resume.pdf'}
                </span>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-white mt-0.5">
                  {currentStep === 'ready' ? 'Candidate Profile Ready! 🎉' : 'AI Analysis Pipeline in Progress...'}
                </h3>
              </div>
              <span className="text-xl font-black text-brand-600 dark:text-brand-400">
                {progressPercent}%
              </span>
            </div>

            {/* Stepped Pipeline Track */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.4 }}
                className="h-full bg-gradient-to-r from-cyan-500 via-brand-500 to-indigo-500 rounded-full"
              />
            </div>

            {/* Visual Step Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
              {pipelineSteps.map((s, idx) => {
                const stepOrder = ['uploading', 'extracting', 'cleaning', 'analysing', 'ready'];
                const currentIndex = stepOrder.indexOf(currentStep);
                const isCompleted = currentIndex > idx || currentStep === 'ready';
                const isCurrent = currentIndex === idx && currentStep !== 'ready';

                return (
                  <div
                    key={s.key}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isCompleted
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                        : isCurrent
                        ? 'bg-brand-500/10 border-brand-500/50 text-brand-600 dark:text-brand-400 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : isCurrent ? (
                        <Loader2 className="w-4 h-4 animate-spin text-brand-500 shrink-0" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 text-[10px] flex items-center justify-center">
                          {idx + 1}
                        </span>
                      )}
                      <span className="text-xs font-bold leading-none">{s.label}</span>
                    </div>
                    <p className="text-[10px] opacity-80 leading-snug">{s.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* Complete CTAs */}
            {currentStep === 'ready' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800"
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>Your resume has been cleaned, parsed, and converted to Candidate Profile.</span>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCurrentStep('idle');
                      setProgressPercent(0);
                    }}
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Re-upload
                  </Button>
                  <Link to="/profile">
                    <Button size="sm" className="shadow-lg shadow-brand-500/25">
                      <UserCheck className="w-4 h-4 mr-1.5" /> View Candidate Profile
                    </Button>
                  </Link>
                  <Link to="/roles">
                    <Button size="sm" variant="secondary">
                      <Target className="w-4 h-4 mr-1.5 text-cyan-600" /> Choose Role
                    </Button>
                  </Link>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </Card>

      {/* ACTIVE RESUME SNAPSHOT */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-500" />
            Current Active Resume & Extracted Skills
          </h3>
          <Link to="/profile" className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline">
            View Full Candidate Profile →
          </Link>
        </div>

        <Card className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{currentResume.filename}</h4>
                <p className="text-xs text-slate-500">
                  {currentResume.fileSize} • Uploaded on {currentResume.uploadDate}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                AI Parsed & Ready
              </span>
              <Link to="/roles">
                <Button size="sm">
                  Start Mock <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Extracted Tech Stack Chips */}
          <div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
              Extracted Tech Stack & Core Competencies
            </span>
            <div className="flex flex-wrap gap-2">
              {currentResume.techStackSummary.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-surface-dark-elevated text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-white/5"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </PageWrapper>
  );
};
