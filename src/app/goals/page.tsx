"use client";
import React, { useState, useEffect } from 'react';
import { Goals } from '@/components/widgets/Goals';

export default function GoalsPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-teal-500/30 font-sans p-4 md:p-8 xl:p-12 transition-colors duration-200">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-10 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-3">
              Goals
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 block">Prioritize what matters most.</p>
          </div>
        </header>
        
        <section className="w-full relative fade-in">
          <Goals />
        </section>
      </div>
    </main>
  );
}
