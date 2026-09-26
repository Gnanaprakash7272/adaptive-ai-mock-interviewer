import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import {
  Mail,
  GraduationCap,
  Code,
  Briefcase,
  Award,
  Sparkles,
  BookOpen,
  RefreshCw,
  Save,
  Target,
  ArrowRight,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiService } from '../services/apiService';
import type { CandidateProfile } from '../types';


export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'unauthorized' | 'not_found' | 'server_error' | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await apiService.getCandidateProfile();
        setProfile(data);
      } catch (err: any) {
        const msg: string = err.message || '';
        // Classify by backend error message or HTTP semantics
        if (msg.includes('expired') || msg.includes('401') || msg.includes('Unauthorized') || msg.includes('credentials') || msg.includes('token')) {
          setErrorType('unauthorized');
        } else if (msg.includes('not found') || msg.includes('404') || msg.includes('No profile')) {
          setErrorType('not_found');
        } else {
          setErrorType('server_error');
        }
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleRefresh = async () => {
    addToast('info', 'Sync not available', 'Feature pending backend endpoint.');
  };

  const handleSave = async () => {
    addToast('info', 'Save not available', 'Feature pending backend endpoint.');
    setIsEditing(false);
  };

  if (loading) {
    return (
      <PageWrapper className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <h2 className="text-xl font-medium text-slate-800 dark:text-slate-200">Loading Profile...</h2>
      </PageWrapper>
    );
  }

  if (errorType === 'unauthorized') {
    return (
      <PageWrapper className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
        <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 text-amber-500 rounded-full flex items-center justify-center shadow-lg">
          <ShieldCheck className="w-10 h-10" />
        </div>
        <div className="text-center space-y-2 max-w-md">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Session Expired</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Your login session has expired. Please log in again to view your profile.
          </p>
        </div>
        <Link to="/login">
          <Button size="lg">Log In Again</Button>
        </Link>
      </PageWrapper>
    );
  }

  if (errorType === 'not_found' || (!profile && !error)) {
    return (
      <PageWrapper className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center shadow-lg">
          <Target className="w-10 h-10" />
        </div>
        <div className="text-center space-y-2 max-w-md">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">No Candidate Profile Yet</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Upload your resume to generate your AI-powered candidate profile.
          </p>
        </div>
        <Link to="/resume/upload">
          <Button size="lg" className="flex items-center gap-2">
            Upload Resume
            <ArrowRight className="w-5 h-5" />
          </Button>
        </Link>
      </PageWrapper>
    );
  }

  if (errorType === 'server_error' || (error && !profile)) {
    return (
      <PageWrapper className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
        <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 text-rose-500 rounded-full flex items-center justify-center shadow-lg">
          <Target className="w-10 h-10" />
        </div>
        <div className="text-center space-y-2 max-w-md">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Could Not Load Profile</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm font-mono bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 mt-2">
            {error}
          </p>
        </div>
        <Button size="lg" variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </PageWrapper>
    );
  }

  if (!profile) return null;

  const allSkills = Object.values(profile.skills).flat();

  return (
    <PageWrapper className="space-y-6 max-w-6xl pb-12">
      {/* 1. ULTRA-MODERN CANDIDATE COVER & HERO HEADER (NEW LIGHT THEME TYPE) */}
      <div className="relative rounded-3xl bg-white dark:bg-surface-dark-card border border-slate-200/90 dark:border-border-dark shadow-sm overflow-hidden">
        {/* Soft Ambient Mesh Background Header Banner */}
        <div className="h-32 w-full bg-gradient-to-r from-brand-500/15 via-brand-500/15 to-brand-500/15 dark:from-brand-900/30 dark:via-brand-900/30 dark:to-brand-900/30 relative">
          <div className="absolute inset-0 bg-[radial-gradient(#6366F1_1px,transparent_1px)] [background-size:16px_16px] opacity-25" />
          

        </div>

        {/* Profile Identity Bar */}
        <div className="px-6 pb-6 pt-0">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 -mt-14">
            {/* Avatar & Core Bio */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left">
              <div className="relative">
                <img
                  src={profile.avatarUrl || user?.avatarUrl}
                  alt={profile.candidate.name}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover ring-4 ring-white dark:ring-surface-dark shadow-xl"
                />
                <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-surface-dark flex items-center justify-center text-white text-[10px] font-black">
                  ✓
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                    {profile.candidate.name}
                  </h1>
                  <span className="px-3 py-0.5 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950/80 dark:text-brand-300 font-extrabold text-xs border border-brand-200 dark:border-brand-800">
                    {profile.targetRole}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-500 dark:text-slate-400 pt-0.5 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {profile.candidate.email}
                  </span>
                  {profile.candidate.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {profile.candidate.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Gemini AI Evaluated
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2.5 pt-2 md:pt-0">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} className="text-xs bg-white dark:bg-surface-dark">
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin text-brand-600' : ''}`} />
                Sync AI Profile
              </Button>

              {isEditing ? (
                <Button size="sm" onClick={handleSave} disabled={loading} className="text-xs shadow-md">
                  <Save className="w-3.5 h-3.5 mr-1.5" /> Save Changes
                </Button>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => setIsEditing(true)} className="text-xs">
                  Edit Profile
                </Button>
              )}

              <Link to="/roles">
                <Button size="sm" className="text-xs shadow-md shadow-brand-500/25 bg-brand-600 hover:bg-brand-700">
                  <Target className="w-3.5 h-3.5 mr-1.5" /> Launch Mock <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick Metrics Bar Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-white/5">
            <div className="p-3 rounded-2xl bg-slate-50/70 dark:bg-surface-dark-elevated border border-slate-100 dark:border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Candidate Track</span>
              <span className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5 block">{profile.targetRole}</span>
            </div>


            <div className="p-3 rounded-2xl bg-slate-50/70 dark:bg-surface-dark-elevated border border-slate-100 dark:border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">AI Verified Skills</span>
              <span className="text-sm font-extrabold text-brand-600 dark:text-brand-400 mt-0.5 block">{allSkills.length} Competencies</span>
            </div>


          </div>
        </div>
      </div>

      {/* 2. AI-IDENTIFIED POTENTIAL INTERVIEW TOPICS BANNER */}
      <Card className="p-6 bg-gradient-to-br from-brand-50/70 via-white to-brand-50/50 dark:from-surface-dark-card dark:via-surface-dark-elevated dark:to-surface-dark border border-brand-200/60 dark:border-brand-500/20 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-brand-100 dark:border-white/5 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                AI-Predicted Interview Question Topics
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Our Gemini interviewer engine targets these architectural areas based on your technical profile:
              </p>
            </div>
          </div>

          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-300 self-start sm:self-auto">
            LangGraph Evaluator Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {profile.potential_interview_topics.map((topic, i) => (
            <div
              key={i}
              className="p-3 rounded-xl bg-white dark:bg-surface-dark-card border border-slate-200/70 dark:border-white/10 hover:border-brand-400 transition-colors flex items-start gap-2.5 shadow-xs"
            >
              <span className="w-5 h-5 rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5 border border-brand-200/50">
                {i + 1}
              </span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                {topic}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* 3. ASYMMETRIC DUAL-COLUMN LIGHT THEME GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Skills, Expertise, Education, Certifications (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* TECHNICAL SKILLS */}
          <Card className="p-5 space-y-4 bg-white dark:bg-surface-dark-card border border-slate-200/80 dark:border-border-dark shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Code className="w-4 h-4 text-brand-600" />
                Technical Competencies
              </h3>
              <span className="text-[10px] font-bold text-slate-400">{allSkills.length} Technologies</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {allSkills.map((skill) => (
                <span
                  key={skill}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100/90 dark:bg-surface-dark-elevated text-slate-800 dark:text-slate-200 border border-slate-200/70 dark:border-white/5 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                >
                  {skill}
                </span>
              ))}
            </div>
          </Card>

          {/* CORE ARCHITECTURAL EXPERTISE */}
          <Card className="p-5 space-y-3.5 bg-white dark:bg-surface-dark-card border border-slate-200/80 dark:border-border-dark shadow-xs">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-brand-600" />
              Core Architecture & Systems
            </h3>
            <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
              {profile.expertise_areas.map((exp, i) => (
                <li key={i} className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-50/70 dark:bg-surface-dark-elevated border border-slate-100 dark:border-white/5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">{exp}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* EDUCATION */}
          <Card className="p-5 space-y-3 bg-white dark:bg-surface-dark-card border border-slate-200/80 dark:border-border-dark shadow-xs">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-brand-600" />
              Education
            </h3>
            <div className="space-y-3">
              {profile.education.map((edu, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-50/70 dark:bg-surface-dark-elevated border border-slate-100 dark:border-white/5 space-y-1">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">{edu.degree}</h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">{edu.institution}</p>
                  <p className="text-[10px] text-brand-600 dark:text-brand-400 font-bold">
                    {edu.start_year} - {edu.end_year} {edu.cgpa && `• ${edu.cgpa}`}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* CERTIFICATIONS */}
          <Card className="p-5 space-y-3 bg-white dark:bg-surface-dark-card border border-slate-200/80 dark:border-border-dark shadow-xs">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              Industry Certifications
            </h3>
            <div className="space-y-2">
              {profile.certifications.map((cert, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-surface-dark-elevated border border-slate-200/60 dark:border-white/5 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>{cert.name} ({cert.year})</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: Work Experience & Featured Projects (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* WORK EXPERIENCE TIMELINE */}
          <Card className="p-6 space-y-5 bg-white dark:bg-surface-dark-card border border-slate-200/80 dark:border-border-dark shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-brand-600" />
                Professional Experience
              </h3>
              <span className="text-[10px] font-bold text-slate-400">Career History</span>
            </div>

            <div className="space-y-6 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
              {profile.experience.map((exp, i) => (
                <div key={i} className="pl-6 relative">
                  <span className="w-4 h-4 rounded-full bg-brand-600 ring-4 ring-white dark:ring-surface-dark-card absolute left-0 top-1 shrink-0" />
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{exp.role}</h4>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 w-fit">
                      {exp.start_date} - {exp.end_date}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 mt-0.5">
                    {exp.company}
                  </p>

                  <ul className="mt-2.5 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    {exp.responsibilities.map((h, hIdx) => (
                      <li key={hIdx} className="flex items-start gap-2 leading-relaxed">
                        <span className="text-brand-500 font-bold mt-0.5">•</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Card>

          {/* FEATURED PROJECTS */}
          <Card className="p-6 space-y-4 bg-white dark:bg-surface-dark-card border border-slate-200/80 dark:border-border-dark shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                Engineering Systems & Projects
              </h3>
              <span className="text-[10px] font-bold text-slate-400">Architectural Case Studies</span>
            </div>

            <div className="space-y-4">
              {profile.projects.map((proj, i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl bg-slate-50/70 dark:bg-surface-dark-elevated border border-slate-200/70 dark:border-white/5 space-y-2 hover:border-brand-500/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                      {proj.name}
                    </h4>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                    {proj.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {proj.technologies.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/5"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
};
