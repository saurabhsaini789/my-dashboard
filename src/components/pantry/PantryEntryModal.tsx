"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { ExpenseRecord, ExpenseItem, ExpenseCategory, Asset, PaymentMethod, EntryType } from '@/types/finance';
import { getPrefixedKey } from '@/lib/keys';
import { SYNC_KEYS } from '@/lib/sync-keys';
import { setSyncedItem } from '@/lib/storage';
import { calculateAssetBalance, updateAssetFromExpense, updateRecipientFromExpense, convertToINR, convertToCAD, getExchangeRate } from '@/lib/finances';

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
  
  // Overhauled Form State
  const [entryType, setEntryType] = useState<EntryType>('Bill');
  const [category, setCategory] = useState<ExpenseCategory>('Grocery');
  const [vendor, setVendor] = useState(''); // Place of Shop
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Debit Card');
  const [paidFromId, setPaidFromId] = useState(''); // Asset ID
  const [type, setType] = useState<'need' | 'want'>('need');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [notes, setNotes] = useState('');
  const [currency, setCurrency] = useState<'INR' | 'CAD'>('INR');
  
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
    setEntryType(record.entryType || 'Quick');
    setCategory(record.category);
    setVendor(record.vendor || '');
    setPaymentMethod(record.paymentMethod || 'Debit Card');
    setPaidFromId(record.assetId || '');
    setType(record.type === 'want' ? 'want' : 'need');
    setTags(record.tags || []);
    setNotes(record.notes || '');
    setCurrency(record.currency || 'INR');
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
    setItems([...items, { id: Math.random().toString(36).substr(2, 9), name: '', quantity: '', unitPrice: 0, totalPrice: 0, brand: '', notes: '', color: '', size: '', person: '', quality: '', itemType: '' }]);
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
    if (entryType === 'Bill' && (category === 'Grocery' || category === 'Clothing')) {
      const itemsTotal = items.reduce((sum, i) => sum + i.totalPrice, 0);
      const taxTotal = (parseFloat(sgst) || 0) + (parseFloat(cgst) || 0);
      return itemsTotal + taxTotal;
    }
    return parseFloat(singleItem.price) || 0;
  }, [entryType, category, items, singleItem.price, sgst, cgst]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;

    const newRecord: ExpenseRecord = {
      id: editingRecord ? editingRecord.id : Math.random().toString(36).substr(2, 9),
      entryType,
      category,
      vendor,
      paymentMethod,
      assetId: paidFromId || undefined,
      type,
      tags,
      notes,
      sgst: parseFloat(sgst) || undefined,
      cgst: parseFloat(cgst) || undefined,
      date,
      amount: totalAmount,
      subcategory: category === 'Bills' ? singleItem.billType : (singleItem.name || category),
      currency,
      paidToType: 'other',
      
      // Category Specifics
      brand: singleItem.brand,
      quantity: singleItem.quantity,
      size: singleItem.size,
      person: singleItem.person,
      color: singleItem.color,
      quality: singleItem.quality,
      itemType: singleItem.itemType,
      transportType: singleItem.transportType,
      occasion: singleItem.occasion,
      peopleCount: singleItem.peopleCount,
      
      // Items for Bill mode
      items: entryType === 'Bill' && (category === 'Grocery' || category === 'Clothing') ? items : undefined
    };

    // Cleanup for finance sync
    updateAssetFromExpense(newRecord.id, newRecord.assetId, newRecord.amount, currency, newRecord.date, !!editingRecord);
    
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
    const delCurrency = recordToDelete?.currency || 'INR';
    updateAssetFromExpense(id, undefined, 0, delCurrency, '', true);
    onUpdateRecords(allRecords.filter(r => r.id !== id));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 bg-zinc-950/80 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-white dark:bg-zinc-950 rounded-xl w-full max-w-5xl max-h-[92vh] shadow-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 animate-in zoom-in duration-300 flex flex-col">
        
        {/* Navigation & Header */}
        <div className="p-3 md:p-3 flex justify-between items-center border-b border-zinc-50 dark:border-zinc-900 bg-zinc-50/30 dark:bg-zinc-900/10">
          <div className="flex flex-col gap-1">
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white uppercase tracking-widest flex items-center gap-3">
              {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              <span className="w-1 h-1 rounded-full bg-zinc-300" />
              <span className="text-zinc-400 font-medium tracking-normal">{editingRecord ? 'Edit Entry' : 'New Entry'}</span>
            </h3>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <button onClick={() => setActiveTab('list')} className={`px-3 py-2 rounded-xl text-sm uppercase font-bold tracking-widest transition-all ${activeTab === 'list' ? 'bg-white dark:bg-zinc-800 shadow-md text-zinc-900 dark:text-white' : 'text-zinc-400'}`}>Records</button>
                <button onClick={() => setActiveTab('form')} className={`px-3 py-2 rounded-xl text-sm uppercase font-bold tracking-widest transition-all ${activeTab === 'form' ? 'bg-white dark:bg-zinc-800 shadow-md text-zinc-900 dark:text-white' : 'text-zinc-400'}`}>Create</button>
             </div>
             <button onClick={onClose} className="p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all text-zinc-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 md:p-3">
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
                                 ₹{convertToINR(record.amount, record.currency, getExchangeRate()).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                 <span className="text-sm text-zinc-400 font-medium ml-2">
                                   (C${convertToCAD(record.amount, record.currency, 1/getExchangeRate()).toLocaleString('en-CA', { maximumFractionDigits: 1 })})
                                 </span>
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
               
               {/* 1. Entry Type Toggle (Billboard Style) */}
               <div className="flex justify-center">
                  <div className="flex p-2 bg-zinc-100 dark:bg-zinc-900 rounded-[30px] w-full max-w-sm">
                     <button type="button" onClick={() => setEntryType('Bill')} className={`flex-1 py-2.5 rounded-[24px] text-sm uppercase font-bold tracking-[0.2em] transition-all ${entryType === 'Bill' ? 'bg-white dark:bg-zinc-800 shadow-xl text-zinc-900 dark:text-white scale-105' : 'text-zinc-400 hover:text-zinc-600'}`}>🧾 Bill</button>
                     <button type="button" onClick={() => setEntryType('Quick')} className={`flex-1 py-2.5 rounded-[24px] text-sm uppercase font-bold tracking-[0.2em] transition-all ${entryType === 'Quick' ? 'bg-white dark:bg-zinc-800 shadow-xl text-zinc-900 dark:text-white scale-105' : 'text-zinc-400 hover:text-zinc-600'}`}>⚡ Quick Entry</button>
                  </div>
               </div>

               {/* Section A: Basic Details */}
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 bg-zinc-50/50 dark:bg-zinc-900/20 p-3 rounded-xl border border-zinc-100 dark:border-zinc-900">
                  
                  <div className="flex flex-col gap-3">
                     <label className="text-sm text-zinc-400 uppercase tracking-widest font-bold ml-2">Place of Shop</label>
                     <input type="text" required value={vendor} onChange={e => setVendor(e.target.value)} placeholder="Walmart, Zara, etc." className="w-full bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-800 dark:text-white outline-none focus:ring-4 focus:ring-zinc-500/5 transition-all" />
                  </div>

                  <div className="flex flex-col gap-3">
                     <label className="text-sm text-zinc-400 uppercase tracking-widest font-bold ml-2">Category</label>
                     <select value={category} onChange={e => setCategory(e.target.value as any)} className="w-full bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-800 dark:text-white focus:ring-4 focus:ring-zinc-500/5 transition-all appearance-none cursor-pointer">
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                  </div>

                  <div className="flex flex-col gap-3">
                     <label className="text-sm text-zinc-400 uppercase tracking-widest font-bold ml-2">Payment Method</label>
                     <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)} className="w-full bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-800 dark:text-white focus:ring-4 focus:ring-zinc-500/5 transition-all appearance-none cursor-pointer">
                        {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                     </select>
                  </div>

                  <div className="flex flex-col gap-3">
                     <label className="text-sm text-zinc-400 uppercase tracking-widest font-bold ml-2">Paid From (Linked Account)</label>
                     <select value={paidFromId} onChange={e => setPaidFromId(e.target.value)} className="w-full bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-800 dark:text-white focus:ring-4 focus:ring-zinc-500/5 transition-all appearance-none cursor-pointer">
                        <option value="">Manual Entry (No Asset)</option>
                        {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.initialCurrency === 'CAD' ? 'C$' : '₹'}{calculateAssetBalance(a).toLocaleString(a.initialCurrency === 'CAD' ? 'en-CA' : 'en-IN', { maximumFractionDigits: 0 })})</option>)}
                     </select>
                  </div>

                  <div className="flex flex-col gap-3">
                     <label className="text-sm text-zinc-400 uppercase tracking-widest font-bold ml-2">Currency</label>
                     <div className="flex bg-white dark:bg-zinc-900 rounded-xl p-1.5 border border-zinc-100 dark:border-zinc-800">
                        <button type="button" onClick={() => setCurrency('INR')} className={`flex-1 py-2 rounded-lg text-sm uppercase font-bold tracking-widest transition-all ${currency === 'INR' ? 'bg-zinc-900 text-white dark:bg-zinc-800 shadow-md scale-105' : 'text-zinc-400 hover:text-zinc-600'}`}>INR (₹)</button>
                        <button type="button" onClick={() => setCurrency('CAD')} className={`flex-1 py-2 rounded-lg text-sm uppercase font-bold tracking-widest transition-all ${currency === 'CAD' ? 'bg-zinc-900 text-white dark:bg-zinc-800 shadow-md scale-105' : 'text-zinc-400 hover:text-zinc-600'}`}>CAD ($)</button>
                     </div>
                  </div>

                  <div className="flex flex-col gap-3">
                     <label className="text-sm text-zinc-400 uppercase tracking-widest font-bold ml-2">Priority</label>
                     <div className="flex bg-white dark:bg-zinc-900 rounded-xl p-1.5 border border-zinc-100 dark:border-zinc-800">
                        <button type="button" onClick={() => setType('need')} className={`flex-1 py-2 rounded-lg text-sm uppercase font-bold tracking-widest transition-all ${type === 'need' ? 'bg-zinc-900 text-white dark:bg-zinc-800 shadow-md scale-105' : 'text-zinc-400 hover:text-zinc-600'}`}>Need</button>
                        <button type="button" onClick={() => setType('want')} className={`flex-1 py-2 rounded-lg text-sm uppercase font-bold tracking-widest transition-all ${type === 'want' ? 'bg-zinc-900 text-white dark:bg-zinc-800 shadow-md scale-105' : 'text-zinc-400 hover:text-zinc-600'}`}>Want</button>
                     </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <label className="text-sm text-zinc-400 uppercase tracking-widest font-bold ml-2">Tags</label>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                         {tags.map(tag => (
                           <span key={tag} className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-xl text-sm font-bold text-zinc-500 flex items-center gap-2">
                              {tag}
                              <button onClick={() => setTags(tags.filter(t => t !== tag))} type="button" className="hover:text-rose-500">×</button>
                           </span>
                         ))}
                      </div>
                    )}
                    <input 
                      type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} 
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (tagInput) { setTags([...tags, tagInput]); setTagInput(''); } } }}
                      placeholder="Press Enter to add tags" className="w-full bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-800 dark:text-white outline-none focus:ring-4 focus:ring-zinc-500/5 transition-all text-sm" 
                    />
                  </div>
               </div>

               {/* Section B: Category-Based Fields */}
               <div className="space-y-8">
                  <div className="flex items-center gap-3">
                     <span className="w-12 h-0.5 bg-zinc-100 dark:bg-zinc-800" />
                     <span className="text-sm uppercase tracking-[0.5em] font-bold text-zinc-400">{category} Details</span>
                     <span className="flex-1 h-0.5 bg-zinc-100 dark:bg-zinc-800" />
                  </div>

                  {/* 1. Itemized List for Grocery/Clothing bills */}
                  {(category === 'Grocery' || category === 'Clothing') && entryType === 'Bill' && (
                    <div className="space-y-6">
                       <div className="flex justify-between items-center px-4">
                          <span className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Itemized {category} List</span>
                          <button type="button" onClick={handleAddItem} className="px-3 py-2.5 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 rounded-lg text-sm uppercase font-bold tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-zinc-200 dark:shadow-none">➕ Add Item</button>
                       </div>
                       
                       <div className="grid gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                          {items.length === 0 ? (
                            <div className="py-20 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border-2 border-dashed border-zinc-100 dark:border-zinc-800 flex flex-col items-center justify-center opacity-40 gap-3">
                               <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                               <span className="text-sm uppercase tracking-widest font-bold">Add your first {category.toLowerCase()} item to build the bill</span>
                            </div>
                          ) : (
                            items.map((item, idx) => (
                              <div key={item.id} className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-3 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-100 dark:border-zinc-900 relative group animate-in slide-in-from-right-4 duration-300">
                                 {category === 'Grocery' ? (
                                   <>
                                     <div className="col-span-1 md:col-span-2 flex flex-col gap-2">
                                        <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 ml-4">Item Name</label>
                                        <input type="text" placeholder="e.g. Milk 3%" value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)} className="bg-white dark:bg-zinc-950 p-2 px-3 rounded-lg text-sm outline-none" />
                                     </div>
                                     <div className="flex flex-col gap-2">
                                        <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 ml-4">Price</label>
                                        <input type="number" placeholder="0.00" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', parseFloat(e.target.value))} className="bg-white dark:bg-zinc-950 p-2 px-3 rounded-lg text-sm outline-none font-bold" />
                                     </div>
                                     <div className="flex flex-col gap-2">
                                        <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 ml-4">Quantity</label>
                                        <input type="number" min="1" placeholder="e.g. 1, 2" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', e.target.value)} className="bg-white dark:bg-zinc-950 p-2 px-3 rounded-lg text-sm outline-none" />
                                     </div>
                                     <div className="flex flex-col gap-2">
                                        <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 ml-4">Size/Wt</label>
                                        <input type="text" placeholder="e.g. 3L, 2kg" value={item.size || ''} onChange={e => updateItem(item.id, 'size', e.target.value)} className="bg-white dark:bg-zinc-950 p-2 px-3 rounded-lg text-sm outline-none" />
                                     </div>
                                     <div className="flex flex-col gap-2">
                                        <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 ml-4">Brand</label>
                                        <input type="text" placeholder="e.g. Walmart" value={item.brand} onChange={e => updateItem(item.id, 'brand', e.target.value)} className="bg-white dark:bg-zinc-950 p-2 px-3 rounded-lg text-sm outline-none" />
                                     </div>
                                   </>
                                 ) : (
                                   <>
                                     {/* Clothing Item Card */}
                                     <div className="col-span-1 md:col-span-2 flex flex-col gap-2">
                                        <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 ml-4">Item Name</label>
                                        <input type="text" placeholder="e.g. Cotton Shirt" value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)} className="bg-white dark:bg-zinc-950 p-2 px-3 rounded-lg text-sm outline-none" />
                                     </div>
                                     <div className="flex flex-col gap-2">
                                        <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 ml-4">Type</label>
                                        <input type="text" placeholder="shirt, jeans..." value={item.itemType} onChange={e => updateItem(item.id, 'itemType', e.target.value)} className="bg-white dark:bg-zinc-950 p-2 px-3 rounded-lg text-sm outline-none" />
                                     </div>
                                     <div className="flex flex-col gap-2">
                                        <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 ml-4">Color</label>
                                        <input type="text" placeholder="Blue, Black..." value={item.color} onChange={e => updateItem(item.id, 'color', e.target.value)} className="bg-white dark:bg-zinc-950 p-2 px-3 rounded-lg text-sm outline-none" />
                                     </div>
                                     <div className="flex flex-col gap-2">
                                        <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 ml-4">Size</label>
                                        <input type="text" placeholder="M, L, 32..." value={item.size} onChange={e => updateItem(item.id, 'size', e.target.value)} className="bg-white dark:bg-zinc-950 p-2 px-3 rounded-lg text-sm outline-none" />
                                     </div>
                                     <div className="flex flex-col gap-2">
                                        <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 ml-4">Price</label>
                                        <input type="number" placeholder="0.00" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', parseFloat(e.target.value))} className="bg-white dark:bg-zinc-950 p-2 px-3 rounded-lg text-sm outline-none font-bold" />
                                     </div>
                                     <div className="flex flex-col gap-2">
                                        <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 ml-4">Brand</label>
                                        <input type="text" placeholder="Zara, H&M..." value={item.brand} onChange={e => updateItem(item.id, 'brand', e.target.value)} className="bg-white dark:bg-zinc-950 p-2 px-3 rounded-lg text-sm outline-none" />
                                     </div>
                                     <div className="flex flex-col gap-2">
                                        <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 ml-4">Person</label>
                                        <input type="text" placeholder="Name" value={item.person} onChange={e => updateItem(item.id, 'person', e.target.value)} className="bg-white dark:bg-zinc-950 p-2 px-3 rounded-lg text-sm outline-none" />
                                     </div>
                                     <div className="flex flex-col gap-2">
                                        <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 ml-4">Quality</label>
                                        <input type="text" placeholder="Good, Cotton..." value={item.quality} onChange={e => updateItem(item.id, 'quality', e.target.value)} className="bg-white dark:bg-zinc-950 p-2 px-3 rounded-lg text-sm outline-none" />
                                     </div>
                                   </>
                                 )}
                                 <button type="button" onClick={() => setItems(items.filter(i => i.id !== item.id))} className="absolute -top-3 -right-3 bg-rose-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg shadow-rose-200 dark:shadow-none opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                              </div>
                            ))
                          )}
                       </div>
                    </div>
                  )}

                  {/* 2. Quick Entry (Any Category) or Bills/Other Categories */}
                  {(entryType === 'Quick' || (category !== 'Grocery' && category !== 'Clothing')) && (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl">
                        {category === 'Grocery' && (
                          <>
                            <div className="flex flex-col gap-2"><input type="text" placeholder="Item Name" value={singleItem.name} onChange={e => setSingleItem({...singleItem, name: e.target.value})} className="p-3 rounded-lg bg-white dark:bg-zinc-950 text-sm outline-none" /></div>
                            <div className="flex flex-col gap-2"><input type="number" placeholder="Price" value={singleItem.price} onChange={e => setSingleItem({...singleItem, price: e.target.value})} className="p-3 rounded-lg bg-white dark:bg-zinc-950 text-sm outline-none font-bold" /></div>
                            <div className="flex flex-col gap-2"><input type="number" min="1" placeholder="Quantity (e.g. 1)" value={singleItem.quantity} onChange={e => setSingleItem({...singleItem, quantity: e.target.value})} className="p-3 rounded-lg bg-white dark:bg-zinc-950 text-sm outline-none" /></div>
                            <div className="flex flex-col gap-2"><input type="text" placeholder="Size/Weight (e.g. 3L)" value={singleItem.size} onChange={e => setSingleItem({...singleItem, size: e.target.value})} className="p-3 rounded-lg bg-white dark:bg-zinc-950 text-sm outline-none" /></div>
                            <div className="flex flex-col gap-2"><input type="text" placeholder="Brand" value={singleItem.brand} onChange={e => setSingleItem({...singleItem, brand: e.target.value})} className="p-3 rounded-lg bg-white dark:bg-zinc-950 text-sm outline-none" /></div>
                          </>
                        )}
                        {category === 'Clothing' && (
                          <>
                            <div className="flex flex-col gap-2"><input type="text" placeholder="Item Name" value={singleItem.name} onChange={e => setSingleItem({...singleItem, name: e.target.value})} className="p-3 rounded-lg bg-white dark:bg-zinc-950 text-sm outline-none" /></div>
                            <div className="flex flex-col gap-2"><input type="text" placeholder="Type (shirt, jeans...)" value={singleItem.itemType} onChange={e => setSingleItem({...singleItem, itemType: e.target.value})} className="p-3 rounded-lg bg-white dark:bg-zinc-950 text-sm outline-none" /></div>
                            <div className="flex flex-col gap-2"><input type="text" placeholder="Color" value={singleItem.color} onChange={e => setSingleItem({...singleItem, color: e.target.value})} className="p-3 rounded-lg bg-white dark:bg-zinc-950 text-sm outline-none" /></div>
                            <div className="flex flex-col gap-2"><input type="text" placeholder="Size" value={singleItem.size} onChange={e => setSingleItem({...singleItem, size: e.target.value})} className="p-3 rounded-lg bg-white dark:bg-zinc-950 text-sm outline-none" /></div>
                            <div className="flex flex-col gap-2"><input type="text" placeholder="Person Name" value={singleItem.person} onChange={e => setSingleItem({...singleItem, person: e.target.value})} className="p-3 rounded-lg bg-white dark:bg-zinc-950 text-sm outline-none" /></div>
                            <div className="flex flex-col gap-2"><input type="number" placeholder="Price" value={singleItem.price} onChange={e => setSingleItem({...singleItem, price: e.target.value})} className="p-3 rounded-lg bg-white dark:bg-zinc-950 text-sm outline-none font-bold" /></div>
                            <div className="flex flex-col gap-2"><input type="text" placeholder="Brand" value={singleItem.brand} onChange={e => setSingleItem({...singleItem, brand: e.target.value})} className="p-3 rounded-lg bg-white dark:bg-zinc-950 text-sm outline-none" /></div>
                            <div className="flex flex-col gap-2"><input type="text" placeholder="Quality" value={singleItem.quality} onChange={e => setSingleItem({...singleItem, quality: e.target.value})} className="p-3 rounded-lg bg-white dark:bg-zinc-950 text-sm outline-none" /></div>
                          </>
                        )}
                        {category === 'Transport' && (
                          <>
                            <div className="flex flex-col gap-2">
                               <select value={singleItem.transportType} onChange={e => setSingleItem({...singleItem, transportType: e.target.value as any})} className="p-3 rounded-lg bg-white dark:bg-zinc-950 text-sm outline-none appearance-none">
                                  <option value="Ride">Ride</option><option value="Recharge">Recharge</option><option value="Ticket">Ticket</option><option value="Other">Other</option>
                               </select>
                            </div>
                            <div className="flex flex-col gap-2"><input type="number" placeholder="Amount" value={singleItem.price} onChange={e => setSingleItem({...singleItem, price: e.target.value})} className="p-3 rounded-lg bg-white dark:bg-zinc-950 text-sm outline-none font-bold" /></div>
                          </>
                        )}
                        {category === 'Dining' && (
                          <>
                            <div className="flex flex-col gap-2"><input type="text" placeholder="Restaurant Name" value={vendor} onChange={e => setVendor(e.target.value)} className="p-3 rounded-lg bg-white dark:bg-zinc-950 text-sm outline-none" /></div>
                            <div className="flex flex-col gap-2"><input type="number" placeholder="Total Bill" value={singleItem.price} onChange={e => setSingleItem({...singleItem, price: e.target.value})} className="p-3 rounded-lg bg-white dark:bg-zinc-950 text-sm outline-none font-bold" /></div>
                            <div className="flex flex-col gap-2"><input type="number" placeholder="People" value={singleItem.peopleCount} onChange={e => setSingleItem({...singleItem, peopleCount: parseInt(e.target.value)})} className="p-3 rounded-lg bg-white dark:bg-zinc-950 text-sm outline-none" /></div>
                            <div className="flex flex-col gap-2"><input type="text" placeholder="Occasion" value={singleItem.occasion} onChange={e => setSingleItem({...singleItem, occasion: e.target.value})} className="p-3 rounded-lg bg-white dark:bg-zinc-950 text-sm outline-none" /></div>
                          </>
                        )}
                        {category === 'Bills' && (
                          <>
                            <div className="flex flex-col gap-2"><input type="text" placeholder="Bill Type (Electricity, etc.)" value={singleItem.billType} onChange={e => setSingleItem({...singleItem, billType: e.target.value})} className="p-3 rounded-lg bg-white dark:bg-zinc-950 text-sm outline-none" /></div>
                            <div className="flex flex-col gap-2"><input type="number" placeholder="Amount" value={singleItem.price} onChange={e => setSingleItem({...singleItem, price: e.target.value})} className="p-3 rounded-lg bg-white dark:bg-zinc-950 text-sm outline-none font-bold" /></div>
                          </>
                        )}
                        {category === 'Other' && (
                          <>
                            <div className="flex flex-col gap-2"><input type="text" placeholder="Expense Name" value={singleItem.name} onChange={e => setSingleItem({...singleItem, name: e.target.value})} className="p-3 rounded-lg bg-white dark:bg-zinc-950 text-sm outline-none" /></div>
                            <div className="flex flex-col gap-2"><input type="number" placeholder="Amount" value={singleItem.price} onChange={e => setSingleItem({...singleItem, price: e.target.value})} className="p-3 rounded-lg bg-white dark:bg-zinc-950 text-sm outline-none font-bold" /></div>
                          </>
                        )}
                        <div className="col-span-full">
                           <textarea placeholder="Notes..." value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-3 rounded-xl bg-white dark:bg-zinc-950 text-sm outline-none h-24 resize-none" />
                        </div>
                     </div>
                  )}
               </div>

               {/* Section C: Tax Section */}
               <div className="bg-zinc-50/50 dark:bg-zinc-900/30 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <span className="text-sm text-zinc-400 uppercase tracking-widest font-bold mb-8 block">Tax Details (Optional)</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-3">
                       <label className="text-sm text-zinc-400 uppercase tracking-widest font-bold ml-2">SGST</label>
                       <input type="number" step="0.01" value={sgst} onChange={e => setSgst(e.target.value)} placeholder="0.00" className="w-full bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-800 dark:text-white outline-none" />
                    </div>
                    <div className="flex flex-col gap-3">
                       <label className="text-sm text-zinc-400 uppercase tracking-widest font-bold ml-2">CGST</label>
                       <input type="number" step="0.01" value={cgst} onChange={e => setCgst(e.target.value)} placeholder="0.00" className="w-full bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-800 dark:text-white outline-none" />
                    </div>
                  </div>
               </div>

               {/* Summary & Actions */}
               <div className="sticky bottom-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl p-3 -mx-2 md:-mx-3 -mb-2 md:-mb-3 border-t border-zinc-50 dark:border-zinc-900 flex items-center justify-between">
                  <div className="flex flex-col">
                     <span className="text-sm uppercase tracking-widest text-zinc-400 font-bold">Total Bill Amount</span>
                     <span className="text-3xl font-bold tracking-tighter text-zinc-900 dark:text-white flex items-baseline gap-2">
                        ₹{convertToINR(totalAmount, currency, getExchangeRate()).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        <span className="text-lg text-zinc-400 font-medium ml-2">
                          (C${convertToCAD(totalAmount, currency, 1/getExchangeRate()).toLocaleString('en-CA', { maximumFractionDigits: 1 })})
                        </span>
                     </span>
                  </div>
                  <div className="flex gap-3">
                     {editingRecord && (
                       <button type="button" onClick={() => deleteRecord(editingRecord.id)} className="px-4 py-2.5 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 transition-all text-sm uppercase font-bold tracking-widest">Delete</button>
                     )}
                     <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 transition-all text-sm uppercase font-bold tracking-widest">Discard</button>
                     <button type="submit" className="px-12 py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:scale-[1.02] active:scale-95 transition-all text-sm uppercase font-bold tracking-[0.4em] shadow-2xl shadow-zinc-300 dark:shadow-none">
                        {entryType === 'Bill' ? '✅ Finalize Bill' : '🚀 Save Entry'}
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
