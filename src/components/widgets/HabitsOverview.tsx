"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getPrefixedKey } from "@/lib/keys";

type TimeFilter = '1 Day' | '7 Days' | '1 Month' | '6 Months' | '1 Year' | 'Custom Month';

interface HabitInsight {
  name: string;
  value: number | string;
  percentage?: number;
}

export function HabitsOverview() {
  const [filter, setFilter] = useState<TimeFilter>('1 Month');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [completed, setCompleted] = useState(0);
  const [missed, setMissed] = useState(0);
  const [bestStreak, setBestStreak] = useState<HabitInsight | null>(null);
  const [topHabits, setTopHabits] = useState<HabitInsight[]>([]);
  const [bottomHabits, setBottomHabits] = useState<HabitInsight[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadData = () => {
      const saved = localStorage.getItem(getPrefixedKey('os_habits'));
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          let cCount = 0;
          let mCount = 0;
          
          const now = new Date();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

          if (Array.isArray(parsed)) {
            const habitStats: { name: string; done: number; total: number; streak: number; recentMisses: number }[] = [];
            
            parsed.forEach((h: any) => {
              let hDone = 0;
              let hMissed = 0;
              let hRecentMisses = 0;
              
              // 0. Check if habit is active for the current filter/selected month
              const isHabitActive = (mKey: string) => {
                if (!h.monthScope || h.monthScope.length === 0) return true;
                return h.monthScope.includes(mKey);
              };

              // 1. Calculate stats for the selected filter
              if (h.records) {
                if (filter === 'Custom Month') {
                  const key = `${selectedYear}-${selectedMonth}`;
                  if (isHabitActive(key)) {
                    const days = h.records[key];
                    if (Array.isArray(days)) {
                      days.forEach(status => {
                        if (status === 'done') {
                          cCount++;
                          hDone++;
                        }
                        if (status === 'missed') {
                          mCount++;
                          hMissed++;
                        }
                      });
                    }
                  }
                } else {
                  let daysToLookBack = 30;
                  if (filter === '1 Day') daysToLookBack = 1;
                  if (filter === '7 Days') daysToLookBack = 7;
                  if (filter === '1 Month') daysToLookBack = 30;
                  if (filter === '6 Months') daysToLookBack = 180;
                  if (filter === '1 Year') daysToLookBack = 365;

                  Object.keys(h.records).forEach((monthKey) => {
                    if (!isHabitActive(monthKey)) return;

                    const [year, month] = monthKey.split('-').map(Number);
                    const days = h.records[monthKey];
                    if (Array.isArray(days)) {
                      days.forEach((dayStatus, dayIndex) => {
                        const dateOfRecord = new Date(year, month, dayIndex + 1);
                        const diffTime = today.getTime() - dateOfRecord.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        
                        if (diffDays >= 0 && diffDays < daysToLookBack) {
                          if (dayStatus === 'done') {
                            cCount++;
                            hDone++;
                          }
                          if (dayStatus === 'missed') {
                            mCount++;
                            hMissed++;
                          }
                        }
                        
                        // Track missed in last 7 days regardless of filter for Bottom 3 logic
                        if (diffDays >= 0 && diffDays < 7 && dayStatus === 'missed') {
                          hRecentMisses++;
                        }
                      });
                    }
                  });
                }
              }

              // Only add to stats if it has some records OR is active in the current custom month
              if (hDone > 0 || hMissed > 0 || hRecentMisses > 0 || (filter === 'Custom Month' && isHabitActive(`${selectedYear}-${selectedMonth}`))) {
                habitStats.push({
                    name: h.name,
                    done: hDone,
                    total: hDone + hMissed,
                    streak: 0, // Will calculate below
                    recentMisses: hRecentMisses
                });
              }
            });

            // 2. Calculate Current Streak (Longest active streak)
            habitStats.forEach(stat => {
              const h = parsed.find((p: any) => p.name === stat.name);
              if (!h) return;

              let currentStreak = 0;
              let streakBroken = false;
              let streakDate = new Date(today);
              
              const todayKey = `${today.getFullYear()}-${today.getMonth()}`;
              const todayIndex = today.getDate() - 1;
              const todayStatus = h.records?.[todayKey]?.[todayIndex];
              
              if (todayStatus !== 'done' && todayStatus !== 'missed') {
                streakDate.setDate(streakDate.getDate() - 1);
              }

              while (!streakBroken) {
                const sKey = `${streakDate.getFullYear()}-${streakDate.getMonth()}`;
                const sIndex = streakDate.getDate() - 1;
                
                // Check if habit was active then
                const wasActive = !h.monthScope || h.monthScope.length === 0 || h.monthScope.includes(sKey);
                
                if (!wasActive) {
                    streakBroken = true;
                    break;
                }

                const sStatus = h.records?.[sKey]?.[sIndex];
                if (sStatus === 'done') {
                  currentStreak++;
                  streakDate.setDate(streakDate.getDate() - 1);
                } else if (sStatus === 'missed') {
                  streakBroken = true;
                } else {
                  streakBroken = true;
                }
                if (currentStreak > 1000) break;
              }
              stat.streak = currentStreak;
            });

            // Derive Top/Bottom Insights
            const sortedByRate = [...habitStats]
              .filter(s => s.total > 0)
              .sort((a, b) => (b.done / b.total) - (a.done / a.total));

            setTopHabits(sortedByRate.slice(0, 3).map(s => ({
              name: s.name,
              value: `${Math.round((s.done / s.total) * 100)}%`,
              percentage: (s.done / s.total) * 100
            })));

            // Bottom 3: lowest rate OR most missed in last 7 days
            // Primary sort: Lowest rate, Secondary sort: most missed in last 7 days
            const sortedByNeedsAttention = [...habitStats]
              .filter(s => s.total > 0 || s.recentMisses > 0)
              .sort((a, b) => {
                const rateA = a.total > 0 ? a.done / a.total : 0;
                const rateB = b.total > 0 ? b.done / b.total : 0;
                if (rateA !== rateB) return rateA - rateB;
                return b.recentMisses - a.recentMisses;
              });

            setBottomHabits(sortedByNeedsAttention.slice(0, 3).map(s => ({
              name: s.name,
              value: s.total > 0 ? `${Math.round((s.done / s.total) * 100)}%` : 'Missed',
              percentage: s.total > 0 ? (s.done / s.total) * 100 : 0
            })));

            const streakWinner = [...habitStats].sort((a, b) => b.streak - a.streak)[0];
            if (streakWinner && streakWinner.streak > 0) {
              setBestStreak({
                name: streakWinner.name,
                value: streakWinner.streak
              });
            } else {
              setBestStreak(null);
            }
          }
          setCompleted(cCount);
          setMissed(mCount);
        } catch (e) { console.error("Habit Stats Error:", e); }
      }
    };

    loadData();
    setIsLoaded(true);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === getPrefixedKey('os_habits')) loadData();
    };
    
    const handleLocal = (e: any) => {
      if (e.detail && e.detail.key === 'os_habits') loadData();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('local-storage-change', handleLocal);
    
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('local-storage-change', handleLocal);
    };
  }, [filter, selectedMonth, selectedYear]);

  if (!isLoaded) return <div className="animate-pulse h-40 w-full rounded-2xl bg-zinc-100 dark:bg-zinc-800/50"></div>;

  const total = completed + missed;
  const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 flex flex-col h-full shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-500 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
          </span>
          Habits Overview
        </h2>
        <div className="flex flex-wrap gap-2 items-center">
          {filter === 'Custom Month' && (
            <div className="flex gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="appearance-none bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-800 transition-colors text-sm font-semibold text-zinc-700 dark:text-zinc-300 rounded-xl px-4 py-2 cursor-pointer outline-none border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-rose-500/50 shadow-sm"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i}>
                    {new Date(2000, i, 1).toLocaleDateString('en-US', { month: 'long' })}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="appearance-none bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-800 transition-colors text-sm font-semibold text-zinc-700 dark:text-zinc-300 rounded-xl px-4 py-2 cursor-pointer outline-none border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-rose-500/50 shadow-sm"
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
            className="appearance-none bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-800 transition-colors text-sm font-semibold text-zinc-700 dark:text-zinc-300 rounded-xl px-4 py-2 cursor-pointer outline-none border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-rose-500/50 shadow-sm"
          >
            <option value="1 Day">1 Day</option>
            <option value="7 Days">7 Days</option>
            <option value="1 Month">1 Month</option>
            <option value="6 Months">6 Months</option>
            <option value="1 Year">1 Year</option>
            <option value="Custom Month">Custom Month</option>
          </select>
          <Link href="/habits" className="px-4 py-2 text-sm font-semibold rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 transition-colors border border-rose-200 dark:border-rose-900/50 whitespace-nowrap">View All</Link>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          <div className="bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100/50 dark:border-emerald-500/10 rounded-2xl p-5 flex flex-col justify-center items-center text-center">
            <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">{completed}</span>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700/60 dark:text-emerald-500/70">Completed</span>
          </div>

          <div className="bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/10 rounded-2xl p-5 flex flex-col justify-center items-center text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-teal-500/5 to-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="text-4xl font-bold text-zinc-900 dark:text-white mb-1 z-10">{successRate}%</span>
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 z-10">Success Rate</span>
          </div>

          <div className="bg-rose-50 dark:bg-rose-500/5 border border-rose-100/50 dark:border-rose-500/10 rounded-2xl p-5 flex flex-col justify-center items-center text-center">
            <span className="text-3xl font-bold text-rose-600 dark:text-rose-400 mb-1">{missed}</span>
            <span className="text-xs font-bold uppercase tracking-widest text-rose-700/60 dark:text-rose-500/70">Missed</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Best Streak */}
          <div className="bg-orange-50/50 dark:bg-orange-500/5 border border-orange-100/50 dark:border-orange-500/10 rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🔥</span>
              <h3 className="text-sm font-bold text-orange-800 dark:text-orange-400 tracking-widest">Best streak</h3>
            </div>
            {bestStreak ? (
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">{bestStreak.value} Days</span>
                <span className="text-sm font-medium text-orange-900/60 dark:text-orange-300/60 truncate">{bestStreak.name}</span>
              </div>
            ) : (
              <span className="text-zinc-400 dark:text-zinc-600 text-sm font-medium italic">No active streaks</span>
            )}
          </div>

          {/* Top 3 Habits */}
          <div className="bg-blue-50/50 dark:bg-blue-500/5 border border-blue-100/50 dark:border-blue-500/10 rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🏆</span>
              <h3 className="text-sm font-bold text-blue-800 dark:text-blue-400 tracking-widest">Top consistent</h3>
            </div>
            <div className="flex flex-col gap-3">
              {topHabits.length > 0 ? topHabits.map((h, i) => (
                <div key={i} className="flex justify-between items-center group/item hover:translate-x-1 transition-transform">
                  <span className="text-sm font-semibold text-blue-900 dark:text-blue-200 truncate pr-2">{h.name}</span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400 tabular-nums">{h.value}</span>
                </div>
              )) : (
                <span className="text-zinc-400 dark:text-zinc-600 text-sm font-medium italic">No data yet</span>
              )}
            </div>
          </div>

          {/* Bottom 3 Habits */}
          <div className="bg-red-50/50 dark:bg-red-500/5 border border-red-100/50 dark:border-red-500/10 rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">⚠️</span>
              <h3 className="text-sm font-bold text-red-800 dark:text-red-400 tracking-widest">Needs attention</h3>
            </div>
            <div className="flex flex-col gap-3">
              {bottomHabits.length > 0 ? bottomHabits.map((h, i) => (
                <div key={i} className="flex justify-between items-center group/item hover:translate-x-1 transition-transform">
                  <span className="text-sm font-semibold text-red-900 dark:text-red-200 truncate pr-2">{h.name}</span>
                  <span className="text-sm font-bold text-red-600 dark:text-red-400 tabular-nums">{h.value}</span>
                </div>
              )) : (
                <span className="text-zinc-400 dark:text-zinc-600 text-sm font-medium italic">Doing great!</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
