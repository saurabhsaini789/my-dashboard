"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { SyncStatus } from './SyncStatus';
import { useSyncStatus } from '@/context/SyncContext';

export function NavigationBar() {
  const pathname = usePathname();
  const { syncStatus } = useSyncStatus();

  return (
    <div className="w-full flex justify-center bg-zinc-50 dark:bg-zinc-950 px-4 md:px-8 xl:px-12 pt-6 pb-2 text-zinc-900 dark:text-zinc-100">
      <header className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full max-w-7xl border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xl font-bold tracking-tight hover:opacity-80 transition-opacity">
            Personal OS
          </Link>
          <SyncStatus status={syncStatus} />
        </div>
        <nav className="flex items-center gap-6">
          <Link 
            href="/" 
            className={`text-sm font-semibold transition-colors ${pathname === '/' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}
          >
            Dashboard
          </Link>
          <Link 
            href="/goals" 
            className={`text-sm font-semibold transition-colors ${pathname === '/goals' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}
          >
            Goals
          </Link>
          <Link 
            href="/habits" 
            className={`text-sm font-semibold transition-colors ${pathname === '/habits' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}
          >
            Habits
          </Link>
          <Link 
            href="/finances" 
            className={`text-sm font-semibold transition-colors ${pathname === '/finances' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}
          >
            Finances
          </Link>
          <button 
            onClick={() => supabase.auth.signOut()}
            className="text-sm font-semibold text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 transition-colors bg-rose-500/5 px-3 py-1.5 rounded-lg border border-rose-500/10"
          >
            Sign Out
          </button>
        </nav>
      </header>
    </div>
  );
}
