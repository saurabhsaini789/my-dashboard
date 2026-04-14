"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getPrefixedKey } from "@/lib/keys";

type TimeFilter = '1 Day' | '7 Days' | '1 Month' | '6 Months' | '1 Year' | 'Custom Month';

export function GoalsSummary() {
  const [filter, setFilter] = useState<TimeFilter>('1 Month');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [projectsCount, setProjectsCount] = useState(0);
  const [tasksCount, setTasksCount] = useState(0);
  const [activeProjectsCount, setActiveProjectsCount] = useState(0);
  const [totalTasksCount, setTotalTasksCount] = useState(0);
  const [overdueTasksCount, setOverdueTasksCount] = useState(0);
  const [nearDeadlineProjectsCount, setNearDeadlineProjectsCount] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadData = () => {
      const saved = localStorage.getItem(getPrefixedKey('goals_projects'));
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          let pCount = 0;
          let tCount = 0;
          let activeP = 0;
          let totalT = 0;
          let overdueT = 0;
          let nearDeadlineP = 0;

          const now = new Date();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const sevenDaysFromNow = new Date(today);
          sevenDaysFromNow.setDate(today.getDate() + 7);

          const isMatch = (item: any) => {
            if (!item.isCompleted && item.status !== 'completed') return false;
            
            if (filter === 'Custom Month') {
              const date = item.completedAt ? new Date(item.completedAt) : (item.dueDate ? new Date(item.dueDate + 'T12:00:00') : null);
              if (!date) return false;
              return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear;
            } else {
              let daysToLookBack = 30;
              if (filter === '1 Day') daysToLookBack = 1;
              if (filter === '7 Days') daysToLookBack = 7;
              if (filter === '1 Month') daysToLookBack = 30;
              if (filter === '6 Months') daysToLookBack = 180;
              if (filter === '1 Year') daysToLookBack = 365;

              const date = item.completedAt ? new Date(item.completedAt) : (item.dueDate ? new Date(item.dueDate + 'T12:00:00') : null);
              if (!date) return true; // Include legacy items without dates in preset ranges for now (or could exclude)
              
              const diffTime = today.getTime() - date.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              return diffDays >= 0 && diffDays < daysToLookBack;
            }
          };

          if (Array.isArray(parsed)) {
            parsed.forEach((p: any) => {
              // Time-filtered completed counts
              if (isMatch(p)) pCount++;

              // Global metrics
              if (!p.isCompleted && p.status !== 'completed') {
                activeP++;
                if (p.dueDate) {
                  const pDate = new Date(p.dueDate + 'T00:00:00');
                  pDate.setHours(0, 0, 0, 0);
                  if (pDate < today) {
                    // Project is overdue, its incomplete tasks are overdue
                    if (p.tasks && Array.isArray(p.tasks)) {
                      p.tasks.forEach((t: any) => {
                        if (!t.isCompleted) overdueT++;
                      });
                    }
                  }
                  if (pDate >= today && pDate <= sevenDaysFromNow) {
                    nearDeadlineP++;
                  }
                }
              }

              if (p.tasks && Array.isArray(p.tasks)) {
                p.tasks.forEach((t: any) => {
                  totalT++;
                  if (isMatch(t)) tCount++;
                });
              }
            });
          }
          setProjectsCount(pCount);
          setTasksCount(tCount);
          setActiveProjectsCount(activeP);
          setTotalTasksCount(totalT);
          setOverdueTasksCount(overdueT);
          setNearDeadlineProjectsCount(nearDeadlineP);
        } catch (e) { }
      }
    };

    loadData();
    setIsLoaded(true);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === getPrefixedKey('goals_projects')) loadData();
    };
    
    const handleLocal = (e: any) => {
      if (e.detail && e.detail.key === 'goals_projects') loadData();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('local-storage-change', handleLocal);
    
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('local-storage-change', handleLocal);
    };
  }, [filter, selectedMonth, selectedYear]);

  if (!isLoaded) return <div className="animate-pulse h-40 w-full rounded-2xl bg-zinc-100 dark:bg-zinc-800/50"></div>;

  return (
    <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 flex flex-col h-full shadow-sm">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
        <div className="flex items-center justify-between w-full lg:w-auto gap-4">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            Overview
          </h2>
          <Link href="/goals" className="lg:hidden px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-500/10 dark:text-teal-400 dark:hover:bg-teal-500/20 transition-colors border border-teal-200 dark:border-teal-900/50 whitespace-nowrap">View All</Link>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center w-full lg:w-auto">
          {filter === 'Custom Month' && (
            <div className="flex gap-2 flex-1 sm:flex-none">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="flex-1 sm:flex-none appearance-none bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-800 transition-colors text-xs font-semibold text-zinc-700 dark:text-zinc-300 rounded-xl px-3 py-2 cursor-pointer outline-none border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-teal-500/50 shadow-sm"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i}>
                    {new Date(2000, i, 1).toLocaleDateString('en-US', { month: 'short' })}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="flex-1 sm:flex-none appearance-none bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-800 transition-colors text-xs font-semibold text-zinc-700 dark:text-zinc-300 rounded-xl px-3 py-2 cursor-pointer outline-none border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-teal-500/50 shadow-sm"
              >
                {Array.from({ length: 5 }, (_, i) => 2026 + i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          )}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as TimeFilter)}
            className="flex-1 sm:flex-none appearance-none bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-800 transition-colors text-xs font-semibold text-zinc-700 dark:text-zinc-300 rounded-xl px-3 py-2 cursor-pointer outline-none border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-teal-500/50 shadow-sm"
          >
            <option value="1 Day">1 Day</option>
            <option value="7 Days">7 Days</option>
            <option value="1 Month">1 Month</option>
            <option value="6 Months">6 Months</option>
            <option value="1 Year">1 Year</option>
            <option value="Custom Month">Custom Month</option>
          </select>
          <Link href="/goals" className="hidden lg:block px-4 py-2 text-sm font-semibold rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-500/10 dark:text-teal-400 dark:hover:bg-teal-500/20 transition-colors border border-teal-200 dark:border-teal-900/50 whitespace-nowrap">View All</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 flex-1">
        {/* Active Projects Card */}
        <div className="bg-teal-50 dark:bg-teal-500/10 border border-teal-100 dark:border-teal-900/50 rounded-2xl p-5 flex flex-col justify-center items-center text-center transition-all hover:shadow-md">
          <span className="text-3xl md:text-4xl font-bold text-teal-600 dark:text-teal-400 mb-1">{activeProjectsCount}</span>
          <span className="text-xs font-bold uppercase tracking-widest text-teal-700/70 dark:text-teal-500/80">Total Active Projects</span>
        </div>

        {/* Total Tasks Card */}
        <div className="bg-zinc-50 dark:bg-zinc-500/10 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 flex flex-col justify-center items-center text-center transition-all hover:shadow-md">
          <span className="text-3xl md:text-4xl font-bold text-zinc-600 dark:text-zinc-400 mb-1">{totalTasksCount}</span>
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-500/70 dark:text-zinc-400/80">Total Tasks</span>
        </div>

        {/* Overdue Tasks Card */}
        <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-900/50 rounded-2xl p-5 flex flex-col justify-center items-center text-center transition-all hover:shadow-md">
          <span className="text-3xl md:text-4xl font-bold text-rose-600 dark:text-rose-400 mb-1">{overdueTasksCount}</span>
          <span className="text-xs font-bold uppercase tracking-widest text-rose-700/70 dark:text-rose-500/80">Overdue Tasks</span>
        </div>

        {/* Near Deadline Card */}
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-900/50 rounded-2xl p-5 flex flex-col justify-center items-center text-center transition-all hover:shadow-md">
          <span className="text-2xl md:text-3xl font-bold text-amber-600 dark:text-amber-400 mb-1">{nearDeadlineProjectsCount}</span>
          <span className="text-xs font-bold uppercase tracking-widest text-amber-700/70 dark:text-amber-500/80 leading-tight">Projects Due Next 7 Days</span>
        </div>

        {/* Projects Completed Card */}
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100/50 dark:border-emerald-900/50 rounded-2xl p-5 flex flex-col justify-center items-center text-center transition-all hover:shadow-md">
          <span className="text-2xl md:text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">{projectsCount}</span>
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-700/70 dark:text-emerald-500/80 leading-tight">Projects Completed ({filter})</span>
        </div>
        
        {/* Tasks Completed Card */}
        <div className="bg-sky-50 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-900/50 rounded-2xl p-5 flex flex-col justify-center items-center text-center transition-all hover:shadow-md">
          <span className="text-2xl md:text-3xl font-bold text-sky-600 dark:text-sky-400 mb-1">{tasksCount}</span>
          <span className="text-xs font-bold uppercase tracking-widest text-sky-700/70 dark:text-sky-500/80 leading-tight">Tasks Completed ({filter})</span>
        </div>
      </div>
    </div>
  );
}
