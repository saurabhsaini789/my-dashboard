"use client";

import React, { useMemo, useState } from 'react';
import { ExpenseRecord, ExpenseItem } from '@/types/finance';
import { Modal } from '../ui/Modal';


interface PriceIntelligenceProps {
  records: ExpenseRecord[];
}

interface PriceInstance {
  price: number;
  date: string;
  vendor: string;
  brand?: string;
  size?: string;
}

interface SmartInsight {
  text: string;
  type: 'positive' | 'negative' | 'neutral';
}

interface ItemStats {
  name: string;
  
  history: PriceInstance[];
  averagePrice: number;
  lowestPrice: PriceInstance;
  lastPurchase: PriceInstance;
  priceTrend: number; // percentage change vs average
  smartInsights: SmartInsight[];
}

export function PriceIntelligence({ records }: PriceIntelligenceProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeItemStats, setActiveItemStats] = useState<ItemStats | null>(null);

  const itemStats: ItemStats[] = useMemo(() => {
    const map: Record<string, {
      name: string;
      
      history: PriceInstance[];
    }> = {};

    records.forEach(record => {
      // Include category Grocery or any record that has itemized bills (since they could be pantry-related)
      const isApplicable = record.category === 'Grocery' || (record.items && record.items.length > 0);
      if (!isApplicable) return;

      
      const vendor = record.vendor || 'Unknown Store';
      
      if (record.items && record.items.length > 0) {
        record.items.forEach(item => {
          const name = item.name.trim();
          if (!name) return;
          
          const qty = parseFloat(item.quantity) || 1;
          let parsedSize = 1;
          if (item.size) {
            const extracted = parseFloat(item.size);
            if (!isNaN(extracted) && extracted > 0) parsedSize = extracted;
          }
          let price = item.totalPrice > 0 ? (item.totalPrice / qty) : item.unitPrice;
          
          if (price <= 0 || isNaN(price)) return; // ignore invalid prices

          const key = name.toLowerCase();
          if (!map[key]) {
            map[key] = { name, history: [] };
          }
          map[key].history.push({ price, date: record.date, vendor, brand: item.brand, size: item.size });
        });
      } else {
        // top level fallback if no items array but categorized as grocery
        const name = (record.subcategory || record.category).trim();
        if (!name) return;
        
        const qty = parseFloat(record.quantity || '1') || 1;
        const price = record.amount / qty;
        if (price <= 0 || isNaN(price)) return;

        const key = name.toLowerCase();
        if (!map[key]) {
            map[key] = { name, history: [] };
        }
        map[key].history.push({ price, date: record.date, vendor, brand: record.brand, size: record.size });
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
         // Any measurable price difference logic (tell me which milk is cheaper)
         if ((mostExpensive.avg - cheapest.avg) > 0.001 && cheapest.store !== 'Unknown Store') {
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
         <div className="absolute top-0 left-0 w-64 h-64 bg-amber-500/15 dark:bg-amber-500/10 rounded-full blur-3xl -ml-10 -mt-20 pointer-events-none" />
         
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {filteredStats.map(stat => (
            <div key={stat.name} onClick={() => setActiveItemStats(stat)} className="group bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[28px] p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between cursor-pointer">
                
                <div>
                   {/* Name & Trend Indicator */}
                   <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col gap-1 max-w-[70%]">
                        <h4 className="font-bold text-[17px] text-zinc-900 dark:text-zinc-100 truncate" title={stat.name}>{stat.name}</h4>
                        <span className="text-[11px] uppercase font-bold tracking-widest text-zinc-500 dark:text-zinc-400">{stat.history.length} Logs</span>
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
                         <span className="text-4xl font-bold tracking-tighter text-zinc-900 dark:text-white leading-none">
                           <span className="text-base font-semibold tracking-normal text-zinc-400 mr-1">$</span>{stat.lastPurchase.price.toLocaleString("en-CA", { minimumFractionDigits: 1, maximumFractionDigits: 3 })}
                           <span className="text-sm font-semibold text-zinc-400 ml-1">/ {stat.lastPurchase.size || 'unit'}</span>
                         </span>
                         <span className="text-xs text-zinc-600 dark:text-zinc-300 uppercase tracking-widest font-bold mt-1 truncate max-w-[150px]" title={stat.lastPurchase.vendor}>
                            at {stat.lastPurchase.vendor} {stat.lastPurchase.brand ? `(${stat.lastPurchase.brand})` : ''}
                         </span>
                      </div>
                      {renderSparkline(stat.history, stat.priceTrend)}
                   </div>
                   
                   {/* Avg vs Lowest Tracker */}
                   <div className="flex justify-between text-sm mb-4 p-4 bg-zinc-50 dark:bg-zinc-950/40 rounded-2xl border border-zinc-100 dark:border-zinc-800/50">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] text-zinc-600 dark:text-zinc-300 font-bold uppercase tracking-[0.15em]">Average</span>
                        <span className="font-bold text-zinc-800 dark:text-zinc-200 text-sm">
                          ${stat.averagePrice.toLocaleString("en-CA", {maximumFractionDigits:2})}
                        </span>
                      </div>
                      <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-800 my-auto" />
                      <div className="flex flex-col gap-1.5 text-right">
                        <span className="text-[11px] text-zinc-600 dark:text-zinc-300 font-bold uppercase tracking-[0.15em]">Lowest</span>
                        <span className="font-bold text-teal-600 dark:text-teal-400 text-sm">
                          ${stat.lowestPrice.price.toLocaleString("en-CA", {maximumFractionDigits:2})}
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

      {/* Pop-up Modal for Detailed Tracking */}
      {activeItemStats && (
        <Modal
          isOpen={!!activeItemStats}
          onClose={() => setActiveItemStats(null)}
          title={activeItemStats.name}
          cancelText="Close"
          isReadonly={true}
        >
            <div className="flex-1 custom-scrollbar space-y-8">
               {/* Summary Header inside Modal */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800 flex flex-col gap-2">
                     <span className="text-[11px] uppercase font-bold tracking-widest text-zinc-400">Lowest</span>
                     <span className="text-2xl font-bold text-teal-600 dark:text-teal-400">${activeItemStats.lowestPrice.price.toLocaleString("en-CA", {maximumFractionDigits:2})}</span>
                     <span className="text-xs text-zinc-500 truncate" title={activeItemStats.lowestPrice.vendor}>at {activeItemStats.lowestPrice.vendor}</span>
                  </div>
                  <div className="p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800 flex flex-col gap-2">
                     <span className="text-[11px] uppercase font-bold tracking-widest text-zinc-400">Average</span>
                     <span className="text-2xl font-bold text-zinc-800 dark:text-zinc-200">${activeItemStats.averagePrice.toLocaleString("en-CA", {maximumFractionDigits:2})}</span>
                     <span className="text-xs text-zinc-500">{activeItemStats.history.length} purchases</span>
                  </div>
                  <div className="p-5 rounded-3xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-zinc-800 flex flex-col gap-2">
                     <span className="text-[11px] uppercase font-bold tracking-widest text-zinc-400">Trend</span>
                     <span className={`text-2xl font-bold ${activeItemStats.priceTrend > 3 ? 'text-rose-500' : activeItemStats.priceTrend < -3 ? 'text-teal-500' : 'text-zinc-500'}`}>
                        {activeItemStats.priceTrend > 0 ? '+' : ''}{activeItemStats.priceTrend.toFixed(1)}%
                     </span>
                     <span className="text-xs text-zinc-500">vs average</span>
                  </div>
               </div>

               {/* Extended Insights */}
               {activeItemStats.smartInsights.length > 0 && (
                 <div className="space-y-3">
                    <h4 className="text-[11px] uppercase tracking-[0.2em] font-bold text-zinc-400 pl-2">Smart Insights</h4>
                    <div className="flex flex-col gap-2">
                       {activeItemStats.smartInsights.map((insight, idx) => (
                         <div key={idx} className={`p-4 rounded-2xl border flex items-center gap-3 text-sm font-bold ${
                           insight.type === 'positive' ? 'bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-100 dark:border-teal-500/20' : 
                           insight.type === 'negative' ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-100 dark:border-rose-500/20' : 
                           'bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                         }`}>
                           <span className="text-xl">{insight.type === 'positive' ? '✨' : insight.type === 'negative' ? '⚠️' : '💡'}</span>
                           {insight.text}
                         </div>
                       ))}
                    </div>
                 </div>
               )}

               {/* History Table */}
               <div className="space-y-3">
                  <h4 className="text-[11px] uppercase tracking-[0.2em] font-bold text-zinc-400 pl-2">Price History</h4>
                  <div className="border border-zinc-100 dark:border-zinc-800 rounded-3xl overflow-hidden">
                     <table className="w-full text-left">
                        <thead className="bg-zinc-50 dark:bg-zinc-950/50 border-b border-zinc-100 dark:border-zinc-800">
                           <tr>
                              <th className="p-4 px-6 text-[10px] uppercase tracking-widest text-zinc-600 dark:text-zinc-300 font-bold">Date</th>
                              <th className="p-4 px-6 text-[10px] uppercase tracking-widest text-zinc-600 dark:text-zinc-300 font-bold">Store</th>
                              <th className="p-4 px-6 text-[10px] uppercase tracking-widest text-zinc-600 dark:text-zinc-300 font-bold text-right">Details</th>
                              <th className="p-4 px-6 text-[10px] uppercase tracking-widest text-zinc-600 dark:text-zinc-300 font-bold text-right">Unit Price</th>
                           </tr>
                        </thead>
                        <tbody>
                           {[...activeItemStats.history].reverse().map((h, i) => (
                              <tr key={i} className="border-b border-zinc-50 dark:border-zinc-800/50 last:border-0 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                                 <td className="p-4 px-6 text-sm text-zinc-600 dark:text-zinc-400 font-medium">
                                    {new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                 </td>
                                 <td className="p-4 px-6 text-sm font-bold text-zinc-900 dark:text-white">
                                    {h.vendor}
                                 </td>
                                 <td className="p-4 px-6 text-xs text-zinc-500 dark:text-zinc-400 text-right">
                                    {h.brand ? <span className="font-bold mr-2">{h.brand}</span> : null}
                                    {h.size || ''}
                                 </td>
                                 <td className="p-4 px-6 text-sm font-bold text-zinc-900 dark:text-white text-right tracking-tighter">
                                    ${h.price.toLocaleString("en-CA", {minimumFractionDigits: 2, maximumFractionDigits: 3})}
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
        </Modal>
      )}
    </div>
  );
}
