"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { GroceryPlanItem, ExpenseRecord } from '@/types/finance';
import { SYNC_KEYS } from '@/lib/sync-keys';
import { getPrefixedKey } from '@/lib/keys';
import { setSyncedItem } from '@/lib/storage';
import { convertToINR, convertToCAD, getExchangeRate } from '@/lib/finances';

interface GroceryPlanProps {
  records: ExpenseRecord[];
}

const DEFAULT_CATEGORIES = [
  '🥛 Dairy & Refrigerated',
  '🥩 Protein (Meat & Alternatives)',
  '🌾 Grains & Staples',
  '🥕 Vegetables',
  '🍎 Fruits',
  '🧂 Essentials',
  '🧼 Household Items',
  '📦 Other'
];

const MOCK_ITEMS: GroceryPlanItem[] = [
  // Dairy & Refrigerated
  { id: 'm1', name: 'Milk', category: '🥛 Dairy & Refrigerated', plannedQuantity: 4, unitSize: '1L', frequency: 'Weekly', idealTiming: 'Every Sunday', expectedPrice: 2, currency: 'CAD', checkedUnits: [] },
  { id: 'm2', name: 'Paneer', category: '🥛 Dairy & Refrigerated', plannedQuantity: 2, unitSize: '400g', frequency: 'Bi-Weekly', idealTiming: '', expectedPrice: 5, currency: 'CAD', checkedUnits: [] },
  { id: 'm3', name: 'Curd', category: '🥛 Dairy & Refrigerated', plannedQuantity: 4, unitSize: '750g', frequency: 'Weekly', idealTiming: '', expectedPrice: 3, currency: 'CAD', checkedUnits: [] },
  // Protein
  { id: 'p1', name: 'Chicken', category: '🥩 Protein (Meat & Alternatives)', plannedQuantity: 2, unitSize: '1kg', frequency: 'Bi-Weekly', idealTiming: '', expectedPrice: 15, currency: 'CAD', checkedUnits: [] },
  { id: 'p2', name: 'Fish', category: '🥩 Protein (Meat & Alternatives)', plannedQuantity: 1, unitSize: '1kg', frequency: 'Monthly', idealTiming: '', expectedPrice: 20, currency: 'CAD', checkedUnits: [] },
  { id: 'p3', name: 'Chickpeas', category: '🥩 Protein (Meat & Alternatives)', plannedQuantity: 2, unitSize: '1kg', frequency: 'Monthly', idealTiming: '', expectedPrice: 4, currency: 'CAD', checkedUnits: [] },
  // Grains & Staples
  { id: 'g1', name: 'Aata (Flour)', category: '🌾 Grains & Staples', plannedQuantity: 1, unitSize: '10kg', frequency: 'Monthly', idealTiming: 'Start of month', expectedPrice: 18, currency: 'CAD', checkedUnits: [] },
  { id: 'g2', name: 'Rice', category: '🌾 Grains & Staples', plannedQuantity: 1, unitSize: '5kg', frequency: 'Monthly', idealTiming: '', expectedPrice: 12, currency: 'CAD', checkedUnits: [] },
  { id: 'g3', name: 'Oats', category: '🌾 Grains & Staples', plannedQuantity: 1, unitSize: '1kg', frequency: 'Monthly', idealTiming: '', expectedPrice: 4, currency: 'CAD', checkedUnits: [] },
  { id: 'g4', name: 'Dalia', category: '🌾 Grains & Staples', plannedQuantity: 1, unitSize: '500g', frequency: 'Monthly', idealTiming: '', expectedPrice: 3, currency: 'CAD', checkedUnits: [] },
  { id: 'g5', name: 'Suji', category: '🌾 Grains & Staples', plannedQuantity: 1, unitSize: '500g', frequency: 'Monthly', idealTiming: '', expectedPrice: 2, currency: 'CAD', checkedUnits: [] },
  { id: 'g6', name: 'Besan', category: '🌾 Grains & Staples', plannedQuantity: 1, unitSize: '1kg', frequency: 'Monthly', idealTiming: '', expectedPrice: 5, currency: 'CAD', checkedUnits: [] },
  // Vegetables
  { id: 'v1', name: 'Onion', category: '🥕 Vegetables', plannedQuantity: 2, unitSize: '2kg', frequency: 'Bi-Weekly', idealTiming: '', expectedPrice: 4, currency: 'CAD', checkedUnits: [] },
  { id: 'v2', name: 'Tomato', category: '🥕 Vegetables', plannedQuantity: 4, unitSize: '1kg', frequency: 'Weekly', idealTiming: '', expectedPrice: 3, currency: 'CAD', checkedUnits: [] },
  { id: 'v3', name: 'Ginger', category: '🥕 Vegetables', plannedQuantity: 1, unitSize: '250g', frequency: 'Monthly', idealTiming: '', expectedPrice: 2, currency: 'CAD', checkedUnits: [] },
  { id: 'v4', name: 'Garlic', category: '🥕 Vegetables', plannedQuantity: 1, unitSize: '250g', frequency: 'Monthly', idealTiming: '', expectedPrice: 2, currency: 'CAD', checkedUnits: [] },
  { id: 'v5', name: 'Potato', category: '🥕 Vegetables', plannedQuantity: 2, unitSize: '5kg', frequency: 'Bi-Weekly', idealTiming: '', expectedPrice: 6, currency: 'CAD', checkedUnits: [] },
  { id: 'v6', name: 'Matar (Peas)', category: '🥕 Vegetables', plannedQuantity: 1, unitSize: '1kg', frequency: 'Monthly', idealTiming: '', expectedPrice: 4, currency: 'CAD', checkedUnits: [] },
  { id: 'v7', name: 'Corn', category: '🥕 Vegetables', plannedQuantity: 1, unitSize: '500g', frequency: 'Monthly', idealTiming: '', expectedPrice: 3, currency: 'CAD', checkedUnits: [] },
  { id: 'v8', name: 'Green Vegetables', category: '🥕 Vegetables', plannedQuantity: 4, unitSize: '1bunch', frequency: 'Weekly', idealTiming: '', expectedPrice: 5, currency: 'CAD', checkedUnits: [] },
  // Fruits
  { id: 'f1', name: 'Fruit', category: '🍎 Fruits', plannedQuantity: 4, unitSize: 'Assorted', frequency: 'Weekly', idealTiming: '', expectedPrice: 10, currency: 'CAD', checkedUnits: [] },
  { id: 'f2', name: 'Dry Fruits', category: '🍎 Fruits', plannedQuantity: 1, unitSize: 'Mixed', frequency: 'Monthly', idealTiming: '', expectedPrice: 25, currency: 'CAD', checkedUnits: [] },
  // Essentials
  { id: 'e1', name: 'Sugar', category: '🧂 Essentials', plannedQuantity: 1, unitSize: '2kg', frequency: 'Monthly', idealTiming: '', expectedPrice: 4, currency: 'CAD', checkedUnits: [] },
  { id: 'e2', name: 'Salt', category: '🧂 Essentials', plannedQuantity: 1, unitSize: '1kg', frequency: 'Monthly', idealTiming: '', expectedPrice: 2, currency: 'CAD', checkedUnits: [] },
  { id: 'e3', name: 'Ghee', category: '🧂 Essentials', plannedQuantity: 1, unitSize: '1L', frequency: 'Monthly', idealTiming: '', expectedPrice: 15, currency: 'CAD', checkedUnits: [] },
  { id: 'e4', name: 'Vegetable Oil', category: '🧂 Essentials', plannedQuantity: 1, unitSize: '3L', frequency: 'Monthly', idealTiming: '', expectedPrice: 10, currency: 'CAD', checkedUnits: [] },
  { id: 'e5', name: 'Lemon Juice', category: '🧂 Essentials', plannedQuantity: 1, unitSize: 'Bottle', frequency: 'Monthly', idealTiming: '', expectedPrice: 3, currency: 'CAD', checkedUnits: [] },
  { id: 'e6', name: 'Ketchup', category: '🧂 Essentials', plannedQuantity: 1, unitSize: 'Bottle', frequency: 'Monthly', idealTiming: '', expectedPrice: 4, currency: 'CAD', checkedUnits: [] },
  // Household Items
  { id: 'h1', name: 'Dishwasher Soap', category: '🧼 Household Items', plannedQuantity: 1, unitSize: 'Pack', frequency: 'Monthly', idealTiming: '', expectedPrice: 8, currency: 'CAD', checkedUnits: [] }
];

