"use client";

import { type IncomeRecord } from '@/lib/finances';
import { MONTHS } from '@/lib/constants';
import { getExchangeRate, convertToINR } from '@/lib/finances';

interface IncomeMetricsProps {
  records: IncomeRecord[];
  selectedMonths: number[];
  selectedYears: number[];
}

interface MetricProps {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  color: 'teal' | 'emerald' | 'amber' | 'indigo' | 'blue';
}

function MetricCard({ label, value, subValue, icon, color }: MetricProps) {
  const iconClasses = {
    teal: "bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-300",
    emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300",
    amber: "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300",
    indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300",
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300",
  };

  return (
    <div className="flex flex-col p-6 rounded-3xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/20 dark:bg-emerald-500/5 transition-all hover:shadow-xl hover:shadow-zinc-200/50 dark:hover:shadow-none hover:-translate-y-1 group relative overflow-hidden h-full">
      <div className="flex items-center justify-between mb-6">
        <div className={`p-3.5 rounded-2xl transition-colors ${iconClasses[color]}`}>
          {icon}
        </div>
        {subValue && (
            <div className="flex flex-col items-end">
                <span className="text-xs uppercase tracking-widest text-zinc-600 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-1.5 rounded-xl text-right">
                    {subValue}
                </span>
            </div>
        )}
      </div>
      
      <div className="flex flex-col">
        <span className="text-xs uppercase tracking-[0.2em] text-zinc-600 mb-2">
          {label}
        </span>
        <span className="text-2xl tracking-tight text-zinc-900 dark:text-zinc-100 leading-none">
          {value}
        </span>
      </div>
    </div>
  );
}

export function IncomeMetrics({ records, selectedMonths, selectedYears }: IncomeMetricsProps) {
  const exchangeRate = getExchangeRate();

  const filteredRecords = records.filter(r => {
    const d = new Date(r.date);
    return selectedMonths.includes(d.getMonth()) && selectedYears.includes(d.getFullYear());
  });

  // Calculate totals in INR (Base Currency)
  const totalIncome = filteredRecords.reduce((sum, r) => sum + convertToINR(r.amount, r.currency, exchangeRate), 0);

  const typeTotals = {
    active: filteredRecords.filter(r => r.type === 'active').reduce((sum, r) => sum + convertToINR(r.amount, r.currency, exchangeRate), 0),
    passive: filteredRecords.filter(r => r.type === 'passive').reduce((sum, r) => sum + convertToINR(r.amount, r.currency, exchangeRate), 0),
    'one time': filteredRecords.filter(r => r.type === 'one time').reduce((sum, r) => sum + convertToINR(r.amount, r.currency, exchangeRate), 0),
  };

  const activePct = totalIncome > 0 ? (typeTotals.active / totalIncome) * 100 : 0;
  const passivePct = totalIncome > 0 ? (typeTotals.passive / totalIncome) * 100 : 0;
  const oneTimePct = totalIncome > 0 ? (typeTotals['one time'] / totalIncome) * 100 : 0;

  // Find Top Source
  const sourceTotals: Record<string, number> = {};
  filteredRecords.forEach(r => {
    const amountInINR = convertToINR(r.amount, r.currency, exchangeRate);
    sourceTotals[r.source] = (sourceTotals[r.source] || 0) + amountInINR;
  });
  const topSourceEntry = Object.entries(sourceTotals).sort((a, b) => b[1] - a[1])[0];
  const topSourceStr = topSourceEntry ? `${topSourceEntry[0]}` : 'None';
  const topSourceVal = topSourceEntry ? topSourceEntry[1] : 0;

  const selectionLabel = selectedMonths.length === 1 && selectedYears.length === 1 ? MONTHS[selectedMonths[0]] : `${selectedMonths.length} Months`;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
      <MetricCard 
        label="Total Income"
        value={`₹${totalIncome.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
        subValue={selectionLabel}
        color="emerald"
        icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3 1.343 3 3-1.343 3-3 3m0-12c-1.657 0-3-1.343-3-3s1.343-3 3-3 3 1.343 3 3-1.343 3-3 3m0 12v1m0-18v1" /></svg>}
      />

      <MetricCard 
        label="Active Income"
        value={`₹${typeTotals.active.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
        subValue={`${activePct.toFixed(0)}% Total`}
        color="emerald"
        icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
      />

      <MetricCard 
        label="Passive Income"
        value={`₹${typeTotals.passive.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
        subValue={`${passivePct.toFixed(0)}% Total`}
        color="emerald"
        icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
      />

      <MetricCard 
        label="One-Time"
        value={`₹${typeTotals['one time'].toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
        subValue={`${oneTimePct.toFixed(0)}% Total`}
        color="emerald"
        icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
      />

      <MetricCard 
        label="Top Source"
        value={topSourceStr.charAt(0).toUpperCase() + topSourceStr.slice(1)}
        subValue={`₹${topSourceVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
        color="emerald"
        icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
      />
    </div>
  );
}
