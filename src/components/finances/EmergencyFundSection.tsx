"use client";

import React, { useState, useEffect, useRef } from 'react';
import { getPrefixedKey } from '@/lib/keys';
import { setSyncedItem } from '@/lib/storage';
import { SYNC_KEYS } from '@/lib/sync-keys';
import { Modal } from '../ui/Modal';
import { DynamicForm } from '../ui/DynamicForm';

interface Contribution {
  id: string;
  date: string;
  amount: number;
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

  const totalSaved = (data.contributions || []).reduce((sum, c) => sum + c.amount, 0);
  const progressPercent = Math.min(100, (totalSaved / (data.targetAmount || 1)) * 100);
  const monthsCovered = data.monthlyExpenses > 0 ? totalSaved / data.monthlyExpenses : 0;
  const targetMonths = data.monthlyExpenses > 0 ? data.targetAmount / data.monthlyExpenses : 0;
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
      targetAmount: data.targetAmount?.toString() || '',
      monthlyExpenses: data.monthlyExpenses?.toString() || ''
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
        amount
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

  return (
    <div className="flex flex-col gap-6 md:gap-8 w-full transition-all duration-700 animate-in fade-in slide-in-from-bottom-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 md:gap-6 px-1 md:px-2">
        <div className="flex items-center justify-between w-full sm:w-auto">
            <h2 className="text-lg md:text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                Emergency fund
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
                className="bg-zinc-50 text-zinc-600 border border-zinc-100/50 dark:bg-zinc-800/30 dark:text-zinc-400 dark:border-zinc-800 font-bold uppercase tracking-widest text-xs px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-2xl transition-all"
            >
                Settings
            </button>
            <button 
                onClick={() => setIsContributionModalOpen(true)}
                className="bg-amber-500 text-white tracking-widest text-xs px-5 sm:px-8 py-2.5 sm:py-3.5 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-sm dark:shadow-none font-bold"
            >
                Log
            </button>
        </div>
      </div>

      <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-100/50 dark:border-amber-900/30 rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm transition-all duration-500 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-100/20 dark:bg-amber-500/15 rounded-full blur-3xl -mr-48 -mt-48 transition-all group-hover:scale-110" />

        <div className={`sm:hidden flex items-center justify-between relative z-10 mb-4 ${isCollapsed ? 'flex' : 'hidden'}`}>
            <div className="flex flex-col gap-0.5">
                <span className="text-xs text-zinc-500 dark:text-zinc-300 uppercase tracking-widest font-medium">Coverage</span>
                <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tighter">
                     {monthsCovered < 10 ? monthsCovered.toFixed(1) : Math.floor(monthsCovered)} / {targetMonths < 10 && targetMonths > 0 ? targetMonths.toFixed(1) : Math.floor(targetMonths)} Months Saved
                </span>
            </div>
            <div className="flex flex-col items-end gap-1">
                 <span className={`text-xs px-2 py-0.5 rounded-full uppercase font-bold ${monthsCovered >= 6 ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
                    {progressPercent.toFixed(0)}% Saved
                 </span>
                 <span className="text-xs text-zinc-500 uppercase tracking-widest font-medium">${(totalSaved || 0).toLocaleString('en-CA', { maximumFractionDigits: 0 })}</span>
            </div>
        </div>

        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10 sm:grid ${isCollapsed ? 'hidden' : 'grid'}`}>
          {/* Left 1/3: Progress */}
          <div className="flex flex-col gap-4 justify-between bg-white/70 dark:bg-zinc-800/50 rounded-2xl p-5 border border-white dark:border-zinc-800/50 shadow-sm">
            <div className="flex flex-col gap-1">
                <span className="text-xl md:text-2xl text-zinc-900 dark:text-white tracking-tighter font-bold">
                    {monthsCovered < 10 ? monthsCovered.toFixed(1) : Math.floor(monthsCovered)} / {targetMonths < 10 && targetMonths > 0 ? targetMonths.toFixed(1) : Math.floor(targetMonths)} Months Saved
                </span>
                <span className="text-xl md:text-2xl text-zinc-500 dark:text-zinc-400 tracking-tighter font-bold">
                    ${(totalSaved || 0).toLocaleString('en-CA', { maximumFractionDigits: 0 })} / ${(data.targetAmount || 0).toLocaleString('en-CA', { maximumFractionDigits: 0 })} Saved
                </span>
            </div>
            
            <div className="flex flex-col gap-3">
                <div className="flex justify-between items-end">
                    <span className="text-xs text-zinc-600 dark:text-zinc-300 font-bold uppercase tracking-widest">Progress</span>
                    <span className={`text-xs uppercase tracking-widest px-3 py-1 rounded-full ${monthsCovered >= 6 ? 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-500/20' : monthsCovered >= 3 ? 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-500/20' : 'text-rose-600 bg-rose-100 dark:text-rose-400 dark:bg-rose-500/20'} font-bold`}>
                        {progressPercent.toFixed(0)}% Funded
                    </span>
                </div>
                <div className="h-4 w-full bg-zinc-100 dark:bg-zinc-800/80 rounded-full overflow-hidden border border-zinc-200/50 dark:border-zinc-700/50">
                    <div 
                        className={`h-full transition-all duration-1000 ease-out ${monthsCovered >= 6 ? 'bg-orange-500' : monthsCovered >= 3 ? 'bg-amber-500' : 'bg-rose-500'}`}
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>
          </div>

          {/* Middle 1/3: Stats */}
          <div className="flex flex-col gap-4">
              <div className="flex-1 bg-white/40 dark:bg-zinc-800/20 shadow-sm rounded-2xl p-5 border border-white dark:border-zinc-800/50 flex flex-col justify-center transition-all hover:bg-white/60 dark:hover:bg-zinc-800/40">
                  <span className="text-xs lg:text-xs text-zinc-600 dark:text-zinc-300 uppercase tracking-widest mb-1 block font-bold">Monthly Expense</span>
                  <div className="flex flex-col">
                      <span className="text-xl lg:text-3xl text-zinc-900 dark:text-white tracking-tighter font-bold">${(data.monthlyExpenses || 0).toLocaleString('en-CA', { maximumFractionDigits: 0 })}</span>
                  </div>
              </div>
              <div className="flex-1 bg-white/40 dark:bg-zinc-800/20 shadow-sm rounded-2xl p-5 border border-white dark:border-zinc-800/50 flex flex-col justify-center transition-all hover:bg-white/60 dark:hover:bg-zinc-800/40">
                  <span className="text-xs lg:text-xs text-zinc-600 dark:text-zinc-300 uppercase tracking-widest mb-1 block font-bold">Remaining Goal</span>
                  <div className="flex flex-col">
                      <span className="text-xl lg:text-3xl text-zinc-900 dark:text-white tracking-tighter font-bold">${(remaining || 0).toLocaleString('en-CA', { maximumFractionDigits: 0 })}</span>
                  </div>
              </div>
          </div>

          {/* Right 1/3: Contribution Tracker */}
          <div className="flex flex-col gap-4 bg-white/60 dark:bg-zinc-800/40 shadow-sm rounded-2xl p-5 border border-white dark:border-zinc-800/50">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-200/50 dark:border-zinc-700/50">
                  <h4 className="text-xs font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-widest">Contribution Tracker</h4>
                  <button onClick={() => setIsHistoryModalOpen(true)} className="text-xs text-amber-600 dark:text-amber-400 uppercase tracking-widest font-bold hover:underline">View All</button>
              </div>
              <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1 flex-1 min-h-[140px]">
                  {(recentContributions || []).length > 0 ? recentContributions.map(c => (
                      <div key={c.id} className="flex items-center justify-between p-3 bg-white dark:bg-zinc-800/50 rounded-2xl border border-zinc-100/50 dark:border-zinc-700/50 shadow-sm">
                          <div className="flex flex-col">
                              <span className="text-xs text-zinc-500 dark:text-zinc-300 uppercase tracking-widest mb-0.5">Contribution</span>
                              <span className="text-sm font-bold text-zinc-900 dark:text-white tracking-tight">${(c.amount || 0).toLocaleString('en-CA', { maximumFractionDigits: 0 })}</span>
                          </div>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-medium bg-zinc-50 dark:bg-zinc-900/50 px-2 py-1 rounded-lg">
                            {new Date(c.date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                          </span>
                      </div>
                  )) : (
                      <div className="flex flex-col items-center justify-center p-4 bg-white/50 dark:bg-zinc-800/30 rounded-2xl border border-dashed border-zinc-200/80 dark:border-zinc-700 h-full">
                        <span className="text-xs text-zinc-500 dark:text-zinc-300 uppercase tracking-widest text-center font-medium">No contributions yet</span>
                      </div>
                  )}
              </div>
          </div>
        </div>
      </div>

      {/* Schema-Driven Settings Modal */}
      <Modal
        isOpen={isTargetModalOpen}
        onClose={() => setIsTargetModalOpen(false)}
        title="Adjust pillar"
        onSubmit={handleUpdateSettings}
        submitText="Update Pillar"
        accentColor="amber"
      >
        <DynamicForm
          sections={[
            {
              id: 'settings',
              title: 'Emergency fund settings',
              fields: [
                { name: 'targetAmount', label: 'Total Goal Target ($)', type: 'number', required: true, step: '1', fullWidth: true },
                { name: 'monthlyExpenses', label: 'Ideal Monthly Expenses ($)', type: 'number', required: true, step: '1', fullWidth: true }
              ]
            }
          ]}
          formData={tempData}
          accentColor="amber"
          onChange={(name, value) => setTempData(prev => ({ ...prev, [name]: value }))}
        />
      </Modal>

      {/* Schema-Driven Contribution Modal */}
      <Modal
        isOpen={isContributionModalOpen}
        onClose={() => setIsContributionModalOpen(false)}
        title="Fuel the fund"
        onSubmit={handleAddContribution}
        submitText="Log"
        accentColor="amber"
      >
        <DynamicForm
          sections={[
            {
              id: 'fuel',
              title: 'Contribution',
              fields: [
                { name: 'amount', label: 'Amount', type: 'number', required: true, step: '0.01', placeholder: '0.00', fullWidth: true }
              ]
            }
          ]}
          formData={{ amount: contributionAmount }}
          accentColor="amber"
          onChange={(_, value) => setContributionAmount(value)}
        />
      </Modal>

      {/* Schema-Driven History Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title="Fuel records"
        onSubmit={(e) => { e.preventDefault(); setIsHistoryModalOpen(false); }}
        submitText="Done"
        accentColor="amber"
      >
        <div className="flex flex-col gap-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
          {(data.contributions || []).map(c => (
            <div key={c.id} className="flex justify-between items-center p-5 bg-zinc-50 dark:bg-zinc-800/30 rounded-3xl border border-zinc-100 dark:border-zinc-800/50 group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold">$</div>
                <div className="flex flex-col">
                    <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                        ${(c.amount || 0).toLocaleString('en-CA', { maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-xs text-zinc-500 uppercase tracking-widest font-medium">{new Date(c.date).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
              <button type="button" onClick={() => deleteContribution(c.id)} className="p-2 text-zinc-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
