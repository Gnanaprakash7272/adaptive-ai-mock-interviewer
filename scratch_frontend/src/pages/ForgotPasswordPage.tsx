import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Logo } from '../components/common/Logo';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('alex.rivera@techcorp.io');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <PageWrapper className="min-h-[calc(100vh-5rem)] flex items-center justify-center">
      <Card className="w-full max-w-md p-8 shadow-2xl glass-panel-light dark:glass-panel-dark border border-slate-200/80 dark:border-border-dark">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="mb-3 flex justify-center">
            <Logo size="lg" showText={false} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Reset Password</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Enter your email to receive a password reset link
          </p>
        </div>

        {submitted ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Reset Link Sent!</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              We've dispatched a password reset link to <strong className="text-slate-800 dark:text-slate-200">{email}</strong>.
            </p>
            <Link to="/login" className="inline-block pt-2">
              <Button size="sm" variant="outline">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Sign In
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Account Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-surface-dark-elevated border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                />
              </div>
            </div>

            <Button type="submit" isLoading={loading} size="lg" className="w-full mt-4">
              Send Reset Instructions
            </Button>

            <div className="text-center pt-2">
              <Link to="/login" className="inline-flex items-center text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </Card>
    </PageWrapper>
  );
};
