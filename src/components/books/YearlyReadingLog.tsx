"use client";

import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  MoreVertical,
  Book as BookIcon,
  Plus
} from 'lucide-react';
import { MultiYearLogData, MonthlyEntry, YearlyLogData } from '@/types/books';
import { setSyncedItem } from '@/lib/storage';
import { getPrefixedKey } from '@/lib/keys';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

type Status = MonthlyEntry['englishStatus'];

const STATUS_ICONS: Record<Status, React.ReactNode> = {
  'Completed': <CheckCircle2 size={14} className="text-teal-500" />,
  'Reading': <BookOpen size={14} className="text-blue-500" />,
  'Planned': <Clock size={14} className="text-amber-500" />,
  'None': null
};

const STATUS_OPTIONS: Status[] = ['None', 'Planned', 'Reading', 'Completed'];

export function YearlyReadingLog() {
  const [data, setData] = useState<MultiYearLogData>({});
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [isLoaded, setIsLoaded] = useState(false);
  const [editingCell, setEditingCell] = useState<{ month: string, type: 'english' | 'hindi' } | null>(null);
  const dataRef = React.useRef(data);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Load data
  useEffect(() => {
    const stored = localStorage.getItem(getPrefixedKey('os_books_yearly_log'));
    if (stored) {
      try {
        setData(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse yearly log data', e);
      }
    }
    setIsLoaded(true);

    const handleLocalUpdate = (e: any) => {
      if (e.detail && e.detail.key === 'os_books_yearly_log') {
        const val = localStorage.getItem(getPrefixedKey('os_books_yearly_log'));
        if (val) {
          try {
            const newVal = JSON.parse(val);
            if (JSON.stringify(newVal) !== JSON.stringify(dataRef.current)) {
              setData(newVal);
            }
          } catch (e) {}
        }
      }
    };

    window.addEventListener('local-storage-change', handleLocalUpdate);
    return () => window.removeEventListener('local-storage-change', handleLocalUpdate);
  }, []);

  // Save data
  useEffect(() => {
    if (isLoaded) {
      setSyncedItem('os_books_yearly_log', JSON.stringify(data));
    }
  }, [data, isLoaded]);

  const getYearData = (year: number): YearlyLogData => {
    return data[year] || {};
  };

  const updateEntry = (month: string, type: 'english' | 'hindi', field: 'title' | 'status', value: string) => {
    setData(prev => {
      const yearData = { ...(prev[currentYear] || {}) };
      const monthData = { ...(yearData[month] || { english: '', hindi: '', englishStatus: 'None', hindiStatus: 'None' }) };
      
      if (type === 'english') {
        if (field === 'title') monthData.english = value;
        else monthData.englishStatus = value as Status;
      } else {
        if (field === 'title') monthData.hindi = value;
        else monthData.hindiStatus = value as Status;
      }

      yearData[month] = monthData;
      return { ...prev, [currentYear]: yearData };
    });
  };

  if (!isLoaded) return <div className="h-96 animate-pulse bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800"></div>;

  const yearData = getYearData(currentYear);

  return (
    <div className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden fade-in">
      {/* Table Header / Year Selector */}
      <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-50/50 dark:bg-zinc-900/20">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setCurrentYear(y => y - 1)}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-500 transition-all active:scale-95"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white min-w-[100px] text-center">
            {currentYear}
          </div>
          <button 
            onClick={() => setCurrentYear(y => y + 1)}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-500 transition-all active:scale-95"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        
        <div className="flex items-center gap-6 text-xs font-bold uppercase tracking-widest text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-500"></span>
            ✅ Completed
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            📖 Reading
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            ⏳ Planned
          </div>
        </div>
      </div>

      {/* Grid Header */}
      <div className="grid grid-cols-12 border-b border-zinc-100 dark:border-zinc-800 text-[10px] uppercase font-black text-zinc-500 tracking-[0.2em] bg-zinc-50/30 dark:bg-zinc-900/10">
        <div className="col-span-2 px-6 py-3 border-r border-zinc-100 dark:border-zinc-800">Month</div>
        <div className="col-span-5 px-6 py-3 border-r border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
          English 📘
        </div>
        <div className="col-span-5 px-6 py-3 flex items-center gap-2">
          Hindi 📗
        </div>
      </div>

      {/* Grid Rows */}
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {MONTHS.map((month) => {
          const entry = yearData[month] || { english: '', hindi: '', englishStatus: 'None', hindiStatus: 'None' };
          
          return (
            <div key={month} className="grid grid-cols-12 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-colors group">
              {/* Month */}
              <div className="col-span-2 px-6 py-4 border-r border-zinc-100 dark:border-zinc-800 flex items-center font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                {month}
              </div>

              {/* English Book */}
              <div className="col-span-5 px-6 py-2 border-r border-zinc-100 dark:border-zinc-800 relative">
                <EditableCell 
                  value={entry.english}
                  status={entry.englishStatus}
                  onUpdate={(title) => updateEntry(month, 'english', 'title', title)}
                  onStatusUpdate={(status) => updateEntry(month, 'english', 'status', status)}
                  placeholder="Enter English book..."
                />
              </div>

              {/* Hindi Book */}
              <div className="col-span-5 px-6 py-2 relative">
                <EditableCell 
                  value={entry.hindi}
                  status={entry.hindiStatus}
                  onUpdate={(title) => updateEntry(month, 'hindi', 'title', title)}
                  onStatusUpdate={(status) => updateEntry(month, 'hindi', 'status', status)}
                  placeholder="Enter Hindi book..."
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface EditableCellProps {
  value: string;
  status: Status;
  onUpdate: (val: string) => void;
  onStatusUpdate: (status: Status) => void;
  placeholder: string;
}

function EditableCell({ value, status, onUpdate, onStatusUpdate, placeholder }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleSubmit = () => {
    onUpdate(localValue);
    setIsEditing(false);
  };

  return (
    <div className="flex items-center gap-3 h-full">
      {/* Status Picker */}
      <div className="flex-shrink-0 group/status relative">
        <button 
          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all border ${
            status === 'None' 
              ? 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50 dark:bg-zinc-900' 
              : 'border-transparent bg-zinc-100 dark:bg-zinc-800 shadow-sm'
          }`}
        >
          {STATUS_ICONS[status] || <Plus size={12} className="text-zinc-400" />}
        </button>
        
        {/* Dropdown overlay */}
        <div className="absolute left-0 top-full mt-1 z-20 hidden group-hover/status:flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-1 w-32 animate-in fade-in slide-in-from-top-1 duration-200">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => onStatusUpdate(opt)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                status === opt 
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white' 
                  : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {STATUS_ICONS[opt] || <div className="w-3.5 h-3.5 border border-zinc-300 dark:border-zinc-700 rounded-full"></div>}
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Title Input/Display */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            autoFocus
            type="text"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder={placeholder}
            className="w-full bg-zinc-100 dark:bg-zinc-900 border-none rounded-lg px-2 py-1.5 text-sm font-medium focus:ring-2 focus:ring-teal-500/30 text-zinc-900 dark:text-white"
          />
        ) : (
          <div 
            onClick={() => setIsEditing(true)}
            className={`cursor-pointer text-sm font-bold truncate transition-colors min-h-[1.25rem] ${
              value 
                ? 'text-zinc-800 dark:text-zinc-200' 
                : 'text-zinc-300 dark:text-zinc-700 italic font-normal text-xs'
            }`}
          >
            {value || placeholder}
          </div>
        )}
      </div>
    </div>
  );
}
