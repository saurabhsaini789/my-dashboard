"use client";

import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  BookOpen, 
  CheckCircle2, 
  Clock, 
  MoreVertical,
  Search,
  Plus
} from 'lucide-react';
import { MultiYearLogData, MonthlyEntry, YearlyLogData, LogBookEntry } from '@/types/books';
import { setSyncedItem } from '@/lib/storage';
import { getPrefixedKey } from '@/lib/keys';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

type Status = LogBookEntry['status'];

const STATUS_ICONS: Record<Status, React.ReactNode> = {
  'Completed': <CheckCircle2 size={14} className="text-teal-500" />,
  'Reading': <BookOpen size={14} className="text-blue-500" />,
  'Planned': <Clock size={14} className="text-amber-500" />,
  'None': null
};

const STATUS_OPTIONS: Status[] = ['None', 'Planned', 'Reading', 'Completed'];

export function YearlyReadingLog({ onPromote }: { onPromote?: (name: string, author: string, language: 'English' | 'Hindi') => void }) {
  const [data, setData] = useState<MultiYearLogData>({});
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const dataRef = React.useRef(data);
  const [modalState, setModalState] = useState<{ isOpen: boolean; month: string; type: 'english' | 'hindi' } | null>(null);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const migrateData = (oldData: any): MultiYearLogData => {
    const newData: MultiYearLogData = {};
    
    Object.keys(oldData).forEach(yearStr => {
      const year = parseInt(yearStr);
      const yearEntries = oldData[year];
      const newYearEntries: YearlyLogData = {};
      
      Object.keys(yearEntries).forEach(month => {
        const entry = yearEntries[month];
        // Check if it's the old format
        if (entry && ('english' in entry || 'hindi' in entry)) {
          const englishBooks: LogBookEntry[] = [];
          const hindiBooks: LogBookEntry[] = [];
          
          if (entry.english) {
            englishBooks.push({ 
              id: crypto.randomUUID(), 
              title: entry.english, 
              author: '', 
              status: entry.englishStatus || 'None' 
            });
          }
          if (entry.hindi) {
            hindiBooks.push({ 
              id: crypto.randomUUID(), 
              title: entry.hindi, 
              author: '', 
              status: entry.hindiStatus || 'None' 
            });
          }
          
          newYearEntries[month] = { englishBooks, hindiBooks };
        } else if (entry) {
          // Ensure every book has an author field
          const englishBooks = (entry.englishBooks || []).map((b: any) => ({ ...b, author: b.author || '' }));
          const hindiBooks = (entry.hindiBooks || []).map((b: any) => ({ ...b, author: b.author || '' }));
          newYearEntries[month] = { englishBooks, hindiBooks };
        } else {
          newYearEntries[month] = { englishBooks: [], hindiBooks: [] };
        }
      });
      newData[year] = newYearEntries;
    });
    
    return newData;
  };

  // Load data
  useEffect(() => {
    const stored = localStorage.getItem(getPrefixedKey('os_books_yearly_log'));
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setData(migrateData(parsed));
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
            const migrated = migrateData(newVal);
            if (JSON.stringify(migrated) !== JSON.stringify(dataRef.current)) {
              setData(migrated);
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

  const updateBook = (month: string, type: 'english' | 'hindi', bookId: string, updates: Partial<LogBookEntry>) => {
    setData(prev => {
      const yearData = { ...(prev[currentYear] || {}) };
      const monthData = { ...(yearData[month] || { englishBooks: [], hindiBooks: [] }) };
      const key = type === 'english' ? 'englishBooks' : 'hindiBooks';
      
      monthData[key] = monthData[key].map(book => {
        if (book.id === bookId) {
          const updatedBook = { ...book, ...updates };
          // Trigger promotion if status changed to Completed
          if (updates.status === 'Completed' && book.status !== 'Completed' && onPromote) {
            onPromote(updatedBook.title, updatedBook.author, type === 'english' ? 'English' : 'Hindi');
          }
          return updatedBook;
        }
        return book;
      });

      yearData[month] = monthData;
      return { ...prev, [currentYear]: yearData };
    });
  };

  const openAddModal = (month: string, type: 'english' | 'hindi') => {
    setModalState({ isOpen: true, month, type });
  };

  const handleModalSave = (title: string, author: string, status: Status) => {
    if (!modalState) return;
    const { month, type } = modalState;
    
    setData(prev => {
      const yearData = { ...(prev[currentYear] || {}) };
      const monthData = { ...(yearData[month] || { englishBooks: [], hindiBooks: [] }) };
      const key = type === 'english' ? 'englishBooks' : 'hindiBooks';
      
      const newBook: LogBookEntry = {
        id: crypto.randomUUID(),
        title,
        author,
        status
      };
      
      monthData[key] = [...monthData[key], newBook];
      yearData[month] = monthData;
      return { ...prev, [currentYear]: yearData };
    });
    setModalState(null);
  };

  const removeBook = (month: string, type: 'english' | 'hindi', bookId: string) => {
    setData(prev => {
      const yearData = { ...(prev[currentYear] || {}) };
      const monthData = { ...(yearData[month] || { englishBooks: [], hindiBooks: [] }) };
      const key = type === 'english' ? 'englishBooks' : 'hindiBooks';
      
      monthData[key] = monthData[key].filter(b => b.id !== bookId);
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
          
          {/* Mobile Collapse Toggle */}
          <button 
            onClick={() => setIsMobileExpanded(!isMobileExpanded)}
            className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 border border-teal-500/20 active:scale-95 transition-all"
          >
            {isMobileExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        <div className="flex flex-1 items-center gap-4 w-full sm:max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input
              type="text"
              placeholder="Search books or authors in log..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all placeholder:text-zinc-400"
            />
          </div>
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

      {/* Table View (Desktop) */}
      <div className="hidden lg:block">
        {/* Grid Header */}
        <div className="grid grid-cols-12 border-b border-zinc-100 dark:border-zinc-800 text-[13px] uppercase font-black text-zinc-500 tracking-[0.2em] bg-zinc-50/30 dark:bg-zinc-900/10">
          <div className="col-span-2 px-6 py-4 border-r border-zinc-100 dark:border-zinc-800 text-center">Month</div>
          <div className="col-span-5 px-6 py-4 border-r border-zinc-100 dark:border-zinc-800 flex items-center justify-center gap-2">
            English 📘
          </div>
          <div className="col-span-5 px-6 py-4 flex items-center justify-center gap-2">
            Hindi 📗
          </div>
        </div>

        {/* Grid Rows */}
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {MONTHS.map((month) => {
            const entry = yearData[month] || { englishBooks: [], hindiBooks: [] };
            
            const filterBooks = (books: LogBookEntry[]) => books.filter(b => 
              b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
              (b.author || '').toLowerCase().includes(searchQuery.toLowerCase())
            );

            const filteredEnglish = filterBooks(entry.englishBooks);
            const filteredHindi = filterBooks(entry.hindiBooks);

            if (searchQuery && filteredEnglish.length === 0 && filteredHindi.length === 0) return null;
            
            return (
              <div key={month} className="grid grid-cols-12 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-colors group/row min-h-[64px]">
                <div className="col-span-2 px-6 py-4 border-r border-zinc-100 dark:border-zinc-800 flex items-center justify-center font-black text-zinc-400 dark:text-zinc-600 text-sm uppercase tracking-widest">
                  {month.slice(0, 3)}
                </div>

                <div className="col-span-5 px-4 py-4 border-r border-zinc-100 dark:border-zinc-800 flex items-start gap-3">
                  {!searchQuery && (
                    <button 
                      onClick={() => openAddModal(month, 'english')}
                      className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-300 hover:text-teal-500 hover:border-teal-500/30 hover:bg-teal-500/5 transition-all group/add"
                      title="Add Book"
                    >
                      <Plus size={14} />
                    </button>
                  )}
                  <div className="flex-1 min-w-0 space-y-3">
                    {filteredEnglish.map(book => (
                      <EditableBookRow 
                        key={book.id}
                        book={book}
                        onUpdate={(updates) => updateBook(month, 'english', book.id, updates)}
                        onRemove={() => removeBook(month, 'english', book.id)}
                        placeholder="English book name..."
                      />
                    ))}
                  </div>
                </div>

                <div className="col-span-5 px-4 py-4 flex items-start gap-3">
                  {!searchQuery && (
                    <button 
                      onClick={() => openAddModal(month, 'hindi')}
                      className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-300 hover:text-rose-500 hover:border-rose-500/30 hover:bg-rose-500/5 transition-all group/add"
                      title="Add Book"
                    >
                      <Plus size={14} />
                    </button>
                  )}
                  <div className="flex-1 min-w-0 space-y-3">
                    {filteredHindi.map(book => (
                      <EditableBookRow 
                        key={book.id}
                        book={book}
                        onUpdate={(updates) => updateBook(month, 'hindi', book.id, updates)}
                        onRemove={() => removeBook(month, 'hindi', book.id)}
                        placeholder="Hindi book name..."
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Card View (Mobile) */}
      <div className={`block lg:hidden transition-all duration-500 ease-in-out overflow-hidden ${
        (isMobileExpanded || searchQuery) ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="max-h-[520px] overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
          {MONTHS.map((month) => {
            const entry = yearData[month] || { englishBooks: [], hindiBooks: [] };
            
            const filterBooks = (books: LogBookEntry[]) => books.filter(b => 
              b.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
              (b.author || '').toLowerCase().includes(searchQuery.toLowerCase())
            );

            const filteredEnglish = filterBooks(entry.englishBooks);
            const filteredHindi = filterBooks(entry.hindiBooks);

            if (searchQuery && filteredEnglish.length === 0 && filteredHindi.length === 0) return null;

            return (
              <div key={month} className="p-4 space-y-4 bg-white dark:bg-zinc-950">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-zinc-500 uppercase tracking-widest">{month}</span>
                </div>

                <div className="space-y-6">
                  {/* English Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">English 📘</span>
                      {!searchQuery && (
                        <button 
                          onClick={() => openAddModal(month, 'english')}
                          className="w-6 h-6 flex items-center justify-center rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-300"
                        >
                          <Plus size={12} />
                        </button>
                      )}
                    </div>
                    <div className="space-y-3 pl-2 border-l-2 border-zinc-100 dark:border-zinc-800/50">
                      {filteredEnglish.length > 0 ? filteredEnglish.map(book => (
                        <EditableBookRow 
                          key={book.id}
                          book={book}
                          onUpdate={(updates) => updateBook(month, 'english', book.id, updates)}
                          onRemove={() => removeBook(month, 'english', book.id)}
                          placeholder="Title..."
                        />
                      )) : (
                        <span className="text-[10px] text-zinc-300 dark:text-zinc-700 italic">No entries</span>
                      )}
                    </div>
                  </div>

                  {/* Hindi Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Hindi 📗</span>
                      {!searchQuery && (
                        <button 
                          onClick={() => openAddModal(month, 'hindi')}
                          className="w-6 h-6 flex items-center justify-center rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-300"
                        >
                          <Plus size={12} />
                        </button>
                      )}
                    </div>
                    <div className="space-y-3 pl-2 border-l-2 border-zinc-100 dark:border-zinc-800/50">
                      {filteredHindi.length > 0 ? filteredHindi.map(book => (
                        <EditableBookRow 
                          key={book.id}
                          book={book}
                          onUpdate={(updates) => updateBook(month, 'hindi', book.id, updates)}
                          onRemove={() => removeBook(month, 'hindi', book.id)}
                          placeholder="Title..."
                        />
                      )) : (
                        <span className="text-[10px] text-zinc-300 dark:text-zinc-700 italic">No entries</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Mobile View Indicators */}
        <div className="px-6 py-3 bg-zinc-50/50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 flex justify-center">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-zinc-300"></div>
                Scroll to see more months
                <div className="w-1 h-1 rounded-full bg-zinc-300"></div>
            </span>
        </div>
      </div>
      
      {modalState && modalState.isOpen && (
        <AddLogBookModal
          month={modalState.month}
          type={modalState.type}
          onClose={() => setModalState(null)}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
}

function EditableBookRow({ book, onUpdate, onRemove, placeholder }: { 
  book: LogBookEntry, 
  onUpdate: (updates: Partial<LogBookEntry>) => void,
  onRemove: () => void,
  placeholder: string 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [localTitle, setLocalTitle] = useState(book.title);
  const [localAuthor, setLocalAuthor] = useState(book.author || '');

  useEffect(() => {
    setLocalTitle(book.title);
    setLocalAuthor(book.author || '');
  }, [book.title, book.author]);

  const handleSubmit = () => {
    if (localTitle !== book.title || localAuthor !== book.author) {
      onUpdate({ title: localTitle, author: localAuthor });
    }
    setIsEditing(false);
  };

  return (
    <div className="flex items-center gap-2 group/book animate-in fade-in slide-in-from-left-2 duration-300">
      {/* Status Picker */}
      <div className="flex-shrink-0 group/status relative">
        <button 
          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all border ${
            book.status === 'None' 
              ? 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-300' 
              : 'border-transparent bg-zinc-100 dark:bg-zinc-800 shadow-sm'
          }`}
        >
          {STATUS_ICONS[book.status] || <Plus size={12} />}
        </button>
        
        <div className="absolute left-0 top-full mt-1 z-20 hidden group-hover/status:flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-1 w-32">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => onUpdate({ status: opt })}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${
                book.status === opt 
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white' 
                  : 'text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {STATUS_ICONS[opt] || <div className="w-3.5 h-3.5 border border-zinc-200 dark:border-zinc-700 rounded-full"></div>}
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex flex-col gap-1">
            <input
              autoFocus
              type="text"
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              onBlur={handleSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder={placeholder}
              className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-md px-2 py-1 text-xs font-bold focus:ring-2 focus:ring-teal-500/30 text-zinc-900 dark:text-white"
            />
            <input
              type="text"
              value={localAuthor}
              onChange={(e) => setLocalAuthor(e.target.value)}
              onBlur={handleSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Author..."
              className="w-full bg-zinc-50 dark:bg-zinc-900/50 border-none rounded-md px-2 py-0.5 text-[11px] font-black uppercase tracking-wider focus:ring-1 focus:ring-zinc-500/30 text-zinc-500 dark:text-zinc-400"
            />
          </div>
        ) : (
          <div 
            onClick={() => setIsEditing(true)}
            className="cursor-pointer transition-colors"
          >
            <div className={`text-base font-black leading-tight truncate ${
              book.title 
                ? 'text-zinc-800 dark:text-zinc-200' 
                : 'text-zinc-300 dark:text-zinc-700 italic font-normal'
            }`}>
              {book.title || placeholder}
            </div>
            {book.author && (
              <div className="text-xs font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mt-1 truncate">
                {book.author}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <button 
        onClick={onRemove}
        className="opacity-0 group-hover/book:opacity-100 p-1 text-zinc-300 hover:text-rose-500 transition-all"
      >
        <Plus size={12} className="rotate-45" />
      </button>
    </div>
  );
}

function AddLogBookModal({
  month,
  type,
  onClose,
  onSave
}: {
  month: string;
  type: 'english' | 'hindi';
  onClose: () => void;
  onSave: (title: string, author: string, status: Status) => void;
}) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [status, setStatus] = useState<Status>('Planned');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave(title.trim(), author.trim(), status);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/40 dark:bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-md shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">Add Book details</h3>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-1">
                {month} • {type === 'english' ? 'English' : 'Hindi'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              <Plus size={16} className="rotate-45" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                Book Name
              </label>
              <input
                autoFocus
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Atomic Habits..."
                className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/50 text-zinc-900 dark:text-white transition-all placeholder:font-normal placeholder:opacity-50"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                Author Name
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="James Clear..."
                className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-teal-500/50 text-zinc-900 dark:text-white transition-all placeholder:font-normal placeholder:opacity-50"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                Phase
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setStatus(opt)}
                    className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-all ${
                      status === opt
                        ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 shadow-sm scale-100'
                        : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 text-zinc-500 scale-95 opacity-70'
                    }`}
                  >
                    {STATUS_ICONS[opt] || <div className="w-4 h-4 rounded-full border border-current"></div>}
                    <span className={`text-[10px] font-black uppercase ${status === opt ? 'text-zinc-900 dark:text-white' : 'text-zinc-500'}`}>
                      {opt === 'None' ? 'TBD' : opt}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 mt-6 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="submit"
                disabled={!title.trim()}
                className="w-full flex items-center justify-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 py-3.5 rounded-xl text-sm font-black hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                Save to Log
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
