"use client";

import React, { useState, useEffect } from 'react';

export type Task = {
  id: string;
  title: string;
  isCompleted: boolean;
  completedAt?: string; // ISO date string
};

export type Project = {
  id: string;
  bucketId: string;
  title: string;
  startDate?: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  isImportant: boolean;
  status: 'not-started' | 'in-progress' | 'completed' | 'on-hold';
  createdAt: string; // ISO date string
  isCompleted?: boolean;
  completedAt?: string; // ISO date string
  tasks: Task[];
};

// Priority & Urgency Logic
export const getProjectPriorityInfo = (p: Project) => {
  if (p.isCompleted || p.status === 'completed') {
    return {
      label: 'Completed',
      color: 'teal',
      icon: '✓',
      classes: 'bg-teal-50 dark:bg-teal-500/5 text-teal-700 dark:text-teal-500 border border-teal-200/50 dark:border-teal-900/50 opacity-80'
    };
  }

  if (!p.dueDate) {
    return {
      label: p.isImportant ? 'Strategic' : 'On Track',
      color: 'green',
      icon: p.isImportant ? '📌' : '🟢',
      classes: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 shadow-sm shadow-emerald-500/5'
    };
  }

  const due = new Date(p.dueDate + 'T00:00:00');
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const isImportant = p.isImportant;
  
  // Urgency Logic
  let urgency: 'overdue' | 'soon' | 'upcoming' | 'on-track';
  if (diffDays < 0) urgency = 'overdue';
  else if (diffDays <= 7) urgency = 'soon';
  else if (diffDays <= 21) urgency = 'upcoming';
  else urgency = 'on-track';

  // Combined Logic
  if (urgency === 'overdue' || urgency === 'soon') {
    if (isImportant) {
      return {
        label: 'Critical',
        icon: '🔥',
        color: 'red',
        classes: 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 shadow-sm shadow-rose-500/5'
      };
    }
    return {
      label: 'Time-sensitive',
      icon: '⚠️',
      color: 'red',
      classes: 'bg-rose-50/50 dark:bg-rose-500/5 text-rose-600 dark:text-rose-400/80 border border-rose-100 dark:border-rose-500/10 shadow-sm shadow-rose-500/5'
    };
  }

  // Priority to Important focus (Strategic)
  if (isImportant) {
    return {
      label: 'Strategic',
      icon: '📌',
      color: 'green',
      classes: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 shadow-sm shadow-emerald-500/5'
    };
  }

  if (urgency === 'upcoming') {
    return {
      label: 'Upcoming',
      icon: '🟡',
      color: 'yellow',
      classes: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 shadow-sm shadow-amber-500/5'
    };
  }

  // On Track (Not Important, >21 days)
  return {
    label: 'On Track',
    icon: '🟢',
    color: 'green',
    classes: 'bg-zinc-50 dark:bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-500/20 shadow-sm shadow-zinc-500/5'
  };
};

// Unified Sorting Logic: Priority Level > Due Date > Importance
export const sortProjects = (projects: Project[]) => {
  return [...projects].sort((a, b) => {
    const pA = getProjectPriorityInfo(a);
    const pB = getProjectPriorityInfo(b);

    const score = (label: string) => {
      switch (label) {
        case 'Critical': return 1;
        case 'Time-sensitive': return 2;
        case 'Strategic': return 3;
        case 'Upcoming': return 4;
        case 'On Track': return 5;
        case 'Completed': return 6;
        default: return 99;
      }
    };

    const sA = score(pA.label);
    const sB = score(pB.label);

    if (sA !== sB) return sA - sB;

    // Secondary Sort: Due Date (Earliest first)
    const dA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const dB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
    
    if (dA !== dB) return dA - dB;

    // Tertiary Sort: Importance (True first)
    if (a.isImportant !== b.isImportant) return a.isImportant ? -1 : 1;

    return 0;
  });
};


interface ProjectModalProps {

  project: Project;
  onClose: () => void;
  onUpdateProject: (updatedProject: Project) => void;
  onDeleteProject: (projectId: string) => void;
  mode?: 'edit' | 'create';
}

