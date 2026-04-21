"use client";

import React, { useState, useEffect } from 'react';
import { SYNC_KEYS } from '@/lib/sync-keys';
import { MedicineItem, SupplementItem, MEDICINE_CATEGORIES, SUPPLEMENT_CATEGORIES, type InventoryStatus } from '@/types/health-system';
import { Activity, Clock, ShoppingCart, BarChart2, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { useStorageSubscription } from '@/hooks/useStorageSubscription';

type StatusFilter = 'ALL' | 'LOW' | 'MISSING' | 'EXPIRED' | 'OK';
type InsightTab = 'expiry' | 'categories' | 'restock';

interface HealthInsightsPanelProps {
  activeFilter: StatusFilter;
  onFilterChange: (filter: StatusFilter) => void;
}

interface ExpiryItem {
  name: string;
  section: string;
  expiryDate: string;
  daysUntil: number;
  status: InventoryStatus;
}

interface RestockItemData {
  name: string;
  section: string;
  status: 'LOW' | 'MISSING';
  qty: number;
  target: number;
}

const getStatus = (item: { quantity: number; targetQuantity: number; expiryDate: string }): InventoryStatus => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(item.expiryDate);
  expiry.setHours(0, 0, 0, 0);
  if (expiry < today) return 'EXPIRED';
  if (item.quantity === 0) return 'MISSING';
  if (item.quantity < item.targetQuantity) return 'LOW';
  return 'OK';
};

