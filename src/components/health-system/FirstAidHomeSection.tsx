"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { setSyncedItem } from '@/lib/storage';
import { Modal } from '../ui/Modal';
import { DynamicForm } from '../ui/DynamicForm';
import { MedicineItem, MEDICINE_CATEGORIES, type InventoryStatus } from '@/types/health-system';
import { Text, SectionTitle } from '../ui/Text';
import { SYNC_KEYS } from '@/lib/sync-keys';
import { LayoutGrid, List, Search } from 'lucide-react';
import { useStorageSubscription } from '@/hooks/useStorageSubscription';

const STORAGE_KEY = SYNC_KEYS.HEALTH_FIRST_AID_HOME;
const VIEW_MODE_KEY = 'health-first-aid-home-view-mode';

interface FirstAidHomeSectionProps {
  externalFilter?: 'ALL' | 'LOW' | 'MISSING' | 'EXPIRED' | 'OK';
}

export function FirstAidHomeSection({ externalFilter }: FirstAidHomeSectionProps) {
  const rawItems = useStorageSubscription<MedicineItem[]>(STORAGE_KEY, []);
  const items = React.useMemo(() => rawItems.map(item => ({
    ...item,
    saltDetails: item.saltDetails || item.whenToUse || ''
  })), [rawItems]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MedicineItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LOW' | 'MISSING' | 'EXPIRED' | 'OK'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const viewMode = useStorageSubscription<'grid' | 'table'>(VIEW_MODE_KEY, 'grid');

  const [formData, setFormData] = useState({
    itemName: '',
    category: MEDICINE_CATEGORIES[0],
    purpose: '',
    saltDetails: '',
    quantity: 0,
    targetQuantity: 1,
    expiryDate: new Date().toISOString().split('T')[0],
    instructions: '',
    notes: ''
  });

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const toggleViewMode = (mode: 'grid' | 'table') => {
    setSyncedItem(VIEW_MODE_KEY, mode);
  };

  const getStatus = (item: MedicineItem): InventoryStatus => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(item.expiryDate);
    expiry.setHours(0, 0, 0, 0);

    if (expiry < today) return 'EXPIRED';
    if (item.quantity === 0) return 'MISSING';
    if (item.quantity < (item.targetQuantity || 1)) return 'LOW';
    return 'OK';
  };

  const getStatusStyles = (status: InventoryStatus) => {
    const base = "text-[12px] font-bold uppercase px-2 py-1 rounded-md inline-block whitespace-nowrap";
    switch (status) {
      case 'OK': return `${base} text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10`;
      case 'LOW': return `${base} text-amber-600 bg-amber-50 dark:bg-amber-500/10`;
      case 'MISSING': return `${base} text-rose-600 bg-rose-50 dark:bg-rose-500/10`;
      case 'EXPIRED': return `${base} text-zinc-500 bg-zinc-100 dark:bg-zinc-800`;
      default: return `${base} text-zinc-500 bg-zinc-100`;
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      itemName: '',
      category: MEDICINE_CATEGORIES[0],
      purpose: '',
      saltDetails: '',
      quantity: 0,
      targetQuantity: 1,
      expiryDate: new Date().toISOString().split('T')[0],
      instructions: '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: MedicineItem) => {
    setEditingItem(item);
    setFormData({
      itemName: item.itemName,
      category: item.category,
      purpose: item.purpose,
      saltDetails: item.saltDetails,
      quantity: item.quantity,
      targetQuantity: item.targetQuantity,
      expiryDate: item.expiryDate,
      instructions: item.instructions,
      notes: item.notes || ''
    });
    setIsModalOpen(true);
  };

  const updateItems = (newItems: MedicineItem[]) => {
    setSyncedItem(STORAGE_KEY, JSON.stringify(newItems));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: MedicineItem = {
      id: editingItem ? editingItem.id : crypto.randomUUID(),
      itemName: formData.itemName,
      category: formData.category,
      purpose: formData.purpose,
      saltDetails: formData.saltDetails,
      quantity: Number(formData.quantity),
      targetQuantity: Number(formData.targetQuantity),
      expiryDate: formData.expiryDate,
      instructions: formData.instructions,
      notes: formData.notes
    };

    updateItems(editingItem ? items.map(i => i.id === editingItem.id ? newItem : i) : [newItem, ...items]);
    setIsModalOpen(false);
  };

  const deleteItem = (id: string) => {
    updateItems(items.filter(i => i.id !== id));
    if (editingItem?.id === id) setIsModalOpen(false);
  };

  const priorityMap = { EXPIRED: 0, MISSING: 1, LOW: 2, OK: 3 };
  const sortedItems = [...items].sort((a, b) => priorityMap[getStatus(a)] - priorityMap[getStatus(b)]);

  const effectiveFilter = externalFilter && externalFilter !== 'ALL' ? externalFilter : statusFilter;
  
  const finalItems = useMemo(() => {
    let filtered = effectiveFilter !== 'ALL' 
      ? sortedItems.filter(i => getStatus(i) === effectiveFilter) 
      : (selectedCategory === 'All' ? sortedItems : sortedItems.filter(i => i.category === selectedCategory));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(i => 
        i.itemName.toLowerCase().includes(q) ||
        i.purpose.toLowerCase().includes(q) ||
        (i.saltDetails || '').toLowerCase().includes(q) ||
        (i.notes || '').toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [sortedItems, effectiveFilter, selectedCategory, searchQuery]);

  const lowCount = items.filter(i => getStatus(i) === 'LOW').length;
  const missingCount = items.filter(i => getStatus(i) === 'MISSING').length;
  const expiredCount = items.filter(i => getStatus(i) === 'EXPIRED').length;

  if (!isLoaded) return <div className="h-96 animate-pulse bg-zinc-100 dark:bg-zinc-900 rounded-3xl" />;

  return (
    <section className="w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 px-2">
        <SectionTitle>First Aid - Home</SectionTitle>
        <div className="flex items-center gap-3">
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl h-[54px] items-center border border-zinc-200">
            <button onClick={() => toggleViewMode('grid')} className={`h-full px-3 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-zinc-700 text-rose-600 shadow-sm' : 'text-zinc-500'}`}><LayoutGrid size={18}/></button>
            <button onClick={() => toggleViewMode('table')} className={`h-full px-3 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white dark:bg-zinc-700 text-rose-600 shadow-sm' : 'text-zinc-500'}`}><List size={18}/></button>
          </div>
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="bg-zinc-100 dark:bg-zinc-800 text-xs font-bold rounded-2xl h-[54px] px-4 border-none min-w-[120px]">
            <option value="All">ALL CATEGORIES</option>
            {MEDICINE_CATEGORIES.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
          </select>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-emerald-600 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search home kit..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-100 dark:bg-zinc-800 text-xs font-bold rounded-2xl h-[54px] pl-12 pr-4 border-none min-w-[200px] outline-none focus:ring-2 focus:ring-emerald-600/20 transition-all"
            />
          </div>
          <button onClick={openAddModal} className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold px-6 h-[54px] rounded-2xl hover:scale-105 transition-all">ADD ITEM</button>
        </div>
      </div>

      <div className={`flex items-center justify-between p-5 rounded-2xl border-2 border-l-[6px] bg-white dark:bg-zinc-900/40 mb-8 shadow-sm ${expiredCount > 0 ? 'border-rose-200 border-l-rose-500' : missingCount > 0 ? 'border-amber-200 border-l-amber-500' : 'border-emerald-200 border-l-emerald-500'}`}>
        <div className="flex gap-4 items-center">
          <div className={`w-2 h-2 rounded-full ${expiredCount > 0 ? 'bg-rose-500' : missingCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
          <Text variant="body" className="font-bold">{expiredCount > 0 ? 'Attention Required - Expired found' : missingCount > 0 ? 'Restock essentials' : 'Supplies Ready'}</Text>
        </div>
        <div className="flex gap-4 text-xs font-bold uppercase">
          {lowCount > 0 && <button onClick={()=>setStatusFilter('LOW')} className={statusFilter==='LOW'?'text-amber-600 underline':'text-zinc-400'}>{lowCount} low</button>}
          {missingCount > 0 && <button onClick={()=>setStatusFilter('MISSING')} className={statusFilter==='MISSING'?'text-rose-600 underline':'text-zinc-400'}>{missingCount} missing</button>}
          {expiredCount > 0 && <button onClick={()=>setStatusFilter('EXPIRED')} className={statusFilter==='EXPIRED'?'text-zinc-600 underline':'text-zinc-400'}>{expiredCount} expired</button>}
          {statusFilter !== 'ALL' && <button onClick={()=>setStatusFilter('ALL')} className="text-zinc-400">Clear</button>}
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead className="bg-zinc-50 dark:bg-zinc-800 text-[11px] font-bold uppercase text-zinc-500">
                <tr>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Purpose</th>
                  <th className="px-6 py-4">Salt Details</th>
                  <th className="px-6 py-4 text-center">Qty</th>
                  <th className="px-6 py-4">Expiry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {finalItems.map(item => (
                  <tr key={item.id} onClick={()=>openEditModal(item)} className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                    <td className="px-6 py-4"><span className={getStatusStyles(getStatus(item))}>{getStatus(item)}</span></td>
                    <td className="px-6 py-4 font-bold text-sm">{item.itemName}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-zinc-500">{item.category}</td>
                    <td className="px-6 py-4 text-sm text-zinc-500">{item.purpose}</td>
                    <td className="px-6 py-4 text-sm text-zinc-400 font-medium italic">{item.saltDetails}</td>
                    <td className="px-6 py-4 text-center font-bold">{item.quantity}</td>
                    <td className="px-6 py-4 text-sm font-semibold">{new Date(item.expiryDate).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {finalItems.map(item => (
            <div key={item.id} onClick={()=>openEditModal(item)} className="p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 group cursor-pointer hover:-translate-y-1 transition-all shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col gap-1">
                  <Text variant="body" className="font-bold text-lg">{item.itemName}</Text>
                  <Text variant="label" className="text-[10px] font-bold uppercase text-zinc-400">{item.category}</Text>
                </div>
                <span className={getStatusStyles(getStatus(item))}>{getStatus(item)}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-50 dark:border-zinc-800">
                <div><Text variant="label" className="text-[10px] font-bold text-zinc-400">QTY</Text><Text variant="body" className="font-bold">{item.quantity} / {item.targetQuantity}</Text></div>
                <div className="text-end"><Text variant="label" className="text-[10px] font-bold text-zinc-400">EXP</Text><Text variant="body" className="font-bold">{new Date(item.expiryDate).toLocaleDateString()}</Text></div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={()=>setIsModalOpen(false)} title="Supply Record" onSubmit={handleSubmit}>
        <DynamicForm
          sections={[{ id: 'med', fields: [
            { name: 'itemName', label: 'Item Name', type: 'text', required: true, fullWidth: true },
            { name: 'category', label: 'Category', type: 'select', options: MEDICINE_CATEGORIES.map(c=>({label:c, value:c})) },
            { name: 'purpose', label: 'Purpose', type: 'text', required: true },
            { name: 'saltDetails', label: 'Salt Details', type: 'text' },
            { name: 'quantity', label: 'Quantity', type: 'number', required: true },
            { name: 'targetQuantity', label: 'Target', type: 'number', required: true },
            { name: 'expiryDate', label: 'Expiry', type: 'date', required: true },
            { name: 'notes', label: 'Notes', type: 'text', fullWidth: true }
          ]}]}
          formData={formData}
          onChange={(n,v)=>setFormData(p=>({...p, [n]:v}))}
        />
        {editingItem && <button type="button" onClick={()=>deleteItem(editingItem.id)} className="mt-4 text-xs font-bold text-rose-500">DELETE ITEM</button>}
      </Modal>
    </section>
  );
}
