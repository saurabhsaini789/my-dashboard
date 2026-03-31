"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { type Project, getProjectPriorityInfo } from './ProjectModal';


interface GanttViewProps {
  projects: Project[];
  buckets: string[];
  onSelectProject: (p: Project) => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function GanttView({ projects, buckets, onSelectProject }: GanttViewProps) {
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [collapsedBuckets, setCollapsedBuckets] = useState<Record<string, boolean>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const currentYear = viewDate.getFullYear();
  const currentMonthIdx = viewDate.getMonth();

  // 1. Define Timeline Range (Exactly one month)
  const timelineRange = useMemo(() => {
    const start = new Date(viewDate);
    const end = new Date(viewDate);
    end.setMonth(start.getMonth() + 1);
    end.setDate(0); // Last day of the current month

    const days: Date[] = [];
    let current = new Date(start);
    while (current <= end) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return { start, end, days };
  }, [viewDate]);

  // Number of days in the current month
  const numDays = timelineRange.days.length;

  // 2. Navigation Handlers
  const handlePrevMonth = () => {
    const next = new Date(viewDate);
    next.setMonth(viewDate.getMonth() - 1);
    setViewDate(next);
  };

  const handleNextMonth = () => {
    const next = new Date(viewDate);
    next.setMonth(viewDate.getMonth() + 1);
    setViewDate(next);
  };

  const handleMonthChange = (idx: number) => {
    const next = new Date(viewDate);
    next.setMonth(idx);
    setViewDate(next);
  };

  const handleYearChange = (year: number) => {
    const next = new Date(viewDate);
    next.setFullYear(year);
    setViewDate(next);
  };

  const handleGoToToday = () => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    setViewDate(d);
  };

  // 3. Helper to get Grid Column indices for a project relative to the visible month
  // Grid columns for timeline start after the sidebar (col 1), so timeline days are col 2 to numDays + 1
  const getProjectCols = (project: Project) => {
    const due = new Date(project.dueDate + 'T12:00:00');
    let start: Date;
    
    if (project.startDate) {
      start = new Date(project.startDate + 'T12:00:00');
    } else {
      // Fallback: 2 weeks before due date
      start = new Date(due);
      start.setDate(due.getDate() - 14);
    }

    // Clipping: If start is before month start, treat as month start
    const barStart = start < timelineRange.start ? timelineRange.start : start;
    // Clipping: If due is after month end, treat as month end
    const barEnd = due > timelineRange.end ? timelineRange.end : due;

    // Check if project is even visible in this month
    if (due < timelineRange.start || start > timelineRange.end) {
      return null;
    }

    // Grid columns are 1-indexed. Col 1 is sidebar.
    // Timeline Day 1 is Col 2.
    const startIdx = Math.floor((barStart.getTime() - timelineRange.start.getTime()) / (1000 * 60 * 60 * 24)) + 2;
    const endIdx = Math.floor((barEnd.getTime() - timelineRange.start.getTime()) / (1000 * 60 * 60 * 24)) + 3;

    return { 
      startIdx, 
      endIdx, 
      isClippedStart: start < timelineRange.start, 
      isClippedEnd: due > timelineRange.end 
    };
  };

  const toggleBucket = (bucket: string) => {
    setCollapsedBuckets(prev => ({ ...prev, [bucket]: !prev[bucket] }));
  };

  const leftColumnWidth = 200; // Smaller sidebar for more responsive space

  // Years for dropdown (Current Year ± 2)
  const years = useMemo(() => {
    const y = new Date().getFullYear();
    return [y - 2, y - 1, y, y + 1, y + 2];
  }, []);

  const isTodayVisible = useMemo(() => {
    const now = new Date();
    return now >= timelineRange.start && now <= timelineRange.end;
  }, [timelineRange]);

  const gridTemplateColumns = `${leftColumnWidth}px repeat(${numDays}, 1fr)`;

