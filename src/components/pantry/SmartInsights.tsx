"use client";

import React from 'react';
import { ExpenseRecord } from '@/types/finance';

interface SmartInsightsProps {
  records: ExpenseRecord[];
  viewingDate: Date;
}

interface InsightItem {
  text: string;
  trend?: string;
  emoji?: string;
}

interface InsightSection {
  category: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  items: InsightItem[];
}

export function SmartInsights({ records, viewingDate }: SmartInsightsProps) {
  const insights = React.useMemo(() => {
    const now = viewingDate;
    const currentMonth = now.getMonth();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const currentYear = now.getFullYear();
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - now.getDay());
    startOfThisWeek.setHours(0, 0, 0, 0);

    // 1. Grocery Insights logic
    const groceryRecords = records.filter(r => r.category === 'Grocery');
    const thisMonthGrocery = groceryRecords.filter(r => {
      if (!r.date) return false;
      const [rYear, rMonth] = r.date.split('-');
      return parseInt(rMonth) - 1 === currentMonth && parseInt(rYear) === currentYear;
    }).reduce((acc, r) => acc + r.amount, 0);

    const lastMonthGrocery = groceryRecords.filter(r => {
      if (!r.date) return false;
      const [rYear, rMonth] = r.date.split('-');
      return parseInt(rMonth) - 1 === lastMonth && parseInt(rYear) === lastMonthYear;
    }).reduce((acc, r) => acc + r.amount, 0);

    const groceryDiff = lastMonthGrocery > 0 ? ((thisMonthGrocery - lastMonthGrocery) / lastMonthGrocery) * 100 : 0;
    
    // Price tracking for Milk/Eggs
    const milkPrices: {date: string, price: number}[] = [];
    records.forEach(r => {
      r.items?.forEach(i => {
        if (i.name.toLowerCase().includes('milk')) milkPrices.push({ date: r.date, price: i.unitPrice });
      });
    });
    milkPrices.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const isMilkRising = milkPrices.length >= 2 && milkPrices[milkPrices.length - 1].price > milkPrices[0].price;

    // 2. Spending Behavior logic
    const diningRecords = records.filter(r => r.category === 'Dining');
    const thisWeekDining = diningRecords.filter(r => new Date(r.date) >= startOfThisWeek).reduce((acc, r) => acc + r.amount, 0);
    const avgWeeklyDining = diningRecords.length > 0 ? (diningRecords.reduce((acc, r) => acc + r.amount, 0) / (records.length / 7 || 1)) : 0;

    const clothingRecords = records.filter(r => r.category === 'Clothing');
    const thisMonthClothing = clothingRecords.filter(r => {
      if (!r.date) return false;
      const [rYear, rMonth] = r.date.split('-');
      return parseInt(rMonth) - 1 === currentMonth && parseInt(rYear) === currentYear;
    }).reduce((acc, r) => acc + r.amount, 0);

    // 3. Habit Insights logic
    const milkDates = milkPrices.map(p => new Date(p.date).getTime());
    let avgMilkGap = 0;
    if (milkDates.length >= 2) {
      const gaps = [];
      for (let i = 1; i < milkDates.length; i++) {
        gaps.push((milkDates[i] - milkDates[i-1]) / (1000 * 60 * 60 * 24));
      }
      avgMilkGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    }

    const impulseCount = records.filter(r => r.type === 'want' && new Date(r.date) >= startOfThisWeek).length;

    // 4. Optimization Insights logic
    const vendorPrices: Record<string, {vendor: string, price: number, date: string}[]> = {};
    records.forEach(r => {
      if (!r.vendor) return;
      r.items?.forEach(i => {
        const name = i.name.toLowerCase();
        if (!vendorPrices[name]) vendorPrices[name] = [];
        vendorPrices[name].push({ vendor: r.vendor || 'Unknown', price: i.unitPrice, date: r.date });
      });
    });

    let bestVendor = "";
    let potentialSavings = 0;
    
    // Find biggest price gap for the same item between vendors
    for (const [itemName, prices] of Object.entries(vendorPrices)) {
      if (prices.length >= 2) {
        const sorted = [...prices].sort((a, b) => a.price - b.price);
        const cheapest = sorted[0];
        const mostExpensive = sorted[sorted.length - 1];
        if (cheapest.vendor !== mostExpensive.vendor && mostExpensive.price > cheapest.price) {
          const diff = mostExpensive.price - cheapest.price;
          if (diff > potentialSavings) {
             potentialSavings = diff;
             bestVendor = cheapest.vendor;
          }
        }
      }
    }

    // Build the dynamic insight sections
    const sections: InsightSection[] = [];
    
    // Grocery insights
    const groceryItems: InsightItem[] = [];
    if (lastMonthGrocery > 0 && Math.abs(groceryDiff) >= 5) {
       groceryItems.push({ 
         text: groceryDiff > 0 
           ? `“You spent ${Math.abs(Math.round(groceryDiff))}% more on groceries this month vs last month”` 
           : `“You saved ${Math.abs(Math.round(groceryDiff))}% on groceries vs last month”`, 
         trend: groceryDiff > 0 ? "up" : "down" 
       });
    }
    if (milkPrices.length >= 2) {
       const first = milkPrices[0].price;
       const last = milkPrices[milkPrices.length - 1].price;
       if (last > first) {
           groceryItems.push({ text: "“Price rising for milk observed in recent bills”", trend: "warning" });
       } else if (last < first) {
           groceryItems.push({ text: "“Price dropped for milk in recent bills”", trend: "down" });
       }
    }
    
    if (groceryItems.length > 0) {
       sections.push({
          category: "Grocery Insights",
          icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
          color: "text-emerald-500", bgColor: "bg-emerald-50 dark:bg-emerald-500/10", borderColor: "border-emerald-100 dark:border-emerald-500/20",
          items: groceryItems
       });
    }

    // Spending Behavior
    const behaviorItems: InsightItem[] = [];
    if (thisWeekDining > avgWeeklyDining * 1.3 && avgWeeklyDining > 0) {
      behaviorItems.push({ text: "“You spent significantly more on eating out this week than your average”", emoji: "🔹" });
    }
    if (thisMonthClothing > 0) {
      behaviorItems.push({ text: `“Clothing spend tracked at $${thisMonthClothing.toFixed(0)} this month”`, emoji: "🔹" });
    }
    
    if (behaviorItems.length > 0) {
       sections.push({
          category: "Spending Behavior",
          icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
          color: "text-blue-500", bgColor: "bg-blue-50 dark:bg-blue-500/10", borderColor: "border-blue-100 dark:border-blue-500/20",
          items: behaviorItems
       });
    }

    // Habit Insights
    const habitItems: InsightItem[] = [];
    if (avgMilkGap > 0) {
       habitItems.push({ text: `“You buy milk every ${Math.round(avgMilkGap)} days (consistent run rate)”`, emoji: "🔹" });
    }
    if (impulseCount > 2) {
       habitItems.push({ text: `“${impulseCount} impulse purchases identified this week”`, emoji: "🔹" });
    }
    
    if (habitItems.length > 0) {
       sections.push({
          category: "Habit Insights",
          icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
          color: "text-purple-500", bgColor: "bg-purple-50 dark:bg-purple-500/10", borderColor: "border-purple-100 dark:border-purple-500/20",
          items: habitItems
       });
    }

    // Optimization Insights
    const optItems: InsightItem[] = [];
    if (potentialSavings > 0 && bestVendor) {
       optItems.push({ text: `“Buying from ${bestVendor} could save ~$${potentialSavings.toFixed(1)} based on recent comparisons”`, emoji: "🔹" });
    }
    
    if (optItems.length > 0) {
       sections.push({
          category: "Optimization Insights",
          icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
          color: "text-amber-500", bgColor: "bg-amber-50 dark:bg-amber-500/10", borderColor: "border-amber-100 dark:border-amber-500/20",
          items: optItems
       });
    }

    return sections;
  }, [records, viewingDate]) as InsightSection[];

  if (!insights || insights.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-700 delay-500">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-zinc-900 dark:bg-white flex items-center justify-center text-white dark:text-zinc-900 shadow-lg">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.674a1 1 0 00.922-.606l.333-.833H8.408l.333.833a1 1 0 00.922.606zM10 5V3.5a1.5 1.5 0 10-3 0V5a5 5 0 0110 0v1.5a1.5 1.5 0 10-3 0V5a2 2 0 11-4 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11V15M12 7H12.01" />
            </svg>
          </div>
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold uppercase tracking-[0.2em] text-zinc-900 dark:text-zinc-100">Smart Insights</h2>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">AI-Powered Optimization & Personal Spending Intelligence</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {insights.map((section, idx) => (
          <div 
            key={idx} 
            className={`group relative p-6 bg-white dark:bg-zinc-900 border ${section.borderColor} rounded-[32px] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col gap-5`}
          >
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${section.bgColor} ${section.color}`}>
                {section.icon}
              </div>
              <h3 className="font-bold text-sm uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                {section.category}
              </h3>
            </div>

            {/* Content Items */}
            <div className="flex flex-col gap-4">
              {section.items.map((item, iIdx) => (
                <div key={iIdx} className="flex items-start gap-3 group/item">
                  <span className="mt-1 text-xs shrink-0 select-none text-zinc-500 group-hover/item:text-zinc-700 dark:group-hover/item:text-zinc-300 transition-colors">
                    {item.emoji || "•"}
                  </span>
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300 leading-relaxed group-hover/item:text-zinc-900 dark:group-hover/item:text-zinc-100 transition-colors">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>

            {/* Subtle Gradient Decor */}
            <div className={`absolute bottom-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none ${section.bgColor}`} />
          </div>
        ))}
      </div>

      {/* Action Footer */}
      <div className="flex flex-col md:flex-row items-center justify-between p-6 bg-zinc-50 dark:bg-zinc-950/30 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 gap-4 mt-2">
         <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Insights are calculated daily based on your transaction history.</p>
         </div>
         <button className="px-5 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-900 hover:text-white dark:hover:bg-white dark:hover:text-zinc-900 transition-all shadow-sm">
            Recalculate Now
         </button>
      </div>
    </div>
  );
}
