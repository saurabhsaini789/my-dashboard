import React, { useState, useEffect, useRef, useCallback } from 'react';
import { setSyncedItem } from '@/lib/storage';
import { getPrefixedKey } from '@/lib/keys';
import { Modal } from '../ui/Modal';
import { DynamicForm } from '../ui/DynamicForm';
import { Text } from '../ui/Text';
import { Baby, Flame, Zap } from 'lucide-react';

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
  const [habits, setHabits] = useState<Habit[]>([]); // Start empty
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAddingHabit, setIsAddingHabit] = useState(false);
  const [habitToDelete, setHabitToDelete] = useState<Habit | null>(null);
  const [newHabitName, setNewHabitName] = useState('');
  const [selectedScope, setSelectedScope] = useState<'this-month' | 'next-1' | 'next-2' | 'next-3' | 'next-6' | 'this-year' | 'all'>('this-month');
  const [isFillTodayConfirm, setIsFillTodayConfirm] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const habitsRef = useRef(habits);

  useEffect(() => {
    habitsRef.current = habits;
  }, [habits]);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const monthKey = `${currentYear}-${currentMonth}`;

  // For highlighting today
  const realToday = new Date();
  const isCurrentViewRealTodayMonth = realToday.getFullYear() === currentYear && realToday.getMonth() === currentMonth;
  const todayDateIndex = realToday.getDate() - 1;

  useEffect(() => {
    const saved = localStorage.getItem(getPrefixedKey('os_habits'));
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        
        // Migrate legacy boolean arrays
        const migrated = (Array.isArray(parsed) ? parsed : []).map((h: any) => ({
          ...h,
          days: h.days ? h.days.map((d: any) => {
            if (d === true) return 'done';
            if (d === false) return 'none';
            return d;
          }) : undefined
        }));
        
        const finalHabits = migrated.map((h: any) => {
          const records = h.records || {};
          
          // Legacy migration
          const legacyKey = `${new Date().getFullYear()}-${new Date().getMonth()}`;
          if (h.days && !records[legacyKey]) {
            const paddedDays = [...h.days];
            const currentDaysAmount = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
            while (paddedDays.length < currentDaysAmount) {
              paddedDays.push('none');
            }
            if (paddedDays.length > currentDaysAmount) {
              paddedDays.length = currentDaysAmount;
            }
            records[legacyKey] = paddedDays;
            delete h.days; // clean up old state array
          }
          
          return { ...h, records };
        });
        
        setHabits(finalHabits.length > 0 ? finalHabits : defaultInitialHabits);
      } catch (e) {
        setHabits(defaultInitialHabits);
      }
    } else {
      setHabits(defaultInitialHabits);
    }
    setIsLoaded(true);

    const handleLocalUpdate = (e: any) => {
      if (e.detail && e.detail.key === 'os_habits') {
        const val = localStorage.getItem(getPrefixedKey('os_habits'));
        if (val) {
          try {
            const newVal = JSON.parse(val);
            if (JSON.stringify(newVal) !== JSON.stringify(habitsRef.current)) {
              setHabits(newVal);
            }
          } catch (e) {}
        }
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      const prefixedKey = getPrefixedKey('os_habits');
      if (e.key === prefixedKey && e.newValue) {
        try {
          const newVal = JSON.parse(e.newValue);
          if (JSON.stringify(newVal) !== JSON.stringify(habitsRef.current)) {
            setHabits(newVal);
          }
        } catch (e) {}
      }
    };

    window.addEventListener('local-storage-change', handleLocalUpdate);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('local-storage-change', handleLocalUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    if (isLoaded) {
      setSyncedItem('os_habits', JSON.stringify(habits));
    }
  }, [habits, isLoaded]);

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

    setHabits(prev => [...prev, newHabit]);
    setNewHabitName('');
    setIsAddingHabit(false);
  };

  const handleDeleteHabit = () => {
    if (!habitToDelete) return;

    if (selectedScope === 'all') {
      setHabits(prev => prev.filter(h => h.id !== habitToDelete.id));
    } else {
      const monthsToRemove = getScopeMonths(selectedScope, currentDate) || [];
      setHabits(prev => prev.map(h => {
        if (h.id === habitToDelete.id) {
          const currentScope = h.monthScope;
          if (!currentScope) {
            return {
              ...h,
              monthScope: [] // Tricky for global, but filtering handles it
            };
          }
          return {
            ...h,
            monthScope: currentScope.filter(m => !monthsToRemove.includes(m))
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
    setHabits(prev => prev.map(h => {
      if (h.id === habitId) {
        const newRecords = { ...h.records };
        const monthDays = newRecords[monthKey] ? [...newRecords[monthKey]] : Array(daysInMonth).fill('none');
        
        const current = monthDays[dayIndex];
        
        if (current === 'none') monthDays[dayIndex] = 'done';
        else if (current === 'done') monthDays[dayIndex] = 'missed';
        else if (current === 'missed') monthDays[dayIndex] = 'none';
        else monthDays[dayIndex] = 'done';
        
        newRecords[monthKey] = monthDays;
        return { ...h, records: newRecords };
      }
      return h;
    }));
  };

  const datesOfMonth = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(currentYear, currentMonth, i + 1);
    return {
      date: i + 1,
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
    };
  });

  const months = Array.from({ length: 12 }, (_, i) => {
    return new Date(2000, i, 1).toLocaleDateString('en-US', { month: 'long' });
  });

  const baseYear = 2026;
  const years = Array.from({ length: 10 }, (_, i) => baseYear + i);

  const isBeforeBirth = currentYear < 2026 || (currentYear === 2026 && currentMonth < 2);

  useEffect(() => {
    if (isLoaded && isCurrentViewRealTodayMonth && scrollContainerRef.current) {
      setTimeout(() => {
        const container = scrollContainerRef.current;
        const todayElement = container?.querySelector(`[data-date-index="${todayDateIndex}"]`) as HTMLElement;
        if (todayElement && container) {
          const scrollPosition = todayElement.offsetLeft - container.offsetWidth / 2 + todayElement.offsetWidth / 2;
          container.scrollTo({ left: scrollPosition, behavior: 'smooth' });
        }
      }, 100);
    }
  }, [isLoaded, currentMonth, currentYear, isCurrentViewRealTodayMonth, todayDateIndex]);

  const calcCurrentStreak = useCallback((habit: Habit): number => {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${today.getMonth()}`;
    const todayStatus = habit.records?.[todayKey]?.[today.getDate() - 1];
    let streakDate = new Date(today);
    if (!todayStatus || todayStatus === 'none') {
      streakDate.setDate(streakDate.getDate() - 1);
    }
    let streak = 0;
    for (let i = 0; i < 500; i++) {
      const k = `${streakDate.getFullYear()}-${streakDate.getMonth()}`;
      const idx = streakDate.getDate() - 1;
      const isActive = !habit.monthScope || habit.monthScope.length === 0 || habit.monthScope.includes(k);
      if (!isActive) break;
      const s = habit.records?.[k]?.[idx];
      if (s === 'done') { streak++; streakDate.setDate(streakDate.getDate() - 1); }
      else break;
    }
    return streak;
  }, []);

  const handleFillToday = useCallback(() => {
    const today = new Date();
    const tYear = today.getFullYear();
    const tMonth = today.getMonth();
    const tKey = `${tYear}-${tMonth}`;
    const tIdx = today.getDate() - 1;
    const tDaysInMonth = new Date(tYear, tMonth + 1, 0).getDate();

    setHabits(prev => prev.map(h => {
      const isActive = !h.monthScope || h.monthScope.length === 0 || h.monthScope.includes(tKey);
      if (!isActive) return h;
      const newRecords = { ...h.records };
      const monthDays = newRecords[tKey] ? [...newRecords[tKey]] : Array(tDaysInMonth).fill('none');
      while (monthDays.length < tDaysInMonth) monthDays.push('none');
      monthDays[tIdx] = 'done';
      newRecords[tKey] = monthDays;
      return { ...h, records: newRecords };
    }));
    setIsFillTodayConfirm(false);
  }, []);

  return (
    <div className="w-full pb-12 flex flex-col gap-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <select 
              value={currentMonth}
              onChange={(e) => setCurrentDate(new Date(currentYear, parseInt(e.target.value), 1))}
              className="appearance-none bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 transition-colors text-base font-medium text-zinc-900 dark:text-zinc-100 rounded-xl pl-4 pr-10 py-2 cursor-pointer outline-none border border-zinc-200 dark:border-zinc-700/50 focus:ring-4 focus:ring-zinc-100 dark:focus:ring-zinc-800/50 shadow-sm"
            >
              {months.map((m, i) => (
                <option key={i} value={i} className="text-base font-normal bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
                  {m}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 dark:text-zinc-500">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <div className="relative">
            <select 
              value={currentYear}
              onChange={(e) => setCurrentDate(new Date(parseInt(e.target.value), currentMonth, 1))}
              className="appearance-none bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 transition-colors text-base font-medium text-zinc-900 dark:text-zinc-100 rounded-xl pl-4 pr-10 py-2 cursor-pointer outline-none border border-zinc-200 dark:border-zinc-700/50 focus:ring-4 focus:ring-zinc-100 dark:focus:ring-zinc-800/50 shadow-sm"
            >
              {years.map(y => (
                <option key={y} value={y} className="text-base font-normal bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
                  {y}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 dark:text-zinc-500">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button 
            onClick={() => setIsAddingHabit(true)}
            className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white font-semibold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-teal-500/20 active:scale-95 whitespace-nowrap"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add Habit
          </button>

          {isCurrentViewRealTodayMonth && (
            <button
              onClick={() => setIsFillTodayConfirm(true)}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 px-5 rounded-xl transition-all shadow-lg shadow-amber-500/20 active:scale-95 whitespace-nowrap"
              title="Mark all today's habits as done"
            >
              <Zap className="w-4 h-4" />
              Fill Today
            </button>
          )}
        </div>
      </div>

      {isBeforeBirth ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
          <div className="mb-4 text-zinc-900 dark:text-zinc-100 flex justify-center"><Baby size={48} /></div>
          <Text variant="title">Wait a minute!</Text>
          <Text variant="bodySmall" muted className="max-w-sm text-center">
            I was not born then... I was born on <span className="font-semibold text-zinc-800 dark:text-zinc-200">27th March 2026</span>, so please select a month on or after that!
          </Text>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
          <div ref={scrollContainerRef} className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left min-w-max border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/100">
                  <Text variant="label" as="th" className="py-3 px-4 sm:px-6 rounded-tl-2xl select-none sticky left-0 z-30 bg-zinc-50 dark:bg-[#18181b] shadow-[1px_0_0_0_#e4e4e7] dark:shadow-[1px_0_0_0_#27272a] whitespace-nowrap min-w-[120px] sm:min-w-[150px] font-semibold" rowSpan={2}>Habit</Text>
                  {datesOfMonth.map((d, index) => {
                    const isToday = isCurrentViewRealTodayMonth && index === todayDateIndex;
                    return (
                      <Text key={`day-name-${index}`} variant="label" as="th" className={`pt-2 pb-0.5 px-2 text-center w-16 min-w-[2.5rem] select-none transition-colors font-semibold ${isToday ? 'text-teal-600 dark:text-teal-400 bg-teal-50/50 dark:bg-teal-500/10' : ''}`}>
                        {d.dayName}
                      </Text>
                    );
                  })}
                  <Text variant="label" as="th" className="py-3 px-6 text-right w-32 rounded-tr-2xl select-none sticky right-0 z-20 bg-zinc-50 dark:bg-[#18181b] shadow-[-1px_0_0_0_#e4e4e7] dark:shadow-[-1px_0_0_0_#27272a] font-semibold hidden md:table-cell" rowSpan={2}>Success</Text>
                </tr>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                  {datesOfMonth.map((d, index) => {
                    const isToday = isCurrentViewRealTodayMonth && index === todayDateIndex;
                    return (
                      <Text key={`date-${index}`} variant="body" as="th" data-date-index={index} className={`pb-2 pt-0.5 px-2 text-center w-16 min-w-[2.5rem] select-none transition-colors border-b-2 font-semibold ${isToday ? 'text-teal-700 dark:text-teal-300 bg-teal-50/50 dark:bg-teal-500/10 border-teal-500 dark:border-teal-500' : 'border-transparent dark:border-transparent'}`}>
                        {d.date}
                      </Text>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {visibleHabits.map((habit) => {
                  const rawDays = habit.records?.[monthKey] || [];
                  const currentMonthDays = [...rawDays];
                  while (currentMonthDays.length < daysInMonth) currentMonthDays.push('none');
                  if (currentMonthDays.length > daysInMonth) currentMonthDays.length = daysInMonth;

                  const completedDays = currentMonthDays.filter(d => d === 'done').length;
                  const missedDays = currentMonthDays.filter(d => d === 'missed').length;
                  const totalLogged = completedDays + missedDays;
                  const rate = totalLogged > 0 ? Math.round((completedDays / totalLogged) * 100) : 0;
                  const score = completedDays - missedDays;
                  
                  let scoreDisplay = score.toString();
                  let scoreStyles = "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-transparent";
                  if (score > 0) {
                    scoreDisplay = `+${score}`;
                    scoreStyles = "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-200 dark:border-emerald-900/50";
                  } else if (score < 0) {
                    scoreStyles = "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-semibold border border-red-200 dark:border-red-900/50";
                  }
                  
                  return (
                    <tr key={habit.id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="py-2.5 px-4 sm:px-6 font-semibold text-zinc-900 dark:text-zinc-100 text-sm md:text-base sticky left-0 z-20 bg-white dark:bg-[#18181b] group-hover:bg-zinc-50 dark:group-hover:bg-[#202024] transition-colors shadow-[1px_0_0_0_#e4e4e7] dark:shadow-[1px_0_0_0_#27272a] whitespace-nowrap min-w-[120px] sm:min-w-[150px]">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {(() => {
                              const streak = calcCurrentStreak(habit);
                              return streak >= 2 ? (
                                <span className="flex items-center gap-0.5 text-[10px] font-bold text-orange-500 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-800/50 rounded-full px-1.5 py-0.5 flex-shrink-0">
                                  <Flame className="w-2.5 h-2.5" />{streak}
                                </span>
                              ) : null;
                            })()}
                            <button
                              onClick={() => onHabitSelect?.(habit)}
                              className="truncate text-left hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                              title={`View ${habit.name} analytics`}
                            >
                              {habit.name}
                            </button>
                          </div>
                          <button 
                            onClick={() => setHabitToDelete(habit)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-400 hover:text-red-500 transition-all rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 flex-shrink-0"
                            title="Delete habit"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                      {currentMonthDays.map((status, index) => {
                        const isToday = isCurrentViewRealTodayMonth && index === todayDateIndex;
                        return (
                          <td key={index} className={`py-1.5 px-1 text-center transition-colors ${isToday ? 'bg-teal-50/30 dark:bg-teal-900/10' : ''}`}>
                            <button 
                              onClick={(e) => handleDayClick(habit.id, index, e)}
                              className={`group/btn relative w-7 h-7 sm:w-8 sm:h-8 rounded-full mx-auto transition-all focus:outline-none flex items-center justify-center ${status === 'done' ? 'bg-emerald-500/10 dark:bg-emerald-500/20' : status === 'missed' ? 'bg-rose-500/10 dark:bg-rose-500/20' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/50'}`}
                            >
                              <div className={`rounded-full transition-all duration-300 ${status === 'done' ? 'w-2.5 h-2.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : status === 'missed' ? 'w-2.5 h-2.5 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]' : 'w-1.5 h-1.5 bg-zinc-200 dark:bg-zinc-700 group-hover/btn:bg-zinc-300 dark:group-hover/btn:bg-zinc-600'}`} />
                            </button>
                          </td>
                        );
                      })}
                      <Text variant="body" as="td" className="py-2.5 px-6 text-right font-medium sticky right-0 z-10 bg-white dark:bg-[#18181b] group-hover:bg-zinc-50 dark:group-hover:bg-[#202024] transition-colors shadow-[-1px_0_0_0_#e4e4e7] dark:shadow-[-1px_0_0_0_#27272a] hidden md:table-cell">
                        <div className="flex items-center justify-end gap-2">
                          {totalLogged > 0 && (
                            <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 dark:text-zinc-500">{rate}%</span>
                          )}
                          <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full min-w-[3rem] text-xs select-none transition-colors ${scoreStyles}`}>
                            {scoreDisplay}
                          </span>
                        </div>
                      </Text>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Fill Today Confirm Modal */}
      {isFillTodayConfirm && (
        <Modal
          isOpen={true}
          onClose={() => setIsFillTodayConfirm(false)}
          title="Fill Today?"
          onSubmit={(e) => { e.preventDefault(); handleFillToday(); }}
          submitText="Yes, mark all done"
        >
          <div className="flex flex-col items-center justify-center p-6 bg-amber-50 dark:bg-amber-500/10 rounded-2xl border border-amber-100 dark:border-amber-900/50">
            <Zap className="w-8 h-8 text-amber-500 mb-3" />
            <p className="text-zinc-700 dark:text-zinc-300 font-medium text-center">
              This will mark all active habits for <span className="font-semibold text-amber-600 dark:text-amber-400">today</span> as <span className="font-semibold text-emerald-600 dark:text-emerald-400">done</span>.
            </p>
            <p className="text-zinc-400 text-sm mt-1">You can still change individual habits after.</p>
          </div>
        </Modal>
      )}

      {/* Add Habit Modal */}
      {isAddingHabit && (
        <Modal
          isOpen={true}
          onClose={() => setIsAddingHabit(false)}
          title="Create new habit"
          onSubmit={(e) => {
            e.preventDefault();
            handleAddHabit();
          }}
          submitText="Create Habit"
        >
          <DynamicForm
            sections={[
              {
                id: 'habit_details',
                title: 'Habit details',
                fields: [
                  { name: 'name', label: 'Habit Name', type: 'text', required: true, fullWidth: true, placeholder: 'E.g. Morning Yoga' },
                  {
                    name: 'scope',
                    label: 'Active For',
                    type: 'select',
                    fullWidth: true,
                    options: [
                      { value: 'this-month', label: 'This Month' },
                      { value: 'next-1', label: 'Next 1 Month' },
                      { value: 'next-2', label: 'Next 2 Months' },
                      { value: 'next-3', label: 'Next 3 Months' },
                      { value: 'next-6', label: 'Next 6 Months' },
                      { value: 'this-year', label: 'This Year' },
                      { value: 'all', label: 'All Time' },
                    ]
                  }
                ]
              }
            ]}
            formData={{ name: newHabitName, scope: selectedScope }}
            onChange={(name, value) => {
              if (name === 'name') setNewHabitName(value as string);
              if (name === 'scope') setSelectedScope(value as any);
            }}
          />
        </Modal>
      )}

      {/* Delete Habit Modal */}
      {habitToDelete && (
        <Modal
          isOpen={true}
          onClose={() => setHabitToDelete(null)}
          title="Delete habit?"
          onSubmit={(e) => {
            e.preventDefault();
            handleDeleteHabit();
          }}
          submitText="Confirm Delete"
        >
          <div className="mb-6 flex flex-col items-center justify-center p-6 bg-red-50 dark:bg-red-500/10 rounded-2xl border border-red-100 dark:border-red-900/50">
            <svg className="w-8 h-8 text-red-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <p className="text-zinc-700 dark:text-zinc-300 font-medium text-center">
              Are you sure you want to delete <span className="font-semibold text-red-600 dark:text-red-400">"{habitToDelete.name}"</span>?
            </p>
          </div>
          <DynamicForm
            sections={[
              {
                id: 'delete_scope',
                title: 'Deletion Options',
                fields: [
                  {
                    name: 'scope',
                    label: 'Delete From',
                    type: 'select',
                    fullWidth: true,
                    options: [
                      { value: 'this-month', label: 'This Month Only' },
                      { value: 'this-year', label: 'Rest of This Year' },
                      { value: 'all', label: 'Delete Completely' }
                    ]
                  }
                ]
              }
            ]}
            formData={{ scope: selectedScope }}
            onChange={(name, value) => {
              if (name === 'scope') setSelectedScope(value as any);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
