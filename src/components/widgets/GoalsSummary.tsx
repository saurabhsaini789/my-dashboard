"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

type TimeFilter = '1 Day' | '7 Days' | '1 Month' | '6 Months' | '1 Year';

export function GoalsSummary() {
  const [filter, setFilter] = useState<TimeFilter>('1 Month');
  const [projectsCount, setProjectsCount] = useState(0);
  const [tasksCount, setTasksCount] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('goals_projects');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        
        // At the moment goals_projects don't have explicit "completed at" timestamps.
        // For a true time filter, we would filter by a `completedAt` field.
        // Assuming user wants this as a demo or we fake it / show all completed.
        // Since we don't have completion timestamps, we will just count the totals 
        // to show the layout working, or apply a mock filter.
        
        // Calculate totals (mocking time filter by just showing all for now until backend supports timestamps)
        let pCount = 0;
        let tCount = 0;

        parsed.forEach((p: any) => {
          if (p.isCompleted) pCount++;
          if (p.tasks && Array.isArray(p.tasks)) {
            p.tasks.forEach((t: any) => {
              if (t.isCompleted) tCount++;
            });
          }
        });

        setProjectsCount(pCount);
        setTasksCount(tCount);
      } catch (e) { }
    }
    setIsLoaded(true);
  }, [filter]); // Re-run if filter changes (mock)

  if (!isLoaded) return <div className="animate-pulse h-40 w-full rounded-2xl bg-zinc-100 dark:bg-zinc-800/50"></div>;

  return (
    <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 flex flex-col h-full shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          Goals
        </h3>
        <div className="flex gap-4 items-center">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as TimeFilter)}
            className="appearance-none bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-800 transition-colors text-sm font-semibold text-zinc-700 dark:text-zinc-300 rounded-xl px-4 py-2 cursor-pointer outline-none border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-teal-500/50 shadow-sm"
          >
            <option value="1 Day">1 Day</option>
            <option value="7 Days">7 Days</option>
            <option value="1 Month">1 Month</option>
            <option value="6 Months">6 Months</option>
            <option value="1 Year">1 Year</option>
          </select>
          <Link href="/goals" className="px-4 py-2 text-sm font-semibold rounded-xl bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-500/10 dark:text-teal-400 dark:hover:bg-teal-500/20 transition-colors border border-teal-200 dark:border-teal-900/50">View All</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 flex-1">
        {/* Projects Card */}
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl p-5 flex flex-col justify-center items-center text-center transition-all hover:shadow-md">
          <span className="text-4xl md:text-5xl font-extrabold text-emerald-600 dark:text-emerald-400 mb-2">{projectsCount}</span>
          <span className="text-sm font-bold uppercase tracking-wider text-emerald-700/70 dark:text-emerald-500/70">Projects Completed</span>
        </div>
        
        {/* Tasks Card */}
        <div className="bg-sky-50 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-900/50 rounded-2xl p-5 flex flex-col justify-center items-center text-center transition-all hover:shadow-md">
          <span className="text-4xl md:text-5xl font-extrabold text-sky-600 dark:text-sky-400 mb-2">{tasksCount}</span>
          <span className="text-sm font-bold uppercase tracking-wider text-sky-700/70 dark:text-sky-500/70">Tasks Completed</span>
        </div>
      </div>
    </div>
  );
}
