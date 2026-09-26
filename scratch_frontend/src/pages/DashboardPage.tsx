import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import {
  PlayCircle,
  FileText,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/apiService';
import type { CandidateProfile } from '../types';


export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await apiService.getCandidateProfile();
        setProfile(data);
      } catch (err) {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  return (
    <PageWrapper className="space-y-8 max-w-5xl mx-auto">
      {/* 1. Welcome / Intro */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-10 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-4">
            AI MOCKORA
            <span className="block text-xl sm:text-2xl font-bold text-brand-600 dark:text-brand-400 mt-2">
              AI Mock Interview Practice
            </span>
          </h1>
          
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">
            Ready for your next interview, {user?.name.split(' ')[0] || 'Candidate'}?
          </h2>
          
          <p className="text-slate-600 dark:text-slate-400 text-lg mb-8 leading-relaxed">
            Upload your resume, choose a target role, and practise with an adaptive AI interviewer that adjusts questions based on your answers.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <Link to="/roles">
              <Button size="lg" className="shadow-lg shadow-brand-500/25">
                <PlayCircle className="w-5 h-5 mr-2" />
                Start Interview
              </Button>
            </Link>
            <Link to="/profile">
              <Button variant="outline" size="lg">
                <UserCheck className="w-5 h-5 mr-2" />
                View Candidate Profile
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 2. Profile Status */}
        <Card className="p-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Profile Status</h3>
          
          {loading ? (
            <div className="animate-pulse flex items-center space-x-4">
              <div className="rounded-full bg-slate-200 dark:bg-slate-800 h-12 w-12"></div>
              <div className="flex-1 space-y-3 py-1">
                <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
                <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
              </div>
            </div>
          ) : profile ? (
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Profile Ready
                </h4>
                <p className="text-sm text-slate-500 mt-1 mb-4">
                  Your resume has been processed. We've identified {profile.skills ? Object.keys(profile.skills).reduce((acc, cat) => acc + ((profile.skills as any)[cat]?.length || 0), 0) : 0} skills and {profile.experience?.length || 0} experience entries for your interviews.
                </p>
                <Link to="/profile">
                  <Button variant="secondary" size="sm">Review Profile</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                  No profile found
                </h4>
                <p className="text-sm text-slate-500 mt-1 mb-4">
                  Upload your resume to personalise your interview.
                </p>
                <Link to="/resume/upload">
                  <Button size="sm">Upload Resume</Button>
                </Link>
              </div>
            </div>
          )}
        </Card>

        {/* 3. Recent Interview */}
        <Card className="p-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Recent Interview</h3>
          
          {/* Always empty state if we don't have a real endpoint yet, or show "No interviews yet." */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                No interviews yet.
              </h4>
              <p className="text-sm text-slate-500 mt-1 mb-4">
                Complete your first mock interview to see your performance and reports here.
              </p>
              <Link to="/roles">
                <Button variant="outline" size="sm">Start Your First Interview</Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>

      {/* 4. How It Works */}
      <div className="pt-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">How It Works</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { step: '1', title: 'Upload Resume', icon: <FileText className="w-5 h-5" /> },
            { step: '2', title: 'Choose Role', icon: <UserCheck className="w-5 h-5" /> },
            { step: '3', title: 'Answer AI Questions', icon: <PlayCircle className="w-5 h-5" /> },
            { step: '4', title: 'Receive Feedback', icon: <AlertCircle className="w-5 h-5" /> },
            { step: '5', title: 'Review Report', icon: <CheckCircle2 className="w-5 h-5" /> },
          ].map((item) => (
            <Card key={item.step} className="p-4 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-brand-600 flex items-center justify-center mb-3">
                {item.icon}
              </div>
              <span className="text-xs font-bold text-slate-400 mb-1">Step {item.step}</span>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</h4>
            </Card>
          ))}
        </div>
      </div>

    </PageWrapper>
  );
};