export function ProjectModal({ project, onClose, onUpdateProject, onDeleteProject, mode = 'edit' }: ProjectModalProps) {
  const [isEditing, setIsEditing] = useState(mode === 'create');
  const [editTitle, setEditTitle] = useState(project.title);
  const [editStartDate, setEditStartDate] = useState(project.startDate || new Date().toISOString().split('T')[0]);
  const [editDate, setEditDate] = useState(project.dueDate);
  const [editImportant, setEditImportant] = useState(project.isImportant);
  const [editStatus, setEditStatus] = useState<Project['status']>(project.status || 'not-started');
  const [newTaskTitle, setNewTaskTitle] = useState('');




  const handleToggleTask = (taskId: string) => {
    const updatedTasks = project.tasks.map(t =>
      t.id === taskId ? { 
        ...t, 
        isCompleted: !t.isCompleted, 
        completedAt: !t.isCompleted ? new Date().toISOString() : undefined 
      } : t
    );
    onUpdateProject({ ...project, tasks: updatedTasks });
  };

  const handleDeleteTask = (taskId: string) => {
    const updatedTasks = project.tasks.filter(t => t.id !== taskId);
    onUpdateProject({ ...project, tasks: updatedTasks });
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const newTask: Task = { id: crypto.randomUUID(), title: newTaskTitle.trim(), isCompleted: false };
    onUpdateProject({ ...project, tasks: [...project.tasks, newTask] });
    setNewTaskTitle('');
  };

  const handleToggleProjectCompletion = () => {
    onUpdateProject({ 
      ...project, 
      isCompleted: !project.isCompleted, 
      completedAt: !project.isCompleted ? new Date().toISOString() : undefined 
    });
  };

  const saveEdits = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;
    onUpdateProject({ 
      ...project, 
      title: editTitle.trim(), 
      startDate: editStartDate,
      dueDate: editDate, 
      isImportant: editImportant,
      status: editStatus,
      // If status changed to completed, mark isCompleted
      isCompleted: editStatus === 'completed' ? true : project.isCompleted,
      completedAt: editStatus === 'completed' && !project.completedAt ? new Date().toISOString() : project.completedAt
    });
    setIsEditing(false);
    if (mode === 'create') onClose();
  };

  const priority = getProjectPriorityInfo(project);


  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-zinc-900/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        {isEditing ? (
          <form onSubmit={saveEdits} className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-500 mb-4">
              {mode === 'create' ? 'Create New Project' : 'Edit Project Details'}
            </h2>
            <input
              autoFocus
              type="text"
              placeholder="Project Title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-lg font-bold text-zinc-900 dark:text-white mb-4 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
              required
            />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Start Date</label>
                <input
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Due Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 appearance-none"
                >
                  <option value="not-started">Not Started</option>
                  <option value="in-progress">In Progress</option>
                  <option value="on-hold">On Hold</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Priority</label>
                <button
                  type="button"
                  onClick={() => setEditImportant(!editImportant)}
                  className={`w-full h-[38px] flex items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors border ${editImportant
                      ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-transparent hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={editImportant ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                  Important (Star)
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <button type="button" onClick={() => mode === 'create' ? onClose() : setIsEditing(false)} className="px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white">Cancel</button>
              <button type="submit" className="px-5 py-2 text-sm font-semibold bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors">
                {mode === 'create' ? 'Create Project' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 flex items-start justify-between bg-zinc-50/50 dark:bg-zinc-900/20">
            <div className="pr-4">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 px-2 py-1 rounded-md">
                  {project.bucketId}
                </span>
                <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md flex items-center gap-1.5 ${priority.classes}`}>
                  <span>{priority.icon}</span>
                  {priority.label}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                  Status: {project.status?.replace('-', ' ') || 'not started'}
                </span>
              </div>
              <h2 className={`text-2xl font-extrabold leading-tight flex items-center gap-2 ${project.isCompleted || project.status === 'completed' ? 'text-zinc-400 dark:text-zinc-600 line-through' : 'text-zinc-900 dark:text-white'}`}>
                {project.title}
                {project.isImportant && (
                  <span className="text-amber-500 animate-pulse-subtle">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                  </span>
                )}
              </h2>
              <div className="flex flex-wrap items-center gap-4 mt-2">
                {project.startDate && (
                  <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    <span className="opacity-60">Started:</span>
                    {new Date(project.startDate + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                )}
                {project.dueDate && (
                  <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                    <span className="opacity-60">Due:</span>
                    {new Date(project.dueDate + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  setEditTitle(project.title);
                  setEditStartDate(project.startDate || '');
                  setEditDate(project.dueDate);
                  setEditImportant(project.isImportant);
                  setEditStatus(project.status || 'not-started');
                  setIsEditing(true);
                }}
                className="w-10 h-10 flex items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-500 rounded-full hover:text-teal-600 hover:border-teal-200 dark:hover:border-teal-900/50 hover:bg-teal-50 dark:hover:bg-teal-500/10 transition-colors"
                title="Edit Project"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
              </button>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-500 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
          </div>
        )}

        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white dark:bg-zinc-950">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold uppercase text-zinc-400 tracking-widest">Tasks Overview</h3>
            <span className="text-sm font-medium text-zinc-500">
              {project.tasks?.filter(t => t.isCompleted).length || 0} / {project.tasks?.length || 0} Done
            </span>
          </div>

          {!project.tasks || project.tasks.length === 0 ? (
            <div className="text-center py-10 bg-zinc-50 dark:bg-zinc-900 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
              <p className="text-zinc-500 dark:text-zinc-400">No tasks defined for this project yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {project.tasks.map(task => (
                <div
                  key={task.id}
                  className={`group flex items-center justify-between p-3.5 rounded-xl border transition-all ${task.isCompleted
                      ? 'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-100 dark:border-zinc-800/50'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                >
                  <button
                    onClick={() => handleToggleTask(task.id)}
                    className="flex items-center gap-3.5 text-left flex-1"
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${task.isCompleted
                        ? 'bg-teal-500 border-teal-500 text-white'
                        : 'border-zinc-300 dark:border-zinc-600 group-hover:border-teal-400'
                      }`}>
                      {task.isCompleted && <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                    </div>
                    <span className={`font-medium ${task.isCompleted ? 'text-zinc-400 dark:text-zinc-600 line-through' : 'text-zinc-800 dark:text-zinc-200'}`}>
                      {task.title}
                    </span>
                  </button>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Task Form */}
        <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30">
          <form onSubmit={handleCreateTask} className="relative flex items-center">
            <input
              type="text"
              placeholder="Add a new task to this project..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-4 pr-12 py-3.5 text-[15px] font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 shadow-sm"
            />
            <button
              type="submit"
              disabled={!newTaskTitle.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
            </button>
          </form>
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={handleToggleProjectCompletion}
              className={`text-xs font-bold py-2 px-4 rounded-md transition-colors ${project.isCompleted
                  ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700'
                  : 'bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-500/20'
                }`}
            >
              {project.isCompleted ? 'Mark as Incomplete' : 'Mark as Complete'}
            </button>
            <button
              onClick={() => onDeleteProject(project.id)}
              className="text-xs font-semibold text-red-500 hover:text-red-700 py-2 px-3 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors"
            >
              Delete Project
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
