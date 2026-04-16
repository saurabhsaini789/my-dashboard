"use client";
import React, { useState, useEffect } from 'react';
import { Habits } from '@/components/widgets/Habits';
import { HabitsOverview } from '@/components/widgets/HabitsOverview';

export default function HabitsPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-teal-500/30 font-sans p-4 md:p-8 xl:p-12">
      <div className="mx-auto w-full max-w-7xl mb-8">
        <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col items-start">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Habits Tracker</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">Track your daily progress</p>
          </div>
        </header>
        
        <section className="w-full relative fade-in mb-8">
          <HabitsOverview />
        </section>
      </div>
      
      <div className="mx-auto w-full max-w-7xl">
        <section className="w-full relative fade-in">
          <Habits />
        </section>
      </div>
    </main>
  );
}
