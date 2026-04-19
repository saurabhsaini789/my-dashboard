"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { setSyncedItem } from '@/lib/storage';
import { Modal } from '../ui/Modal';
import { DynamicForm } from '../ui/DynamicForm';
import { Text } from '../ui/Text';
import { Baby, Flame, Zap } from 'lucide-react';
import { useStorageSubscription } from '@/hooks/useStorageSubscription';

type HabitStatus = 'none' | 'done' | 'missed';

interface Habit {
  id: string;
  name: string;
  records: Record<string, HabitStatus[]>;
  monthScope?: string[];
}

interface HabitsProps {
  onHabitSelect?: (habit: Habit | null) => void;
}

const defaultInitialHabits: Habit[] = [
  { id: '1', name: 'No Phone AM', records: {} },
  { id: '2', name: 'No Fap', records: {} },
  { id: '3', name: 'Brush AM', records: {} },
  { id: '4', name: 'Shower AM', records: {} },
  { id: '5', name: 'Exercise AM', records: {} },
  { id: '6', name: 'Meditate AM', records: {} },
  { id: '7', name: 'Work Log', records: {} },
  { id: '8', name: 'Home Call', records: {} },
  { id: '9', name: 'Book (Eng)', records: {} },
  { id: '10', name: 'Book (Hin)', records: {} },
  { id: '11', name: 'Side Project', records: {} },
  { id: '12', name: 'Portfolio', records: {} },
  { id: '13', name: 'Learning', records: {} },
  { id: '15', name: 'Insta Post', records: {} },
  { id: '16', name: 'LinkedIn Post', records: {} },
  { id: '17', name: 'LinkedIn Network', records: {} },
  { id: '18', name: 'Exercise PM', records: {} },
  { id: '19', name: 'Meditate PM', records: {} },
  { id: '20', name: 'Daily Log', records: {} },
  { id: '21', name: 'Brush PM', records: {} },
  { id: '22', name: 'No Phone PM', records: {} },
  { id: '23', name: 'Activity', records: {} },
  { id: '24', name: 'Adventure', records: {} },
];

