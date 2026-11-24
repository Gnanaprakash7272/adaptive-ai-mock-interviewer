import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Lock,
  EyeOff,
  Database,
  Cookie,
  UserCheck,
  FileText,
  Mail,
  Printer,
  Sparkles,
  Server,
  Search,
  Download,
  Trash2,
  Shield,
  Layers,
  History,
} from 'lucide-react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useCookie } from '../context/CookieContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const SECTIONS = [
  { id: 'collection', label: '1. Information We Collect' },
  { id: 'resume-privacy', label: '2. Resume & Voice Anonymization' },
  { id: 'llm-processing', label: '3. AI Models & Data Flow' },
  { id: 'cookies', label: '4. Cookie Technologies' },
  { id: 'rights', label: '5. Candidate Rights & Deletion' },
  { id: 'security', label: '6. Storage & Security' },
  { id: 'contact', label: '7. Privacy Inquiries & DPO' },
];

const SUBPROCESSORS = [
  {
    name: 'Google Cloud Platform (Vertex AI)',
    service: 'Gemini 2.5 Flash Inference',
    location: 'US-East (N. Virginia)',
    dataSent: 'Sanitized interview transcripts (PII stripped)',
    retention: 'Zero-day retention agreement',
    certification: 'SOC-2 Type II, ISO 27001',
  },
  {
    name: 'Groq Inc.',
    service: 'Llama 3.3 70B Fast Inference',
    location: 'US-West (Oregon)',
    dataSent: 'HR & Behavioral evaluation prompts',
    retention: 'Ephemeral execution memory only',
    certification: 'SOC-2 Type II compliant',
  },
  {
    name: 'Supabase Inc. / AWS',
    service: 'PostgreSQL Database & Auth',
    location: 'US-East (AWS us-east-1)',
    dataSent: 'Encrypted user credentials & session reports',
    retention: 'Controlled by user account lifecycle',
    certification: 'SOC-2 Type II, HIPAA eligible',
  },
  {
    name: 'Browser Web Audio API',
    service: 'Client-side Speech Capture',
    location: 'Local Candidate Device',
    dataSent: 'Microphone stream converted to text in-browser',
    retention: 'Zero remote raw audio retention',
    certification: 'Local sandbox execution',
  },
];

const CHANGELOG = [
  {
    version: 'v2.2',
    date: 'November 2026',
    title: 'Full PII Sanitization Pipeline & Cookie Preferences Center',
    changes: [
      'Automated regex stripping of email addresses and phone numbers prior to LLM processing.',
      'Added granular cookie preferences center with GDPR/CCPA tier toggles.',
      'Explicit zero-retention declarations with inference providers.',
    ],
  },
  {
    version: 'v2.1',
    date: 'October 2026',
    title: 'Voice Audio Privacy & AudioContext Clarification',
    changes: [
      'Clarified in-browser Web Audio API microphone handling.',
      'Guaranteed zero third-party data broker sharing for speech metrics.',
    ],
  },
  {
    version: 'v2.0',
    date: 'September 2026',
    title: 'Initial Multi-Track Privacy Architecture',
    changes: [
      'Established PostgreSQL Row-Level Security (RLS) isolation.',
      'Launched candidate data export and account erasure SLA (within 48 hours).',
    ],
  },
];

