"use client";

import React, { useState, useEffect } from 'react';
import { ReadingQueue } from '@/components/books/ReadingQueue';
import { YearlyReadingLog } from '@/components/books/YearlyReadingLog';
import { CompletedBooks } from '@/components/books/CompletedBooks';
import { CompletedBookModal } from '@/components/books/CompletedBookModal';
import { BookMarked, Sparkles } from 'lucide-react';
import { Book, CompletedBook } from '@/types/books';
import { setSyncedItem } from '@/lib/storage';
import { getPrefixedKey } from '@/lib/keys';

export default function BooksPage() {
  const [mounted, setMounted] = useState(false);
  const [promotedBook, setPromotedBook] = useState<Book | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePromote = (book: Book) => {
    setPromotedBook(book);
  };

  const finalizePromotion = (completedDetails: CompletedBook) => {
    // 1. Add to Completed Books list
    const storedCompleted = localStorage.getItem(getPrefixedKey('os_books_completed'));
    let completedBooks: CompletedBook[] = [];
    if (storedCompleted) {
      try {
        completedBooks = JSON.parse(storedCompleted);
      } catch (e) {}
    }
    completedBooks = [completedDetails, ...completedBooks];
    setSyncedItem('os_books_completed', JSON.stringify(completedBooks));

    // 2. Remove from Queue
    const storedQueue = localStorage.getItem(getPrefixedKey('os_books_queue'));
    if (storedQueue) {
      try {
        const queue: Book[] = JSON.parse(storedQueue);
        const updatedQueue = queue.filter(b => b.id !== promotedBook?.id);
        // Re-index
        const reindexed = updatedQueue.map((b, i) => ({ ...b, order: i + 1 }));
        setSyncedItem('os_books_queue', JSON.stringify(reindexed));
      } catch (e) {}
    }

    setPromotedBook(null);
    window.dispatchEvent(new CustomEvent('local-storage-change', { detail: { key: 'os_books_queue' } }));
    window.dispatchEvent(new CustomEvent('local-storage-change', { detail: { key: 'os_books_completed' } }));
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-teal-500/30 font-sans p-4 md:p-8 xl:p-12 transition-colors duration-200">
      <div className="mx-auto w-full max-w-6xl">
        {/* Header Section */}
        <header className="mb-20 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
          <div className="space-y-4">
            <div className="flex items-center justify-center md:justify-start gap-2 text-teal-600 dark:text-teal-400 font-bold uppercase tracking-widest text-[10px]">
              <Sparkles size={14} className="animate-pulse" />
              Intellectual Growth
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-zinc-900 dark:text-white flex items-center justify-center md:justify-start gap-6">
              <span className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 p-3 rounded-3xl shadow-2xl shadow-zinc-900/20 dark:shadow-white/10 rotate-[-2deg]">
                <BookMarked size={48} />
              </span>
              Books
            </h1>
            <p className="text-xl text-zinc-500 dark:text-zinc-400 mt-6 font-medium max-w-xl leading-relaxed">Track your reading queue, log your yearly progress, and distill wisdom from completed gems.</p>
          </div>
        </header>

        {/* Section 1: Reading Plan */}
        <section className="w-full relative fade-in">
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-xl shadow-sm">
              📚
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              1. Reading Plan <span className="text-zinc-400 dark:text-zinc-500 font-medium ml-1">(Your Queue)</span>
            </h2>
          </div>
          
          <ReadingQueue onPromote={handlePromote} />
        </section>

        {/* Section 2: Yearly Reading Log */}
        <section className="w-full relative mt-24 fade-in">
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-xl shadow-sm">
              📅
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              2. Yearly Reading Log <span className="text-zinc-400 dark:text-zinc-500 font-medium ml-1">(Main View)</span>
            </h2>
          </div>
          
          <YearlyReadingLog />
        </section>

        {/* Section 3: Completed Books + Notes */}
        <section className="w-full relative mt-24 fade-in">
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-xl shadow-sm">
              ✅
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              3. Completed Books + Notes <span className="text-zinc-400 dark:text-zinc-500 font-medium ml-1">(Most Valuable Section)</span>
            </h2>
          </div>
          
          <CompletedBooks />
        </section>

        {/* Footer */}
        <div className="mt-24 pt-12 border-t border-dashed border-zinc-200 dark:border-zinc-800 opacity-40">
          <p className="text-center text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">
            End of Library Dashboard
          </p>
        </div>
      </div>

      {/* Promotion Modal */}
      {promotedBook && (
        <CompletedBookModal
          mode="create"
          book={{
            id: crypto.randomUUID(),
            name: promotedBook.name,
            language: promotedBook.language,
            completionDate: new Date().toISOString().split('T')[0],
            rating: 5,
            notes: '',
            wouldRecommend: true,
            createdAt: new Date().toISOString()
          }}
          onClose={() => setPromotedBook(null)}
          onUpdateBook={finalizePromotion}
          onDeleteBook={() => setPromotedBook(null)}
        />
      )}
    </main>
  );
}