const getDaysUntilExpiry = (expiryDate: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const statsFromItems = (items: Array<{ quantity: number; targetQuantity: number; expiryDate: string }>) => ({
  total: items.length,
  ok: items.filter(i => getStatus(i) === 'OK').length,
  low: items.filter(i => getStatus(i) === 'LOW').length,
  missing: items.filter(i => getStatus(i) === 'MISSING').length,
  expired: items.filter(i => getStatus(i) === 'EXPIRED').length,
});

export function HealthInsightsPanel({ activeFilter, onFilterChange }: HealthInsightsPanelProps) {
  const medicineItems = useStorageSubscription<MedicineItem[]>(SYNC_KEYS.HEALTH_MEDICINE, []);
  const travelItems = useStorageSubscription<MedicineItem[]>(SYNC_KEYS.HEALTH_TRAVEL_KIT, []);
  const firstAidHomeItems = useStorageSubscription<MedicineItem[]>(SYNC_KEYS.HEALTH_FIRST_AID_HOME, []);
  const firstAidMobileItems = useStorageSubscription<MedicineItem[]>(SYNC_KEYS.HEALTH_FIRST_AID_MOBILE, []);
  const supplementItems = useStorageSubscription<SupplementItem[]>(SYNC_KEYS.HEALTH_SUPPLEMENTS, []);

  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<InsightTab>('expiry');
  const [expandedRestockSections, setExpandedRestockSections] = useState<Record<string, boolean>>({});

  const sections = [
    { label: 'Medicine Inventory', items: medicineItems },
    { label: 'Travel Medical Kit', items: travelItems },
    { label: 'First Aid Home', items: firstAidHomeItems },
    { label: 'First Aid Mobile', items: firstAidMobileItems },
  ];

  const allMedicineItems = [...medicineItems, ...travelItems, ...firstAidHomeItems, ...firstAidMobileItems];
  const totalItemsCount = allMedicineItems.length + supplementItems.length;
  const medStats = statsFromItems(allMedicineItems);
  const suppStats = statsFromItems(supplementItems);

  const totalOk = medStats.ok + suppStats.ok;
  const totalLow = medStats.low + suppStats.low;
  const totalMissing = medStats.missing + suppStats.missing;
  const totalExpired = medStats.expired + suppStats.expired;
  const readinessScore = totalItemsCount > 0 ? Math.round((totalOk / totalItemsCount) * 100) : 100;

  const sectionStats = [
    ...sections.map(s => ({ label: s.label, ...statsFromItems(s.items) })),
    { label: 'Supplements', ...statsFromItems(supplementItems) },
  ];

  const allWithExpiry: ExpiryItem[] = [
    ...sections.flatMap(s => s.items.map(i => ({ name: i.itemName, section: s.label, expiryDate: i.expiryDate, daysUntil: getDaysUntilExpiry(i.expiryDate), status: getStatus(i) }))),
    ...supplementItems.map(i => ({ name: i.itemName, section: 'Supplements', expiryDate: i.expiryDate, daysUntil: getDaysUntilExpiry(i.expiryDate), status: getStatus(i) }))
  ].sort((a,b) => a.daysUntil - b.daysUntil);

  const restockItems: RestockItemData[] = [
    ...sections.flatMap(s => s.items.filter(i => getStatus(i)==='LOW'||getStatus(i)==='MISSING').map(i=>({ name: i.itemName, section: s.label, status: getStatus(i) as 'LOW'|'MISSING', qty: i.quantity, target: i.targetQuantity }))),
    ...supplementItems.filter(i => getStatus(i)==='LOW'||getStatus(i)==='MISSING').map(i=>({ name: i.itemName, section: 'Supplements', status: getStatus(i) as 'LOW'|'MISSING', qty: i.quantity, target: i.targetQuantity }))
  ];

  const TABS: { id: InsightTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'expiry', label: 'Expiry', icon: <Clock size={14}/>, badge: totalExpired },
    { id: 'categories', label: 'Categories', icon: <BarChart2 size={14}/> },
    { id: 'restock', label: 'Restock', icon: <ShoppingCart size={14}/>, badge: restockItems.length }
  ];

  return (
    <div className="mb-14 px-2">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center"><Activity size={20} className="text-rose-500" /></div>
          <div><h2 className="text-xl font-bold">Health Insights</h2><p className="text-xs text-zinc-400 font-bold uppercase">{totalItemsCount} items tracked</p></div>
        </div>
        <button onClick={()=>setIsExpanded(!isExpanded)} className="text-xs font-bold bg-zinc-100 dark:bg-zinc-800 px-4 py-2 rounded-xl">{isExpanded?'Collapse':'Expand'}</button>
      </div>

      {isExpanded && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-100 shadow-sm flex flex-col items-center">
              <span className="text-[10px] font-bold text-zinc-400 uppercase mb-2">Readiness</span>
              <span className={`text-4xl font-bold ${readinessScore>=80?'text-emerald-500':readinessScore>=60?'text-amber-500':'text-rose-500'}`}>{readinessScore}%</span>
            </div>
            {[{l:'items', v:totalItemsCount, c:'zinc'}, {l:'ok', v:totalOk, c:'emerald'}, {l:'low', v:totalLow, c:'amber'}, {l:'missing', v:totalMissing, c:'rose'}, {l:'expired', v:totalExpired, c:'zinc-500'}].map(s => {
              const filterValue = s.l === 'items' ? 'ALL' : s.l.toUpperCase() as StatusFilter;
              const isActive = activeFilter === filterValue;
              
              return (
                <div 
                  key={s.l} 
                  onClick={() => onFilterChange(filterValue)} 
                  className={`bg-white dark:bg-zinc-900 p-6 rounded-2xl border ${isActive ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-zinc-100'} shadow-sm cursor-pointer transition-all hover:border-rose-300`}
                >
                  <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">{s.l}</span>
                  <span className="text-3xl font-bold">{s.v}</span>
                </div>
              );
            })}
          </div>

          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-100 shadow-sm grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {sectionStats.map(s => (
              <div key={s.label} className="flex flex-col gap-2">
                <div className="flex justify-between text-[11px] font-bold uppercase"><span className="text-zinc-500 truncate">{s.label}</span><span className="text-zinc-400">{s.total}</span></div>
                <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className={`h-full bg-rose-500 transition-all duration-1000`} style={{ width: s.total?`${(s.ok/s.total)*100}%`:'0%' }} />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="flex border-b border-zinc-100">
              {TABS.map(t => (
                <button key={t.id} onClick={()=>setActiveTab(t.id)} className={`px-6 py-4 flex items-center gap-2 text-xs font-bold uppercase border-b-2 transition-all ${activeTab===t.id?'border-rose-500 text-rose-600':'border-transparent text-zinc-400'}`}>
                  {t.icon}{t.label}{t.badge! > 0 && <span className="ml-1 bg-rose-500 text-white px-1.5 py-0.5 rounded-full text-[10px]">{t.badge}</span>}
                </button>
              ))}
            </div>
            <div className="p-6 max-h-[400px] overflow-y-auto custom-scrollbar">
              {activeTab === 'expiry' && (
                <div className="space-y-2">
                  {allWithExpiry.map((i,idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                      <div><span className="font-bold text-sm block">{i.name}</span><span className="text-[10px] uppercase font-bold text-zinc-400">{i.section}</span></div>
                      <span className={`text-xs font-bold ${i.daysUntil<0?'text-rose-500':'text-zinc-500'}`}>{i.daysUntil<0?`${Math.abs(i.daysUntil)}d ago`:`in ${i.daysUntil}d`}</span>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'restock' && (
                <div className="space-y-4">
                  {restockItems.length ? restockItems.map((i,idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                      <div className="flex items-center gap-3"><div className={`w-2 h-2 rounded-full ${i.status==='MISSING'?'bg-rose-500':'bg-amber-500'}`}/><span className="font-bold text-sm">{i.name}</span></div>
                      <span className="text-xs font-bold text-zinc-400">{i.qty} / {i.target}</span>
                    </div>
                  )) : <div className="text-center py-10 font-bold text-zinc-400">All Stocked!</div>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
