"use client";

import React, { useState, useEffect, useRef } from 'react';
import { getPrefixedKey } from '@/lib/keys';
import { setSyncedItem } from '@/lib/storage';
import { getExchangeRate, convertToINR } from '@/lib/finances';

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
  
  // Temp form state for target/monthly expenses editing
  const [tempData, setTempData] = useState({
    targetAmount: '',
    monthlyExpenses: ''
  });

  const dataRef = useRef<EmergencyFundData | null>(null);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    const saved = localStorage.getItem(getPrefixedKey('finance_emergency_fund'));
    if (saved) {
      try {
        setData(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse emergency fund data", e);
      }
    } else {
      // Default initial state
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
      if (e.detail && e.detail.key === 'finance_emergency_fund') {
        const val = localStorage.getItem(getPrefixedKey('finance_emergency_fund'));
        if (val && val !== JSON.stringify(dataRef.current)) {
          try { setData(JSON.parse(val)); } catch (e) {}
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
    if (isLoaded && data) {
      setSyncedItem('finance_emergency_fund', JSON.stringify(data));
    }
  }, [data, isLoaded]);

  if (!isLoaded || !data) return null;

  const exchangeRate = getExchangeRate();
  const totalSaved = data.contributions.reduce((sum, c) => sum + convertToINR(c.amount, c.currency, exchangeRate), 0);
  const progressPercent = Math.min(100, (totalSaved / (data.targetAmount || 1)) * 100);
  const monthsCovered = data.monthlyExpenses > 0 ? totalSaved / data.monthlyExpenses : 0;
  const remaining = Math.max(0, data.targetAmount - totalSaved);
  const recentContributions = data.contributions.slice(0, 1);

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

  // Donut chart calculations
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progressPercent / 100) * circumference;

  return (
    <div className="flex flex-col gap-8 w-full transition-all duration-700 animate-in fade-in slide-in-from-bottom-8">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
            Emergency Fund
        </h2>
        <div className="flex gap-4">
            <button 
                onClick={openSettings}
                className="bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-900/30 uppercase tracking-widest text-xs px-6 py-4 rounded-2xl transition-all flex items-center gap-2"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Targets
            </button>
            <button 
                onClick={() => setIsContributionModalOpen(true)}
                className="bg-amber-500 text-white uppercase tracking-widest text-xs px-8 py-4 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-amber-200/50 dark:shadow-none"
            >
                Log Contribution
            </button>
        </div>
      </div>

      <div className="bg-amber-50/20 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-900/30 rounded-[48px] p-8 md:p-12 shadow-sm hover:shadow-2xl transition-all duration-500 relative overflow-hidden group">
        
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-50/40 dark:bg-amber-500/10 rounded-full blur-3xl -mr-48 -mt-48 transition-all group-hover:scale-110" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 relative z-10">
          
          {/* Main Visualization & Metric */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center gap-10 border-b lg:border-b-0 lg:border-r border-zinc-100 dark:border-zinc-800/50 pb-12 lg:pb-0 lg:pr-12">
            
            <div className="relative w-64 h-64 md:w-80 md:h-80">
                {/* SVG Donut Chart */}
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 200 200">
                    {/* Background track */}
                    <circle 
                        cx="100" cy="100" r={radius} 
                        fill="none" stroke="currentColor" strokeWidth="12" 
                        className="text-zinc-50 dark:text-zinc-800" 
                    />
                    {/* Progress stroke */}
                    <circle 
                        cx="100" cy="100" r={radius} 
                        fill="none" stroke="currentColor" strokeWidth="14" 
                        strokeDasharray={circumference} 
                        strokeDashoffset={offset} 
                        strokeLinecap="round" 
                        className={`${monthsCovered >= 6 ? 'text-emerald-500' : monthsCovered >= 3 ? 'text-amber-500' : 'text-rose-500'} transition-all duration-[1500ms] ease-out`} 
                    />
                </svg>

                {/* Central Highlight Metric */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className={`text-xs uppercase tracking-[0.2em] mb-2 px-3 py-1 rounded-full ${
                        monthsCovered >= 6 
                            ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' 
                            : monthsCovered >= 3
                            ? 'text-amber-500 bg-amber-50 dark:bg-amber-500/10'
                            : 'text-rose-500 bg-rose-50 dark:bg-rose-500/10'
                    }`}>
                        {progressPercent.toFixed(0)}% Saved
                    </span>
                    <span className="text-xs text-zinc-600 uppercase tracking-[0.3em] mb-1">Coverage</span>
                    <span className="text-5xl md:text-6xl text-zinc-900 dark:text-white tracking-tighter leading-none">
                        {monthsCovered < 10 ? monthsCovered.toFixed(1) : Math.floor(monthsCovered)}
                    </span>
                    <span className="text-base text-zinc-600 uppercase tracking-widest mt-2">{monthsCovered === 1 ? 'Month' : 'Months'}</span>
                </div>
            </div>

            <div className="flex flex-col items-center gap-2">
                <span className="text-2xl text-zinc-900 dark:text-white tracking-tighter">
                    ₹{totalSaved.toLocaleString('en-IN')} Saved
                </span>
                <span className="text-xs text-zinc-600 uppercase tracking-[0.2em]">
                    Target: ₹{data.targetAmount.toLocaleString('en-IN')}
                </span>
            </div>
          </div>

          {/* Details & Tracker */}
          <div className="lg:col-span-7 flex flex-col gap-10">
            
            {/* Top Metrics Row */}
            <div className="grid grid-cols-2 gap-6">
                <div className="bg-zinc-50 dark:bg-zinc-800/30 rounded-3xl p-6 border border-zinc-100 dark:border-zinc-800/50">
                    <span className="text-xs text-zinc-600 uppercase tracking-widest mb-3 block">Ideal Monthly Expense</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl text-zinc-900 dark:text-white tracking-tighter">₹{data.monthlyExpenses.toLocaleString('en-IN')}</span>
                        <span className="text-xs text-zinc-600">/mo</span>
                    </div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/30 rounded-3xl p-6 border border-zinc-100 dark:border-zinc-800/50">
                    <span className="text-xs text-zinc-600 uppercase tracking-widest mb-3 block">Remaining Goal</span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl text-zinc-900 dark:text-white tracking-tighter">₹{remaining.toLocaleString('en-IN')}</span>
                    </div>
                </div>
            </div>


            {/* Monthly Expense Input Widget */}
            <div className="bg-amber-50/20 dark:bg-amber-500/5 rounded-4xl p-8 border border-amber-100/50 dark:border-amber-900/30">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex flex-col gap-1">
                        <h4 className="text-base font-bold text-zinc-900 dark:text-white uppercase tracking-tight">Adjust Monthly Baseline</h4>
                        <p className="text-sm text-zinc-500 font-medium">Update your ideal monthly budget to recalculate safety coverage.</p>
                    </div>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600">₹</span>
                        <input 
                            type="number" 
                            value={data.monthlyExpenses} 
                            onChange={(e) => setData({...data, monthlyExpenses: parseFloat(e.target.value) || 0})}
                            className="bg-white dark:bg-zinc-900 border border-amber-100 dark:border-amber-900/50 rounded-2xl pl-8 pr-4 py-3 text-lg text-zinc-900 dark:text-white w-full md:w-32 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* Recent Contributions Tracker */}
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-zinc-600 uppercase tracking-[0.25em]">Last Contribution</h4>
                    {data.contributions.length > 1 && (
                        <button 
                            onClick={() => setIsHistoryModalOpen(true)}
                            className="text-xs text-zinc-900 dark:text-white uppercase tracking-widest hover:underline"
                        >
                            View All
                        </button>
                    )}
                </div>
                <div className="flex flex-col gap-3">
                    {recentContributions.length > 0 ? recentContributions.map(c => (
                        <div key={c.id} className="flex justify-between items-center p-5 bg-amber-50/10 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-900/30 rounded-[28px] group/item hover:border-amber-200 dark:hover:border-amber-800/50 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-base text-zinc-900 dark:text-white uppercase tracking-tight">
                                        +{c.currency === 'CAD' ? 'C$' : '₹'}{c.amount.toLocaleString('en-IN')}
                                    </span>
                                    <span className="text-xs text-zinc-600">{new Date(c.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => deleteContribution(c.id)}
                                className="p-2 text-zinc-400 hover:text-rose-500 opacity-0 group-hover/item:opacity-100 transition-all"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    )) : (
                        <div className="flex flex-col items-center justify-center py-12 bg-zinc-50 dark:bg-zinc-800/10 rounded-4xl border border-dashed border-zinc-200 dark:border-zinc-800/50">
                            <span className="text-xs text-zinc-500 dark:text-zinc-600 uppercase tracking-widest">No history yet</span>
                        </div>
                    )}
                </div>
            </div>

          </div>
        </div>
      </div>

      {/* Settings Modal (Target & Base Expense) */}
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
                  <button type="button" onClick={() => setIsTargetModalOpen(false)} className="flex-1 px-8 py-5 rounded-3xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 hover:text-zinc-900 transition-all">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 px-8 py-5 rounded-3xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black hover:scale-105 transition-all uppercase tracking-widest text-xs">
                    Update pillar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Contribution Modal */}
      {isContributionModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-[40px] w-full max-w-sm shadow-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 animate-in zoom-in duration-300">
            <div className="p-10">
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-white uppercase tracking-tighter mb-8 text-center">Fuel the Fund</h3>
              <form onSubmit={handleAddContribution} className="space-y-6">
                <div className="flex flex-col gap-4">
                    <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl mb-2">
                        <button 
                            type="button" 
                            onClick={() => setContributionCurrency('INR')}
                            className={`flex-1 py-3 text-[10px] uppercase tracking-widest rounded-xl transition-all ${contributionCurrency === 'INR' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-600'}`}
                        >
                            ₹ INR
                        </button>
                        <button 
                            type="button" 
                            onClick={() => setContributionCurrency('CAD')}
                            className={`flex-1 py-3 text-[10px] uppercase tracking-widest rounded-xl transition-all ${contributionCurrency === 'CAD' ? 'bg-amber-500 text-white shadow-lg' : 'text-zinc-600'}`}
                        >
                            C$ CAD
                        </button>
                    </div>
                    <div className="relative">
                        <input 
                            required autoFocus type="number" step="0.01" value={contributionAmount} onChange={e => setContributionAmount(e.target.value)} placeholder="0.00"
                            className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-6 text-center text-3xl text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all font-bold"
                        />
                    </div>
                </div>
                <button type="submit" className="w-full px-8 py-5 rounded-3xl bg-amber-500 text-white hover:scale-105 transition-all uppercase tracking-widest text-xs shadow-xl shadow-amber-200/50 dark:shadow-none">
                    Log Contribution
                </button>
                <button type="button" onClick={() => setIsContributionModalOpen(false)} className="w-full py-2 text-xs text-zinc-600 hover:text-zinc-900 uppercase tracking-widest">
                    Nevermind
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 animate-in zoom-in duration-300 max-h-[80vh] flex flex-col">
            <div className="p-10 flex flex-col h-full overflow-hidden">
              <div className="flex justify-between items-center mb-8 text-center">
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white uppercase tracking-tighter">Contribution History</h3>
                <button onClick={() => setIsHistoryModalOpen(false)} className="text-zinc-600 hover:text-zinc-900 dark:hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                <div className="flex flex-col gap-3">
                  {data.contributions.map(c => (
                    <div key={c.id} className="flex justify-between items-center p-5 bg-zinc-50 dark:bg-zinc-800/30 rounded-3xl border border-zinc-100 dark:border-zinc-800/50 group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-lg text-zinc-900 dark:text-zinc-100">
                                {c.currency === 'CAD' ? 'C$' : '₹'}{c.amount.toLocaleString('en-IN')}
                            </span>
                            <span className="text-xs text-zinc-600 uppercase tracking-widest">{new Date(c.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
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
                className="w-full mt-6 py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black uppercase tracking-widest text-xs rounded-2xl"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
