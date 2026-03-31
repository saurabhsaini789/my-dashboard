"use client";

import React, { useState, useEffect } from 'react';
import { setSyncedItem } from '@/lib/storage';
import { getPrefixedKey } from '@/lib/keys';

import { ProjectModal, type Project, type Task, getProjectPriorityInfo } from './ProjectModal';
import { GanttView } from './GanttView';


const BUCKETS = [
  'Health', 'Income', 'Career',
  'Wealth', 'Family', 'Lifestyle',
  'Learning', 'Admin', 'Mental'
];

// --- Shared Priority & Status Logic ---


export function Goals() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [view, setView] = useState<'grid' | 'gantt'>('grid');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [creatingForBucket, setCreatingForBucket] = useState<string | null>(null);
  const projectsRef = React.useRef(projects);

  React.useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  useEffect(() => {
    const stored = localStorage.getItem(getPrefixedKey('goals_projects'));
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setProjects(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        // ignore
      }
    }
    setIsLoaded(true);

    const handleLocalUpdate = (e: any) => {
      if (e.detail && e.detail.key === 'goals_projects') {
        const val = localStorage.getItem(getPrefixedKey('goals_projects'));
        if (val && val !== JSON.stringify(projectsRef.current)) {
          try {
            setProjects(JSON.parse(val));
          } catch (e) {}
        }
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === getPrefixedKey('goals_projects') && e.newValue && e.newValue !== JSON.stringify(projectsRef.current)) {
        try {
          setProjects(JSON.parse(e.newValue));
        } catch (e) {}
      }
    };

    window.addEventListener('local-storage-change', handleLocalUpdate);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('local-storage-change', handleLocalUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    if (isLoaded) {
      setSyncedItem('goals_projects', JSON.stringify(projects));

      if (selectedProject) {
        const updated = projects.find(p => p.id === selectedProject.id);
        if (updated) setSelectedProject(updated);
        else setSelectedProject(null);
      }
    }
  }, [projects, isLoaded]);

  // --- Handlers ---
  const handleCreateProject = (newProj: Project) => {
    const finalProject: Project = {
      ...newProj,
      id: crypto.randomUUID(),
      tasks: [],
      createdAt: new Date().toISOString()
    };
    setProjects([...projects, finalProject]);
  };

  const handleUpdateProject = (updatedProject: Project) => {
    setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
  };


  const handleDeleteProject = (projectId: string) => {
    setProjects(projects.filter(p => p.id !== projectId));
    if (selectedProject?.id === projectId) setSelectedProject(null);
  };

  if (!isLoaded) return <div className="animate-pulse h-96 w-full rounded-2xl bg-zinc-100 dark:bg-zinc-800/50"></div>;

  return (
    <div className="w-full relative">

      {/* View Switcher Tabs */}
      <div className="flex justify-center mb-8">
        <div className="bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-xl flex items-center gap-1 shadow-inner">
          <button
            onClick={() => setView('grid')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${view === 'grid'
              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
            Grid View
          </button>
          <button
            onClick={() => setView('gantt')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${view === 'gantt'
              ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10h18M3 14h18M3 18h18M7 6v4M17 6v4" /></svg>
            Gantt View
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={view === 'grid' ? 'block animate-in fade-in duration-500' : 'hidden'}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {BUCKETS.map(bucket => {
            const bucketProjects = projects
              .filter(p => p.bucketId === bucket && !p.isCompleted && p.status !== 'completed')
              .sort((a, b) => {
                const pA = getProjectPriorityInfo(a);
                const pB = getProjectPriorityInfo(b);
                const score = (label: string) => {
                  if (label === 'Critical') return 1;
                  if (label === 'Time-sensitive') return 2;
                  if (label === 'Strategic') return 3;
                  if (label === 'Upcoming') return 4;
                  return 5;
                };
                return score(pA.label) - score(pB.label);
              });

            return (
              <div key={bucket} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col h-[480px] shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                  <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-teal-500/20 border border-teal-500"></div>
                    {bucket}
                  </h3>
                  <button
                    onClick={() => setCreatingForBucket(bucket)}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
                    aria-label={`Add project to ${bucket}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                  </button>
                </div>

                {/* Bucket Content */}
                <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1 custom-scrollbar">
                  {bucketProjects.length === 0 && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 italic mt-auto mb-auto text-center">No projects yet</p>
                  )}

                  {bucketProjects.map(project => {
                    const priority = getProjectPriorityInfo(project);
                    return (
                      <div
                        key={project.id}
                        onClick={() => setSelectedProject(project)}
                        className={`text-left p-4 rounded-xl transition-all sm:hover:-translate-y-0.5 flex-shrink-0 flex flex-col justify-between cursor-pointer group relative border-l-4 ${priority.classes}`}
                      >
                        
                        <div className="flex justify-between items-start gap-2 w-full">
                          <div className="flex flex-col gap-1 flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span className="text-[11px] uppercase font-bold tracking-widest opacity-80">
                                {priority.icon} {priority.label}
                              </span>
                            </div>
                            <h4 className="font-bold text-[17px] leading-tight break-words flex items-center gap-2">
                              {project.title}
                              {project.isImportant && (
                                <span className="text-amber-500 flex-shrink-0 animate-pulse-subtle">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                                </span>
                              )}
                            </h4>
                            {(() => {
                              const nextTask = project.tasks.find(t => !t.isCompleted);
                              if (!nextTask) return null;
                              return (
                                <div className="flex items-center gap-2 w-full mt-2">
                                  <span className="text-xs opacity-40 shrink-0">→</span>
                                  <p className="text-[13px] opacity-80 min-w-0 font-medium truncate italic">
                                    {nextTask.title}
                                  </p>
                                </div>
                              );
                            })()}
                          </div>
                          {project.dueDate && (
                            <div className="flex items-center gap-1.5 py-1 px-2 rounded-lg bg-white/60 dark:bg-black/30 text-[11px] opacity-90 font-bold shrink-0 mt-0.5 shadow-sm">
                              {new Date(project.dueDate + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={view === 'gantt' ? 'block animate-in fade-in duration-500' : 'hidden'}>
        <GanttView 
          projects={projects.filter(p => !p.isCompleted && p.status !== 'completed')} 
          buckets={BUCKETS}
          onSelectProject={setSelectedProject}
        />
      </div>

      {/* Completed Projects Section */}
      {(() => {
        const completedProjects = projects.filter(p => p.isCompleted || p.status === 'completed');
        if (completedProjects.length === 0) return null;
        return (
          <div className="mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mb-6">
              <span className="w-8 h-8 rounded-full bg-teal-50 dark:bg-teal-500/10 text-teal-500 flex items-center justify-center shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              </span>
              Completed Projects
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {completedProjects.map(project => {
                const priority = getProjectPriorityInfo(project);
                return (
                  <div
                    key={project.id}
                    onClick={() => setSelectedProject(project)}
                    className={`text-left p-4 rounded-xl transition-all sm:hover:-translate-y-0.5 flex-shrink-0 flex flex-col justify-between cursor-pointer shadow-sm ${priority.classes}`}
                  >
                    <div className="flex flex-col gap-1.5 w-full">
                      <div className="flex items-start justify-between gap-2 text-[10px] uppercase font-bold tracking-wider opacity-90">
                        <span className="mt-1 text-zinc-500 dark:text-zinc-400">{project.bucketId}</span>
                        {project.dueDate && (
                          <div className="flex items-center gap-1.5 py-0.5 px-2 rounded-md bg-white/50 dark:bg-black/20 normal-case opacity-90 font-medium shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                            {new Date(project.dueDate + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </div>
                        )}
                      </div>
                      <h4 className="font-semibold text-[15px] leading-tight line-through opacity-70 w-full">
                        {project.title}
                      </h4>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Detailed View Modal overlay */}
      {selectedProject && (
        <ProjectModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onUpdateProject={handleUpdateProject}
          onDeleteProject={handleDeleteProject}
        />
      )}

      {/* Create Modal overlay */}
      {creatingForBucket && (
        <ProjectModal
          mode="create"
          project={{
            id: '',
            bucketId: creatingForBucket,
            title: '',
            dueDate: new Date().toISOString().split('T')[0],
            isImportant: false,
            status: 'not-started',
            createdAt: new Date().toISOString(),
            tasks: []
          }}
          onClose={() => setCreatingForBucket(null)}
          onUpdateProject={handleCreateProject}
          onDeleteProject={() => {}}
        />
      )}

    </div>
  );
}
