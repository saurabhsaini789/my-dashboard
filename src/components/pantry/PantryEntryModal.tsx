"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { ExpenseRecord, ExpenseItem, ExpenseCategory, Asset, PaymentMethod, EntryType } from '@/types/finance';
import { getPrefixedKey } from '@/lib/keys';
import { SYNC_KEYS } from '@/lib/sync-keys';
import { setSyncedItem } from '@/lib/storage';
import { calculateAssetBalance, updateAssetFromExpense, updateRecipientFromExpense } from '@/lib/finances';

interface PantryEntryModalProps {
  isOpen: boolean;
  date: string | null;
  recordsOnDate: ExpenseRecord[];
  onClose: () => void;
  onUpdateRecords: (records: ExpenseRecord[]) => void;
  allRecords: ExpenseRecord[];
}

const CATEGORIES: ExpenseCategory[] = ['Grocery', 'Clothing', 'Transport', 'Dining', 'Bills', 'Other'];
const PAYMENT_METHODS: PaymentMethod[] = ['Cash', 'Debit Card', 'Credit Card', 'UPI / Wallet', 'Bank Transfer'];
const PAID_FROM_OPTIONS = ['Cash Wallet', 'Bank Account', 'Credit Card'];

export function PantryEntryModal({ isOpen, date, recordsOnDate, onClose, onUpdateRecords, allRecords }: PantryEntryModalProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');
  const [editingRecord, setEditingRecord] = useState<ExpenseRecord | null>(null);
  
  // Date overriding within modal
  const [internalDate, setInternalDate] = useState(date || new Date().toISOString().split('T')[0]);
  
  const [vendor, setVendor] = useState(''); // Place of Shop
  const [paidFromId, setPaidFromId] = useState(''); // Asset ID
  const [notes, setNotes] = useState('');
  
  // Grocery Items (for Bills)
  const [items, setItems] = useState<ExpenseItem[]>([]);
  
  // Single Entry Fields (for Quick Entry or single-item categories)
  const [singleItem, setSingleItem] = useState({
    name: '',
    price: '',
    quantity: '',
    brand: '',
    notes: '',
    // clothing extras
    itemType: '',
    color: '',
    size: '',
    person: '',
    quality: '',
    // transport extras
    transportType: 'Ride' as ExpenseRecord['transportType'],
    // dining extras
    occasion: '',
    peopleCount: 1,
    // bills extras
    billType: ''
  });

  // Taxes
  const [sgst, setSgst] = useState('');
  const [cgst, setCgst] = useState('');

  const [assets, setAssets] = useState<Asset[]>([]);

  useEffect(() => {
    if (recordsOnDate.length === 0) setActiveTab('form');
    
    const savedAssets = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_ASSETS));
    if (savedAssets) {
      try { setAssets(JSON.parse(savedAssets)); } catch (e) {}
    }
  }, [recordsOnDate]);

  // Load editing record
  const startEdit = (record: ExpenseRecord) => {
    setEditingRecord(record);
    setVendor(record.vendor || '');
    setPaidFromId(record.assetId || '');
    setNotes(record.notes || '');
    setSgst(record.sgst?.toString() || '');
    setCgst(record.cgst?.toString() || '');
    
    if (record.items) {
      setItems(record.items);
    } else {
      setItems([]);
    }

    setSingleItem({
      name: record.subcategory || '',
      price: record.amount.toString(),
      quantity: record.quantity || '',
      brand: record.brand || '',
      notes: record.notes || '',
      itemType: record.itemType || '',
      color: record.color || '',
      size: record.size || '',
      person: record.person || '',
      quality: record.quality || '',
      transportType: record.transportType || 'Ride',
      occasion: record.occasion || '',
      peopleCount: record.peopleCount || 1,
      billType: record.subcategory || ''
    });

    setActiveTab('form');
  };

  const handleAddItem = () => {
    setItems([...items, { id: Math.random().toString(36).substr(2, 9), name: '', category: 'Grocery', type: 'need', quantity: '', unitPrice: 0, totalPrice: 0, brand: '', notes: '', color: '', size: '', person: '', quality: '', itemType: '' }]);
  };

  const updateItem = (id: string, field: keyof ExpenseItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'unitPrice' || field === 'quantity') {
          const q = parseFloat(updated.quantity) || 1;
          updated.totalPrice = updated.unitPrice * q; 
        }
        return updated;
      }
      return item;
    }));
  };

  const totalAmount = useMemo(() => {
      const itemsTotal = items.reduce((sum, i) => sum + i.totalPrice, 0);
      const taxTotal = (parseFloat(sgst) || 0) + (parseFloat(cgst) || 0);
      return itemsTotal + taxTotal;
  }, [items, sgst, cgst]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;

    const newRecord: ExpenseRecord = {
      id: editingRecord ? editingRecord.id : Math.random().toString(36).substr(2, 9),
      entryType: 'Bill',
      category: (items[0]?.category as ExpenseCategory) || 'Grocery',
      vendor,
      paymentMethod: 'Debit Card',
      assetId: paidFromId || undefined,
      type: items[0]?.type || 'need',
      notes: notes,
      sgst: parseFloat(sgst) || undefined,
      cgst: parseFloat(cgst) || undefined,
      date: internalDate,
      amount: totalAmount,
      subcategory: vendor || items[0]?.name || 'Expense',
      paidToType: 'other',
      
      // Items for Bill mode
      items: items
    };

    // Cleanup for finance sync
    updateAssetFromExpense(newRecord.id, newRecord.assetId, newRecord.amount, newRecord.date, !!editingRecord);
    
    let updated;
    if (editingRecord) {
      updated = allRecords.map(r => r.id === editingRecord.id ? newRecord : r);
    } else {
      updated = [newRecord, ...allRecords];
    }
    
    onUpdateRecords(updated);
    onClose();
  };

  const deleteRecord = (id: string) => {
    const recordToDelete = allRecords.find(r => r.id === id);
    updateAssetFromExpense(id, undefined, 0, '', true);
    onUpdateRecords(allRecords.filter(r => r.id !== id));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 bg-zinc-950/80 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-white dark:bg-zinc-950 rounded-xl w-full max-w-5xl max-h-[92vh] shadow-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 animate-in zoom-in duration-300 flex flex-col">
        
        {/* Navigation & Header */}
        <div className="px-6 py-5 flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex flex-col gap-1 w-full md:w-auto">
            <h3 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-3">
              <input 
                 type="date" 
                 value={internalDate} 
                 onChange={e => {
                    setInternalDate(e.target.value);
                 }}
                 className="bg-transparent outline-none cursor-pointer appearance-none text-zinc-900 dark:text-white hover:text-teal-500 transition-colors"
              />
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 hidden md:block" />
              <span className="text-zinc-400 font-bold tracking-widest text-sm hidden md:block">{editingRecord ? 'Edit Entry' : 'New Entry'}</span>
            </h3>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="flex bg-zinc-100/50 dark:bg-zinc-900/50 p-1 rounded-full border border-zinc-200/50 dark:border-zinc-800/50">
                <button onClick={() => setActiveTab('list')} className={`px-4 py-2 rounded-full text-xs uppercase font-black tracking-widest transition-all ${activeTab === 'list' ? 'bg-white dark:bg-zinc-800 shadow-md text-zinc-900 dark:text-white' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>Records</button>
                <button onClick={() => setActiveTab('form')} className={`px-4 py-2 rounded-full text-xs uppercase font-black tracking-widest transition-all ${activeTab === 'form' ? 'bg-white dark:bg-zinc-800 shadow-md text-zinc-900 dark:text-white' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>Create</button>
             </div>
             <button onClick={onClose} className="p-2.5 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-all text-zinc-500 dark:text-zinc-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {activeTab === 'list' ? (
             <div className="space-y-6">
                {recordsOnDate.length === 0 ? (
                  <div className="flex flex-col items-center py-32 opacity-30 gap-3">
                     <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                     <span className="text-sm uppercase tracking-[0.4em]">Empty calendar for this date</span>
                  </div>
                ) : (
                  recordsOnDate.map(record => (
                    <div key={record.id} onClick={() => startEdit(record)} className="group p-3 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 transition-all cursor-pointer">
                        <div className="flex justify-between items-center">
                           <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-lg bg-zinc-900 dark:bg-white flex items-center justify-center text-white dark:text-zinc-900 font-bold uppercase text-sm">
                                 {record.category.charAt(0)}
                              </div>
                              <div className="flex flex-col gap-1">
                                 <div className="flex items-center gap-3">
                                   <span className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">{record.vendor || record.subcategory}</span>
                                   <span className="px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-400 text-[10px] uppercase font-bold tracking-widest">{record.entryType}</span>
                                 </div>
                                 <span className="text-sm uppercase tracking-widest text-zinc-400 font-bold">{record.paymentMethod} • {assets.find(a => a.id === record.assetId)?.name || 'Direct'}</span>
                              </div>
                           </div>
                           <div className="flex flex-col items-end gap-1">
                              <span className="text-2xl font-bold tracking-tighter text-zinc-900 dark:text-white flex items-baseline gap-1">
                                 ${record.amount.toLocaleString('en-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </span>
                              <span className={`text-[10px] uppercase font-bold tracking-widest ${record.type === 'need' ? 'text-emerald-500' : 'text-amber-500'}`}>{record.type}</span>
                           </div>
                        </div>
                    </div>
                  ))
                )}
             </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-12 pb-12">
               
               <div className="flex justify-center mb-6">
                  {/* Unified Bill Entry visual mode, toggle removed */}
               </div>

               {/* Section A: Basic Details */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-zinc-50/50 dark:bg-zinc-900/30 p-8 rounded-3xl border border-zinc-100 dark:border-zinc-800/50">
                  <div className="flex flex-col gap-3">
                     <label className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-black ml-2">Shop / Vendor Name</label>
                     <input type="text" required value={vendor} onChange={e => setVendor(e.target.value)} placeholder="e.g. Walmart, Zara" className="w-full bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-5 py-4 text-zinc-800 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/50 transition-all font-bold tracking-wide shadow-sm" />
                  </div>
                  <div className="flex flex-col gap-3">
                     <label className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-black ml-2">Paid From (Account)</label>
                     <select value={paidFromId} onChange={e => setPaidFromId(e.target.value)} className="w-full bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-5 py-4 text-zinc-800 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/50 transition-all appearance-none cursor-pointer font-bold tracking-wide shadow-sm">
                        <option value="">Manual Entry (No Account)</option>
                        {assets.map(a => <option key={a.id} value={a.id}>{a.name} (${calculateAssetBalance(a).toLocaleString('en-CA', { maximumFractionDigits: 0 })})</option>)}
                     </select>
                  </div>
               </div>

               {/* Section B: Itemized Entries */}
               <div className="space-y-6 mt-8">
                  <div className="flex items-center gap-4 px-2">
                     <span className="text-sm font-black text-zinc-800 dark:text-zinc-200 tracking-widest uppercase">Itemized Content</span>
                     <span className="flex-1 border-t border-zinc-100 dark:border-zinc-800" />
                     <button type="button" onClick={handleAddItem} className="px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-full text-xs uppercase font-black tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-zinc-200 dark:shadow-none inline-flex items-center gap-2">
                        <span>Add Item</span>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4"/></svg>
                     </button>
                  </div>

                  <div className="space-y-6">
                       <div className="grid gap-5">
                          {items.length === 0 ? (
                            <div className="py-24 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center opacity-70 gap-4 transition-all hover:bg-zinc-100 dark:hover:bg-zinc-900/50 cursor-pointer" onClick={handleAddItem}>
                               <div className="w-16 h-16 rounded-full bg-white dark:bg-zinc-950 shadow-sm flex items-center justify-center text-zinc-400">
                                   <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                               </div>
                               <span className="text-xs uppercase tracking-[0.2em] font-black text-zinc-500">Scan or add items manually</span>
                            </div>
                          ) : (
                            items.map((item, idx) => (
                               <div key={item.id} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-x-6 gap-y-5 p-6 bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm relative group animate-in slide-in-from-right-4 duration-300">
                                   <div className="col-span-1 sm:col-span-2 flex flex-col gap-2">
                                      <label className="text-[10px] uppercase font-black tracking-[0.2em] text-zinc-400 ml-2">Item Name</label>
                                      <input type="text" placeholder="e.g. Milk 3%" value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)} className="bg-zinc-50 dark:bg-zinc-900 border-none px-4 py-3 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-teal-500/30 transition-all w-full" />
                                   </div>
                                    <div className="flex flex-col gap-2">
                                      <label className="text-[10px] uppercase font-black tracking-[0.2em] text-zinc-400 ml-2">Category</label>
                                      <select value={item.category} onChange={e => updateItem(item.id, 'category', e.target.value)} className="bg-zinc-50 dark:bg-zinc-900 border-none px-4 py-3 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-teal-500/30 transition-all w-full appearance-none cursor-pointer">
                                         {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                         <option value="Others">Others</option>
                                      </select>
                                   </div>
                                   {item.category === 'Others' && (
                                      <div className="flex flex-col gap-2">
                                        <label className="text-[10px] uppercase font-black tracking-[0.2em] text-zinc-400 ml-2">Custom Cat</label>
                                        <input type="text" placeholder="e.g. Hobby" value={item.quality} onChange={e => updateItem(item.id, 'quality', e.target.value)} className="bg-zinc-50 dark:bg-zinc-900 border-none px-4 py-3 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-teal-500/30 transition-all w-full" />
                                     </div>
                                   )}
                                   <div className="flex flex-col gap-2">
                                      <label className="text-[10px] uppercase font-black tracking-[0.2em] text-zinc-400 ml-2">Price</label>
                                      <input type="number" placeholder="0.00" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', parseFloat(e.target.value))} className="bg-zinc-50 dark:bg-zinc-900 border-none px-4 py-3 rounded-2xl text-sm font-black outline-none focus:ring-2 focus:ring-teal-500/30 transition-all w-full" />
                                   </div>
                                   <div className="flex flex-col gap-2">
                                      <label className="text-[10px] uppercase font-black tracking-[0.2em] text-zinc-400 ml-2">Qty</label>
                                      <input type="number" min="0" step="any" placeholder="1, 2..." value={item.quantity} onChange={e => updateItem(item.id, 'quantity', e.target.value)} className="bg-zinc-50 dark:bg-zinc-900 border-none px-4 py-3 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-teal-500/30 transition-all w-full" />
                                   </div>
                                   <div className="flex flex-col gap-2">
                                      <label className="text-[10px] uppercase font-black tracking-[0.2em] text-zinc-400 ml-2">Size/Wt</label>
                                      <input type="text" placeholder="3L, 2kg" value={item.size || ''} onChange={e => updateItem(item.id, 'size', e.target.value)} className="bg-zinc-50 dark:bg-zinc-900 border-none px-4 py-3 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-teal-500/30 transition-all w-full" />
                                   </div>
                                   <div className="flex flex-col gap-2">
                                      <label className="text-[10px] uppercase font-black tracking-[0.2em] text-zinc-400 ml-2">Brand</label>
                                      <input type="text" placeholder="Brand" value={item.brand} onChange={e => updateItem(item.id, 'brand', e.target.value)} className="bg-zinc-50 dark:bg-zinc-900 border-none px-4 py-3 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-teal-500/30 transition-all w-full" />
                                   </div>
                                   <div className="flex flex-col gap-2">
                                      <label className="text-[10px] uppercase font-black tracking-[0.2em] text-zinc-400 ml-2">Type</label>
                                      <div className="flex bg-zinc-100 dark:bg-zinc-900 rounded-2xl p-1 w-full">
                                         <button type="button" onClick={() => updateItem(item.id, 'type', 'need')} className={`flex-1 py-1.5 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all ${item.type === 'need' ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-400 hover:text-zinc-600'}`}>Need</button>
                                         <button type="button" onClick={() => updateItem(item.id, 'type', 'want')} className={`flex-1 py-1.5 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all ${item.type === 'want' ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-400 hover:text-zinc-600'}`}>Want</button>
                                      </div>
                                   </div>
                                   <div className="col-span-full xl:col-span-4 flex flex-col gap-2">
                                       <label className="text-[10px] uppercase font-black tracking-[0.2em] text-zinc-400 ml-2">Notes & Details</label>
                                       <input type="text" placeholder="Any additional notes..." value={item.notes || ''} onChange={e => updateItem(item.id, 'notes', e.target.value)} className="bg-zinc-50 dark:bg-zinc-900 border-none px-4 py-3 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-teal-500/30 transition-all w-full" />
                                   </div>
                                  <button type="button" onClick={() => setItems(items.filter(i => i.id !== item.id))} className="absolute -top-3 -right-3 bg-zinc-900 dark:bg-zinc-100 hover:bg-rose-500 dark:hover:bg-rose-500 text-white dark:text-zinc-900 hover:text-white transition-all w-8 h-8 rounded-full flex items-center justify-center shadow-lg shadow-zinc-200 dark:shadow-none opacity-0 group-hover:opacity-100">×</button>
                              </div>
                            ))
                          )}
                       </div>
                    </div>
               </div>

               {/* Section C: Tax Section */}
               <div className="bg-zinc-50/50 dark:bg-zinc-900/30 p-8 rounded-3xl border border-zinc-100 dark:border-zinc-800/50 mt-8">
                  <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400 font-bold">%</div>
                      <span className="text-sm text-zinc-800 dark:text-zinc-200 uppercase tracking-widest font-black block">Tax Apportionment <span className="text-zinc-400 font-medium">(Optional)</span></span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="flex flex-col gap-3">
                       <label className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-black ml-2">SGST / State Tax</label>
                       <input type="number" step="0.01" value={sgst} onChange={e => setSgst(e.target.value)} placeholder="0.00" className="w-full bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-5 py-4 text-zinc-800 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/30 transition-all font-bold tracking-wide shadow-sm" />
                    </div>
                    <div className="flex flex-col gap-3">
                       <label className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-black ml-2">CGST / Central Tax</label>
                       <input type="number" step="0.01" value={cgst} onChange={e => setCgst(e.target.value)} placeholder="0.00" className="w-full bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-5 py-4 text-zinc-800 dark:text-white outline-none focus:ring-2 focus:ring-teal-500/30 transition-all font-bold tracking-wide shadow-sm" />
                    </div>
                  </div>
               </div>

               {/* Summary & Actions */}
               <div className="sticky bottom-0 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl p-6 md:p-8 -mx-6 md:-mx-8 -mb-6 md:-mb-8 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_-20px_40px_-20px_rgba(0,0,0,0.05)] dark:shadow-none">
                  <div className="flex flex-col w-full md:w-auto">
                     <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-black mb-1">Total Bill Amount</span>
                     <span className="text-3xl font-black tracking-tighter text-teal-600 dark:text-teal-400 flex items-baseline gap-2">
                        ${totalAmount.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                     </span>
                  </div>
                  <div className="flex flex-col sm:flex-row w-full md:w-auto gap-4">
                     {editingRecord && (
                       <button type="button" onClick={() => deleteRecord(editingRecord.id)} className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 transition-all text-xs uppercase font-black tracking-widest">Delete</button>
                     )}
                     <button type="button" onClick={onClose} className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all text-xs uppercase font-black tracking-widest">Discard</button>
                     <button type="submit" className="w-full sm:w-auto px-10 py-3.5 rounded-full bg-teal-600 hover:bg-teal-700 text-white transition-all text-xs uppercase font-black tracking-widest shadow-xl shadow-teal-600/20 active:scale-95">
                        Finalize Bill
                     </button>
                  </div>
               </div>

            </form>
          )}
        </div>
      </div>
    </div>
  );
}
