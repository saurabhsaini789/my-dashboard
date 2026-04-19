"use client";

import React, { useState } from "react";
import { setSyncedItem } from "@/lib/storage";
import { Text, SectionTitle } from "@/components/ui/Text";
import { Plus, LayoutGrid, List, Edit2, Trash2, Check, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useStorageSubscription } from "@/hooks/useStorageSubscription";
import { SYNC_KEYS } from "@/lib/sync-keys";

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
  const quotes = useStorageSubscription<Quote[]>(SYNC_KEYS.DASHBOARD_QUOTES, defaultQuotes);
  const viewMode = useStorageSubscription<'grid' | 'table'>(SYNC_KEYS.PANTRY_GROCERY_VIEW_MODE, 'grid'); // Reusing global-ish view mode or could define specific
  
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editAuthor, setEditAuthor] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newQuoteText, setNewQuoteText] = useState("");
  const [newQuoteAuthor, setNewQuoteAuthor] = useState("");

  const toggleViewMode = (mode: 'grid' | 'table') => setSyncedItem(SYNC_KEYS.PANTRY_GROCERY_VIEW_MODE, mode);

  const handleAddQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuoteText.trim()) return;
    const n: Quote = { id: crypto.randomUUID(), text: newQuoteText.trim(), author: newQuoteAuthor.trim() || "Anonymous" };
    setSyncedItem(SYNC_KEYS.DASHBOARD_QUOTES, JSON.stringify([n, ...quotes]));
    setNewQuoteText(""); setNewQuoteAuthor(""); setIsAdding(false);
  };

  const handleDeleteQuote = (id: string) => {
    setSyncedItem(SYNC_KEYS.DASHBOARD_QUOTES, JSON.stringify(quotes.filter(q => q.id !== id)));
    if (selectedQuoteId === id) setSelectedQuoteId(null);
  };

  const handleUpdateQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editValue.trim() || !editingQuoteId) return;
    const n = quotes.map(q => q.id === editingQuoteId ? { ...q, text: editValue.trim(), author: editAuthor.trim() || "Anonymous" } : q);
    setSyncedItem(SYNC_KEYS.DASHBOARD_QUOTES, JSON.stringify(n));
    setEditingQuoteId(null); setSelectedQuoteId(null);
  };

  return (
    <div className="w-full flex flex-col gap-6 font-bold uppercase">
      <div className="flex justify-between items-end">
        <SectionTitle>Daily Inspiration</SectionTitle>
        <div className="flex items-center gap-3">
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
            <button onClick={() => toggleViewMode('grid')} className={`p-1.5 rounded-lg ${viewMode==='grid'?'bg-white shadow-sm':'text-zinc-400'}`}><LayoutGrid size={16}/></button>
            <button onClick={() => toggleViewMode('table')} className={`p-1.5 rounded-lg ${viewMode==='table'?'bg-white shadow-sm':'text-zinc-400'}`}><List size={16}/></button>
          </div>
          <button onClick={() => setIsAdding(true)} className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 rounded-xl text-[10px]">+ ADD QUOTE</button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isAdding && (
            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 animate-in zoom-in duration-200">
              <form onSubmit={handleAddQuote} className="flex flex-col gap-3">
                <textarea autoFocus placeholder="Quote..." value={newQuoteText} onChange={e=>setNewQuoteText(e.target.value)} className="bg-white p-3 rounded-xl text-xs font-bold outline-none border border-zinc-100 min-h-[80px]"/>
                <div className="flex gap-2">
                  <input placeholder="Author" value={newQuoteAuthor} onChange={e=>setNewQuoteAuthor(e.target.value)} className="bg-white px-3 py-2 rounded-xl text-xs font-bold flex-1 outline-none border border-zinc-100"/>
                  <button type="submit" className="bg-teal-600 text-white px-3 py-2 rounded-xl text-xs font-bold">SAVE</button>
                </div>
              </form>
            </div>
          )}
          {quotes.map(q => (
            <div key={q.id} onClick={() => { setSelectedQuoteId(q.id); setEditValue(q.text); setEditAuthor(q.author); }} className={`p-6 bg-white dark:bg-zinc-900 border border-zinc-100 rounded-2xl shadow-sm cursor-pointer hover:border-teal-500 transition-all ${selectedQuoteId===q.id?'ring-2 ring-teal-500/20 shadow-md':''}`}>
              <p className="text-lg italic font-bold mb-4">"{q.text}"</p>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-zinc-400">— {q.author}</span>
                {selectedQuoteId===q.id && (
                  <div className="flex gap-2">
                    <button onClick={(e)=>{e.stopPropagation(); setEditingQuoteId(q.id);}} className="text-zinc-400 hover:text-teal-600"><Edit2 size={14}/></button>
                    <button onClick={(e)=>{e.stopPropagation(); handleDeleteQuote(q.id);}} className="text-zinc-400 hover:text-rose-500"><Trash2 size={14}/></button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-800 text-[10px] text-zinc-500 font-bold">
              <tr>
                <th className="px-6 py-4">Quote</th>
                <th className="px-6 py-4">Author</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {isAdding && (
                <tr className="bg-teal-50/30">
                  <td colSpan={3} className="px-6 py-4">
                    <form onSubmit={handleAddQuote} className="flex gap-4">
                      <input autoFocus placeholder="Quote..." value={newQuoteText} onChange={e=>setNewQuoteText(e.target.value)} className="bg-white px-4 py-2 rounded-xl text-xs font-bold flex-1 border border-zinc-100 outline-none"/>
                      <input placeholder="Author" value={newQuoteAuthor} onChange={e=>setNewQuoteAuthor(e.target.value)} className="bg-white px-4 py-2 rounded-xl text-xs font-bold w-40 border border-zinc-100 outline-none"/>
                      <button type="submit" className="bg-teal-600 text-white px-6 py-2 rounded-xl text-xs font-bold">SAVE</button>
                    </form>
                  </td>
                </tr>
              )}
              {quotes.map(q => (
                <tr key={q.id} onClick={() => { setEditingQuoteId(q.id); setEditValue(q.text); setEditAuthor(q.author); }} className="hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors cursor-pointer group">
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold italic line-clamp-1">"{q.text}"</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold text-zinc-500">{q.author}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e)=>{e.stopPropagation(); setEditingQuoteId(q.id); setEditValue(q.text); setEditAuthor(q.author);}} className="text-zinc-400 hover:text-teal-600"><Edit2 size={14}/></button>
                      <button onClick={(e)=>{e.stopPropagation(); handleDeleteQuote(q.id);}} className="text-zinc-400 hover:text-rose-500"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingQuoteId && (
        <Modal isOpen={!!editingQuoteId} onClose={()=>setEditingQuoteId(null)} title="Edit Quote">
          <form onSubmit={handleUpdateQuote} className="p-4 space-y-4">
            <textarea value={editValue} onChange={e=>setEditValue(e.target.value)} className="w-full bg-zinc-50 p-4 rounded-2xl font-bold min-h-[120px] outline-none" required/>
            <input value={editAuthor} onChange={e=>setEditAuthor(e.target.value)} className="w-full bg-zinc-50 p-4 rounded-2xl font-bold outline-none" required/>
            <button type="submit" className="w-full bg-zinc-900 text-white p-4 rounded-2xl font-bold">SAVE CHANGES</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
