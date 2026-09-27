import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Mail, ArrowLeft } from 'lucide-react';
import { Logo } from '../components/common/Logo';
import { useToast } from '../context/ToastContext';
import { apiService } from '../services/apiService';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await apiService.forgotPassword(email);
      addToast('info', 'Check your email', 'If an account exists, a verification code has been sent.');
      navigate('/verify-otp', { state: { email } });
    } catch (err: any) {
      addToast('error', 'Request Failed', err.message || 'Could not send verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper className="min-h-[calc(100vh-5rem)] flex items-center justify-center">
      <Card className="w-full max-w-md p-8 shadow-2xl glass-panel-light dark:glass-panel-dark border border-slate-200/80 dark:border-border-dark">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="mb-3 flex justify-center">
            <Logo size="lg" showText={false} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Forgot Password</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Enter your registered email address and we'll send you a verification code.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-surface-dark-elevated border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
            </div>
          </div>

          <Button type="submit" isLoading={loading} size="lg" className="w-full mt-4">
            Send OTP
          </Button>

          <div className="text-center pt-2">
            <Link to="/login" className="inline-flex items-center text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Back to Sign In
            </Link>
          </div>
        </form>
      </Card>
    </PageWrapper>
  );
};
