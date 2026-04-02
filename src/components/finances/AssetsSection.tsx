"use client";

import React, { useState, useEffect, useRef } from 'react';
import { getPrefixedKey } from '@/lib/keys';
import { setSyncedItem } from '@/lib/storage';
import { calculateAssetBalance, type Asset, type Contribution, convertToCAD } from '@/lib/finances';
import { SYNC_KEYS } from '@/lib/sync-keys';

export type AssetType = 'Cash' | 'Bank Balance' | 'Property' | 'Business Value' | 'Vehicle' | 'Investment' | 'Metal' | 'Loans Given';

const ASSET_TYPES: AssetType[] = [
  'Cash', 'Bank Balance', 'Property', 'Business Value', 'Vehicle', 'Investment', 'Metal', 'Loans Given'
];

export function AssetsSection() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [expandedAssets, setExpandedAssets] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedAssets(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Contribution modal state
  const [isContribModalOpen, setIsContribModalOpen] = useState(false);
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null);
  const [contribAmount, setContribAmount] = useState('');
  const [contribCurrency, setContribCurrency] = useState<'INR' | 'CAD'>('INR');

  // Growth Rate modal state
  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [rateValue, setRateValue] = useState('');

  // Form state for Add/Edit Asset
  const [formData, setFormData] = useState({
    name: '',
    type: 'Bank Balance' as AssetType,
    initialValue: '',
    initialCurrency: 'INR' as 'INR' | 'CAD',
    startDate: '', // Initialize empty for SSR
    lastUpdated: ''
  });

  const assetsRef = useRef(assets);
  useEffect(() => {
    assetsRef.current = assets;
  }, [assets]);

  useEffect(() => {
    const saved = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_ASSETS));
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migration to new model
        const migrated = parsed.map((a: any) => ({
          ...a,
          initialValue: a.initialValue ?? a.currentValue ?? 0,
          startDate: a.startDate ?? a.lastUpdated ?? new Date().toISOString().split('T')[0],
          contributions: a.contributions ?? [],
          growthRate: a.growthRate ?? 0
        }));
        setAssets(migrated);
      } catch (e) {
        console.error("Failed to parse asset data", e);
      }
    } else {
      const mockAssets: Asset[] = [
        { id: 'a1', name: 'Main Savings', type: 'Bank Balance', initialValue: 12500, startDate: '2025-01-01', contributions: [], growthRate: 1.5, lastUpdated: new Date().toISOString().split('T')[0] },
        { id: 'a2', name: 'Primary Residence', type: 'Property', initialValue: 450000, startDate: '2020-06-15', contributions: [], growthRate: 5.2, lastUpdated: new Date().toISOString().split('T')[0] },
        { id: 'a3', name: 'Vanguard ETF', type: 'Investment', initialValue: 85000, startDate: '2023-01-01', contributions: [], growthRate: 8.5, lastUpdated: new Date().toISOString().split('T')[0] },
      ];
      setAssets(mockAssets);
    }
    setFormData({
      ...formData,
      startDate: new Date().toISOString().split('T')[0],
      lastUpdated: new Date().toISOString().split('T')[0]
    });
    setIsLoaded(true);

    const handleLocal = (e: any) => {
      if (e.detail && e.detail.key === SYNC_KEYS.FINANCES_ASSETS) {
        const val = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_ASSETS));
        if (val && val !== JSON.stringify(assetsRef.current)) {
          try { 
            const parsed = JSON.parse(val);
             const migrated = parsed.map((a: any) => ({
                ...a,
                initialValue: a.initialValue ?? a.currentValue ?? 0,
                startDate: a.startDate ?? a.lastUpdated ?? new Date().toISOString().split('T')[0],
                contributions: a.contributions || [],
                growthRate: a.growthRate ?? 0
              }));
            setAssets(migrated); 
          } catch (e) {}
        }
      }
      if (e.detail && e.detail.key === SYNC_KEYS.FINANCES_EXCHANGE_RATE) {
        // Trigger re-render to update conversion
        setIsLoaded(false);
        setTimeout(() => setIsLoaded(true), 0);
      }
    };
    window.addEventListener('local-storage-change', handleLocal);
    return () => window.removeEventListener('local-storage-change', handleLocal);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      setSyncedItem(SYNC_KEYS.FINANCES_ASSETS, JSON.stringify(assets));
    }
  }, [assets, isLoaded]);


  const openAddModal = () => {
    setEditingAsset(null);
    setFormData({
      name: '',
      type: 'Bank Balance' as AssetType,
      initialValue: '',
      initialCurrency: 'INR' as 'INR' | 'CAD',
      startDate: new Date().toISOString().split('T')[0],
      lastUpdated: new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const openEditModal = (asset: Asset) => {
    setEditingAsset(asset);
    setFormData({
      name: asset.name,
      type: asset.type as AssetType,
      initialValue: asset.initialValue?.toString() || '',
      initialCurrency: asset.initialCurrency || 'INR',
      startDate: asset.startDate,
      lastUpdated: asset.lastUpdated
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(formData.initialValue);
    if (isNaN(value)) return;

    const newAsset: Asset = {
      id: editingAsset ? editingAsset.id : Math.random().toString(36).substr(2, 9),
      name: formData.name,
      type: formData.type as AssetType,
      initialValue: value,
      initialCurrency: formData.initialCurrency,
      startDate: formData.startDate,
      contributions: editingAsset ? editingAsset.contributions : [],
      growthRate: editingAsset ? editingAsset.growthRate : 0,
      lastUpdated: new Date().toISOString().split('T')[0]
    };

    if (editingAsset) {
      setAssets(assets.map(a => a.id === editingAsset.id ? newAsset : a));
    } else {
      setAssets([...assets, newAsset]);
    }
    setIsModalOpen(false);
  };

  const deleteAsset = (id: string) => {
    setAssets(assets.filter(a => a.id !== id));
    if (editingAsset?.id === id) setIsModalOpen(false);
  };

  const handleContribSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(contribAmount);
    if (isNaN(amount) || !activeAssetId) return;

    const newContrib: Contribution = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      amount,
      currency: contribCurrency
    };

    setAssets(assets.map(a => 
      a.id === activeAssetId 
        ? { ...a, contributions: [newContrib, ...(a.contributions || [])], lastUpdated: new Date().toISOString().split('T')[0] } 
        : a
    ));
    setIsContribModalOpen(false);
    setContribAmount('');
  };

  const handleRateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rate = parseFloat(rateValue);
    if (isNaN(rate) || !activeAssetId) return;

    setAssets(assets.map(a => 
      a.id === activeAssetId 
        ? { ...a, growthRate: rate, lastUpdated: new Date().toISOString().split('T')[0] } 
        : a
    ));
    setIsRateModalOpen(false);
    setRateValue('');
  };

  const totalPortfolioValue = assets.reduce((sum, a) => sum + calculateAssetBalance(a), 0);

  if (!isLoaded) return null;

  return (
    <div className="flex flex-col gap-6 md:gap-8 w-full animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* Heading & Summary Card */}
      <div className="flex flex-col gap-4 md:gap-6 px-1 md:px-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-lg md:text-2xl font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
            Assets
          </h2>
          <button 
            onClick={openAddModal}
            className="bg-emerald-600 text-white uppercase tracking-widest text-[10px] md:text-xs px-5 md:px-6 py-2.5 md:py-3 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg md:h-[46px] w-fit"
          >
            Add Asset
          </button>
        </div>

        {/* Total Assets Metric */}
        <div className="bg-emerald-50/30 dark:bg-emerald-500/5 border border-emerald-100/50 dark:border-emerald-900/30 rounded-[32px] p-5 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-xl transition-all group overflow-hidden relative">
          <div className="flex flex-col gap-1 relative z-10">
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em]">Portfolio valuation</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl text-zinc-900 dark:text-zinc-100 tracking-tighter font-bold">
                ₹{totalPortfolioValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
              <span className="text-[10px] md:text-sm text-zinc-500 font-medium uppercase tracking-tight opacity-70">
                (CAD ${convertToCAD(totalPortfolioValue).toLocaleString('en-US', { maximumFractionDigits: 0 })})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-1 relative z-10">
             <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest leading-none">Total Assets</span>
             <span className="text-base md:text-lg text-zinc-900 dark:text-zinc-100 font-bold">{assets.length} Holdings</span>
          </div>
        </div>
      </div>

      {/* Assets Grid Grouped by Type */}
      <div className="flex flex-col gap-8 md:gap-10 px-1 md:px-2">
        {ASSET_TYPES.map(type => {
          const typeAssets = assets.filter(a => a.type === type);
          if (typeAssets.length === 0) return null;

          return (
            <div key={type} className="flex flex-col gap-4">
              <div className="flex items-center gap-4 px-2">
                <h3 className="text-[10px] md:text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em] whitespace-nowrap">
                  {type}
                </h3>
                <div className="h-px flex-1 bg-zinc-100 dark:bg-zinc-800/30" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-5">
                {typeAssets.map(asset => {
                  const currentValue = calculateAssetBalance(asset);
                  return (
                    <div 
                      key={asset.id} 
                      className="bg-emerald-50/20 dark:bg-emerald-500/5 border border-emerald-100/50 dark:border-emerald-900/30 rounded-[32px] p-5 md:p-6 flex flex-col gap-4 group hover:shadow-lg transition-all relative overflow-hidden"
                    >
                      {/* Action Buttons */}
                      <div className="absolute top-5 right-5 flex items-center gap-1 z-10">
                        <button 
                            onClick={() => openEditModal(asset)}
                            className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                            title="Edit Asset"
                        >
                            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button 
                            onClick={() => toggleExpand(asset.id)}
                            className="sm:hidden p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all"
                        >
                            <svg 
                                className={`w-5 h-5 transition-transform duration-300 ${expandedAssets[asset.id] ? 'rotate-180' : ''}`} 
                                fill="none" viewBox="0 0 24 24" stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                      </div>

                      <div className="flex flex-col gap-2 min-w-0">
                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="pr-16 md:pr-0">
                            <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full border border-emerald-100/50 bg-emerald-50/50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-900/30 w-fit whitespace-nowrap font-bold">
                                {asset.type}
                            </span>
                          </div>
                          <h3 className="text-base md:text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight leading-tight whitespace-nowrap overflow-hidden text-ellipsis w-full" title={asset.name}>
                              {asset.name}
                          </h3>
                        </div>

                        {/* Valuation Summary (Always visible or specifically formatted for mobile) */}
                         <div className="flex flex-col gap-0.5">
                               <div className="flex items-baseline gap-2">
                                <span className="text-xl font-bold text-zinc-900 dark:text-white tracking-tighter">
                                    ₹{currentValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </span>
                                {asset.growthRate !== 0 && (
                                    <span className={`text-[10px] font-bold ${asset.growthRate > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {asset.growthRate > 0 ? '↑' : '↓'}{Math.abs(asset.growthRate)}%
                                    </span>
                                )}
                               </div>
                               <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium opacity-70">
                                   CAD ${convertToCAD(currentValue).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                               </span>
                         </div>
                      </div>

                      <div className={`sm:flex flex-col gap-4 w-full ${expandedAssets[asset.id] ? 'flex mt-2' : 'hidden'}`}>
                          <div className="flex flex-col gap-0.5">

                         <span className="text-xs text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">Compounded Valuation</span>
                         <div className="flex items-baseline gap-2">
                            <span className="text-2xl text-zinc-900 dark:text-zinc-100 tracking-tight">
                                ₹{currentValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                <span className="text-[10px] ml-1.5 text-zinc-500 font-medium">(CAD ${convertToCAD(currentValue).toLocaleString('en-US', { maximumFractionDigits: 0 })})</span>
                            </span>
                            {(asset.contributions || []).length > 0 && asset.growthRate !== 0 && (
                                <span className={`text-xs ${asset.growthRate > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                    {asset.growthRate > 0 ? '↑' : '↓'}{Math.abs(asset.growthRate)}% <span className="text-[10px] opacity-60">APY</span>
                                </span>
                            )}
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button 
                            onClick={() => {
                                setActiveAssetId(asset.id);
                                setIsContribModalOpen(true);
                            }}
                            className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800 text-xs uppercase tracking-widest hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
                        >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            Record
                        </button>
                        <button 
                             onClick={() => {
                                setActiveAssetId(asset.id);
                                setRateValue(asset.growthRate.toString());
                                setIsRateModalOpen(true);
                            }}
                            className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800 text-xs uppercase tracking-widest hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all text-emerald-600 dark:text-emerald-400"
                        >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                            APY %
                        </button>
                      </div>

                       <div className="flex flex-col gap-1.5 mt-auto border-t border-zinc-50 dark:border-zinc-800/50 pt-4">
                           <div className="flex items-center justify-between">
                             <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Last Updated</span>
                             <span className="text-xs text-zinc-700 dark:text-zinc-300">
                                 {new Date(asset.lastUpdated).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                             </span>
                           </div>
                       </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Asset Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 animate-in zoom-in duration-300">
            <div className="p-8 md:p-10">
              <div className="flex justify-between items-center mb-8 md:mb-10">
                <h3 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white uppercase tracking-tighter">
                  {editingAsset ? 'Modify Asset' : 'New Asset'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex flex-col gap-2">
                    <label className="text-xs text-zinc-600 uppercase tracking-[0.2em] ml-2">Asset Name</label>
                    <input 
                      required type="text" value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                      placeholder="e.g. Primary Residence..."
                      className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-4 text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all text-xl" 
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs text-zinc-600 uppercase tracking-[0.2em] ml-2">Asset Type</label>
                        <select 
                            value={formData.type} 
                            onChange={e => setFormData({...formData, type: e.target.value as AssetType})}
                            className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-4 text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all appearance-none cursor-pointer"
                        >
                            {ASSET_TYPES.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs text-zinc-600 uppercase tracking-[0.2em] ml-2">Initial Balance</label>
                        <div className="relative w-full">
                            <select 
                                value={formData.initialCurrency}
                                onChange={e => setFormData({...formData, initialCurrency: e.target.value as 'INR' | 'CAD'})}
                                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2 py-1 text-[10px] font-bold text-zinc-600 outline-none cursor-pointer z-10"
                            >
                                <option value="INR">INR (₹)</option>
                                <option value="CAD">CAD (C$)</option>
                            </select>
                            <input 
                                required type="number" step="0.01" value={formData.initialValue} 
                                onChange={e => setFormData({...formData, initialValue: e.target.value})} 
                                placeholder="0.00"
                                className="w-full min-w-0 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl pl-24 pr-6 py-4 text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all text-xl" 
                            />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-xs text-zinc-600 uppercase tracking-[0.2em] ml-2">Asset Acquisition (Start Date)</label>
                    <input 
                        required type="date" value={formData.startDate} 
                        onChange={e => setFormData({...formData, startDate: e.target.value})} 
                        className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-4 text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all" 
                    />
                </div>

                <div className="flex gap-4 pt-6">
                  {editingAsset && (
                    <button type="button" onClick={() => deleteAsset(editingAsset.id)} className="px-5 py-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 text-[10px] uppercase tracking-widest font-bold hover:bg-rose-100 transition-all">
                        Delete
                    </button>
                  )}
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-4 md:py-5 rounded-2xl md:rounded-3xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 transition-all font-bold">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 px-6 py-4 md:py-5 rounded-2xl md:rounded-3xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black hover:scale-105 transition-all uppercase tracking-widest text-[10px] sm:text-xs font-bold">
                    {editingAsset ? 'Update' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Record Contribution Modal */}
      {isContribModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-[32px] w-full max-w-sm shadow-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 animate-in zoom-in duration-300">
            <div className="p-8 md:p-10">
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-white uppercase tracking-tighter mb-8 text-center">Log Fuel</h3>
              <form onSubmit={handleContribSubmit} className="space-y-6">
                <div className="flex flex-col gap-4">
                    <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl mb-2">
                        <button 
                            type="button" 
                            onClick={() => setContribCurrency('INR')}
                            className={`flex-1 py-3 text-[10px] uppercase tracking-widest rounded-xl transition-all ${contribCurrency === 'INR' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-600'}`}
                        >
                            ₹ INR
                        </button>
                        <button 
                            type="button" 
                            onClick={() => setContribCurrency('CAD')}
                            className={`flex-1 py-3 text-[10px] uppercase tracking-widest rounded-xl transition-all ${contribCurrency === 'CAD' ? 'bg-emerald-600 text-white shadow-lg' : 'text-zinc-600'}`}
                        >
                            C$ CAD
                        </button>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] text-center">Amount</label>
                        <input 
                            required autoFocus type="number" step="0.01" value={contribAmount} 
                            onChange={e => setContribAmount(e.target.value)} 
                            placeholder="0.00"
                            className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-6 text-center text-3xl text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all font-bold"
                        />
                    </div>
                </div>
                <button type="submit" className="w-full px-8 py-5 rounded-3xl bg-emerald-600 text-white hover:scale-105 transition-all uppercase tracking-widest text-[10px] sm:text-xs font-bold shadow-xl shadow-emerald-200/50 dark:shadow-none">
                    Log fuel
                </button>
                <button type="button" onClick={() => setIsContribModalOpen(false)} className="w-full py-2 text-[10px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-400 uppercase tracking-widest font-medium">
                    Nevermind
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Set Growth Rate Modal */}
      {isRateModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-[32px] w-full max-w-sm shadow-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 animate-in zoom-in duration-300">
            <div className="p-8 md:p-10">
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-white uppercase tracking-tighter mb-6 text-center">Annual APY (%)</h3>
              <p className="text-[10px] text-zinc-600 text-center uppercase tracking-widest mb-10 leading-relaxed">
                Set annual appreciation (+) or depreciation (-)<br />to calculate compounding growth over time.
              </p>
              <form onSubmit={handleRateSubmit} className="space-y-6">
                <div className="flex flex-col gap-2">
                    <label className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] text-center">Rate (%)</label>
                    <input 
                        required autoFocus type="number" step="0.01" value={rateValue} 
                        onChange={e => setRateValue(e.target.value)} 
                        placeholder="0.0%"
                        className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-6 text-center text-3xl text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all"
                    />
                </div>
                <button type="submit" className="w-full px-8 py-5 rounded-3xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black hover:scale-105 transition-all uppercase tracking-widest text-[10px] sm:text-xs font-bold">
                    Update APY
                </button>
                <button type="button" onClick={() => setIsRateModalOpen(false)} className="w-full py-2 text-[10px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-400 uppercase font-bold tracking-widest">
                    Nevermind
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
