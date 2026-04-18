"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Cell, BarChart, Bar
} from 'recharts';
import { 
  TrendingUp, Target, Package, Calendar, Clock, AlertCircle, 
  ChevronRight, ArrowRight, Zap, ListTodo, BarChart2 
} from 'lucide-react';
import { getPrefixedKey } from '@/lib/keys';
import { Project, Task, getProjectPriorityInfo } from './ProjectModal';
import { SectionTitle, Text, Description } from '../ui/Text';
import { TimeFilter } from './GoalsSummary';

const BUCKETS = [
  'Health', 'Income', 'Career',
  'Wealth', 'Family', 'Lifestyle',
  'Learning', 'Admin', 'Mental'
];

interface GoalsInsightsProps {
  filter: TimeFilter;
  selectedMonth: number;
  selectedYear: number;
}

type VelocityView = 'daily' | 'weekly' | 'monthly';

export function GoalsInsights({ filter, selectedMonth, selectedYear }: GoalsInsightsProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [velocityView, setVelocityView] = useState<VelocityView>('weekly');

  useEffect(() => {
    const loadData = () => {
      const stored = localStorage.getItem(getPrefixedKey('goals_projects'));
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setProjects(Array.isArray(parsed) ? parsed : []);
        } catch (e) {}
      }
      setIsLoaded(true);
    };

    loadData();
    const handleLocal = (e: any) => {
      if (e.detail && e.detail.key === 'goals_projects') loadData();
    };
    window.addEventListener('local-storage-change', handleLocal);
    return () => window.removeEventListener('local-storage-change', handleLocal);
  }, []);

  // --- Data Processing ---

  // 1. Radar Chart Data (Life Balance)
  const radarData = useMemo(() => {
    return BUCKETS.map(bucket => {
      const bucketProjects = projects.filter(p => p.bucketId === bucket);
      const completed = bucketProjects.filter(p => p.isCompleted || p.status === 'completed').length;
      const total = bucketProjects.length;
      const score = total > 0 ? (completed / total) * 100 : 0;
      // Add a small base value for visibility if there are active projects
      const activeScore = bucketProjects.some(p => !p.isCompleted) ? 20 : 0;
      
      return {
        name: bucket,
        score: Math.max(score, activeScore),
        count: total,
        completed: completed
      };
    });
  }, [projects]);

  // 2. Eisenhower Matrix Data
  const matrixData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const soon = new Date(today);
    soon.setDate(today.getDate() + 7);

    const quadrants = {
      doFirst: [] as Project[], // Important & Urgent (Due within 7 days)
      schedule: [] as Project[], // Important & Not Urgent
      delegate: [] as Project[], // Not Important & Urgent
      eliminate: [] as Project[] // Not Important & Not Urgent
    };

    projects.filter(p => !p.isCompleted && p.status !== 'completed').forEach(p => {
      const due = p.dueDate ? new Date(p.dueDate + 'T00:00:00') : null;
      const isUrgent = due && due <= soon;
      
      if (p.isImportant && isUrgent) quadrants.doFirst.push(p);
      else if (p.isImportant && !isUrgent) quadrants.schedule.push(p);
      else if (!p.isImportant && isUrgent) quadrants.delegate.push(p);
      else quadrants.eliminate.push(p);
    });

    return quadrants;
  }, [projects]);

  // 3. Velocity Chart Data
  const velocityData = useMemo(() => {
    const completedItems: { date: Date; type: 'project' | 'task' }[] = [];
    
    projects.forEach(p => {
      if (p.completedAt) completedItems.push({ date: new Date(p.completedAt), type: 'project' });
      p.tasks.forEach(t => {
        if (t.isCompleted && t.completedAt) {
          completedItems.push({ date: new Date(t.completedAt), type: 'task' });
        }
      });
    });

    if (velocityView === 'daily') {
      const days: Record<string, number> = {};
      const last14Days = Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
      }).reverse();

      last14Days.forEach(day => days[day] = 0);
      completedItems.forEach(item => {
        const dayStr = item.date.toISOString().split('T')[0];
        if (days[dayStr] !== undefined) days[dayStr]++;
      });

      return last14Days.map(day => ({
        name: new Date(day).toLocaleDateString(undefined, { weekday: 'short' }),
        value: days[day]
      }));
    }

    if (velocityView === 'weekly') {
      const weeks: Record<string, number> = {};
      const last8Weeks = Array.from({ length: 8 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (i * 7));
        // Get start of week (Sunday)
        d.setDate(d.getDate() - d.getDay());
        return d.toISOString().split('T')[0];
      }).reverse();

      last8Weeks.forEach(week => weeks[week] = 0);
      completedItems.forEach(item => {
        const d = new Date(item.date);
        d.setDate(d.getDate() - d.getDay());
        d.setHours(0, 0, 0, 0);
        const weekStr = d.toISOString().split('T')[0];
        if (weeks[weekStr] !== undefined) weeks[weekStr]++;
      });

      return last8Weeks.map(week => ({
        name: `W${new Date(week).getDate()}/${new Date(week).getMonth() + 1}`,
        value: weeks[week]
      }));
    }

    // Monthly
    const months: Record<string, number> = {};
    const monthsList = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    }).reverse();

    monthsList.forEach(m => months[m] = 0);
    completedItems.forEach(item => {
      const mStr = `${item.date.getFullYear()}-${(item.date.getMonth() + 1).toString().padStart(2, '0')}`;
      if (months[mStr] !== undefined) months[mStr]++;
    });

    return monthsList.map(m => ({
      name: new Date(m + '-01').toLocaleDateString(undefined, { month: 'short' }),
      value: months[m]
    }));
  }, [projects, velocityView]);

  // 4. Milestone Timeline (Next 5 upcoming important tasks/projects)
  const milestones = useMemo(() => {
    const list: { title: string; date: Date; bucket: string; isProject: boolean }[] = [];
    const today = new Date();
    today.setHours(0,0,0,0);

    projects.filter(p => !p.isCompleted && p.status !== 'completed').forEach(p => {
      if (p.dueDate && new Date(p.dueDate) >= today) {
        list.push({
          title: p.title,
          date: new Date(p.dueDate + 'T12:00:00'),
          bucket: p.bucketId,
          isProject: true
        });
      }
    });

    return list.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 5);
  }, [projects]);

  // 5. Performance Metrics
  const metrics = useMemo(() => {
    const completedProjects = projects.filter(p => p.isCompleted || p.status === 'completed');
    
    // Average completion time
    let avgDays = 0;
    if (completedProjects.length > 0) {
      const totalDays = completedProjects.reduce((acc, p) => {
        const start = new Date(p.createdAt);
        const end = p.completedAt ? new Date(p.completedAt) : new Date();
        return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      }, 0);
      avgDays = Math.round(totalDays / completedProjects.length);
    }

    // On Track Ratio
    const activeProjects = projects.filter(p => !p.isCompleted && p.status !== 'completed');
    const onTrack = activeProjects.filter(p => getProjectPriorityInfo(p).label === 'On Track').length;
    const healthRatio = activeProjects.length > 0 ? (onTrack / activeProjects.length) * 100 : 0;

    return { avgDays, healthRatio, activeCount: activeProjects.length };
  }, [projects]);

  if (!isLoaded) return null;

  return (
    <div className="space-y-6 pt-2 pb-10">
      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900/60 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <Clock size={24} />
          </div>
          <div>
            <Text variant="label" className="uppercase text-[10px] tracking-widest text-zinc-400">Avg Lead Time</Text>
            <Text variant="metric" className="text-2xl">{metrics.avgDays} <span className="text-sm font-normal text-zinc-400">Days</span></Text>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900/60 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Zap size={24} />
          </div>
          <div>
            <Text variant="label" className="uppercase text-[10px] tracking-widest text-zinc-400">Fleet Health</Text>
            <Text variant="metric" className="text-2xl">{Math.round(metrics.healthRatio)}% <span className="text-sm font-normal text-zinc-400">On Track</span></Text>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900/60 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center">
            <BarChart2 size={24} />
          </div>
          <div>
            <Text variant="label" className="uppercase text-[10px] tracking-widest text-zinc-400">Active Load</Text>
            <Text variant="metric" className="text-2xl">{metrics.activeCount} <span className="text-sm font-normal text-zinc-400">Projects</span></Text>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Radar Chart: Life Balance */}
        <div className="lg:col-span-4 bg-white dark:bg-zinc-900/60 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col min-h-[400px]">
          <SectionTitle className="text-sm flex items-center gap-2 mb-6">
            <Target size={16} className="text-teal-500" />
            Life Balance Focus
          </SectionTitle>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                <PolarGrid stroke="#e4e4e7" strokeDasharray="3 3" />
                <PolarAngleAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10, fill: '#71717A', fontWeight: '500' }} 
                />
                <Radar
                  name="Focus"
                  dataKey="score"
                  stroke="#14b8a6"
                  fill="#14b8a6"
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-zinc-400 text-center mt-4">Composite score based on completion & volume in each life bucket.</p>
        </div>

        {/* Velocity Chart */}
        <div className="lg:col-span-8 bg-white dark:bg-zinc-900/60 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <SectionTitle className="text-sm flex items-center gap-2 mb-0">
              <TrendingUp size={16} className="text-teal-500" />
              Productivity Velocity
            </SectionTitle>
            <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
              {(['daily', 'weekly', 'monthly'] as VelocityView[]).map(v => (
                <button
                  key={v}
                  onClick={() => setVelocityView(v)}
                  className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${velocityView === v ? 'bg-white dark:bg-zinc-700 text-teal-600 dark:text-teal-400 shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={velocityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#A1A1AA' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#A1A1AA' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    borderRadius: '12px', 
                    border: '1px solid #e4e4e7',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '11px'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#14b8a6" 
                  strokeWidth={3} 
                  fill="url(#velocityGradient)"
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Eisenhower Matrix */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Do First */}
          <div className="bg-emerald-50/30 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl p-5 flex flex-col h-[280px]">
            <div className="flex items-center justify-between mb-4">
              <Text variant="label" className="uppercase font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <Zap size={14} />
                Do First
              </Text>
              <span className="text-[10px] font-bold text-emerald-600/50 uppercase tracking-tight">Important & Urgent</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
              {matrixData.doFirst.length === 0 && <p className="text-[12px] text-zinc-400 italic">No urgent items</p>}
              {matrixData.doFirst.map(p => (
                <div key={p.id} className="p-3 bg-white dark:bg-zinc-900/60 rounded-xl border border-emerald-100/50 dark:border-emerald-500/10 shadow-sm flex items-center justify-between group">
                  <span className="text-[13px] font-medium truncate">{p.title}</span>
                  <ArrowRight size={14} className="text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </div>

          {/* Schedule */}
          <div className="bg-teal-50/30 dark:bg-teal-500/5 border border-teal-100 dark:border-teal-500/20 rounded-2xl p-5 flex flex-col h-[280px]">
            <div className="flex items-center justify-between mb-4">
              <Text variant="label" className="uppercase font-bold text-teal-600 dark:text-teal-400 flex items-center gap-2">
                <Calendar size={14} />
                Schedule
              </Text>
              <span className="text-[10px] font-bold text-teal-600/50 uppercase tracking-tight">Important & Non-Urgent</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
              {matrixData.schedule.length === 0 && <p className="text-[12px] text-zinc-400 italic">Focus on backlog</p>}
              {matrixData.schedule.map(p => (
                <div key={p.id} className="p-3 bg-white dark:bg-zinc-900/60 rounded-xl border border-teal-100/50 dark:border-teal-500/10 shadow-sm flex items-center justify-between group">
                  <span className="text-[13px] font-medium truncate">{p.title}</span>
                  <ArrowRight size={14} className="text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </div>

          {/* Delegate */}
          <div className="bg-amber-50/30 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/20 rounded-2xl p-5 flex flex-col h-[280px]">
            <div className="flex items-center justify-between mb-4">
              <Text variant="label" className="uppercase font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <ListTodo size={14} />
                Delegate
              </Text>
              <span className="text-[10px] font-bold text-amber-600/50 uppercase tracking-tight">Not Important & Urgent</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
              {matrixData.delegate.length === 0 && <p className="text-[12px] text-zinc-400 italic">Clear skies</p>}
              {matrixData.delegate.map(p => (
                <div key={p.id} className="p-3 bg-white dark:bg-zinc-900/60 rounded-xl border border-amber-100/50 dark:border-amber-500/10 shadow-sm flex items-center justify-between group">
                  <span className="text-[13px] font-medium truncate">{p.title}</span>
                  <ArrowRight size={14} className="text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </div>

          {/* Eliminate */}
          <div className="bg-zinc-50/50 dark:bg-zinc-500/5 border border-zinc-200 dark:border-zinc-500/20 rounded-2xl p-5 flex flex-col h-[280px]">
            <div className="flex items-center justify-between mb-4">
              <Text variant="label" className="uppercase font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                <AlertCircle size={14} />
                Eliminate
              </Text>
              <span className="text-[10px] font-bold text-zinc-400/50 uppercase tracking-tight">Not Important & Not Urgent</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
              {matrixData.eliminate.length === 0 && <p className="text-[12px] text-zinc-400 italic">High signal tasks only</p>}
              {matrixData.eliminate.map(p => (
                <div key={p.id} className="p-3 bg-white dark:bg-zinc-900/60 rounded-xl border border-zinc-200 shadow-sm flex items-center justify-between group">
                  <span className="text-[13px] font-medium truncate opacity-60 line-through">{p.title}</span>
                  <ArrowRight size={14} className="text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Milestone Timeline */}
        <div className="lg:col-span-4 bg-white dark:bg-zinc-900/60 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col h-full min-h-[580px]">
          <SectionTitle className="text-sm flex items-center gap-2 mb-8">
            <BarChart2 size={16} className="text-teal-500" />
            Strategic Roadmap
          </SectionTitle>
          <div className="flex-1 relative">
            {/* Timeline Line */}
            <div className="absolute left-3 top-0 bottom-0 w-[1px] bg-gradient-to-b from-teal-500/50 via-zinc-200 dark:via-zinc-800 to-transparent"></div>
            
            <div className="space-y-8">
              {milestones.length === 0 && <p className="text-sm text-zinc-500 italic ml-8">No upcoming milestones</p>}
              {milestones.map((m, idx) => (
                <div key={idx} className="relative pl-10 group">
                  {/* Dot */}
                  <div className={`absolute left-1.5 top-1 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-900 z-10 transition-transform group-hover:scale-125 ${m.isProject ? 'bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.4)]' : 'bg-emerald-400'}`}></div>
                  
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 px-2 py-0.5 rounded uppercase tracking-tight">
                        {m.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{m.bucket}</span>
                    </div>
                    <Text variant="bodySmall" className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-teal-500 transition-colors">{m.title}</Text>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-500 mb-1">
              <Zap size={14} className="text-amber-500" />
              <span className="text-[10px] uppercase font-bold tracking-tight">Focus Recommendation</span>
            </div>
            <p className="text-[12px] leading-relaxed text-zinc-600 dark:text-zinc-400">
              Your next critical milestone is <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{milestones[0]?.title || 'none'}</span>. Ensure all blockers are cleared by {milestones[0]?.date.toLocaleDateString(undefined, { weekday: 'long' })}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
