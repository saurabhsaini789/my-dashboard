"use client";

import React, { useState, useEffect } from 'react';
import { getPrefixedKey } from '@/lib/keys';
import { MultiSelectDropdown } from '../ui/MultiSelectDropdown';
import { MONTHS, YEARS } from '@/lib/constants';
import { getExchangeRate, convertToINR, convertToCAD, calculateAssetBalance, calculateLiabilityBalance, type Asset, type Liability } from '@/lib/finances';
import { SYNC_KEYS } from '@/lib/sync-keys';

interface MetricProps {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  color: 'teal' | 'emerald' | 'rose' | 'amber' | 'indigo' | 'blue';
  customBg?: string;
  cadValue?: string;
}

function MetricCard({ label, value, cadValue, subValue, icon, color, customBg }: MetricProps) {
  const iconClasses = {
    teal: "bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-300",
    emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-teal-300",
    rose: "bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300",
    amber: "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300",
    indigo: "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300",
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300",
  };

  const borderClasses = {
    teal: "border-teal-100 dark:border-teal-900/30",
    emerald: "border-emerald-100 dark:border-emerald-900/30",
    rose: "border-rose-100 dark:border-rose-900/30",
    amber: "border-amber-100 dark:border-amber-900/30",
    indigo: "border-indigo-100 dark:border-indigo-900/30",
    blue: "border-blue-100 dark:border-blue-900/30",
  };

  return (
    <div className={`flex flex-col p-6 rounded-3xl border transition-all hover:shadow-xl hover:shadow-zinc-200/50 dark:hover:shadow-none hover:-translate-y-1 group relative overflow-hidden h-full ${customBg || `bg-white dark:bg-zinc-900 ${borderClasses[color]}`}`}>
      <div className="flex items-center justify-between mb-6">
        <div className={`p-3.5 rounded-2xl transition-colors ${iconClasses[color]}`}>
          {icon}
        </div>
        {subValue && (
            <div className="flex flex-col items-end">
                <span className="text-xs uppercase tracking-widest text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-1.5 rounded-xl text-right">
                    {subValue}
                </span>
            </div>
        )}
      </div>
      
      <div className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-400 mb-1">
          {label}
        </span>
        <div className="flex flex-col">
          <span className={`text-2xl tracking-tight text-zinc-900 dark:text-zinc-100 leading-none font-bold`}>
            {value}
          </span>
          {cadValue && (
            <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider mt-1">
              ({cadValue})
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface EmergencyFundData {
  targetAmount: number;
  monthlyExpenses: number;
  contributions: { id: string; amount: number; currency?: 'INR' | 'CAD' }[];
}

export function FinanceOverview() {
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [netWorth, setNetWorth] = useState(0);
  const [emergencyFundMonths, setEmergencyFundMonths] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // Filter states
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]); // Initialize empty for SSR
  const [selectedYears, setSelectedYears] = useState<number[]>([]);

  const calculateFinance = () => {
    const exchangeRate = getExchangeRate();

    // 1. Calculate Income
    const incomeData = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_INCOME));
    let totalIncomeCount = 0;
    if (incomeData) {
      try {
        const records = JSON.parse(incomeData);
        totalIncomeCount = records
          .filter((r: any) => {
            const d = new Date(r.date);
            return selectedMonths.includes(d.getMonth()) && selectedYears.includes(d.getFullYear());
          })
          .reduce((sum: number, r: any) => sum + convertToINR(r.amount, r.currency, exchangeRate), 0);
      } catch (e) { }
    }
    setIncome(totalIncomeCount);

    // 2. Calculate Expenses
    const expenseData = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_EXPENSES));
    let totalExpensesCount = 0;
    if (expenseData) {
      try {
        const records = JSON.parse(expenseData);
        totalExpensesCount = records
          .filter((r: any) => {
            const d = new Date(r.date);
            return selectedMonths.includes(d.getMonth()) && selectedYears.includes(d.getFullYear());
          })
          .reduce((sum: number, r: any) => sum + convertToINR(r.amount, r.currency, exchangeRate), 0);
      } catch (e) { }
    }
    setExpenses(totalExpensesCount);

    // 3. Calculate Net Worth
    let totalAssets = 0;
    const assetsData = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_ASSETS));
    if (assetsData) {
        try {
            const assets: Asset[] = JSON.parse(assetsData);
            totalAssets = assets.reduce((sum, a) => sum + calculateAssetBalance(a), 0);
        } catch (e) {}
    }

    let totalLiabilities = 0;
    const liabilitiesData = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_LIABILITIES));
    if (liabilitiesData) {
        try {
            const liabilities: Liability[] = JSON.parse(liabilitiesData);
            totalLiabilities = liabilities.reduce((sum, l) => sum + calculateLiabilityBalance(l), 0);
        } catch (e) {}
    }
    setNetWorth(totalAssets - totalLiabilities);

    // 4. Calculate Emergency Fund
    const efData = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_EMERGENCY_FUND));
    let monthsCovered = 0;
    if (efData) {
        try {
            const data: EmergencyFundData = JSON.parse(efData);
            const totalSaved = data.contributions.reduce((sum, c) => sum + convertToINR(c.amount, c.currency, exchangeRate), 0);
            monthsCovered = data.monthlyExpenses > 0 ? totalSaved / data.monthlyExpenses : 0;
        } catch (e) {}
    }
    setEmergencyFundMonths(monthsCovered);
  };

  useEffect(() => {
    setSelectedMonths([new Date().getMonth()]);
    setSelectedYears([new Date().getFullYear()]);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      calculateFinance();
    }
    
    const handleLocal = (e: any) => {
      if (e.detail && [
        SYNC_KEYS.FINANCES_INCOME, 
        SYNC_KEYS.FINANCES_EXPENSES, 
        SYNC_KEYS.FINANCES_ASSETS, 
        SYNC_KEYS.FINANCES_LIABILITIES, 
        SYNC_KEYS.FINANCES_EMERGENCY_FUND,
        SYNC_KEYS.FINANCES_EXCHANGE_RATE
      ].includes(e.detail.key)) {
        calculateFinance();
      }
    };

    window.addEventListener('local-storage-change', handleLocal);
    return () => window.removeEventListener('local-storage-change', handleLocal);
  }, [selectedMonths, selectedYears, isLoaded]);


  if (!isLoaded) return null;

  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

  return (
    <div className="w-full flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
          Overview
        </h2>

        <div className="flex gap-3">
          <MultiSelectDropdown
            label="Month"
            options={MONTHS}
            selected={selectedMonths}
            onChange={setSelectedMonths}
          />
          <MultiSelectDropdown
            label="Year"
            options={YEARS}
            selected={selectedYears}
            onChange={setSelectedYears}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        <MetricCard 
          label="Net Worth"
          value={`₹${netWorth.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          cadValue={`CAD $${convertToCAD(netWorth).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          subValue={netWorth >= 0 ? "Positive Equity" : "Negative Equity"}
          color={netWorth >= 0 ? "emerald" : "rose"}
          customBg={netWorth >= 0 
            ? "bg-emerald-50/30 dark:bg-emerald-500/5 border-emerald-100/50 dark:border-emerald-900/30" 
            : "bg-rose-50/30 dark:bg-rose-500/5 border-rose-100/50 dark:border-rose-900/30"
          }
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor font-bold">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3 1.343 3 3-1.343 3-3 3m0-12c-1.657 0-3-1.343-3-3s1.343-3 3-3 3 1.343 3 3-1.343 3-3 3m0 12v1m0-18v1" />
            </svg>
          }
        />

        <MetricCard 
          label="Emergency Fund"
          value={`${emergencyFundMonths < 10 ? emergencyFundMonths.toFixed(1) : Math.floor(emergencyFundMonths)} Months`}
          cadValue={`CAD $${convertToCAD(emergencyFundMonths * (expenses || 0)).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          subValue={emergencyFundMonths >= 6 ? "Fully Funded" : emergencyFundMonths >= 3 ? "On Track" : "Focus Needed"}
          color={emergencyFundMonths >= 6 ? "emerald" : emergencyFundMonths >= 3 ? "amber" : "rose"}
          customBg={emergencyFundMonths >= 6 
            ? "bg-emerald-50/30 dark:bg-emerald-500/5 border-emerald-100/50 dark:border-emerald-900/30"
            : emergencyFundMonths >= 3
            ? "bg-amber-50/30 dark:bg-amber-500/5 border-amber-100/50 dark:border-amber-900/30"
            : "bg-rose-50/30 dark:bg-rose-500/5 border-rose-100/50 dark:border-rose-900/30"
          }
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />

        <MetricCard
          label="Monthly Income"
          value={`₹${income.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          cadValue={`CAD $${convertToCAD(income).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          subValue={selectedMonths.length === 1 && selectedYears.length === 1 ? MONTHS[selectedMonths[0]] : `${selectedMonths.length} Months`}
          color="emerald"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          }
        />

        <MetricCard
          label="Monthly Expenses"
          value={`₹${expenses.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          cadValue={`CAD $${convertToCAD(expenses).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          subValue={`${income > 0 ? ((expenses / income) * 100).toFixed(0) : 0}% of Income`}
          color="rose"
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
            </svg>
          }
        />

        <MetricCard
          label="Savings Rate"
          value={`${savingsRate.toFixed(1)}%`}
          subValue="Goal: 20%"
          color={savingsRate >= 20 ? "emerald" : savingsRate >= 10 ? "amber" : "rose"}
          customBg={savingsRate >= 20
            ? "bg-emerald-50/30 dark:bg-emerald-500/5 border-emerald-100/50 dark:border-emerald-900/30"
            : savingsRate >= 10
            ? "bg-amber-50/30 dark:bg-amber-500/5 border-amber-100/50 dark:border-amber-900/30"
            : "bg-rose-50/30 dark:bg-rose-500/5 border-rose-100/50 dark:border-rose-900/30"
          }
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>
    </div>
  );
}
