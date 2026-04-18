"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Quotes } from '@/components/widgets/Quotes';
import { TasksCalendar } from '@/components/widgets/TasksCalendar';
import { GrowthOverview } from '@/components/widgets/GrowthOverview';
import { OneNoteJournal } from '@/components/widgets/OneNoteJournal';
import { PageTitle, SectionTitle, Text, Description } from '@/components/ui/Text';
import { useSystemPulse, PriorityTier } from '@/hooks/useSystemPulse';
import { 
  Activity, 
  Zap, 
  Calendar, 
  ShieldAlert, 
  ChevronRight, 
  Target,
  ArrowUpRight
} from 'lucide-react';

export default function Home() {
    const [mounted, setMounted] = useState(false);
    const pulse = useSystemPulse();

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const tierColors: Record<PriorityTier, string> = {
        CRITICAL: 'text-rose-600 bg-rose-50/80 dark:bg-rose-500/10 dark:text-rose-400 border-rose-100/50 dark:border-rose-500/20',
        DAILY: 'text-teal-600 bg-teal-50/80 dark:bg-teal-500/10 dark:text-teal-400 border-teal-100/50 dark:border-teal-500/20',
        MAINTENANCE: 'text-zinc-500 bg-zinc-50/80 dark:bg-zinc-800/50 dark:text-zinc-400 border-zinc-200/50 dark:border-zinc-700/50'
    };

    return (
        <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-teal-500/30 font-sans p-4 md:p-8 xl:p-12">
            <div className="mx-auto w-full max-w-7xl">

                {/* Page Header */}
                <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="flex flex-col items-start">
                        <PageTitle>
                            Today Actions
                        </PageTitle>
                        <Description>Command center for your system's health and daily momentum.</Description>
                    </div>
                </header>

                {/* Unified System Status Dashboard */}
                <div className="fade-in grid grid-cols-1 lg:grid-cols-12 gap-6 mb-14">
                    
                    {/* 1. Pulse Index Gauge */}
                    <div className="lg:col-span-3 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 flex flex-col items-center justify-center shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-1 bg-zinc-100 dark:bg-zinc-800">
                            <div 
                                className={`h-full transition-all duration-1000 ${pulse.score >= 80 ? 'bg-emerald-500' : pulse.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                style={{ width: `${pulse.score}%` }}
                            />
                        </div>
                        
                        <Activity className="text-zinc-300 dark:text-zinc-700 mb-4 group-hover:text-teal-500/50 transition-colors" size={32} />
                        <Text variant="label" className="uppercase tracking-widest text-[10px] text-zinc-400 mb-1">System Pulse</Text>
                        <div className="flex items-baseline gap-1">
                            <Text variant="display" className="text-5xl font-black tabular-nums">{pulse.score}</Text>
                            <Text variant="bodySmall" className="text-zinc-400 font-bold">%</Text>
                        </div>
                        <div className={`mt-2 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-tighter ${
                            pulse.score >= 80 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 
                            pulse.score >= 50 ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' : 
                            'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                        }`}>
                            {pulse.scoreLabel}
                        </div>
                        
                        <div className="mt-6 w-full space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-tight text-zinc-400">
                                <span>Health Readiness</span>
                                <span className="text-zinc-600 dark:text-zinc-300">{Math.round(pulse.stats.healthReadiness)}%</span>
                            </div>
                            <div className="h-1 bg-zinc-50 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-zinc-300 dark:bg-zinc-600 rounded-full" style={{ width: `${pulse.stats.healthReadiness}%` }} />
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-tight text-zinc-400">
                                <span>Goal Health</span>
                                <span className="text-zinc-600 dark:text-zinc-300">{Math.round(pulse.stats.goalHealth)}%</span>
                            </div>
                            <div className="h-1 bg-zinc-50 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full bg-zinc-300 dark:bg-zinc-600 rounded-full" style={{ width: `${pulse.stats.goalHealth}%` }} />
                            </div>
                        </div>
                    </div>

                    {/* 2. Priority Matrix (Queue) */}
                    <div className="lg:col-span-6 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl p-6 shadow-sm flex flex-col">
                        <div className="flex items-baseline justify-between mb-6">
                            <SectionTitle className="mb-0">Priority Queue</SectionTitle>
                            <Text variant="bodySmall" className="text-zinc-400 font-medium">
                                {pulse.actions.length} items need attention
                            </Text>
                        </div>

                        <div className="flex-1 space-y-3 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                            {pulse.actions.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center py-8 opacity-40">
                                    <ShieldAlert size={40} className="mb-2 text-zinc-300" />
                                    <Text variant="bodySmall">All systems operational</Text>
                                </div>
                            ) : (
                                pulse.actions.map((action) => (
                                    <Link
                                        key={action.id}
                                        href={action.href}
                                        className="group flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/30 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 transition-all hover:bg-white dark:hover:bg-zinc-800 shadow-sm"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-xl border ${tierColors[action.tier]}`}>
                                                {action.tier === 'CRITICAL' ? <ShieldAlert size={16} /> : action.tier === 'DAILY' ? <Zap size={16} /> : <Calendar size={16} />}
                                            </div>
                                            <Text variant="body" className="font-semibold group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                                                {action.label}
                                            </Text>
                                        </div>
                                        <ChevronRight size={18} className="text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>

                    {/* 3. Strategic Focus (Milestone) */}
                    <div className="lg:col-span-3 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col relative overflow-hidden group">
                        {/* Background Decoration */}
                        <div className="absolute -right-8 -bottom-8 opacity-[0.03] dark:opacity-10 text-zinc-900 dark:text-white">
                            <Target size={180} />
                        </div>

                        <Text variant="label" className="uppercase tracking-widest text-[10px] text-zinc-400 mb-6">Strategic Focus</Text>
                        
                        {pulse.milestone ? (
                            <div className="flex-1 flex flex-col">
                                <Text variant="bodySmall" className="text-teal-600 dark:text-teal-400 font-bold mb-1 uppercase tracking-tighter">
                                    {pulse.milestone.daysDesc}
                                </Text>
                                <Text variant="title" className="text-xl font-bold leading-tight mb-4 pr-4 text-zinc-900 dark:text-white">
                                    {pulse.milestone.title}
                                </Text>
                                <div className="mt-auto">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase">
                                            {pulse.milestone.bucket}
                                        </span>
                                    </div>
                                    <Link href="/goals" className="inline-flex items-center gap-2 text-sm font-bold text-teal-600 dark:text-white hover:text-teal-700 dark:hover:text-teal-400 transition-all group">
                                        View Roadmap <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center opacity-40 text-center">
                                <Target size={32} className="mb-2 text-zinc-400" />
                                <Text variant="bodySmall" className="text-zinc-400">No upcoming milestones</Text>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sub-sections */}
                <section className="w-full fade-in mb-14" style={{ animationDelay: '50ms' }}>
                    <GrowthOverview />
                </section>

                <section className="w-full fade-in mb-14">
                    <div className="w-full">
                        <Quotes />
                    </div>
                </section>

                <section className="w-full fade-in mb-14" style={{ animationDelay: '100ms' }}>
                    <TasksCalendar />
                </section>

                <section className="w-full fade-in pb-12" style={{ animationDelay: '200ms' }}>
                    <div className="w-full">
                        <OneNoteJournal />
                    </div>
                </section>

            </div>
        </main>
    );
}
