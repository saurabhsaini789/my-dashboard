"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Goals } from '@/components/widgets/Goals';
import { GoalsSummary, type TimeFilter } from '@/components/widgets/GoalsSummary';
import { PageTitle, SectionTitle, Description } from '@/components/ui/Text';

export default function GoalsPage() {
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<TimeFilter>('1 Month');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [view, setView] = useState<'grid' | 'gantt'>('grid');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-teal-500/30 font-sans p-4 md:p-8 xl:p-12 transition-colors duration-200">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col items-start">
            <PageTitle>
              Goals
            </PageTitle>
            <Description>Prioritize what matters most.</Description>
          </div>
        </header>
        
        {/* Overview Section */}
        <section className="w-full relative fade-in mb-14">
          <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-8">
            <SectionTitle className="mb-0">Overview</SectionTitle>
            
            <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
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
              <Link href="/goals" className="px-4 py-2 text-sm font-semibold rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-500/10 dark:text-teal-400 dark:hover:bg-teal-500/20 transition-colors border border-teal-200 dark:border-teal-900/50 whitespace-nowrap">View All</Link>
            </div>
          </div>
          
          <GoalsSummary 
            filter={filter} 
            selectedMonth={selectedMonth} 
            selectedYear={selectedYear} 
          />
        </section>

        {/* Goals Tracker Section */}
        <section className="w-full relative fade-in">
          <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-8">
            <SectionTitle className="mb-0">Goals Tracker</SectionTitle>
            
            <div className="bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-xl flex items-center gap-1 shadow-inner">
              <button
                onClick={() => setView('grid')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${view === 'grid' ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white' }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
                Grid
              </button>
              <button
                onClick={() => setView('gantt')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${view === 'gantt' ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white' }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10h18M3 14h18M3 18h18M7 6v4M17 6v4" /></svg>
                Gantt
              </button>
            </div>
          </div>
          
          <Goals view={view} setView={setView} />
        </section>
      </div>
    </main>
  );
}
