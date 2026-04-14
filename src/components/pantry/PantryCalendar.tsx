"use client";

import React, { useState, useMemo } from 'react';
import { ExpenseRecord } from '@/types/finance';
import { PantryEntryModal } from './PantryEntryModal';
import { Modal } from '../ui/Modal';


interface PantryCalendarProps {
  records: ExpenseRecord[];
  onUpdateRecords: (records: ExpenseRecord[]) => void;
  viewingDate: Date;
  setViewingDate: (date: Date) => void;
}

export function PantryCalendar({ records, onUpdateRecords, viewingDate, setViewingDate }: PantryCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ExpenseRecord | null>(null);
  const [preferredTab, setPreferredTab] = useState<'list' | 'form' | undefined>(undefined);
  const [isMobilePopupOpen, setIsMobilePopupOpen] = useState(false);
  const [popupDateStr, setPopupDateStr] = useState<string | null>(null);

  const month = viewingDate.getMonth();
  const year = viewingDate.getFullYear();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  // Group records by date
  const recordsByDate = useMemo(() => {
    const grouped: Record<string, ExpenseRecord[]> = {};
    records.forEach(record => {
      const date = record.date;
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(record);
    });
    return grouped;
  }, [records]);

  // Daily totals
  const dailyTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    Object.entries(recordsByDate).forEach(([date, dateRecords]) => {
      totals[date] = dateRecords.reduce((sum, r) => sum + r.amount, 0);
    });
    return totals;
  }, [recordsByDate]);

  // Monthly total
  const monthlyTotal = useMemo(() => {
    return records
      .filter(r => {
        if (!r.date) return false;
        const [rYear, rMonth] = r.date.split('-');
        return parseInt(rMonth) - 1 === month && parseInt(rYear) === year;
      })
      .reduce((sum, r) => sum + r.amount, 0);
  }, [records, month, year]);

  const prevMonth = () => setViewingDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewingDate(new Date(year, month + 1, 1));

  const handleDateClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    
    // On mobile, show the lightweight details popup first
    if (window.innerWidth < 768) {
      setPopupDateStr(dateStr);
      setIsMobilePopupOpen(true);
    } else {
      // On desktop, directly open the entry modal
      setEditingRecord(null);
      setPreferredTab(undefined);
      setIsModalOpen(true);
    }
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Color indicators logic
  const getDayColor = (total: number) => {
    if (total === 0) return '';
    if (total < 500) return 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20';
    if (total < 2000) return 'bg-amber-50 border-amber-100 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/20';
    return 'bg-rose-50 border-rose-100 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/20';
  };

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Monthly Summary */}
      <div className="flex flex-row items-center justify-between px-4 md:px-10 py-6 md:py-10 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-900 dark:text-white shadow-sm relative overflow-hidden">
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest font-bold opacity-60">Monthly Spend</span>
          <span className="text-4xl md:text-5xl font-black tracking-tighter">
            ${monthlyTotal.toLocaleString('en-CA', { maximumFractionDigits: 0 })}
          </span>
        </div>
        
        <div className="flex items-center gap-3 md:gap-4">
          <button onClick={prevMonth} className="p-2 md:p-3 hover:bg-zinc-100 dark:hover:bg-white/10 rounded-xl md:rounded-2xl transition-all">
            <svg className="w-4 h-4 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex flex-col items-center">
             <span className="text-sm font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400 leading-none">
                {new Intl.DateTimeFormat('en-US', { month: 'short' }).format(viewingDate)}
             </span>
             <span className="text-xs font-bold opacity-40 uppercase tracking-widest mt-0.5 md:mt-1">
                {viewingDate.getFullYear()}
             </span>
          </div>
          <button onClick={nextMonth} className="p-2 md:p-3 hover:bg-zinc-100 dark:hover:bg-white/10 rounded-xl md:rounded-2xl transition-all">
            <svg className="w-4 h-4 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 md:p-10 shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 gap-0.5 sm:gap-2 md:gap-4">
          {dayNames.map(day => (
            <div key={day} className="text-center text-xs sm:text-xs uppercase tracking-widest text-zinc-600 dark:text-zinc-300 py-2 sm:py-3 md:py-4">
              {day}
            </div>
          ))}

          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="h-10 md:h-32 rounded-xl md:rounded-3xl" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const pad = (n: number) => n.toString().padStart(2, '0');
            const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
            const recordsOnDay = recordsByDate[dateStr] || [];
            const totalOnDay = dailyTotals[dateStr] || 0;
            const isToday = new Date().toISOString().split('T')[0] === dateStr;

            return (
              <div 
                key={day}
                onClick={() => handleDateClick(dateStr)}
                className={`group relative h-11 sm:h-14 md:h-32 rounded-lg sm:rounded-xl md:rounded-2xl border transition-all cursor-pointer shadow-sm hover:-translate-y-1 flex flex-col p-1 md:p-4 overflow-hidden
                  ${totalOnDay > 0 ? getDayColor(totalOnDay) : 'border-zinc-50 dark:border-zinc-800/50 hover:border-zinc-200 dark:hover:border-zinc-700'}
                  ${isToday ? 'ring-2 ring-zinc-900 dark:ring-zinc-100' : ''}
                `}
              >
                <div className="flex justify-center md:justify-between items-center md:items-start">
                  <span className={`text-xs md:text-sm ${totalOnDay > 0 ? 'font-black text-zinc-900 dark:text-zinc-100' : 'font-medium text-zinc-500 dark:text-zinc-600'}`}>
                    {day}
                  </span>
                  {totalOnDay > 0 && (
                    <div className="hidden md:flex flex-col items-end">
                      <span className="text-xs font-bold tracking-tight">
                        ${totalOnDay.toLocaleString('en-CA', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-2 hidden md:flex flex-col gap-1 overflow-hidden">
                   {recordsOnDay.slice(0, 2).map((r, idx) => (
                     <div key={idx} className="text-xs truncate uppercase tracking-tighter text-zinc-600 dark:text-zinc-300">
                        {r.vendor ? `${r.vendor}${r.entryType === 'Bill' ? ' Bill' : ''}` : (r.subcategory || r.category)}
                     </div>
                   ))}
                   {recordsOnDay.length > 2 && (
                     <div className="text-xs text-zinc-400">+{recordsOnDay.length - 2} more</div>
                   )}
                </div>
                
                {/* Plus Icon on Hover as explicit trigger - Desktop only */}
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDateClick(dateStr);
                  }}
                  className="absolute bottom-2 right-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-90 hidden md:block"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isModalOpen && (
        <PantryEntryModal 
          isOpen={isModalOpen}
          date={selectedDate}
          recordsOnDate={selectedDate ? recordsByDate[selectedDate] || [] : []}
          onClose={() => {
            setIsModalOpen(false);
            setEditingRecord(null);
            setPreferredTab(undefined);
          }}
          onUpdateRecords={onUpdateRecords}
          allRecords={records}
          initialRecord={editingRecord}
          initialTab={preferredTab}
        />
      )}

      {/* Mobile Details Popover */}
      <Modal
        isOpen={isMobilePopupOpen && !!popupDateStr}
        onClose={() => setIsMobilePopupOpen(false)}
        title={popupDateStr ? `Details for ${new Date(popupDateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : 'Details'}
        cancelText="Close"
        isReadonly={true}
      >
        <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1">
           {popupDateStr && recordsByDate[popupDateStr]?.length > 0 ? (
             recordsByDate[popupDateStr].map(record => (
               <div 
                  key={record.id} 
                  onClick={() => {
                    setEditingRecord(record);
                    setPreferredTab('form');
                    setIsMobilePopupOpen(false);
                    setIsModalOpen(true);
                  }}
                  className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 active:scale-[0.98] transition-all cursor-pointer"
               >
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center text-white dark:text-zinc-900 text-xs font-black">
                        {record.category.charAt(0)}
                     </div>
                     <div className="flex flex-col">
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">{record.vendor || record.subcategory}</span>
                        <span className="text-xs uppercase font-bold text-zinc-500 dark:text-zinc-300 tracking-widest">{record.category}</span>
                     </div>
                  </div>
                  <div className="flex flex-col items-end">
                     <span className="text-lg font-black text-zinc-900 dark:text-white">${record.amount.toLocaleString('en-CA', { maximumFractionDigits: 0 })}</span>
                     <span className={`text-xs uppercase font-black ${record.type === 'need' ? 'text-emerald-500' : 'text-amber-500'}`}>{record.type}</span>
                  </div>
               </div>
             ))
           ) : (
             <div className="py-12 flex flex-col items-center opacity-30 gap-3">
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-3-3v6m9-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="text-xs uppercase tracking-widest font-bold">No records found</span>
             </div>
           )}
        </div>

        <div className="mt-8 flex gap-3">
           <button 
            onClick={() => {
              setEditingRecord(null);
              setPreferredTab('form');
              setIsMobilePopupOpen(false);
              setIsModalOpen(true);
            }}
            className="flex-1 py-4 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-sm active:scale-95 transition-all"
           >
              Add New Entry
           </button>
        </div>
      </Modal>
    </div>
  );
}