export function Habits({ onHabitSelect }: HabitsProps = {}) {
  const rawHabits = useStorageSubscription<any[]>('os_habits', []);
  
  // Migration & Default logic
  const habits = useMemo(() => {
    if (!rawHabits || rawHabits.length === 0) return defaultInitialHabits;
    
    return rawHabits.map((h: any) => {
      const records = h.records || {};
      
      // Migrate legacy boolean arrays
      if (h.days) {
        const legacyKey = `${new Date().getFullYear()}-${new Date().getMonth()}`;
        if (!records[legacyKey]) {
           records[legacyKey] = h.days.map((d: any) => d === true ? 'done' : d === false ? 'none' : d);
        }
        delete h.days;
      }
      
      return { ...h, records };
    });
  }, [rawHabits]);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAddingHabit, setIsAddingHabit] = useState(false);
  const [habitToDelete, setHabitToDelete] = useState<Habit | null>(null);
  const [newHabitName, setNewHabitName] = useState('');
  const [selectedScope, setSelectedScope] = useState<'this-month' | 'next-1' | 'next-2' | 'next-3' | 'next-6' | 'this-year' | 'all'>('this-month');
  const [isFillTodayConfirm, setIsFillTodayConfirm] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const monthKey = `${currentYear}-${currentMonth}`;

  // For highlighting today
  const realToday = new Date();
  const isCurrentViewRealTodayMonth = realToday.getFullYear() === currentYear && realToday.getMonth() === currentMonth;
  const todayDateIndex = realToday.getDate() - 1;

  const updateHabits = (newHabits: Habit[]) => {
    setSyncedItem('os_habits', JSON.stringify(newHabits));
  };

  const getScopeMonths = (scope: typeof selectedScope, baseDate: Date) => {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const months: string[] = [];
    if (scope === 'all') return undefined;

    let count = 0;
    if (scope === 'this-month') count = 1;
    else if (scope === 'next-1') count = 2;
    else if (scope === 'next-2') count = 3;
    else if (scope === 'next-3') count = 4;
    else if (scope === 'next-6') count = 7;
    else if (scope === 'this-year') count = 12 - month;

    for (let i = 0; i < count; i++) {
      const d = new Date(year, month + i, 1);
      months.push(`${d.getFullYear()}-${d.getMonth()}`);
    }
    return months;
  };

  const handleAddHabit = () => {
    if (!newHabitName.trim()) return;
    const scope = getScopeMonths(selectedScope, currentDate);
    const newHabit: Habit = {
      id: Math.random().toString(36).substr(2, 9),
      name: newHabitName.trim(),
      records: {},
      monthScope: scope
    };
    updateHabits([...habits, newHabit]);
    setNewHabitName('');
    setIsAddingHabit(false);
  };

  const handleDeleteHabit = () => {
    if (!habitToDelete) return;
    if (selectedScope === 'all') {
      updateHabits(habits.filter(h => h.id !== habitToDelete.id));
    } else {
      const monthsToRemove = getScopeMonths(selectedScope, currentDate) || [];
      updateHabits(habits.map(h => {
        if (h.id === habitToDelete.id) {
          return {
            ...h,
            monthScope: (h.monthScope || []).filter((m: string) => !monthsToRemove.includes(m))
          };
        }
        return h;
      }).filter(h => !h.monthScope || h.monthScope.length > 0)); 
    }
    setHabitToDelete(null);
  };

  const visibleHabits = habits.filter(h => {
    if (!h.monthScope || h.monthScope.length === 0) return true;
    return h.monthScope.includes(monthKey);
  });

  const handleDayClick = (habitId: string, dayIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    updateHabits(habits.map(h => {
      if (h.id === habitId) {
        const newRecords = { ...h.records };
        const monthDays = newRecords[monthKey] ? [...newRecords[monthKey]] : Array(daysInMonth).fill('none');
        const current = monthDays[dayIndex];
        
        if (current === 'none') monthDays[dayIndex] = 'done';
        else if (current === 'done') monthDays[dayIndex] = 'missed';
        else monthDays[dayIndex] = 'none';
        
        newRecords[monthKey] = monthDays;
        return { ...h, records: newRecords };
      }
      return h;
    }));
  };

  const handleFillToday = useCallback(() => {
    const today = new Date();
    const tKey = `${today.getFullYear()}-${today.getMonth()}`;
    const tIdx = today.getDate() - 1;
    const tDays = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    updateHabits(habits.map(h => {
      const isActive = !h.monthScope || h.monthScope.length === 0 || h.monthScope.includes(tKey);
      if (!isActive) return h;
      const newRecords = { ...h.records };
      const monthDays = newRecords[tKey] ? [...newRecords[tKey]] : Array(tDays).fill('none');
      monthDays[tIdx] = 'done';
      newRecords[tKey] = monthDays;
      return { ...h, records: newRecords };
    }));
    setIsFillTodayConfirm(false);
  }, [habits]);

  const datesOfMonth = Array.from({ length: daysInMonth }, (_, i) => ({
    date: i + 1,
    dayName: new Date(currentYear, currentMonth, i + 1).toLocaleDateString('en-US', { weekday: 'short' }),
  }));

  const months = Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString('en-US', { month: 'long' }));
  const years = Array.from({ length: 10 }, (_, i) => 2026 + i);

  useEffect(() => {
    if (isCurrentViewRealTodayMonth && scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const todayElement = container?.querySelector(`[data-date-index="${todayDateIndex}"]`) as HTMLElement;
        if (todayElement) {
          const isMobile = window.innerWidth < 768;
          // On mobile, scroll so today is "in front" (after the 150px sticky column)
          // On desktop, continue centering today
          const scrollPosition = isMobile 
            ? todayElement.offsetLeft - 150 
            : todayElement.offsetLeft - container.offsetWidth / 2 + todayElement.offsetWidth / 2;
          
          container.scrollTo({ left: scrollPosition, behavior: 'smooth' });
        }
    }
  }, [currentMonth, currentYear, isCurrentViewRealTodayMonth, todayDateIndex]);

  const calcCurrentStreak = useCallback((habit: Habit): number => {
    const today = new Date();
    const streakDate = new Date(today);
    const todayKey = `${today.getFullYear()}-${today.getMonth()}`;
    const todayStatus = habit.records?.[todayKey]?.[today.getDate() - 1];

    if (!todayStatus || todayStatus === 'none') streakDate.setDate(streakDate.getDate() - 1);

    let streak = 0;
    for (let i = 0; i < 500; i++) {
        const k = `${streakDate.getFullYear()}-${streakDate.getMonth()}`;
        const idx = streakDate.getDate() - 1;
        const isActive = !habit.monthScope || habit.monthScope.length === 0 || habit.monthScope.includes(k);
        if (!isActive) break;
        if (habit.records?.[k]?.[idx] === 'done') { streak++; streakDate.setDate(streakDate.getDate() - 1); }
        else break;
    }
    return streak;
  }, []);

  return (
    <div className="w-full pb-12 flex flex-col gap-4 font-bold uppercase">
      {/* Date Selectors & Actions */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-4 mb-4">
        <div className="flex gap-3">
          <select value={currentMonth} onChange={e => setCurrentDate(new Date(currentYear, parseInt(e.target.value), 1))} className="bg-zinc-100 p-2 rounded-xl border-none cursor-pointer">
            {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={currentYear} onChange={e => setCurrentDate(new Date(parseInt(e.target.value), currentMonth, 1))} className="bg-zinc-100 p-2 rounded-xl border-none cursor-pointer">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setIsAddingHabit(true)} className="bg-teal-500 text-white px-6 py-2.5 rounded-xl transition-all hover:scale-105">+ Add Habit</button>
          {isCurrentViewRealTodayMonth && <button onClick={() => setIsFillTodayConfirm(true)} className="bg-amber-500 text-white px-5 py-2.5 rounded-xl transition-all hover:scale-105"><Zap className="w-4 h-4 inline mr-2" />Today Done</button>}
        </div>
      </div>

      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div ref={scrollContainerRef} className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="bg-zinc-50 border-b">
                <th className="p-4 sticky left-0 z-30 bg-zinc-50 border-r min-w-[150px]">Habit</th>
                {datesOfMonth.map((d, i) => <th key={i} data-date-index={i} className={`p-2 text-center text-[10px] min-w-[40px] ${isCurrentViewRealTodayMonth && i === todayDateIndex ? 'bg-teal-50 text-teal-600' : ''}`}>{d.dayName}<br/>{d.date}</th>)}
                <th className="p-4 sticky right-0 z-20 bg-zinc-50 border-l text-right hidden md:table-cell">Score</th>
              </tr>
            </thead>
            <tbody>
              {visibleHabits.map(h => {
                const days = h.records?.[monthKey] || [];
                const completed = days.filter((d: string) => d === 'done').length;
                const missed = days.filter((d: string) => d === 'missed').length;
                const score = completed - missed;
                const streak = calcCurrentStreak(h);
                return (
                  <tr key={h.id} className="hover:bg-zinc-50 border-b">
                    <td className="p-4 sticky left-0 z-20 bg-white group-hover:bg-zinc-50 border-r">
                      <div className="flex items-center justify-between gap-2">
                        <div 
                          className="flex items-center gap-2 cursor-pointer hover:text-teal-600 transition-colors"
                          onClick={() => onHabitSelect?.(h)}
                        >
                          {streak >= 2 && <span className="text-[10px] bg-orange-50 text-orange-500 px-1.5 py-0.5 rounded-full"><Flame className="w-2.5 h-2.5 inline" />{streak}</span>}
                          <span className="text-sm">{h.name}</span>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setHabitToDelete(h);
                          }} 
                          className="text-zinc-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    {datesOfMonth.map((_, i) => {
                      const status = days[i] || 'none';
                      return (
                        <td key={i} className={`p-1 text-center ${isCurrentViewRealTodayMonth && i === todayDateIndex ? 'bg-teal-50/30' : ''}`}>
                          <button onClick={e => handleDayClick(h.id, i, e)} className="w-7 h-7 rounded-full transition-all flex items-center justify-center">
                            <div className={`rounded-full transition-all ${status === 'done' ? 'w-2.5 h-2.5 bg-emerald-500 shadow-[0_0_8px_emerald]' : status === 'missed' ? 'w-2.5 h-2.5 bg-rose-500 shadow-[0_0_8px_rose]' : 'w-1.5 h-1.5 bg-zinc-200'}`} />
                          </button>
                        </td>
                      );
                    })}
                    <td className="p-4 sticky right-0 z-10 bg-white border-l text-right hidden md:table-cell">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${score > 0 ? 'bg-emerald-50 text-emerald-600' : score < 0 ? 'bg-rose-50 text-rose-600' : 'bg-zinc-100'}`}>
                        {score > 0 ? `+${score}` : score}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isAddingHabit} onClose={() => setIsAddingHabit(false)} title="New Habit" onSubmit={handleAddHabit}>
         <DynamicForm sections={[{id:'h', fields:[{name:'name', label:'Habit Name', type:'text', required:true}, {name:'scope', label:'Scope', type:'select', options:[{value:'this-month',label:'This Month'},{value:'all',label:'All Time'}]}]}]} formData={{name:newHabitName, scope:selectedScope}} onChange={(n,v)=>{if(n==='name')setNewHabitName(v);if(n==='scope')setSelectedScope(v as any)}} />
      </Modal>

      {habitToDelete && <Modal isOpen={true} onClose={()=>setHabitToDelete(null)} title="Delete Habit" onSubmit={handleDeleteHabit} submitText="Confirm Delete"><p>Delete <b>{habitToDelete.name}</b>?</p></Modal>}
      {isFillTodayConfirm && <Modal isOpen={true} onClose={()=>setIsFillTodayConfirm(false)} title="Fill Today" onSubmit={handleFillToday} submitText="Mark Done"><p>Mark all active habits as <b>done</b> for today?</p></Modal>}
    </div>
  );
}

import { Trash2 } from 'lucide-react';
