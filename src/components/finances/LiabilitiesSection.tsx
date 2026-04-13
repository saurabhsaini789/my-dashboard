"use client";

import React, { useState, useEffect, useRef } from 'react';
import { getPrefixedKey } from '@/lib/keys';
import { setSyncedItem } from '@/lib/storage';
import { Modal } from '../ui/Modal';
import { DynamicForm } from '../ui/DynamicForm';
import { calculateLiabilityBalance, type Liability, type PaymentLog } from '@/lib/finances';
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
  const [expandedLiabilities, setExpandedLiabilities] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedLiabilities(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Repayment modal state
  const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);
  const [activeLiabilityId, setActiveLiabilityId] = useState<string | null>(null);
  const [repayAmount, setRepayAmount] = useState('');
  
  const [repayType, setRepayType] = useState<'Regular EMI' | 'Prepayment'>('Regular EMI');

  // Prepayment Simulation state
  const [isSimModalOpen, setIsSimModalOpen] = useState(false);
  const [simExtraPayment, setSimExtraPayment] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'Personal Loan' as LiabilityType,
    totalAmount: '',
    
    remainingBalance: '',
    
    interestRate: '',
    emi: '',
    
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

    const handleLocal = (e: any) => {
      if (e.detail && e.detail.key === SYNC_KEYS.FINANCES_LIABILITIES) {
        const val = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_LIABILITIES));
        if (val && val !== JSON.stringify(liabilitiesRef.current)) {
          try { setLiabilities(JSON.parse(val)); } catch (e) {}
        }
      }
    };
    window.addEventListener('local-storage-change', handleLocal);
    setIsLoaded(true);
    return () => window.removeEventListener('local-storage-change', handleLocal);
  }, []);





  const openAddModal = () => {
    setEditingLiability(null);
    setFormData({
      name: '',
      type: 'Personal Loan',
      totalAmount: '',
      
      remainingBalance: '',
      
      interestRate: '',
      emi: '',
      
      tenureRemaining: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (liability: Liability) => {
    setEditingLiability(liability);
    setFormData({
      name: liability.name,
      type: liability.type as LiabilityType,
      totalAmount: liability.totalAmount?.toString() || '',
      
      remainingBalance: liability.remainingBalance?.toString() || '',
      
      interestRate: liability.interestRate?.toString() || '',
      emi: liability.emi?.toString() || '',
      
      tenureRemaining: liability.tenureRemaining?.toString() || ''
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
      
      remainingBalance: parseFloat(formData.remainingBalance),
      
      interestRate: parseFloat(formData.interestRate),
      emi: parseFloat(formData.emi),
      
      tenureRemaining: parseInt(formData.tenureRemaining),
      paymentLogs: editingLiability ? editingLiability.paymentLogs : [],
      lastUpdated: new Date().toISOString().split('T')[0]
    };

    if (editingLiability) {
      const updated = liabilities.map(l => l.id === editingLiability.id ? newLiability : l);
      setLiabilities(updated);
      setSyncedItem(SYNC_KEYS.FINANCES_LIABILITIES, JSON.stringify(updated));
    } else {
      const updated = [...liabilities, newLiability];
      setLiabilities(updated);
      setSyncedItem(SYNC_KEYS.FINANCES_LIABILITIES, JSON.stringify(updated));
    }
    setIsModalOpen(false);
  };


  const deleteLiability = (id: string) => {
    const updated = liabilities.filter(l => l.id !== id);
    setLiabilities(updated);
    setSyncedItem(SYNC_KEYS.FINANCES_LIABILITIES, JSON.stringify(updated));
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
      
      type: repayType
    };

    const updated = liabilities.map(l => {
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
    });
    setLiabilities(updated);
    setSyncedItem(SYNC_KEYS.FINANCES_LIABILITIES, JSON.stringify(updated));
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
  const totalEMI = liabilities.reduce((sum, l) => sum + l.emi, 0);
  const dti = monthlyIncome > 0 ? (totalEMI / monthlyIncome) * 100 : 0;

  if (!isLoaded) return null;

  return (
    <div className="flex flex-col gap-6 md:gap-8 w-full animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* Heading & Top Summary Metrics */}
      <div className="flex flex-col gap-4 md:gap-6 px-1 md:px-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-lg md:text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            Liabilities
          </h2>
          <button 
            onClick={openAddModal}
            className="bg-rose-600 text-white tracking-widest text-[10px] md:text-xs px-5 md:px-6 py-2.5 md:py-3 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg md:h-[46px] w-fit"
          >
            Add Liability
          </button>
        </div>

        {/* Global Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
            <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-100/50 dark:border-rose-900/30 rounded-[32px] p-5 md:p-6 flex flex-col gap-1 hover:shadow-xl transition-all group overflow-hidden relative">
                <span className="text-[10px] text-zinc-500 dark:text-zinc-300 font-medium uppercase tracking-[0.2em]">Total Debt</span>
                <div className="flex flex-col">
                  <span className="text-xl md:text-2xl text-zinc-900 dark:text-zinc-100 tracking-tighter font-bold">
                      ${totalDebt.toLocaleString("en-CA", { maximumFractionDigits: 0 })}
                  </span>
                  
                </div>
            </div>

            <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-100/50 dark:border-rose-900/30 rounded-[32px] p-5 md:p-6 flex flex-col gap-1 hover:shadow-xl transition-all group overflow-hidden relative">
                <span className="text-[10px] text-zinc-500 dark:text-zinc-300 font-medium uppercase tracking-[0.2em]">EMI Burden</span>
                <div className="flex flex-col">
                  <span className="text-xl md:text-2xl text-zinc-900 dark:text-zinc-100 tracking-tighter font-bold">
                      ${totalEMI.toLocaleString("en-CA", { maximumFractionDigits: 0 })}
                  </span>
                  
                </div>
            </div>

            <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-100/50 dark:border-rose-900/30 rounded-[32px] p-5 md:p-6 flex flex-col gap-1 hover:shadow-xl transition-all group overflow-hidden relative col-span-2 lg:col-span-1">
                <span className="text-[10px] text-zinc-500 dark:text-zinc-300 font-medium uppercase tracking-[0.2em]">DTI Ratio</span>
                <div className="flex items-baseline gap-2">
                    <span className={`text-xl md:text-2xl tracking-tighter font-bold ${dti > 40 ? 'text-rose-500' : dti > 25 ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {dti.toFixed(1)}%
                    </span>
                    <span className={`text-[10px] uppercase tracking-widest font-bold ${dti > 40 ? 'text-rose-500' : dti > 25 ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {dti > 40 ? 'Critical' : dti > 25 ? 'Moderate' : 'Healthy'}
                    </span>
                </div>
            </div>
        </div>
      </div>

      {/* Liabilities Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 px-1 md:px-2">
        {liabilities.map(liability => {
          const payoffProgress = ((liability.totalAmount - liability.remainingBalance) / liability.totalAmount) * 100;
          const isHighInterest = liability.interestRate >= 10;
          
          return (
              <div 
                key={liability.id} 
                className="bg-rose-50 dark:bg-rose-500/10 border border-rose-100/50 dark:border-rose-900/30 rounded-[32px] p-5 md:p-6 flex flex-col gap-5 group hover:shadow-lg transition-all relative overflow-hidden"
              >
              {/* Card Header */}
              <div className="flex justify-between items-start gap-4">
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full border border-rose-100/50 bg-rose-50/50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-900/30 w-fit leading-none whitespace-nowrap font-bold">
                        {liability.type}
                    </span>
                    {isHighInterest && (
                        <span className="bg-rose-500 text-white text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded-full animate-pulse leading-none whitespace-nowrap">
                            High interest
                        </span>
                    )}
                  </div>
                  <h3 className="text-base md:text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
                    {liability.name}
                  </h3>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    <button 
                        onClick={() => openEditModal(liability)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                        title="Edit Liability"
                    >
                        <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button 
                        onClick={() => toggleExpand(liability.id)}
                        className="sm:hidden p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all"
                    >
                        <svg 
                            className={`w-5 h-5 transition-transform duration-300 ${expandedLiabilities[liability.id] ? 'rotate-180' : ''}`} 
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {/* Progress Bar (Always visible for better hierarchy) */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[10px] text-zinc-600 dark:text-zinc-300 uppercase tracking-widest font-bold">
                      <span>Payoff progress</span>
                      <span>{payoffProgress.toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                          className={`h-full transition-all duration-1000 bg-rose-500`} 
                          style={{ width: `${payoffProgress}%` }}
                      />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-300 uppercase tracking-widest font-medium">Outstanding Bal</span>
                        <span className="text-lg md:text-xl text-zinc-900 dark:text-zinc-100 tracking-tighter font-bold">
                            ${calculateLiabilityBalance(liability).toLocaleString("en-CA", { maximumFractionDigits: 0 })}
                        </span>
                        
                    </div>
                </div>
              </div>

              <div className={`sm:flex flex-col gap-5 w-full ${expandedLiabilities[liability.id] ? 'flex' : 'hidden'}`}>
                {/* Progress Bar */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-xs text-zinc-600 dark:text-zinc-300 uppercase tracking-widest">
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
                         <span className="text-xs text-zinc-600 dark:text-zinc-300 uppercase tracking-widest">Remaining</span>
                        <span className="text-lg text-zinc-900 dark:text-zinc-100 tracking-tight">
                            ${calculateLiabilityBalance(liability).toLocaleString("en-CA", { maximumFractionDigits: 0 })}
                        </span>
                    </div>
                    <div className="flex flex-col gap-0.5 text-right">
                         <span className="text-xs text-zinc-600 dark:text-zinc-300 uppercase tracking-widest">Interest Rate</span>
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
                       <span className="text-xs text-zinc-500 dark:text-zinc-300 uppercase tracking-widest">Tenure Left</span>
                       <span className="text-xs text-zinc-600 dark:text-zinc-300">
                           {liability.tenureRemaining} Months
                       </span>
                     </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Schema-Driven Add/Edit Liability Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingLiability ? 'Modify liability' : 'New liability'}
        onSubmit={handleSubmit}
        submitText={editingLiability ? 'Update' : 'Save'}
        accentColor="rose"
      >
        <DynamicForm
          sections={[
            {
              id: 'basic',
              title: 'Liability profile',
              fields: [
                { name: 'name', label: 'Liability Name', type: 'text', required: true, fullWidth: true, placeholder: 'e.g. Home Mortgage...' },
                { 
                  name: 'type', 
                  label: 'Loan Type', 
                  type: 'select', 
                  options: LIABILITY_TYPES.map(t => ({ label: t, value: t }))
                },
                { name: 'totalAmount', label: 'Total Amount', type: 'number', required: true, step: "0.01", placeholder: "0.00" },
                { name: 'remainingBalance', label: 'Remaining Balance', type: 'number', required: true, step: "0.01", placeholder: "0.00" },
                { name: 'interestRate', label: 'Interest Rate (%)', type: 'number', required: true, step: "0.01", placeholder: "0.00" },
                { name: 'emi', label: 'Monthly EMI', type: 'number', required: true, step: "0.01", placeholder: "0.00" },
                { name: 'tenureRemaining', label: 'Remaining Tenure (Months)', type: 'number', required: true, placeholder: "0" }
              ]
            }
          ]}
          formData={formData}
          accentColor="rose"
          onChange={(name, value) => setFormData(prev => ({ ...prev, [name]: value }))}
        />
        {editingLiability && (
          <div className="mt-4 flex justify-start w-full">
            <button 
              type="button" 
              onClick={() => deleteLiability(editingLiability.id)} 
              className="text-red-500 text-sm font-medium hover:text-red-600 transition-colors"
            >
              Delete Liability
            </button>
          </div>
        )}
      </Modal>

      {/* Schema-Driven Repay Modal */}
      <Modal
        isOpen={isRepayModalOpen}
        onClose={() => setIsRepayModalOpen(false)}
        title="Log payment"
        onSubmit={handleRepaySubmit}
        submitText="Log Payment"
      >
        <DynamicForm
          sections={[
            {
              id: 'repay',
              title: 'Payment details',
              fields: [
                {
                  name: 'repayType',
                  label: 'Payment Type',
                  fullWidth: true,
                  render: ({ name, value, onChange }) => (
                    <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl mb-2">
                        <button 
                            type="button" 
                            onClick={() => onChange(name, 'Regular EMI')}
                            className={`flex-1 py-2 text-[10px] uppercase tracking-widest rounded-lg transition-all ${value === 'Regular EMI' ? 'bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-600'}`}
                        >
                            Regular EMI
                        </button>
                        <button 
                            type="button" 
                            onClick={() => onChange(name, 'Prepayment')}
                            className={`flex-1 py-2 text-[10px] uppercase tracking-widest rounded-lg transition-all ${value === 'Prepayment' ? 'bg-rose-500 text-white shadow-lg shadow-rose-200 dark:shadow-none' : 'text-zinc-600'}`}
                        >
                            Prepayment
                        </button>
                    </div>
                  )
                },
                { name: 'amount', label: 'Amount', type: 'number', required: true, step: "0.01", placeholder: "0.00", fullWidth: true }
              ]
            }
          ]}
          formData={{ amount: repayAmount, repayType }}
          onChange={(name, value) => {
            if (name === 'amount') setRepayAmount(value);
            if (name === 'repayType') setRepayType(value);
          }}
        />
      </Modal>

      {/* Schema-Driven Simulation Modal */}
      <Modal
        isOpen={isSimModalOpen}
        onClose={() => setIsSimModalOpen(false)}
        title="Payoff impact"
        onSubmit={(e) => { e.preventDefault(); setIsSimModalOpen(false); }}
        submitText="Done"
      >
        <p className="text-[10px] text-zinc-500 text-center uppercase tracking-widest mb-6 font-medium">
          Visualize how much time and interest you save with an extra payment.
        </p>
        <DynamicForm
          sections={[
            {
              id: 'sim',
              title: 'Simulation',
              fields: [
                { name: 'extra', label: 'Extra One-Time Payment ($)', type: 'number', step: "100", placeholder: "e.g. 5000", fullWidth: true }
              ]
            }
          ]}
          formData={{ extra: simExtraPayment }}
          onChange={(_, value) => setSimExtraPayment(value)}
        />
        {simExtraPayment && activeLiabilityId && (
            <div className="mt-6 grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-3xl p-6 flex flex-col gap-1 items-center text-center">
                    <span className="text-xs text-zinc-600 dark:text-zinc-300 uppercase tracking-widest">Interest Saved</span>
                    <span className="text-2xl text-indigo-700 dark:text-indigo-300 tracking-tighter">
                        {calculateSim(liabilities.find(l => l.id === activeLiabilityId)!, parseFloat(simExtraPayment)).monthsSaved} Months
                    </span>
                </div>
            </div>
        )}
      </Modal>
    </div>
  );
}
