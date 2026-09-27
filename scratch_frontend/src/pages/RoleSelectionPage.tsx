import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';

import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';

import {
  Search,
  Filter,
  Sparkles,
  Layout,
  Cpu,
  Layers,
  Brain,
  Server,
  Smartphone,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Award,
  BriefcaseBusiness,
  Target,
  X,
  SlidersHorizontal,
  ChevronRight,
} from 'lucide-react';

import { apiService } from '../services/apiService';
import type { Role, RecommendedRole } from '../types';

export const RoleSelectionPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  const initialQuery = searchParams.get('search') || '';

  const [roles, setRoles] = useState<Role[]>([]);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [loading, setLoading] = useState(true);

  const [recommendedRoles, setRecommendedRoles] = useState<
    RecommendedRole[]
  >([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);

  /* ============================================================
     FETCH RECOMMENDED ROLES
  ============================================================ */

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setProfileLoading(true);

        const recs = await apiService.getRecommendedRoles();

        if (!recs || recs.length === 0) {
          setProfileError(true);
          setRecommendedRoles([]);
        } else {
          setProfileError(false);
          setRecommendedRoles(recs.slice(0, 3));
        }
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);
        setProfileError(true);
        setRecommendedRoles([]);
      } finally {
        setProfileLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  /* ============================================================
     FETCH ROLES
  ============================================================ */

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setLoading(true);

        const data = await apiService.getRoles(
          searchQuery,
          selectedDifficulty
        );

        setRoles(data);
      } catch (error) {
        console.error('Failed to fetch roles:', error);
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, [searchQuery, selectedDifficulty]);

  /* ============================================================
     FILTERS
  ============================================================ */

  const difficultyFilters = [
    'All',
    'Senior',
    'Staff/Architect',
    'Mid-Level',
    'Junior',
  ];

  /* ============================================================
     ICON MAPPING
  ============================================================ */

  const getRoleIcon = (iconName: string) => {
    switch (iconName) {
      case 'Layout':
        return <Layout className="h-5 w-5 text-brand-500" />;

      case 'Cpu':
        return <Cpu className="h-5 w-5 text-brand-500" />;

      case 'Layers':
        return <Layers className="h-5 w-5 text-emerald-500" />;

      case 'Brain':
        return <Brain className="h-5 w-5 text-brand-500" />;

      case 'Server':
        return <Server className="h-5 w-5 text-amber-500" />;

      case 'Smartphone':
        return <Smartphone className="h-5 w-5 text-rose-500" />;

      default:
        return <Sparkles className="h-5 w-5 text-brand-500" />;
    }
  };

  /* ============================================================
     CLEAR SEARCH
  ============================================================ */

  const clearSearch = () => {
    setSearchQuery('');
    setSelectedDifficulty('All');
  };

  /* ============================================================
     ROLE STATISTICS
  ============================================================ */

  const roleStats = useMemo(() => {
    const departments = new Set(
      roles.map((role) => role.department).filter(Boolean)
    );

    const skills = new Set(
      roles.flatMap((role) => role.requiredSkills || [])
    );

    return {
      roles: roles.length,
      departments: departments.size,
      skills: skills.size,
    };
  }, [roles]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 || selectedDifficulty !== 'All';

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <PageWrapper className="mx-auto max-w-7xl space-y-8">

      {/* ============================================================
          SEARCH + FILTERS
      ============================================================ */}

      <Card className="p-4 sm:p-5">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">

          {/* Search */}

          <div className="relative flex-1">

            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              placeholder="Search engineering roles, skills, or domains..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-10 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            )}

          </div>

          {/* Filter */}

          <div className="flex items-center gap-2 overflow-x-auto">

            <div className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-slate-400">
              <SlidersHorizontal className="h-4 w-4" />
              Level
            </div>

            {difficultyFilters.map((difficulty) => {
              const active = selectedDifficulty === difficulty;

              return (
                <button
                  key={difficulty}
                  type="button"
                  onClick={() => setSelectedDifficulty(difficulty)}
                  className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold transition-all ${active
                      ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/20'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                >
                  {difficulty}
                </button>
              );
            })}

          </div>

        </div>

        {/* Active filter state */}

        {hasActiveFilters && (
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">

            <div className="flex items-center gap-2 text-xs text-slate-500">

              <Filter className="h-3.5 w-3.5" />

              <span>
                Showing results for{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {searchQuery || 'all roles'}
                </strong>
                {selectedDifficulty !== 'All' && (
                  <>
                    {' '}
                    ·{' '}
                    <strong className="text-slate-800 dark:text-slate-200">
                      {selectedDifficulty}
                    </strong>
                  </>
                )}
              </span>

            </div>

            <button
              type="button"
              onClick={clearSearch}
              className="text-xs font-bold text-brand-600 hover:underline dark:text-brand-400"
            >
              Clear filters
            </button>

          </div>
        )}

      </Card>

      {/* ============================================================
          HERO
      ============================================================ */}

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        {/* Background decoration */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-500/10 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-red-500/5 blur-3xl" />

        <div className="relative z-10 grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:p-10">

          <div className="max-w-3xl">

            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700 dark:border-brand-900/40 dark:bg-brand-950/30 dark:text-brand-400">
              <Sparkles className="h-3 w-3" />
              AI-Powered Role Matching
            </div>

            <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl lg:text-4xl">
              Choose Your{' '}
              <span className="text-brand-600 dark:text-brand-400">
                Interview Track
              </span>
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
              Select a role that matches your career target. Mockora uses your
              candidate profile to recommend relevant engineering tracks and
              generate personalised interview sessions.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">

              <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Target className="h-3.5 w-3.5 text-brand-500" />
                Profile-aware
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Sparkles className="h-3.5 w-3.5 text-brand-500" />
                Adaptive questions
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <BriefcaseBusiness className="h-3.5 w-3.5 text-brand-500" />
                Role-specific
              </div>

            </div>
          </div>

          {/* Role Stats */}

          <div className="grid grid-cols-3 gap-2 self-center lg:w-[280px]">

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center dark:border-slate-800 dark:bg-slate-950">
              <p className="text-xl font-black text-slate-900 dark:text-white">
                {loading ? '—' : roleStats.roles}
              </p>

              <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Roles
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center dark:border-slate-800 dark:bg-slate-950">
              <p className="text-xl font-black text-slate-900 dark:text-white">
                {loading ? '—' : roleStats.departments}
              </p>

              <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Domains
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center dark:border-slate-800 dark:bg-slate-950">
              <p className="text-xl font-black text-slate-900 dark:text-white">
                {loading ? '—' : roleStats.skills}
              </p>

              <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Skills
              </p>
            </div>

          </div>

        </div>
      </motion.section>

      {/* ============================================================
          RECOMMENDED FOR YOU
      ============================================================ */}

      {!hasActiveFilters && (
        <section>

          <div className="mb-5 flex items-end justify-between">

            <div>

              <div className="flex items-center gap-2">

                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                  <Sparkles className="h-4 w-4" />
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                    Personalised
                  </p>

                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    Recommended for You
                  </h2>
                </div>

              </div>

              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Roles selected using your candidate profile and skill alignment.
              </p>

            </div>

          </div>

          {profileLoading ? (

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">

              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-[330px] animate-pulse rounded-3xl bg-slate-200/60 dark:bg-slate-800/40"
                />
              ))}

            </div>

          ) : profileError || recommendedRoles.length === 0 ? (

            <Card className="border-brand-100 bg-brand-50/50 p-6 dark:border-brand-900/30 dark:bg-brand-950/20">

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div className="flex items-start gap-3">

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                    <AlertCircle className="h-5 w-5" />
                  </div>

                  <div>

                    <p className="font-bold text-slate-900 dark:text-white">
                      Personalised recommendations unavailable
                    </p>

                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      Complete your candidate profile to receive role
                      recommendations based on your skills.
                    </p>

                  </div>

                </div>

                <Link to="/profile">
                  <Button variant="outline" size="sm">
                    View Profile
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>

              </div>

            </Card>

          ) : (

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">

              {recommendedRoles.map(
                ({
                  role,
                  reason,
                  matchedSkills,
                  skillGaps,
                  matchScore,
                  projectEvidence,
                  experienceEvidence,
                }) => (

                  <motion.div
                    key={`recommended-${role.id}`}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                  >

                    <Card
                      hoverEffect
                      tiltOnHover
                      className="relative flex h-full flex-col overflow-hidden border-2 border-amber-500/20 p-6"
                    >

                      {/* Recommended badge */}

                      <div className="absolute right-0 top-0 rounded-bl-xl bg-amber-500 px-3 py-1.5 text-[10px] font-black text-white">
                        <span className="flex items-center gap-1">
                          <Award className="h-3 w-3" />
                          RECOMMENDED
                        </span>
                      </div>

                      {/* Role Header */}

                      <div className="flex items-start justify-between pr-20">

                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-900/30">
                          {getRoleIcon(role.iconName)}
                        </div>

                        <div className="text-right">

                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Match
                          </p>

                          <p className="text-xl font-black text-amber-600 dark:text-amber-400">
                            {matchScore}%
                          </p>

                        </div>

                      </div>

                      <div className="mt-5">

                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          {role.department}
                        </p>

                        <h3 className="mt-1 text-lg font-black leading-tight text-slate-900 dark:text-white">
                          {role.title}
                        </h3>

                        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                          {reason}
                        </p>

                      </div>

                      {/* Match Progress */}

                      <div className="mt-5">

                        <div className="mb-2 flex justify-between text-[10px] font-semibold text-slate-400">
                          <span>Skill alignment</span>
                          <span>{matchScore}%</span>
                        </div>

                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${Math.min(matchScore, 100)}%`,
                            }}
                            transition={{ duration: 0.7 }}
                            className="h-full rounded-full bg-amber-500"
                          />
                        </div>

                      </div>

                      {/* Skills */}

                      <div className="mt-5 flex-1 space-y-4">

                        {matchedSkills.length > 0 && (
                          <div>

                            <p className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Matched Skills
                            </p>

                            <div className="flex flex-wrap gap-1.5">

                              {matchedSkills.slice(0, 4).map((skill) => (
                                <span
                                  key={skill}
                                  className="rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                                >
                                  {skill}
                                </span>
                              ))}

                              {matchedSkills.length > 4 && (
                                <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-800">
                                  +{matchedSkills.length - 4}
                                </span>
                              )}

                            </div>

                          </div>
                        )}

                        {((experienceEvidence && experienceEvidence.length > 0) || (projectEvidence && projectEvidence.length > 0)) && (
                          <div>
                            <p className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                              <Sparkles className="h-3.5 w-3.5" />
                              Key Evidence
                            </p>
                            <div className="flex flex-col gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                              {experienceEvidence && experienceEvidence.slice(0, 2).map((ev, i) => (
                                <div key={`exp-${i}`} className="flex items-start gap-1.5">
                                  <BriefcaseBusiness className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                                  <span>Used <strong className="text-slate-800 dark:text-slate-200">{ev.skill}</strong> at {ev.company}</span>
                                </div>
                              ))}
                              {projectEvidence && projectEvidence.slice(0, 2).map((ev, i) => (
                                <div key={`proj-${i}`} className="flex items-start gap-1.5">
                                  <Layers className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                                  <span>Used <strong className="text-slate-800 dark:text-slate-200">{ev.skill}</strong> in {ev.project}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {skillGaps.length > 0 && (
                          <div>

                            <p className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                              <AlertCircle className="h-3.5 w-3.5" />
                              Skill Gaps
                            </p>

                            <div className="flex flex-wrap gap-1.5">

                              {skillGaps.slice(0, 3).map((skill) => (
                                <span
                                  key={skill}
                                  className="rounded-lg bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
                                >
                                  {skill}
                                </span>
                              ))}

                              {skillGaps.length > 3 && (
                                <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-800">
                                  +{skillGaps.length - 3}
                                </span>
                              )}

                            </div>

                          </div>
                        )}

                      </div>

                      {/* CTA */}

                      <div className="mt-6 border-t border-slate-100 pt-5 dark:border-white/5">

                        <Link
                          to={`/interview/config/${role.id}`}
                          className="block"
                        >
                          <Button
                            size="sm"
                            className="w-full shadow-md shadow-brand-500/10"
                          >
                            Configure Interview
                            <ArrowRight className="ml-2 h-3.5 w-3.5" />
                          </Button>
                        </Link>

                      </div>

                    </Card>

                  </motion.div>
                )
              )}

            </div>
          )}

        </section>
      )}

      {/* ============================================================
          ALL ROLES
      ============================================================ */}

      <section>

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">

          <div>

            <div className="flex items-center gap-2">

              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <BriefcaseBusiness className="h-4 w-4" />
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">
                  Explore
                </p>

                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  Engineering Roles
                </h2>
              </div>

            </div>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Browse available interview tracks and choose the one you want to
              practise.
            </p>

          </div>

          {!loading && (
            <span className="text-xs font-semibold text-slate-400">
              {roles.length} {roles.length === 1 ? 'role' : 'roles'} available
            </span>
          )}

        </div>

        {/* Loading */}

        {loading ? (

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">

            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div
                key={item}
                className="h-[300px] animate-pulse rounded-3xl bg-slate-200/60 dark:bg-slate-800/40"
              />
            ))}

          </div>

        ) : roles.length === 0 ? (

          <Card className="my-8 p-12 text-center">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
              <Search className="h-7 w-7" />
            </div>

            <h3 className="mt-5 text-lg font-black text-slate-900 dark:text-white">
              No roles found
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
              No engineering role matches your current search or level
              filter. Try a different keyword or reset the filters.
            </p>

            <Button
              variant="outline"
              size="sm"
              className="mt-5"
              onClick={clearSearch}
            >
              Reset Filters
            </Button>

          </Card>

        ) : (

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">

            {roles.map((role, index) => (

              <motion.div
                key={role.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  delay: Math.min(index * 0.04, 0.25),
                }}
              >

                <Card
                  hoverEffect
                  tiltOnHover
                  className="group flex h-full flex-col justify-between p-6"
                >

                  {/* Role top */}

                  <div>

                    <div className="mb-5 flex items-start justify-between">

                      <div className="flex items-center gap-3">

                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 dark:bg-surface-dark-elevated">
                          {getRoleIcon(role.iconName)}
                        </div>

                        <div>

                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {role.department}
                          </span>

                          <p className="mt-0.5 text-[10px] font-semibold text-brand-600 dark:text-brand-400">
                            Adaptive Interview
                          </p>

                        </div>

                      </div>

                      <ChevronRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-brand-500" />

                    </div>

                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      {role.title}
                    </h3>

                    <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {role.description}
                    </p>

                    {/* Skills */}

                    <div className="mt-5">

                      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Core Skills
                      </p>

                      <div className="flex flex-wrap gap-1.5">

                        {role.requiredSkills.slice(0, 6).map((skill) => (
                          <span
                            key={skill}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                          >
                            {skill}
                          </span>
                        ))}

                        {role.requiredSkills.length > 6 && (
                          <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-400 dark:border-slate-800 dark:bg-slate-950">
                            +{role.requiredSkills.length - 6}
                          </span>
                        )}

                      </div>

                    </div>

                  </div>

                  {/* Role CTA */}

                  <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5 dark:border-white/5">

                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                      <Sparkles className="h-3.5 w-3.5 text-brand-500" />
                      AI-driven session
                    </div>

                    <Link to={`/interview/config/${role.id}`}>

                      <Button size="sm">
                        Configure
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Button>

                    </Link>

                  </div>

                </Card>

              </motion.div>
            ))}

          </div>
        )}

      </section>

      {/* ============================================================
          BOTTOM INFORMATION
      ============================================================ */}

      <Card className="overflow-hidden border-brand-100 bg-brand-50/50 dark:border-brand-900/30 dark:bg-brand-950/10">

        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">

          <div className="flex items-start gap-4">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <Sparkles className="h-5 w-5" />
            </div>

            <div>

              <h3 className="font-bold text-slate-900 dark:text-white">
                What happens after you choose a role?
              </h3>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                Mockora opens a session configurator where you can prepare your
                interview before entering the adaptive AI interview engine.
              </p>

            </div>

          </div>

          <Link to="/profile">

            <Button variant="outline" size="sm">
              View My Profile
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>

          </Link>

        </div>

      </Card>

    </PageWrapper>
  );
};

export default RoleSelectionPage;