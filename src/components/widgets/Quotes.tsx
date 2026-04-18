"use client";

import React, { useState, useEffect } from "react";
import { setSyncedItem } from "@/lib/storage";
import { getPrefixedKey } from "@/lib/keys";
import { Text, SectionTitle } from "@/components/ui/Text";
import { Plus, LayoutGrid, List, Edit2, Trash2, Check, X } from "lucide-react";

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
 const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
 const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
 const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
 const [editValue, setEditValue] = useState("");
 const [editAuthor, setEditAuthor] = useState("");
 const quotesRef = React.useRef(quotes);

 useEffect(() => {
 quotesRef.current = quotes;
 }, [quotes]);

 useEffect(() => {
   const handleKeyDown = (e: KeyboardEvent) => {
     if (e.key === 'Escape') {
       setSelectedQuoteId(null);
       setEditingQuoteId(null);
       setIsAdding(false);
     }
   };
   window.addEventListener('keydown', handleKeyDown);
   return () => window.removeEventListener('keydown', handleKeyDown);
 }, []);

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

 const savedViewMode = localStorage.getItem('dashboard_quotes_view_mode');
 if (savedViewMode === 'table' || savedViewMode === 'grid') {
   setViewMode(savedViewMode);
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
    if (selectedQuoteId === id) setSelectedQuoteId(null);
  };

  const handleUpdateQuote = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editValue.trim() || !editingQuoteId) return;

    setQuotes(quotes.map(q => q.id === editingQuoteId ? {
      ...q,
      text: editValue.trim(),
      author: editAuthor.trim() || "Anonymous"
    } : q));
    
    setEditingQuoteId(null);
    setEditValue("");
    setEditAuthor("");
    setSelectedQuoteId(null);
  };

  const startEditing = (quote: Quote) => {
    setEditingQuoteId(quote.id);
    setEditValue(quote.text);
    setEditAuthor(quote.author);
  };

 const toggleViewMode = (mode: 'grid' | 'table') => {
   setViewMode(mode);
   localStorage.setItem('dashboard_quotes_view_mode', mode);
 };

  const renderTableView = () => (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm animate-in fade-in duration-500">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-950/50 border-b border-zinc-100 dark:border-zinc-800">
              <th className="p-4 px-6 text-[11px] uppercase text-zinc-500 font-bold tracking-wider">Quote</th>
              <th className="p-4 px-6 text-[11px] uppercase text-zinc-500 font-bold tracking-wider">Author</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {isAdding && (
              <tr className="bg-teal-50/10 dark:bg-teal-500/5">
                <td colSpan={2} className="p-4 px-6">
                  <form onSubmit={handleAddQuote} className="w-full flex flex-col gap-3">
                    <textarea
                      autoFocus
                      placeholder="Type your quote here..."
                      value={newQuoteText}
                      onChange={(e) => setNewQuoteText(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500/50 resize-none"
                      rows={2}
                      required
                    />
                    <div className="flex gap-2 items-center justify-between">
                      <input
                        type="text"
                        placeholder="Author..."
                        value={newQuoteAuthor}
                        onChange={(e) => setNewQuoteAuthor(e.target.value)}
                        className="flex-1 max-w-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-teal-500/50"
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
                </td>
              </tr>
            )}
            {quotes.map((quote) => {
              const isSelected = selectedQuoteId === quote.id;
              const isEditing = editingQuoteId === quote.id;

              if (isEditing) {
                return (
                  <tr key={quote.id} className="bg-teal-50/10 dark:bg-teal-500/5">
                    <td colSpan={2} className="p-4 px-6">
                      <form onSubmit={handleUpdateQuote} className="w-full flex flex-col gap-3">
                        <textarea
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500/50 resize-none"
                          rows={2}
                          required
                        />
                        <div className="flex gap-2 items-center justify-between">
                          <input
                            type="text"
                            value={editAuthor}
                            onChange={(e) => setEditAuthor(e.target.value)}
                            className="flex-1 max-w-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-teal-500/50"
                          />
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => { setEditingQuoteId(null); setSelectedQuoteId(null); }}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500"
                            >
                              <X size={16} />
                            </button>
                            <button
                              type="submit"
                              className="p-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700 shadow-sm"
                            >
                              <Check size={16} />
                            </button>
                          </div>
                        </div>
                      </form>
                    </td>
                  </tr>
                );
              }

              return (
                <tr 
                  key={quote.id} 
                  onClick={() => setSelectedQuoteId(isSelected ? null : quote.id)}
                  className={`cursor-pointer transition-colors group relative ${isSelected ? 'bg-zinc-50 dark:bg-zinc-800/50' : 'hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30'}`}
                >
                  <td className="p-4 px-6 relative">
                    <p className="text-sm italic text-zinc-800 dark:text-zinc-200 line-clamp-2">"{quote.text}"</p>
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-[1px] animate-in fade-in zoom-in duration-200 z-10">
                        <button
                          onClick={(e) => { e.stopPropagation(); startEditing(quote); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all shadow-sm"
                        >
                          <Edit2 size={14} /> Edit
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteQuote(quote.id); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all shadow-sm"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedQuoteId(null); }}
                          className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-all"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="p-4 px-6">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{quote.author}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

 if (!isLoaded) return <div className="animate-pulse h-40 w-full rounded-2xl bg-zinc-100 dark:bg-zinc-800/50"></div>;

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex justify-between items-end">
        <SectionTitle className="mb-0">Daily Inspiration</SectionTitle>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700">
            <button 
              onClick={() => toggleViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-zinc-700 shadow-sm text-teal-600 dark:text-teal-400' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
              title="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
            <button 
              onClick={() => toggleViewMode('table')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white dark:bg-zinc-700 shadow-sm text-teal-600 dark:text-teal-400' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
              title="Table View"
            >
              <List size={16} />
            </button>
          </div>

          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all border border-zinc-200 dark:border-zinc-700 h-[34px]"
          >
            <Plus size={14} />
            Add Quote
          </button>
        </div>
      </div>

      <div className="max-h-[350px] overflow-y-auto pr-2 -mr-2 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-2">
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

            {quotes.map((quote) => {
              const isSelected = selectedQuoteId === quote.id;
              const isEditing = editingQuoteId === quote.id;

              if (isEditing) {
                return (
                  <div key={quote.id} className="w-full bg-white dark:bg-zinc-900 border border-teal-500/30 dark:border-teal-500/20 rounded-2xl p-4 flex flex-col shadow-md animate-in fade-in zoom-in duration-200 min-h-[140px]">
                    <form onSubmit={handleUpdateQuote} className="w-full h-full flex flex-col gap-3">
                      <textarea
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500/50 resize-none flex-1"
                        rows={2}
                        required
                      />
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={editAuthor}
                          onChange={(e) => setEditAuthor(e.target.value)}
                          className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-teal-500/50"
                        />
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => { setEditingQuoteId(null); setSelectedQuoteId(null); }}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500"
                          >
                            <X size={16} />
                          </button>
                          <button
                            type="submit"
                            className="p-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700 shadow-sm"
                          >
                            <Check size={16} />
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                );
              }

              return (
                <div
                  key={quote.id}
                  onClick={() => setSelectedQuoteId(isSelected ? null : quote.id)}
                  className={`w-full bg-white dark:bg-zinc-900 border transition-all cursor-pointer relative group rounded-2xl p-4 flex flex-col justify-between shadow-sm min-h-[110px] ${isSelected ? 'border-teal-500 dark:border-teal-500/50 shadow-md scale-[1.02]' : 'border-zinc-200 dark:border-zinc-800 hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700'}`}
                >
                  <div className={`absolute top-0 left-0 w-1 h-full bg-teal-500/80 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}></div>
                  <Text variant="heading" as="p" className="text-zinc-800 dark:text-zinc-200 leading-snug italic">
                    "{quote.text}"
                  </Text>

                  <div className="flex justify-between items-start gap-3 mt-3">
                    <Text variant="label" as="span" className="font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500 leading-tight">
                      — {quote.author}
                    </Text>
                    {isSelected ? (
                      <div className="flex gap-1 animate-in slide-in-from-right-2 duration-200">
                         <button
                          onClick={(e) => { e.stopPropagation(); startEditing(quote); }}
                          className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-teal-600 dark:text-teal-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all shadow-sm"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteQuote(quote.id); }}
                          className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all shadow-sm"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="opacity-0 group-hover:opacity-100 text-zinc-300 transition-all p-1">
                        <Edit2 size={14} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          renderTableView()
        )}
      </div>
    </div>
  );
}
