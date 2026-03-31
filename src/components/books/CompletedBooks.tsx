"use client";

import React, { useState, useEffect } from 'react';
import { 
  Star, 
  Search, 
  Plus, 
  Trash2, 
  Languages, 
  Calendar, 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown,
  Quote,
  TrendingUp,
  LayoutGrid,
  List as ListIcon,
  ChevronDown,
  BookCheck,
  Library
} from 'lucide-react';

import { CompletedBook } from '@/types/books';
import { CompletedBookModal } from './CompletedBookModal';
import { setSyncedItem } from '@/lib/storage';
import { getPrefixedKey } from '@/lib/keys';

export function CompletedBooks() {
  const [books, setBooks] = useState<CompletedBook[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState<CompletedBook | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const booksRef = React.useRef(books);

  useEffect(() => {
    booksRef.current = books;
  }, [books]);

  // Load data
  useEffect(() => {
    const stored = localStorage.getItem(getPrefixedKey('os_books_completed'));
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setBooks(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        console.error('Failed to parse completed books data', e);
      }
    }
    setIsLoaded(true);

    const handleLocalUpdate = (e: any) => {
      if (e.detail && e.detail.key === 'os_books_completed') {
        const val = localStorage.getItem(getPrefixedKey('os_books_completed'));
        if (val) {
          try {
            const newVal = JSON.parse(val);
            if (JSON.stringify(newVal) !== JSON.stringify(booksRef.current)) {
              setBooks(newVal);
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
      setSyncedItem('os_books_completed', JSON.stringify(books));
    }
  }, [books, isLoaded]);

  const handleAddBook = (newBook: CompletedBook) => {
    const bookWithId = {
      ...newBook,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    setBooks([bookWithId, ...books]); // Newest first
  };

  const handleUpdateBook = (updatedBook: CompletedBook) => {
    setBooks(books.map(b => b.id === updatedBook.id ? updatedBook : b));
  };

  const handleDeleteBook = (id: string) => {
    setBooks(books.filter(b => b.id !== id));
  };

  const filteredBooks = books.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.notes.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isLoaded) return <div className="h-96 animate-pulse bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800"></div>;

  return (
    <div className="w-full">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-10">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
          <input
            type="text"
            placeholder="Search titles, insights, or ratings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 rounded-[1.25rem] pl-12 pr-4 py-3 text-sm font-bold focus:outline-none focus:border-teal-500/50 shadow-sm transition-all"
          />
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="bg-zinc-100 dark:bg-zinc-900 p-1 rounded-2xl flex items-center gap-1 shadow-inner">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-zinc-800 text-teal-500 shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`}
            >
              <LayoutGrid size={20} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white dark:bg-zinc-800 text-teal-500 shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`}
            >
              <ListIcon size={20} />
            </button>
          </div>
          
          <button
            onClick={() => setIsAdding(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 py-3 rounded-2xl text-sm font-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-zinc-900/10 dark:shadow-white/5"
          >
            <Plus size={20} />
            Add Completed
          </button>
        </div>
      </div>

      {/* Grid view */}
      {books.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-zinc-950 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-[2.5rem] flex flex-col items-center gap-6">
          <div className="w-20 h-20 bg-teal-50 dark:bg-teal-500/10 rounded-[1.75rem] flex items-center justify-center text-teal-500 shadow-inner">
            <Star size={40} fill="currentColor" />
          </div>
          <div className="max-w-md px-6">
            <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Capture Your Best Insights</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 font-bold uppercase tracking-widest opacity-60">
              The real value of reading is in the notes and ratings you keep.
            </p>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="text-teal-600 dark:text-teal-400 font-black hover:underline tracking-widest text-xs uppercase"
          >
            Log your first book
          </button>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
          {filteredBooks.map((book) => (
            <BookCard 
              key={book.id} 
              book={book} 
              viewMode={viewMode}
              onEdit={() => setSelectedBook(book)} 
            />
          ))}
          {filteredBooks.length === 0 && (
            <p className="col-span-full text-center py-10 text-zinc-500 italic opacity-50 font-medium">No completed books match your search.</p>
          )}
        </div>
      )}

      {/* Stats/Insights Summary */}
      {books.length > 0 && (
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <StatCard 
            icon={<BookCheck className="text-teal-500" size={24} />}
            value={books.length.toString()}
            description="Total books finished"
          />
          <StatCard 
            icon={<Library className="text-rose-500" size={24} />}
            value={`${books.filter(b => b.language === 'Hindi').length} / ${books.filter(b => b.language === 'English').length}`}
            description="Completion: Hin / Eng"
          />
        </div>
      )}

      {/* Modals */}
      {(selectedBook || isAdding) && (
        <CompletedBookModal
          mode={isAdding ? 'create' : 'edit'}
          book={selectedBook || {
            id: '',
            name: '',
            author: '',
            language: 'English',
            completionDate: new Date().toISOString().split('T')[0],
            rating: 5,
            notes: '',
            wouldRecommend: true,
            createdAt: new Date().toISOString()
          }}
          onClose={() => {
            setSelectedBook(null);
            setIsAdding(false);
          }}
          onUpdateBook={isAdding ? handleAddBook : handleUpdateBook}
          onDeleteBook={handleDeleteBook}
        />
      )}
    </div>
  );
}

function BookCard({ book, viewMode, onEdit }: { book: CompletedBook, viewMode: 'grid' | 'list', onEdit: () => void }) {
  if (viewMode === 'list') {
    return (
      <div 
        onClick={onEdit}
        className="group flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl hover:border-teal-500/30 transition-all cursor-pointer shadow-sm hover:shadow-md"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-black text-lg text-zinc-900 dark:text-white truncate tracking-tight">{book.name}</h4>
            <span className="text-[10px] font-black uppercase text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded-md tracking-wider">
              {book.language}
            </span>
          </div>
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-2">
            {book.author || 'Unknown Author'}
          </div>
          <div className="flex items-center gap-3 text-xs font-bold text-zinc-400">
            <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(book.completionDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <span className="flex items-center gap-1">
              {book.wouldRecommend ? <ThumbsUp size={12} className="text-teal-500" /> : <ThumbsDown size={12} className="text-rose-500" />}
              {book.wouldRecommend ? 'Recommended' : 'Mixed'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 rounded-2xl group-hover:scale-110 transition-transform">
          <Star size={14} className="text-amber-500" fill="currentColor" />
          <span className="text-sm font-black text-amber-600 dark:text-amber-400">{book.rating}</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={onEdit}
      className="group flex flex-col bg-white dark:bg-zinc-950 border-2 border-zinc-100 dark:border-zinc-800 rounded-[2.5rem] p-8 hover:border-teal-500/30 transition-all cursor-pointer relative overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1"
    >
      {/* Visual Accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 -mr-16 -mt-16 rounded-full group-hover:scale-150 transition-transform duration-700"></div>

      <div className="flex flex-col gap-5 relative z-10">
        {/* Header: Name & Rating */}
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 opacity-60">{book.language}</span>
              {book.wouldRecommend && <ThumbsUp size={10} className="text-teal-500" />}
            </div>
            <h4 className="font-black text-2xl text-zinc-900 dark:text-white tracking-tight leading-tight group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
              {book.name}
            </h4>
            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-600 mt-2">
              {book.author || 'Unknown Author'}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  size={12} 
                  className={i < book.rating ? "text-amber-500" : "text-zinc-200 dark:text-zinc-800"} 
                  fill={i < book.rating ? "currentColor" : "none"} 
                />
              ))}
            </div>
          </div>
        </div>

        <div className="h-px bg-zinc-100 dark:bg-zinc-800 w-full"></div>

        {/* Notes Preview */}
        <div className="relative">
          <Quote className="absolute -left-2 -top-2 text-teal-500/10 dark:text-teal-500/5 rotate-180" size={32} />
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 line-clamp-3 leading-relaxed italic">
            "{book.notes || 'No notes captured yet...'}"
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400">
            <Calendar size={12} className="opacity-40" />
            {new Date(book.completionDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
            book.wouldRecommend ? 'bg-teal-50 dark:bg-teal-500/10 text-teal-600' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
          }`}>
            {book.wouldRecommend ? 'Highly Recommended' : 'Completed'}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, value, description }: { icon: React.ReactNode, value: string, description: string }) {
  return (
    <div className="bg-white dark:bg-zinc-950 border-2 border-zinc-50 dark:border-zinc-900 p-6 rounded-[2.5rem] flex items-center gap-6 shadow-sm hover:shadow-xl hover:border-teal-500/10 transition-all duration-300 group relative overflow-hidden">
      <div className="w-14 h-14 bg-zinc-50 dark:bg-zinc-900 rounded-2xl flex items-center justify-center shadow-inner shrink-0 group-hover:scale-105 transition-transform duration-500">
        {icon}
      </div>

      <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
        <h4 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight leading-none truncate group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
          {description}
        </h4>
        <p className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter shrink-0 tabular-nums">
          {value}
        </p>
      </div>
      
      {/* Subtle border accent */}
      <div className="absolute right-0 top-0 h-full w-1.5 bg-zinc-50 dark:bg-zinc-900 group-hover:bg-teal-500/20 transition-colors"></div>
    </div>
  );
}
