"use client";

import React, { useState, useEffect } from 'react';
import { getPrefixedKey } from '@/lib/keys';
import { SYNC_KEYS } from '@/lib/sync-keys';
import {
  SupplementItem,
  SUPPLEMENT_CATEGORIES,
  FAMILY_MEMBERS,
  type InventoryStatus,
} from '@/types/health-system';
import { SectionTitle } from '../ui/Text';
import { ChevronDown, ChevronUp } from 'lucide-react';

/* ── Helpers ── */
const getStatus = (item: { quantity: number; targetQuantity: number; expiryDate: string }): InventoryStatus => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const expiry = new Date(item.expiryDate); expiry.setHours(0, 0, 0, 0);
  if (expiry < today) return 'EXPIRED';
  if (item.quantity === 0) return 'MISSING';
  if (item.quantity < item.targetQuantity) return 'LOW';
  return 'OK';
};

const getFrequencyGroup = (freq: string): string => {
  const f = freq.toLowerCase();
  if (f.includes('day') || f.includes('daily') || f.includes('/d')) return 'Daily';
  if (f.includes('week') || f.includes('weekly') || f.includes('/w')) return 'Weekly';
  if (f.includes('month') || f.includes('monthly')) return 'Monthly';
  return 'Other';
};

const FREQ_ORDER = ['Daily', 'Weekly', 'Monthly', 'Other'];

