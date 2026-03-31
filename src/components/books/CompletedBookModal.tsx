"use client";

import React, { useState } from 'react';
import type { CompletedBook } from '@/types/books';
import { 
  X, 
  Save, 
  Trash2, 
  Star, 
  Calendar, 
  MessageSquare, 
  ThumbsUp, 
  ThumbsDown,
  Globe,
  BookOpen
} from 'lucide-react';

interface CompletedBookModalProps {
  book: CompletedBook;
  onClose: () => void;
  onUpdateBook: (updatedBook: CompletedBook) => void;
  onDeleteBook: (bookId: string) => void;
  mode?: 'edit' | 'create';
}

export function CompletedBookModal({ book, onClose, onUpdateBook, onDeleteBook, mode = 'edit' }: CompletedBookModalProps) {
  const [name, setName] = useState(book.name);
  const [language, setLanguage] = useState<CompletedBook['language']>(book.language);
  const [completionDate, setCompletionDate] = useState(book.completionDate);
  const [rating, setRating] = useState(book.rating);
  const [notes, setNotes] = useState(book.notes);
  const [wouldRecommend, setWouldRecommend] = useState(book.wouldRecommend);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onUpdateBook({
      ...book,
      name: name.trim(),
      language,
      completionDate,
      rating,
      notes: notes.trim(),
      wouldRecommend,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 bg-zinc-900/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSave} className="flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="px-8 py-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-teal-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20">
                <CheckCircle2Icon size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                  {mode === 'create' ? 'Log Completed Book' : 'Edit Insights'}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest mt-1 opacity-70">
                  Capturing value from your reading
                </p>
              </div>
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
          <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
            {/* Book Name */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-zinc-400 tracking-[0.2em] ml-1">Book Title</label>
              <div className="relative">
                <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input
                  autoFocus
                  type="text"
                  placeholder="What was the book called?"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-900/50 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl pl-12 pr-4 py-3.5 text-zinc-900 dark:text-white focus:outline-none focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/5 transition-all font-bold text-lg"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Language */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-zinc-400 tracking-[0.2em] ml-1">Language</label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className="w-full bg-zinc-50 dark:bg-zinc-900/50 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl pl-12 pr-4 py-3.5 text-zinc-900 dark:text-white focus:outline-none focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/5 transition-all font-bold appearance-none"
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                  </select>
                </div>
              </div>

              {/* Completion Date */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-black text-zinc-400 tracking-[0.2em] ml-1">Finished On</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input
                    type="date"
                    value={completionDate}
                    onChange={(e) => setCompletionDate(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-900/50 border-2 border-zinc-100 dark:border-zinc-800 rounded-2xl pl-12 pr-4 py-3.5 text-zinc-900 dark:text-white focus:outline-none focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/5 transition-all font-bold"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Rating */}
            <div className="space-y-3 p-5 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase font-black text-zinc-400 tracking-[0.2em]">Overall Rating</label>
                <span className="text-xs font-black text-teal-600 dark:text-teal-400">{rating}/5 Stars</span>
              </div>
              <div className="flex items-center gap-2 justify-center py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all ${
                      rating >= star 
                        ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-500 scale-110 shadow-lg shadow-amber-500/10' 
                        : 'bg-white dark:bg-zinc-800 text-zinc-300 dark:text-zinc-700 hover:bg-amber-50 dark:hover:bg-amber-500/5'
                    }`}
                  >
                    <Star size={24} fill={rating >= star ? "currentColor" : "none"} strokeWidth={2.5} />
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black text-zinc-400 tracking-[0.2em] ml-1">Key Insights & Takeaways</label>
              <div className="relative">
                <MessageSquare className="absolute left-4 top-4 text-zinc-400" size={18} />
                <textarea
                  placeholder="What was the most valuable thing you learned? (Short insights...)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full bg-zinc-50 dark:bg-zinc-900/50 border-2 border-zinc-100 dark:border-zinc-800 rounded-3xl pl-12 pr-4 py-4 text-zinc-900 dark:text-white focus:outline-none focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/5 transition-all font-medium leading-relaxed resize-none"
                />
              </div>
            </div>

            {/* Recommendation */}
            <div className="flex items-center justify-between p-5 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-zinc-100 dark:border-zinc-800">
              <label className="text-[10px] uppercase font-black text-zinc-400 tracking-[0.2em]">Would you recommend it?</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setWouldRecommend(true)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                    wouldRecommend
                      ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20'
                      : 'bg-white dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                  }`}
                >
                  <ThumbsUp size={14} /> YES
                </button>
                <button
                  type="button"
                  onClick={() => setWouldRecommend(false)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                    !wouldRecommend
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                      : 'bg-white dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                  }`}
                >
                  <ThumbsDown size={14} /> NO
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-8 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/30 dark:bg-zinc-900/10">
            {mode === 'edit' ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Are you sure you want to remove this record?')) {
                    onDeleteBook(book.id);
                    onClose();
                  }
                }}
                className="flex items-center gap-2 text-xs font-black text-rose-500 hover:text-rose-600 transition-colors uppercase tracking-widest"
              >
                <Trash2 size={16} />
                Delete Record
              </button>
            ) : (
              <div></div>
            )}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onClose}
                className="text-sm font-black text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-8 py-4 rounded-2xl text-base font-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-zinc-900/10 dark:shadow-white/5"
              >
                <Save size={20} />
                {mode === 'create' ? 'Save Review' : 'Update Review'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function CheckCircle2Icon({ size, className }: { size?: number, className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size || 24} 
      height={size || 24} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
