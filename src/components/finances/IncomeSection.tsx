"use client";

import React, { useState, useEffect, useRef } from 'react';
import { getPrefixedKey } from '@/lib/keys';
import { setSyncedItem } from '@/lib/storage';
import { calculateAssetBalance, type IncomeRecord } from '@/lib/finances';
import { IncomeMetrics } from './IncomeMetrics';
import { MultiSelectDropdown } from '../ui/MultiSelectDropdown';
import { MONTHS, YEARS } from '@/lib/constants';

export type IncomeSource = IncomeRecord['source'];
export type IncomeType = IncomeRecord['type'];


const SOURCES: IncomeSource[] = ['salary', 'bonus', 'freelance', 'business', 'investment', 'Govt Benefits', 'tax refund', 'gift', 'sale', 'refund', 'other'];
const TYPES: IncomeType[] = ['active', 'passive', 'one time'];

export function IncomeSection() {
  const [records, setRecords] = useState<IncomeRecord[]>([]);
  const [assets, setAssets] = useState<any[]>([]); // To populate the dropdown
  const [isLoaded, setIsLoaded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<IncomeRecord | null>(null);

  // Filter states
  const [selectedMonths, setSelectedMonths] = useState<number[]>([new Date().getMonth()]); // 0-indexed
  const [selectedYears, setSelectedYears] = useState<number[]>([new Date().getFullYear()]);

  // Form state
  const [formData, setFormData] = useState({
    source: 'salary' as IncomeSource,
    amount: '',
    currency: 'INR' as 'INR' | 'CAD',
    date: new Date().toISOString().split('T')[0],
    type: 'active' as IncomeType,
    assetId: ''
  });

  const recordsRef = useRef(records);
  useEffect(() => {
    recordsRef.current = records;
  }, [records]);

  useEffect(() => {
    const saved = localStorage.getItem(getPrefixedKey('finances_income'));
    if (saved) {
      try {
        setRecords(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse income data", e);
      }
    } else {
        const mock: IncomeRecord[] = [
            { id: '1', source: 'salary', amount: 5000, date: new Date().toISOString().split('T')[0], type: 'active' },
            { id: '2', source: 'freelance', amount: 1200, date: new Date().toISOString().split('T')[0], type: 'active' },
            { id: '3', source: 'investment', amount: 450, date: new Date().toISOString().split('T')[0], type: 'passive' },
        ];
        setRecords(mock);
    }
    setIsLoaded(true);

    // Load assets for dropdown
    const savedAssets = localStorage.getItem(getPrefixedKey('finance_assets'));
    if (savedAssets) {
      try { setAssets(JSON.parse(savedAssets)); } catch (e) {}
    }

    const handleLocal = (e: any) => {
      if (e.detail && e.detail.key === 'finances_income') {
        const val = localStorage.getItem(getPrefixedKey('finances_income'));
        if (val && val !== JSON.stringify(recordsRef.current)) {
          try { setRecords(JSON.parse(val)); } catch (e) {}
        }
      }
      if (e.detail && e.detail.key === 'finance_assets') {
        const val = localStorage.getItem(getPrefixedKey('finance_assets'));
        if (val) {
          try { setAssets(JSON.parse(val)); } catch (e) {}
        }
      }
      if (e.detail && e.detail.key === 'finance_exchange_rate') {
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
      setSyncedItem('finances_income', JSON.stringify(records));
    }
  }, [records, isLoaded]);

  const openAddModal = () => {
    setEditingRecord(null);
    setFormData({
      source: 'salary',
      amount: '',
      currency: 'INR',
      date: new Date().toISOString().split('T')[0],
      type: 'active',
      assetId: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (record: IncomeRecord) => {
    setEditingRecord(record);
    setFormData({
      source: record.source,
      amount: record.amount.toString(),
      currency: record.currency || 'INR',
      date: record.date,
      type: record.type,
      assetId: record.assetId || ''
    });
    setIsModalOpen(true);
  };

  const updateAssetContribution = (incomeId: string, assetId: string | undefined, amount: number, currency: 'INR' | 'CAD', date: string, isDelete = false) => {
    const savedAssets = localStorage.getItem(getPrefixedKey('finance_assets'));
    if (!savedAssets) return;

    const savedRate = localStorage.getItem(getPrefixedKey('finance_exchange_rate'));
    const exchangeRate = savedRate ? parseFloat(savedRate) : 67;
    // We used to convert here, but now we'll store the original currency in the contribution
    // and let the balance calculation handle it dynamically.

    try {
      let assetsList = JSON.parse(savedAssets);
      let changed = false;

      // 1. Remove old contribution from any asset that might have it
      assetsList = assetsList.map((asset: any) => {
        const initialLen = asset.contributions.length;
        asset.contributions = asset.contributions.filter((c: any) => c.id !== `income-${incomeId}`);
        if (asset.contributions.length !== initialLen) {
            changed = true;
            asset.lastUpdated = new Date().toISOString().split('T')[0];
        }
        return asset;
      });

      // 2. Add new contribution if not deleting and assetId is present
      if (!isDelete && assetId) {
        const targetAsset = assetsList.find((a: any) => a.id === assetId);
        if (targetAsset) {
          targetAsset.contributions.unshift({
            id: `income-${incomeId}`,
            date: date,
            amount: amount,
            currency: currency
          });
          targetAsset.lastUpdated = new Date().toISOString().split('T')[0];
          changed = true;
        }
      }

      if (changed) {
        setSyncedItem('finance_assets', JSON.stringify(assetsList));
        // Update local state if the component is mounted (handled by event listener)
      }
    } catch (e) {
      console.error("Failed to update asset contributions", e);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(formData.amount);
    if (isNaN(amount)) return;

    const newRecord: IncomeRecord = {
      id: editingRecord ? editingRecord.id : Math.random().toString(36).substr(2, 9),
      source: formData.source,
      amount,
      currency: formData.currency,
      date: formData.date,
      type: formData.type,
      assetId: formData.assetId || undefined
    };

    // Update Asset Sync
    updateAssetContribution(newRecord.id, newRecord.assetId, newRecord.amount, newRecord.currency || 'INR', newRecord.date);

    if (editingRecord) {
      setRecords(records.map(r => r.id === editingRecord.id ? newRecord : r));
    } else {
      setRecords([newRecord, ...records]);
    }
    setIsModalOpen(false);
  };

  const deleteRecord = (id: string) => {
    // Update Asset Sync: Remove contribution
    updateAssetContribution(id, undefined, 0, 'INR', '', true);
    
    setRecords(records.filter(r => r.id !== id));
    if (editingRecord?.id === id) setIsModalOpen(false);
  };

  const filteredRecords = records.filter(r => {
    const d = new Date(r.date);
    return selectedMonths.includes(d.getMonth()) && selectedYears.includes(d.getFullYear());
  });

  if (!isLoaded) return null;

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Integrated Heading, Filters & Global Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
            Income
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
                className="bg-emerald-600 text-white uppercase tracking-widest text-xs px-8 py-4 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-emerald-200/50 dark:shadow-none h-[54px]"
            >
                Add Record
            </button>
        </div>
      </div>

      <div className="flex flex-col gap-10">
          {/* Top Row: Metrics Integrated into the main flow */}
          <IncomeMetrics records={records} selectedMonths={selectedMonths} selectedYears={selectedYears} />

          {/* Table Section */}
          <div className="bg-emerald-50/20 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-900/30 rounded-[40px] p-2 overflow-hidden hover:shadow-2xl transition-all flex flex-col pt-8">
              <div className="flex items-center justify-between px-8 mb-8">
                  <span className="text-xs text-zinc-600 uppercase tracking-[0.3em]">Detailed Records</span>
              </div>

              <div className="overflow-x-auto px-4">
                  <table className="w-full text-left border-collapse">
                      <thead>
                          <tr className="border-b border-zinc-50 dark:border-zinc-800/50">
                              <th className="px-4 py-4 text-xs uppercase tracking-widest text-zinc-600">Date</th>
                              <th className="px-4 py-4 text-xs uppercase tracking-widest text-zinc-600">Source</th>
                              <th className="px-4 py-4 text-xs uppercase tracking-widest text-zinc-600">Type</th>
                              <th className="px-4 py-4 text-xs uppercase tracking-widest text-zinc-600">Account</th>
                              <th className="px-4 py-4 text-xs uppercase tracking-widest text-zinc-600 text-right">Amount</th>
                              <th className="px-4 py-4 text-xs uppercase tracking-widest text-zinc-600"></th>
                          </tr>
                      </thead>
                      <tbody>
                          {filteredRecords.length > 0 ? filteredRecords.map(record => (
                              <tr key={record.id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors border-b border-zinc-50 dark:border-zinc-800/20 last:border-0">
                                  <td className="px-4 py-5">
                                      <span className="text-xs text-zinc-600">
                                          {new Date(record.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                      </span>
                                  </td>
                                  <td className="px-4 py-5">
                                      <span className="text-sm text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
                                          {record.source}
                                      </span>
                                  </td>
                                  <td className="px-4 py-5">
                                      <span className="text-xs uppercase tracking-widest px-2.5 py-1 rounded-lg border bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400">
                                          {record.type}
                                      </span>
                                  </td>
                                  <td className="px-4 py-5">
                                      <span className="text-sm text-zinc-500">
                                          {assets.find(a => a.id === record.assetId)?.name || '-'}
                                      </span>
                                  </td>
                                  <td className="px-4 py-5 text-right">
                                      <span className="text-base text-zinc-900 dark:text-zinc-100 tracking-tighter">
                                          {record.currency === 'CAD' ? 'C$' : '₹'}{record.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                      </span>
                                      {record.currency === 'CAD' && (
                                          <div className="text-[10px] text-zinc-500 uppercase tracking-tighter">
                                              CAD Record
                                          </div>
                                      )}
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
                                  <td colSpan={6} className="px-8 py-20 text-center">
                                      <span className="text-xs text-zinc-500 uppercase tracking-[0.2em]">No income recorded for this period</span>
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
                  {editingRecord ? 'Edit Income' : 'Add Income'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-zinc-600 hover:text-zinc-900 dark:hover:text-white transition-colors">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs text-zinc-600 uppercase tracking-[0.2em] ml-2">Source</label>
                        <select 
                            value={formData.source} 
                            onChange={e => setFormData({...formData, source: e.target.value as IncomeSource})}
                            className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-4 text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all appearance-none"
                        >
                            {SOURCES.map(source => (
                                <option key={source} value={source}>{source.charAt(0).toUpperCase() + source.slice(1)}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs text-zinc-600 uppercase tracking-[0.2em] ml-2">Type</label>
                        <select 
                            value={formData.type} 
                            onChange={e => setFormData({...formData, type: e.target.value as IncomeType})}
                            className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-4 text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all appearance-none"
                        >
                            {TYPES.map(type => (
                                <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                    <div className="flex flex-col gap-2 col-span-2">
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

                <div className="flex flex-col gap-2">
                    <label className="text-xs text-zinc-600 uppercase tracking-[0.2em] ml-2">Deposit to Bank Account (Optional)</label>
                    <select 
                        value={formData.assetId} 
                        onChange={e => setFormData({...formData, assetId: e.target.value})}
                        className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-4 text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all appearance-none cursor-pointer"
                    >
                        <option value="">No linked account</option>
                        {assets.filter(a => a.type === 'Bank Balance' || a.type === 'Cash').map(asset => (
                            <option key={asset.id} value={asset.id}>{asset.name} (₹{calculateAssetBalance(asset).toLocaleString('en-IN', { maximumFractionDigits: 0 })})</option>
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
                    {editingRecord ? 'Update Record' : 'Save Record'}
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
