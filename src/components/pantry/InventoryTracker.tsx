"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { GroceryPlanItem, ExpenseRecord } from '@/types/finance';
import { SYNC_KEYS } from '@/lib/sync-keys';
import { getPrefixedKey } from '@/lib/keys';

interface InventoryTrackerProps {
  records: ExpenseRecord[];
}

export function InventoryTracker({ records }: InventoryTrackerProps) {
  const [plannedItems, setPlannedItems] = useState<GroceryPlanItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_GROCERY_PLAN));
    if (saved) {
      try {
        setPlannedItems(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load grocery plan for inventory", e);
      }
    }
    
    const handleLocal = (e: any) => {
      if (e.detail && e.detail.key === SYNC_KEYS.FINANCES_GROCERY_PLAN) {
        const val = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_GROCERY_PLAN));
        if (val) {
          try { setPlannedItems(JSON.parse(val)); } catch (err) {}
        }
      }
    };
    window.addEventListener('local-storage-change', handleLocal);
    
    setIsLoaded(true);
    return () => window.removeEventListener('local-storage-change', handleLocal);
  }, []);

  const inventoryStatus = useMemo(() => {
    return plannedItems.map(item => {
      // Find the latest purchase for this item in records
      let latestPurchaseDate: Date | null = null;
      let totalBoughtLast = 0;

      records.forEach(record => {
        const recordDate = new Date(record.date);
        
        const isMatch = record.items?.some(i => i.name.toLowerCase().includes(item.name.toLowerCase())) ||
                        record.subcategory?.toLowerCase().includes(item.name.toLowerCase()) || 
                        record.category?.toLowerCase() === item.name.toLowerCase();

        if (isMatch) {
          if (!latestPurchaseDate || recordDate > latestPurchaseDate) {
            latestPurchaseDate = recordDate;
            
            // Extract quantity from the latest purchase
            if (record.items) {
               const match = record.items.find(i => i.name.toLowerCase().includes(item.name.toLowerCase()));
               totalBoughtLast = parseFloat(match?.quantity || '1') || 1;
            } else {
               totalBoughtLast = parseFloat(record.quantity || '1') || 1;
            }
          }
        }
      });

      const now = new Date();
      let daysRemaining = Infinity;
      let status: 'Fresh' | 'Low' | 'Out' | 'Unknown' = 'Unknown';
      let progress = 0;

      if (latestPurchaseDate && item.consumptionDays) {
        const daysSincePurchase = (now.getTime() - (latestPurchaseDate as Date).getTime()) / (1000 * 60 * 60 * 24);
        daysRemaining = Math.max(0, item.consumptionDays - daysSincePurchase);
        progress = Math.max(0, (daysRemaining / item.consumptionDays) * 100);
        
        if (daysRemaining <= 0) status = 'Out';
        else if (daysRemaining <= 2) status = 'Low';
        else status = 'Fresh';
      } else if (latestPurchaseDate) {
         status = 'Fresh';
         progress = 100;
      }

      return {
        ...item,
        latestPurchaseDate,
        daysRemaining,
        status,
        progress,
        totalBoughtLast
      };
    }).sort((a, b) => {
       // Sort by status: Out > Low > Fresh > Unknown
       const score = { 'Out': 0, 'Low': 1, 'Fresh': 2, 'Unknown': 3 };
       return score[a.status] - score[b.status];
    });
  }, [plannedItems, records]);

  if (!isLoaded) return null;

  const lowStockCount = inventoryStatus.filter(i => i.status === 'Low' || i.status === 'Out').length;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-700 delay-300">
      
      {/* Header & Alerts */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-6 md:p-8 bg-zinc-900 dark:bg-zinc-800 rounded-[40px] text-white shadow-xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl -mr-10 -mt-20 pointer-events-none" />
           
           <div className="flex flex-col gap-2 relative z-10">
              <h2 className="text-2xl font-bold uppercase tracking-[0.2em]">Smart Inventory</h2>
              <p className="text-sm text-zinc-400 font-medium max-w-sm">Auto-advising based on consumption cycles and calendar purchases.</p>
           </div>

           <div className="flex gap-4 md:gap-8 relative z-10">
              <div className="flex flex-col items-start md:items-end">
                 <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Planned Items</span>
                 <span className="text-2xl md:text-3xl font-bold tracking-tight">{plannedItems.length}</span>
              </div>
              <div className="w-px h-12 bg-zinc-800 hidden md:block" />
              <div className="flex flex-col items-start md:items-end">
                 <span className="text-xs uppercase tracking-widest text-amber-500/80 font-bold">Needs Attention</span>
                 <span className="text-2xl md:text-3xl font-bold tracking-tight text-amber-400">{lowStockCount}</span>
              </div>
           </div>
        </div>

        {inventoryStatus.filter(i => i.status === 'Out' || i.status === 'Low').slice(0, 3).map(item => (
          <div key={item.id} className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl animate-in slide-in-from-left-4 duration-500">
            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold text-lg">
              !
            </div>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              <span className="font-bold">{item.name}</span> {item.status === 'Out' ? 'is likely finished' : `is running low (${Math.round(item.daysRemaining)} days left)`}.
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[40px] p-6 lg:p-8 shadow-xl flex flex-col gap-8">
         <div className="flex justify-between items-center px-2">
            <h3 className="uppercase tracking-[0.3em] font-bold text-sm text-zinc-400">Inventory Status</h3>
            <span className="text-xs uppercase font-bold tracking-widest text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full">Source: Monthly Plan</span>
         </div>

         {/* Inventory List with scrollable height */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar pb-4">
            {inventoryStatus.map(item => (
              <div key={item.id} className="group relative p-6 bg-zinc-50 dark:bg-zinc-950/30 rounded-[32px] border border-zinc-100 dark:border-zinc-800 hover:border-amber-500/30 transition-all flex flex-col gap-4">
                
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">{item.name}</h4>
                    <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${
                      item.status === 'Fresh' ? 'bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400' :
                      item.status === 'Low' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' :
                      item.status === 'Out' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' :
                      'bg-zinc-100 text-zinc-500 dark:bg-zinc-800'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-xs uppercase font-bold tracking-widest text-zinc-400">Cycle: {item.consumptionDays || '?'} days</p>
                </div>

                <div className="flex flex-col gap-3 p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
                  <div className="flex justify-between items-end">
                    <div className="flex flex-col">
                      <span className="text-xs uppercase font-bold tracking-widest text-zinc-400">Estimated Stock</span>
                      <span className={`text-2xl font-bold tracking-tight ${item.status === 'Low' || item.status === 'Out' ? 'text-amber-500' : 'text-zinc-900 dark:text-zinc-100'}`}>
                        {item.status === 'Out' ? 'None' : item.status === 'Fresh' ? 'Good' : 'Expiring'}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">Lasts</span>
                      <span className={`text-sm font-bold ${item.status === 'Low' || item.status === 'Out' ? 'text-amber-500' : 'text-zinc-600 dark:text-zinc-400'}`}>
                        {item.daysRemaining === Infinity ? '?' : item.daysRemaining < 1 ? 'Out!' : `${Math.round(item.daysRemaining)} days`}
                      </span>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${
                        item.status === 'Fresh' ? 'bg-teal-500' : 
                        item.status === 'Low' ? 'bg-amber-500' : 
                        item.status === 'Out' ? 'bg-rose-500' : 'bg-zinc-400'
                      }`}
                      style={{ width: `${item.progress || 0}%` }}
                    />
                  </div>
                </div>

                <div className="mt-auto pt-2 flex flex-col gap-1 border-t border-zinc-100 dark:border-zinc-800/50">
                   <p className="text-[9px] text-zinc-400 uppercase font-medium">
                     Latest: <span className="text-zinc-600 dark:text-zinc-300 font-bold">{(item.latestPurchaseDate as unknown) instanceof Date ? (item.latestPurchaseDate as unknown as Date).toLocaleDateString() : 'Never'}</span>
                   </p>
                   <p className="text-[9px] text-zinc-400 uppercase font-medium">
                     Last Qty: <span className="text-zinc-600 dark:text-zinc-300 font-bold">{item.totalBoughtLast} {item.unitSize}</span>
                   </p>
                </div>
              </div>
            ))}

            {plannedItems.length === 0 && (
               <div className="col-span-full py-12 text-center">
                  <p className="text-zinc-500 font-medium">Add items to your Monthly Grocery Plan to see them here.</p>
               </div>
            )}
         </div>
      </div>
    </div>
  );
}
