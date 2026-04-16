"use client";

import React, { useState, useEffect } from 'react';
import { FinanceOverview } from '@/components/finances/FinanceOverview';
import { SavingsTargets } from '@/components/finances/SavingsTargets';
import { IncomeSection } from '@/components/finances/IncomeSection';
import { ExpenseSection } from '@/components/finances/ExpenseSection';
import { EmergencyFundSection } from '@/components/finances/EmergencyFundSection';
import { AssetsSection } from '@/components/finances/AssetsSection';
import { LiabilitiesSection } from '@/components/finances/LiabilitiesSection';


export default function FinancesPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-[#fcfcfc] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-teal-500/10 p-4 md:p-8 xl:p-12 relative overflow-hidden">
      <div className="mx-auto w-full max-w-7xl flex flex-col gap-6 md:gap-10 relative z-10">

        {/* Page Title */}
        <header className="flex flex-col items-start mb-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Finances
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
            Track your wealth, income, expenses, and savings targets.
          </p>
        </header>

        {/* Finance Overview Grid */}
        <div className="fade-in" style={{ animationDelay: '0.2s' }}>
          <FinanceOverview />
        </div>

        {/* Savings Targets Section */}
        <div className="fade-in" style={{ animationDelay: '0.4s' }}>
          <SavingsTargets />
        </div>

        {/* Income Section */}
        <div className="fade-in" style={{ animationDelay: '0.6s' }}>
          <IncomeSection />
        </div>

        {/* Expenses Section */}
        <div className="fade-in" style={{ animationDelay: '0.8s' }}>
          <ExpenseSection />
        </div>

        {/* Emergency Fund Section */}
        <div className="fade-in" style={{ animationDelay: '1.0s' }}>
          <EmergencyFundSection />
        </div>

        {/* Assets Section */}
        <div className="fade-in" style={{ animationDelay: '1.2s' }}>
          <AssetsSection />
        </div>

        {/* Liabilities Section */}
        <div className="fade-in" style={{ animationDelay: '1.4s' }}>
          <LiabilitiesSection />
        </div>



      </div>
    </main>
  );
}
