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

// Action-Oriented Priority Logic
export const getProjectPriorityInfo = (p: Project) => {
 // 1. Completed
  if (p.isCompleted || p.status === 'completed') {
    return {
      label: 'Completed',
      color: 'teal',
      bg: 'bg-teal-50 dark:bg-teal-500/10',
      text: 'text-teal-700 dark:text-teal-400',
      classes: 'border border-teal-200 dark:border-teal-900/50 opacity-80'
    };
  }

 // 2. On Hold
  if (p.status === 'on-hold') {
    return {
      label: 'On Hold',
      color: 'gray',
      bg: 'bg-zinc-100 dark:bg-zinc-800/50',
      text: 'text-zinc-500 dark:text-zinc-400',
      classes: 'border border-dashed border-zinc-300 dark:border-zinc-700 opacity-80'
    };
  }

 const today = new Date();
 today.setHours(0, 0, 0, 0);

 // Parse dates safely
 const due = p.dueDate ? new Date(p.dueDate + 'T00:00:00') : null;
 if (due) due.setHours(0, 0, 0, 0);
 
 const start = p.startDate ? new Date(p.startDate + 'T00:00:00') : null;
 if (start) start.setHours(0, 0, 0, 0);

 const diffDays = due ? Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : Infinity;
 const isPastStart = start ? today >= start : true;
 
 // Calculate Progress based on tasks
 const totalTasks = p.tasks?.length || 0;
 const completedTasks = p.tasks?.filter(t => t.isCompleted).length || 0;
 const taskProgress = totalTasks > 0 ? completedTasks / totalTasks : (p.status === 'in-progress' ? 0.5 : 0);

 // 3. Off Track (Past due date OR missed start date)
  if ((due && diffDays < 0) || (p.status === 'not-started' && isPastStart)) {
    return {
      label: 'Off Track',
      color: 'red',
      bg: 'bg-red-50 dark:bg-red-500/10',
      text: 'text-red-700 dark:text-red-400',
      classes: 'border border-red-200 dark:border-red-900/50 font-semibold focus-within:ring-red-500'
    };
  }

 // 4. At Risk (Due in <= 7 days but progress is < 25%)
  if (due && diffDays <= 7 && taskProgress < 0.25) {
    return {
      label: 'At Risk',
      color: 'orange',
      bg: 'bg-orange-50 dark:bg-orange-500/10',
      text: 'text-orange-700 dark:text-orange-400',
      classes: 'border border-orange-200 dark:border-orange-900/50 font-semibold'
    };
  }

 // 5. On Track (Everything else)
  return {
    label: 'On Track',
    color: 'green',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    text: 'text-emerald-700 dark:text-emerald-400',
    classes: 'border border-emerald-200 dark:border-emerald-900/50 font-medium'
  };
};

