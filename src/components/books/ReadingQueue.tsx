"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  GripVertical, 
  Plus, 
  Search, 
  Filter, 
  Languages, 
  Tag, 
  TrendingUp,
  Book as BookIcon,
  Clock,
  CheckCircle2
} from 'lucide-react';

import { Book, BOOK_CATEGORIES } from '@/types/books';
import { BookModal } from './BookModal';
import { setSyncedItem } from '@/lib/storage';
import { getPrefixedKey } from '@/lib/keys';

// --- Sortable Item Component ---

interface SortableItemProps {
  book: Book;
  onEdit: (book: Book) => void;
}

function SortableItem({ book, onEdit }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: book.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  const getStatusStyle = (status: Book['status']) => {
    switch (status) {
      case 'Planned': return 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20';
      case 'Reading': return 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-500/20';
      case 'Completed': return 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-100 dark:border-teal-500/20';
      default: return 'bg-zinc-50 dark:bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-100 dark:border-zinc-500/20';
    }
  };

  const getStatusIcon = (status: Book['status']) => {
    switch (status) {
      case 'Planned': return <Clock size={12} />;
      case 'Reading': return <BookIcon size={12} />;
      case 'Completed': return <CheckCircle2 size={12} />;
      default: return null;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-4 p-4 mb-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl transition-all ${
        isDragging ? 'shadow-2xl border-teal-500/50 scale-[1.02]' : 'hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700'
      }`}
    >
      {/* Drag Handle */}
      <div 
        {...attributes} 
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
      >
        <GripVertical size={20} />
      </div>

      {/* Order Number */}
      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm font-bold text-zinc-500 dark:text-zinc-400">
        {book.order}
      </div>

      {/* Name & Details */}
      <div className="flex-1 min-w-0" onClick={() => onEdit(book)}>
        <h4 className="font-bold text-zinc-900 dark:text-white truncate group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors cursor-pointer">
          {book.name}
        </h4>
        <div className="flex flex-wrap items-center gap-3 mt-1.5">
          <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
            <Languages size={10} />
            {book.language}
          </span>
          {book.category && (
            <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
              <Tag size={10} />
              {book.category}
            </span>
          )}
        </div>
      </div>

      {/* Status Badge */}
      <div 
        className={`px-3 py-1.5 rounded-full text-[11px] font-bold border flex items-center gap-1.5 transition-colors ${getStatusStyle(book.status)}`}
      >
        {getStatusIcon(book.status)}
        {book.status}
      </div>
    </div>
  );
}

interface ReadingQueueProps {
  onPromote?: (book: Book) => void;
}

export function ReadingQueue({ onPromote }: ReadingQueueProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const booksRef = React.useRef(books);

  useEffect(() => {
    booksRef.current = books;
  }, [books]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load data
  useEffect(() => {
    const stored = localStorage.getItem(getPrefixedKey('os_books_queue'));
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setBooks(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        console.error('Failed to parse books queue data', e);
      }
    }
    setIsLoaded(true);

    const handleLocalUpdate = (e: any) => {
      if (e.detail && e.detail.key === 'os_books_queue') {
        const val = localStorage.getItem(getPrefixedKey('os_books_queue'));
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
      setSyncedItem('os_books_queue', JSON.stringify(books));
    }
  }, [books, isLoaded]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setBooks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        
        const newArray = arrayMove(items, oldIndex, newIndex);
        
        // Update order numbers based on new position
        return newArray.map((book, index) => ({
          ...book,
          order: index + 1
        }));
      });
    }
  };

  const handleAddBook = (newBook: Book) => {
    const bookWithId = {
      ...newBook,
      id: crypto.randomUUID(),
      order: books.length + 1,
      createdAt: new Date().toISOString()
    };
    setBooks([...books, bookWithId]);
  };

  const handleUpdateBook = (updatedBook: Book) => {
    setBooks(books.map(b => b.id === updatedBook.id ? updatedBook : b));
    
    // Check for promotion
    if (updatedBook.status === 'Completed' && onPromote) {
      onPromote(updatedBook);
    }
  };

  const handleDeleteBook = (id: string) => {
    const remaining = books.filter(b => b.id !== id);
    // Re-index order numbers
    setBooks(remaining.map((b, i) => ({ ...b, order: i + 1 })));
  };

  const filteredBooks = books.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.category && b.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!isLoaded) return (
    <div className="animate-pulse space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-20 bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl w-full"></div>
      ))}
    </div>
  );

  return (
    <div className="w-full">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input
            type="text"
            placeholder="Search books or categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-11 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/50 shadow-sm transition-all"
          />
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-6 py-2.5 rounded-2xl text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-zinc-900/10 dark:shadow-white/5"
        >
          <Plus size={18} />
          Add Book
        </button>
      </div>

      {/* Queue List */}
      {books.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-zinc-900 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800/50 rounded-full flex items-center justify-center text-zinc-400">
            <BookIcon size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Your queue is empty</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs mx-auto">
              Start your intentional reading journey by adding books you plan to read.
            </p>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="mt-2 text-sm font-bold text-teal-600 dark:text-teal-400 hover:underline"
          >
            Add your first book
          </button>
        </div>
      ) : (
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={books.map(b => b.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="fade-in">
              {filteredBooks.map((book) => (
                <SortableItem 
                  key={book.id} 
                  book={book} 
                  onEdit={setSelectedBook}
                />
              ))}
              {filteredBooks.length === 0 && (
                <p className="text-center py-10 text-zinc-500 italic">No books match your search.</p>
              )}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Info Card */}
      <div className="mt-12 p-6 bg-teal-50/50 dark:bg-teal-500/5 border border-teal-100/50 dark:border-teal-500/10 rounded-3xl flex flex-col sm:flex-row items-center gap-6">
        <div className="w-12 h-12 bg-white dark:bg-zinc-900 rounded-2xl flex items-center justify-center shadow-sm text-teal-500 flex-shrink-0">
          <TrendingUp size={24} />
        </div>
        <div>
          <h4 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            👉 Why this matters
          </h4>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
            Intentional reading gives your journey direction instead of random consumption. 
            Prioritize your queue based on your current goals and curiosities.
          </p>
        </div>
      </div>

      {/* Modals */}
      {(selectedBook || isAdding) && (
        <BookModal
          mode={isAdding ? 'create' : 'edit'}
          book={selectedBook || {
            id: '',
            order: books.length + 1,
            name: '',
            language: 'English',
            category: 'Self-help',
            status: 'Planned',
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