export const PrivacyPolicyPage: React.FC = () => {
  const { openPreferencesModal } = useCookie();
  const { addToast } = useToast();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'policy' | 'architecture' | 'subprocessors' | 'changelog'>('policy');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('collection');

  const handlePrint = () => {
    window.print();
  };

  const handleExportData = () => {
    const dataPackage = {
      exportDate: new Date().toISOString(),
      user: user ? { username: user.username, email: user.email } : 'Anonymous Candidate',
      notice: 'Candidate Mock Interview Data Package',
      policiesAgreed: 'Mockora Terms of Service & Privacy Policy v2.2',
      securityStatus: 'Encrypted with TLS 1.3 & Supabase Row-Level Security',
    };

    const blob = new Blob([JSON.stringify(dataPackage, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mockora_privacy_data_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);

    addToast('success', 'Data Package Exported', 'Your candidate privacy package has been downloaded as JSON.');
  };

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return SECTIONS;
    return SECTIONS.filter((s) => s.label.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery]);

  return (
    <PageWrapper className="py-8 space-y-8 max-w-5xl">
      {/* Hero Trust Banner */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800/60">
            <ShieldCheck className="w-3.5 h-3.5" />
            Enterprise Privacy &amp; Trust Center
          </div>

          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Policy v2.2 • Certified GDPR &amp; CCPA Ready</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Privacy &amp; Data Governance
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              How Mockora protects your resumes, audio speech streams, and interview performance reports
              with automated PII sanitization and zero model-training guarantees.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={openPreferencesModal}
              className="text-xs rounded-xl flex items-center gap-1.5"
            >
              <Cookie className="w-3.5 h-3.5 text-brand-500" />
              Cookies
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrint}
              className="text-xs rounded-xl flex items-center gap-1.5 border border-slate-200 dark:border-white/10"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </Button>
          </div>
        </div>
      </div>

      {/* Trust & Compliance Badges Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-surface-light-card dark:bg-surface-dark-card space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <EyeOff className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">PII Masked</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Automated phone &amp; email redaction before AI models.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-surface-light-card dark:bg-surface-dark-card space-y-1">
          <div className="flex items-center gap-1.5 text-brand-600 dark:text-brand-400">
            <Lock className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Zero Training</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Your interviews are never used to train public LLMs.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-surface-light-card dark:bg-surface-dark-card space-y-1">
          <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
            <Database className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Postgres RLS</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Row-Level Security isolates candidate data.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-surface-light-card dark:bg-surface-dark-card space-y-1">
          <div className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
            <Shield className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">GDPR &amp; CCPA</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            One-click data export and account erasure rights.
          </p>
        </div>
      </div>

      {/* Interactive Candidate Privacy Action Center */}
      <Card className="p-5 sm:p-6 border-brand-200/80 dark:border-brand-900/40 bg-gradient-to-r from-brand-50/40 via-surface-light-card to-indigo-50/30 dark:from-brand-950/20 dark:via-surface-dark-card dark:to-transparent">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-500" />
              Candidate Privacy &amp; Data Rights Hub
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Exercise your data rights directly from your browser.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportData}
              className="text-xs rounded-xl flex items-center gap-1.5 border border-slate-200 dark:border-white/10"
            >
              <Download className="w-3.5 h-3.5" />
              Export My Data
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={openPreferencesModal}
              className="text-xs rounded-xl flex items-center gap-1.5"
            >
              <Cookie className="w-3.5 h-3.5 text-brand-500" />
              Cookie Controls
            </Button>

            <a
              href="mailto:privacy@mockora.ai?subject=Data%20Erasure%20Request%20-%20Mockora"
              className="inline-flex"
            >
              <Button
                variant="outline"
                size="sm"
                className="text-xs rounded-xl flex items-center gap-1.5 text-rose-600 border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Request Erasure
              </Button>
            </a>
          </div>
        </div>
      </Card>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-border-dark pb-2 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('policy')}
          className={`px-3.5 py-1.5 rounded-xl transition-colors shrink-0 ${
            activeTab === 'policy'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Full Policy Text
        </button>

        <button
          onClick={() => setActiveTab('architecture')}
          className={`px-3.5 py-1.5 rounded-xl transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === 'architecture'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Data Architecture Flow
        </button>

        <button
          onClick={() => setActiveTab('subprocessors')}
          className={`px-3.5 py-1.5 rounded-xl transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === 'subprocessors'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          Sub-processors Transparency
        </button>

        <button
          onClick={() => setActiveTab('changelog')}
          className={`px-3.5 py-1.5 rounded-xl transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === 'changelog'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          Version Changelog
        </button>
      </div>

      {/* TAB 1: FULL POLICY TEXT */}
      {activeTab === 'policy' && (
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 items-start">
          {/* Table of contents sticky sidebar */}
          <div className="hidden lg:block sticky top-24 space-y-3 p-3.5 rounded-2xl border border-slate-200/80 dark:border-border-dark bg-surface-light-card dark:bg-surface-dark-card text-xs">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <span className="block px-2 font-bold text-slate-400 uppercase tracking-widest text-[10px]">
              Sections
            </span>

            <div className="space-y-1">
              {filteredSections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  onClick={() => setActiveSection(section.id)}
                  className={`block px-3 py-2 rounded-xl transition-colors font-medium text-[11px] ${
                    activeSection === section.id
                      ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {section.label}
                </a>
              ))}
            </div>
          </div>

          {/* Detailed Policy Text */}
          <div className="space-y-8 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
            {/* Section 1 */}
            <Card id="collection" className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-black text-lg">
                <FileText className="w-5 h-5 text-brand-500" />
                <h2>1. Information We Collect</h2>
              </div>
              <p>
                When you use Mockora to prepare for technical, HR, or behavioral interviews, we collect
                information strictly necessary to generate relevant questions and provide rigorous hiring feedback:
              </p>
              <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm pl-2">
                <li>
                  <strong className="text-slate-900 dark:text-slate-100">Account Credentials:</strong> Email
                  address and authenticated identifiers managed securely via Supabase Auth with JWT tokens.
                </li>
                <li>
                  <strong className="text-slate-900 dark:text-slate-100">Resume Artifacts:</strong> PDF resumes
                  uploaded to extract technical skills, programming languages, past projects, and domain experience.
                </li>
                <li>
                  <strong className="text-slate-900 dark:text-slate-100">Interview Transcripts &amp; Answers:</strong> Text
                  and speech transcripts generated during your active mock interview room sessions.
                </li>
                <li>
                  <strong className="text-slate-900 dark:text-slate-100">Diagnostic Telemetry:</strong> Audio latency,
                  browser speech recognition events, and device capability metrics.
                </li>
              </ul>
            </Card>

            {/* Section 2 */}
            <Card id="resume-privacy" className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-black text-lg">
                <EyeOff className="w-5 h-5 text-brand-500" />
                <h2>2. Resume &amp; Voice Anonymization (PII Stripping Pipeline)</h2>
              </div>
              <p>
                Protecting candidate confidentiality is a core architecture principle of Mockora:
              </p>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-surface-dark-elevated border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                  Automated PII Cleansing Routine
                </div>
                <p>
                  Prior to sending resume text to large language models for skill profiling, our backend
                  automatically applies regex-based sanitization (`strip_pii`) to strip email addresses, phone numbers,
                  and direct personal contact identifiers.
                </p>
              </div>
              <p className="text-xs sm:text-sm">
                Your voice audio processed via browser Web Audio APIs is transformed into text transcripts
                for evaluation. Raw microphone buffers are processed ephemerally and not retained on servers.
              </p>
            </Card>

            {/* Section 3 */}
            <Card id="llm-processing" className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-black text-lg">
                <Server className="w-5 h-5 text-brand-500" />
                <h2>3. AI Models &amp; Data Flow</h2>
              </div>
              <p>
                Mockora utilizes commercial and open-weights AI inference endpoints (Google Gemini 2.5 Flash
                and Groq Llama 3.3 70B) to simulate real-time interviewers.
              </p>
              <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm pl-2">
                <li>
                  We invoke enterprise API endpoints with zero-day retention agreements where supported.
                </li>
                <li>
                  Your interview answers and evaluation reports are never used to train public foundation models.
                </li>
                <li>
                  Data transmissions between your browser, our FastAPI gateway, and AI inference models
                  are encrypted using TLS 1.3 encryption.
                </li>
              </ul>
            </Card>

            {/* Section 4 */}
            <Card id="cookies" className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-black text-lg">
                <Cookie className="w-5 h-5 text-brand-500" />
                <h2>4. Cookie Technologies &amp; Local Storage</h2>
              </div>
              <p>
                We classify cookies and local storage tokens into three distinct categories:
              </p>
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <strong className="text-slate-900 dark:text-slate-100">Strictly Necessary:</strong> Manages
                  active authentication JWT tokens in Supabase, CSRF tokens, and secure routing.
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <strong className="text-slate-900 dark:text-slate-100">Functional:</strong> Remembers your
                  dark/light theme mode, microphone device choice, and custom FastAPI endpoint overrides.
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <strong className="text-slate-900 dark:text-slate-100">Analytics:</strong> Tracks question
                  generation latency and network timeouts to maintain service reliability.
                </div>
              </div>
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openPreferencesModal}
                  className="text-xs rounded-xl flex items-center gap-1.5"
                >
                  <Cookie className="w-3.5 h-3.5 text-brand-500" />
                  Customize Cookie Preferences
                </Button>
              </div>
            </Card>

            {/* Section 5 */}
            <Card id="rights" className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-black text-lg">
                <UserCheck className="w-5 h-5 text-brand-500" />
                <h2>5. Candidate Rights &amp; Data Deletion (GDPR &amp; CCPA)</h2>
              </div>
              <p>
                Regardless of your geographic location, we extend comprehensive privacy controls to all candidates:
              </p>
              <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm pl-2">
                <li>
                  <strong className="text-slate-900 dark:text-slate-100">Right to Access &amp; Portability:</strong> View
                  all past interview performance reports and score distributions directly in your Session History or export via JSON.
                </li>
                <li>
                  <strong className="text-slate-900 dark:text-slate-100">Right to Erasure (Forget Me):</strong> Request
                  the complete deletion of your account, candidate profile, and all interview records.
                </li>
                <li>
                  <strong className="text-slate-900 dark:text-slate-100">Resume Removal:</strong> Re-uploading or
                  resetting your profile immediately replaces and overwrites cached resume attributes.
                </li>
              </ul>
            </Card>

            {/* Section 6 */}
            <Card id="security" className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-black text-lg">
                <Lock className="w-5 h-5 text-brand-500" />
                <h2>6. Data Storage &amp; Security Measures</h2>
              </div>
              <p>
                Your interview scores, feedback metrics, and transcripts are stored securely in PostgreSQL with
                Row-Level Security (RLS) policies enforced. Only your authenticated user ID can read or modify
                your session reports.
              </p>
            </Card>

            {/* Section 7 */}
            <Card id="contact" className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-black text-lg">
                <Mail className="w-5 h-5 text-brand-500" />
                <h2>7. Privacy Contact &amp; Inquiries</h2>
              </div>
              <p>
                If you have any questions regarding this Privacy Policy, your rights, or wish to submit a data
                deletion request, please contact our team:
              </p>
              <div className="p-4 rounded-xl bg-brand-50/50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-800/40 text-xs sm:text-sm">
                <p>
                  <strong>Mockora AI Privacy Office &amp; Data Protection Officer</strong>
                </p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  Email:{' '}
                  <a
                    href="mailto:privacy@mockora.ai"
                    className="text-brand-600 dark:text-brand-400 font-medium hover:underline"
                  >
                    privacy@mockora.ai
                  </a>
                </p>
                <p className="mt-0.5 text-slate-600 dark:text-slate-400">
                  Response SLA: Within 48 business hours.
                </p>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: ARCHITECTURE FLOW */}
      {activeTab === 'architecture' && (
        <div className="space-y-6">
          <Card className="p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-brand-500" />
                Candidate Data Flow &amp; Privacy Boundary
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Visualizing how candidate data flows through our infrastructure with isolated trust boundaries.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                <div className="p-2 w-9 h-9 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400 flex items-center justify-center font-bold text-xs">
                  01
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Candidate Device</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Browser processes speech via Web Audio API. Resume PDF uploaded over TLS 1.3 encrypted channel.
                </p>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                  Client Sandbox
                </span>
              </div>

              <div className="p-4 rounded-2xl border border-brand-300 dark:border-brand-800/60 bg-brand-50/20 dark:bg-brand-950/20 space-y-3">
                <div className="p-2 w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-xs">
                  02
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">PII Redaction Gateway</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  FastAPI service extracts text and strips emails, phone numbers, and direct contact identifiers automatically.
                </p>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-700/60">
                  PII Stripped
                </span>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                <div className="p-2 w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                  03
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Ephemeral AI Inference</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Gemini 2.5 Flash / Groq Llama 3.3 generate adaptive questions. Zero training retention agreement enforced.
                </p>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40">
                  Zero Retention
                </span>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
                <div className="p-2 w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                  04
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Isolated Database</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Scorecard saved to PostgreSQL. Row-Level Security ensures only your authenticated session can access results.
                </p>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                  PostgreSQL RLS
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: SUBPROCESSORS MATRIX */}
      {activeTab === 'subprocessors' && (
        <Card className="overflow-x-auto p-0">
          <div className="p-5 border-b border-slate-200 dark:border-border-dark">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-brand-500" />
              Authorized Infrastructure Sub-processors
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              We vet all cloud vendors for strict SOC-2 compliance and zero-day training retention agreements.
            </p>
          </div>

          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-border-dark bg-slate-50/50 dark:bg-surface-dark-elevated/40">
                <th className="p-4 font-bold text-slate-900 dark:text-slate-100">Provider &amp; Service</th>
                <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Data Center Region</th>
                <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Scope of Data</th>
                <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Retention Policy</th>
                <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Compliance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {SUBPROCESSORS.map((sub) => (
                <tr key={sub.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-slate-900 dark:text-slate-100">{sub.name}</p>
                    <p className="text-[11px] text-slate-500">{sub.service}</p>
                  </td>
                  <td className="p-4 text-slate-600 dark:text-slate-400 font-mono text-[11px]">{sub.location}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-400">{sub.dataSent}</td>
                  <td className="p-4 text-emerald-600 dark:text-emerald-400 font-semibold">{sub.retention}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-400">{sub.certification}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* TAB 4: CHANGELOG */}
      {activeTab === 'changelog' && (
        <Card className="p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-4 h-4 text-brand-500" />
              Privacy Policy Version History &amp; Changelog
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Transparent log of all material changes made to candidate data processing terms.
            </p>
          </div>

          <div className="space-y-6 pt-2">
            {CHANGELOG.map((item) => (
              <div key={item.version} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800/40">
                      {item.version}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</h3>
                  </div>
                  <span className="text-xs text-slate-400">{item.date}</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-400 pl-1">
                  {item.changes.map((change) => (
                    <li key={change}>{change}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      )}
    </PageWrapper>
  );
};