// Unified Sorting Logic
export const sortProjects = (projects: Project[]) => {
 return [...projects].sort((a, b) => {
 const pA = getProjectPriorityInfo(a);
 const pB = getProjectPriorityInfo(b);

 const score = (label: string) => {
 switch (label) {
 case 'Off Track': return 1;
 case 'At Risk': return 2;
 case 'On Track': return 3;
 case 'On Hold': return 4;
 case 'Completed': return 5;
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


import { Modal } from '../ui/Modal';
import { DynamicForm } from '../ui/DynamicForm';

interface ProjectModalProps {
 project: Project;
 onClose: () => void;
 onUpdateProject: (updatedProject: Project) => void;
 onDeleteProject: (projectId: string) => void;
 mode?: 'edit' | 'create';
}

export function ProjectModal({ project, onClose, onUpdateProject, onDeleteProject, mode = 'edit' }: ProjectModalProps) {
 const [isEditing, setIsEditing] = useState(mode === 'create');
 
 const [formData, setFormData] = useState({
 title: project.title,
 startDate: project.startDate || new Date().toISOString().split('T')[0],
 dueDate: project.dueDate || '',
 isImportant: project.isImportant,
 status: project.status || 'not-started'
 });
 
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
 if (!formData.title.trim()) return;
 onUpdateProject({ 
 ...project, 
 title: formData.title.trim(), 
 startDate: formData.startDate,
 dueDate: formData.dueDate, 
 isImportant: formData.isImportant,
 status: formData.status as any,
 // If status changed to completed, mark isCompleted
 isCompleted: formData.status === 'completed' ? true : project.isCompleted,
 completedAt: formData.status === 'completed' && !project.completedAt ? new Date().toISOString() : project.completedAt
 });
 setIsEditing(false);
 if (mode === 'create') onClose();
 };

 const priority = getProjectPriorityInfo(project);


 return (
 <Modal
 isOpen={true}
 onClose={isEditing && mode !== 'create' ? () => setIsEditing(false) : onClose}
 title={isEditing ? (mode === 'create' ? 'Create New Project' : 'Edit Project Details') : project.title}
 onSubmit={isEditing ? saveEdits : undefined}
 submitText={mode === 'create' ? 'Create Project' : 'Save Changes'}
 accentColor="blue"
 >
 {isEditing ? (
 <DynamicForm
 sections={[
 {
 id: 'project_details',
 title: '',
 fields: [
 { name: 'title', label: 'Project Title', type: 'text', required: true, fullWidth: true, placeholder: 'Project Title' },
 { name: 'startDate', label: 'Start Date', type: 'date' },
 { name: 'dueDate', label: 'Due Date', type: 'date', required: true },
 {
 name: 'status', label: 'Status', type: 'select',
 options: [
 { value: 'not-started', label: 'Not Started' },
 { value: 'in-progress', label: 'In Progress' },
 { value: 'on-hold', label: 'On Hold' },
 { value: 'completed', label: 'Completed' }
 ]
 },
 {
 name: 'isImportant', label: 'Priority', type: 'select',
 options: [
 { value: true as any, label: 'Important (Star)' },
 { value: false as any, label: 'Normal' }
 ]
 }
 ]
 }
 ]}
 formData={formData}
 accentColor="blue"
 onChange={(name, value) => setFormData(prev => ({ ...prev, [name]: value }))}
 />
 ) : (
 <div className="flex flex-col gap-6">
 <div className="flex flex-col gap-5 p-5 bg-white dark:bg-zinc-900/40 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm transition-all duration-300">
  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
  <div className="flex flex-wrap items-center gap-3">
  <span className="text-[10px] font-bold tracking-wider uppercase text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 px-2.5 py-1 rounded-lg border border-teal-100 dark:border-teal-500/20">
  {project.bucketId}
  </span>
  <span className={`text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${priority.bg} ${priority.text} ${priority.classes} border border-transparent`}>
  <span>{priority.label}</span>
  </span>

  {(project.startDate || project.dueDate) && (
  <div className="flex items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400 font-medium ml-1">
  <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700 hidden xs:block"></span>
  <div className="flex flex-wrap items-center gap-3">
  {project.startDate && (
  <span className="flex items-center gap-1">
  <span className="text-zinc-400 font-normal">Started</span>
  <span className="text-zinc-700 dark:text-zinc-300">{new Date(project.startDate + 'T12:00:00').toLocaleDateString()}</span>
  </span>
  )}
  {project.dueDate && (
  <span className="flex items-center gap-1">
  <span className="text-zinc-400 font-normal">Due</span>
  <span className="text-zinc-700 dark:text-zinc-300">{new Date(project.dueDate + 'T12:00:00').toLocaleDateString()}</span>
  </span>
  )}
  </div>
  </div>
  )}
  </div>

  <div className="flex items-center gap-3">
  {project.isImportant && (
  <div className="flex items-center gap-1.5 px-2.5 py-1 text-amber-500 bg-amber-50/50 dark:bg-amber-500/10 rounded-lg border border-amber-100/50 dark:border-amber-500/20">
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
  <span className="text-[10px] font-bold uppercase tracking-tight">Important</span>
  </div>
  )}
  
  <div className="flex gap-2">
  <button
  onClick={() => {
  setFormData({
  title: project.title,
  startDate: project.startDate || '',
  dueDate: project.dueDate,
  isImportant: project.isImportant,
  status: project.status || 'not-started'
  });
  setIsEditing(true);
  }}
  className="px-4 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-[11px] font-bold text-zinc-600 dark:text-zinc-300 transition-colors border border-zinc-200 dark:border-zinc-700"
  >
  Edit Project
  </button>
  <button
  onClick={() => {
  if (confirm('Are you sure you want to delete this project?')) {
  onDeleteProject(project.id);
  }
  }}
  className="px-4 py-1.5 bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 rounded-lg text-[11px] font-bold hover:bg-rose-100 dark:hover:bg-rose-900/20 transition-colors border border-rose-100 dark:border-rose-900/20"
  >
  Delete
  </button>
  </div>
  </div>
  </div>
 </div>

 <div className="flex flex-col gap-4">
 <h3 className="text-sm font-semibold uppercase text-zinc-400 flex justify-between">
 Tasks
 <span className="text-zinc-500">{project.tasks?.filter(t => t.isCompleted).length || 0} / {project.tasks?.length || 0}</span>
 </h3>

 {!project.tasks || project.tasks.length === 0 ? (
 <div className="text-center py-6 border border-dashed rounded-xl border-zinc-200 dark:border-zinc-800 text-zinc-500">
 No tasks defined.
 </div>
 ) : (
 <div className="space-y-2">
 {project.tasks.map(task => (
 <div key={task.id} className="group flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
 <button onClick={() => handleToggleTask(task.id)} className="flex items-center gap-3 text-left flex-1">
 <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${task.isCompleted ? 'bg-teal-500 border-teal-500 text-white' : 'border-zinc-300 dark:border-zinc-600'}`}>
 {task.isCompleted && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
 </div>
 <span className={`font-medium text-sm ${task.isCompleted ? 'line-through text-zinc-400' : 'text-zinc-800 dark:text-zinc-200'}`}>
 {task.title}
 </span>
 </button>
 <button onClick={() => handleDeleteTask(task.id)} className="opacity-0 group-hover:opacity-100 px-2 text-rose-500 hover:text-rose-700">✕</button>
 </div>
 ))}
 </div>
 )}
 
 <div className="flex gap-2">
 <input
 type="text"
 placeholder="New task..."
 value={newTaskTitle}
 onChange={(e) => setNewTaskTitle(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === 'Enter') {
 e.preventDefault();
 handleCreateTask(e as any);
 }
 }}
 className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
 />
 <button onClick={handleCreateTask} disabled={!newTaskTitle} type="button" className="px-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-semibold disabled:opacity-50">Add</button>
 </div>
 </div>
 </div>
 )}
 </Modal>
 );
}