  return (
    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden flex flex-col shadow-xl h-[700px]">
      
      {/* Header Controls */}
      <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrevMonth}
              className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            
            <div className="flex items-center gap-1">
              <select 
                value={currentMonthIdx}
                onChange={(e) => handleMonthChange(parseInt(e.target.value))}
                className="bg-transparent text-lg font-bold text-zinc-900 dark:text-white focus:outline-none cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 px-2 py-1 rounded-lg"
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i} className="bg-white dark:bg-zinc-900 text-sm font-medium">{m}</option>
                ))}
              </select>
              <select 
                value={currentYear}
                onChange={(e) => handleYearChange(parseInt(e.target.value))}
                className="bg-transparent text-lg font-bold text-zinc-900 dark:text-white focus:outline-none cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 px-2 py-1 rounded-lg"
              >
                {years.map(y => (
                  <option key={y} value={y} className="bg-white dark:bg-zinc-900 text-sm font-medium">{y}</option>
                ))}
              </select>
            </div>

            <button 
              onClick={handleNextMonth}
              className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleGoToToday}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${isTodayVisible && new Date().getMonth() === currentMonthIdx && new Date().getFullYear() === currentYear
              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-default' 
              : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black hover:opacity-90 shadow-sm'}`}

          >
            Go to Today
          </button>
        </div>
      </div>

      {/* Main Gantt Body */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden relative custom-scrollbar select-none"
      >
        <div className="w-full">
          
          {/* Timeline Header Row (CSS Grid) */}
          <div 
            className="sticky top-0 z-20 grid bg-white dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800"
            style={{ gridTemplateColumns }}
          >
            <div className="sticky left-0 z-30 bg-white dark:bg-zinc-950 border-r border-zinc-100 dark:border-zinc-800 px-6 py-3 font-bold text-xs uppercase tracking-widest text-zinc-400">
              Active Projects
            </div>
            {timelineRange.days.map((day, i) => {
              const now = new Date();
              const isToday = day.getDate() === now.getDate() && day.getMonth() === now.getMonth() && day.getFullYear() === now.getFullYear();
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;

              return (
                <div 
                  key={i} 
                  className={`border-r border-zinc-100/50 dark:border-zinc-800/30 flex flex-col items-center justify-center py-2 h-14 ${isToday ? 'bg-teal-500/5' : isWeekend ? 'bg-zinc-50/50 dark:bg-zinc-900/10' : ''}`}
                >
                  <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-tighter">
                    {day.toLocaleDateString(undefined, { weekday: 'narrow' })}
                  </span>
                  <span className={`text-xs font-bold ${isToday ? 'text-teal-500' : 'text-zinc-600 dark:text-zinc-400'}`}>
                    {day.getDate()}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Grid Lines Overlay Container */}
          <div className="absolute inset-0 pointer-events-none mt-14">
            <div className="grid h-full w-full" style={{ gridTemplateColumns }}>
              <div className="border-r border-zinc-100 dark:border-zinc-800"></div> {/* Sidebar column */}
              {timelineRange.days.map((day, i) => {
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                return (
                  <div key={i} className={`h-full border-r border-zinc-100/20 dark:border-zinc-800/20 ${isWeekend ? 'bg-zinc-50/20 dark:bg-zinc-900/10' : ''}`}></div>
                );
              })}
            </div>
          </div>

          {/* Today Line (CSS Grid based) */}
          {isTodayVisible && (
            <div 
              className="absolute top-0 bottom-0 z-10 pointer-events-none grid h-full w-full" 
              style={{ gridTemplateColumns }}
            >
               <div style={{ gridColumn: new Date().getDate() + 1 }} className="flex justify-center h-full">
                  <div className="w-px bg-teal-500/50 h-full relative">
                    <div className="sticky top-14 -ml-[5.5px] w-3 h-3 rounded-full bg-teal-500 shadow-lg shadow-teal-500/50 border-2 border-white dark:border-zinc-950"></div>
                  </div>
               </div>
            </div>
          )}

          {/* Rows Container */}
          <div className="relative z-0">
            {buckets.map(bucket => {
              const bucketProjects = projects.filter(p => p.bucketId === bucket);
              if (bucketProjects.length === 0) return null;
              const isCollapsed = collapsedBuckets[bucket];

              return (
                <div key={bucket} className="flex flex-col">
                  {/* Bucket Header Row */}
                  <div 
                    onClick={() => toggleBucket(bucket)}
                    className="grid bg-zinc-50/80 dark:bg-zinc-900/40 border-b border-zinc-100 dark:border-zinc-800 cursor-pointer group/bucket sticky top-14 z-10"
                    style={{ gridTemplateColumns }}
                  >
                    <div className="sticky left-0 z-20 bg-zinc-50 dark:bg-zinc-900/80 backdrop-blur-sm border-r border-zinc-100 dark:border-zinc-800 px-6 py-2.5 flex items-center gap-3">
                      <span className={`transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400"><path d="m6 9 6 6 6-6"/></svg>
                      </span>
                      <div className="w-1.5 h-1.5 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)]"></div>
                      <span className="text-[11px] font-extrabold uppercase tracking-widest text-zinc-600 dark:text-zinc-300 truncate">{bucket}</span>
                      <span className="ml-auto text-[10px] bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded-md text-zinc-500 font-bold border border-zinc-100 dark:border-zinc-700">
                        {bucketProjects.length}
                      </span>
                    </div>
                    {/* Empty headers for grid alignment */}
                    <div className="col-span-full h-10"></div>
                  </div>

                  {/* Project Rows */}
                  {!isCollapsed && bucketProjects.map(project => {
                    const priority = getProjectPriorityInfo(project);
                    const cols = getProjectCols(project);
                    
                    return (
                      <div 
                        key={project.id} 
                        className="group grid items-center hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-colors border-b border-zinc-50 dark:border-zinc-900"
                        style={{ gridTemplateColumns }}
                      >
                        {/* Sidebar Project Info */}
                        <div 
                          onClick={() => onSelectProject(project)}
                          className="sticky left-0 z-20 bg-white dark:bg-zinc-950 group-hover:bg-zinc-50 dark:group-hover:bg-zinc-900 border-r border-zinc-100 dark:border-zinc-800 px-6 py-4 cursor-pointer flex flex-col justify-center gap-1"
                        >
                          <h4 className="text-[12px] font-bold text-zinc-900 dark:text-white truncate group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                            {project.title}
                          </h4>
                          <span className="text-[9px] font-bold uppercase tracking-wider opacity-60 flex items-center gap-1">
                            {priority.icon} {priority.label}
                          </span>
                        </div>

                        {/* Responsive Bar Column Placement */}
                        {cols && (
                          <div 
                            className="relative h-16 flex items-center"
                            style={{ 
                              gridColumn: `${cols.startIdx} / ${cols.endIdx}`
                            }}
                          >
                            <div 
                              onClick={() => onSelectProject(project)}
                              className={`w-full h-7 rounded-lg flex items-center px-3 cursor-pointer transition-all hover:scale-[1.01] hover:shadow-lg hover:z-50 group/bar border ${priority.classes} shadow-sm overflow-hidden`}
                            >
                              {/* Clipped Indicators */}
                              {cols.isClippedStart && (
                                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-zinc-900/10 dark:bg-white/10 flex items-center justify-center">
                                  <span className="text-[8px] opacity-40">«</span>
                                </div>
                              )}
                              {cols.isClippedEnd && (
                                <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-zinc-900/10 dark:bg-white/10 flex items-center justify-center">
                                  <span className="text-[8px] opacity-40">»</span>
                                </div>
                              )}

                              <span className={`text-[9px] font-extrabold whitespace-nowrap overflow-hidden text-ellipsis px-1 ${cols.isClippedStart ? 'ml-1.5' : ''} ${cols.isClippedEnd ? 'mr-1.5' : ''}`}>
                                {project.title}
                              </span>
                              
                              {/* Hover Tooltip */}
                              <div className="invisible group-hover/bar:visible absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-950 dark:bg-white text-white dark:text-black text-[10px] font-bold py-1.5 px-2.5 rounded-lg whitespace-nowrap z-50 shadow-2xl border border-white/10 dark:border-black/5 animate-in fade-in zoom-in-95 duration-150">
                                {project.startDate || '—'} → {project.dueDate}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          <div className="h-20"></div>
        </div>
      </div>
    </div>
  );
}
