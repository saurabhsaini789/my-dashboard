"use client";

import React, { useState, useEffect } from 'react';
import { FinanceOverview } from '@/components/finances/FinanceOverview';
import { SavingsTargets } from '@/components/finances/SavingsTargets';
import { IncomeSection } from '@/components/finances/IncomeSection';
import { ExpenseSection } from '@/components/finances/ExpenseSection';
import { EmergencyFundSection } from '@/components/finances/EmergencyFundSection';
import { AssetsSection } from '@/components/finances/AssetsSection';
import { LiabilitiesSection } from '@/components/finances/LiabilitiesSection';
import { ExchangeRateSection } from '@/components/finances/ExchangeRateSection';

export default function FinancesPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-[#fcfcfc] text-zinc-900 selection:bg-teal-500/10 p-6 md:p-10 lg:p-12 relative overflow-hidden">
      <div className="mx-auto w-full max-w-7xl flex flex-col gap-8 md:gap-10 pt-4 relative z-10">

        {/* Page Title & Strategic Description */}
        <div className="flex flex-col gap-6 items-center">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-zinc-900 text-center uppercase tracking-[0.3em] fade-in drop-shadow-sm leading-tight">
            Finances
          </h1>
        </div>

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

        {/* New Exchange Rate Section at the bottom */}
        <div className="fade-in" style={{ animationDelay: '1.6s' }}>
          <ExchangeRateSection />
        </div>

      </div>
    </main>
  );
}
