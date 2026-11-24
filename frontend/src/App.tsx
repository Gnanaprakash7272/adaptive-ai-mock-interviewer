import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { CookieProvider } from './context/CookieContext';
import { CookieBanner } from './components/common/CookieBanner';
import { CookiePreferencesModal } from './components/common/CookiePreferencesModal';
import { AppLayout } from './components/layout/AppLayout';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const LandingPage = lazy(() => import('./pages/LandingPage').then((module) => ({ default: module.LandingPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })));
const SignupPage = lazy(() => import('./pages/SignupPage').then((module) => ({ default: module.SignupPage })));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })));
const VerifyOTPPage = lazy(() => import('./pages/VerifyOTPPage').then((module) => ({ default: module.VerifyOTPPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const RoleSelectionPage = lazy(() => import('./pages/RoleSelectionPage').then((module) => ({ default: module.RoleSelectionPage })));
const InterviewConfigPage = lazy(() => import('./pages/InterviewConfigPage').then((module) => ({ default: module.InterviewConfigPage })));
const InterviewRoomPage = lazy(() => import('./pages/InterviewRoomPage').then((module) => ({ default: module.InterviewRoomPage })));
const ReportPage = lazy(() => import('./pages/ReportPage').then((module) => ({ default: module.ReportPage })));
const HistoryPage = lazy(() => import('./pages/HistoryPage').then((module) => ({ default: module.HistoryPage })));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage').then((module) => ({ default: module.LeaderboardPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((module) => ({ default: module.ProfilePage })));
const ResumeUploadPage = lazy(() => import('./pages/ResumeUploadPage').then((module) => ({ default: module.ResumeUploadPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })));
const MaintenancePage = lazy(() => import('./pages/MaintenancePage').then((module) => ({ default: module.MaintenancePage })));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage').then((module) => ({ default: module.PrivacyPolicyPage })));
const PricingPage = lazy(() => import('./pages/PricingPage').then((module) => ({ default: module.PricingPage })));
const TermsPage = lazy(() => import('./pages/TermsPage').then((module) => ({ default: module.TermsPage })));
const CareerCoachPage = lazy(() => import('./pages/CareerCoachPage').then((module) => ({ default: module.CareerCoachPage })));
const ResumeBuilderPage = lazy(() => import('./pages/ResumeBuilderPage').then((module) => ({ default: module.ResumeBuilderPage })));

import { useAuth } from './context/AuthContext';

const PageLoading: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-surface-light dark:bg-surface-dark">
    <div className="animate-pulse flex flex-col items-center">
      <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-slate-500 dark:text-slate-400 font-medium">Loading page...</p>
    </div>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-light dark:bg-surface-dark">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-500 dark:text-slate-400 font-medium">Loading session...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <CookieProvider>
              <BrowserRouter>
                <Suspense fallback={<PageLoading />}>
                  <Routes>
                    <Route element={<AppLayout />}>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/signup" element={<SignupPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/verify-otp" element={<VerifyOTPPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/maintenance" element={<MaintenancePage />} />
                    <Route path="/privacy" element={<PrivacyPolicyPage />} />
                    <Route path="/pricing" element={<PricingPage />} />
                    <Route path="/terms" element={<TermsPage />} />
                    
                    {/* Protected Routes */}
                    <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                    <Route path="/career-coach" element={<ProtectedRoute><CareerCoachPage /></ProtectedRoute>} />
                    <Route path="/roles" element={<ProtectedRoute><RoleSelectionPage /></ProtectedRoute>} />
                    <Route path="/interview/config/:roleId" element={<ProtectedRoute><InterviewConfigPage /></ProtectedRoute>} />
                    <Route path="/interview/room/:sessionId" element={<ProtectedRoute><InterviewRoomPage /></ProtectedRoute>} />
                    <Route path="/report/:sessionId" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
                    <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
                    <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                    
                    <Route path="/resume/upload" element={<ProtectedRoute><ResumeUploadPage /></ProtectedRoute>} />
                    <Route path="/resume/build" element={<ProtectedRoute><ResumeBuilderPage /></ProtectedRoute>} />
                    <Route path="/resume" element={<Navigate to="/resume/upload" replace />} />
                    <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

                    <Route path="*" element={<NotFoundPage />} />
                    </Route>
                  </Routes>
                </Suspense>
                <CookieBanner />
                <CookiePreferencesModal />
              </BrowserRouter>
            </CookieProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
