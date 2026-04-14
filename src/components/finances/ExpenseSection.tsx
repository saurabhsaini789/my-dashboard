"use client";

import React, { useState, useEffect, useRef } from 'react';
import { getPrefixedKey } from '@/lib/keys';
import { setSyncedItem } from '@/lib/storage';
import { calculateAssetBalance } from '@/lib/finances';
import { ExpenseMetrics } from './ExpenseMetrics';
import { MultiSelectDropdown } from '../ui/MultiSelectDropdown';
import { MONTHS, YEARS } from '@/lib/constants';
import { Modal } from '../ui/Modal';
import { DynamicForm, FormSchemaSection, FormSchemaField } from '../ui/DynamicForm';
import { FormField } from '../ui/FormField';
import { SYNC_KEYS } from '@/lib/sync-keys';
import { ExpenseRecord, ExpenseCategory, ExpenseType } from '@/types/finance';

const CATEGORIES: ExpenseCategory[] = ['rent', 'EMI', 'Insurance', 'food', 'travel', 'shopping', 'investment', 'savings', 'Other'];
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
    
    date: '', // Initialize empty for SSR
    type: 'need' as ExpenseType,
    assetId: '',
    paidToType: 'other' as ExpenseRecord['paidToType'],
    paidToId: '',
    paidToName: '',
    entryType: 'Quick' as ExpenseRecord['entryType'],
    paymentMethod: 'UPI / Wallet' as ExpenseRecord['paymentMethod'],
    notes: ''
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
      
    };
    window.addEventListener('local-storage-change', handleLocal);
    return () => window.removeEventListener('local-storage-change', handleLocal);
  }, []);




  const openAddModal = () => {
    setEditingRecord(null);
    setFormData({
      category: 'food',
      subcategory: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      type: 'need',
      assetId: '',
      paidToType: 'other',
      paidToId: '',
      paidToName: '',
      entryType: 'Quick',
      paymentMethod: 'UPI / Wallet',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (record: ExpenseRecord) => {
    setEditingRecord(record);
    setFormData({
      category: record.category,
      subcategory: record.subcategory,
      amount: record.amount.toString(),
      
      date: record.date,
      type: record.type,
      assetId: record.assetId || '',
      paidToType: record.paidToType || 'other',
      paidToId: record.paidToId || '',
      paidToName: record.paidToName || '',
      entryType: record.entryType || 'Quick',
      paymentMethod: record.paymentMethod || 'UPI / Wallet',
      notes: record.notes || ''
    });
    setIsModalOpen(true);
  };

  const updateRecipientContribution = (expenseId: string, paidToType: string, paidToId: string | undefined, amount: number, date: string, isDelete = false) => {
    // Get exchange rate
    
    
    

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
              g.contributions.unshift({ id: `expense-${expenseId}`, date, amount });
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
            fund.contributions.unshift({ id: `expense-${expenseId}`, date, amount });
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
              asset.contributions.unshift({ id: `expense-recip-${expenseId}`, date, amount });
              changed = true;
            }
            return asset;
          });
          if (changed) setSyncedItem(SYNC_KEYS.FINANCES_ASSETS, JSON.stringify(assetsList));
        } catch (e) {}
      }
    }
  };

  const updateAssetContribution = (expenseId: string, assetId: string | undefined, amount: number, date: string, isDelete = false) => {
    const savedAssets = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_ASSETS));
    if (!savedAssets) return;

    
    
    

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
            amount: -amount // Store original amount (negated)
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
      date: formData.date,
      type: formData.type,
      assetId: formData.assetId || undefined,
      paidToType: formData.paidToType,
      paidToId: formData.paidToId || undefined,
      paidToName: formData.paidToName || undefined,
      entryType: formData.entryType,
      paymentMethod: formData.paymentMethod,
      notes: formData.notes || undefined
    };

    // Update Asset Sync: Subtract from account paid from
    updateAssetContribution(newRecord.id, newRecord.assetId, newRecord.amount,  newRecord.date);
    
    // Update Recipient Sync: Add to savings/emergency/etc if applicable
    updateRecipientContribution(newRecord.id, newRecord.paidToType, newRecord.paidToId, newRecord.amount,  newRecord.date);

    if (editingRecord) {
      const updated = records.map(r => r.id === editingRecord.id ? newRecord : r);
      setRecords(updated);
      setSyncedItem(SYNC_KEYS.FINANCES_EXPENSES, JSON.stringify(updated));
    } else {
      const updated = [newRecord, ...records];
      setRecords(updated);
      setSyncedItem(SYNC_KEYS.FINANCES_EXPENSES, JSON.stringify(updated));
    }
    setIsModalOpen(false);
  };

  const deleteRecord = (id: string) => {
    // Update Asset Sync: Remove negative contribution
    updateAssetContribution(id, undefined, 0, '', true);
    
    // Update Recipient Sync: Remove positive contribution
    updateRecipientContribution(id, '', undefined, 0, '', true);

    const updated = records.filter(r => r.id !== id);
    setRecords(updated);
    setSyncedItem(SYNC_KEYS.FINANCES_EXPENSES, JSON.stringify(updated));
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
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
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
                className="bg-rose-600 text-white tracking-widest text-xs px-8 py-4 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-rose-200/50 dark:shadow-none h-[54px] font-bold"
            >
                Add Expense
            </button>
        </div>
      </div>

      <div className="flex flex-col gap-10">
          {/* Top Row: Metrics Integrated into the main flow */}
          <ExpenseMetrics records={records} selectedMonths={selectedMonths} selectedYears={selectedYears} />

          {/* Category Breakdown */}
          {filteredRecords.length > 0 && (
            <div className="flex flex-col gap-4">
               <span className="text-xs text-zinc-600 dark:text-zinc-300 uppercase tracking-[0.3em] pl-4">Category Breakdown</span>
               <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 px-2">
                 {Object.entries(
                    filteredRecords.reduce((acc, r) => {
                        acc[r.category] = (acc[r.category] || 0) + r.amount;
                        return acc;
                    }, {} as Record<string, number>)
                 ).sort((a, b) => b[1] - a[1]).map(([cat, total]) => (
                    <div key={cat} className="flex flex-col p-4 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-50/50 dark:hover:bg-rose-500/15 rounded-2xl border border-rose-100/50 dark:border-rose-900/30 transition-colors">
                       <span className="text-xs uppercase font-bold tracking-widest text-zinc-500 dark:text-zinc-300">{cat}</span>
                       <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">${total.toLocaleString('en-CA', {maximumFractionDigits: 0})}</span>
                    </div>
                 ))}
               </div>
            </div>
          )}

          {/* Table Section */}
          <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl p-2 overflow-hidden shadow-sm transition-all flex flex-col pt-8">
              <div className="flex items-center justify-between px-8 mb-8">
                  <span className="text-xs text-zinc-600 dark:text-zinc-300 uppercase tracking-[0.3em]">Detailed Records</span>
              </div>

              <div className="overflow-x-auto px-4">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                          <tr className="border-b border-zinc-50 dark:border-zinc-800/50">
                               <th className="px-4 py-4 text-xs font-semibold uppercase tracking-widest text-zinc-600 dark:text-zinc-300">Date</th>
                              <th className="px-4 py-4 text-xs font-semibold uppercase tracking-widest text-zinc-600 dark:text-zinc-300">Category</th>
                              <th className="px-4 py-4 text-xs font-semibold uppercase tracking-widest text-zinc-600 dark:text-zinc-300">Subcategory</th>
                              <th className="px-4 py-4 text-xs font-semibold uppercase tracking-widest text-zinc-600 dark:text-zinc-300">Type</th>
                              <th className="px-4 py-4 text-xs font-semibold uppercase tracking-widest text-zinc-600 dark:text-zinc-300">Paid from</th>
                              <th className="px-4 py-4 text-xs font-semibold uppercase tracking-widest text-zinc-600 dark:text-zinc-300">Paid to</th>
                              <th className="px-4 py-4 text-xs font-semibold uppercase tracking-widest text-zinc-600 dark:text-zinc-300">Notes</th>
                              <th className="px-4 py-4 text-xs font-semibold uppercase tracking-widest text-zinc-600 dark:text-zinc-300 text-right">Amount</th>
                              <th className="px-4 py-4 text-xs font-semibold uppercase tracking-widest text-zinc-600 dark:text-zinc-300"></th>
                          </tr>
                      </thead>
                      <tbody>
                          {filteredRecords.length > 0 ? filteredRecords.map(record => (
                              <tr key={record.id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors border-b border-zinc-50 dark:border-zinc-800/20 last:border-0">
                                  <td className="px-4 py-5">
                                      <span className="text-xs text-zinc-500 dark:text-zinc-300">
                                          {new Date(record.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                                      </span>
                                  </td>
                                  <td className="px-4 py-5">
                                      <span className="text-sm text-zinc-900 dark:text-zinc-100 tracking-tight">
                                          {record.category}
                                      </span>
                                  </td>
                                  <td className="px-4 py-5">
                                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
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
                                      <span className="text-xs text-zinc-500 dark:text-zinc-300">
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
                                  <td className="px-4 py-5 max-w-[150px]">
                                      <span className="text-xs text-zinc-500 dark:text-zinc-300 truncate block">
                                          {record.notes || '-'}
                                      </span>
                                  </td>
                                   <td className="px-4 py-5 text-right">
                                       <span className="text-base text-zinc-900 dark:text-zinc-100 tracking-tighter">${record.amount.toLocaleString("en-CA", { minimumFractionDigits: 2 })}</span>
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
                                  <td colSpan={8} className="px-8 py-20 text-center">
                                      <span className="text-xs text-zinc-500 dark:text-zinc-300 uppercase tracking-[0.2em]">No expenses recorded for this period</span>
                                  </td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>

      {/* Schema-Driven Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRecord ? 'Edit expense' : 'Add expense'}
        onSubmit={handleSubmit}
        submitText={editingRecord ? 'Update Expense' : 'Save Expense'}
        accentColor="rose"
      >
        <DynamicForm
          sections={[
            {
              id: 'basic',
              title: 'Transaction basics',
              fields: [
                { 
                  name: 'category', 
                  label: 'Category', 
                  type: 'select', 
                  options: CATEGORIES.map(c => ({ label: c.charAt(0).toUpperCase() + c.slice(1), value: c }))
                },
                { 
                  name: 'type', 
                  label: 'Type', 
                  type: 'select', 
                  options: TYPES.map(t => ({ label: t.charAt(0).toUpperCase() + t.slice(1), value: t }))
                },
                { 
                  name: 'subcategory', 
                  label: formData.category === 'Other' ? 'Specify Category' : 'Subcategory', 
                  type: 'text', 
                  fullWidth: true,
                  placeholder: formData.category === 'Other' ? "e.g. Pet supplies, Maintenance..." : "e.g. Groceries, Rent, Netflix..."
                },
              ]
            },
            {
              id: 'amount_date',
              title: 'Amount & date',
              fields: [
                { name: 'amount', label: 'Amount ($)', type: 'number', required: true, step: "0.01", placeholder: "0.00", fullWidth: true },
                { name: 'date', label: 'Date', type: 'date', required: true, fullWidth: true }
              ]
            },
            {
              id: 'accounts',
              title: 'Accounts',
              fields: [
                {
                  name: 'assetId',
                  label: 'Paid From (Source)',
                  render: ({ name, value, onChange }) => (
                    <select 
                      id="field-assetId"
                      value={value} 
                      onChange={e => onChange(name, e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  )
                },
                {
                  name: 'paidToCombined',
                  label: 'Paid To (Recipient)',
                  render: ({ name, value, onChange }) => (
                    <select 
                      id="field-paidToCombined"
                      value={value} 
                      onChange={e => onChange(name, e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  )
                },
                ...(formData.paidToType === 'other' ? [{
                  name: 'paidToName',
                  label: 'Recipient Name',
                  type: 'text' as const,
                  fullWidth: true,
                  placeholder: "e.g. Walmart, Tim Hortons..."
                }] : [])
              ]
            },
            {
              id: 'notes',
              title: 'Additional info',
              isAdvanced: true,
              fields: [
                { name: 'notes', label: 'Quick Notes', type: 'textarea', fullWidth: true, placeholder: "Any additional details or context..." }
              ]
            }
          ]}
          formData={{
            ...formData,
            paidToCombined: formData.paidToId ? `${formData.paidToType}:${formData.paidToId}` : formData.paidToType
          }}
          onChange={(name, value) => {
            setFormData(prev => {
              let updated = { ...prev, [name]: value };
              if (name === 'paidToCombined') {
                if (value.includes(':')) {
                  const [type, id] = value.split(':');
                  updated = { ...updated, paidToType: type as any, paidToId: id, paidToName: '' };
                } else {
                  updated = { ...updated, paidToType: value as any, paidToId: '', paidToName: '' };
                }
              }
              return updated;
            });
          }}
          accentColor="rose"
        />
        {editingRecord && (
          <div className="mt-4 flex justify-start w-full">
            <button 
              type="button" 
              onClick={() => deleteRecord(editingRecord.id)} 
              className="text-red-500 text-sm font-medium hover:text-red-600 transition-colors"
            >
              Delete Expense
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
