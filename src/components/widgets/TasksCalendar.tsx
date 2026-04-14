"use client";

import React, { useState, useEffect } from "react";
import { setSyncedItem } from "@/lib/storage";
import { getPrefixedKey } from "@/lib/keys";

import { ProjectModal, type Project, getProjectPriorityInfo } from "./ProjectModal";

export function TasksCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  const todayDate = new Date();
  const [selectedDay, setSelectedDay] = useState<number | null>(todayDate.getDate());

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  useEffect(() => {
    const loadProjects = () => {
      const saved = localStorage.getItem(getPrefixedKey('goals_projects'));
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setProjects(parsed || []);
        } catch (e) { }
      }
    };
    
    loadProjects();
    setIsLoaded(true);

    // Sync with other widgets
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === getPrefixedKey('goals_projects')) {
        loadProjects();
      }
    };

    const handleLocalUpdate = (e: any) => {
      if (e.detail && e.detail.key === 'goals_projects') {
        loadProjects();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage-change', handleLocalUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage-change', handleLocalUpdate);
    };
  }, []);

  const handleUpdateProject = (updatedProject: Project) => {
    const newProjects = projects.map(p => p.id === updatedProject.id ? updatedProject : p);
    setProjects(newProjects);
    setSyncedItem('goals_projects', JSON.stringify(newProjects));
  };

  const handleDeleteProject = (projectId: string) => {
    const newProjects = projects.filter(p => {
      if (typeof projectId === 'string') return p.id !== projectId;
      // safety check for accidental non-string IDs
      return (p as any).id !== projectId;
    });
    setProjects(newProjects);
    setSyncedItem('goals_projects', JSON.stringify(newProjects));
    setSelectedProject(null);
  };

  if (!isLoaded) return <div className="animate-pulse h-40 w-full rounded-2xl bg-zinc-100 dark:bg-zinc-800/50"></div>;

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const months = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString('en-US', { month: 'long' }));
  const years = Array.from({ length: 10 }, (_, i) => 2026 + i);

  // Pad the start of the month
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Find projects for a specific day
  const getProjectsForDay = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return projects.filter(p => !p.isCompleted && p.status !== 'completed' && p.dueDate === dateStr);
  };
  


  const selectedDayProjects = selectedDay ? getProjectsForDay(selectedDay) : [];

  const getNextTasks = () => {
    const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
    return projects
      .filter(p => !p.isCompleted && p.status !== 'completed' && p.dueDate && p.dueDate >= todayStr)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 10);
  };
  const nextTasks = getNextTasks();

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 1. Tasks Calendar */}
      <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 flex flex-col shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            </span>
            Calendar
          </h2>
          <div className="flex gap-2">
            <select 
              value={currentMonth}
              onChange={(e) => {
                setCurrentDate(new Date(currentYear, parseInt(e.target.value), 1));
                setSelectedDay(null);
              }}
              className="appearance-none bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-800 transition-colors text-xs font-semibold text-zinc-700 dark:text-zinc-300 rounded-lg px-2 py-1 cursor-pointer outline-none border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500/50"
            >
              {months.map((m, i) => (
                <option key={i} value={i}>{m.slice(0, 3)}</option>
              ))}
            </select>
            <select 
              value={currentYear}
              onChange={(e) => {
                setCurrentDate(new Date(parseInt(e.target.value), currentMonth, 1));
                setSelectedDay(null);
              }}
              className="appearance-none bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-800 transition-colors text-xs font-semibold text-zinc-700 dark:text-zinc-300 rounded-lg px-2 py-1 cursor-pointer outline-none border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500/50"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="w-full flex-1 flex flex-col pt-2">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
              <div key={`${day}-${idx}`} className="text-center text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 py-1">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1 auto-rows-fr">
            {blanks.map(blank => (
              <div key={`blank-${blank}`} className="border border-transparent rounded-lg p-1 opacity-0 h-8 md:h-10"></div>
            ))}
            
            {days.map(day => {
              const dayProjects = getProjectsForDay(day);
              const isToday = todayDate.getDate() === day && todayDate.getMonth() === currentMonth && todayDate.getFullYear() === currentYear;
              const isSelected = selectedDay === day;
              const hasTasks = dayProjects.length > 0;
              
              return (
                <button
                  key={day} 
                  onClick={() => setSelectedDay(day)}
                  className={`border rounded-lg p-1 relative flex flex-col items-center justify-center h-8 md:h-10 lg:h-11 transition-all
                    ${isSelected
                      ? 'border-indigo-500 bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                      : isToday 
                        ? 'border-indigo-400/50 bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' 
                        : 'border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/30 text-zinc-700 dark:text-zinc-300 hover:border-indigo-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                    }
                  `}
                >
                  <span className={`text-xs font-semibold relative z-10 ${isSelected ? 'text-white' : ''}`}>
                    {day}
                  </span>

                  {hasTasks && (
                    <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5 ${isSelected ? 'opacity-90' : 'opacity-100'}`}>
                      <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-500'}`}></div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Selected Day Detail */}
      <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 flex flex-col shadow-sm max-h-[420px]">
        {selectedDay ? (
          <>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-6">
              <span className="w-8 h-8 rounded-full bg-teal-50 dark:bg-teal-500/10 text-teal-500 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
              </span>
              Tasks for {months[currentMonth].slice(0, 3)} {selectedDay}
              <span className="ml-auto text-xs font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                {selectedDayProjects.length}
              </span>
            </h3>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-2">
              {selectedDayProjects.length === 0 ? (
                <div className="text-center py-6 text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                  No due tasks for this date.
                </div>
              ) : (
                selectedDayProjects.map(p => {
                  const priority = getProjectPriorityInfo(p);
                  return (
                    <div 
                      key={p.id} 
                      onClick={() => setSelectedProject(p)}
                      className="flex flex-col gap-1 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800 transition-colors hover:border-zinc-200 dark:hover:border-zinc-700 cursor-pointer group"
                    >
                      <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
                        {p.title}
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-bold tracking-widest uppercase bg-zinc-200/50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.5 rounded">
                          {p.bucketId || "General"}
                        </span>
                        {priority.label && (
                          <span className={`text-xs font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md border flex items-center gap-1 ${priority.classes}`}>
                            <span>{priority.label}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-400 font-medium text-sm">
            Select a day to view tasks
          </div>
        )}
      </div>

      {/* 3. Next Tasks */}
      <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 flex flex-col shadow-sm max-h-[420px]">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-6">
          <span className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          </span>
          Next tasks
          <span className="ml-auto text-xs font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
            {nextTasks.length}
          </span>
        </h3>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-2">
          {nextTasks.length === 0 ? (
            <div className="text-center py-6 text-sm text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
              No upcoming tasks.
            </div>
          ) : (
            nextTasks.map(p => {
              const priority = getProjectPriorityInfo(p);
              return (
                <div 
                  key={p.id} 
                  onClick={() => setSelectedProject(p)}
                  className="flex flex-col gap-1 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-800 transition-colors hover:border-zinc-200 dark:hover:border-zinc-700 cursor-pointer group"
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-tight text-wrap break-words max-w-[200px]">
                      {p.title}
                    </span>
                    <span className="shrink-0 text-xs font-bold bg-white dark:bg-black/20 px-1.5 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-700">
                      {new Date(p.dueDate + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold tracking-widest uppercase bg-zinc-200/50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.5 rounded">
                      {p.bucketId || "General"}
                    </span>
                    {priority.label && (
                      <span className={`text-xs font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md border flex items-center gap-1 ${priority.classes}`}>
                        <span>{priority.label}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedProject && (
        <ProjectModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onUpdateProject={handleUpdateProject}
          onDeleteProject={handleDeleteProject}
        />
      )}
    </div>
  );
}
