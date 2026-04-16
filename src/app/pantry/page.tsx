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
import { PageTitle, Text, Description } from '@/components/ui/Text';

export default function PantryPage() {
 const [mounted, setMounted] = useState(false);
 const [records, setRecords] = useState<ExpenseRecord[]>([]);
 const [isLoaded, setIsLoaded] = useState(false);
 const [viewingDate, setViewingDate] = useState(new Date());

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

 const currentMonthRecords = records.filter(r => {
 if (!r.date) return false;
 const [rYear, rMonth] = r.date.split('-');
 return parseInt(rMonth) - 1 === viewingDate.getMonth() && parseInt(rYear) === viewingDate.getFullYear();
 });

 const categoryTotals = currentMonthRecords.reduce((acc, r) => {
 acc[r.category] = (acc[r.category] || 0) + r.amount;
 return acc;
 }, {} as Record<string, number>);

 const { totalNeed, totalWant } = currentMonthRecords.reduce((acc, r) => {
 if (r.items && r.items.length > 0) {
 r.items.forEach(item => {
 if (item.type === 'want') acc.totalWant += item.totalPrice;
 else acc.totalNeed += item.totalPrice;
 });
 // Calculate taxes and associate them with the record level 'type'
 const taxTotal = (r.sgst || 0) + (r.cgst || 0);
 if (r.type === 'want') acc.totalWant += taxTotal;
 else acc.totalNeed += taxTotal;
 } else {
 // Legacy records and Quick Entry
 if (r.type === 'want') acc.totalWant += r.amount;
 else acc.totalNeed += r.amount;
 }
 return acc;
 }, { totalNeed: 0, totalWant: 0 });

 return (
 <main className="min-h-screen bg-[#fcfcfc] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-teal-500/10 p-4 md:p-8 xl:p-12 relative overflow-hidden">
 <div className="mx-auto w-full max-w-7xl relative z-10">

  {/* Page Title */}
  <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
    <div className="flex flex-col items-start">
      <PageTitle>Pantry</PageTitle>
      <Description>Kitchen inventory, groceries, and shopping lists.</Description>
    </div>
  </header>

  {/* Current Month Breakdown Overview */}
  {Object.keys(categoryTotals).length > 0 && (
  <div className="flex flex-col gap-5 fade-in animate-in slide-in-from-bottom-4 duration-700 delay-100 mb-14">
 <div className="flex items-center justify-between px-2">
 <Text variant="label" as="span">{viewingDate.toLocaleString('default', { month: 'long', year: 'numeric' })} Breakdown</Text>
 <Text variant="label" as="span">Total: ${(totalNeed + totalWant).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
 </div>

 {/* Need vs Want visualization */}
 <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm flex flex-col gap-5">
 <div className="flex justify-between items-center px-1">
 <div className="flex flex-col">
 <Text variant="label" as="span" className="text-zinc-400">Essential Needs</Text>
 <Text variant="metric" as="span" className="text-teal-600 dark:text-teal-400">${totalNeed.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
 </div>
 <div className="flex flex-col items-end">
 <Text variant="label" as="span" className="text-zinc-400">Discretionary Wants</Text>
 <Text variant="metric" as="span" className="text-rose-500 dark:text-rose-400">${totalWant.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
 </div>
 </div>
 <div className="w-full flex h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
 <div className="bg-teal-500 transition-all duration-1000 ease-out" style={{ width: `${(totalNeed / Math.max(totalNeed + totalWant, 1)) * 100}%`}} />
 <div className="bg-rose-500 transition-all duration-1000 ease-out" style={{ width: `${(totalWant / Math.max(totalNeed + totalWant, 1)) * 100}%`}} />
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
 {Object.entries(categoryTotals).sort((a,b) => b[1] - a[1]).map(([cat, total]) => (
 <div key={cat} className="flex flex-col p-4 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm hover:-translate-y-1 transition-transform duration-300">
 <span className="text-xs uppercase font-bold text-zinc-500 truncate">{cat}</span>
 <span className="text-xl font-bold text-teal-600 dark:text-teal-400">${total.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
 </div>
 ))}
 </div>
 </div>
 )}

  {/* Dynamic Pantry Calendar */}
  <div className="fade-in animate-in slide-in-from-bottom-4 duration-700 mb-14">
 <PantryCalendar 
 records={records} 
 onUpdateRecords={updateRecords} 
 viewingDate={viewingDate} 
 setViewingDate={setViewingDate} 
 />
 </div>

  {/* Monthly Grocery Plan */}
  <div className="fade-in animate-in slide-in-from-bottom-4 duration-700 delay-200 mb-14">
 <GroceryPlan records={records} viewingDate={viewingDate} />
 </div>

  {/* Price Intelligence Tracker */}
  <div className="fade-in animate-in slide-in-from-bottom-4 duration-700 delay-300 mb-14">
 <PriceIntelligence records={records} />
 </div>

  {/* Inventory Tracker (Auto-updating) */}
  <div className="fade-in animate-in slide-in-from-bottom-4 duration-700 delay-400 mb-14">
 <InventoryTracker records={records} />
 </div>

  {/* Smart Insights (AI-Powered) */}
  <div className="fade-in animate-in slide-in-from-bottom-4 duration-700 delay-500 mb-14">
 <SmartInsights records={records} viewingDate={viewingDate} />
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
