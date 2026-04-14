"use client";

import { type ExpenseRecord } from '@/types/finance';
import { MONTHS } from '@/lib/constants';


interface ExpenseMetricsProps {
  records: ExpenseRecord[];
  selectedMonths: number[];
  selectedYears: number[];
}

interface MetricProps {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  color: 'teal' | 'emerald' | 'amber' | 'indigo' | 'blue' | 'rose';
}

function MetricCard({ label, value, subValue, icon, color }: MetricProps) {
  const iconClasses = {
    teal: "bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-300",
    emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300",
    amber: "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300",
    indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300",
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300",
    rose: "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300",
  };

  return (
    <div className="flex flex-col p-6 rounded-2xl border border-rose-100 dark:border-rose-900/30 bg-rose-50/20 dark:bg-rose-500/5 shadow-sm transition-all group relative overflow-hidden h-full">
      <div className="flex items-center justify-between mb-6">
        <div className={`p-3.5 rounded-2xl transition-colors ${iconClasses[color]}`}>
          {icon}
        </div>
        {subValue && (
            <div className="flex flex-col items-end text-right">
                <span className="text-xs uppercase tracking-widest text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-1.5 rounded-xl">
                    {subValue}
                </span>
            </div>
        )}
      </div>
      
      <div className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 mb-1">
          {label}
        </span>
        <div className="flex flex-col">
          <span className="text-2xl tracking-tight text-zinc-900 dark:text-zinc-100 leading-none font-bold">
            {value}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ExpenseMetrics({ records, selectedMonths, selectedYears }: ExpenseMetricsProps) {
  const filteredRecords = records.filter(r => {
    const d = new Date(r.date);
    return selectedMonths.includes(d.getMonth()) && selectedYears.includes(d.getFullYear());
  });

  const totalExpenses = filteredRecords.reduce((sum, r) => sum + r.amount, 0);

  // Investment Percentage
  const investmentAmt = filteredRecords
    .filter(r => r.category === 'investment' || r.category === 'savings' || r.type === 'investment')
    .reduce((sum, r) => sum + r.amount, 0);
  const investmentPct = totalExpenses > 0 ? (investmentAmt / totalExpenses) * 100 : 0;

  // Expense Change (vs Previous Month)
  let changeStr = '0%';
  let changeColor: 'rose' | 'emerald' | 'amber' = 'rose';
  
  if (selectedMonths.length > 0 && selectedYears.length > 0) {
      const lastMonth = selectedMonths[0] === 0 ? 11 : selectedMonths[0] - 1;
      const lastYear = selectedMonths[0] === 0 ? selectedYears[0] - 1 : selectedYears[0];
      
      const prevRecords = records.filter(r => {
          const d = new Date(r.date);
          return d.getMonth() === lastMonth && d.getFullYear() === lastYear;
      });
      const prevTotal = prevRecords.reduce((sum, r) => sum + r.amount, 0);
      
      if (prevTotal > 0) {
          const change = ((totalExpenses - prevTotal) / prevTotal) * 100;
          changeStr = `${change > 0 ? '+' : ''}${change.toFixed(0)}%`;
          changeColor = change > 0 ? 'rose' : 'emerald';
      } else {
          changeStr = 'N/A';
          changeColor = 'rose';
      }
  }

  // Needs vs Wants %
  const needsAmt = filteredRecords.filter(r => r.type === 'need').reduce((sum, r) => sum + r.amount, 0);
  const wantsAmt = filteredRecords.filter(r => r.type === 'want').reduce((sum, r) => sum + r.amount, 0);
  const totalNeedsWants = needsAmt + wantsAmt;
  const needsPct = totalNeedsWants > 0 ? (needsAmt / totalNeedsWants) * 100 : 0;

  // Find Top Category
  const categoryTotals: Record<string, number> = {};
  filteredRecords.forEach(r => {
    categoryTotals[r.category] = (categoryTotals[r.category] || 0) + r.amount;
  });
  const topCategoryEntry = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
  const topCategoryStr = topCategoryEntry ? topCategoryEntry[0] : 'None';
  const topCategoryVal = topCategoryEntry ? topCategoryEntry[1] : 0;

  const selectionLabel = selectedMonths.length === 1 && selectedYears.length === 1 
    ? MONTHS[selectedMonths[0]] 
    : `${selectedMonths.length} Months`;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-6">
      <MetricCard 
        label="Total Expenses"
        value={`$${totalExpenses.toLocaleString('en-CA', { maximumFractionDigits: 0 })}`}
        subValue={selectionLabel}
        color="rose"
        icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 17h10m0 0V9m0 8l-8-8-4 4-6-6" /></svg>}
      />

      <MetricCard 
        label="Investment %"
        value={`${investmentPct.toFixed(1)}%`}
        subValue={`$${investmentAmt.toLocaleString('en-CA', { maximumFractionDigits: 0 })} Total`}
        color={investmentPct >= 20 ? "emerald" : investmentPct >= 10 ? "amber" : "rose"}
        icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
      />

      <MetricCard 
        label="Expense Change"
        value={changeStr}
        subValue="vs Last Month"
        color={changeColor}
        icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18" /></svg>}
      />

      <MetricCard 
        label="Needs vs Wants %"
        value={`${needsPct.toFixed(0)}% Needs`}
        subValue={`${(100 - needsPct).toFixed(0)}% Wants`}
        color="rose"
        icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V6a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
      />

      <MetricCard 
        label="Top Category"
        value={topCategoryStr.charAt(0).toUpperCase() + topCategoryStr.slice(1)}
        subValue={`$${topCategoryVal.toLocaleString('en-CA', { maximumFractionDigits: 0 })}`}
        color="rose"
        icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
      />
    </div>
  );
}