export function GroceryPlan({ records }: GroceryPlanProps) {
  const [items, setItems] = useState<GroceryPlanItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>(DEFAULT_CATEGORIES[0]);
  const [plannedQuantity, setPlannedQuantity] = useState('');
  const [unitSize, setUnitSize] = useState('');
  const [frequency, setFrequency] = useState<GroceryPlanItem['frequency']>('Weekly');
  const [idealTiming, setIdealTiming] = useState('');
  const [expectedPrice, setExpectedPrice] = useState('');
  const [currency, setCurrency] = useState<'INR' | 'CAD'>('CAD');

  useEffect(() => {
    const saved = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_GROCERY_PLAN));
    const isMockSeeded = localStorage.getItem('MOCK_SEEDED_V1');
    if (!isMockSeeded) {
      setItems(MOCK_ITEMS);
      setSyncedItem(SYNC_KEYS.FINANCES_GROCERY_PLAN, JSON.stringify(MOCK_ITEMS));
      localStorage.setItem('MOCK_SEEDED_V1', 'true');
    } else if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setItems(parsed);
      } catch (e) {
        setItems(MOCK_ITEMS);
      }
    } else {
      setItems(MOCK_ITEMS);
      setSyncedItem(SYNC_KEYS.FINANCES_GROCERY_PLAN, JSON.stringify(MOCK_ITEMS));
    }
    setIsLoaded(true);
  }, []);

  const saveItems = (newItems: GroceryPlanItem[]) => {
    setItems(newItems);
    setSyncedItem(SYNC_KEYS.FINANCES_GROCERY_PLAN, JSON.stringify(newItems));
  };

  const currentMonthRecords = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return records.filter(r => {
      const d = new Date(r.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && r.category === 'Grocery';
    });
  }, [records]);

  const loggedQuantitiesByName = useMemo(() => {
    const map: Record<string, number> = {};
    currentMonthRecords.forEach(record => {
      if (record.items && record.items.length > 0) {
        record.items.forEach(item => {
          const n = item.name.toLowerCase();
          const q = parseFloat(item.quantity) || 1;
          if (!map[n]) map[n] = 0;
          map[n] += q;
        });
      } else {
        const n = (record.subcategory || record.category).toLowerCase();
        const q = parseFloat(record.quantity || '1') || 1;
        if (!map[n]) map[n] = 0;
        map[n] += q;
      }
    });
    return map;
  }, [currentMonthRecords]);

  const { plannedTotalINR, projectedTotalINR, plannedTotalCAD, projectedTotalCAD } = useMemo(() => {
    let planned = 0;
    let projected = 0;
    items.forEach(item => {
      const planCostINR = convertToINR(item.expectedPrice * item.plannedQuantity, item.currency, getExchangeRate());
      planned += planCostINR;

      const loggedQty = loggedQuantitiesByName[item.name.toLowerCase()] || 0;
      if (loggedQty > item.plannedQuantity) {
        projected += convertToINR(item.expectedPrice * loggedQty, item.currency, getExchangeRate());
      } else {
        projected += planCostINR;
      }
    });

    const plannedNames = items.map(i => i.name.toLowerCase());
    currentMonthRecords.forEach(record => {
      if (record.items && record.items.length > 0) {
        record.items.forEach(item => {
          if (!plannedNames.includes(item.name.toLowerCase())) {
            projected += convertToINR(item.totalPrice, record.currency, getExchangeRate());
          }
        });
      } else {
        const n = (record.subcategory || record.category).toLowerCase();
        if (!plannedNames.includes(n)) {
          projected += convertToINR(record.amount, record.currency, getExchangeRate());
        }
      }
    });

    return { 
      plannedTotalINR: planned, 
      projectedTotalINR: projected,
      plannedTotalCAD: convertToCAD(planned),
      projectedTotalCAD: convertToCAD(projected)
    };
  }, [items, currentMonthRecords, loggedQuantitiesByName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(plannedQuantity) || 1;
    const newItem: GroceryPlanItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: name.trim(),
      category,
      plannedQuantity: qty,
      unitSize,
      frequency,
      idealTiming,
      expectedPrice: parseFloat(expectedPrice) || 0,
      currency,
      checkedUnits: new Array(qty).fill(false)
    };
    saveItems([...items, newItem]);
    
    setName('');
    setPlannedQuantity('');
    setUnitSize('');
    setFrequency('Weekly');
    setIdealTiming('');
    setExpectedPrice('');
    setIsFormOpen(false);
  };

  const deleteItem = (id: string) => {
    saveItems(items.filter(i => i.id !== id));
  };

  const toggleCheckbox = (id: string, index: number) => {
    const newItems = items.map(i => {
      if (i.id === id) {
        const checks = [...(i.checkedUnits || new Array(i.plannedQuantity).fill(false))];
        checks[index] = !checks[index];
        return { ...i, checkedUnits: checks };
      }
      return i;
    });
    saveItems(newItems);
  };

  // Group items by category for the table
  const groupedItems = useMemo(() => {
    const groups: Record<string, GroceryPlanItem[]> = {};
    DEFAULT_CATEGORIES.forEach(c => groups[c] = []);
    items.forEach(item => {
      const cat = item.category || '📦 Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [items]);

  if (!isLoaded) return null;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-700 delay-100">
      
      {/* Header & Metrics */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-6 md:p-8 bg-zinc-900 dark:bg-zinc-800 rounded-[40px] text-white shadow-xl relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/20 rounded-full blur-3xl -mr-10 -mt-20 pointer-events-none" />
         
         <div className="flex flex-col gap-2 relative z-10">
            <h2 className="text-2xl font-bold uppercase tracking-[0.2em]">Monthly Grocery Plan</h2>
            <p className="text-sm text-zinc-400 font-medium max-w-sm">Compact table tracking for planned food budget vs actual spending.</p>
         </div>

         <div className="flex gap-4 md:gap-8 relative z-10">
            <div className="flex flex-col items-start md:items-end">
               <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Planned Cost</span>
               <span className="text-2xl md:text-3xl font-bold tracking-tight">
                  ₹{plannedTotalINR.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  <span className="text-sm md:text-lg opacity-40 ml-2 font-medium tracking-normal">(C${plannedTotalCAD.toLocaleString('en-CA', { maximumFractionDigits: 0 })})</span>
               </span>
            </div>
            <div className="w-px h-12 bg-zinc-800 hidden md:block" />
            <div className="flex flex-col items-start md:items-end">
               <span className="text-xs uppercase tracking-widest text-teal-500/80 font-bold">Projected</span>
               <span className="text-2xl md:text-3xl font-bold tracking-tight text-teal-400">
                  ₹{projectedTotalINR.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  <span className="text-sm md:text-lg opacity-60 ml-2 font-medium tracking-normal text-teal-500/50">(C${projectedTotalCAD.toLocaleString('en-CA', { maximumFractionDigits: 0 })})</span>
               </span>
            </div>
         </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[40px] p-6 lg:p-8 shadow-xl flex flex-col gap-8">
         <div className="flex justify-between items-center">
            <h3 className="uppercase tracking-[0.3em] font-bold text-sm text-zinc-400">Master Grocery List</h3>
            <button 
              onClick={() => setIsFormOpen(!isFormOpen)}
              className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-xs font-bold uppercase tracking-widest transition-all text-zinc-600 dark:text-zinc-300 shadow-sm"
            >
              {isFormOpen ? 'Cancel' : '➕ Add Item'}
            </button>
         </div>

         {/* Add Item Form */}
         {isFormOpen && (
           <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 p-4 bg-zinc-50 dark:bg-zinc-950/50 rounded-3xl border border-zinc-100 dark:border-zinc-800 animate-in slide-in-from-top-4 duration-300">
              <div className="lg:col-span-2 flex flex-col gap-1.5">
                 <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-2">Item Name</label>
                 <input required type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Milk" className="w-full bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 outline-none text-sm focus:ring-2 focus:ring-teal-500/20" />
              </div>
              <div className="lg:col-span-1 flex flex-col gap-1.5">
                 <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-2">Category</label>
                 <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 outline-none text-sm appearance-none focus:ring-2 focus:ring-teal-500/20">
                    {DEFAULT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
              </div>
              
              <div className="lg:col-span-2 flex flex-col gap-1.5">
                 <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-2">Expected Price (ea)</label>
                 <div className="flex gap-2">
                   <select value={currency} onChange={e => setCurrency(e.target.value as any)} className="bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 outline-none text-sm appearance-none min-w-[4rem]">
                      <option value="CAD">CAD</option><option value="INR">INR</option>
                   </select>
                   <input required type="number" step="0.01" value={expectedPrice} onChange={e => setExpectedPrice(e.target.value)} placeholder="0.00" className="w-full bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 outline-none text-sm focus:ring-2 focus:ring-teal-500/20" />
                 </div>
              </div>

              <div className="lg:col-span-1 flex flex-col gap-1.5">
                 <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-2">Total Units</label>
                 <input required type="number" min="1" value={plannedQuantity} onChange={e => setPlannedQuantity(e.target.value)} placeholder="e.g. 4" className="w-full bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 outline-none text-sm focus:ring-2 focus:ring-teal-500/20" />
              </div>

              <div className="lg:col-span-1 flex flex-col gap-1.5">
                 <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-2">Unit Size</label>
                 <input type="text" value={unitSize} onChange={e => setUnitSize(e.target.value)} placeholder="e.g. 1kg" className="w-full bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 outline-none text-sm focus:ring-2 focus:ring-teal-500/20" />
              </div>

              <div className="lg:col-span-1 flex flex-col gap-1.5">
                 <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-2">Frequency</label>
                 <select value={frequency} onChange={e => setFrequency(e.target.value as any)} className="w-full bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 outline-none text-sm appearance-none focus:ring-2 focus:ring-teal-500/20">
                    <option value="Daily">Daily</option><option value="Weekly">Weekly</option><option value="Bi-Weekly">Bi-Weekly</option><option value="Monthly">Monthly</option><option value="As Needed">As Needed</option>
                 </select>
              </div>

              <div className="lg:col-span-2 flex flex-col gap-1.5">
                 <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-2">Ideal Timing</label>
                 <input type="text" value={idealTiming} onChange={e => setIdealTiming(e.target.value)} placeholder="e.g. Every Sunday" className="w-full bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 outline-none text-sm focus:ring-2 focus:ring-teal-500/20" />
              </div>

              <div className="col-span-full flex justify-end mt-1">
                 <button type="submit" className="px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-xs font-bold uppercase tracking-widest shadow-md hover:-translate-y-0.5 transition-all">
                    Save Plan Item
                 </button>
              </div>
           </form>
         )}

         {/* Compact Grouped Table */}
         <div className="overflow-x-auto overflow-y-auto max-h-[800px] border border-zinc-100 dark:border-zinc-800 rounded-3xl custom-scrollbar relative">
            <table className="w-full text-left border-collapse min-w-[800px]">
               <thead className="bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-20 shadow-sm border-b border-zinc-100 dark:border-zinc-800">
                  <tr>
                     <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Grocery Item</th>
                     <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Freq & Size</th>
                     <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Est. Price ea</th>
                     <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 w-48">Tracker Progress</th>
                     <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 text-right">Total Est.</th>
                     <th className="p-4"></th>
                  </tr>
               </thead>
               <tbody>
                  {Object.entries(groupedItems).map(([categoryName, catItems]) => {
                     if (catItems.length === 0) return null;
                     return (
                        <React.Fragment key={categoryName}>
                           {/* Category Header Row */}
                           <tr className="bg-zinc-100/50 dark:bg-zinc-800/30 border-b border-zinc-100 dark:border-zinc-800">
                              <td colSpan={6} className="px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-300">
                                 {categoryName}
                              </td>
                           </tr>
                           
                           {/* Items */}
                           {catItems.map((item) => {
                              const loggedQty = loggedQuantitiesByName[item.name.toLowerCase()] || 0;
                              const isExceeded = loggedQty > item.plannedQuantity;
                              
                              const totalItemCostCAD = convertToINR(item.expectedPrice * item.plannedQuantity, item.currency, 1 / getExchangeRate());
                              const totalItemCostINR = convertToINR(item.expectedPrice * item.plannedQuantity, item.currency, getExchangeRate());
                              const localCost = item.expectedPrice * item.plannedQuantity;

                              const numBoxes = item.plannedQuantity;
                              const checks = item.checkedUnits || new Array(numBoxes).fill(false);
                              
                              return (
                                 <tr key={item.id} className={`group hover:bg-zinc-50 dark:hover:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800/50 transition-colors ${isExceeded ? 'bg-rose-50/30 dark:bg-rose-900/10' : ''}`}>
                                    <td className="p-4 max-w-[200px]">
                                       <div className="flex flex-col gap-0.5">
                                          <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">{item.name}</span>
                                          {item.idealTiming && <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium truncate">{item.idealTiming}</span>}
                                       </div>
                                    </td>
                                    <td className="p-4">
                                       <div className="flex flex-col gap-0.5">
                                          <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{item.plannedQuantity} × {item.unitSize || '1 Unit'}</span>
                                          <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">{item.frequency}</span>
                                       </div>
                                    </td>
                                    <td className="p-4 text-xs font-bold text-zinc-600 dark:text-zinc-400">
                                       {item.currency === 'CAD' ? 'C$' : '₹'}{item.expectedPrice.toLocaleString(item.currency === 'CAD' ? 'en-CA' : 'en-IN')}
                                    </td>
                                    <td className="p-4">
                                       <div className="flex flex-wrap gap-1.5 items-center">
                                          <span className={`text-[10px] font-bold w-6 mr-1 ${isExceeded ? 'text-rose-500' : 'text-zinc-400'}`}>
                                             {loggedQty} / {item.plannedQuantity}
                                          </span>
                                          {Array.from({ length: Math.min(numBoxes, 20) }).map((_, i) => {
                                             const autoFilled = loggedQty > i;
                                             const isChecked = checks[i] || autoFilled;
                                             return (
                                                <button 
                                                   key={i} type="button" onClick={() => toggleCheckbox(item.id, i)}
                                                   className={`w-5 h-5 rounded flex items-center justify-center transition-all ${isChecked ? (autoFilled ? 'bg-teal-500 shadow text-white' : 'bg-zinc-800 text-white') : 'bg-zinc-100 dark:bg-zinc-800/50 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
                                                >
                                                   {isChecked && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                                </button>
                                             );
                                          })}
                                          {numBoxes > 20 && <span className="text-[10px] text-zinc-400">+{numBoxes - 20}</span>}
                                       </div>
                                    </td>
                                    <td className="p-4 text-right">
                                       <div className="flex flex-col items-end gap-0.5">
                                          <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-white">
                                                 ₹{totalItemCostINR.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                          </span>
                                          <span className="text-[10px] text-zinc-500 font-medium">
                                             (C${convertToCAD(totalItemCostINR).toLocaleString('en-CA', { maximumFractionDigits: 1 })})
                                          </span>
                                       </div>
                                    </td>
                                    <td className="p-4 text-right">
                                       <button 
                                          onClick={() => deleteItem(item.id)}
                                          className="p-2 text-zinc-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                       >
                                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                       </button>
                                    </td>
                                 </tr>
                              );
                           })}
                        </React.Fragment>
                     );
                  })}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}
