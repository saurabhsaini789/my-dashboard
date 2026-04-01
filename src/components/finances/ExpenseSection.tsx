"use client";

import React, { useState, useEffect, useRef } from 'react';
import { getPrefixedKey } from '@/lib/keys';
import { setSyncedItem } from '@/lib/storage';
import { calculateAssetBalance, convertToCAD, convertToINR, getExchangeRate } from '@/lib/finances';
import { ExpenseMetrics } from './ExpenseMetrics';
import { MultiSelectDropdown } from '../ui/MultiSelectDropdown';
import { MONTHS, YEARS } from '@/lib/constants';
import { SYNC_KEYS } from '@/lib/sync-keys';
import { ExpenseRecord, ExpenseCategory, ExpenseType } from '@/types/finance';

const CATEGORIES: ExpenseCategory[] = ['rent', 'EMI', 'Insurance', 'food', 'travel', 'shopping', 'investment', 'savings'];
const TYPES: ExpenseType[] = ['need', 'want', 'investment'];

export function ExpenseSection() {
  const [records, setRecords] = useState<ExpenseRecord[]>([]);
  const [assets, setAssets] = useState<any[]>([]); 
  const [savingsGoals, setSavingsGoals] = useState<any[]>([]);
  const [emergencyFund, setEmergencyFund] = useState<any | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ExpenseRecord | null>(null);

  // Filter states
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]); // Initialize empty for SSR
  const [selectedYears, setSelectedYears] = useState<number[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    category: 'food' as ExpenseCategory,
    subcategory: '',
    amount: '',
    currency: 'INR' as 'INR' | 'CAD',
    date: '', // Initialize empty for SSR
    type: 'need' as ExpenseType,
    assetId: '',
    paidToType: 'other' as ExpenseRecord['paidToType'],
    paidToId: '',
    paidToName: '',
    entryType: 'Quick' as ExpenseRecord['entryType'],
    paymentMethod: 'UPI / Wallet' as ExpenseRecord['paymentMethod']
  });

  const recordsRef = useRef(records);
  useEffect(() => {
    recordsRef.current = records;
  }, [records]);

  useEffect(() => {
    const saved = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_EXPENSES));
    if (saved) {
      try {
        recordsRef.current = JSON.parse(saved);
        setRecords(recordsRef.current);
      } catch (e) {
        console.error("Failed to parse expense data", e);
      }
    } else {
        const mock: ExpenseRecord[] = [
            { id: '1', category: 'food', subcategory: 'Groceries', amount: 150, date: new Date().toISOString().split('T')[0], type: 'need', paidToType: 'other', entryType: 'Quick', paymentMethod: 'Credit Card' },
            { id: '2', category: 'travel', subcategory: 'Uber', amount: 25, date: new Date().toISOString().split('T')[0], type: 'want', paidToType: 'other', entryType: 'Quick', paymentMethod: 'Credit Card' },
            { id: '3', category: 'rent', subcategory: 'Monthly Rent', amount: 1800, date: new Date().toISOString().split('T')[0], type: 'need', paidToType: 'other', entryType: 'Quick', paymentMethod: 'Bank Transfer' },
        ];
        recordsRef.current = mock;
        setRecords(mock);
    }
    
    setSelectedMonths([new Date().getMonth()]);
    setSelectedYears([new Date().getFullYear()]);
    setFormData(prev => ({ ...prev, date: new Date().toISOString().split('T')[0] }));
    setIsLoaded(true);

    // Load assets for dropdown
    const savedAssets = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_ASSETS));
    if (savedAssets) {
      try { setAssets(JSON.parse(savedAssets)); } catch (e) {}
    }
  }, []); // Run only once

  useEffect(() => {
    if (!isLoaded) return;
    
    const handleLocal = (e: any) => {
      if (e.detail && e.detail.key === SYNC_KEYS.FINANCES_EXPENSES) {
        const val = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_EXPENSES));
        if (val && val !== JSON.stringify(recordsRef.current)) {
          try { setRecords(JSON.parse(val)); } catch (e) {}
        }
      }
      if (e.detail && e.detail.key === SYNC_KEYS.FINANCES_ASSETS) {
        const val = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_ASSETS));
        if (val) {
          try { setAssets(JSON.parse(val)); } catch (e) {}
        }
      }
      if (e.detail && e.detail.key === SYNC_KEYS.FINANCES_SAVINGS_TARGETS) {
        const val = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_SAVINGS_TARGETS));
        if (val) {
          try { setSavingsGoals(JSON.parse(val)); } catch (err) {}
        }
      }
      if (e.detail && e.detail.key === SYNC_KEYS.FINANCES_EMERGENCY_FUND) {
        const val = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_EMERGENCY_FUND));
        if (val) {
          try { setEmergencyFund(JSON.parse(val)); } catch (err) {}
        }
      }
      if (e.detail && e.detail.key === SYNC_KEYS.FINANCES_EXCHANGE_RATE) {
        // Trigger re-render to update metrics
        setIsLoaded(false);
        setTimeout(() => setIsLoaded(true), 0);
      }
    };
    window.addEventListener('local-storage-change', handleLocal);
    return () => window.removeEventListener('local-storage-change', handleLocal);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      setSyncedItem(SYNC_KEYS.FINANCES_EXPENSES, JSON.stringify(records));
    }
  }, [records, isLoaded]);


  const openAddModal = () => {
    setEditingRecord(null);
    setFormData({
      category: 'food',
      subcategory: '',
      amount: '',
      currency: 'INR',
      date: new Date().toISOString().split('T')[0],
      type: 'need',
      assetId: '',
      paidToType: 'other',
      paidToId: '',
      paidToName: '',
      entryType: 'Quick',
      paymentMethod: 'UPI / Wallet'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (record: ExpenseRecord) => {
    setEditingRecord(record);
    setFormData({
      category: record.category,
      subcategory: record.subcategory,
      amount: record.amount.toString(),
      currency: record.currency || 'INR',
      date: record.date,
      type: record.type,
      assetId: record.assetId || '',
      paidToType: record.paidToType || 'other',
      paidToId: record.paidToId || '',
      paidToName: record.paidToName || '',
      entryType: record.entryType || 'Quick',
      paymentMethod: record.paymentMethod || 'UPI / Wallet'
    });
    setIsModalOpen(true);
  };

  const updateRecipientContribution = (expenseId: string, paidToType: string, paidToId: string | undefined, amount: number, currency: 'INR' | 'CAD', date: string, isDelete = false) => {
    // Get exchange rate
    const savedRate = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_EXCHANGE_RATE));
    const exchangeRate = savedRate ? parseFloat(savedRate) : 67;
    const amountInINR = currency === 'CAD' ? amount * exchangeRate : amount;

    // 1. Savings Goals
    if (paidToType === 'savings' || !paidToType) {
      const saved = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_SAVINGS_TARGETS));
      if (saved) {
        try {
          let goals = JSON.parse(saved);
          let changed = false;
          goals = goals.map((g: any) => {
            const initialLen = g.contributions.length;
            g.contributions = g.contributions.filter((c: any) => c.id !== `expense-${expenseId}`);
            if (g.contributions.length !== initialLen) changed = true;
            if (!isDelete && paidToType === 'savings' && g.id === paidToId) {
              g.contributions.unshift({ id: `expense-${expenseId}`, date, amount, currency });
              changed = true;
            }
            return g;
          });
          if (changed) setSyncedItem(SYNC_KEYS.FINANCES_SAVINGS_TARGETS, JSON.stringify(goals));
        } catch (e) {}
      }
    }

    // 2. Emergency Fund
    if (paidToType === 'emergency' || !paidToType) {
      const saved = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_EMERGENCY_FUND));
      if (saved) {
        try {
          let fund = JSON.parse(saved);
          let changed = false;
          const initialLen = fund.contributions.length;
          fund.contributions = fund.contributions.filter((c: any) => c.id !== `expense-${expenseId}`);
          if (fund.contributions.length !== initialLen) changed = true;
          if (!isDelete && paidToType === 'emergency') {
            fund.contributions.unshift({ id: `expense-${expenseId}`, date, amount, currency });
            changed = true;
          }
          if (changed) setSyncedItem(SYNC_KEYS.FINANCES_EMERGENCY_FUND, JSON.stringify(fund));
        } catch (e) {}
      }
    }

    // 3. Asset (Contribution to asset)
    if (paidToType === 'asset' || !paidToType) {
      const saved = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_ASSETS));
      if (saved) {
        try {
          let assetsList = JSON.parse(saved);
          let changed = false;
          assetsList = assetsList.map((asset: any) => {
            const initialLen = asset.contributions.length;
            asset.contributions = asset.contributions.filter((c: any) => c.id !== `expense-recip-${expenseId}`);
            if (asset.contributions.length !== initialLen) changed = true;
            if (!isDelete && paidToType === 'asset' && asset.id === paidToId) {
              asset.contributions.unshift({ id: `expense-recip-${expenseId}`, date, amount, currency });
              changed = true;
            }
            return asset;
          });
          if (changed) setSyncedItem(SYNC_KEYS.FINANCES_ASSETS, JSON.stringify(assetsList));
        } catch (e) {}
      }
    }
  };

  const updateAssetContribution = (expenseId: string, assetId: string | undefined, amount: number, currency: 'INR' | 'CAD', date: string, isDelete = false) => {
    const savedAssets = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_ASSETS));
    if (!savedAssets) return;

    const savedRate = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_EXCHANGE_RATE));
    const exchangeRate = savedRate ? parseFloat(savedRate) : 67;
    const amountInINR = currency === 'CAD' ? amount * exchangeRate : amount;

    try {
      let assetsList = JSON.parse(savedAssets);
      let changed = false;

      // 1. Remove old contribution from any asset that might have it
      assetsList = assetsList.map((asset: any) => {
        const initialLen = asset.contributions.length;
        asset.contributions = asset.contributions.filter((c: any) => c.id !== `expense-${expenseId}`);
        if (asset.contributions.length !== initialLen) {
            changed = true;
            asset.lastUpdated = new Date().toISOString().split('T')[0];
        }
        return asset;
      });

      // 2. Add new negative contribution if not deleting and assetId is present
      if (!isDelete && assetId) {
        const targetAsset = assetsList.find((a: any) => a.id === assetId);
        if (targetAsset) {
          targetAsset.contributions.unshift({
            id: `expense-${expenseId}`,
            date: date,
            amount: -amount, // Store original amount (negated)
            currency: currency
          });
          targetAsset.lastUpdated = new Date().toISOString().split('T')[0];
          changed = true;
        }
      }

      if (changed) {
        setSyncedItem(SYNC_KEYS.FINANCES_ASSETS, JSON.stringify(assetsList));
        // Update local state if the component is mounted (handled by event listener)
      }
    } catch (e) {
      console.error("Failed to update asset contributions from expenses", e);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(formData.amount);
    if (isNaN(amount)) return;

    const newRecord: ExpenseRecord = {
      id: editingRecord ? editingRecord.id : Math.random().toString(36).substr(2, 9),
      category: formData.category,
      subcategory: formData.subcategory,
      amount,
      currency: formData.currency,
      date: formData.date,
      type: formData.type,
      assetId: formData.assetId || undefined,
      paidToType: formData.paidToType,
      paidToId: formData.paidToId || undefined,
      paidToName: formData.paidToName || undefined,
      entryType: formData.entryType,
      paymentMethod: formData.paymentMethod
    };

    // Update Asset Sync: Subtract from account paid from
    updateAssetContribution(newRecord.id, newRecord.assetId, newRecord.amount, newRecord.currency || 'INR', newRecord.date);
    
    // Update Recipient Sync: Add to savings/emergency/etc if applicable
    updateRecipientContribution(newRecord.id, newRecord.paidToType, newRecord.paidToId, newRecord.amount, newRecord.currency || 'INR', newRecord.date);

    if (editingRecord) {
      setRecords(records.map(r => r.id === editingRecord.id ? newRecord : r));
    } else {
      setRecords([newRecord, ...records]);
    }
    setIsModalOpen(false);
  };

  const deleteRecord = (id: string) => {
    // Update Asset Sync: Remove negative contribution
    updateAssetContribution(id, undefined, 0, 'INR', '', true);
    
    // Update Recipient Sync: Remove positive contribution
    updateRecipientContribution(id, '', undefined, 0, 'INR', '', true);

    setRecords(records.filter(r => r.id !== id));
    if (editingRecord?.id === id) setIsModalOpen(false);
  };

  const filteredRecords = records.filter(r => {
    const d = new Date(r.date);
    return selectedMonths.includes(d.getMonth()) && selectedYears.includes(d.getFullYear());
  });

  if (!isLoaded) return null;

  return (
    <div className="flex flex-col gap-8 w-full transition-all duration-700 animate-in fade-in slide-in-from-bottom-8">
      {/* Integrated Heading, Filters & Global Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
            Expenses
        </h2>
        
        <div className="flex flex-wrap items-center gap-4">
            <div className="flex gap-3">
                <MultiSelectDropdown 
                    label="Month" 
                    options={MONTHS} 
                    selected={selectedMonths} 
                    onChange={setSelectedMonths} 
                />
                <MultiSelectDropdown 
                    label="Year" 
                    options={YEARS} 
                    selected={selectedYears} 
                    onChange={setSelectedYears} 
                />
            </div>
            <button 
                onClick={openAddModal}
                className="bg-rose-600 text-white uppercase tracking-widest text-xs px-8 py-4 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-rose-200/50 dark:shadow-none h-[54px]"
            >
                Add Expense
            </button>
        </div>
      </div>

      <div className="flex flex-col gap-10">
          {/* Top Row: Metrics Integrated into the main flow */}
          <ExpenseMetrics records={records} selectedMonths={selectedMonths} selectedYears={selectedYears} />

          {/* Table Section */}
          <div className="bg-rose-50/20 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-900/30 rounded-[40px] p-2 overflow-hidden hover:shadow-2xl transition-all flex flex-col pt-8">
              <div className="flex items-center justify-between px-8 mb-8">
                  <span className="text-xs text-zinc-600 dark:text-zinc-400 uppercase tracking-[0.3em]">Detailed Records</span>
              </div>

              <div className="overflow-x-auto px-4">
                  <table className="w-full text-left border-collapse">
                      <thead>
                          <tr className="border-b border-zinc-50 dark:border-zinc-800/50">
                              <th className="px-4 py-4 text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Date</th>
                              <th className="px-4 py-4 text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Category</th>
                              <th className="px-4 py-4 text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Subcategory</th>
                              <th className="px-4 py-4 text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Type</th>
                              <th className="px-4 py-4 text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Paid from</th>
                              <th className="px-4 py-4 text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Paid to</th>
                              <th className="px-4 py-4 text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400 text-right">Amount</th>
                              <th className="px-4 py-4 text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400"></th>
                          </tr>
                      </thead>
                      <tbody>
                          {filteredRecords.length > 0 ? filteredRecords.map(record => (
                              <tr key={record.id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors border-b border-zinc-50 dark:border-zinc-800/20 last:border-0">
                                  <td className="px-4 py-5">
                                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                          {new Date(record.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                                      </span>
                                  </td>
                                  <td className="px-4 py-5">
                                      <span className="text-sm text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
                                          {record.category}
                                      </span>
                                  </td>
                                  <td className="px-4 py-5">
                                      <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase">
                                          {record.subcategory || '-'}
                                      </span>
                                  </td>
                                  <td className="px-4 py-5">
                                      <span className="text-xs uppercase tracking-widest px-2.5 py-1 rounded-lg border bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400">
                                          {record.type}
                                      </span>
                                  </td>
                                  <td className="px-4 py-5">
                                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                          {assets.find(a => a.id === record.assetId)?.name || '-'}
                                      </span>
                                  </td>
                                  <td className="px-4 py-5">
                                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                          {record.paidToType === 'other' 
                                            ? record.paidToName || '-' 
                                            : record.paidToType === 'emergency'
                                            ? 'Emergency Fund'
                                            : record.paidToType === 'savings'
                                            ? (savingsGoals.find(g => g.id === record.paidToId)?.name || 'Savings Goal')
                                            : record.paidToType === 'asset'
                                            ? (assets.find(a => a.id === record.paidToId)?.name || 'Asset')
                                            : '-'}
                                      </span>
                                  </td>
                                   <td className="px-4 py-5 text-right">
                                       <span className="text-base text-zinc-900 dark:text-zinc-100 tracking-tighter">
                                           {record.currency === 'CAD' ? `C${record.amount.toLocaleString('en-IN')}` : `₹${record.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                                       </span>
                                       <span className="text-[10px] text-zinc-500 uppercase tracking-tighter block text-right">
                                           {record.currency === 'CAD' 
                                            ? `(₹${convertToINR(record.amount, 'CAD').toLocaleString('en-IN', { maximumFractionDigits: 0 })})` 
                                            : `(CAD ${convertToCAD(record.amount).toLocaleString('en-US', { maximumFractionDigits: 0 })})`}
                                       </span>
                                   </td>
                                  <td className="px-4 py-5 text-right">
                                      <button 
                                        onClick={() => openEditModal(record)}
                                        className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 opacity-0 group-hover:opacity-100 transition-all"
                                      >
                                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                      </button>
                                  </td>
                              </tr>
                          )) : (
                              <tr>
                                  <td colSpan={7} className="px-8 py-20 text-center">
                                      <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em]">No expenses recorded for this period</span>
                                  </td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-[40px] w-full max-w-xl shadow-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 animate-in zoom-in duration-300">
            <div className="p-10">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-3xl font-bold text-zinc-900 dark:text-white uppercase tracking-tighter">
                  {editingRecord ? 'Edit Expense' : 'Add Expense'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] ml-2">Category</label>
                        <select 
                            value={formData.category} 
                            onChange={e => setFormData({...formData, category: e.target.value as ExpenseCategory})}
                            className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-4 text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all appearance-none"
                        >
                            {CATEGORIES.map(category => (
                                <option key={category} value={category}>{category.charAt(0).toUpperCase() + category.slice(1)}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] ml-2">Type</label>
                        <select 
                            value={formData.type} 
                            onChange={e => setFormData({...formData, type: e.target.value as ExpenseType})}
                            className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-4 text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all appearance-none"
                        >
                            {TYPES.map(type => (
                                <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] ml-2">Subcategory</label>
                    <input 
                        type="text" value={formData.subcategory} 
                        onChange={e => setFormData({...formData, subcategory: e.target.value})} 
                        placeholder="e.g. Groceries, Rent, Netflix..."
                        className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-4 text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all" 
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex flex-col gap-2 md:col-span-2">
                        <label className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] ml-2">Amount</label>
                        <div className="relative">
                            <select 
                                value={formData.currency}
                                onChange={e => setFormData({...formData, currency: e.target.value as 'INR' | 'CAD'})}
                                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2 py-1 text-[10px] font-bold text-zinc-600 outline-none"
                            >
                                <option value="INR">INR (₹)</option>
                                <option value="CAD">CAD (C$)</option>
                            </select>
                            <input 
                                required type="number" step="0.01" value={formData.amount} 
                                onChange={e => setFormData({...formData, amount: e.target.value})} 
                                placeholder="0.00"
                                className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl pl-24 pr-6 py-4 text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all text-xl" 
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] ml-2">Date</label>
                        <input 
                            required type="date" value={formData.date} 
                            onChange={e => setFormData({...formData, date: e.target.value})} 
                            className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-4 text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all h-[60px]" 
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] ml-2">Paid From (Source Account)</label>
                        <select 
                            value={formData.assetId} 
                            onChange={e => setFormData({...formData, assetId: e.target.value})}
                            className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-4 text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all appearance-none cursor-pointer"
                        >
                            <option value="">No linked account</option>
                            {assets.filter(a => a.type === 'Bank Balance' || a.type === 'Cash').map(asset => (
                                <option key={asset.id} value={asset.id}>{asset.name}</option>
                            ))}
                            {assets.filter(a => a.type !== 'Bank Balance' && a.type !== 'Cash').length > 0 && (
                                <optgroup label="Other Assets">
                                    {assets.filter(a => a.type !== 'Bank Balance' && a.type !== 'Cash').map(asset => (
                                        <option key={asset.id} value={asset.id}>{asset.name}</option>
                                    ))}
                                </optgroup>
                            )}
                        </select>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] ml-2">Paid To (Recipient)</label>
                        <select 
                            value={formData.paidToId ? `${formData.paidToType}:${formData.paidToId}` : formData.paidToType} 
                            onChange={e => {
                                const val = e.target.value;
                                if (val.includes(':')) {
                                    const [type, id] = val.split(':');
                                    setFormData({...formData, paidToType: type as any, paidToId: id, paidToName: ''});
                                } else {
                                    setFormData({...formData, paidToType: val as any, paidToId: '', paidToName: ''});
                                }
                            }}
                            className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-4 text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all appearance-none cursor-pointer"
                        >
                            <option value="other">Other / Manual Entry</option>
                            <option value="emergency">Emergency Fund</option>
                            {savingsGoals.length > 0 && <optgroup label="Savings Goals">
                                {savingsGoals.map(goal => (
                                    <option key={goal.id} value={`savings:${goal.id}`}>Goal: {goal.name}</option>
                                ))}
                            </optgroup>}
                            {assets.length > 0 && <optgroup label="Assets">
                                {assets.map(asset => (
                                    <option key={asset.id} value={`asset:${asset.id}`}>{asset.name}</option>
                                ))}
                            </optgroup>}
                        </select>
                    </div>
                </div>

                {formData.paidToType === 'other' ? (
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] ml-2">Recipient Name</label>
                        <input 
                            type="text" value={formData.paidToName} 
                            onChange={e => setFormData({...formData, paidToName: e.target.value})} 
                            placeholder="e.g. Walmart, Tim Hortons, Netflix..."
                            className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-4 text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all" 
                        />
                    </div>
                ) : formData.paidToType === 'savings' || formData.paidToType.startsWith('savings:') ? (
                    /* The ID is already handled by the combined value in dropdown for simplicity, 
                       but let's make it cleaner */
                    null
                ) : null}

                {/* Helper to parse the combined value if needed, or just adjust the onChange */}
                {/* I'll adjust the onChange in the next step if this gets complex, but for now let's refine the value handling */}

                <div className="flex gap-4 pt-6">
                  {editingRecord && (
                    <button type="button" onClick={() => deleteRecord(editingRecord.id)} className="px-6 py-4 rounded-2xl bg-rose-50 text-rose-500 text-xs uppercase hover:bg-rose-100 transition-all">
                        Delete
                    </button>
                  )}
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-8 py-5 rounded-3xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 hover:text-zinc-900 transition-all">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 px-8 py-5 rounded-3xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black hover:scale-105 transition-all uppercase tracking-widest text-xs">
                    {editingRecord ? 'Update Expense' : 'Save Expense'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
