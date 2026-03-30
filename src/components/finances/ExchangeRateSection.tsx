"use client";

import React, { useState, useEffect } from 'react';
import { getPrefixedKey } from '@/lib/keys';
import { setSyncedItem } from '@/lib/storage';
import { SYNC_KEYS } from '@/lib/sync-keys';

export function ExchangeRateSection() {
  const [exchangeRate, setExchangeRate] = useState<string>('67.00');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_EXCHANGE_RATE));
    if (saved) {
      setExchangeRate(saved);
    }
    setIsLoaded(true);

    const handleLocal = (e: any) => {
      if (e.detail && e.detail.key === SYNC_KEYS.FINANCES_EXCHANGE_RATE) {
        const val = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_EXCHANGE_RATE));
        if (val) setExchangeRate(val);
      }
    };
    window.addEventListener('local-storage-change', handleLocal);
    return () => window.removeEventListener('local-storage-change', handleLocal);
  }, []);

  const handleSave = () => {
    const rate = parseFloat(exchangeRate);
    if (isNaN(rate) || rate <= 0) return;
    
    setIsSaving(true);
    setSyncedItem(SYNC_KEYS.FINANCES_EXCHANGE_RATE, rate.toFixed(2));

    
    setTimeout(() => {
      setIsSaving(false);
    }, 1000);
  };

  if (!isLoaded) return null;

  return (
    <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[40px] p-8 md:p-12 shadow-sm transition-all hover:shadow-xl group">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
              Currency Settings
            </h2>
          </div>
          <p className="text-sm text-zinc-500 max-w-md">
            Set your CAD to INR exchange rate. This rate is used to convert Canadian Dollar income and expenses to Indian Rupees for your dashboard metrics.
          </p>
        </div>

        <div className="flex items-end gap-4 p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-3xl border border-zinc-100 dark:border-zinc-800 transition-all group-hover:border-indigo-100 dark:group-hover:border-indigo-900/30">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] ml-2">1 CAD = INR</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-medium">₹</span>
              <input 
                type="number" 
                step="0.01" 
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                className="w-32 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl pl-8 pr-4 py-3 text-lg font-bold text-zinc-900 dark:text-zinc-100 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none"
              />
            </div>
          </div>
          
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className={`px-8 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all ${
              isSaving 
                ? 'bg-emerald-500 text-white shadow-none' 
                : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black hover:scale-105 active:scale-95 shadow-xl shadow-zinc-200/50 dark:shadow-none'
            }`}
          >
            {isSaving ? (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Saved
              </div>
            ) : 'Update Rate'}
          </button>
        </div>
      </div>
    </div>
  );
}
