"use client";

import React, { useState, useEffect, useRef } from 'react';
import { getPrefixedKey } from '@/lib/keys';
import { setSyncedItem } from '@/lib/storage';
import { Modal } from '../ui/Modal';
import { DynamicForm } from '../ui/DynamicForm';
import { SupplementItem, SUPPLEMENT_CATEGORIES, FAMILY_MEMBERS, DOSE_UNITS, type InventoryStatus } from '@/types/health-system';
import { Text, SectionTitle } from '../ui/Text';
import { SYNC_KEYS } from '@/lib/sync-keys';
import { LayoutGrid, List, User, Plus, Trash2, Settings } from 'lucide-react';

const STORAGE_KEY = SYNC_KEYS.HEALTH_SUPPLEMENTS;
const VIEW_MODE_KEY = 'health-supplements-view-mode';

interface SupplementSectionProps {
 externalFilter?: 'ALL' | 'LOW' | 'MISSING' | 'EXPIRED';
}

export function SupplementSection({ externalFilter }: SupplementSectionProps) {
 const [items, setItems] = useState<SupplementItem[]>([]);
 const [isLoaded, setIsLoaded] = useState(false);
 const [isModalOpen, setIsModalOpen] = useState(false);
 const [editingItem, setEditingItem] = useState<SupplementItem | null>(null);
 const [selectedCategory, setSelectedCategory] = useState<string>('All');
 const [selectedPerson, setSelectedPerson] = useState<string>('All');
 const [statusFilter, setStatusFilter] = useState<'ALL' | 'LOW' | 'MISSING' | 'EXPIRED'>('ALL');
 const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
 const [familyMembers, setFamilyMembers] = useState<string[]>([]);
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
 expiryDate: new Date().toISOString().split('T')[0],
 instructions: '',
 notes: ''
 });

 const itemsRef = useRef(items);
 useEffect(() => {
 itemsRef.current = items;
 }, [items]);

 useEffect(() => {
 const savedData = localStorage.getItem(getPrefixedKey(STORAGE_KEY));
 if (savedData) {
 try {
 setItems(JSON.parse(savedData));
 } catch (e) {
 console.error("Failed to parse supplement data", e);
 }
 }

 const savedView = localStorage.getItem(VIEW_MODE_KEY);
 if (savedView === 'grid' || savedView === 'table') {
   setViewMode(savedView);
 }

 const savedFamily = localStorage.getItem(getPrefixedKey(SYNC_KEYS.HEALTH_FAMILY_MEMBERS));
 if (savedFamily) {
   try {
     setFamilyMembers(JSON.parse(savedFamily));
   } catch {
     setFamilyMembers(FAMILY_MEMBERS);
   }
 } else {
   setFamilyMembers(FAMILY_MEMBERS);
 }

 setIsLoaded(true);

 const handleLocal = (e: any) => {
   if (e.detail && (e.detail.key === STORAGE_KEY || e.detail.key === SYNC_KEYS.HEALTH_FAMILY_MEMBERS)) {
     const val = localStorage.getItem(getPrefixedKey(e.detail.key));
     if (val) {
       try {
         const parsed = JSON.parse(val);
         if (e.detail.key === STORAGE_KEY) {
           if (JSON.stringify(parsed) !== JSON.stringify(itemsRef.current)) {
             setItems(parsed);
           }
         } else {
           setFamilyMembers(parsed);
         }
       } catch (e) {}
     }
   }
 };

 window.addEventListener('local-storage-change', handleLocal);
 return () => window.removeEventListener('local-storage-change', handleLocal);
 }, []);

 const toggleViewMode = (mode: 'grid' | 'table') => {
   setViewMode(mode);
   localStorage.setItem(VIEW_MODE_KEY, mode);
 };

 const addFamilyMember = () => {
   if (!newPersonName.trim()) return;
   const updated = [...familyMembers, newPersonName.trim()];
   setFamilyMembers(updated);
   setSyncedItem(SYNC_KEYS.HEALTH_FAMILY_MEMBERS, JSON.stringify(updated));
   setNewPersonName('');
 };

 const removeFamilyMember = (name: string) => {
   const updated = familyMembers.filter(m => m !== name);
   setFamilyMembers(updated);
   setSyncedItem(SYNC_KEYS.HEALTH_FAMILY_MEMBERS, JSON.stringify(updated));
 };

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
 const base = "text-[13px] font-bold uppercase px-2 py-1 rounded-md inline-block";
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
 expiryDate: new Date().toISOString().split('T')[0],
 instructions: '',
 notes: ''
 });
 setIsModalOpen(true);
 };

  const openEditModal = (item: SupplementItem) => {
    setEditingItem(item);
    
    // Parse dose (e.g. "500 mg")
    const doseStr = item.dose || '';
    const doseMatch = doseStr.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
    const amount = doseMatch ? doseMatch[1] : doseStr;
    const unit = doseMatch ? doseMatch[2] : '';
    const isStandardUnit = DOSE_UNITS.includes(unit);

    setFormData({
      itemName: item.itemName,
      category: item.category,
      person: item.person || 'Shared',
      purpose: item.purpose,
      doseAmount: amount,
      doseUnit: isStandardUnit ? unit : (unit ? 'Other' : DOSE_UNITS[0]),
      doseOther: isStandardUnit ? '' : unit,
      frequency: item.frequency,
      quantity: item.quantity,
      targetQuantity: item.targetQuantity,
      expiryDate: item.expiryDate,
      instructions: item.instructions,
      notes: item.notes || ''
    });
    setIsModalOpen(true);
  };

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 
 const finalUnit = formData.doseUnit === 'Other' ? formData.doseOther : formData.doseUnit;
 const finalDose = `${formData.doseAmount} ${finalUnit}`.trim();

 const newItem: SupplementItem = {
 id: editingItem ? editingItem.id : crypto.randomUUID(),
 itemName: formData.itemName,
 category: formData.category,
 person: formData.person,
 purpose: formData.purpose,
 dose: finalDose,
 frequency: formData.frequency,
 quantity: Number(formData.quantity),
 targetQuantity: Number(formData.targetQuantity),
 expiryDate: formData.expiryDate,
 instructions: formData.instructions,
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

 const categoryItems = selectedCategory === 'All'
    ? sortedItems
    : sortedItems.filter(item => item.category === selectedCategory);

 const finalItems = (effectiveFilter !== 'ALL'
    ? sortedItems.filter(item => getStatus(item) === effectiveFilter)
    : categoryItems).filter(item => 
      selectedPerson === 'All' ? true : (item.person === selectedPerson || (!item.person && selectedPerson === 'Shared'))
    );

 const lowCount = items.filter(i => getStatus(i) === 'LOW').length;
 const missingCount = items.filter(i => getStatus(i) === 'MISSING').length;
 const expiredCount = items.filter(i => getStatus(i) === 'EXPIRED').length;
 const allGood = lowCount === 0 && missingCount === 0 && expiredCount === 0;

 let suggestion = null;
 if (expiredCount > 0) {
 suggestion = "Replace expired supplements";
 } else if (missingCount > 0) {
 suggestion = "Restock missing supplements";
 } else if (lowCount > 0) {
 suggestion = "Refill low supplement stock";
 }

 const borderColor = expiredCount > 0 
  ? 'border-rose-200 dark:border-rose-900/30 border-l-rose-500' 
  : missingCount > 0 
   ? 'border-amber-200 dark:border-amber-900/30 border-l-amber-500' 
   : 'border-emerald-200 dark:border-emerald-900/30 border-l-emerald-500';

 const pipColor = expiredCount > 0 
  ? 'bg-rose-500' 
  : missingCount > 0 
   ? 'bg-amber-500' 
   : 'bg-emerald-500';

 return (
 <section className="w-full">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 px-2">
  <div>
  <SectionTitle>
  Supplement Section
  </SectionTitle>
  </div>

  <div className="flex items-center gap-1.5 sm:gap-3">
    {/* View Toggle */}
    <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700 h-[54px] items-center">
      <button 
        onClick={() => toggleViewMode('grid')}
        className={`p-2 rounded-lg transition-all h-full flex items-center gap-2 px-2 sm:px-3 ${viewMode === 'grid' ? 'bg-white dark:bg-zinc-700 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
        title="Grid View"
      >
        <LayoutGrid size={18} />
      </button>
      <button 
        onClick={() => toggleViewMode('table')}
        className={`p-2 rounded-lg transition-all h-full flex items-center gap-2 px-2 sm:px-3 ${viewMode === 'table' ? 'bg-white dark:bg-zinc-700 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
        title="Table View"
      >
        <List size={18} />
      </button>
    </div>

    <select 
      value={selectedPerson}
      onChange={(e) => setSelectedPerson(e.target.value)}
      className="bg-zinc-100 dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 text-xs font-bold px-2 sm:px-4 h-[54px] rounded-2xl border-none focus:ring-2 focus:ring-zinc-500 appearance-none cursor-pointer min-w-[100px] sm:min-w-[120px] flex-1 sm:flex-none"
    >
      <option value="All">FOR: ANYONE</option>
      <option value="Shared">FOR: SHARED</option>
      {familyMembers.map(person => (
        <option key={person} value={person}>FOR: {person.toUpperCase()}</option>
      ))}
    </select>

    <button 
      onClick={() => setIsFamilyModalOpen(true)}
      className="bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 p-4 rounded-2xl border-none transition-colors h-[54px]"
      title="Manage Family Members"
    >
      <Settings size={20} />
    </button>

    <select 
      value={selectedCategory}
      onChange={(e) => setSelectedCategory(e.target.value)}
      className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs font-bold px-2 sm:px-4 h-[54px] rounded-2xl border-none focus:ring-2 focus:ring-zinc-500 appearance-none cursor-pointer min-w-[100px] sm:min-w-[140px] flex-1 sm:flex-none"
    >
      <option value="All">ALL CATEGORIES</option>
      {SUPPLEMENT_CATEGORIES.map(cat => (
        <option key={cat} value={cat}>{cat.toUpperCase()}</option>
      ))}
    </select>
  
    <button 
      onClick={openAddModal}
      className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold px-3 sm:px-8 py-4 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-sm shadow-zinc-900/10 h-[54px] whitespace-nowrap"
    >
      <span className="sm:hidden">+ ADD</span>
      <span className="hidden sm:inline">ADD SUPPLEMENT</span>
    </button>
  </div>
 </div>

 <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border-2 border-l-[6px] bg-white dark:bg-zinc-900/40 ${borderColor} mb-8 shadow-sm transition-all shadow-zinc-200/50 dark:shadow-none`}>
  <div className="flex items-center gap-4">
   <div className={`w-2 h-2 rounded-full ${pipColor} shrink-0`} />
   <Text variant="body" className="font-semibold text-zinc-900 dark:text-zinc-100">
    {suggestion || (allGood ? "All supplements in good stock" : "Inventory needs attention")}
   </Text>
  </div>

  <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
   {!allGood ? (
    <div className="flex gap-4">
     {lowCount > 0 && (
      <button 
      onClick={() => setStatusFilter('LOW')}
      className={`text-sm font-medium transition-colors ${statusFilter === 'LOW' ? 'text-amber-600 underline underline-offset-4' : 'text-amber-600/60 hover:text-amber-600'}`}
      >
      {lowCount} low
      </button>
     )}
     {missingCount > 0 && (
      <button 
      onClick={() => setStatusFilter('MISSING')}
      className={`text-sm font-medium transition-colors ${statusFilter === 'MISSING' ? 'text-rose-600 underline underline-offset-4' : 'text-rose-600/60 hover:text-rose-600'}`}
      >
      {missingCount} missing
      </button>
     )}
     {expiredCount > 0 && (
      <button 
      onClick={() => setStatusFilter('EXPIRED')}
      className={`text-sm font-medium transition-colors ${statusFilter === 'EXPIRED' ? 'text-zinc-600 underline underline-offset-4 dark:text-zinc-400' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
      >
      {expiredCount} expired
      </button>
     )}
    </div>
   ) : (
    <div className="flex gap-4">
     <Text variant="bodySmall" className="text-emerald-600 dark:text-emerald-400 font-medium">
      System Stable
     </Text>
    </div>
   )}
   
   {statusFilter !== 'ALL' && (
   <button 
   onClick={() => setStatusFilter('ALL')}
   className="ml-auto text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 uppercase text-xs font-bold tracking-wider"
   >
   Clear Filter
   </button>
   )}
  </div>
 </div>

 {/* Integrated View Logic */}
 {viewMode === 'table' ? (
   <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-500">
     <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
       <table className="w-full text-left border-collapse">
         <thead className="bg-zinc-50 dark:bg-zinc-800">
           <tr className="border-b border-zinc-100 dark:border-zinc-800">
             <th className="px-6 py-4 text-[13px] uppercase text-zinc-500 font-bold">Status</th>
             <th className="px-6 py-4 text-[13px] uppercase text-zinc-500 font-bold">Supplement Name</th>
             <th className="px-6 py-4 text-[13px] uppercase text-zinc-500 font-bold">Category</th>
             <th className="px-6 py-4 text-[13px] uppercase text-zinc-500 font-bold">Person</th>
             <th className="px-6 py-4 text-[13px] uppercase text-zinc-500 font-bold">Purpose / Use</th>
             <th className="px-6 py-4 text-[13px] uppercase text-zinc-500 font-bold">Dosage</th>
             <th className="px-6 py-4 text-[13px] uppercase text-zinc-500 font-bold text-center">Quantity</th>
             <th className="px-6 py-4 text-[13px] uppercase text-zinc-500 font-bold">Expiry</th>
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
                   <Text variant="body" as="span" className="font-bold">
                     {item.itemName}
                   </Text>
                 </td>
                 <td className="px-6 py-4">
                   <Text variant="label" as="span" className="border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                     {item.category}
                   </Text>
                 </td>
                 <td className="px-6 py-4">
                   <Text variant="label" as="span" className="text-emerald-600 dark:text-emerald-400 font-bold">
                     {item.person || 'Shared'}
                   </Text>
                 </td>
                 <td className="px-6 py-4 text-[15px] text-zinc-500 dark:text-zinc-400">
                   {item.purpose}
                 </td>
                 <td className="px-6 py-4 text-[15px] text-zinc-500 dark:text-zinc-400">
                   {item.dose} {item.frequency}
                 </td>
                 <td className="px-6 py-4 text-center text-[15px] font-medium text-zinc-700 dark:text-zinc-300">
                   {item.quantity}
                 </td>
                 <td className="px-6 py-4">
                   <span className={`text-[15px] font-medium ${status === 'EXPIRED' ? 'text-rose-500' : 'text-zinc-500 dark:text-zinc-400'}`}>
                     {new Date(item.expiryDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}
                   </span>
                 </td>
               </tr>
             );
           }) : (
             <tr>
               <td colSpan={7} className="px-8 py-20 text-center">
                 <div className="flex flex-col items-center gap-2">
                   <span className="text-sm text-zinc-500 dark:text-zinc-400 uppercase">No supplements found.</span>
                 </div>
               </td>
             </tr>
           )}
         </tbody>
       </table>
     </div>
   </div>
 ) : (
    <div className="max-h-[650px] overflow-y-auto custom-scrollbar p-1">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-in fade-in duration-500">
        {finalItems.length > 0 ? finalItems.map(item => {
          const status = getStatus(item);
          const statusStyle = getStatusStyles(status);

          return (
            <div 
              key={item.id} 
              onClick={() => openEditModal(item)}
              className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shadow-sm group hover:-translate-y-1 duration-300"
            >
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-2">
                  <Text variant="title" as="span" className="text-lg">
                    {item.itemName}
                  </Text>
                  <Text variant="label" as="span" className="border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 px-2 py-0.5 rounded-md w-fit text-[13px]">
                    {item.category}
                  </Text>
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <User size={14} />
                    <span className="text-[13px] font-bold uppercase tracking-wider">{item.person || 'Shared'}</span>
                  </div>
                </div>
                <span className={statusStyle}>
                  {status}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold text-zinc-400 uppercase">Purpose</span>
                  <span className="text-[14px] text-zinc-700 dark:text-zinc-300 line-clamp-2">{item.purpose}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold text-zinc-400 uppercase">Dosage</span>
                  <span className="text-[14px] text-zinc-700 dark:text-zinc-300">{item.dose} {item.frequency}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex flex-col">
                  <Text variant="label" as="span" className="text-zinc-400 text-[13px]">Qty</Text>
                  <Text variant="body" as="span" className="text-base font-bold text-zinc-700 dark:text-zinc-300">{item.quantity} / {item.targetQuantity}</Text>
                </div>
                <div className="flex flex-col items-end">
                  <Text variant="label" as="span" className="text-zinc-400 text-[13px]">Expiry</Text>
                  <Text variant="body" as="span" className={`text-base font-bold ${status === 'EXPIRED' ? 'text-rose-500' : 'text-zinc-700 dark:text-zinc-300'}`}>
                    {new Date(item.expiryDate).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })}
                  </Text>
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="col-span-full p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
            <span className="text-sm text-zinc-500 dark:text-zinc-400 uppercase">No supplements found</span>
          </div>
        )}
      </div>
    </div>
 )}

 {/* Modal Integration */}
 <Modal
 isOpen={isModalOpen}
 onClose={() => setIsModalOpen(false)}
 title={editingItem ? 'Edit supplement' : 'Add supplement'}
 onSubmit={handleSubmit}
 submitText={editingItem ? 'Update Supplement' : 'Add Supplement'}
 accentColor="emerald"
 >
 <DynamicForm
 sections={[
 {
 id: 'sup_info',
 title: '',
    fields: [
    { name: 'itemName', label: 'Supplement Name', type: 'text', required: true, fullWidth: true },
    {
    name: 'category', label: 'Category', type: 'select',
    options: SUPPLEMENT_CATEGORIES.map(c => ({ label: c, value: c }))
    },
    {
    name: 'person', label: 'Who is taking this?', type: 'select',
    options: ['Shared', ...familyMembers].map(p => ({ label: p, value: p }))
    },
    { name: 'purpose', label: 'Purpose / Use', type: 'text', required: true },
    { name: 'doseAmount', label: 'Dosage Amount', type: 'text', required: true },
    {
    name: 'doseUnit', label: 'Unit', type: 'select',
    options: [...DOSE_UNITS, 'Other'].map(u => ({ label: u, value: u }))
    },
    ...(formData.doseUnit === 'Other' ? [
    { name: 'doseOther', label: 'Custom Unit', type: 'text', required: true }
    ] : []),
    { name: 'frequency', label: 'Frequency (e.g. 1/day)', type: 'text', required: true },
    { name: 'quantity', label: 'Current Quantity', type: 'number', min: 0, required: true },
    { name: 'targetQuantity', label: 'Target Quantity', type: 'number', min: 1, required: true },
    { name: 'expiryDate', label: 'Expiry Date', type: 'date', required: true },
    { name: 'instructions', label: 'Instructions', type: 'text', fullWidth: true },
    { name: 'notes', label: 'Notes', type: 'text', fullWidth: true }
    ]
 }
 ]}
 formData={formData}
 accentColor="emerald"
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

 {/* Family Management Modal */}
 <Modal
   isOpen={isFamilyModalOpen}
   onClose={() => setIsFamilyModalOpen(false)}
   title="Manage Family Members"
 >
   <div className="space-y-6">
     <div className="flex gap-2">
       <input 
         type="text"
         value={newPersonName}
         onChange={(e) => setNewPersonName(e.target.value)}
         placeholder="New person name..."
         className="flex-1 bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500"
         onKeyDown={(e) => e.key === 'Enter' && addFamilyMember()}
       />
       <button
         onClick={addFamilyMember}
         className="bg-emerald-600 text-white p-3 rounded-xl hover:bg-emerald-700 transition-colors"
       >
         <Plus size={20} />
       </button>
     </div>

     <div className="space-y-2">
       {familyMembers.map(name => (
         <div key={name} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
           <span className="font-semibold text-zinc-900 dark:text-zinc-100">{name}</span>
           <button
             onClick={() => removeFamilyMember(name)}
             className="text-rose-500 hover:text-rose-700 p-1 transition-colors"
             title="Remove person"
           >
             <Trash2 size={18} />
           </button>
         </div>
       ))}
       {familyMembers.length === 0 && (
         <p className="text-center py-4 text-zinc-400 text-sm">No personal members added yet.</p>
       )}
     </div>
     
     <p className="text-[12px] text-zinc-400 italic">
       * "Shared" is a permanent category and cannot be removed.
     </p>
   </div>
 </Modal>
 </section>
 );
}
