"use client";

import React, { useState, useEffect, useRef } from 'react';
import { getPrefixedKey } from '@/lib/keys';
import { setSyncedItem } from '@/lib/storage';
import { getExchangeRate, convertToINR, convertToCAD } from '@/lib/finances';
import { SYNC_KEYS } from '@/lib/sync-keys';

interface Contribution {
  id: string;
  date: string;
  amount: number;
  currency?: 'INR' | 'CAD';
}

interface EmergencyFundData {
  targetAmount: number;
  monthlyExpenses: number;
  contributions: Contribution[];
}

export function EmergencyFundSection() {
  const [data, setData] = useState<EmergencyFundData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isContributionModalOpen, setIsContributionModalOpen] = useState(false);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [contributionAmount, setContributionAmount] = useState('');
  const [contributionCurrency, setContributionCurrency] = useState<'INR' | 'CAD'>('INR');
  const [isCollapsed, setIsCollapsed] = useState(true);
  
  const [tempData, setTempData] = useState({
    targetAmount: '',
    monthlyExpenses: ''
  });

  const dataRef = useRef<EmergencyFundData | null>(null);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    const saved = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_EMERGENCY_FUND));
    if (saved) {
      try {
        setData(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse emergency fund data", e);
      }
    } else {
      setData({
        targetAmount: 30000,
        monthlyExpenses: 5000,
        contributions: [
          { id: '1', date: new Date().toISOString().split('T')[0], amount: 2500 }
        ]
      });
    }
    setIsLoaded(true);

    const handleLocal = (e: any) => {
      if (e.detail && e.detail.key === SYNC_KEYS.FINANCES_EMERGENCY_FUND) {
        const val = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_EMERGENCY_FUND));
        if (val && val !== JSON.stringify(dataRef.current)) {
          try { setData(JSON.parse(val)); } catch (e) {}
        }
      }
      if (e.detail && e.detail.key === SYNC_KEYS.FINANCES_EXCHANGE_RATE) {
        setIsLoaded(false);
        setTimeout(() => setIsLoaded(true), 0);
      }
    };
    window.addEventListener('local-storage-change', handleLocal);
    return () => window.removeEventListener('local-storage-change', handleLocal);
  }, []);

  useEffect(() => {
    if (isLoaded && data) {
      setSyncedItem(SYNC_KEYS.FINANCES_EMERGENCY_FUND, JSON.stringify(data));
    }
  }, [data, isLoaded]);

  if (!isLoaded || !data) return null;

  const exchangeRate = getExchangeRate();
  const totalSaved = (data.contributions || []).reduce((sum, c) => sum + convertToINR(c.amount, c.currency, exchangeRate), 0);
  const progressPercent = Math.min(100, (totalSaved / (data.targetAmount || 1)) * 100);
  const monthsCovered = data.monthlyExpenses > 0 ? totalSaved / data.monthlyExpenses : 0;
  const remaining = Math.max(0, data.targetAmount - totalSaved);
  const recentContributions = (data.contributions || []).slice(0, 1);

  const handleUpdateSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setData({
      ...data,
      targetAmount: parseFloat(tempData.targetAmount) || 0,
      monthlyExpenses: parseFloat(tempData.monthlyExpenses) || 0
    });
    setIsTargetModalOpen(false);
  };

  const openSettings = () => {
    setTempData({
      targetAmount: data.targetAmount.toString(),
      monthlyExpenses: data.monthlyExpenses.toString()
    });
    setIsTargetModalOpen(true);
  };

  const handleAddContribution = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(contributionAmount);
    if (!isNaN(amount) && amount > 0) {
      const newContrib: Contribution = {
        id: Math.random().toString(36).substr(2, 9),
        date: new Date().toISOString().split('T')[0],
        amount,
        currency: contributionCurrency
      };
      setData({
        ...data,
        contributions: [newContrib, ...data.contributions]
      });
      setContributionAmount('');
      setIsContributionModalOpen(false);
    }
  };

  const deleteContribution = (id: string) => {
    setData({
      ...data,
      contributions: data.contributions.filter(c => c.id !== id)
    });
  };

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="flex flex-col gap-6 md:gap-8 w-full transition-all duration-700 animate-in fade-in slide-in-from-bottom-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 md:gap-6 px-1 md:px-2">
        <div className="flex items-center justify-between w-full sm:w-auto">
            <h2 className="text-lg md:text-2xl font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
                Emergency Fund
            </h2>
            <button 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="sm:hidden p-2 text-amber-600 dark:text-amber-400 transition-all hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-full"
            >
                <svg 
                    className={`w-5 h-5 transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}`} 
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-4 justify-start sm:justify-end">
            <button 
                onClick={openSettings}
                className="bg-zinc-50 text-zinc-600 border border-zinc-100/50 dark:bg-zinc-800/30 dark:text-zinc-400 dark:border-zinc-800 font-bold uppercase tracking-widest text-[9px] sm:text-xs px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-2xl transition-all"
            >
                Settings
            </button>
            <button 
                onClick={() => setIsContributionModalOpen(true)}
                className="bg-amber-500 text-white uppercase tracking-widest text-[9px] sm:text-xs px-5 sm:px-8 py-2.5 sm:py-3.5 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-amber-200/50 dark:shadow-none font-bold"
            >
                Log fuel
            </button>
        </div>
      </div>

      <div className="bg-amber-50/20 dark:bg-amber-500/5 border border-amber-100/50 dark:border-amber-900/30 rounded-[32px] sm:rounded-[48px] p-5 sm:p-12 shadow-sm hover:shadow-2xl transition-all duration-500 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-50/30 dark:bg-amber-500/10 rounded-full blur-3xl -mr-48 -mt-48 transition-all group-hover:scale-110" />

        <div className={`sm:hidden flex items-center justify-between relative z-10 ${isCollapsed ? 'flex' : 'hidden'}`}>
            <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-medium">Coverage</span>
                <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tighter">
                     {monthsCovered < 10 ? monthsCovered.toFixed(1) : Math.floor(monthsCovered)} Months
                </span>
            </div>
            <div className="flex flex-col items-end gap-1">
                 <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-bold ${monthsCovered >= 6 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                    {progressPercent.toFixed(0)}% Saved
                 </span>
                 <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">₹{(totalSaved || 0).toLocaleString('en-IN')}</span>
            </div>
        </div>

        <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 relative z-10 sm:grid ${isCollapsed ? 'hidden' : 'grid'}`}>
          <div className="lg:col-span-5 flex flex-col items-center justify-center gap-6 sm:gap-10 border-b lg:border-b-0 lg:border-r border-zinc-100 dark:border-zinc-800/50 pb-8 sm:pb-0 lg:pr-12">
            <div className="relative w-40 h-40 sm:w-80 sm:h-80">
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 200 200">
                    <circle cx="100" cy="100" r={radius} fill="none" stroke="currentColor" strokeWidth="12" className="text-zinc-50 dark:text-zinc-900/50" />
                    <circle cx="100" cy="100" r={radius} fill="none" stroke="currentColor" strokeWidth="14" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className={`${monthsCovered >= 6 ? 'text-emerald-500' : monthsCovered >= 3 ? 'text-amber-500' : 'text-rose-500'} transition-all duration-[1500ms] ease-out`} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className={`text-[10px] sm:text-xs uppercase tracking-[0.2em] mb-1 sm:mb-2 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full ${monthsCovered >= 6 ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : monthsCovered >= 3 ? 'text-amber-500 bg-amber-50 dark:bg-amber-500/10' : 'text-rose-500 bg-rose-50 dark:bg-rose-500/10'} font-bold`}>
                        {progressPercent.toFixed(0)}%
                    </span>
                    <span className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.3em] mb-0 leading-none">Safety</span>
                    <span className="text-4xl sm:text-6xl text-zinc-900 dark:text-white tracking-tighter leading-none font-bold">
                        {monthsCovered < 10 ? monthsCovered.toFixed(1) : Math.floor(monthsCovered)}
                    </span>
                    <span className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mt-1 leading-none">{monthsCovered === 1 ? 'Month' : 'Months'}</span>
                </div>
            </div>
            <div className="flex flex-col items-center gap-1.5 text-center">
                <span className="text-xl sm:text-2xl text-zinc-900 dark:text-white tracking-tighter font-bold">₹{(totalSaved || 0).toLocaleString('en-IN')} Saved</span>
                <span className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em] font-medium opacity-70">(CAD ${convertToCAD(totalSaved).toLocaleString('en-US', { maximumFractionDigits: 0 })})</span>
                <span className="text-[10px] sm:text-xs text-zinc-500 uppercase tracking-[0.2em] mt-2 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full font-bold">Target: ₹{(data.targetAmount || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col gap-8 lg:gap-10">
            <div className="grid grid-cols-2 gap-4 lg:gap-6">
                <div className="bg-zinc-50 dark:bg-zinc-800/30 rounded-3xl p-5 lg:p-6 border border-zinc-100 dark:border-zinc-800/50">
                    <span className="text-[10px] lg:text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2 lg:mb-3 block font-bold">Monthly Expense</span>
                    <div className="flex flex-col">
                        <span className="text-xl lg:text-2xl text-zinc-900 dark:text-white tracking-tighter font-bold">₹{(data.monthlyExpenses || 0).toLocaleString('en-IN')}</span>
                        <span className="text-[10px] lg:text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-tight opacity-70"> (CAD ${convertToCAD(data.monthlyExpenses).toLocaleString('en-US', { maximumFractionDigits: 0 })})</span>
                    </div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/30 rounded-3xl p-5 lg:p-6 border border-zinc-100 dark:border-zinc-800/50">
                    <span className="text-[10px] lg:text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2 lg:mb-3 block font-bold">Remaining Goal</span>
                    <div className="flex flex-col">
                        <span className="text-xl lg:text-2xl text-zinc-900 dark:text-white tracking-tighter font-bold">₹{(remaining || 0).toLocaleString('en-IN')}</span>
                        <span className="text-[10px] lg:text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-tight opacity-70"> (CAD ${convertToCAD(remaining).toLocaleString('en-US', { maximumFractionDigits: 0 })})</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <h4 className="text-[10px] sm:text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em]">Safety Tracker</h4>
                    <button onClick={() => setIsHistoryModalOpen(true)} className="text-[10px] text-amber-600 dark:text-amber-400 uppercase tracking-widest font-bold hover:underline">View Record</button>
                </div>
                <div className="flex flex-col gap-3">
                    {(recentContributions || []).length > 0 ? recentContributions.map(c => (
                        <div key={c.id} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl border border-zinc-100/50 dark:border-zinc-800/50">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Recent fuel</span>
                                <span className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">₹{convertToINR(c.amount, c.currency, exchangeRate).toLocaleString('en-IN')}</span>
                            </div>
                            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">{new Date(c.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                        </div>
                    )) : (
                        <div className="flex flex-col items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800"><span className="text-[10px] text-zinc-500 uppercase tracking-widest">No fuel records yet</span></div>
                    )}
                </div>
            </div>
          </div>
        </div>
      </div>

      {isTargetModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-[40px] w-full max-w-xl shadow-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 animate-in zoom-in duration-300">
            <div className="p-10">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-3xl font-bold text-zinc-900 dark:text-white uppercase tracking-tighter">Adjust Pillar</h3>
                <button onClick={() => setIsTargetModalOpen(false)} className="text-zinc-600 hover:text-zinc-900 dark:hover:text-white transition-colors">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <form onSubmit={handleUpdateSettings} className="space-y-6">
                <div className="flex flex-col gap-2">
                    <label className="text-xs text-zinc-600 uppercase tracking-[0.2em] ml-2">Total Goal Target (₹)</label>
                    <input required type="number" value={tempData.targetAmount} onChange={e => setTempData({...tempData, targetAmount: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-4 text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all text-xl" />
                </div>
                <div className="flex flex-col gap-2">
                    <label className="text-xs text-zinc-600 uppercase tracking-[0.2em] ml-2">Ideal Monthly Expenses (₹)</label>
                    <input required type="number" value={tempData.monthlyExpenses} onChange={e => setTempData({...tempData, monthlyExpenses: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-4 text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all text-xl" />
                </div>
                <div className="flex gap-4 pt-6">
                  <button type="button" onClick={() => setIsTargetModalOpen(false)} className="flex-1 px-8 py-5 rounded-3xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 hover:text-zinc-900 transition-all font-bold">Cancel</button>
                  <button type="submit" className="flex-1 px-8 py-5 rounded-3xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black hover:scale-105 transition-all uppercase tracking-widest text-xs font-bold">Update pillar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isContributionModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-[40px] w-full max-w-sm shadow-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 animate-in zoom-in duration-300">
            <div className="p-10">
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-white uppercase tracking-tighter mb-8 text-center text-amber-500">Fuel the Fund</h3>
              <form onSubmit={handleAddContribution} className="space-y-6">
                <div className="flex flex-col gap-4">
                    <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl mb-2">
                        <button type="button" onClick={() => setContributionCurrency('INR')} className={`flex-1 py-3 text-[10px] uppercase tracking-widest rounded-xl transition-all ${contributionCurrency === 'INR' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white font-bold' : 'text-zinc-500'}`}>₹ INR</button>
                        <button type="button" onClick={() => setContributionCurrency('CAD')} className={`flex-1 py-3 text-[10px] uppercase tracking-widest rounded-xl transition-all ${contributionCurrency === 'CAD' ? 'bg-amber-500 text-white shadow-lg font-bold' : 'text-zinc-500'}`}>C$ CAD</button>
                    </div>
                    <div className="relative">
                        <input required autoFocus type="number" step="0.01" value={contributionAmount} onChange={e => setContributionAmount(e.target.value)} placeholder="0.00" className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-6 text-center text-3xl text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all font-bold" />
                    </div>
                </div>
                <button type="submit" className="w-full px-8 py-5 rounded-3xl bg-amber-500 text-white hover:scale-105 transition-all uppercase tracking-widest text-xs shadow-xl shadow-amber-200/50 dark:shadow-none font-bold">Log fuel</button>
                <button type="button" onClick={() => setIsContributionModalOpen(false)} className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-900 uppercase tracking-widest font-medium">Nevermind</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 animate-in zoom-in duration-300 max-h-[80vh] flex flex-col">
            <div className="p-10 flex flex-col h-full overflow-hidden">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white uppercase tracking-tighter">Fuel Records</h3>
                <button onClick={() => setIsHistoryModalOpen(false)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <div className="flex flex-col gap-3">
                  {(data.contributions || []).map(c => (
                    <div key={c.id} className="flex justify-between items-center p-5 bg-zinc-50 dark:bg-zinc-800/30 rounded-3xl border border-zinc-100 dark:border-zinc-800/50 group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold">₹</div>
                        <div className="flex flex-col">
                            <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                                {c.currency === 'CAD' ? 'C$' : '₹'}{c.amount.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">{new Date(c.date).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      </div>
                      <button onClick={() => deleteContribution(c.id)} className="p-2 text-zinc-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <button 
                onClick={() => setIsHistoryModalOpen(false)}
                className="w-full mt-6 py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black uppercase tracking-widest text-xs rounded-2xl font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
