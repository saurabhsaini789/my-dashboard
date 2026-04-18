"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Habits } from '@/components/widgets/Habits';
import { HabitsOverview, type TimeFilter } from '@/components/widgets/HabitsOverview';
import { PageTitle, SectionTitle, Text, Description } from '@/components/ui/Text';
import { HabitDetailPanel } from '@/components/widgets/HabitDetailPanel';
import { TrendingUp, TrendingDown, Star, Target, Zap } from 'lucide-react';
import { getPrefixedKey } from '@/lib/keys';

export default function HabitsPage() {
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<TimeFilter>('Custom Month');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedHabit, setSelectedHabit] = useState<any>(null);

  // Stats for summary bar
  const [summaryStats, setSummaryStats] = useState<{
    successRate: number;
    trend: number | null;
    perfectDays: number | null;
    totalLogged: number;
  }>({ successRate: 0, trend: null, perfectDays: null, totalLogged: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update summary stats based on current filter/Selection
  useEffect(() => {
    if (!mounted) return;
    
    const loadSummary = () => {
      const saved = localStorage.getItem(getPrefixedKey('os_habits'));
      if (!saved) return;
      try {
        const habits = JSON.parse(saved);
        if (!Array.isArray(habits)) return;

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        let done = 0, missed = 0;
        let pDays = 0;

        if (filter === 'Custom Month') {
          const mKey = `${selectedYear}-${selectedMonth}`;
          const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
          const activeHabits = habits.filter(h => !h.monthScope || h.monthScope.includes(mKey));
          
          for (let d = 1; d <= daysInMonth; d++) {
            const dateOfRecord = new Date(selectedYear, selectedMonth, d);
            if (dateOfRecord > today) continue;
            
            let dDone = 0, dMissed = 0;
            activeHabits.forEach(h => {
              const s = h.records?.[mKey]?.[d - 1];
              if (s === 'done') { done++; dDone++; }
              else if (s === 'missed') { missed++; dMissed++; }
            });

            if (activeHabits.length > 0 && dDone === activeHabits.length) pDays++;
          }

          // Trend calculation
          const lastMonthDate = new Date(selectedYear, selectedMonth - 1, 1);
          const lastMKey = `${lastMonthDate.getFullYear()}-${lastMonthDate.getMonth()}`;
          const lastDaysInMonth = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth() + 1, 0).getDate();
          let lDone = 0, lMissed = 0;
          habits.forEach(h => {
            const isActiveInLast = !h.monthScope || h.monthScope.includes(lastMKey);
            if (!isActiveInLast) return;
            for (let d = 0; d < lastDaysInMonth; d++) {
              const s = h.records?.[lastMKey]?.[d];
              if (s === 'done') lDone++;
              else if (s === 'missed') lMissed++;
            }
          });
          const lTotal = lDone + lMissed;
          const lRate = lTotal > 0 ? (lDone / lTotal) * 100 : null;
          const curTotal = done + missed;
          const curRate = curTotal > 0 ? (done / curTotal) * 100 : 0;
          
          setSummaryStats({
            successRate: Math.round(curRate),
            trend: lRate !== null ? Math.round(curRate - lRate) : null,
            perfectDays: pDays,
            totalLogged: curTotal
          });
        } else {
          // Adapt to other filters
          let daysToLookBack = 30;
          if (filter === '1 Day') daysToLookBack = 1;
          else if (filter === '7 Days') daysToLookBack = 7;
          else if (filter === '1 Month') daysToLookBack = 30;
          else if (filter === '6 Months') daysToLookBack = 180;
          else if (filter === '1 Year') daysToLookBack = 365;

          const activeHabitsSet = new Set<string>();
          for (let i = 0; i < daysToLookBack; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() - i);
            const mKey = `${checkDate.getFullYear()}-${checkDate.getMonth()}`;
            const dIdx = checkDate.getDate() - 1;

            habits.forEach(h => {
              const isActive = !h.monthScope || h.monthScope.includes(mKey);
              if (isActive) {
                activeHabitsSet.add(h.id);
                const s = h.records?.[mKey]?.[dIdx];
                if (s === 'done') done++;
                else if (s === 'missed') missed++;
              }
            });
          }

          const curTotal = done + missed;
          setSummaryStats({
            successRate: curTotal > 0 ? Math.round((done / curTotal) * 100) : 0,
            trend: null,
            perfectDays: null,
            totalLogged: curTotal
          });
        }
      } catch (e) {}
    };

    loadSummary();
    const inv = setInterval(loadSummary, 5000); // Poll for changes
    window.addEventListener('local-storage-change', loadSummary);
    return () => {
      clearInterval(inv);
      window.removeEventListener('local-storage-change', loadSummary);
    };
  }, [mounted, filter, selectedMonth, selectedYear]);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-teal-500/30 font-sans p-4 md:p-8 xl:p-12 transition-colors duration-200">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col items-start">
            <PageTitle>Habits Tracker</PageTitle>
            <Description>Track your daily progress</Description>
          </div>
        </header>

        {/* Dynamic Summary Bar */}
        <section className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-1 shadow-sm overflow-hidden">
            <div className="flex flex-wrap items-stretch">
              {/* Main Metric */}
              <div className="flex-1 min-w-[200px] p-6 flex flex-col justify-center border-r border-zinc-100 dark:border-zinc-800/50 relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                  <Target size={120} />
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <Target size={14} className="text-teal-500" />
                  <Text variant="label" className="text-zinc-500">Current Success</Text>
                </div>
                <div className="flex items-baseline gap-3">
                  <Text variant="display" className="text-4xl text-teal-600 dark:text-teal-400">{summaryStats.successRate}%</Text>
                  {summaryStats.trend !== null && (
                    <div className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${summaryStats.trend >= 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
                      {summaryStats.trend >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {Math.abs(summaryStats.trend)}%
                    </div>
                  )}
                </div>
                <Text variant="bodySmall" muted className="mt-1">
                  {filter === 'Custom Month' 
                    ? `Based on ${summaryStats.totalLogged} logged actions this month`
                    : `Average for the last ${filter.toLowerCase()}`}
                </Text>
              </div>

              {/* Secondary Metrics */}
              <div className="flex-[1.5] flex flex-wrap">
                <div className="flex-1 min-w-[150px] p-6 flex flex-col justify-center border-r border-zinc-100 dark:border-zinc-800/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Star size={14} className="text-amber-500" />
                    <Text variant="label" className="text-zinc-500">Consistency</Text>
                  </div>
                  <Text variant="title" className="text-zinc-900 dark:text-zinc-100">
                    {summaryStats.perfectDays !== null ? `${summaryStats.perfectDays} Perfect Days` : 'Steady Effort'}
                  </Text>
                  <Text variant="bodySmall" muted>
                    {summaryStats.perfectDays !== null ? 'All habits completed' : 'Keep showing up every day!'}
                  </Text>
                </div>

                <div className="flex-1 min-w-[150px] p-6 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap size={14} className="text-rose-500" />
                    <Text variant="label" className="text-zinc-500">Quick Observation</Text>
                  </div>
                  <Text variant="body" className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {summaryStats.successRate >= 80 ? 'Legendary pace! 🔥' : summaryStats.successRate >= 50 ? 'Gaining momentum 📈' : 'Let\'s regroup 🎯'}
                  </Text>
                  <Text variant="bodySmall" muted>
                    {filter === 'Custom Month' 
                      ? (summaryStats.trend && summaryStats.trend > 0 ? "You're outpacing last month!" : "Stay focused on your goals.")
                      : "Consistency is the key to progress."}
                  </Text>
                </div>
              </div>
            </div>
            
            {/* Progress Bar under Summary */}
            <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800/60">
              <div 
                className="h-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.3)] transition-all duration-1000"
                style={{ width: `${summaryStats.successRate}%` }}
              />
            </div>
          </div>
        </section>
        
        {/* Overview Section */}
        <section className="w-full relative fade-in mb-14">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <SectionTitle className="mb-0">Habits Overview</SectionTitle>
            
            <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
              {filter === 'Custom Month' && (
                <div className="flex gap-2 flex-1 sm:flex-none">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="flex-1 sm:flex-none appearance-none bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-800 transition-colors text-xs font-semibold text-zinc-700 dark:text-zinc-300 rounded-xl px-3 py-2 cursor-pointer outline-none border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-rose-500/50 shadow-sm"
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
                    className="flex-1 sm:flex-none appearance-none bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-800 transition-colors text-xs font-semibold text-zinc-700 dark:text-zinc-300 rounded-xl px-3 py-2 cursor-pointer outline-none border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-rose-500/50 shadow-sm"
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
                className="flex-1 sm:flex-none appearance-none bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-800 transition-colors text-xs font-semibold text-zinc-700 dark:text-zinc-300 rounded-xl px-3 py-2 cursor-pointer outline-none border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-rose-500/50 shadow-sm"
              >
                <option value="1 Day">1 Day</option>
                <option value="7 Days">7 Days</option>
                <option value="1 Month">1 Month</option>
                <option value="6 Months">6 Months</option>
                <option value="1 Year">1 Year</option>
                <option value="Custom Month">Current Month</option>
              </select>
              <Link href="/habits" className="px-4 py-2 text-sm font-semibold rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 transition-colors border border-rose-200 dark:border-rose-900/50 whitespace-nowrap">View All</Link>
            </div>
          </div>

          <HabitsOverview 
            filter={filter}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
          />
        </section>

        <section className="w-full relative fade-in">
          <Habits onHabitSelect={setSelectedHabit} />
        </section>

        <HabitDetailPanel 
          habit={selectedHabit} 
          onClose={() => setSelectedHabit(null)} 
        />
      </div>
    </main>
  );
}
