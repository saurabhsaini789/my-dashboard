"use client";

import React, { useState, useEffect, useRef } from 'react';
import { getPrefixedKey } from '@/lib/keys';
import { setSyncedItem } from '@/lib/storage';
import { Modal } from '../ui/Modal';
import { DynamicForm } from '../ui/DynamicForm';
import { SupplementItem, SUPPLEMENT_CATEGORIES, type InventoryStatus } from '@/types/health-system';

const STORAGE_KEY = 'SUPPLEMENTS';

interface SupplementSectionProps {
  externalFilter?: 'ALL' | 'LOW' | 'MISSING' | 'EXPIRED';
}

export function SupplementSection({ externalFilter }: SupplementSectionProps) {
  const [items, setItems] = useState<SupplementItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SupplementItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LOW' | 'MISSING' | 'EXPIRED'>('ALL');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: SUPPLEMENT_CATEGORIES[0],
    purpose: '',
    whoUses: '',
    frequency: '',
    dosage: '',
    quantity: 0,
    targetQuantity: 1,
    expiryDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const saved = localStorage.getItem(getPrefixedKey(STORAGE_KEY));
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse supplement data", e);
      }
    }
    setIsLoaded(true);

    const handleLocal = (e: any) => {
      if (e.detail && e.detail.key === STORAGE_KEY) {
        const val = localStorage.getItem(getPrefixedKey(STORAGE_KEY));
        if (val && val !== JSON.stringify(itemsRef.current)) {
          try { setItems(JSON.parse(val)); } catch (e) {}
        }
      }
    };

    window.addEventListener('local-storage-change', handleLocal);
    return () => window.removeEventListener('local-storage-change', handleLocal);
  }, []);

  /**
   * Helper function to determine inventory status based on business rules
   */
  const getStatus = (item: SupplementItem): InventoryStatus => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(item.expiryDate);
    expiry.setHours(0, 0, 0, 0);

    if (expiry < today) return 'EXPIRED';
    if (item.quantity === 0) return 'MISSING';
    if (item.quantity < item.targetQuantity) return 'LOW';
    return 'OK';
  };

  const getStatusStyles = (status: InventoryStatus) => {
    const base = "text-[11px] font-bold uppercase tracking-widest px-2 py-1 rounded-md inline-block";
    switch (status) {
      case 'OK': 
        return `${base} text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400`;
      case 'LOW': 
        return `${base} text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400`;
      case 'MISSING': 
        return `${base} text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400`;
      case 'EXPIRED': 
        return `${base} text-zinc-500 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400`;
      default: 
        return `${base} text-zinc-500 bg-zinc-100 dark:bg-zinc-800`;
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      category: SUPPLEMENT_CATEGORIES[0],
      purpose: '',
      whoUses: '',
      frequency: '',
      dosage: '',
      quantity: 0,
      targetQuantity: 1,
      expiryDate: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: SupplementItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      purpose: item.purpose,
      whoUses: item.whoUses,
      frequency: item.frequency,
      dosage: item.dosage,
      quantity: item.quantity,
      targetQuantity: item.targetQuantity,
      expiryDate: item.expiryDate,
      notes: item.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newItem: SupplementItem = {
      id: editingItem ? editingItem.id : crypto.randomUUID(),
      name: formData.name,
      category: formData.category,
      purpose: formData.purpose,
      whoUses: formData.whoUses,
      frequency: formData.frequency,
      dosage: formData.dosage,
      quantity: Number(formData.quantity),
      targetQuantity: Number(formData.targetQuantity),
      expiryDate: formData.expiryDate,
      notes: formData.notes
    };

    let updatedItems;
    if (editingItem) {
      updatedItems = items.map(i => i.id === editingItem.id ? newItem : i);
    } else {
      updatedItems = [newItem, ...items];
    }

    setItems(updatedItems);
    setSyncedItem(STORAGE_KEY, JSON.stringify(updatedItems));
    setIsModalOpen(false);
  };

  const deleteItem = (id: string) => {
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    setSyncedItem(STORAGE_KEY, JSON.stringify(updated));
    if (editingItem?.id === id) setIsModalOpen(false);
  };

  if (!isLoaded) return null;

  const priorityMap = {
    EXPIRED: 0,
    MISSING: 1,
    LOW: 2,
    OK: 3
  };

  const sortedItems = [...items].sort((a, b) => {
    const priorityDiff = priorityMap[getStatus(a)] - priorityMap[getStatus(b)];
    if (priorityDiff !== 0) return priorityDiff;
    return 0; // preserve original order
  });

  const effectiveFilter =
    externalFilter && externalFilter !== 'ALL'
      ? externalFilter
      : statusFilter;

  const finalItems = effectiveFilter !== 'ALL'
    ? sortedItems.filter(item => getStatus(item) === effectiveFilter)
    : selectedCategory === 'All'
      ? sortedItems
      : sortedItems.filter(item => item.category === selectedCategory);

  const lowCount = items.filter(i => getStatus(i) === 'LOW').length;
  const missingCount = items.filter(i => getStatus(i) === 'MISSING').length;
  const expiredCount = items.filter(i => getStatus(i) === 'EXPIRED').length;
  const allGood = lowCount === 0 && missingCount === 0 && expiredCount === 0;

  let suggestion = null;
  if (expiredCount > 0) {
    suggestion = "Replace expired supplements";
  } else if (missingCount > 0) {
    suggestion = "Restock supplement essentials";
  } else if (lowCount > 0) {
    suggestion = "Refill low supplement stock";
  }

  return (
    <section className="w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 px-2">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Supplements
          </h2>
          <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest">
            Nutritional and health support tracking
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs font-bold px-4 h-[54px] rounded-2xl border-none focus:ring-2 focus:ring-zinc-500 appearance-none cursor-pointer tracking-widest min-w-[140px]"
          >
            <option value="All">ALL CATEGORIES</option>
            {SUPPLEMENT_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat.toUpperCase()}</option>
            ))}
          </select>

          <button 
            onClick={openAddModal}
            className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 tracking-widest text-xs font-bold px-8 py-4 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-sm shadow-zinc-900/10 h-[54px]"
          >
            ADD SUPPLEMENT
          </button>
        </div>
      </div>

      {suggestion && (
        <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 px-2">
          {suggestion}
        </div>
      )}

      <div className="flex items-center gap-4 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-6 px-2">
        {allGood ? (
          <span>All items in good condition</span>
        ) : (
          <>
            {lowCount > 0 && (
              <button 
                onClick={() => setStatusFilter('LOW')}
                className="text-amber-600 hover:underline"
              >
                {lowCount} low
              </button>
            )}
            {missingCount > 0 && (
              <button 
                onClick={() => setStatusFilter('MISSING')}
                className="text-rose-600 hover:underline"
              >
                {missingCount} missing
              </button>
            )}
            {expiredCount > 0 && (
              <button 
                onClick={() => setStatusFilter('EXPIRED')}
                className="text-zinc-500 hover:underline"
              >
                {expiredCount} expired
              </button>
            )}
          </>
        )}
        {statusFilter !== 'ALL' && (
          <button 
            onClick={() => setStatusFilter('ALL')}
            className="ml-auto text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 uppercase tracking-widest text-[11px] font-bold"
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* Table View (Desktop) */}
      <div className="hidden lg:block bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-zinc-50 dark:bg-zinc-800">
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <th className="px-6 py-4 text-[11px] uppercase tracking-widest text-zinc-500 font-bold">Status</th>
                <th className="px-6 py-4 text-[11px] uppercase tracking-widest text-zinc-500 font-bold">Supplement Name</th>
                <th className="px-6 py-4 text-[11px] uppercase tracking-widest text-zinc-500 font-bold">Category</th>
                <th className="px-6 py-4 text-[11px] uppercase tracking-widest text-zinc-500 font-bold">Purpose / Benefit</th>
                <th className="px-6 py-4 text-[11px] uppercase tracking-widest text-zinc-500 font-bold">Who Uses</th>
                <th className="px-6 py-4 text-[11px] uppercase tracking-widest text-zinc-500 font-bold">Frequency</th>
                <th className="px-6 py-4 text-[11px] uppercase tracking-widest text-zinc-500 font-bold">Dosage</th>
                <th className="px-6 py-4 text-[11px] uppercase tracking-widest text-zinc-500 font-bold text-center">Qty</th>
                <th className="px-6 py-4 text-[11px] uppercase tracking-widest text-zinc-500 font-bold">Expiry</th>
              </tr>
            </thead>
            <tbody>
              {finalItems.length > 0 ? finalItems.map(item => {
                const status = getStatus(item);
                const statusStyle = getStatusStyles(status);

                return (
                  <tr 
                    key={item.id} 
                    onClick={() => openEditModal(item)}
                    className="group cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                  >
                    <td className="px-6 py-4">
                      <span className={statusStyle}>
                        {status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-zinc-900 dark:text-white tracking-tight">
                        {item.name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-widest border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                      {item.purpose}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                      {item.whoUses}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                      {item.frequency}
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400">
                      {item.dosage}
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4">
                       <span className={`text-sm font-medium ${status === 'EXPIRED' ? 'text-rose-500' : 'text-zinc-500 dark:text-zinc-400'}`}>
                        {new Date(item.expiryDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}
                      </span>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={9} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em]">No supplements found.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card View (Mobile) */}
      <div className="lg:hidden space-y-4">
        {finalItems.length > 0 ? finalItems.map(item => {
          const status = getStatus(item);
          const statusStyle = getStatusStyles(status);

          return (
            <div 
              key={item.id} 
              onClick={() => openEditModal(item)}
              className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
            >
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-2">
                  <span className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight leading-tight">
                    {item.name}
                  </span>
                  <span className="inline-block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-widest border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 px-2 py-0.5 rounded-md w-fit">
                    {item.category}
                  </span>
                </div>
                <span className={statusStyle}>
                  {status}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Purpose</span>
                  <span className="text-xs text-zinc-700 dark:text-zinc-300">{item.purpose}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Who uses</span>
                  <span className="text-xs text-zinc-700 dark:text-zinc-300">{item.whoUses}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Frequency</span>
                    <span className="text-xs text-zinc-700 dark:text-zinc-300">{item.frequency}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Dosage</span>
                    <span className="text-xs text-zinc-700 dark:text-zinc-300">{item.dosage}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Qty / Target</span>
                  <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{item.quantity} / {item.targetQuantity}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Expiry</span>
                  <span className={`text-sm font-bold ${status === 'EXPIRED' ? 'text-rose-500' : 'text-zinc-700 dark:text-zinc-300'}`}>
                    {new Date(item.expiryDate).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">No supplements found</span>
          </div>
        )}
      </div>

      {/* Modal Integration */}
      <div className="pt-0">
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit supplement' : 'Add supplement'}
        onSubmit={handleSubmit}
        submitText={editingItem ? 'Update Item' : 'Add Item'}
        accentColor="rose"
      >
        <DynamicForm
          sections={[
            {
              id: 'supplement_info',
              title: '',
              fields: [
                { name: 'name', label: 'Supplement Name', type: 'text', required: true, fullWidth: true },
                {
                  name: 'category', label: 'Category', type: 'select',
                  options: SUPPLEMENT_CATEGORIES.map(c => ({ label: c, value: c }))
                },
                { name: 'purpose', label: 'Purpose / Benefit', type: 'text', required: true },
                { name: 'whoUses', label: 'Who Uses', type: 'text', required: true },
                { name: 'frequency', label: 'Frequency', type: 'text', required: true },
                { name: 'dosage', label: 'Dosage', type: 'text', required: true },
                { name: 'quantity', label: 'Current Quantity', type: 'number', min: 0, required: true },
                { name: 'targetQuantity', label: 'Target Quantity', type: 'number', min: 1, required: true },
                { name: 'expiryDate', label: 'Expiry Date', type: 'date', required: true },
                { name: 'notes', label: 'Notes', type: 'text', fullWidth: true }
              ]
            }
          ]}
          formData={formData}
          accentColor="rose"
          onChange={(name, value) => setFormData(prev => ({ ...prev, [name]: value }))}
        />

        {editingItem && (
          <div className="pt-4 mt-2">
            <button 
              type="button" 
              onClick={() => deleteItem(editingItem.id)} 
              className="text-sm font-bold text-rose-500 hover:text-rose-700 transition-colors"
            >
              DELETE SUPPLEMENT
            </button>
          </div>
        )}
      </Modal>
      </div>
    </section>
  );
}
