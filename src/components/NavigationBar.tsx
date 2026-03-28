"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function NavigationBar() {
  const pathname = usePathname();

  return (
    <div className="w-full flex justify-center bg-zinc-50 dark:bg-zinc-950 px-4 md:px-8 xl:px-12 pt-6 pb-2 text-zinc-900 dark:text-zinc-100">
      <header className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full max-w-7xl border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <Link href="/my-dashboard/" className="text-xl font-bold tracking-tight hover:opacity-80 transition-opacity">
          Personal OS
        </Link>
        <nav className="flex gap-4">
          <Link 
            href="/my-dashboard/" 
            className={`text-sm font-semibold transition-colors ${pathname === '/' || pathname === '/my-dashboard' || pathname === '/my-dashboard/' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}
          >
            Dashboard
          </Link>
          <Link 
            href="/my-dashboard/goals" 
            className={`text-sm font-semibold transition-colors ${pathname === '/goals' || pathname === '/my-dashboard/goals' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}
          >
            Goals
          </Link>
          <Link 
            href="/my-dashboard/habits" 
            className={`text-sm font-semibold transition-colors ${pathname === '/habits' || pathname === '/my-dashboard/habits' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}
          >
            Habits
          </Link>
        </nav>
      </header>
    </div>
  );
}
