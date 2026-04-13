"use client";

import React, { useState, useEffect, useRef } from 'react';
import { getPrefixedKey } from '@/lib/keys';
import { setSyncedItem } from '@/lib/storage';
import { calculateAssetBalance } from '@/lib/finances';
import type { IncomeRecord } from '@/types/finance';
import { IncomeMetrics } from './IncomeMetrics';
import { MultiSelectDropdown } from '../ui/MultiSelectDropdown';
import { MONTHS, YEARS } from '@/lib/constants';
import { Modal } from '../ui/Modal';
import { DynamicForm, FormSchemaSection, FormSchemaField } from '../ui/DynamicForm';
import { FormField } from '../ui/FormField';
import { SYNC_KEYS } from '@/lib/sync-keys';

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
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]); // Initialize empty for SSR
  const [selectedYears, setSelectedYears] = useState<number[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    source: 'salary' as IncomeSource,
    amount: '',
    
    date: '', // Initialize empty for SSR
    type: 'active' as IncomeType,
    assetId: '',
    notes: '',
    customSource: ''
  });

  const recordsRef = useRef(records);
  useEffect(() => {
    recordsRef.current = records;
  }, [records]);

  useEffect(() => {
    const saved = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_INCOME));
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        recordsRef.current = parsed;
        setRecords(parsed);
      } catch (e) {
        console.error("Failed to parse income data", e);
      }
    } else {
        const mock: IncomeRecord[] = [
            { id: '1', source: 'salary', amount: 5000, date: new Date().toISOString().split('T')[0], type: 'active' },
            { id: '2', source: 'freelance', amount: 800, date: new Date().toISOString().split('T')[0], type: 'active' },
            { id: '3', source: 'investment', amount: 450, date: new Date().toISOString().split('T')[0], type: 'passive' },
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
  }, []);

  useEffect(() => {
    const handleLocal = (e: any) => {
      if (e.detail && e.detail.key === SYNC_KEYS.FINANCES_INCOME) {
        const val = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_INCOME));
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
      
    };
    window.addEventListener('local-storage-change', handleLocal);
    return () => window.removeEventListener('local-storage-change', handleLocal);
  }, []);




  const openAddModal = () => {
    setEditingRecord(null);
    setFormData({
      source: 'salary',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      type: 'active',
      assetId: '',
      notes: '',
      customSource: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (record: IncomeRecord) => {
    setEditingRecord(record);
    setFormData({
      source: record.source,
      amount: record.amount.toString(),
      
      date: record.date,
      type: record.type,
      assetId: record.assetId || '',
      notes: record.notes || '',
      customSource: record.customSource || ''
    });
    setIsModalOpen(true);
  };

  const updateAssetContribution = (incomeId: string, assetId: string | undefined, amount: number, date: string, isDelete = false) => {
    const savedAssets = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_ASSETS));
    if (!savedAssets) return;

    
    
    

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
            amount: amount
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
      date: formData.date,
      type: formData.type,
      assetId: formData.assetId || undefined,
      notes: formData.notes || undefined,
      customSource: formData.source === 'other' ? (formData.customSource || undefined) : undefined
    };

    // Update Asset Sync
    updateAssetContribution(newRecord.id, newRecord.assetId, newRecord.amount,  newRecord.date);

    if (editingRecord) {
      const updated = records.map(r => r.id === editingRecord.id ? newRecord : r);
      setRecords(updated);
      setSyncedItem(SYNC_KEYS.FINANCES_INCOME, JSON.stringify(updated));
    } else {
      const updated = [newRecord, ...records];
      setRecords(updated);
      setSyncedItem(SYNC_KEYS.FINANCES_INCOME, JSON.stringify(updated));
    }
    setIsModalOpen(false);
  };

  const deleteRecord = (id: string) => {
    // Update Asset Sync: Remove contribution
    updateAssetContribution(id, undefined, 0, '', true);
    
    const updated = records.filter(r => r.id !== id);
    setRecords(updated);
    setSyncedItem(SYNC_KEYS.FINANCES_INCOME, JSON.stringify(updated));
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
        <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
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
                className="bg-emerald-600 text-white tracking-widest text-xs px-8 py-4 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-emerald-200/50 dark:shadow-none h-[54px]"
            >
                Add Record
            </button>
        </div>
      </div>

      <div className="flex flex-col gap-10">
          {/* Top Row: Metrics Integrated into the main flow */}
          <IncomeMetrics records={records} selectedMonths={selectedMonths} selectedYears={selectedYears} />

          {/* Table Section */}
          <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-900/30 rounded-[40px] p-2 overflow-hidden hover:shadow-2xl transition-all flex flex-col pt-8">
              <div className="flex items-center justify-between px-8 mb-8">
                  <span className="text-xs text-zinc-600 dark:text-zinc-300 uppercase tracking-[0.3em]">Detailed Records</span>
              </div>

              <div className="overflow-x-auto px-4">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                          <tr className="border-b border-zinc-50 dark:border-zinc-800/50">
                              <th className="px-4 py-4 text-xs uppercase tracking-widest text-zinc-600 dark:text-zinc-300">Date</th>
                              <th className="px-4 py-4 text-xs uppercase tracking-widest text-zinc-600 dark:text-zinc-300">Source</th>
                              <th className="px-4 py-4 text-xs uppercase tracking-widest text-zinc-600 dark:text-zinc-300">Type</th>
                              <th className="px-4 py-4 text-xs uppercase tracking-widest text-zinc-600 dark:text-zinc-300">Account</th>
                              <th className="px-4 py-4 text-xs uppercase tracking-widest text-zinc-600 dark:text-zinc-300">Notes</th>
                              <th className="px-4 py-4 text-xs uppercase tracking-widest text-zinc-600 dark:text-zinc-300 text-right">Amount</th>
                              <th className="px-4 py-4 text-xs uppercase tracking-widest text-zinc-600 dark:text-zinc-300"></th>
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
                                      <span className="text-sm text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
                                          {record.source === 'other' && record.customSource ? `Other (${record.customSource})` : record.source}
                                      </span>
                                  </td>
                                  <td className="px-4 py-5">
                                      <span className="text-xs uppercase tracking-widest px-2.5 py-1 rounded-lg border bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400">
                                          {record.type}
                                      </span>
                                  </td>
                                  <td className="px-4 py-5">
                                      <span className="text-sm text-zinc-500 dark:text-zinc-300">
                                          {assets.find(a => a.id === record.assetId)?.name || '-'}
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
                                  <td colSpan={7} className="px-8 py-20 text-center">
                                      <span className="text-xs text-zinc-500 dark:text-zinc-300 uppercase tracking-[0.2em]">No income recorded for this period</span>
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
        title={editingRecord ? 'Edit income' : 'Add income'}
        onSubmit={handleSubmit}
        submitText={editingRecord ? 'Update Record' : 'Save Record'}
        accentColor="emerald"
      >
        <DynamicForm
          sections={[
            {
              id: 'basic',
              title: 'Income basics',
              fields: [
                { 
                  name: 'source', 
                  label: 'Source', 
                  type: 'select', 
                  options: SOURCES.map(c => ({ label: c.charAt(0).toUpperCase() + c.slice(1), value: c }))
                },
                { 
                  name: 'type', 
                  label: 'Type', 
                  type: 'select', 
                  options: TYPES.map(t => ({ label: t.charAt(0).toUpperCase() + t.slice(1), value: t }))
                },
                ...(formData.source === 'other' ? [{
                  name: 'customSource',
                  label: 'Specify Custom Source',
                  type: 'text' as const,
                  fullWidth: true,
                  placeholder: "e.g. Sold old bicycle..."
                }] : []),
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
                  label: 'Deposit to Bank Account (Optional)',
                  fullWidth: true,
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
                }
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
          formData={formData}
          onChange={(name, value) => {
            setFormData(prev => ({ ...prev, [name]: value }));
          }}
          accentColor="emerald"
        />
        {editingRecord && (
          <div className="mt-4 flex justify-start w-full">
            <button 
              type="button" 
              onClick={() => deleteRecord(editingRecord.id)} 
              className="text-red-500 text-sm font-medium hover:text-red-600 transition-colors"
            >
              Delete Record
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
