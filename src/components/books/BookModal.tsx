"use client";

import React, { useState } from 'react';
import type { Book } from '@/types/books';
import { BOOK_CATEGORIES } from '@/types/books';
import { X, Save, Trash2, Globe, BookOpen, Clock, CheckCircle2, User } from 'lucide-react';

interface BookModalProps {
  book: Book;
  onClose: () => void;
  onUpdateBook: (updatedBook: Book) => void;
  onDeleteBook: (bookId: string) => void;
  mode?: 'edit' | 'create';
}

export function BookModal({ book, onClose, onUpdateBook, onDeleteBook, mode = 'edit' }: BookModalProps) {
  const [name, setName] = useState(book.name);
  const [author, setAuthor] = useState(book.author || '');
  const [language, setLanguage] = useState<Book['language']>(book.language);
  const [category, setCategory] = useState(book.category);
  const [status, setStatus] = useState<Book['status']>(book.status);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onUpdateBook({
      ...book,
      name: name.trim(),
      author: author.trim(),
      language,
      category,
      status,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-zinc-900/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSave} className="flex flex-col">
          {/* Header */}
          <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/20">
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                {mode === 'create' ? 'Add New Book' : 'Edit Book Details'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Fill in the details for your reading queue.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6 space-y-5">
            {/* Book Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Book Name</label>
              <div className="relative">
                <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input
                  autoFocus
                  type="text"
                  placeholder="Enter book title..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 font-medium"
                  required
                />
              </div>
            </div>

            {/* Author */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Author</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input
                  type="text"
                  placeholder="Enter author name..."
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Language */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Language</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 font-medium appearance-none"
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                  </select>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Status</label>
                <div className="relative">
                  {status === 'Planned' && <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" size={18} />}
                  {status === 'Reading' && <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500" size={18} />}
                  {status === 'Completed' && <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 text-teal-500" size={18} />}
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 font-medium appearance-none"
                  >
                    <option value="Planned">Planned</option>
                    <option value="Reading">Reading</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Category</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {BOOK_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      category === cat
                        ? 'bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/30 text-teal-700 dark:text-teal-400 shadow-sm'
                        : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/30 dark:bg-zinc-900/10">
            {mode === 'edit' ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this book?')) {
                    onDeleteBook(book.id);
                    onClose();
                  }
                }}
                className="flex items-center gap-2 text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors"
              >
                <Trash2 size={14} />
                Delete Book
              </button>
            ) : (
              <div></div>
            )}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-5 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-zinc-900/10 dark:shadow-white/5"
              >
                <Save size={16} />
                {mode === 'create' ? 'Add to Queue' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
