"use client";

import React, { useState, useEffect, useRef } from 'react';
import { getPrefixedKey } from '@/lib/keys';
import { setSyncedItem } from '@/lib/storage';
import { getExchangeRate, calculateLiabilityBalance, type Liability, type PaymentLog, convertToCAD } from '@/lib/finances';
import { SYNC_KEYS } from '@/lib/sync-keys';

export type LiabilityType = 'Home Loan' | 'Car Loan' | 'Personal Loan' | 'Credit Card' | 'Education Loan' | 'Business Loan' | 'Other';

const LIABILITY_TYPES: LiabilityType[] = [
  'Home Loan', 'Car Loan', 'Personal Loan', 'Credit Card', 'Education Loan', 'Business Loan', 'Other'
];

export function LiabilitiesSection() {
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLiability, setEditingLiability] = useState<Liability | null>(null);

  // Repayment modal state
  const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);
  const [activeLiabilityId, setActiveLiabilityId] = useState<string | null>(null);
  const [repayAmount, setRepayAmount] = useState('');
  const [repayCurrency, setRepayCurrency] = useState<'INR' | 'CAD'>('INR');
  const [repayType, setRepayType] = useState<'Regular EMI' | 'Prepayment'>('Regular EMI');

  // Prepayment Simulation state
  const [isSimModalOpen, setIsSimModalOpen] = useState(false);
  const [simExtraPayment, setSimExtraPayment] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'Personal Loan' as LiabilityType,
    totalAmount: '',
    totalAmountCurrency: 'INR' as 'INR' | 'CAD',
    remainingBalance: '',
    remainingBalanceCurrency: 'INR' as 'INR' | 'CAD',
    interestRate: '',
    emi: '',
    emiCurrency: 'INR' as 'INR' | 'CAD',
    tenureRemaining: ''
  });

  const liabilitiesRef = useRef(liabilities);
  useEffect(() => {
    liabilitiesRef.current = liabilities;
  }, [liabilities]);

  useEffect(() => {
    // Load Liabilities
    const savedLiabilities = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_LIABILITIES));
    if (savedLiabilities) {
      try {
        setLiabilities(JSON.parse(savedLiabilities));
      } catch (e) {
        console.error("Failed to parse liabilities data", e);
      }
    } else {
      const mock: Liability[] = [
        { 
          id: 'l1', name: 'Home Mortgage', type: 'Home Loan', totalAmount: 350000, remainingBalance: 285000, 
          interestRate: 4.5, emi: 1800, tenureRemaining: 240, paymentLogs: [], lastUpdated: new Date().toISOString().split('T')[0] 
        },
        { 
          id: 'l2', name: 'Tesla Model 3', type: 'Car Loan', totalAmount: 45000, remainingBalance: 12500, 
          interestRate: 2.9, emi: 650, tenureRemaining: 22, paymentLogs: [], lastUpdated: new Date().toISOString().split('T')[0] 
        },
        { 
          id: 'l3', name: 'Amex Platinum', type: 'Credit Card', totalAmount: 5000, remainingBalance: 4200, 
          interestRate: 18.9, emi: 250, tenureRemaining: 18, paymentLogs: [], lastUpdated: new Date().toISOString().split('T')[0] 
        },
      ];
      setLiabilities(mock);
    }

    // Load Income for DTI calculation
    const savedIncome = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_INCOME));
    if (savedIncome) {
      try {
        const records = JSON.parse(savedIncome);
        // Calculate average monthly income (simple sum for current month for now)
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlyTotal = (records || [])
          .filter((r: any) => {
            const d = new Date(r.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
          })
          .reduce((sum: number, r: any) => sum + r.amount, 0);
        setMonthlyIncome(monthlyTotal || 5000); // Default fallback
      } catch (e) {}
    } else {
      setMonthlyIncome(6200); // Mock fallback
    }

    setIsLoaded(true);

    const handleLocal = (e: any) => {
      if (e.detail && e.detail.key === SYNC_KEYS.FINANCES_LIABILITIES) {
        const val = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_LIABILITIES));
        if (val && val !== JSON.stringify(liabilitiesRef.current)) {
          try { setLiabilities(JSON.parse(val)); } catch (e) {}
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
      setSyncedItem(SYNC_KEYS.FINANCES_LIABILITIES, JSON.stringify(liabilities));
    }
  }, [liabilities, isLoaded]);


  const openAddModal = () => {
    setEditingLiability(null);
    setFormData({
      name: '',
      type: 'Personal Loan',
      totalAmount: '',
      totalAmountCurrency: 'INR',
      remainingBalance: '',
      remainingBalanceCurrency: 'INR',
      interestRate: '',
      emi: '',
      emiCurrency: 'INR',
      tenureRemaining: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (liability: Liability) => {
    setEditingLiability(liability);
    setFormData({
      name: liability.name,
      type: liability.type as LiabilityType,
      totalAmount: liability.totalAmount.toString(),
      totalAmountCurrency: liability.totalAmountCurrency || 'INR',
      remainingBalance: liability.remainingBalance.toString(),
      remainingBalanceCurrency: liability.remainingBalanceCurrency || 'INR',
      interestRate: liability.interestRate.toString(),
      emi: liability.emi.toString(),
      emiCurrency: liability.emiCurrency || 'INR',
      tenureRemaining: liability.tenureRemaining.toString()
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newLiability: Liability = {
      id: editingLiability ? editingLiability.id : Math.random().toString(36).substr(2, 9),
      name: formData.name,
      type: formData.type,
      totalAmount: parseFloat(formData.totalAmount),
      totalAmountCurrency: formData.totalAmountCurrency,
      remainingBalance: parseFloat(formData.remainingBalance),
      remainingBalanceCurrency: formData.remainingBalanceCurrency,
      interestRate: parseFloat(formData.interestRate),
      emi: parseFloat(formData.emi),
      emiCurrency: formData.emiCurrency,
      tenureRemaining: parseInt(formData.tenureRemaining),
      paymentLogs: editingLiability ? editingLiability.paymentLogs : [],
      lastUpdated: new Date().toISOString().split('T')[0]
    };

    if (editingLiability) {
      setLiabilities(liabilities.map(l => l.id === editingLiability.id ? newLiability : l));
    } else {
      setLiabilities([...liabilities, newLiability]);
    }
    setIsModalOpen(false);
  };

  const deleteLiability = (id: string) => {
    setLiabilities(liabilities.filter(l => l.id !== id));
    setIsModalOpen(false);
  };

  const handleRepaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(repayAmount);
    if (isNaN(amount) || !activeLiabilityId) return;

    const newLog: PaymentLog = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      amount,
      currency: repayCurrency,
      type: repayType
    };

    setLiabilities(liabilities.map(l => {
      if (l.id === activeLiabilityId) {
        const newBalance = Math.max(0, l.remainingBalance - amount);
        return {
          ...l,
          remainingBalance: newBalance,
          paymentLogs: [newLog, ...l.paymentLogs],
          lastUpdated: new Date().toISOString().split('T')[0]
        };
      }
      return l;
    }));
    setIsRepayModalOpen(false);
    setRepayAmount('');
  };

  // Prepayment Simulation Logic
  const calculateSim = (liability: Liability, extra: number) => {
    const r = (liability.interestRate / 100) / 12; // Monthly interest rate
    const P = liability.remainingBalance - extra; // New principal after extra payment
    const EMI = liability.emi;

    if (P <= 0) return { monthsSaved: liability.tenureRemaining, interestSaved: liability.remainingBalance * r * liability.tenureRemaining }; // Simplified

    // Monthly repayment simulation to find Interest Saved & Reduced Tenure
    let currentBalance = liability.remainingBalance;
    let totalInterestOriginal = 0;
    let monthsOriginal = 0;
    while (currentBalance > 0 && monthsOriginal < 600) { // Limit to 50 years
      const interest = currentBalance * r;
      totalInterestOriginal += interest;
      currentBalance = currentBalance - (EMI - interest);
      monthsOriginal++;
    }

    currentBalance = liability.remainingBalance - extra;
    let totalInterestReduced = 0;
    let monthsReduced = 0;
    while (currentBalance > 0 && monthsReduced < 600) {
      const interest = currentBalance * r;
      totalInterestReduced += interest;
      currentBalance = currentBalance - (EMI - interest);
      monthsReduced++;
    }

    return {
      monthsSaved: Math.max(0, monthsOriginal - monthsReduced),
      interestSaved: Math.max(0, totalInterestOriginal - totalInterestReduced)
    };
  };

  const totalDebt = liabilities.reduce((sum, l) => sum + calculateLiabilityBalance(l), 0);
  const totalEMI = liabilities.reduce((sum, l) => sum + calculateLiabilityBalance({ ...l, remainingBalance: l.emi, remainingBalanceCurrency: l.emiCurrency || 'INR' } as any), 0);
  const dti = monthlyIncome > 0 ? (totalEMI / monthlyIncome) * 100 : 0;

  if (!isLoaded) return null;

  return (
    <div className="flex flex-col gap-8 w-full animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* Heading & Top Summary Metrics */}
      <div className="flex flex-col gap-6 px-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
            Liabilities
          </h2>
          <button 
            onClick={openAddModal}
            className="bg-rose-600 text-white uppercase tracking-widest text-xs px-6 py-3 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg h-[46px]"
          >
            Add Liability
          </button>
        </div>

        {/* Global Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-rose-50/20 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-900/30 rounded-3xl p-6 flex flex-col gap-1 hover:shadow-xl transition-all group overflow-hidden relative">
                <span className="text-xs text-zinc-600 dark:text-zinc-400 uppercase tracking-[0.2em]">Total Outstanding Debt</span>
                <span className="text-2xl text-zinc-900 dark:text-zinc-100 tracking-tight">
                    ₹{totalDebt.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    <span className="text-sm ml-2 text-zinc-500 font-medium">(CAD ${convertToCAD(totalDebt).toLocaleString('en-US', { maximumFractionDigits: 0 })})</span>
                </span>
                <div className="absolute -right-2 -bottom-2 opacity-5 scale-150 rotate-12 group-hover:rotate-0 transition-transform duration-500">
                    <svg className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
            </div>

            <div className="bg-rose-50/20 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-900/30 rounded-3xl p-6 flex flex-col gap-1 hover:shadow-xl transition-all group overflow-hidden relative">
                <span className="text-xs text-zinc-600 dark:text-zinc-400 uppercase tracking-[0.2em]">Monthly EMI Burden</span>
                <span className="text-2xl text-zinc-900 dark:text-zinc-100 tracking-tight">
                    ₹{totalEMI.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    <span className="text-sm ml-2 text-zinc-500 font-medium">(CAD ${convertToCAD(totalEMI).toLocaleString('en-US', { maximumFractionDigits: 0 })})</span>
                </span>
                <div className="absolute -right-2 -bottom-2 opacity-5 scale-150 rotate-12 group-hover:rotate-0 transition-transform duration-500 text-rose-500">
                    <svg className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
            </div>

            <div className="bg-rose-50/20 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-900/30 rounded-3xl p-6 flex flex-col gap-1 hover:shadow-xl transition-all group overflow-hidden relative">
                <span className="text-xs text-zinc-600 dark:text-zinc-400 uppercase tracking-[0.2em]">Debt-to-Income Ratio (DTI)</span>
                <div className="flex items-baseline gap-2">
                    <span className={`text-2xl tracking-tight ${dti > 40 ? 'text-rose-500' : dti > 25 ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {dti.toFixed(1)}%
                    </span>
                    <span className={`text-xs uppercase tracking-widest ${dti > 40 ? 'text-rose-500' : dti > 25 ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {dti > 40 ? 'Critical' : dti > 25 ? 'Moderate' : 'Healthy'}
                    </span>
                </div>
                <div className="absolute -right-2 -bottom-2 opacity-5 scale-150 rotate-12 group-hover:rotate-0 transition-transform duration-500 text-rose-500">
                    <svg className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
                </div>
            </div>
        </div>
      </div>

      {/* Liabilities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 px-2">
        {liabilities.map(liability => {
          const payoffProgress = ((liability.totalAmount - liability.remainingBalance) / liability.totalAmount) * 100;
          const isHighInterest = liability.interestRate >= 10;
          
          return (
            <div 
              key={liability.id} 
              className="bg-rose-50/20 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-900/30 rounded-3xl p-6 flex flex-col gap-6 group hover:shadow-lg transition-all relative overflow-hidden"
            >
              {/* Card Header */}
              <div className="flex justify-between items-start gap-4">
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-widest px-1.5 py-0.5 rounded border border-rose-100 bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-900/30 w-fit">
                        {liability.type}
                    </span>
                    {isHighInterest && (
                        <span className="bg-rose-500 text-white text-xs uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-full animate-pulse">
                            High Interest
                        </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight leading-tight break-words">
                    {liability.name}
                  </h3>
                </div>
                <button 
                  onClick={() => openEditModal(liability)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
              </div>

              {/* Progress Bar */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-xs text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">
                    <span>Payoff Progress</span>
                    <span>{payoffProgress.toFixed(0)}%</span>
                </div>
                <div className="w-full h-2 bg-zinc-50 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                        className={`h-full transition-all duration-1000 bg-rose-500`} 
                        style={{ width: `${payoffProgress}%` }}
                    />
                </div>
              </div>

              {/* Loan Details */}
               <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-0.5">
                       <span className="text-xs text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">Remaining</span>
                      <span className="text-lg text-zinc-900 dark:text-zinc-100 tracking-tight">
                          ₹{calculateLiabilityBalance(liability).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          <span className="text-[10px] ml-1.5 text-zinc-500 font-medium">(CAD ${convertToCAD(calculateLiabilityBalance(liability)).toLocaleString('en-US', { maximumFractionDigits: 0 })})</span>
                      </span>
                  </div>
                  <div className="flex flex-col gap-0.5 text-right">
                       <span className="text-xs text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">Interest Rate</span>
                      <span className={`text-lg tracking-tight ${isHighInterest ? 'text-rose-500' : liability.interestRate < 5 ? 'text-emerald-500' : 'text-zinc-900 dark:text-zinc-100'}`}>
                          {liability.interestRate}%
                      </span>
                  </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => {
                        setActiveLiabilityId(liability.id);
                        setRepayType('Regular EMI');
                        setRepayAmount(liability.emi.toString());
                        setIsRepayModalOpen(true);
                    }}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800 text-xs uppercase tracking-widest hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
                  >
                    Repay
                  </button>
                   <button 
                    onClick={() => {
                        setActiveLiabilityId(liability.id);
                        setIsSimModalOpen(true);
                    }}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-rose-500/10 text-rose-600 dark:text-rose-400 text-xs uppercase tracking-widest hover:bg-rose-50 dark:hover:bg-rose-500/5 transition-all"
                  >
                    Preview Payoff
                  </button>
              </div>

              {/* Footer Meta */}
              <div className="flex flex-col gap-1.5 mt-auto border-t border-zinc-50 dark:border-zinc-800/50 pt-4">
                   <div className="flex items-center justify-between">
                     <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">Tenure Left</span>
                     <span className="text-xs text-zinc-600 dark:text-zinc-300">
                         {liability.tenureRemaining} Months
                     </span>
                   </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Liability Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-[40px] w-full max-w-xl shadow-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 animate-in zoom-in duration-300">
            <div className="p-10">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-3xl font-bold text-zinc-900 dark:text-white uppercase tracking-tighter">
                  {editingLiability ? 'Modify Liability' : 'New Liability'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-zinc-600 hover:text-zinc-900 dark:hover:text-white transition-colors">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex flex-col gap-2">
                    <label className="text-xs text-zinc-600 uppercase tracking-[0.2em] ml-2">Liability Name</label>
                    <input 
                      required type="text" value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                      placeholder="e.g. Home Mortgage..."
                      className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-4 text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all text-xl" 
                    />
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs text-zinc-600 uppercase tracking-[0.2em] ml-2">Loan Type</label>
                        <select 
                            value={formData.type} 
                            onChange={e => setFormData({...formData, type: e.target.value as LiabilityType})}
                            className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-4 text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all appearance-none cursor-pointer"
                        >
                            {LIABILITY_TYPES.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>
                     <div className="flex flex-col gap-2">
                        <label className="text-xs text-zinc-600 uppercase tracking-[0.2em] ml-2">Total Amount</label>
                        <div className="flex gap-2">
                            <select 
                                value={formData.totalAmountCurrency}
                                onChange={e => setFormData({...formData, totalAmountCurrency: e.target.value as 'INR' | 'CAD'})}
                                className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-4 py-4 text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all text-sm font-bold w-24"
                            >
                                <option value="INR">₹ INR</option>
                                <option value="CAD">C$ CAD</option>
                            </select>
                            <input 
                                required type="number" step="0.01" value={formData.totalAmount} 
                                onChange={e => setFormData({...formData, totalAmount: e.target.value})} 
                                placeholder="0.00"
                                className="flex-1 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-4 text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all" 
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs text-zinc-600 uppercase tracking-[0.2em] ml-2">Remaining Balance</label>
                        <div className="flex gap-2">
                            <select 
                                value={formData.remainingBalanceCurrency}
                                onChange={e => setFormData({...formData, remainingBalanceCurrency: e.target.value as 'INR' | 'CAD'})}
                                className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-4 py-4 text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all text-sm font-bold w-24"
                            >
                                <option value="INR">₹ INR</option>
                                <option value="CAD">C$ CAD</option>
                            </select>
                            <input 
                                required type="number" step="0.01" value={formData.remainingBalance} 
                                onChange={e => setFormData({...formData, remainingBalance: e.target.value})} 
                                placeholder="0.00"
                                className="flex-1 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-4 text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all" 
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs text-zinc-600 uppercase tracking-[0.2em] ml-2">Interest Rate (%)</label>
                        <input 
                            required type="number" step="0.01" value={formData.interestRate} 
                            onChange={e => setFormData({...formData, interestRate: e.target.value})} 
                            placeholder="0.00"
                            className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-4 text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all" 
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs text-zinc-600 uppercase tracking-[0.2em] ml-2">Monthly EMI</label>
                        <div className="flex gap-2">
                            <select 
                                value={formData.emiCurrency}
                                onChange={e => setFormData({...formData, emiCurrency: e.target.value as 'INR' | 'CAD'})}
                                className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-4 py-4 text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all text-sm font-bold w-24"
                            >
                                <option value="INR">₹ INR</option>
                                <option value="CAD">C$ CAD</option>
                            </select>
                            <input 
                                required type="number" step="0.01" value={formData.emi} 
                                onChange={e => setFormData({...formData, emi: e.target.value})} 
                                placeholder="0.00"
                                className="flex-1 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-4 text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all" 
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs text-zinc-600 uppercase tracking-[0.2em] ml-2">Remaining Tenure (Months)</label>
                        <input 
                            required type="number" value={formData.tenureRemaining} 
                            onChange={e => setFormData({...formData, tenureRemaining: e.target.value})} 
                            placeholder="0"
                            className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-4 text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all" 
                        />
                    </div>
                </div>

                <div className="flex gap-4 pt-6">
                  {editingLiability && (
                    <button type="button" onClick={() => deleteLiability(editingLiability.id)} className="px-6 py-4 rounded-2xl bg-rose-50 text-rose-500 text-xs uppercase hover:bg-rose-100 transition-all">
                        Delete
                    </button>
                  )}
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-8 py-5 rounded-3xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 hover:text-zinc-900 transition-all">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 px-8 py-5 rounded-3xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black hover:scale-105 transition-all uppercase tracking-widest text-xs">
                    {editingLiability ? 'Update Loan' : 'Save Loan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Repay Modal */}
      {isRepayModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-[40px] w-full max-w-sm shadow-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 animate-in zoom-in duration-300">
            <div className="p-10">
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-white uppercase tracking-tighter mb-8 text-center">Record Repayment</h3>
              <form onSubmit={handleRepaySubmit} className="space-y-6">
                <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl mb-4">
                    <button 
                        type="button" 
                        onClick={() => setRepayType('Regular EMI')}
                        className={`flex-1 py-2 text-[10px] uppercase tracking-widest rounded-lg transition-all ${repayType === 'Regular EMI' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-600'}`}
                    >
                        Regular EMI
                    </button>
                    <button 
                        type="button" 
                        onClick={() => setRepayType('Prepayment')}
                        className={`flex-1 py-2 text-[10px] uppercase tracking-widest rounded-lg transition-all ${repayType === 'Prepayment' ? 'bg-rose-500 text-white shadow-lg shadow-rose-200 dark:shadow-none' : 'text-zinc-600'}`}
                    >
                        Prepayment
                    </button>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-2xl mb-2">
                        <button 
                            type="button" 
                            onClick={() => setRepayCurrency('INR')}
                            className={`flex-1 py-3 text-[10px] uppercase tracking-widest rounded-xl transition-all ${repayCurrency === 'INR' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-600'}`}
                        >
                            ₹ INR
                        </button>
                        <button 
                            type="button" 
                            onClick={() => setRepayCurrency('CAD')}
                            className={`flex-1 py-3 text-[10px] uppercase tracking-widest rounded-xl transition-all ${repayCurrency === 'CAD' ? 'bg-rose-600 text-white shadow-lg' : 'text-zinc-600'}`}
                        >
                            C$ CAD
                        </button>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] text-center">Amount</label>
                        <input 
                            required autoFocus type="number" step="0.01" value={repayAmount} 
                            onChange={e => setRepayAmount(e.target.value)} 
                            placeholder="0.00"
                            className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-6 text-center text-3xl text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all font-bold"
                        />
                    </div>
                </div>
                <button type="submit" className="w-full px-8 py-5 rounded-3xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black hover:scale-105 transition-all uppercase tracking-widest text-xs">
                    Confirm Payment
                </button>
                <button type="button" onClick={() => setIsRepayModalOpen(false)} className="w-full py-2 text-[10px] text-zinc-600 hover:text-zinc-900 uppercase">
                    Cancel
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Simulation Modal */}
      {isSimModalOpen && activeLiabilityId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-900 rounded-[40px] w-full max-w-lg shadow-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 animate-in zoom-in duration-300">
            <div className="p-10">
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-white uppercase tracking-tighter mb-2 text-center">Prepayment Impact</h3>
              <p className="text-xs text-zinc-600 text-center uppercase tracking-widest mb-10">
                Visualize how much time and interest you save with an extra payment.
              </p>
              
              <div className="space-y-8">
                <div className="flex flex-col gap-2">
                    <label className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] text-center">Extra One-Time Payment (₹)</label>
                    <input 
                        autoFocus type="number" step="100" value={simExtraPayment} 
                        onChange={e => setSimExtraPayment(e.target.value)} 
                        placeholder="e.g. 5000"
                        className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-6 text-center text-3xl text-zinc-900 dark:text-white outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all"
                    />
                </div>

                {simExtraPayment && (
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-3xl p-6 flex flex-col gap-1 items-center text-center">
                            <span className="text-xs text-zinc-600 dark:text-zinc-400 uppercase tracking-widest">Interest Saved</span>
                            <span className="text-2xl text-indigo-700 dark:text-indigo-300 tracking-tighter">
                                {calculateSim(liabilities.find(l => l.id === activeLiabilityId)!, parseFloat(simExtraPayment)).monthsSaved} Months
                            </span>
                        </div>
                    </div>
                )}

                <button type="button" onClick={() => setIsSimModalOpen(false)} className="w-full px-8 py-5 rounded-3xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black hover:scale-105 transition-all uppercase tracking-widest text-xs">
                    Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
