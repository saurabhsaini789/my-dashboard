"use client";

import React, { useState, useEffect, useRef } from 'react';
import { getPrefixedKey } from '@/lib/keys';
import { SYNC_KEYS } from '@/lib/sync-keys';
import {
  MedicineItem,
  SupplementItem,
  MEDICINE_CATEGORIES,
  SUPPLEMENT_CATEGORIES,
  type InventoryStatus,
} from '@/types/health-system';
import {
  Activity,
  Clock,
  ShoppingCart,
  BarChart2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
type StatusFilter = 'ALL' | 'LOW' | 'MISSING' | 'EXPIRED';
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

interface SectionStats {
  label: string;
  total: number;
  ok: number;
  low: number;
  missing: number;
  expired: number;
}

/* ─────────────────────────────────────────────
   Pure helpers (no hooks)
───────────────────────────────────────────── */
const getStatus = (item: {
  quantity: number;
  targetQuantity: number;
  expiryDate: string;
}): InventoryStatus => {
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

const loadFromStorage = <T,>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(getPrefixedKey(key));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/* ─────────────────────────────────────────────
   Restock Row — local checked state
───────────────────────────────────────────── */
function RestockRow({ item }: { item: RestockItemData }) {
  const [checked, setChecked] = useState(false);
  return (
    <div
      className={`flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all cursor-pointer select-none ${
        checked
          ? 'opacity-40'
          : 'bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800'
      }`}
      onClick={() => setChecked(p => !p)}
    >
      {/* Checkbox */}
      <div
        className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-all ${
          checked
            ? 'bg-emerald-500 border-emerald-500'
            : 'border-zinc-300 dark:border-zinc-600'
        }`}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M2 5l2 2 4-4"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      {/* Name */}
      <span
        className={`flex-1 text-base font-semibold text-zinc-800 dark:text-zinc-200 min-w-0 truncate ${
          checked ? 'line-through' : ''
        }`}
      >
        {item.name}
      </span>

      {/* Badges */}
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded-md ${
            item.status === 'MISSING'
              ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'
              : 'bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'
          }`}
        >
          {item.status}
        </span>
        <span className="text-sm text-zinc-400 font-medium tabular-nums">
          {item.qty}/{item.target}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
export function HealthInsightsPanel({ activeFilter, onFilterChange }: HealthInsightsPanelProps) {
  const [medicineItems, setMedicineItems] = useState<MedicineItem[]>([]);
  const [travelItems, setTravelItems] = useState<MedicineItem[]>([]);
  const [firstAidHomeItems, setFirstAidHomeItems] = useState<MedicineItem[]>([]);
  const [firstAidMobileItems, setFirstAidMobileItems] = useState<MedicineItem[]>([]);
  const [supplementItems, setSupplementItems] = useState<SupplementItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<InsightTab>('expiry');
  const [isLoaded, setIsLoaded] = useState(false);
  const [expandedRestockSections, setExpandedRestockSections] = useState<Record<string, boolean>>({});

  const toggleRestockSection = (section: string) =>
    setExpandedRestockSections(prev => ({ ...prev, [section]: prev[section] === false ? true : false }));

  // keep a ref for the storage-change listener
  const stateRef = useRef({ medicineItems, travelItems, firstAidHomeItems, firstAidMobileItems, supplementItems });
  useEffect(() => {
    stateRef.current = { medicineItems, travelItems, firstAidHomeItems, firstAidMobileItems, supplementItems };
  });

  useEffect(() => {
    setMedicineItems(loadFromStorage<MedicineItem>(SYNC_KEYS.HEALTH_MEDICINE));
    setTravelItems(loadFromStorage<MedicineItem>(SYNC_KEYS.HEALTH_TRAVEL_KIT));
    setFirstAidHomeItems(loadFromStorage<MedicineItem>(SYNC_KEYS.HEALTH_FIRST_AID_HOME));
    setFirstAidMobileItems(loadFromStorage<MedicineItem>(SYNC_KEYS.HEALTH_FIRST_AID_MOBILE));
    setSupplementItems(loadFromStorage<SupplementItem>(SYNC_KEYS.HEALTH_SUPPLEMENTS));
    setIsLoaded(true);

    const handleStorageChange = (e: any) => {
      if (!e.detail) return;
      const { key } = e.detail;
      const raw = localStorage.getItem(getPrefixedKey(key));
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (key === SYNC_KEYS.HEALTH_MEDICINE) setMedicineItems(parsed);
        else if (key === SYNC_KEYS.HEALTH_TRAVEL_KIT) setTravelItems(parsed);
        else if (key === SYNC_KEYS.HEALTH_FIRST_AID_HOME) setFirstAidHomeItems(parsed);
        else if (key === SYNC_KEYS.HEALTH_FIRST_AID_MOBILE) setFirstAidMobileItems(parsed);
        else if (key === SYNC_KEYS.HEALTH_SUPPLEMENTS) setSupplementItems(parsed);
      } catch {}
    };

    window.addEventListener('local-storage-change', handleStorageChange);
    return () => window.removeEventListener('local-storage-change', handleStorageChange);
  }, []);

  if (!isLoaded) return null;

  /* ── Aggregations ── */
  const sections: Array<{ label: string; items: MedicineItem[] }> = [
    { label: 'Medicine Inventory', items: medicineItems },
    { label: 'Travel Medical Kit', items: travelItems },
    { label: 'First Aid Home', items: firstAidHomeItems },
    { label: 'First Aid Mobile', items: firstAidMobileItems },
  ];

  const allMedicineItems: MedicineItem[] = [
    ...medicineItems,
    ...travelItems,
    ...firstAidHomeItems,
    ...firstAidMobileItems,
  ];

  const totalItems = allMedicineItems.length + supplementItems.length;
  const medStats = statsFromItems(allMedicineItems);
  const suppStats = statsFromItems(supplementItems);

  const totalOk = medStats.ok + suppStats.ok;
  const totalLow = medStats.low + suppStats.low;
  const totalMissing = medStats.missing + suppStats.missing;
  const totalExpired = medStats.expired + suppStats.expired;
  const readinessScore = totalItems > 0 ? Math.round((totalOk / totalItems) * 100) : 100;

  const readinessText =
    readinessScore >= 80
      ? 'text-emerald-500 dark:text-emerald-400'
      : readinessScore >= 60
      ? 'text-amber-500 dark:text-amber-400'
      : 'text-rose-500 dark:text-rose-400';

  const readinessBg =
    readinessScore >= 80
      ? 'bg-emerald-500'
      : readinessScore >= 60
      ? 'bg-amber-500'
      : 'bg-rose-500';

  /* ── Section breakdown ── */
  const sectionStats: SectionStats[] = [
    ...sections.map(s => ({ label: s.label, ...statsFromItems(s.items) })),
    { label: 'Supplements', ...statsFromItems(supplementItems) },
  ];

  /* ── Expiry timeline ── */
  const allItemsWithExpiry: ExpiryItem[] = [];
  sections.forEach(s =>
    s.items.forEach(i =>
      allItemsWithExpiry.push({
        name: i.itemName,
        section: s.label,
        expiryDate: i.expiryDate,
        daysUntil: getDaysUntilExpiry(i.expiryDate),
        status: getStatus(i),
      })
    )
  );
  supplementItems.forEach(i =>
    allItemsWithExpiry.push({
      name: i.itemName,
      section: 'Supplements',
      expiryDate: i.expiryDate,
      daysUntil: getDaysUntilExpiry(i.expiryDate),
      status: getStatus(i),
    })
  );
  allItemsWithExpiry.sort((a, b) => a.daysUntil - b.daysUntil);

  const expiryBuckets = [
    {
      label: 'Already Expired',
      color: 'text-zinc-600 dark:text-zinc-400',
      bg: 'bg-zinc-100 dark:bg-zinc-800',
      dayColor: 'text-zinc-500',
      items: allItemsWithExpiry.filter(i => i.daysUntil < 0),
    },
    {
      label: 'Expires in 0 – 14 Days',
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-900/10',
      dayColor: 'text-rose-500',
      items: allItemsWithExpiry.filter(i => i.daysUntil >= 0 && i.daysUntil <= 14),
    },
    {
      label: 'Expires in 15 – 30 Days',
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-900/10',
      dayColor: 'text-amber-500',
      items: allItemsWithExpiry.filter(i => i.daysUntil > 14 && i.daysUntil <= 30),
    },
    {
      label: 'Expires in 31 – 90 Days',
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/10',
      dayColor: 'text-blue-500',
      items: allItemsWithExpiry.filter(i => i.daysUntil > 30 && i.daysUntil <= 90),
    },
    {
      label: '90+ Days Away',
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-900/10',
      dayColor: 'text-emerald-500',
      items: allItemsWithExpiry.filter(i => i.daysUntil > 90),
    },
  ].filter(b => b.items.length > 0);

  /* ── Restock ── */
  const restockItems: RestockItemData[] = [
    ...sections.flatMap(s =>
      s.items
        .filter(i => getStatus(i) === 'LOW' || getStatus(i) === 'MISSING')
        .map(i => ({
          name: i.itemName,
          section: s.label,
          status: getStatus(i) as 'LOW' | 'MISSING',
          qty: i.quantity,
          target: i.targetQuantity,
        }))
    ),
    ...supplementItems
      .filter(i => getStatus(i) === 'LOW' || getStatus(i) === 'MISSING')
      .map(i => ({
        name: i.itemName,
        section: 'Supplements',
        status: getStatus(i) as 'LOW' | 'MISSING',
        qty: i.quantity,
        target: i.targetQuantity,
      })),
  ];

  /* ── Category stats ── */
  const medicineCategoryStats = MEDICINE_CATEGORIES.map(cat => {
    const catItems = allMedicineItems.filter(i => i.category === cat);
    return {
      cat,
      count: catItems.length,
      hasExpired: catItems.some(i => getStatus(i) === 'EXPIRED'),
      hasMissing: catItems.some(i => getStatus(i) === 'MISSING'),
      hasLow: catItems.some(i => getStatus(i) === 'LOW'),
    };
  });
  const maxMedicineCount = Math.max(...medicineCategoryStats.map(s => s.count), 1);

  const supplementCategoryStats = SUPPLEMENT_CATEGORIES.map(cat => {
    const catItems = supplementItems.filter(i => i.category === cat);
    return {
      cat,
      count: catItems.length,
      hasExpired: catItems.some(i => getStatus(i) === 'EXPIRED'),
      hasMissing: catItems.some(i => getStatus(i) === 'MISSING'),
      hasLow: catItems.some(i => getStatus(i) === 'LOW'),
      hasOk: catItems.some(i => getStatus(i) === 'OK'),
    };
  });
  const maxSuppCount = Math.max(...supplementCategoryStats.map(s => s.count), 1);

  /* ── Tabs ── */
  const TABS: { id: InsightTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'expiry', label: 'Expiry Timeline', icon: <Clock size={13} />, badge: totalExpired + allItemsWithExpiry.filter(i => i.daysUntil >= 0 && i.daysUntil <= 14).length },
    { id: 'categories', label: 'Categories', icon: <BarChart2 size={13} /> },
    { id: 'restock', label: 'Restock List', icon: <ShoppingCart size={13} />, badge: restockItems.length },
  ];

  /* ─────────────────────────────────────────────
     Render
  ───────────────────────────────────────────── */
  return (
    <div className="mb-14">

      {/* ── Panel Header ── */}
      <div className="flex items-center justify-between px-2 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <Activity size={18} className="text-zinc-500 dark:text-zinc-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight leading-none mb-0.5">
              Health Insights
            </h2>
            <p className="text-sm text-zinc-400 leading-none">
              Live analysis · {totalItems} items across 5 sections
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(p => !p)}
          className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 px-3 py-2 rounded-xl"
        >
          {isExpanded ? (
            <><ChevronUp size={13} /> Collapse</>
          ) : (
            <><ChevronDown size={13} /> Expand</>
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="animate-in fade-in duration-300 space-y-5">

          {/* ══════════════════════════════════════
              Widget 1 — Overview Stat Tiles
          ══════════════════════════════════════ */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">

            {/* Readiness Score */}
            <div className="col-span-2 sm:col-span-1 xl:col-span-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 shadow-sm">
              <span className="text-sm font-bold uppercase text-zinc-400 tracking-wider">Readiness</span>
              <span className={`text-5xl font-black tabular-nums leading-none ${readinessText}`}>
                {readinessScore}
                <span className="text-2xl">%</span>
              </span>
              <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${readinessBg}`}
                  style={{ width: `${readinessScore}%` }}
                />
              </div>
              <span className="text-[13px] text-zinc-400">
                {readinessScore >= 80 ? 'Well stocked' : readinessScore >= 60 ? 'Needs attention' : 'Critical gaps'}
              </span>
            </div>

            {/* Total Items */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
              <span className="text-sm font-bold uppercase text-zinc-400 tracking-wider">Total Items</span>
              <span className="text-4xl font-black text-zinc-900 dark:text-zinc-100 tabular-nums mt-auto pb-1">
                {totalItems}
              </span>
              <span className="text-[13px] text-zinc-400">5 sections</span>
            </div>

            {/* OK */}
            <div className="bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
              <span className="text-sm font-bold uppercase text-emerald-500 tracking-wider">OK</span>
              <span className="text-4xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums mt-auto pb-1">
                {totalOk}
              </span>
              <span className="text-[13px] text-zinc-400">
                {totalItems > 0 ? Math.round((totalOk / totalItems) * 100) : 0}% of inventory
              </span>
            </div>

            {/* Low Stock */}
            <div
              className={`bg-white dark:bg-zinc-900 border rounded-2xl p-5 flex flex-col justify-between shadow-sm cursor-pointer transition-all hover:-translate-y-0.5 active:scale-95 ${
                activeFilter === 'LOW'
                  ? 'border-amber-400 dark:border-amber-500 ring-2 ring-amber-300/30 dark:ring-amber-700/30'
                  : 'border-amber-200 dark:border-amber-900/30'
              }`}
              onClick={() => onFilterChange(activeFilter === 'LOW' ? 'ALL' : 'LOW')}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold uppercase text-amber-500 tracking-wider">Low Stock</span>
                {activeFilter === 'LOW' && (
                  <span className="text-[11px] font-bold text-amber-500 bg-amber-100 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-md">ON</span>
                )}
              </div>
              <span className="text-4xl font-black text-amber-600 dark:text-amber-400 tabular-nums mt-auto pb-1">
                {totalLow}
              </span>
              <span className="text-[13px] text-zinc-400">Click to filter</span>
            </div>

            {/* Missing */}
            <div
              className={`bg-white dark:bg-zinc-900 border rounded-2xl p-5 flex flex-col justify-between shadow-sm cursor-pointer transition-all hover:-translate-y-0.5 active:scale-95 ${
                activeFilter === 'MISSING'
                  ? 'border-rose-400 dark:border-rose-500 ring-2 ring-rose-300/30 dark:ring-rose-700/30'
                  : 'border-rose-200 dark:border-rose-900/30'
              }`}
              onClick={() => onFilterChange(activeFilter === 'MISSING' ? 'ALL' : 'MISSING')}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold uppercase text-rose-500 tracking-wider">Missing</span>
                {activeFilter === 'MISSING' && (
                  <span className="text-[11px] font-bold text-rose-500 bg-rose-100 dark:bg-rose-900/20 px-1.5 py-0.5 rounded-md">ON</span>
                )}
              </div>
              <span className="text-4xl font-black text-rose-600 dark:text-rose-400 tabular-nums mt-auto pb-1">
                {totalMissing}
              </span>
              <span className="text-[13px] text-zinc-400">Click to filter</span>
            </div>

            {/* Expired */}
            <div
              className={`bg-white dark:bg-zinc-900 border rounded-2xl p-5 flex flex-col justify-between shadow-sm cursor-pointer transition-all hover:-translate-y-0.5 active:scale-95 ${
                activeFilter === 'EXPIRED'
                  ? 'border-zinc-500 dark:border-zinc-400 ring-2 ring-zinc-300/30 dark:ring-zinc-600/30'
                  : 'border-zinc-200 dark:border-zinc-700'
              }`}
              onClick={() => onFilterChange(activeFilter === 'EXPIRED' ? 'ALL' : 'EXPIRED')}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold uppercase text-zinc-500 tracking-wider">Expired</span>
                {activeFilter === 'EXPIRED' && (
                  <span className="text-[11px] font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md">ON</span>
                )}
              </div>
              <span className="text-4xl font-black text-zinc-600 dark:text-zinc-400 tabular-nums mt-auto pb-1">
                {totalExpired}
              </span>
              <span className="text-[13px] text-zinc-400">Click to filter</span>
            </div>
          </div>

          {/* Section Health Breakdown */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
            <h3 className="text-[13px] font-bold uppercase text-zinc-400 tracking-wider mb-5">
              Section Health Breakdown
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
              {sectionStats.map(s => {
                const health = s.total > 0 ? Math.round((s.ok / s.total) * 100) : 100;
                const barColor =
                  s.total === 0
                    ? 'bg-zinc-200 dark:bg-zinc-700'
                    : health >= 80
                    ? 'bg-emerald-500'
                    : health >= 60
                    ? 'bg-amber-500'
                    : 'bg-rose-500';
                return (
                  <div key={s.label} className="flex flex-col gap-2">
                    <div className="flex justify-between items-baseline gap-1">
                      <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 truncate">
                        {s.label}
                      </span>
                      <span className="text-xs text-zinc-400 shrink-0 tabular-nums">
                        {s.total}
                      </span>
                    </div>
                    <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                        style={{ width: s.total === 0 ? '0%' : `${health}%` }}
                      />
                    </div>
                    <div className="flex gap-2 flex-wrap min-h-[16px]">
                      {s.total === 0 && (
                        <span className="text-xs text-zinc-400">No items</span>
                      )}
                      {s.expired > 0 && (
                        <span className="text-xs font-bold text-zinc-500">{s.expired} expired</span>
                      )}
                      {s.missing > 0 && (
                        <span className="text-xs font-bold text-rose-500">{s.missing} missing</span>
                      )}
                      {s.low > 0 && (
                        <span className="text-xs font-bold text-amber-500">{s.low} low</span>
                      )}
                      {s.total > 0 && s.expired === 0 && s.missing === 0 && s.low === 0 && (
                        <span className="text-xs font-bold text-emerald-500">All good ✓</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active filter banner */}
          {activeFilter !== 'ALL' && (
            <div className="flex items-center gap-3 px-1">
              <span className="text-[13px] text-zinc-500">Filtering all sections by:</span>
              <span
                className={`text-[13px] font-bold px-2.5 py-1 rounded-md ${
                  activeFilter === 'LOW'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                    : activeFilter === 'MISSING'
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400'
                    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                }`}
              >
                {activeFilter}
              </span>
              <button
                onClick={() => onFilterChange('ALL')}
                className="text-[13px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 font-bold underline underline-offset-2 transition-colors"
              >
                Clear filter
              </button>
            </div>
          )}

          {/* ══════════════════════════════════════
              Widgets 2–5 — Tabbed Panel
          ══════════════════════════════════════ */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">

            {/* Tab Bar */}
            <div className="flex flex-wrap border-b border-zinc-100 dark:border-zinc-800">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-4 text-[13px] font-bold whitespace-nowrap transition-all border-b-2 -mb-px ${
                    activeTab === tab.id
                      ? 'border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100'
                      : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span
                      className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                        tab.id === 'restock'
                          ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'
                          : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-6 h-[600px] overflow-y-auto scrollbar-hover">

              {/* ── Widget 2: Expiry Timeline ── */}
              {activeTab === 'expiry' && (
                <div className="animate-in fade-in duration-300">
                  <p className="text-[13px] text-zinc-400 mb-5">
                    All {allItemsWithExpiry.length} items sorted by expiry date, across every section.
                  </p>

                  {allItemsWithExpiry.length === 0 ? (
                    <div className="py-12 text-center text-sm text-zinc-400 uppercase tracking-wider">
                      No items tracked yet
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {expiryBuckets.map(bucket => (
                        <div key={bucket.label}>
                          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${bucket.bg} mb-3`}>
                            <span className={`text-xs font-bold uppercase tracking-wider ${bucket.color}`}>
                              {bucket.label}
                            </span>
                            <span className={`text-xs font-bold ${bucket.color}`}>
                              · {bucket.items.length}
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {bucket.items.map((item, idx) => (
                              <div
                                key={`${item.name}-${idx}`}
                                className="flex items-center justify-between py-2.5 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50"
                              >
                                <div className="flex flex-col min-w-0 pr-4">
                                  <span className="text-base font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                                    {item.name}
                                  </span>
                                  <span className="text-[12px] text-zinc-400">{item.section}</span>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <span className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400 tabular-nums">
                                    {new Date(item.expiryDate).toLocaleDateString(undefined, {
                                      month: 'short',
                                      day: 'numeric',
                                      year: '2-digit',
                                    })}
                                  </span>
                                  <span className={`text-[13px] font-bold tabular-nums ${bucket.dayColor}`}>
                                    {item.daysUntil < 0
                                      ? `${Math.abs(item.daysUntil)}d ago`
                                      : `in ${item.daysUntil}d`}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Widget 3: Category Breakdown ── */}
              {activeTab === 'categories' && (
                <div className="animate-in fade-in duration-300 space-y-8">

                  {/* Medicine Categories */}
                  <div>
                    <h3 className="text-xs font-bold uppercase text-zinc-400 tracking-wider mb-5">
                      Medicine Categories — All Kits Combined
                    </h3>
                    {allMedicineItems.length === 0 ? (
                      <p className="text-sm text-zinc-400">No medicine items tracked yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {medicineCategoryStats
                          .filter(s => s.count > 0)
                          .map(s => {
                            const width = Math.max(Math.round((s.count / maxMedicineCount) * 100), 4);
                            const barColor = s.hasExpired
                              ? 'bg-zinc-400'
                              : s.hasMissing
                              ? 'bg-rose-500'
                              : s.hasLow
                              ? 'bg-amber-500'
                              : 'bg-emerald-500';
                            return (
                              <div key={s.cat}>
                                <div className="flex justify-between items-baseline mb-1.5">
                                  <span className="text-[13px] font-semibold text-zinc-700 dark:text-zinc-300 truncate pr-4">
                                    {s.cat}
                                  </span>
                                  <span className="text-[13px] font-bold text-zinc-400 shrink-0 tabular-nums">
                                    {s.count}
                                  </span>
                                </div>
                                <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                                    style={{ width: `${width}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        {medicineCategoryStats.every(s => s.count === 0) && (
                          <p className="text-sm text-zinc-400">No items in any category yet.</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-zinc-100 dark:border-zinc-800" />

                  {/* Supplement Categories */}
                  <div>
                    <h3 className="text-xs font-bold uppercase text-zinc-400 tracking-wider mb-5">
                      Supplement Categories
                    </h3>
                    <div className="space-y-3">
                      {supplementCategoryStats.map(s => {
                        const width = s.count > 0 ? Math.max(Math.round((s.count / maxSuppCount) * 100), 4) : 0;
                        const barColor =
                          s.count === 0
                            ? 'bg-zinc-200 dark:bg-zinc-700'
                            : s.hasExpired
                            ? 'bg-zinc-400'
                            : s.hasMissing
                            ? 'bg-rose-500'
                            : s.hasLow
                            ? 'bg-amber-500'
                            : 'bg-emerald-500';
                        return (
                          <div key={s.cat}>
                            <div className="flex justify-between items-baseline mb-1.5">
                              <span
                                className={`text-[13px] font-semibold truncate pr-4 ${
                                  s.count === 0
                                    ? 'text-zinc-400'
                                    : 'text-zinc-700 dark:text-zinc-300'
                                }`}
                              >
                                {s.cat}
                              </span>
                              <span
                                className={`text-[13px] font-bold shrink-0 tabular-nums ${
                                  s.count === 0 ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-400'
                                }`}
                              >
                                {s.count}
                              </span>
                            </div>
                            <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                                style={{ width: s.count === 0 ? '2%' : `${width}%`, opacity: s.count === 0 ? 0.3 : 1 }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {supplementItems.length === 0 && (
                      <p className="text-sm text-zinc-400 mt-3">No supplements tracked yet.</p>
                    )}
                  </div>
                </div>
              )}

              {/* ── Widget 4: Restocking Checklist ── */}
              {activeTab === 'restock' && (
                <div className="animate-in fade-in duration-300">
                  {restockItems.length === 0 ? (
                    <div className="py-12 flex flex-col items-center gap-3">
                      <CheckCircle2 size={36} className="text-emerald-500" />
                      <span className="text-base font-bold text-zinc-700 dark:text-zinc-300">
                        All stocked up!
                      </span>
                      <span className="text-[13px] text-zinc-400">
                        No items need restocking right now.
                      </span>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[13px] text-zinc-400 mb-5">
                        {restockItems.length} item{restockItems.length !== 1 ? 's' : ''} need
                        restocking. Tap a section to collapse, tap an item to check it off.
                      </p>
                      {['Medicine Inventory', 'Travel Medical Kit', 'First Aid Home', 'First Aid Mobile', 'Supplements'].map(
                        section => {
                          const sectionItems = restockItems.filter(i => i.section === section);
                          if (sectionItems.length === 0) return null;
                          const isOpen = expandedRestockSections[section] !== false;
                          return (
                            <div key={section} className="mb-4 border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden">
                              {/* Collapsible header */}
                              <button
                                onClick={() => toggleRestockSection(section)}
                                className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                              >
                                <span className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400 tracking-wider">
                                  {section}
                                  <span className="ml-2 text-zinc-400 dark:text-zinc-500">({sectionItems.length})</span>
                                </span>
                                {isOpen
                                  ? <ChevronUp size={13} className="text-zinc-400" />
                                  : <ChevronDown size={13} className="text-zinc-400" />}
                              </button>
                              {/* Items */}
                              {isOpen && (
                                <div className="p-2 space-y-1">
                                  {sectionItems.map((item, idx) => (
                                    <RestockRow key={`${item.name}-${idx}`} item={item} />
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Widget 5 (Supplement Routine) was moved below the Supplement Section on the page */}
              {false && (
                <div className="animate-in fade-in duration-300 space-y-8">

                  {/* Summary tiles */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl px-4 py-3.5">
                      <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider block mb-2">
                        Total Tracked
                      </span>
                      <span className="text-3xl font-black text-zinc-900 dark:text-zinc-100 tabular-nums">
                        {supplementItems.length}
                      </span>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl px-4 py-3.5">
                      <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider block mb-2">
                        Categories
                      </span>
                      <span className="text-3xl font-black text-zinc-900 dark:text-zinc-100 tabular-nums">
                        {supplementCategoryStats.filter(c => c.count > 0).length}
                        <span className="text-base font-bold text-zinc-400"> / {SUPPLEMENT_CATEGORIES.length}</span>
                      </span>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-xl px-4 py-3.5">
                      <span className="text-[10px] font-bold uppercase text-emerald-500 tracking-wider block mb-2">
                        OK
                      </span>
                      <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {suppStats.ok}
                      </span>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl px-4 py-3.5">
                      <span className="text-[10px] font-bold uppercase text-amber-500 tracking-wider block mb-2">
                        Need Action
                      </span>
                      <span className="text-3xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
                        {suppStats.low + suppStats.missing + suppStats.expired}
                      </span>
                    </div>
                  </div>

                  {supplementItems.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-[11px] text-zinc-400">
                        No supplements tracked yet. Add some in the Supplement Section below.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Frequency Groups */}
                      <div>
                        <h3 className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider mb-4">
                          Routine by Frequency
                        </h3>
                        <div className="space-y-5">
                          {FREQ_ORDER.filter(g => supplementsByFreq[g]?.length > 0).map(group => (
                            <div key={group}>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wide">
                                  {group}
                                </span>
                                <span className="text-[10px] font-bold text-zinc-400">
                                  · {supplementsByFreq[group].length}
                                </span>
                              </div>
                              <div className="space-y-1.5">
                                {supplementsByFreq[group].map(item => {
                                  const st = getStatus(item);
                                  const dotColor =
                                    st === 'OK'
                                      ? 'bg-emerald-500'
                                      : st === 'LOW'
                                      ? 'bg-amber-500'
                                      : st === 'MISSING'
                                      ? 'bg-rose-500'
                                      : 'bg-zinc-400';
                                  return (
                                    <div
                                      key={item.id}
                                      className="flex items-center justify-between py-2.5 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50"
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                                        <div className="min-w-0">
                                          <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 block truncate">
                                            {item.itemName}
                                          </span>
                                          <span className="text-[10px] text-zinc-400">
                                            {item.dose} · {item.category}
                                          </span>
                                        </div>
                                      </div>
                                      <span className="text-[10px] font-medium text-zinc-400 shrink-0 pl-2">
                                        {item.frequency}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Category Coverage */}
                      <div>
                        <h3 className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider mb-4">
                          Category Coverage
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {supplementCategoryStats.map(({ cat, count, hasOk }) => (
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
                              <div
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  count === 0
                                    ? 'bg-zinc-300 dark:bg-zinc-600'
                                    : hasOk
                                    ? 'bg-emerald-500'
                                    : 'bg-amber-500'
                                }`}
                              />
                              <span className="flex-1 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 truncate">
                                {cat}
                              </span>
                              <span
                                className={`text-[10px] font-bold shrink-0 ${
                                  count === 0
                                    ? 'text-zinc-400'
                                    : hasOk
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-amber-600 dark:text-amber-400'
                                }`}
                              >
                                {count === 0 ? 'Not tracked' : `${count} item${count !== 1 ? 's' : ''}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

            </div>{/* /tab content */}
          </div>{/* /tabbed panel */}

        </div>
      )}
    </div>
  );
}
