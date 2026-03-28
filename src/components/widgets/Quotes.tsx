"use client";

import React, { useState, useEffect } from "react";
import { setSyncedItem } from "@/lib/storage";

type Quote = {
  id: string;
  text: string;
  author: string;
};

const defaultQuotes: Quote[] = [
  { id: "1", text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
  { id: "2", text: "Discipline equals freedom.", author: "Jocko Willink" },
  { id: "3", text: "Don't stop when you're tired. Stop when you're done.", author: "David Goggins" }
];

export function Quotes() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newQuoteText, setNewQuoteText] = useState("");
  const [newQuoteAuthor, setNewQuoteAuthor] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("dashboard_quotes");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          setQuotes(parsed);
        } else {
          setQuotes(defaultQuotes);
        }
      } catch (e) {
        setQuotes(defaultQuotes);
      }
    } else {
      setQuotes(defaultQuotes);
    }
    setIsLoaded(true);

    const handleLocalUpdate = (e: any) => {
      if (e.detail && e.detail.key === 'dashboard_quotes') {
        const val = localStorage.getItem('dashboard_quotes');
        if (val) {
          try {
            setQuotes(JSON.parse(val));
          } catch (e) {}
        }
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'dashboard_quotes' && e.newValue) {
        try {
          setQuotes(JSON.parse(e.newValue));
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
      setSyncedItem("dashboard_quotes", JSON.stringify(quotes));
    }
  }, [quotes, isLoaded]);

  const handleAddQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuoteText.trim()) return;

    const newQuote: Quote = {
      id: crypto.randomUUID(),
      text: newQuoteText.trim(),
      author: newQuoteAuthor.trim() || "Anonymous"
    };

    setQuotes([newQuote, ...quotes]);
    setNewQuoteText("");
    setNewQuoteAuthor("");
    setIsAdding(false);
  };

  const handleDeleteQuote = (id: string) => {
    setQuotes(quotes.filter((q) => q.id !== id));
  };

  if (!isLoaded) return <div className="animate-pulse h-40 w-full rounded-2xl bg-zinc-100 dark:bg-zinc-800/50"></div>;

  return (
    <div className="w-full flex flex-col items-center">

      <div className="w-full relative">
        <div className="flex overflow-x-auto gap-4 pb-4 px-1 custom-scrollbar snap-x snap-mandatory">
          {quotes.map((quote) => (
            <div 
              key={quote.id} 
              className="snap-start shrink-0 w-[300px] sm:w-[350px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative group overflow-hidden transition-all hover:shadow-md h-[120px]"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-teal-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <p className="text-zinc-800 dark:text-zinc-200 font-medium text-lg leading-snug italic line-clamp-3">"{quote.text}"</p>
              <div className="flex justify-between items-end mt-4">
                <span className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                  — {quote.author}
                </span>
                <button
                  onClick={() => handleDeleteQuote(quote.id)}
                  className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-all p-1"
                  aria-label="Delete quote"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                </button>
              </div>
            </div>
          ))}

          {/* Add New Card */}
          <div className="snap-start shrink-0 w-[300px] sm:w-[350px] bg-zinc-50/50 dark:bg-zinc-900/50 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl p-4 flex flex-col justify-center items-center h-[120px] transition-all hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 group">
            {!isAdding ? (
              <button 
                onClick={() => setIsAdding(true)}
                className="w-full h-full flex flex-col items-center justify-center gap-2 text-zinc-500 dark:text-zinc-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-white dark:bg-zinc-800 shadow-sm flex items-center justify-center border border-zinc-200 dark:border-zinc-700 group-hover:border-teal-200 dark:group-hover:border-teal-900/50 group-hover:bg-teal-50 dark:group-hover:bg-teal-500/10">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                </div>
                <span className="font-semibold text-sm">Add New Statement</span>
              </button>
            ) : (
              <form onSubmit={handleAddQuote} className="w-full h-full flex flex-col gap-2">
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Your quote..."
                  value={newQuoteText}
                  onChange={(e) => setNewQuoteText(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-teal-500/50"
                  required
                />
                <input 
                  type="text" 
                  placeholder="Author (optional)"
                  value={newQuoteAuthor}
                  onChange={(e) => setNewQuoteAuthor(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-teal-500/50"
                />
                <div className="flex gap-2 justify-end mt-auto">
                  <button type="button" onClick={() => setIsAdding(false)} className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white px-2 py-1">Cancel</button>
                  <button type="submit" disabled={!newQuoteText.trim()} className="text-xs font-semibold bg-zinc-900 dark:bg-white text-white dark:text-black rounded px-3 py-1 disabled:opacity-50">Save</button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
