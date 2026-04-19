"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { GroceryPlanItem, ExpenseRecord } from '@/types/finance';
import { List, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react';
import { SYNC_KEYS } from '@/lib/sync-keys';
import { setSyncedItem } from '@/lib/storage';
import { Modal } from '../ui/Modal';
import { DynamicForm } from '../ui/DynamicForm';
import { SectionTitle, Text } from '../ui/Text';
import { useStorageSubscription } from '@/hooks/useStorageSubscription';

interface GroceryPlanProps {
  records: ExpenseRecord[];
  viewingDate: Date;
  onDateChange: (date: Date) => void;
}

const DEFAULT_CATEGORIES = ['Dairy & Refrigerated', 'Protein (Meat & Alternatives)', 'Grains & Staples', 'Vegetables', 'Fruits', 'Essentials', 'Household Items', 'Other'];

export function GroceryPlan({ records, viewingDate, onDateChange }: GroceryPlanProps) {
  const items = useStorageSubscription<GroceryPlanItem[]>(SYNC_KEYS.FINANCES_GROCERY_PLAN, []);
  const viewMode = useStorageSubscription<'table' | 'card'>(SYNC_KEYS.PANTRY_GROCERY_VIEW_MODE, 'table');
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '', category: DEFAULT_CATEGORIES[0], plannedQuantity: '', unitSize: '', frequency: 'Weekly', idealTiming: '', expectedPrice: '', consumptionDays: ''
  });
  const [editingItem, setEditingItem] = useState<GroceryPlanItem | null>(null);

  const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(viewingDate);
  const year = viewingDate.getFullYear();
  const currentMonthKey = `${year}-${(viewingDate.getMonth() + 1).toString().padStart(2, '0')}`;

  const toggleViewMode = (mode: 'table' | 'card') => setSyncedItem(SYNC_KEYS.PANTRY_GROCERY_VIEW_MODE, mode);

  const saveItems = (newItems: GroceryPlanItem[]) => setSyncedItem(SYNC_KEYS.FINANCES_GROCERY_PLAN, JSON.stringify(newItems));

  const { plannedTotalCAD, projectedTotalCAD } = useMemo(() => {
    let planned = 0;
    let projected = 0;
    items.forEach(item => {
      if (item.skippedMonths?.includes(currentMonthKey)) return;
      const cost = (item.expectedPrice || 0) * (item.plannedQuantity || 0);
      planned += cost;
      projected += cost; // Simplified projection for component logic
    });
    return { plannedTotalCAD: planned, projectedTotalCAD: projected };
  }, [items, currentMonthKey]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6 p-8 bg-white dark:bg-zinc-900 border border-zinc-100 rounded-2xl shadow-sm">
        <div><SectionTitle>Grocery Plan</SectionTitle><Text variant="label" className="mt-1">Budget and tracking for your monthly essentials</Text></div>
        <div className="flex gap-8">
          <div className="flex flex-col items-end"><span className="text-[10px] font-bold uppercase text-zinc-400">Planned</span><span className="text-3xl font-bold">${plannedTotalCAD.toLocaleString()}</span></div>
          <div className="flex flex-col items-end"><span className="text-[10px] font-bold uppercase text-teal-600">Projected</span><span className="text-3xl font-bold text-teal-600">${projectedTotalCAD.toLocaleString()}</span></div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <button onClick={() => onDateChange(new Date(year, viewingDate.getMonth() - 1, 1))}><ChevronLeft size={16}/></button>
            <span className="text-xs font-bold uppercase w-24 text-center">{monthName} {year}</span>
            <button onClick={() => onDateChange(new Date(year, viewingDate.getMonth() + 1, 1))}><ChevronRight size={16}/></button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
              <button onClick={() => toggleViewMode('table')} className={`p-2 rounded-lg ${viewMode==='table'?'bg-white shadow-sm':'text-zinc-400'}`}><List size={14}/></button>
              <button onClick={() => toggleViewMode('card')} className={`p-2 rounded-lg ${viewMode==='card'?'bg-white shadow-sm':'text-zinc-400'}`}><LayoutGrid size={14}/></button>
            </div>
            <button onClick={() => setIsFormOpen(true)} className="bg-zinc-900 text-white px-4 py-2 rounded-xl text-xs font-bold">+ ITEM</button>
          </div>
        </div>

        {viewMode === 'card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map(item => (
              <div key={item.id} className="p-5 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl border border-zinc-50 relative group">
                <div className="flex justify-between mb-4">
                  <div className="flex flex-col"><span className="font-bold">{item.name}</span><span className="text-[10px] font-bold text-zinc-400 uppercase">{item.category}</span></div>
                  <div className="text-right"><span className="text-lg font-bold text-teal-600">${((item.expectedPrice||0)*(item.plannedQuantity||0)).toLocaleString()}</span></div>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-zinc-100">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">{item.plannedQuantity} {item.unitSize} • {item.frequency}</span>
                  <button onClick={() => { setEditingItem(item); setFormData({ name: item.name, category: item.category || DEFAULT_CATEGORIES[0], plannedQuantity: String(item.plannedQuantity), unitSize: item.unitSize||'', frequency: item.frequency || 'Weekly', idealTiming: item.idealTiming||'', expectedPrice: String(item.expectedPrice), consumptionDays: String(item.consumptionDays||'') }); setIsFormOpen(true); }} className="text-[10px] font-bold uppercase text-zinc-400 opacity-0 group-hover:opacity-100">Edit</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-50 dark:bg-zinc-800 text-[10px] text-zinc-500 font-bold uppercase">
                <tr>
                  <th className="px-6 py-4">Item</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4 text-center">Qty</th>
                  <th className="px-6 py-4 text-right">Price</th>
                  <th className="px-6 py-4 text-right">Total</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {items.map(item => (
                  <tr key={item.id} onClick={() => { setEditingItem(item); setFormData({ name: item.name, category: item.category || DEFAULT_CATEGORIES[0], plannedQuantity: String(item.plannedQuantity), unitSize: item.unitSize||'', frequency: item.frequency || 'Weekly', idealTiming: item.idealTiming||'', expectedPrice: String(item.expectedPrice), consumptionDays: String(item.consumptionDays||'') }); setIsFormOpen(true); }} className="hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors cursor-pointer group">
                    <td className="px-6 py-4"><span className="font-bold text-sm">{item.name}</span></td>
                    <td className="px-6 py-4"><span className="text-[10px] font-bold text-zinc-400 uppercase">{item.category}</span></td>
                    <td className="px-6 py-4 text-center text-xs font-bold text-zinc-500">{item.plannedQuantity} {item.unitSize}</td>
                    <td className="px-6 py-4 text-right text-xs font-bold text-zinc-500">${(item.expectedPrice || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right"><span className="font-bold text-teal-600">${((item.expectedPrice||0)*(item.plannedQuantity||0)).toLocaleString()}</span></td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-[10px] font-bold uppercase text-zinc-400 opacity-0 group-hover:opacity-100">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={isFormOpen} onClose={() => { setIsFormOpen(false); setEditingItem(null); }} title="Grocery Item" onSubmit={handleSubmit}>
        <DynamicForm
          sections={[{ id:'d', fields:[
            { name:'name', label:'Name', type:'text', required:true, fullWidth:true },
            { name:'category', label:'Category', type:'select', options:DEFAULT_CATEGORIES.map(c=>({label:c,value:c})) },
            { name:'expectedPrice', label:'Price', type:'number', required:true },
            { name:'plannedQuantity', label:'Qty', type:'number', required:true },
            { name:'unitSize', label:'Unit', type:'text' }
          ]}]}
          formData={formData}
          onChange={(n,v)=>setFormData(p=>({...p,[n]:v}))}
        />
      </Modal>
    </div>
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qty = parseFloat(formData.plannedQuantity) || 1;
    const newItem: GroceryPlanItem = {
      id: editingItem ? editingItem.id : Math.random().toString(36).substr(2, 9),
      name: formData.name, category: formData.category, plannedQuantity: qty,
      unitSize: formData.unitSize, frequency: formData.frequency as any, idealTiming: formData.idealTiming,
      expectedPrice: parseFloat(formData.expectedPrice) || 0, consumptionDays: parseInt(formData.consumptionDays) || 0,
      checkedUnits: editingItem ? editingItem.checkedUnits : new Array(Math.ceil(qty)).fill('pending'),
      skippedMonths: editingItem ? editingItem.skippedMonths : []
    };
    const updated = editingItem ? items.map(i => i.id === editingItem.id ? newItem : i) : [newItem, ...items];
    saveItems(updated);
    setIsFormOpen(false);
  }
}
