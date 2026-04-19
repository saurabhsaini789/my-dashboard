"use client";

import React, { useMemo } from 'react';
import { GroceryPlanItem, ExpenseRecord } from '@/types/finance';
import { SYNC_KEYS } from '@/lib/sync-keys';
import { SectionTitle } from '../ui/Text';
import { LayoutGrid, List } from 'lucide-react';
import { useStorageSubscription } from '@/hooks/useStorageSubscription';
import { setSyncedItem } from '@/lib/storage';

interface InventoryTrackerProps {
  records: ExpenseRecord[];
}

export function InventoryTracker({ records }: InventoryTrackerProps) {
  const plannedItems = useStorageSubscription<GroceryPlanItem[]>(SYNC_KEYS.FINANCES_GROCERY_PLAN, []);
  const viewMode = useStorageSubscription<'grid' | 'table'>(SYNC_KEYS.PANTRY_INVENTORY_VIEW, 'grid');

  const toggleViewMode = (mode: 'grid' | 'table') => setSyncedItem(SYNC_KEYS.PANTRY_INVENTORY_VIEW, mode);

  const inventoryStatus = useMemo(() => {
    return plannedItems.map(item => {
      let latestPurchaseDate: Date | null = null;
      let totalBoughtLast = 0;

      records.forEach(record => {
        const recordDate = new Date(record.date);
        const nameMatch = item.name.toLowerCase();
        const isMatch = record.items?.some(i => i.name.toLowerCase().includes(nameMatch)) || (record.subcategory || record.category || '').toLowerCase().includes(nameMatch);

        if (isMatch) {
          if (!latestPurchaseDate || recordDate > latestPurchaseDate) {
            latestPurchaseDate = recordDate;
            if (record.items) {
              const match = record.items.find(i => i.name.toLowerCase().includes(nameMatch));
              totalBoughtLast = parseFloat(match?.quantity || '1') || 1;
            } else {
              totalBoughtLast = parseFloat(record.quantity || '1') || 1;
            }
          }
        }
      });

      let latestManualDate: Date | null = null;
      (item.checkedUnits || []).forEach((u: any) => {
        if (typeof u !== 'string' && u.status === 'bought' && u.date) {
          const d = new Date(u.date);
          if (!latestManualDate || d > (latestManualDate as Date)) latestManualDate = d;
        }
      });

      let effectivePurchaseDate = latestPurchaseDate as Date | null;
      if (latestManualDate && (!effectivePurchaseDate || (latestManualDate as Date) > (effectivePurchaseDate as Date))) {
        effectivePurchaseDate = latestManualDate;
        if (totalBoughtLast === 0) totalBoughtLast = 1; 
      }

      const now = new Date();
      let daysRemaining = Infinity;
      let status: 'Fresh' | 'Low' | 'Out' | 'Unknown' = 'Unknown';
      let progress = 0;

      if (effectivePurchaseDate && item.consumptionDays) {
        const diff = (now.getTime() - effectivePurchaseDate.getTime()) / 86400000;
        daysRemaining = Math.max(0, item.consumptionDays - diff);
        progress = Math.max(0, (daysRemaining / item.consumptionDays) * 100);
        status = daysRemaining <= 0 ? 'Out' : daysRemaining <= 2 ? 'Low' : 'Fresh';
      } else if (effectivePurchaseDate) { status = 'Fresh'; progress = 100; }

      return { ...item, latestPurchaseDate: effectivePurchaseDate, daysRemaining, status, progress, totalBoughtLast };
    }).sort((a,b) => {
      const s = { 'Out':0, 'Low':1, 'Fresh':2, 'Unknown':3 };
      return s[a.status] - s[b.status];
    });
  }, [plannedItems, records]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-700 font-bold uppercase">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 p-8 bg-white dark:bg-zinc-900 border border-zinc-100 rounded-2xl shadow-sm">
        <div><SectionTitle>Inventory Tracker</SectionTitle><p className="text-[10px] text-zinc-400">Automated advising based on consumption cycles.</p></div>
        <div className="flex gap-8">
          <div className="flex flex-col items-end"><span className="text-[10px] text-zinc-400">Monitored</span><span className="text-3xl">{plannedItems.length}</span></div>
          <div className="flex flex-col items-end"><span className="text-[10px] text-amber-500">Alerts</span><span className="text-3xl text-amber-500">{inventoryStatus.filter(i=>i.status!=='Fresh').length}</span></div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 rounded-2xl p-8 shadow-sm">
        <div className="flex justify-between items-center mb-8">
          <span className="text-[10px] font-bold text-zinc-400 uppercase">Live Stock Status</span>
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
            <button onClick={() => toggleViewMode('grid')} className={`p-1.5 rounded-lg ${viewMode==='grid'?'bg-white shadow-sm':'text-zinc-400'}`}><LayoutGrid size={16}/></button>
            <button onClick={() => toggleViewMode('table')} className={`p-1.5 rounded-lg ${viewMode==='table'?'bg-white shadow-sm':'text-zinc-400'}`}><List size={16}/></button>
          </div>
        </div>

        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {inventoryStatus.map(i => (
              <div key={i.id} className="p-6 bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 rounded-2xl">
                <div className="flex justify-between mb-4">
                  <span className="font-bold">{i.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded ${i.status==='Fresh'?'bg-teal-50 text-teal-600':i.status==='Low'?'bg-amber-50 text-amber-600':'bg-rose-50 text-rose-600'}`}>{i.status}</span>
                </div>
                <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-700 rounded-full overflow-hidden mb-2">
                  <div className={`h-full ${i.status==='Fresh'?'bg-teal-500':i.status==='Low'?'bg-amber-500':'bg-rose-500'}`} style={{width:`${i.progress}%`}}/>
                </div>
                <div className="text-[10px] text-zinc-400">Last: {i.latestPurchaseDate ? i.latestPurchaseDate.toLocaleDateString() : 'Never'}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-100 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-zinc-50 dark:bg-zinc-800 text-[10px] text-zinc-500 font-bold uppercase">
                <tr>
                  <th className="px-6 py-4">Item</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Progress / Remaining</th>
                  <th className="px-6 py-4 text-right">Last Purchase</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {inventoryStatus.map(i => (
                  <tr key={i.id} className="hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4"><span className="font-bold text-sm">{i.name}</span></td>
                    <td className="px-6 py-4"><span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${i.status==='Fresh'?'bg-teal-50 text-teal-600':i.status==='Low'?'bg-amber-50 text-amber-600':'bg-rose-50 text-rose-600'}`}>{i.status}</span></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-24 h-1.5 bg-zinc-100 dark:bg-zinc-700 rounded-full overflow-hidden shrink-0">
                          <div className={`h-full ${i.status==='Fresh'?'bg-teal-500':i.status==='Low'?'bg-amber-500':'bg-rose-500'}`} style={{width:`${i.progress}%`}}/>
                        </div>
                        <span className="text-[10px] font-bold text-zinc-400">{i.daysRemaining !== Infinity ? `${Math.round(i.daysRemaining)} days` : '∞'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right transform group-hover:scale-105 transition-transform">
                      <span className="text-xs font-bold text-zinc-500">{i.latestPurchaseDate ? i.latestPurchaseDate.toLocaleDateString() : 'Never'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
