"use client";

import React, { useState, useEffect } from "react";
import { setSyncedItem } from "@/lib/storage";
import { getPrefixedKey } from "@/lib/keys";
import { Text, SectionTitle } from "@/components/ui/Text";
import { Plus } from "lucide-react";

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
 const quotesRef = React.useRef(quotes);

 useEffect(() => {
 quotesRef.current = quotes;
 }, [quotes]);

 useEffect(() => {
 const saved = localStorage.getItem(getPrefixedKey("dashboard_quotes"));
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
 const val = localStorage.getItem(getPrefixedKey('dashboard_quotes'));
 if (val && val !== JSON.stringify(quotesRef.current)) {
 try {
 setQuotes(JSON.parse(val));
 } catch (e) {}
 }
 }
 };

 const handleStorageChange = (e: StorageEvent) => {
 if (e.key === getPrefixedKey('dashboard_quotes') && e.newValue && e.newValue !== JSON.stringify(quotesRef.current)) {
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
    <div className="w-full flex flex-col gap-6">
      <div className="flex justify-between items-end">
        <SectionTitle className="mb-0">Daily Inspiration</SectionTitle>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all border border-zinc-200 dark:border-zinc-700"
        >
          <Plus size={14} />
          Add Quote
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isAdding && (
          <div className="w-full bg-white dark:bg-zinc-900 border border-teal-500/30 dark:border-teal-500/20 rounded-2xl p-4 flex flex-col shadow-md animate-in fade-in zoom-in duration-200 min-h-[140px]">
            <form onSubmit={handleAddQuote} className="w-full h-full flex flex-col gap-3">
              <textarea
                autoFocus
                placeholder="Type your quote here..."
                value={newQuoteText}
                onChange={(e) => setNewQuoteText(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500/50 resize-none flex-1"
                rows={2}
                required
              />
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Author..."
                  value={newQuoteAuthor}
                  onChange={(e) => setNewQuoteAuthor(e.target.value)}
                  className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-teal-500/50"
                />
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 px-2 py-1.5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newQuoteText.trim()}
                    className="text-xs font-semibold bg-teal-600 dark:bg-teal-500 text-white rounded-lg px-3 py-1.5 disabled:opacity-50 hover:bg-teal-700 dark:hover:bg-teal-400 transition-colors shadow-sm"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {quotes.map((quote) => (
          <div
            key={quote.id}
            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col justify-between shadow-sm relative group transition-all hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 min-h-[140px]"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-teal-500/80 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <Text variant="heading" as="p" className="text-zinc-800 dark:text-zinc-200 leading-snug italic">
              "{quote.text}"
            </Text>

            <div className="flex justify-between items-start gap-3 mt-6">
              <Text variant="label" as="span" className="font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500 leading-tight">
                — {quote.author}
              </Text>
              <button
                onClick={() => handleDeleteQuote(quote.id)}
                className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-all p-1 mt-[-4px]"
                aria-label="Delete quote"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
