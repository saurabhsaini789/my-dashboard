"use client";

import React, { useState, useEffect } from 'react';
import { PantryCalendar } from '@/components/pantry/PantryCalendar';
import { GroceryPlan } from '@/components/pantry/GroceryPlan';
import { PriceIntelligence } from '@/components/pantry/PriceIntelligence';
import { InventoryTracker } from '@/components/pantry/InventoryTracker';
import { SmartInsights } from '@/components/pantry/SmartInsights';
import { SYNC_KEYS } from '@/lib/sync-keys';
import { getPrefixedKey } from '@/lib/keys';
import { setSyncedItem } from '@/lib/storage';
import { ExpenseRecord } from '@/types/finance';

export default function PantryPage() {
  const [mounted, setMounted] = useState(false);
  const [records, setRecords] = useState<ExpenseRecord[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Initial fetch from local storage
    const saved = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_EXPENSES));
    if (saved) {
      try {
        setRecords(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse expense data in pantry", e);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    const handleLocal = (e: any) => {
      if (e.detail && e.detail.key === SYNC_KEYS.FINANCES_EXPENSES) {
        const val = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_EXPENSES));
        if (val) {
          try {
            setRecords(JSON.parse(val));
          } catch (e) { }
        }
      }
    };
    window.addEventListener('local-storage-change', handleLocal);
    return () => window.removeEventListener('local-storage-change', handleLocal);
  }, [isLoaded]);

  const updateRecords = (newRecords: ExpenseRecord[]) => {
    setRecords(newRecords);
    setSyncedItem(SYNC_KEYS.FINANCES_EXPENSES, JSON.stringify(newRecords));
  };

  if (!mounted || !isLoaded) return null;

  return (
    <main className="min-h-screen bg-[#fcfcfc] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-teal-500/10 p-6 md:p-10 lg:p-12 relative overflow-hidden">
      <div className="mx-auto w-full max-w-7xl flex flex-col gap-8 md:gap-10 pt-4 relative z-10">

        {/* Page Title */}
        <div className="flex flex-col gap-6 items-center">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-zinc-900 dark:text-zinc-100 text-center uppercase tracking-[0.3em] drop-shadow-sm leading-tight">
            Pantry
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 uppercase tracking-widest text-center max-w-lg">
            Calendar-based Expense Tracker & Bill Management
          </p>
        </div>

        {/* Dynamic Pantry Calendar */}
        <div className="fade-in animate-in slide-in-from-bottom-4 duration-700">
          <PantryCalendar records={records} onUpdateRecords={updateRecords} />
        </div>

        {/* Monthly Grocery Plan */}
        <div className="fade-in animate-in slide-in-from-bottom-4 duration-700 delay-200">
          <GroceryPlan records={records} />
        </div>

        {/* Price Intelligence Tracker */}
        <div className="fade-in animate-in slide-in-from-bottom-4 duration-700 delay-300">
          <PriceIntelligence records={records} />
        </div>

        {/* Inventory Tracker (Auto-updating) */}
        <div className="fade-in animate-in slide-in-from-bottom-4 duration-700 delay-400">
          <InventoryTracker records={records} />
        </div>

        {/* Smart Insights (AI-Powered) */}
        <div className="fade-in animate-in slide-in-from-bottom-4 duration-700 delay-500">
          <SmartInsights records={records} />
        </div>

      </div>

      {/* Background Decor */}
      <div className="absolute top-0 right-0 -z-0 opacity-5 pointer-events-none">
        <svg width="800" height="800" viewBox="0 0 800 800" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="600" cy="200" r="400" fill="url(#pantry_gradient)" />
          <defs>
            <radialGradient id="pantry_gradient" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(600 200) rotate(90) scale(400)">
              <stop stopColor="#f43f5e" />
              <stop offset="1" stopColor="#f43f5e" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>
      </div>
    </main>
  );
}