export function SupplementRoutineSection() {
  const [items, setItems] = useState<SupplementItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedPerson, setSelectedPerson] = useState<string>('All');
  const [familyMembers, setFamilyMembers] = useState<string[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(getPrefixedKey(SYNC_KEYS.HEALTH_SUPPLEMENTS));
    if (raw) { try { setItems(JSON.parse(raw)); } catch {} }
    
    const savedFamily = localStorage.getItem(getPrefixedKey(SYNC_KEYS.HEALTH_FAMILY_MEMBERS));
    if (savedFamily) {
      try { setFamilyMembers(JSON.parse(savedFamily)); } catch { setFamilyMembers(FAMILY_MEMBERS); }
    } else {
      setFamilyMembers(FAMILY_MEMBERS);
    }

    setIsLoaded(true);

    const handleChange = (e: any) => {
      if (e.detail?.key === SYNC_KEYS.HEALTH_SUPPLEMENTS) {
        const val = localStorage.getItem(getPrefixedKey(SYNC_KEYS.HEALTH_SUPPLEMENTS));
        if (val) { try { setItems(JSON.parse(val)); } catch {} }
      } else if (e.detail?.key === SYNC_KEYS.HEALTH_FAMILY_MEMBERS) {
        const val = localStorage.getItem(getPrefixedKey(SYNC_KEYS.HEALTH_FAMILY_MEMBERS));
        if (val) { try { setFamilyMembers(JSON.parse(val)); } catch {} }
      }
    };
    window.addEventListener('local-storage-change', handleChange);
    return () => window.removeEventListener('local-storage-change', handleChange);
  }, []);

  if (!isLoaded) return null;

  const filteredItems = items.filter(item => 
    selectedPerson === 'All' ? true : (item.person === selectedPerson || (!item.person && selectedPerson === 'Shared'))
  );

  const suppStats = {
    ok: filteredItems.filter(i => getStatus(i) === 'OK').length,
    low: filteredItems.filter(i => getStatus(i) === 'LOW').length,
    missing: filteredItems.filter(i => getStatus(i) === 'MISSING').length,
    expired: filteredItems.filter(i => getStatus(i) === 'EXPIRED').length,
  };

  const byFreq = filteredItems.reduce<Record<string, SupplementItem[]>>((acc, item) => {
    const g = getFrequencyGroup(item.frequency);
    if (!acc[g]) acc[g] = [];
    acc[g].push(item);
    return acc;
  }, {});

  const categoryCoverage = SUPPLEMENT_CATEGORIES.map(cat => ({
    cat,
    count: filteredItems.filter(i => i.category === cat).length,
    hasOk: filteredItems.some(i => i.category === cat && getStatus(i) === 'OK'),
  }));

  return (
    <section className="w-full fade-in mb-14" style={{ animationDelay: '2.0s' }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 px-2">
        <div>
          <SectionTitle>Supplement Routine</SectionTitle>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={selectedPerson}
            onChange={(e) => setSelectedPerson(e.target.value)}
            className="bg-zinc-100 dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold px-3 py-2 rounded-xl border-none focus:ring-2 focus:ring-zinc-500 appearance-none cursor-pointer"
          >
            <option value="All">All Routines</option>
            <option value="Shared">Shared</option>
            {familyMembers.map(person => (
              <option key={person} value={person}>{person}</option>
            ))}
          </select>
          <button
            onClick={() => setIsExpanded(p => !p)}
            className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 px-3 py-2 rounded-xl"
          >
            {isExpanded ? <><ChevronUp size={13} /> Collapse</> : <><ChevronDown size={13} /> Expand</>}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="animate-in fade-in duration-300 space-y-8">

          {/* Summary tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-4 shadow-sm">
              <span className="text-[13px] font-bold uppercase text-zinc-400 tracking-wider block mb-2">Total Tracked</span>
              <span className="text-[32px] font-black text-zinc-900 dark:text-zinc-100 tabular-nums">{filteredItems.length}</span>
            </div>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl px-5 py-4 shadow-sm">
              <span className="text-[13px] font-bold uppercase text-zinc-400 tracking-wider block mb-2">Categories</span>
              <span className="text-[32px] font-black text-zinc-900 dark:text-zinc-100 tabular-nums">
                {categoryCoverage.filter(c => c.count > 0).length}
                <span className="text-lg font-bold text-zinc-400"> / {SUPPLEMENT_CATEGORIES.length}</span>
              </span>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20 rounded-2xl px-5 py-4 shadow-sm">
              <span className="text-[13px] font-bold uppercase text-emerald-500 tracking-wider block mb-2">OK</span>
              <span className="text-[32px] font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{suppStats.ok}</span>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-2xl px-5 py-4 shadow-sm">
              <span className="text-[13px] font-bold uppercase text-amber-500 tracking-wider block mb-2">Need Action</span>
              <span className="text-[32px] font-black text-amber-600 dark:text-amber-400 tabular-nums">
                {suppStats.low + suppStats.missing + suppStats.expired}
              </span>
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="py-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
              <p className="text-sm text-zinc-400 uppercase tracking-wider">
                No supplements found for this person.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

              {/* Frequency Groups */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                <h3 className="text-xs font-bold uppercase text-zinc-400 tracking-wider mb-5">
                  Routine by Frequency
                </h3>
                <div className="space-y-5">
                  {FREQ_ORDER.filter(g => byFreq[g]?.length > 0).map(group => (
                    <div key={group}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[14px] font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wide">{group}</span>
                        <span className="text-xs font-bold text-zinc-400">· {byFreq[group].length}</span>
                      </div>
                      <div className="space-y-1.5">
                        {byFreq[group].map(item => {
                          const st = getStatus(item);
                          const dotColor =
                            st === 'OK' ? 'bg-emerald-500' :
                            st === 'LOW' ? 'bg-amber-500' :
                            st === 'MISSING' ? 'bg-rose-500' : 'bg-zinc-400';
                          return (
                            <div key={item.id} className="flex items-center justify-between py-2.5 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                                <div className="min-w-0">
                                  <span className="text-[15px] font-semibold text-zinc-800 dark:text-zinc-200 block truncate">{item.itemName}</span>
                                  <span className="text-xs text-zinc-400">{item.dose} · {item.category}</span>
                                </div>
                              </div>
                              <span className="text-xs font-medium text-zinc-400 shrink-0 pl-2">{item.frequency}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {Object.keys(byFreq).length === 0 && (
                    <p className="text-xs text-zinc-400">No frequency data available.</p>
                  )}
                </div>
              </div>

              {/* Category Coverage */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                <h3 className="text-xs font-bold uppercase text-zinc-400 tracking-wider mb-5">
                  Category Coverage
                </h3>
                <div className="space-y-2">
                  {categoryCoverage.map(({ cat, count, hasOk }) => (
                    <div
                      key={cat}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        count === 0
                          ? 'border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 opacity-60'
                          : hasOk
                          ? 'border-emerald-100 dark:border-emerald-900/20 bg-emerald-50 dark:bg-emerald-900/10'
                          : 'border-amber-100 dark:border-amber-900/20 bg-amber-50 dark:bg-amber-900/10'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        count === 0 ? 'bg-zinc-300 dark:bg-zinc-600' : hasOk ? 'bg-emerald-500' : 'bg-amber-500'
                      }`} />
                      <span className="flex-1 text-[13px] font-semibold text-zinc-700 dark:text-zinc-300 truncate">{cat}</span>
                      <span className={`text-xs font-bold shrink-0 ${
                        count === 0 ? 'text-zinc-400' : hasOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                      }`}>
                        {count === 0 ? 'Not tracked' : `${count} item${count !== 1 ? 's' : ''}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>
      )}
    </section>
  );
}
