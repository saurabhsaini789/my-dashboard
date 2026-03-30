"use client";

import React, { useState, useEffect, useRef } from 'react';
import { getPrefixedKey } from '@/lib/keys';
import { setSyncedItem } from '@/lib/storage';
import { calculateAssetBalance, type Asset, type Contribution } from '@/lib/finances';

export type AssetType = 'Cash' | 'Bank Balance' | 'Property' | 'Business Value' | 'Vehicle' | 'Investment' | 'Metal' | 'Loans Given';

const ASSET_TYPES: AssetType[] = [
  'Cash', 'Bank Balance', 'Property', 'Business Value', 'Vehicle', 'Investment', 'Metal', 'Loans Given'
];

export function AssetsSection() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

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
    startDate: new Date().toISOString().split('T')[0],
    lastUpdated: new Date().toISOString().split('T')[0]
  });

  const assetsRef = useRef(assets);
  useEffect(() => {
    assetsRef.current = assets;
  }, [assets]);

  useEffect(() => {
    const saved = localStorage.getItem(getPrefixedKey('finance_assets'));
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
    setIsLoaded(true);

    const handleLocal = (e: any) => {
      if (e.detail && e.detail.key === 'finance_assets') {
        const val = localStorage.getItem(getPrefixedKey('finance_assets'));
        if (val && val !== JSON.stringify(assetsRef.current)) {
          try { 
            const parsed = JSON.parse(val);
             const migrated = parsed.map((a: any) => ({
                ...a,
                initialValue: a.initialValue ?? a.currentValue ?? 0,
                startDate: a.startDate ?? a.lastUpdated ?? new Date().toISOString().split('T')[0],
                contributions: a.contributions ?? [],
                growthRate: a.growthRate ?? 0
              }));
            setAssets(migrated); 
          } catch (e) {}
        }
      }
      if (e.detail && e.detail.key === 'finance_exchange_rate') {
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
      setSyncedItem('finance_assets', JSON.stringify(assets));
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
      initialValue: asset.initialValue.toString(),
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
        ? { ...a, contributions: [newContrib, ...a.contributions], lastUpdated: new Date().toISOString().split('T')[0] } 
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
    <div className="flex flex-col gap-8 w-full animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* Heading & Summary Card */}
      <div className="flex flex-col gap-6 px-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
            Assets
          </h2>
          <button 
            onClick={openAddModal}
            className="bg-emerald-600 text-white uppercase tracking-widest text-xs px-6 py-3 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg h-[46px]"
          >
            Add Asset
          </button>
        </div>

        {/* Total Assets Metric */}
        <div className="bg-emerald-50/20 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-900/30 rounded-3xl p-6 md:p-8 flex items-center justify-between hover:shadow-xl transition-all group overflow-hidden relative">
          <div className="flex flex-col gap-1 relative z-10">
            <span className="text-xs text-zinc-600 uppercase tracking-[0.2em]">Live Portfolio Valuation (Compound Growth)</span>
            <div className="flex items-baseline gap-3">
              <span className="text-2xl md:text-3xl text-zinc-900 dark:text-zinc-100 tracking-tight">
                ₹{totalPortfolioValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
              <span className="text-xs text-emerald-500 uppercase tracking-widest mb-1">Live Net Assets</span>
            </div>
          </div>

          <div className="flex flex-col gap-1 text-right relative z-10">
             <span className="text-xs text-zinc-600 uppercase tracking-widest leading-none">Holdings</span>
             <span className="text-lg text-zinc-900 dark:text-zinc-100">{assets.length} Assets</span>
          </div>
        </div>
      </div>

      {/* Assets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 px-2">
        {assets.map(asset => {
          const currentValue = calculateAssetBalance(asset);
          return (
            <div 
              key={asset.id} 
              className="bg-emerald-50/20 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-900/30 rounded-3xl p-6 flex flex-col gap-6 group hover:shadow-lg transition-all relative overflow-hidden"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded border border-emerald-100 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-900/30 w-fit">
                    {asset.type}
                  </span>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight leading-tight break-words">
                    {asset.name}
                  </h3>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                    <button 
                        onClick={() => openEditModal(asset)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                        title="Edit Asset"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                </div>
              </div>

              <div className="flex flex-col gap-0.5">
                 <span className="text-xs text-zinc-600 uppercase tracking-widest">Compounded Valuation</span>
                 <div className="flex items-baseline gap-2">
                    <span className="text-2xl text-zinc-900 dark:text-zinc-100 tracking-tight">
                        ₹{currentValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                    {asset.growthRate !== 0 && (
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
                    <span className="text-xs text-zinc-500 uppercase tracking-widest">Last Updated</span>
                    <span className="text-xs text-zinc-700">
                        {new Date(asset.lastUpdated).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Asset Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-[40px] w-full max-w-xl shadow-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 animate-in zoom-in duration-300">
            <div className="p-10">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-3xl font-bold text-zinc-900 dark:text-white uppercase tracking-tighter">
                  {editingAsset ? 'Modify Asset' : 'New Asset'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-zinc-600 hover:text-zinc-900 dark:hover:text-white transition-colors">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
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

                <div className="grid grid-cols-2 gap-6">
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
                        <div className="flex gap-2">
                            <select 
                                value={formData.initialCurrency}
                                onChange={e => setFormData({...formData, initialCurrency: e.target.value as 'INR' | 'CAD'})}
                                className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-4 py-4 text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all text-sm font-bold w-24"
                            >
                                <option value="INR">₹ INR</option>
                                <option value="CAD">C$ CAD</option>
                            </select>
                            <input 
                                required type="number" step="0.01" value={formData.initialValue} 
                                onChange={e => setFormData({...formData, initialValue: e.target.value})} 
                                placeholder="0.00"
                                className="flex-1 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-4 text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all" 
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
                    <button type="button" onClick={() => deleteAsset(editingAsset.id)} className="px-6 py-4 rounded-2xl bg-rose-50 text-rose-500 text-xs uppercase hover:bg-rose-100 transition-all">
                        Delete
                    </button>
                  )}
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-8 py-5 rounded-3xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 hover:text-zinc-900 transition-all">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 px-8 py-5 rounded-3xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black hover:scale-105 transition-all uppercase tracking-widest text-xs">
                    {editingAsset ? 'Update Asset' : 'Save Asset'}
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
          <div className="bg-white dark:bg-zinc-900 rounded-[40px] w-full max-w-sm shadow-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 animate-in zoom-in duration-300">
            <div className="p-10">
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-white uppercase tracking-tighter mb-8 text-center">Record Contribution</h3>
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
                <button type="submit" className="w-full px-8 py-5 rounded-3xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black hover:scale-105 transition-all uppercase tracking-widest text-xs">
                    Apply to Asset
                </button>
                <button type="button" onClick={() => setIsContribModalOpen(false)} className="w-full py-2 text-[10px] text-zinc-600 hover:text-zinc-900 uppercase">
                    Cancel
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Set Growth Rate Modal */}
      {isRateModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-[40px] w-full max-w-sm shadow-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 animate-in zoom-in duration-300">
            <div className="p-10">
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-white uppercase tracking-tighter mb-6 text-center">Annual Growth Rate (APY)</h3>
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
                <button type="submit" className="w-full px-8 py-5 rounded-3xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black hover:scale-105 transition-all uppercase tracking-widest text-xs">
                    Update APY
                </button>
                <button type="button" onClick={() => setIsRateModalOpen(false)} className="w-full py-2 text-xs text-zinc-600 hover:text-zinc-900 uppercase">
                    Cancel
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
