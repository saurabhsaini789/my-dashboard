"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

type TimeFilter = '1 Day' | '7 Days' | '1 Month' | '6 Months' | '1 Year';

export function HabitsOverview() {
  const [filter, setFilter] = useState<TimeFilter>('1 Month');
  const [completed, setCompleted] = useState(0);
  const [missed, setMissed] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadData = () => {
      const saved = localStorage.getItem('os_habits');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          let cCount = 0;
          let mCount = 0;
          if (Array.isArray(parsed)) {
            parsed.forEach((h: any) => {
              if (h.records) {
                Object.keys(h.records).forEach((monthKey) => {
                  const days = h.records[monthKey];
                  if (Array.isArray(days)) {
                    days.forEach((dayStatus: string) => {
                      if (dayStatus === 'done') cCount++;
                      if (dayStatus === 'missed') mCount++;
                    });
                  }
                });
              }
            });
          }
          setCompleted(cCount);
          setMissed(mCount);
        } catch (e) { }
      }
    };

    loadData();
    setIsLoaded(true);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'os_habits') loadData();
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [filter]);

  if (!isLoaded) return <div className="animate-pulse h-40 w-full rounded-2xl bg-zinc-100 dark:bg-zinc-800/50"></div>;

  const total = completed + missed;
  const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 flex flex-col h-full shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-500 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
          </span>
          Habits Overview
        </h3>
        <div className="flex gap-4 items-center">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as TimeFilter)}
            className="appearance-none bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-800 transition-colors text-sm font-semibold text-zinc-700 dark:text-zinc-300 rounded-xl px-4 py-2 cursor-pointer outline-none border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-rose-500/50 shadow-sm"
          >
            <option value="1 Day">1 Day</option>
            <option value="7 Days">7 Days</option>
            <option value="1 Month">1 Month</option>
            <option value="6 Months">6 Months</option>
            <option value="1 Year">1 Year</option>
          </select>
          <Link href="/my-dashboard/habits" className="px-4 py-2 text-sm font-semibold rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 transition-colors border border-rose-200 dark:border-rose-900/50">View All</Link>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl p-6 flex flex-col justify-center items-center text-center">
            <span className="text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 mb-2">{completed}</span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700/70 dark:text-emerald-500/70">Habits Completed</span>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800/50 rounded-2xl p-6 flex flex-col justify-center items-center text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-teal-500/5 to-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="text-5xl md:text-6xl font-black text-zinc-900 dark:text-white mb-2 z-10">{successRate}%</span>
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 z-10">Success Rate</span>
          </div>

          <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-900/50 rounded-2xl p-6 flex flex-col justify-center items-center text-center">
            <span className="text-4xl font-extrabold text-red-600 dark:text-red-400 mb-2">{missed}</span>
            <span className="text-xs font-bold uppercase tracking-wider text-red-700/70 dark:text-red-500/70">Habits Missed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
