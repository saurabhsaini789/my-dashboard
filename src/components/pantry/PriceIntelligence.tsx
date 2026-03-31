"use client";

import React, { useMemo, useState } from 'react';
import { ExpenseRecord, ExpenseItem } from '@/types/finance';
import { convertToCAD } from '@/lib/finances';

interface PriceIntelligenceProps {
  records: ExpenseRecord[];
}

interface PriceInstance {
  price: number;
  date: string;
  vendor: string;
}

interface SmartInsight {
  text: string;
  type: 'positive' | 'negative' | 'neutral';
}

interface ItemStats {
  name: string;
  currency: 'INR' | 'CAD';
  history: PriceInstance[];
  averagePrice: number;
  lowestPrice: PriceInstance;
  lastPurchase: PriceInstance;
  priceTrend: number; // percentage change vs average
  smartInsights: SmartInsight[];
}

export function PriceIntelligence({ records }: PriceIntelligenceProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const itemStats: ItemStats[] = useMemo(() => {
    const map: Record<string, {
      name: string;
      currency: 'INR' | 'CAD';
      history: PriceInstance[];
    }> = {};

    records.forEach(record => {
      // Include category Grocery or any record that has itemized bills (since they could be pantry-related)
      const isApplicable = record.category === 'Grocery' || (record.items && record.items.length > 0);
      if (!isApplicable) return;

      const currency = record.currency || 'CAD';
      const vendor = record.vendor || 'Unknown Store';
      
      if (record.items && record.items.length > 0) {
        record.items.forEach(item => {
          const name = item.name.trim();
          if (!name) return;
          const price = item.unitPrice > 0 ? item.unitPrice : (item.totalPrice / (parseFloat(item.quantity) || 1));
          if (price <= 0) return; // ignore invalid prices

          const key = `${name.toLowerCase()}_${currency}`;
          if (!map[key]) {
            map[key] = { name, currency, history: [] };
          }
          map[key].history.push({ price, date: record.date, vendor });
        });
      } else {
        // top level fallback if no items array but categorized as grocery
        const name = (record.subcategory || record.category).trim();
        if (!name) return;
        const qty = parseFloat(record.quantity || '1') || 1;
        const price = record.amount / qty;
        if (price <= 0) return;

        const key = `${name.toLowerCase()}_${currency}`;
        if (!map[key]) {
            map[key] = { name, currency, history: [] };
        }
        map[key].history.push({ price, date: record.date, vendor });
      }
    });

    const stats: ItemStats[] = [];
    Object.values(map).forEach(group => {
      // only items with valid purchase history
      if (group.history.length === 0) return;
      
      // sort history by ascending date
      group.history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      const count = group.history.length;
      const sum = group.history.reduce((a, b) => a + b.price, 0);
      const averagePrice = sum / count;
      
      const lastPurchase = group.history[count - 1];
      
      let lowestPrice = group.history[0];
      group.history.forEach(h => {
        if (h.price < lowestPrice.price) lowestPrice = h;
      });
      
      const priceTrend = ((lastPurchase.price - averagePrice) / averagePrice) * 100;
      
      const insights: SmartInsight[] = [];
      
      // Insight 1: Compare to immediately previous purchase
      if (count > 1) {
         const previousPurchase = group.history[count - 2];
         const change = ((lastPurchase.price - previousPurchase.price) / previousPurchase.price) * 100;
         if (change > 5) {
           insights.push({ text: `${Math.round(change)}% more expensive than last time`, type: 'negative' });
         } else if (change < -5) {
           insights.push({ text: `${Math.round(Math.abs(change))}% cheaper than last time`, type: 'positive' });
         }
      }
      
      // Insight 2: Store comparison
      const storeMap: Record<string, {sum: number, count: number}> = {};
      group.history.forEach(h => {
        if (!storeMap[h.vendor]) storeMap[h.vendor] = {sum: 0, count: 0};
        storeMap[h.vendor].sum += h.price;
        storeMap[h.vendor].count += 1;
      });
      
      const storeAvgs = Object.entries(storeMap).map(([s, data]) => ({ store: s, avg: data.sum / data.count }));
      if (storeAvgs.length > 1) {
         storeAvgs.sort((a, b) => a.avg - b.avg);
         const cheapest = storeAvgs[0];
         const mostExpensive = storeAvgs[storeAvgs.length - 1];
         // if > 10% diff
         if ((mostExpensive.avg - cheapest.avg) / cheapest.avg > 0.1 && cheapest.store !== 'Unknown Store') {
           const vs = mostExpensive.store === 'Unknown Store' ? 'others' : mostExpensive.store;
           insights.push({ text: `${cheapest.store} averages cheaper than ${vs}`, type: 'positive' });
         }
      }
      
      // Insight 3: Good Deal / Expensive Flags
      if (lastPurchase.price <= lowestPrice.price * 1.05 && count > 1) {
        insights.push({ text: '🔥 Good Deal', type: 'positive' });
      } else if (lastPurchase.price >= averagePrice * 1.15 && count > 1) {
        insights.push({ text: '⚠️ Expensive', type: 'negative' });
      }
      
      stats.push({
        ...group,
        averagePrice,
        lowestPrice,
        lastPurchase,
        priceTrend,
        smartInsights: insights
      });
    });

    // Sort by items with the highest frequency of purchase, then alphabetically
    return stats.sort((a, b) => {
      if (b.history.length !== a.history.length) {
         return b.history.length - a.history.length;
      }
      return a.name.localeCompare(b.name);
    });
  }, [records]);

  const filteredStats = useMemo(() => {
    if (!searchTerm) return itemStats;
    const lower = searchTerm.toLowerCase();
    return itemStats.filter(s => s.name.toLowerCase().includes(lower));
  }, [itemStats, searchTerm]);

  const renderSparkline = (history: PriceInstance[], trend: number) => {
    if (history.length < 2) return null;
    const minP = Math.min(...history.map(h => h.price));
    const maxP = Math.max(...history.map(h => h.price));
    const range = maxP - minP || 1;
    
    // SVG config
    const width = 100;
    const height = 30;
    const padding = 4; // keep line inside bounding box
    
    const usableWidth = width - padding * 2;
    const usableHeight = height - padding * 2;

    const points = history.map((h, i) => {
      const x = padding + (i / (history.length - 1)) * usableWidth;
      const y = padding + (usableHeight - ((h.price - minP) / range) * usableHeight);
      return `${x},${y}`;
    }).join(' ');

    const isUp = trend > 2;
    const isDown = trend < -2;
    const strokeColor = isUp ? 'text-rose-400' : isDown ? 'text-teal-400' : 'text-zinc-400';
    const fillColor = isUp ? 'fill-rose-500' : isDown ? 'fill-teal-500' : 'fill-zinc-400';

    return (
      <div className="w-24 h-8">
         <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible drop-shadow-sm">
           <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`${strokeColor} opacity-60`} />
           <circle cx={padding + usableWidth} cy={padding + (usableHeight - ((history[history.length-1].price - minP)/range)*usableHeight)} r="3" className={`${fillColor}`} />
         </svg>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-700 delay-300">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-6 md:p-8 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[40px] shadow-xl relative overflow-hidden">
         <div className="absolute top-0 left-0 w-64 h-64 bg-amber-500/10 dark:bg-amber-500/5 rounded-full blur-3xl -ml-10 -mt-20 pointer-events-none" />
         
         <div className="flex flex-col gap-2 relative z-10">
            <h2 className="text-2xl font-bold uppercase tracking-[0.2em] text-zinc-900 dark:text-white">Price Intelligence</h2>
            <p className="text-sm text-zinc-500 font-medium max-w-md">Track historical pricing, store comparisons, and pinpoint the best local deals intelligently based on entered bills and data.</p>
         </div>

         <div className="relative z-10 w-full md:w-auto">
            <div className="relative">
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input 
                type="text" 
                placeholder="Search items..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full md:w-64 pl-9 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-medium"
              />
            </div>
         </div>
      </div>

      {/* Grid of Intel Cards */}
      {filteredStats.length === 0 ? (
        <div className="text-center p-12 bg-white/50 dark:bg-zinc-900/50 rounded-[40px] border border-dashed border-zinc-300 dark:border-zinc-700">
           <p className="text-zinc-500 font-medium">{itemStats.length === 0 ? "No grocery items logged yet. Add items in Quick Entry or detailed bills." : "No items found matching your search."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredStats.map(stat => (
            <div key={`${stat.name}_${stat.currency}`} className="group bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[28px] p-5 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between">
                
                <div>
                   {/* Name & Trend Indicator */}
                   <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col gap-0.5 max-w-[70%]">
                        <h4 className="font-bold text-[15px] text-zinc-900 dark:text-zinc-100 truncate" title={stat.name}>{stat.name}</h4>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">{stat.history.length} Logs</span>
                      </div>
                      <div className={`px-2 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${
                         stat.priceTrend > 3 ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400' 
                         : stat.priceTrend < -3 ? 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400' 
                         : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                      }`}>
                         {stat.priceTrend > 0 ? '↑' : stat.priceTrend < 0 ? '↓' : ''} {Math.abs(stat.priceTrend).toFixed(1)}% vs avg
                      </div>
                   </div>
                   
                   {/* Price & Sparkline */}
                   <div className="flex items-end justify-between mb-5">
                      <div className="flex flex-col gap-0.5">
                         <span className="text-3xl font-bold tracking-tighter text-zinc-900 dark:text-white leading-none">
                           <span className="text-sm font-semibold tracking-normal text-zinc-400 mr-1">{stat.currency === 'CAD' ? 'C$' : '₹'}</span>
                           {stat.lastPurchase.price.toLocaleString(stat.currency === 'CAD' ? 'en-CA' : 'en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                           {stat.currency === 'INR' && (
                             <span className="text-lg opacity-40 ml-2 font-medium tracking-normal text-zinc-400">
                               (C${convertToCAD(stat.lastPurchase.price, 'INR').toLocaleString('en-CA', { maximumFractionDigits: 1 })})
                             </span>
                           )}
                         </span>
                         <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1 truncate max-w-[120px]" title={stat.lastPurchase.vendor}>
                            at {stat.lastPurchase.vendor}
                         </span>
                      </div>
                      {renderSparkline(stat.history, stat.priceTrend)}
                   </div>
                   
                   {/* Avg vs Lowest Tracker */}
                   <div className="flex justify-between text-xs mb-4 p-3.5 bg-zinc-50 dark:bg-zinc-950/40 rounded-2xl border border-zinc-100 dark:border-zinc-800/50">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.15em]">Average</span>
                        <span className="font-bold text-zinc-700 dark:text-zinc-300">
                          {stat.currency === 'CAD' ? 'C$' : '₹'}{stat.averagePrice.toLocaleString(undefined, {maximumFractionDigits:2})}
                          {stat.currency === 'INR' && (
                            <span className="text-[9px] opacity-60 ml-1 font-medium">(C${convertToCAD(stat.averagePrice, 'INR').toLocaleString('en-CA', { maximumFractionDigits: 1 })})</span>
                          )}
                        </span>
                      </div>
                      <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 my-auto" />
                      <div className="flex flex-col gap-1 text-right">
                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.15em]">Lowest</span>
                        <span className="font-bold text-teal-600 dark:text-teal-400">
                          {stat.currency === 'CAD' ? 'C$' : '₹'}{stat.lowestPrice.price.toLocaleString(undefined, {maximumFractionDigits:2})}
                          {stat.currency === 'INR' && (
                            <span className="text-[9px] opacity-60 ml-1 font-medium">(C${convertToCAD(stat.lowestPrice.price, 'INR').toLocaleString('en-CA', { maximumFractionDigits: 1 })})</span>
                          )}
                        </span>
                      </div>
                   </div>
                </div>
                
                {/* Insights Footer */}
                {stat.smartInsights.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
                     {stat.smartInsights.slice(0, 2).map((insight, idx) => ( // max 2 insights for space
                       <span key={idx} className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-[8px] truncate max-w-full ${
                          insight.type === 'positive' ? 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-500/20' : 
                          insight.type === 'negative' ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20' : 
                          'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
                       }`} title={insight.text}>
                         {insight.text}
                       </span>
                     ))}
                     {stat.smartInsights.length > 2 && (
                         <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-[8px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700">
                           +{stat.smartInsights.length - 2}
                         </span>
                     )}
                  </div>
                )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
