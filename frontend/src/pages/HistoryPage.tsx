import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Search, Calendar, Clock, Trophy, RotateCcw, ChevronRight } from 'lucide-react';
import { apiService } from '../services/apiService';
import type { HistoryItem } from '../types';

export const HistoryPage: React.FC = () => {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      const data = await apiService.getHistory(searchQuery);
      setHistoryItems(data);
      setLoading(false);
    };
    fetchHistory();
  }, [searchQuery]);

  return (
    <PageWrapper className="space-y-8">
      {/* Header */}
      <div>
        <span className="text-xs font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">
          Interview Trajectory
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
          Past Mock Interview Sessions
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Review historical evaluations, compare score improvements, or retake past tracks.
        </p>
      </div>

      {/* SEARCH BAR */}
      <Card className="p-4 flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Filter history by role title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
        />
      </Card>

      {/* SESSIONS LIST */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-200/60 dark:bg-slate-800/40 animate-pulse" />
          ))}
        </div>
      ) : historyItems.length === 0 ? (
        <Card className="p-12 text-center my-4">
          <Clock className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="font-bold text-base text-slate-900 dark:text-white">No past sessions yet</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Complete your first mock interview to see it here.</p>
          <Link to="/roles">
            <Button size="sm" className="mt-4">Start Your First Interview</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {historyItems.map((item) => (
            <Card key={item.id} hoverEffect className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                  <Trophy className="w-6 h-6" />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {item.difficulty && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                        {item.difficulty}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      <Calendar className="w-3.5 h-3.5 inline mr-1" />
                      {item.date}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-slate-900 dark:text-white">{item.roleTitle}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                    <span>
                      <Clock className="w-3.5 h-3.5 inline mr-1" />
                      {item.durationMinutes} minutes duration
                    </span>
                    <span>•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      {item.status}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-white/5">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Score</span>
                  <span className="text-xl sm:text-2xl font-black text-brand-600 dark:text-brand-400">
                    {Number(item.overallScore).toFixed(1)}
                    <span className="text-xs font-semibold text-slate-400">/10</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Link to={`/report/${item.id}`}>
                    <Button size="sm" className="shadow-sm">
                      View Report
                      <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </Button>
                  </Link>
                  <Link to="/roles">
                    <Button size="sm" variant="outline" title="Retake Interview">
                      <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

    </PageWrapper>
  );
};
