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

interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  initialAmount: number;
  initialCurrency?: 'INR' | 'CAD';
  startDate: string;
  targetDate: string;
  contributions: Contribution[];
}

export function SavingsTargets() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  
  // Contribution modal state
  const [isContributionModalOpen, setIsContributionModalOpen] = useState(false);
  const [targetGoalId, setTargetGoalId] = useState<string | null>(null);
  const [contributionAmount, setContributionAmount] = useState('');
  const [contributionCurrency, setContributionCurrency] = useState<'INR' | 'CAD'>('INR');

  // History modal state
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyGoalId, setHistoryGoalId] = useState<string | null>(null);
  const [expandedGoals, setExpandedGoals] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedGoals(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    initialAmount: '',
    initialCurrency: 'INR' as 'INR' | 'CAD',
    startDate: '',
    targetDate: ''
  });

  const goalsRef = useRef(goals);
  useEffect(() => {
    goalsRef.current = goals;
  }, [goals]);

  useEffect(() => {
    const saved = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_SAVINGS_TARGETS));
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migration: Ensure all goals have startDate and contributions
        const goalsWithHistory = parsed.map((g: any) => ({
          ...g,
          startDate: g.startDate || new Date().toISOString().split('T')[0],
          initialAmount: g.initialAmount || g.currentSaved || 0,
          contributions: g.contributions || []
        }));
        setGoals(goalsWithHistory);
      } catch (e) {}
    } else {
        // Initial mock data
        const mockGoals: SavingsGoal[] = [
            {
                id: '1',
                name: 'Dream Car',
                targetAmount: 45000,
                initialAmount: 5000,
                startDate: '2026-01-01',
                targetDate: '2029-12-01',
                contributions: [
                    { id: 'c1', date: '2026-03-01', amount: 500 },
                    { id: 'c2', date: '2026-03-15', amount: 250 },
                ]
            },
            {
                id: '2',
                name: 'House Fund',
                targetAmount: 250000,
                initialAmount: 25000,
                startDate: '2025-06-01',
                targetDate: '2030-06-01',
                contributions: [
                    { id: 'h1', date: '2026-02-10', amount: 2000 },
                    { id: 'h2', date: '2026-03-20', amount: 1500 },
                ]
            }
        ];
        setGoals(mockGoals);
    }
    setIsLoaded(true);

    const handleLocal = (e: any) => {
      if (e.detail && e.detail.key === SYNC_KEYS.FINANCES_SAVINGS_TARGETS) {
        const val = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_SAVINGS_TARGETS));
        if (val && val !== JSON.stringify(goalsRef.current)) {
          try { setGoals(JSON.parse(val)); } catch (e) {}
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
      setSyncedItem(SYNC_KEYS.FINANCES_SAVINGS_TARGETS, JSON.stringify(goals));
    }
  }, [goals, isLoaded]);


  const openAddModal = () => {
    setEditingGoal(null);
    setFormData({
      name: '',
      targetAmount: '',
      initialAmount: '0',
      initialCurrency: 'INR',
      startDate: new Date().toISOString().split('T')[0],
      targetDate: ''
    });
    setIsGoalModalOpen(true);
  };

  const openEditModal = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      targetAmount: goal.targetAmount?.toString() || '',
      initialAmount: goal.initialAmount?.toString() || '',
      initialCurrency: goal.initialCurrency || 'INR',
      startDate: goal.startDate,
      targetDate: goal.targetDate
    });
    setIsGoalModalOpen(true);
  };

  const handleGoalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newGoal: SavingsGoal = {
      id: editingGoal ? editingGoal.id : Math.random().toString(36).substr(2, 9),
      name: formData.name,
      targetAmount: parseFloat(formData.targetAmount),
      initialAmount: parseFloat(formData.initialAmount),
      initialCurrency: formData.initialCurrency,
      startDate: formData.startDate,
      targetDate: formData.targetDate,
      contributions: editingGoal ? editingGoal.contributions : []
    };

    if (editingGoal) {
      setGoals(goals.map(g => g.id === editingGoal.id ? newGoal : g));
    } else {
      setGoals([...goals, newGoal]);
    }
    setIsGoalModalOpen(false);
  };

  const recordContribution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetGoalId || !contributionAmount) return;

    const newContrib: Contribution = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      amount: parseFloat(contributionAmount),
      currency: contributionCurrency
    };

    setGoals(goals.map(g => 
      g.id === targetGoalId 
        ? { ...g, contributions: [newContrib, ...g.contributions] } 
        : g
    ));

    setIsContributionModalOpen(false);
    setContributionAmount('');
    setTargetGoalId(null);
  };

  const deleteContribution = (goalId: string, contribId: string) => {
    setGoals(goals.map(g => 
      g.id === goalId 
        ? { ...g, contributions: g.contributions.filter(c => c.id !== contribId) } 
        : g
    ));
  };

  const deleteGoal = (id: string) => {
    setGoals(goals.filter(g => g.id !== id));
    setIsGoalModalOpen(false);
    setEditingGoal(null);
  };

  const calculateTrajectoryMetrics = (goal: SavingsGoal) => {
    const exchangeRate = getExchangeRate();
    const totalContributed = (goal.contributions || []).reduce((sum, c) => sum + convertToINR(c.amount, c.currency, exchangeRate), 0);
    
    // Convert initial amount dynamically
    const initialInINR = convertToINR(goal.initialAmount, goal.initialCurrency || 'INR', exchangeRate);
    const currentTotal = initialInINR + totalContributed;
    
    const progress = Math.min(100, (currentTotal / goal.targetAmount) * 100);
    const remaining = Math.max(0, goal.targetAmount - currentTotal);
    
    const now = new Date();
    const start = new Date(goal.startDate);
    const end = new Date(goal.targetDate);
    
    const totalDurationMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    const monthsElapsed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    const monthsRemaining = Math.max(1, totalDurationMonths - monthsElapsed);
    
    // Expected savings based on total goal (including initial amount) but distributed over time.
    const savingsToGain = goal.targetAmount - initialInINR;
    const expectedCompoundedSavings = (savingsToGain / Math.max(1, totalDurationMonths)) * monthsElapsed;
    const expectedActual = initialInINR + expectedCompoundedSavings;
    
    const status = currentTotal >= expectedActual ? 'Ahead' : 'Behind';
    const requiredMonthly = remaining / monthsRemaining;

    return { 
        progress, 
        currentTotal, 
        remaining, 
        requiredMonthly, 
        status, 
        monthsRemaining,
        recentContributions: (goal.contributions || []).slice(0, 3) 
    };
  };

  if (!isLoaded) return null;

  return (
    <div className="flex flex-col gap-6 md:gap-8 w-full transition-all duration-700 animate-in fade-in slide-in-from-bottom-8">
      <div className="flex flex-row items-center justify-between gap-4 px-1 md:px-2">
        <h2 className="text-lg md:text-2xl font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
            Savings Targets
        </h2>
        <button 
          onClick={openAddModal}
          className="bg-blue-600 text-white uppercase tracking-widest text-[10px] sm:text-xs px-5 sm:px-8 py-2.5 sm:py-4 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-blue-200/50 dark:shadow-none font-bold"
        >
          New Goal
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {goals.map(goal => {
          const { progress, currentTotal, remaining, requiredMonthly, status, recentContributions } = calculateTrajectoryMetrics(goal);
          
          return (
            <div key={goal.id} className="bg-blue-50/20 dark:bg-blue-500/5 border border-blue-100/50 dark:border-blue-900/30 rounded-[32px] p-5 md:p-8 flex flex-col gap-5 md:gap-6 group hover:shadow-xl transition-all relative overflow-hidden">
              {/* Header */}
              <div className="flex justify-between items-start gap-4">
                <div className="flex flex-col gap-1.5 flex-1">
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-xl md:text-2xl text-zinc-900 dark:text-zinc-100 capitalize tracking-tighter">
                            {goal.name}
                        </h3>
                        <div className={`hidden sm:block text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full border font-bold ${
                            status === 'Ahead' 
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-900/30" 
                                : "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-900/30"
                        }`}>
                            {status === 'Ahead' ? 'On Schedule' : 'Behind'}
                        </div>
                    </div>
                    {/* Collapsed View Metric snippet for mobile */}
                    <div className={`sm:hidden flex items-center justify-between ${expandedGoals[goal.id] ? 'hidden' : 'flex'}`}>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-blue-600 dark:text-blue-400 font-bold text-lg">{progress.toFixed(0)}%</span>
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-medium">₹{(currentTotal || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <span className={`text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full ${status === 'Ahead' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                            {status}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEditModal(goal)} className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button 
                    onClick={() => toggleExpand(goal.id)}
                    className="sm:hidden p-2 text-zinc-400 hover:text-zinc-900 transition-all"
                  >
                    <svg 
                        className={`w-6 h-6 transition-transform duration-300 ${expandedGoals[goal.id] ? 'rotate-180' : ''}`} 
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Progress & Quick Add */}
              <div className={`flex flex-col gap-6 md:gap-10 sm:flex ${expandedGoals[goal.id] ? 'flex' : 'hidden'} animate-in slide-in-from-top-4 duration-300`}>
                <div className="flex flex-col gap-4 md:gap-6">
                    <div className="flex flex-col gap-2 md:gap-3">
                        <div className="flex justify-between items-end">
                            <span className="text-2xl md:text-3xl text-zinc-900 dark:text-zinc-100 tracking-tighter font-bold">
                                {progress.toFixed(0)}<span className="text-lg text-zinc-500 dark:text-zinc-400 ml-1 font-medium">%</span>
                            </span>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] md:text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-0.5 text-right font-medium">
                                    ₹{(currentTotal || 0).toLocaleString('en-IN')} / ₹{(goal.targetAmount || 0).toLocaleString('en-IN')}
                                </span>
                                <span className="text-[9px] text-zinc-400 dark:text-zinc-500 lowercase tracking-tight font-medium">
                                    (CAD ${(convertToCAD(currentTotal || 0)).toLocaleString('en-US', { maximumFractionDigits: 0 })} / ${(convertToCAD(goal.targetAmount || 0)).toLocaleString('en-US', { maximumFractionDigits: 0 })})
                                </span>
                            </div>
                        </div>
                        <div className="h-1.5 md:h-3 w-full bg-zinc-50 dark:bg-zinc-800/50 rounded-full overflow-hidden border border-zinc-100 dark:border-zinc-800/50">
                            <div 
                                className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.15em] font-medium mt-1">
                            ₹{(remaining || 0).toLocaleString('en-IN')} Remaining
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[9px] md:text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-bold">Start</span>
                            <span className="text-xs md:text-sm text-zinc-900 dark:text-zinc-100 opacity-80 font-medium">
                                {new Date(goal.startDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                            </span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[9px] md:text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-bold">Target</span>
                            <span className="text-xs md:text-sm text-zinc-900 dark:text-zinc-100 font-medium">
                                {new Date(goal.targetDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                            </span>
                        </div>
                        <div className="flex flex-col gap-0.5 col-span-2">
                            <span className="text-[9px] md:text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-widest leading-tight font-bold">Required Contribution</span>
                            <span className="text-sm md:text-base text-blue-500 font-bold tracking-tight">
                                ₹{(Math.ceil(requiredMonthly) || 0).toLocaleString('en-IN')}/mo
                                <span className="text-[9px] ml-1 opacity-70 font-medium">(CAD ${convertToCAD(requiredMonthly || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })})</span>
                            </span>
                        </div>
                    </div>

                        <button 
                            onClick={() => {
                                setTargetGoalId(goal.id);
                                setIsContributionModalOpen(true);
                            }}
                            className="w-full bg-blue-600 text-white uppercase tracking-widest text-[10px] sm:text-xs px-6 py-3.5 md:py-4 rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-blue-200/50 dark:shadow-none flex items-center justify-center gap-2 font-bold"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            fuel goal
                        </button>
                </div>

                {/* Contribution History */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-600 dark:text-zinc-400 uppercase tracking-widest font-bold">Activity</span>
                        {(goal.contributions || []).length > 0 && (
                             <button 
                                onClick={() => {
                                    setHistoryGoalId(goal.id);
                                    setIsHistoryModalOpen(true);
                                }}
                                className="text-[10px] text-zinc-900 dark:text-zinc-100 uppercase tracking-widest hover:underline font-bold"
                             >
                                 View All
                             </button>
                        )}
                    </div>
                    
                    <div className="flex flex-col gap-2">
                        {(recentContributions || []).length > 0 ? recentContributions.map(c => (
                            <div key={c.id} className="flex justify-between items-center p-3 bg-zinc-50 dark:bg-zinc-800/30 rounded-2xl border border-zinc-100 dark:border-zinc-800/50">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                        {c.currency === 'CAD' ? `C$${(c.amount || 0).toLocaleString('en-IN')}` : `₹${(c.amount || 0).toLocaleString('en-IN')}`}
                                    </span>
                                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">{new Date(c.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                                </div>
                                <div className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded uppercase text-[8px] text-zinc-500 font-bold tracking-widest">Added</div>
                            </div>
                        )) : (
                            <div className="flex flex-col items-center justify-center py-6 bg-zinc-50 dark:bg-zinc-800/10 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800/50">
                                <span className="text-[10px] text-zinc-500 dark:text-zinc-600 uppercase tracking-widest font-bold">Empty</span>
                            </div>
                        )}
                    </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isGoalModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 animate-in zoom-in duration-300">
            <div className="p-8 md:p-10">
              <div className="flex justify-between items-center mb-8 md:mb-10">
                <h3 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white uppercase tracking-tighter">
                  {editingGoal ? 'Edit Goal' : 'New Target'}
                </h3>
                <button onClick={() => setIsGoalModalOpen(false)} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <form onSubmit={handleGoalSubmit} className="space-y-6">
                <div className="flex flex-col gap-2">
                    <label className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] ml-2">Goal Name</label>
                    <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-4 text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all text-xl" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs text-zinc-600 uppercase tracking-[0.2em] ml-2">Target Amount (₹)</label>
                        <input required type="number" value={formData.targetAmount} onChange={e => setFormData({...formData, targetAmount: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-4 text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all" />
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
                                required type="number" value={formData.initialAmount} 
                                onChange={e => setFormData({...formData, initialAmount: e.target.value})} 
                                placeholder="0"
                                className="w-full min-w-0 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl pl-24 pr-6 py-4 text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all" 
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs text-zinc-600 uppercase tracking-[0.2em] ml-2">Start Date</label>
                        <input required type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-4 text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs text-zinc-600 uppercase tracking-[0.2em] ml-2">Target Date</label>
                        <input required type="date" value={formData.targetDate} onChange={e => setFormData({...formData, targetDate: e.target.value})} className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-4 text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all" />
                    </div>
                </div>

                <div className="flex gap-4 pt-6">
                  {editingGoal && (
                    <button type="button" onClick={() => deleteGoal(editingGoal.id)} className="px-5 py-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 text-[10px] uppercase tracking-widest font-bold hover:bg-rose-100 transition-all">
                        Delete
                    </button>
                  )}
                  <button type="button" onClick={() => setIsGoalModalOpen(false)} className="flex-1 px-6 py-4 md:py-5 rounded-2xl md:rounded-3xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 transition-all font-bold">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 px-6 py-4 md:py-5 rounded-2xl md:rounded-3xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black hover:scale-105 transition-all uppercase tracking-widest text-[10px] sm:text-xs font-bold">
                    {editingGoal ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isContributionModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-[32px] w-full max-w-sm shadow-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 animate-in zoom-in duration-300">
            <div className="p-8 md:p-10">
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-white uppercase tracking-tighter mb-8 text-center">Fuel the Target</h3>
              <form onSubmit={recordContribution} className="space-y-6">
                <div className="flex flex-col gap-4">
                    <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl mb-2">
                        <button 
                            type="button" 
                            onClick={() => setContributionCurrency('INR')}
                            className={`flex-1 py-3 text-[10px] uppercase tracking-widest rounded-xl transition-all font-bold ${contributionCurrency === 'INR' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500'}`}
                        >
                            ₹ INR
                        </button>
                        <button 
                            type="button" 
                            onClick={() => setContributionCurrency('CAD')}
                            className={`flex-1 py-3 text-[10px] uppercase tracking-widest rounded-xl transition-all font-bold ${contributionCurrency === 'CAD' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500'}`}
                        >
                            C$ CAD
                        </button>
                    </div>
                    <input 
                        required autoFocus type="number" step="0.01" value={contributionAmount} onChange={e => setContributionAmount(e.target.value)} placeholder="0.00"
                        className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-6 text-center text-3xl text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all font-bold"
                    />
                </div>
                <button type="submit" className="w-full px-8 py-5 rounded-3xl bg-blue-600 text-white hover:scale-105 transition-all uppercase tracking-widest text-[10px] sm:text-xs font-bold shadow-xl shadow-blue-200/50 dark:shadow-none">
                    Log fuel
                </button>
                <button type="button" onClick={() => setIsContributionModalOpen(false)} className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-400 uppercase tracking-widest font-medium">
                    Nevermind
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {isHistoryModalOpen && historyGoalId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 animate-in zoom-in duration-300 max-h-[80vh] flex flex-col">
            <div className="p-8 md:p-10 flex flex-col h-full overflow-hidden">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white uppercase tracking-tighter">Fuel History</h3>
                <button onClick={() => setIsHistoryModalOpen(false)} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

               <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {(() => {
                  const goal = goals.find(g => g.id === historyGoalId);
                  if (!goal) return null;
                  return (
                    <div className="flex flex-col gap-3">
                      {(goal.contributions || []).map(c => (
                        <div key={c.id} className="flex justify-between items-center p-5 bg-zinc-50 dark:bg-zinc-800/30 rounded-3xl border border-zinc-100 dark:border-zinc-800/50 group">
                          <div className="flex flex-col">
                            <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                                {c.currency === 'CAD' ? `C$${c.amount.toLocaleString('en-IN')}` : `₹${c.amount.toLocaleString('en-IN')}`}
                            </span>
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-medium">{new Date(c.date).toLocaleDateString('en-IN', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                          <button onClick={() => deleteContribution(historyGoalId, c.id)} className="p-2 text-zinc-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      ))}
                      {goal.initialAmount > 0 && (
                          <div className="flex justify-between items-center p-5 bg-blue-50/20 dark:bg-blue-500/5 rounded-3xl border border-blue-100/50 dark:border-blue-900/30">
                            <div className="flex flex-col">
                                <span className="text-lg font-bold text-blue-600 dark:text-blue-400 tracking-tight">
                                    {goal.initialCurrency === 'CAD' ? `C$${goal.initialAmount.toLocaleString('en-IN')}` : `₹${goal.initialAmount.toLocaleString('en-IN')}`}
                                </span>
                                <span className="text-[10px] text-blue-500/50 uppercase tracking-widest font-bold">Starting Balance</span>
                            </div>
                            <div className="text-[10px] text-blue-500/40 uppercase tracking-widest px-3 py-1 bg-blue-50/50 dark:bg-blue-500/10 rounded-xl font-bold">Init</div>
                          </div>
                      )}
                    </div>
                  );
                })()}
              </div>
              <button 
                onClick={() => setIsHistoryModalOpen(false)}
                className="w-full mt-6 py-4 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black uppercase tracking-widest text-xs rounded-2xl font-bold transition-all active:scale-95"
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
