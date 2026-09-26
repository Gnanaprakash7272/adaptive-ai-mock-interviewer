import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Search, Filter, Sparkles, Layout, Cpu, Layers, Brain, Server, Smartphone, ArrowRight, CheckCircle2, AlertCircle, Award } from 'lucide-react';
import { apiService } from '../services/apiService';
import type { Role, RecommendedRole } from '../types';

export const RoleSelectionPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('search') || '';

  const [roles, setRoles] = useState<Role[]>([]);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [loading, setLoading] = useState(true);

  const [recommendedRoles, setRecommendedRoles] = useState<RecommendedRole[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const recs = await apiService.getRecommendedRoles();
        if (recs.length === 0) {
          setProfileError(true);
        } else {
          setRecommendedRoles(recs.slice(0, 3));
        }
      } catch (error) {
        console.error('Failed to fetch recommendations', error);
        setProfileError(true);
      } finally {
        setProfileLoading(false);
      }
    };
    fetchRecommendations();
  }, []);

  useEffect(() => {
    const fetchRoles = async () => {
      setLoading(true);
      const data = await apiService.getRoles(searchQuery, selectedDifficulty);
      setRoles(data);
      setLoading(false);
    };
    fetchRoles();
  }, [searchQuery, selectedDifficulty]);

  const difficultyFilters: string[] = ['All', 'Senior', 'Staff/Architect', 'Mid-Level', 'Junior'];

  const getRoleIcon = (iconName: string) => {
    switch (iconName) {
      case 'Layout': return <Layout className="w-5 h-5 text-brand-500" />;
      case 'Cpu': return <Cpu className="w-5 h-5 text-brand-500" />;
      case 'Layers': return <Layers className="w-5 h-5 text-emerald-500" />;
      case 'Brain': return <Brain className="w-5 h-5 text-brand-500" />;
      case 'Server': return <Server className="w-5 h-5 text-amber-500" />;
      case 'Smartphone': return <Smartphone className="w-5 h-5 text-rose-500" />;
      default: return <Sparkles className="w-5 h-5 text-brand-500" />;
    }
  };

  return (
    <PageWrapper className="space-y-8">
      {/* Page Header */}
      <div>
        <span className="text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">
          Target Track Selector
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
          Engineering Role Library
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Select a specialized track to simulate interview scenarios curated by senior hiring panels.
        </p>
      </div>

      {/* SEARCH & DIFFICULTY FILTER BAR */}
      <Card className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search roles (e.g., Senior Frontend, Distributed Systems, ML)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-100/80 dark:bg-surface-dark-elevated border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          />
        </div>

        {/* Difficulty Pill Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <span className="text-xs font-semibold text-slate-400 mr-2 flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          {difficultyFilters.map((diff) => (
            <button
              key={diff}
              onClick={() => setSelectedDifficulty(diff)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap ${
                selectedDifficulty === diff
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-surface-dark-elevated text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              {diff}
            </button>
          ))}
        </div>
      </Card>

      {/* RECOMMENDED ROLES SECTION */}
      {!searchQuery && selectedDifficulty === 'All' && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Recommended for You</h2>
          </div>
          
          {profileLoading ? (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {[1, 2, 3].map(i => <div key={i} className="h-48 rounded-2xl bg-slate-200/60 dark:bg-slate-800/40 animate-pulse p-6" />)}
             </div>
          ) : profileError || recommendedRoles.length === 0 ? (
             <Card className="p-6 bg-brand-50/50 dark:bg-brand-900/10 border-brand-100 dark:border-brand-900/30">
               <div className="flex items-center gap-3">
                 <AlertCircle className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                 <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                   Complete your profile to get personalised role recommendations.
                 </p>
               </div>
             </Card>
          ) : (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {recommendedRoles.map(({ role, reason, matchedSkills, skillGaps, matchScore }) => (
                 <Card key={`rec-${role.id}`} hoverEffect tiltOnHover className="p-6 flex flex-col justify-between border-2 border-amber-500/20 relative overflow-hidden">
                   <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
                     <Award className="w-3 h-3" /> RECOMMENDED
                   </div>
                   
                   <div>
                     <div className="flex items-center gap-2 mb-3">
                       <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                         {getRoleIcon(role.iconName)}
                       </div>
                       <div>
                         <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                           {matchScore >= 80 ? 'Strong skill alignment' : 'Recommended'}
                         </span>
                       </div>
                     </div>
                     
                     <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">{role.title}</h3>
                     <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{reason}</p>
                     
                     <div className="mt-4 space-y-2">
                       {matchedSkills.length > 0 && (
                         <div>
                           <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">
                             <CheckCircle2 className="w-3 h-3" /> Matched Skills
                           </p>
                           <div className="flex flex-wrap gap-1">
                             {matchedSkills.slice(0, 3).map(s => (
                               <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">{s}</span>
                             ))}
                             {matchedSkills.length > 3 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">+{matchedSkills.length - 3}</span>}
                           </div>
                         </div>
                       )}
                       
                       {skillGaps.length > 0 && (
                         <div>
                           <p className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 mb-1 flex items-center gap-1">
                             <AlertCircle className="w-3 h-3" /> Skill Gaps
                           </p>
                           <div className="flex flex-wrap gap-1">
                             {skillGaps.slice(0, 3).map(s => (
                               <span key={s} className="text-[9px] px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300">{s}</span>
                             ))}
                             {skillGaps.length > 3 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">+{skillGaps.length - 3}</span>}
                           </div>
                         </div>
                       )}
                     </div>
                   </div>
                   
                   <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/5">
                     <Link to={`/interview/config/${role.id}`} className="block w-full">
                       <Button size="sm" variant="primary" className="w-full ">
                         Configure Session
                         <ArrowRight className="w-3.5 h-3.5 ml-1" />
                       </Button>
                     </Link>
                   </div>
                 </Card>
               ))}
             </div>
          )}
        </div>
      )}

      {/* ALL ROLES GRID */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-slate-200/60 dark:bg-slate-800/40 animate-pulse p-6" />
          ))}
        </div>
      ) : roles.length === 0 ? (
        <Card className="p-12 text-center my-8">
          <Search className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="font-bold text-base text-slate-900 dark:text-white">No roles match your search query</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Try clearing filters or searching for "Frontend" or "Systems".</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => { setSearchQuery(''); setSelectedDifficulty('All'); }}>
            Reset Search Filters
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((role) => (
            <Card key={role.id} hoverEffect tiltOnHover className="p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-surface-dark-elevated">
                      {getRoleIcon(role.iconName)}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {role.department}
                      </span>
                    </div>
                  </div>

                </div>

                <h3 className="font-bold text-base text-slate-900 dark:text-white">{role.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed line-clamp-2">
                  {role.description}
                </p>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {role.requiredSkills.map((skill) => (
                    <span
                      key={skill}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-surface-dark-elevated text-slate-600 dark:text-slate-300"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  <span className="font-semibold text-brand-600 dark:text-brand-400">Adaptive Interview</span> • AI-driven session
                </div>
                <Link to={`/interview/config/${role.id}`}>
                  <Button size="sm">
                    Configure Session
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageWrapper>
  );
};
