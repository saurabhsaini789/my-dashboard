"use client";

import React, { useState, useEffect } from 'react';
import { setSyncedItem } from '@/lib/storage';
import { Modal } from '../ui/Modal';
import { DynamicForm } from '../ui/DynamicForm';
import { SupplementItem, SUPPLEMENT_CATEGORIES, FAMILY_MEMBERS, DOSE_UNITS, type InventoryStatus } from '@/types/health-system';
import { Text, SectionTitle } from '../ui/Text';
import { SYNC_KEYS } from '@/lib/sync-keys';
import { LayoutGrid, List, User, Plus, Trash2, Settings } from 'lucide-react';
import { useStorageSubscription } from '@/hooks/useStorageSubscription';

const STORAGE_KEY = SYNC_KEYS.HEALTH_SUPPLEMENTS;
const VIEW_MODE_KEY = 'health-supplements-view-mode';

interface SupplementSectionProps {
  externalFilter?: 'ALL' | 'LOW' | 'MISSING' | 'EXPIRED' | 'OK';
}

export function SupplementSection({ externalFilter }: SupplementSectionProps) {
  const items = useStorageSubscription<SupplementItem[]>(STORAGE_KEY, []);
  const familyMembers = useStorageSubscription<string[]>(SYNC_KEYS.HEALTH_FAMILY_MEMBERS, []);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SupplementItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedPerson, setSelectedPerson] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LOW' | 'MISSING' | 'EXPIRED' | 'OK'>('ALL');
  const viewMode = useStorageSubscription<'grid' | 'table'>(VIEW_MODE_KEY, 'grid');
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    itemName: '',
    category: SUPPLEMENT_CATEGORIES[0],
    person: 'Shared',
    purpose: '',
    doseAmount: '',
    doseUnit: DOSE_UNITS[0],
    doseOther: '',
    frequency: '',
    quantity: 0,
    targetQuantity: 1,
    expiryDate: '',
    instructions: '',
    notes: ''
  });

  useEffect(() => {
    setFormData(prev => ({ ...prev, expiryDate: new Date().toISOString().split('T')[0] }));
  }, []);

  const toggleViewMode = (mode: 'grid' | 'table') => {
    setSyncedItem(VIEW_MODE_KEY, mode);
  };

  const addFamilyMember = () => {
    if (!newPersonName.trim()) return;
    const updated = [...familyMembers, newPersonName.trim()];
    setSyncedItem(SYNC_KEYS.HEALTH_FAMILY_MEMBERS, JSON.stringify(updated));
    setNewPersonName('');
  };

  const removeFamilyMember = (name: string) => {
    setSyncedItem(SYNC_KEYS.HEALTH_FAMILY_MEMBERS, JSON.stringify(familyMembers.filter(m => m !== name)));
  };

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
    const base = "text-[13px] font-bold uppercase px-2 py-1 rounded-md inline-block";
    switch (status) {
      case 'OK': return `${base} text-emerald-600 bg-emerald-50`;
      case 'LOW': return `${base} text-amber-600 bg-amber-50`;
      case 'MISSING': return `${base} text-rose-600 bg-rose-50`;
      case 'EXPIRED': return `${base} text-zinc-500 bg-zinc-100`;
      default: return `${base} text-zinc-500 bg-zinc-100`;
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      itemName: '', category: SUPPLEMENT_CATEGORIES[0], person: 'Shared', purpose: '',
      doseAmount: '', doseUnit: DOSE_UNITS[0], doseOther: '', frequency: '',
      quantity: 0, targetQuantity: 1, expiryDate: new Date().toISOString().split('T')[0],
      instructions: '', notes: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: SupplementItem) => {
    setEditingItem(item);
    const doseMatch = (item.dose || '').match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
    const amount = doseMatch ? doseMatch[1] : (item.dose || '');
    const unit = doseMatch ? doseMatch[2] : '';
    const isStandard = DOSE_UNITS.includes(unit);

    setFormData({
      itemName: item.itemName, category: item.category, person: item.person || 'Shared',
      purpose: item.purpose, doseAmount: amount, doseUnit: isStandard ? unit : (unit ? 'Other' : DOSE_UNITS[0]),
      doseOther: isStandard ? '' : unit, frequency: item.frequency,
      quantity: item.quantity, targetQuantity: item.targetQuantity, expiryDate: item.expiryDate,
      instructions: item.instructions, notes: item.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalDose = `${formData.doseAmount} ${formData.doseUnit === 'Other' ? formData.doseOther : formData.doseUnit}`.trim();
    const newItem: SupplementItem = {
      id: editingItem ? editingItem.id : crypto.randomUUID(),
      itemName: formData.itemName, category: formData.category, person: formData.person,
      purpose: formData.purpose, dose: finalDose, frequency: formData.frequency,
      quantity: Number(formData.quantity), targetQuantity: Number(formData.targetQuantity),
      expiryDate: formData.expiryDate, instructions: formData.instructions, notes: formData.notes
    };

    const updated = editingItem ? items.map(i => i.id === editingItem.id ? newItem : i) : [newItem, ...items];
    setSyncedItem(STORAGE_KEY, JSON.stringify(updated));
    setIsModalOpen(false);
  };

  const deleteItem = (id: string) => {
    setSyncedItem(STORAGE_KEY, JSON.stringify(items.filter(i => i.id !== id)));
    if (editingItem?.id === id) setIsModalOpen(false);
  };

  const sortedItems = [...items].sort((a, b) => {
    const map = { EXPIRED: 0, MISSING: 1, LOW: 2, OK: 3 };
    return map[getStatus(a)] - map[getStatus(b)];
  });

  const effectiveFilter = externalFilter && externalFilter !== 'ALL' ? externalFilter : statusFilter;
  const filtered = sortedItems.filter(i => {
    const matchesCat = selectedCategory === 'All' || i.category === selectedCategory;
    const matchesPerson = selectedPerson === 'All' || i.person === selectedPerson || (!i.person && selectedPerson === 'Shared');
    const matchesStatus = effectiveFilter === 'ALL' || getStatus(i) === effectiveFilter;
    return matchesCat && matchesPerson && matchesStatus;
  });

  const stats = {
    low: items.filter(i => getStatus(i) === 'LOW').length,
    missing: items.filter(i => getStatus(i) === 'MISSING').length,
    expired: items.filter(i => getStatus(i) === 'EXPIRED').length
  };

  return (
    <section className="w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 px-2 font-bold uppercase">
        <SectionTitle>Supplement Section</SectionTitle>
        <div className="flex items-center gap-3">
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl h-[54px]">
            <button onClick={() => toggleViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-emerald-600' : 'text-zinc-500'}`}><LayoutGrid size={18} /></button>
            <button onClick={() => toggleViewMode('table')} className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-emerald-600' : 'text-zinc-500'}`}><List size={18} /></button>
          </div>
          <select value={selectedPerson} onChange={e => setSelectedPerson(e.target.value)} className="bg-zinc-100 rounded-2xl h-[54px] px-4 text-xs border-none cursor-pointer">
            <option value="All">Anyone</option>
            <option value="Shared">Shared</option>
            {familyMembers.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button onClick={() => setIsFamilyModalOpen(true)} className="bg-zinc-100 p-4 rounded-2xl h-[54px] text-zinc-500"><Settings size={20} /></button>
          <button onClick={openAddModal} className="bg-zinc-900 text-white text-xs px-8 py-4 rounded-2xl h-[54px] transition-all hover:scale-105">+ ADD</button>
        </div>
      </div>

      <div className={`p-5 rounded-2xl border-2 border-l-[6px] bg-white mb-8 shadow-sm ${stats.expired ? 'border-rose-200 border-l-rose-500' : stats.missing ? 'border-amber-200 border-l-amber-500' : 'border-emerald-200 border-l-emerald-500'}`}>
        <div className="flex justify-between items-center font-bold">
           <span>{stats.expired ? 'Replace expired items' : stats.missing ? 'Restock missing items' : 'Systems nominal'}</span>
           <div className="flex gap-4 text-xs">
             {stats.low > 0 && <button onClick={() => setStatusFilter('LOW')} className="text-amber-600 underline">{stats.low} low</button>}
             {stats.missing > 0 && <button onClick={() => setStatusFilter('MISSING')} className="text-rose-600 underline">{stats.missing} missing</button>}
             {stats.expired > 0 && <button onClick={() => setStatusFilter('EXPIRED')} className="text-zinc-500 underline">{stats.expired} expired</button>}
             {statusFilter !== 'ALL' && <button onClick={() => setStatusFilter('ALL')} className="text-zinc-400">Clear</button>}
           </div>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(i => (
            <div key={i.id} onClick={() => openEditModal(i)} className="p-6 bg-white border border-zinc-200 rounded-2xl shadow-sm cursor-pointer hover:bg-zinc-50 transition-all font-bold">
               <div className="flex justify-between">
                 <div><h3 className="text-lg">{i.itemName}</h3><span className="text-[10px] bg-zinc-100 px-2 py-0.5 rounded uppercase">{i.category}</span></div>
                 <span className={getStatusStyles(getStatus(i))}>{getStatus(i)}</span>
               </div>
               <div className="mt-4 grid grid-cols-2 text-xs">
                 <div><span className="text-zinc-400 font-bold uppercase">Qty</span><div>{i.quantity} / {i.targetQuantity}</div></div>
                 <div className="text-right"><span className="text-zinc-400 font-bold uppercase">Expiry</span><div>{new Date(i.expiryDate).toLocaleDateString()}</div></div>
               </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left font-bold">
            <thead className="bg-zinc-50 text-[10px] text-zinc-500 uppercase">
              <tr><th className="p-4">Status</th><th className="p-4">Name</th><th className="p-4">Person</th><th className="p-4">Qty</th><th className="p-4">Expiry</th></tr>
            </thead>
            <tbody className="text-sm">
              {filtered.map(i => (
                <tr key={i.id} onClick={() => openEditModal(i)} className="border-b hover:bg-zinc-50 cursor-pointer">
                  <td className="p-4"><span className={getStatusStyles(getStatus(i))}>{getStatus(i)}</span></td>
                  <td className="p-4">{i.itemName}</td>
                  <td className="p-4">{i.person || 'Shared'}</td>
                  <td className="p-4">{i.quantity}</td>
                  <td className="p-4">{new Date(i.expiryDate).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Supplement" onSubmit={handleSubmit}>
        <DynamicForm 
          sections={[{ id: 's', fields: [
            { name: 'itemName', label: 'Name', type: 'text', required: true, fullWidth: true },
            { name: 'category', label: 'Category', type: 'select', options: SUPPLEMENT_CATEGORIES.map(c=>({label:c,value:c})) },
            { name: 'person', label: 'Person', type: 'select', options: ['Shared', ...familyMembers].map(p=>({label:p,value:p})) },
            { name: 'doseAmount', label: 'Dose', type: 'text', required: true },
            { name: 'doseUnit', label: 'Unit', type: 'select', options: [...DOSE_UNITS, 'Other'].map(u=>({label:u,value:u})) },
            { name: 'quantity', label: 'Quantity', type: 'number', required: true },
            { name: 'targetQuantity', label: 'Target', type: 'number', required: true },
            { name: 'expiryDate', label: 'Expiry', type: 'date', required: true }
          ]}]}
          formData={formData}
          onChange={(n, v) => setFormData(p => ({ ...p, [n]: v }))}
        />
        {editingItem && <button onClick={() => deleteItem(editingItem.id)} className="text-red-500 mt-4 font-bold uppercase">Delete</button>}
      </Modal>

      <Modal isOpen={isFamilyModalOpen} onClose={() => setIsFamilyModalOpen(false)} title="Family">
        <div className="space-y-4">
          <div className="flex gap-2"><input value={newPersonName} onChange={e=>setNewPersonName(e.target.value)} placeholder="Name" className="flex-1 bg-zinc-100 p-3 rounded-xl border-none outline-none font-bold"/><button onClick={addFamilyMember} className="bg-emerald-600 text-white p-3 rounded-xl"><Plus size={20}/></button></div>
          {familyMembers.map(m => <div key={m} className="flex justify-between p-3 bg-zinc-50 rounded-xl font-bold"><span>{m}</span><button onClick={()=>removeFamilyMember(m)} className="text-rose-500"><Trash2 size={18}/></button></div>)}
        </div>
      </Modal>
    </section>
  );
}
