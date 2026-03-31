"use client";

import React, { useState, useMemo } from 'react';
import { ExpenseRecord } from '@/types/finance';
import { PantryEntryModal } from './PantryEntryModal';
import { convertToINR, convertToCAD } from '@/lib/finances';

interface PantryCalendarProps {
  records: ExpenseRecord[];
  onUpdateRecords: (records: ExpenseRecord[]) => void;
}

export function PantryCalendar({ records, onUpdateRecords }: PantryCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ExpenseRecord | null>(null);

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

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
      totals[date] = dateRecords.reduce((sum, r) => sum + convertToINR(r.amount, r.currency), 0);
    });
    return totals;
  }, [recordsByDate]);

  // Monthly total
  const monthlyTotal = useMemo(() => {
    return records
      .filter(r => {
        const d = new Date(r.date);
        return d.getMonth() === month && d.getFullYear() === year;
      })
      .reduce((sum, r) => sum + convertToINR(r.amount, r.currency), 0);
  }, [records, month, year]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const handleDateClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    setEditingRecord(null);
    setIsModalOpen(true);
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
      <div className="flex items-center justify-between px-6 py-8 bg-zinc-900 dark:bg-zinc-800 rounded-[40px] text-white shadow-2xl">
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-[0.3em] opacity-60">Monthly Spend</span>
          <span className="text-4xl font-bold tracking-tighter">
            ₹{monthlyTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            <span className="text-xl opacity-60 ml-2 font-medium tracking-normal">
              (C${convertToCAD(monthlyTotal).toLocaleString('en-CA', { maximumFractionDigits: 1 })})
            </span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={prevMonth} className="p-3 hover:bg-white/10 rounded-2xl transition-all">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex flex-col items-center">
             <span className="text-sm font-bold uppercase tracking-widest">
                {new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentDate)}
             </span>
          </div>
          <button onClick={nextMonth} className="p-3 hover:bg-white/10 rounded-2xl transition-all">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[40px] p-6 md:p-10 shadow-xl overflow-hidden">
        <div className="grid grid-cols-7 gap-2 md:gap-4">
          {dayNames.map(day => (
            <div key={day} className="text-center text-[10px] uppercase tracking-[0.3em] text-zinc-400 py-4">
              {day}
            </div>
          ))}

          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="h-24 md:h-32 rounded-3xl" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateObj = new Date(year, month, day);
            const dateStr = dateObj.toISOString().split('T')[0];
            const recordsOnDay = recordsByDate[dateStr] || [];
            const totalOnDay = dailyTotals[dateStr] || 0;
            const isToday = new Date().toISOString().split('T')[0] === dateStr;

            return (
              <div 
                key={day}
                onClick={() => handleDateClick(dateStr)}
                className={`group relative h-24 md:h-32 rounded-3xl border transition-all cursor-pointer hover:shadow-lg hover:-translate-y-1 flex flex-col p-3 md:p-4 overflow-hidden
                  ${totalOnDay > 0 ? getDayColor(totalOnDay) : 'border-zinc-50 dark:border-zinc-800/50 hover:border-zinc-200 dark:hover:border-zinc-700'}
                  ${isToday ? 'ring-2 ring-zinc-900 dark:ring-zinc-100' : ''}
                `}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-sm font-bold ${totalOnDay > 0 ? '' : 'text-zinc-600 dark:text-zinc-400'}`}>
                    {day}
                  </span>
                  {totalOnDay > 0 && (
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] md:text-xs font-bold tracking-tight">
                        ₹{totalOnDay.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                      <span className="text-[8px] md:text-[9px] opacity-60 font-medium -mt-0.5">
                        (C${convertToCAD(totalOnDay).toLocaleString('en-CA', { maximumFractionDigits: 0 })})
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-2 flex flex-col gap-1 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity">
                   {recordsOnDay.slice(0, 2).map((r, idx) => (
                     <div key={idx} className="text-[10px] truncate uppercase tracking-tighter text-zinc-500">
                        {r.vendor ? `${r.vendor}${r.entryType === 'Bill' ? ' Bill' : ''}` : (r.subcategory || r.category)}
                     </div>
                   ))}
                   {recordsOnDay.length > 2 && (
                     <div className="text-[8px] text-zinc-400">+{recordsOnDay.length - 2} more</div>
                   )}
                </div>
                
                {/* Plus Icon on Hover as explicit trigger */}
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDateClick(dateStr);
                  }}
                  className="absolute bottom-2 right-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-90"
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
          onClose={() => setIsModalOpen(false)}
          onUpdateRecords={onUpdateRecords}
          allRecords={records}
        />
      )}
    </div>
  );
}
