import React, { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Logo } from '../components/common/Logo';
import { useToast } from '../context/ToastContext';
import { apiService } from '../services/apiService';

export const VerifyOTPPage: React.FC = () => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const email = location.state?.email;

  if (!email) {
    return <Navigate to="/forgot-password" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
       addToast('error', 'Invalid OTP', 'Please enter a 6-digit verification code.');
       return;
    }
    setLoading(true);
    try {
      const result = await apiService.verifyOTP(email, otp);
      addToast('success', 'Verified', 'Verification successful. You can now reset your password.');
      navigate('/reset-password', { state: { email, token: result.reset_token } });
    } catch (err: any) {
      addToast('error', 'Verification Failed', err.message || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await apiService.forgotPassword(email);
      addToast('info', 'OTP Resent', 'A new verification code has been sent.');
    } catch (err: any) {
      addToast('error', 'Resend Failed', err.message || 'Could not resend OTP');
    }
  };

  return (
    <PageWrapper className="min-h-[calc(100vh-5rem)] flex items-center justify-center">
      <Card className="w-full max-w-md p-8 shadow-2xl glass-panel-light dark:glass-panel-dark border border-slate-200/80 dark:border-border-dark">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="mb-3 flex justify-center">
            <Logo size="lg" showText={false} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Verify Your Email</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Enter the 6-digit verification code sent to your email.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="otp-input" className="sr-only">
              One Time Code
            </label>
            <input
              id="otp-input"
              type="text"
              maxLength={6}
              required
              autoComplete="one-time-code"
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="w-full text-center tracking-[0.5em] font-mono py-2.5 text-lg rounded-xl bg-slate-50 dark:bg-surface-dark-elevated border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
          </div>

          <Button type="submit" isLoading={loading} size="lg" className="w-full mt-4">
            Verify OTP
          </Button>

          <div className="text-center pt-4 border-t border-slate-100 dark:border-white/5 mt-6">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Didn't receive the code?{' '}
              <button type="button" onClick={handleResend} className="font-bold text-brand-600 dark:text-brand-400 hover:underline">
                Resend OTP
              </button>
            </p>
          </div>
        </form>
      </Card>
    </PageWrapper>
  );
};
