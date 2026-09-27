import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { Logo } from '../components/common/Logo';
import { useToast } from '../context/ToastContext';
import { apiService } from '../services/apiService';

export const ResetPasswordPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const email = location.state?.email;
  const token = location.state?.token;

  if (!email || !token) {
    navigate('/forgot-password');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      addToast('error', 'Mismatch', 'Passwords do not match');
      return;
    }
    if (password.length < 8) {
      addToast('error', 'Too short', 'Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await apiService.resetPassword(email, token, password);
      setSuccess(true);
    } catch (err: any) {
      addToast('error', 'Reset Failed', err.message || 'Could not reset password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <PageWrapper className="min-h-[calc(100vh-5rem)] flex items-center justify-center">
        <Card className="w-full max-w-md p-8 shadow-2xl glass-panel-light dark:glass-panel-dark border border-slate-200/80 dark:border-border-dark text-center space-y-4">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Password reset successfully.</h2>
          <Link to="/login" className="inline-block pt-4">
            <Button size="sm">
              Back to Sign In
            </Button>
          </Link>
        </Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="min-h-[calc(100vh-5rem)] flex items-center justify-center">
      <Card className="w-full max-w-md p-8 shadow-2xl glass-panel-light dark:glass-panel-dark border border-slate-200/80 dark:border-border-dark">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="mb-3 flex justify-center">
            <Logo size="lg" showText={false} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">Create New Password</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-surface-dark-elevated border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 rounded"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-surface-dark-elevated border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
              <button
                type="button"
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 rounded"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" isLoading={loading} size="lg" className="w-full mt-4">
            Reset Password
          </Button>
        </form>
      </Card>
    </PageWrapper>
  );
};
