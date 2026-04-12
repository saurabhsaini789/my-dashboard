"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { SyncStatus } from './SyncStatus';
import { useSyncStatus } from '@/context/SyncContext';
import { Menu, X } from 'lucide-react';

export function NavigationBar() {
  const pathname = usePathname();
  const { syncStatus, isLocalhost } = useSyncStatus();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Dashboard', path: '/' },
    { name: 'Goals', path: '/goals' },
    { name: 'Habits', path: '/habits' },
    { name: 'Books', path: '/books' },
    { name: 'Finances', path: '/finances' },
    { name: 'Businesses', path: '/businesses' },
    { name: 'Expenses', path: '/pantry' },
    { name: 'Wardrobe', path: '/wardrobe' },
  ];

  return (
    <div className="w-full flex justify-center bg-zinc-50 dark:bg-zinc-950 px-4 md:px-8 xl:px-12 pt-6 pb-2 text-zinc-900 dark:text-zinc-100">
      <header className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full max-w-7xl border-b border-zinc-200 dark:border-zinc-800 pb-4 relative">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-bold tracking-tight hover:opacity-80 transition-opacity">
              Personal OS
            </Link>
            <SyncStatus status={syncStatus} isLocalhost={isLocalhost} />
          </div>
          
          {/* Mobile Menu Toggle */}
          <button 
            className="sm:hidden p-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden sm:flex flex-wrap items-center justify-end gap-x-6">
          {navLinks.map((link) => (
            <Link 
              key={link.path}
              href={link.path} 
              className={`text-sm font-semibold transition-colors ${pathname === link.path ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}
            >
              {link.name}
            </Link>
          ))}
          <button 
            onClick={() => supabase.auth.signOut()}
            className="text-sm font-semibold text-zinc-500 hover:text-rose-500 dark:text-zinc-400 dark:hover:text-rose-400 transition-colors px-3 py-1.5 rounded-lg border border-transparent hover:border-rose-500/20 hover:bg-rose-500/5"
          >
            Sign Out
          </button>
        </nav>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="flex sm:hidden flex-col items-center w-full gap-4 pt-4 pb-2">
            {navLinks.map((link) => (
              <Link 
                key={link.path}
                href={link.path} 
                onClick={() => setMobileMenuOpen(false)}
                className={`text-sm font-semibold transition-colors ${pathname === link.path ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}
              >
                {link.name}
              </Link>
            ))}
            <button 
              onClick={() => {
                setMobileMenuOpen(false);
                supabase.auth.signOut();
              }}
              className="text-sm font-semibold text-zinc-500 hover:text-rose-500 dark:text-zinc-400 dark:hover:text-rose-400 transition-colors w-full py-2 border-t border-zinc-200 dark:border-zinc-800 mt-2"
            >
              Sign Out
            </button>
          </nav>
        )}
      </header>
    </div>
  );
}
