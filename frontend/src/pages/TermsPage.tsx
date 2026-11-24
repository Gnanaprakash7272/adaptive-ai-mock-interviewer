import React, { useState } from 'react';
import {
  FileCheck2,
  Scale,
  ShieldAlert,
  CreditCard,
  Ban,
  HelpCircle,
  Printer,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';

export const TermsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState('acceptance');

  const sections = [
    { id: 'acceptance', label: '1. Acceptance of Terms' },
    { id: 'ai-disclaimer', label: '2. AI Simulation & Evaluation Scope' },
    { id: 'ownership', label: '3. Resume & Intellectual Property' },
    { id: 'acceptable-use', label: '4. Acceptable Use & Security' },
    { id: 'subscriptions', label: '5. Subscriptions & Billing' },
    { id: 'liability', label: '6. Limitation of Liability' },
    { id: 'termination', label: '7. Termination & Dispute' },
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <PageWrapper className="py-8 space-y-8 max-w-5xl">
      {/* Hero Header */}
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800/60">
          <Scale className="w-3.5 h-3.5" />
          Legal Agreement & Terms
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Terms of Service
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Effective Date: November 2026 • Please read carefully before using the Mockora AI platform.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/privacy">
              <Button
                variant="outline"
                size="sm"
                className="text-xs rounded-xl flex items-center gap-1.5"
              >
                Privacy Policy <ExternalLink className="w-3 h-3" />
              </Button>
            </Link>

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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 items-start">
        {/* Navigation Sidebar */}
        <div className="hidden lg:block sticky top-24 space-y-1 p-3 rounded-2xl border border-slate-200/80 dark:border-border-dark bg-surface-light-card dark:bg-surface-dark-card text-xs">
          <span className="px-3 py-1 font-bold text-slate-400 uppercase tracking-widest text-[10px]">
            Index
          </span>
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              onClick={() => setActiveSection(section.id)}
              className={`block px-3 py-2 rounded-xl transition-colors font-medium ${
                activeSection === section.id
                  ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {section.label}
            </a>
          ))}
        </div>

        {/* Policy Content */}
        <div className="space-y-8 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
          <Card id="acceptance" className="p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-black text-lg">
              <FileCheck2 className="w-5 h-5 text-brand-500" />
              <h2>1. Acceptance of Terms</h2>
            </div>
            <p>
              By accessing or creating an account on Mockora.ai (&quot;Platform&quot;, &quot;Service&quot;, &quot;we&quot;, &quot;us&quot;),
              you agree to be bound by these Terms of Service and our Privacy Policy. If you do not
              agree to these terms, you may not access or use the Service.
            </p>
          </Card>

          <Card id="ai-disclaimer" className="p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-black text-lg">
              <Sparkles className="w-5 h-5 text-brand-500" />
              <h2>2. AI Simulation & Evaluation Scope (Important Notice)</h2>
            </div>
            <p>
              Mockora is an educational training and mock simulation platform powered by advanced AI
              models (including Google Gemini 2.5 Flash and Groq Llama 3.3).
            </p>
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <strong>Simulated Hiring Feedback Disclaimer:</strong>
              <p>
                Evaluations, hire/no-hire verdicts, and rubrics generated by Mockora represent simulated
                educational feedback. They do not constitute actual job offers, employment guarantees,
                or official screening decisions on behalf of any third-party employer (such as Google, Meta, or Amazon).
              </p>
            </div>
          </Card>

          <Card id="ownership" className="p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-black text-lg">
              <Scale className="w-5 h-5 text-brand-500" />
              <h2>3. Resume & Intellectual Property Rights</h2>
            </div>
            <p>
              You retain 100% intellectual property ownership of your uploaded resumes, career summaries,
              and interview answers.
            </p>
            <p className="text-xs sm:text-sm">
              You grant Mockora a non-exclusive, limited license solely to process and analyze your resume
              data for the sole purpose of conducting your interview sessions and compiling your personal
              performance reports. We will never sell or license your resume to advertisers or third-party recruiters without your explicit permission.
            </p>
          </Card>

          <Card id="acceptable-use" className="p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-black text-lg">
              <Ban className="w-5 h-5 text-brand-500" />
              <h2>4. Acceptable Use & Platform Security</h2>
            </div>
            <p>When utilizing Mockora, you agree not to:</p>
            <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm pl-2">
              <li>Attempt prompt injection or jailbreak attacks intended to bypass LLM safety guardrails.</li>
              <li>Scrape, reverse engineer, or programmatically mass-harvest interview question banks.</li>
              <li>Upload malicious PDF binaries or exploit buffer overflows in text extraction routines.</li>
              <li>Share or resell your individual account credentials to multiple unauthorized parties.</li>
            </ul>
          </Card>

          <Card id="subscriptions" className="p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-black text-lg">
              <CreditCard className="w-5 h-5 text-brand-500" />
              <h2>5. Subscriptions, Billing & Cancellations</h2>
            </div>
            <p>
              Mockora offers both Free Starter tiers and paid Pro Candidate recurring subscriptions.
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-xs sm:text-sm pl-2">
              <li>Paid subscriptions renew automatically at the end of each billing cycle (monthly or annually).</li>
              <li>You may cancel recurring renewals at any time from your Platform Settings page.</li>
              <li>All paid plans feature our 7-day money-back guarantee for initial purchases.</li>
            </ul>
          </Card>

          <Card id="liability" className="p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-black text-lg">
              <ShieldAlert className="w-5 h-5 text-brand-500" />
              <h2>6. Limitation of Liability</h2>
            </div>
            <p className="text-xs sm:text-sm">
              To the maximum extent permitted by applicable law, Mockora and its developers shall not be
              liable for any indirect, incidental, special, consequential, or punitive damages arising from
              interview outcomes, server downtime, or AI model latency fluctuations.
            </p>
          </Card>

          <Card id="termination" className="p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-black text-lg">
              <HelpCircle className="w-5 h-5 text-brand-500" />
              <h2>7. Termination & Support Inquiries</h2>
            </div>
            <p>
              We reserve the right to suspend or terminate accounts that violate our Acceptable Use policy.
              For questions regarding these Terms, contact our legal counsel at:
            </p>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-surface-dark-elevated border border-slate-200 dark:border-slate-800 text-xs">
              <p className="font-bold text-slate-900 dark:text-slate-100">Mockora Legal Operations</p>
              <p className="mt-1 text-slate-600 dark:text-slate-400">
                Email:{' '}
                <a href="mailto:legal@mockora.ai" className="text-brand-600 dark:text-brand-400 font-semibold hover:underline">
                  legal@mockora.ai
                </a>
              </p>
            </div>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
};
