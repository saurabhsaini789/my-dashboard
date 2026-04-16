"use client";

import React, { useState, useEffect } from 'react';
import { FinanceOverview } from '@/components/finances/FinanceOverview';
import { SavingsTargets } from '@/components/finances/SavingsTargets';
import { IncomeSection } from '@/components/finances/IncomeSection';
import { ExpenseSection } from '@/components/finances/ExpenseSection';
import { EmergencyFundSection } from '@/components/finances/EmergencyFundSection';
import { AssetsSection } from '@/components/finances/AssetsSection';
import { LiabilitiesSection } from '@/components/finances/LiabilitiesSection';
import { PageTitle, Text, Description } from '@/components/ui/Text';


export default function FinancesPage() {
 const [mounted, setMounted] = useState(false);

 useEffect(() => {
 setMounted(true);
 }, []);

 if (!mounted) return null;

 return (
 <main className="min-h-screen bg-[#fcfcfc] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-teal-500/10 p-4 md:p-8 xl:p-12 relative overflow-hidden">
 <div className="mx-auto w-full max-w-7xl relative z-10">

  {/* Page Title */}
  <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
    <div className="flex flex-col items-start">
      <PageTitle>Finances</PageTitle>
      <Description>Track your wealth, income, expenses, and savings targets.</Description>
    </div>
  </header>

  {/* Finance Overview Grid */}
  <div className="fade-in mb-14" style={{ animationDelay: '0.2s' }}>
  <FinanceOverview />
  </div>

  {/* Savings Targets Section */}
  <div className="fade-in mb-14" style={{ animationDelay: '0.4s' }}>
  <SavingsTargets />
  </div>

  {/* Income Section */}
  <div className="fade-in mb-14" style={{ animationDelay: '0.6s' }}>
  <IncomeSection />
  </div>

  {/* Expenses Section */}
  <div className="fade-in mb-14" style={{ animationDelay: '0.8s' }}>
  <ExpenseSection />
  </div>

  {/* Emergency Fund Section */}
  <div className="fade-in mb-14" style={{ animationDelay: '1.0s' }}>
  <EmergencyFundSection />
  </div>

  {/* Assets Section */}
  <div className="fade-in mb-14" style={{ animationDelay: '1.2s' }}>
  <AssetsSection />
  </div>

  {/* Liabilities Section */}
  <div className="fade-in mb-14" style={{ animationDelay: '1.4s' }}>
  <LiabilitiesSection />
  </div>



 </div>
 </main>
 );
}
