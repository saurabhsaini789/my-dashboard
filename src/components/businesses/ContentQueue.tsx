"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  ChevronDown, 
  ChevronRight,
  Lightbulb,
  MoreVertical,
  X,
  PlusCircle,
  MessageSquare
} from 'lucide-react';
import { getPrefixedKey } from '@/lib/keys';
import { setSyncedItem } from '@/lib/storage';
import { SYNC_KEYS } from '@/lib/sync-keys';
import type { BusinessChannel, ContentIdea } from '@/types/business';

export function ContentQueue() {
  const [channels, setChannels] = useState<BusinessChannel[]>([]);
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [newIdeaTexts, setNewIdeaTexts] = useState<Record<string, string>>({});
  const [expandedChannels, setExpandedChannels] = useState<Record<string, boolean>>({});
  const [showCompleted, setShowCompleted] = useState(false);

  const ideasRef = useRef(ideas);
  useEffect(() => {
    ideasRef.current = ideas;
  }, [ideas]);

  useEffect(() => {
    // Load Channels
    const savedChannels = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_BUSINESS));
    if (savedChannels) {
      try { setChannels(JSON.parse(savedChannels)); } catch (e) {}
    }

    // Load Ideas
    const savedIdeas = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_BUSINESS_IDEAS));
    if (savedIdeas) {
      try { 
        const parsedIdeas = JSON.parse(savedIdeas);
        setIdeas(parsedIdeas);
        
        // Expand active channels with ideas by default
        const initialExpanded: Record<string, boolean> = {};
        const activeChannelIds = new Set(JSON.parse(savedChannels || '[]').filter((c: any) => c.status === 'Active').map((c: any) => c.id));
        activeChannelIds.forEach((id: any) => {
          initialExpanded[id] = true;
        });
        setExpandedChannels(initialExpanded);
      } catch (e) {}
    }

    setIsLoaded(true);

    const handleLocal = (e: any) => {
      if (e.detail && e.detail.key === SYNC_KEYS.FINANCES_BUSINESS_IDEAS) {
        const val = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_BUSINESS_IDEAS));
        if (val && val !== JSON.stringify(ideasRef.current)) {
          try { setIdeas(JSON.parse(val)); } catch (e) {}
        }
      }
      if (e.detail && e.detail.key === SYNC_KEYS.FINANCES_BUSINESS) {
        const val = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_BUSINESS));
        if (val) {
          try { setChannels(JSON.parse(val)); } catch (e) {}
        }
      }
    };
    window.addEventListener('local-storage-change', handleLocal);
    return () => window.removeEventListener('local-storage-change', handleLocal);
  }, []);

  const addIdea = (channelId: string) => {
    const text = newIdeaTexts[channelId];
    if (!text?.trim()) return;

    const newIdea: ContentIdea = {
      id: crypto.randomUUID(),
      channelId,
      title: text,
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    const updatedIdeas = [newIdea, ...ideas];
    setIdeas(updatedIdeas);
    setSyncedItem(SYNC_KEYS.FINANCES_BUSINESS_IDEAS, JSON.stringify(updatedIdeas));
    setNewIdeaTexts({ ...newIdeaTexts, [channelId]: '' });
  };

  const toggleIdeaStatus = (id: string) => {
    const updatedIdeas = ideas.map(idea => 
      idea.id === id 
        ? { ...idea, status: (idea.status === 'Pending' ? 'Completed' : 'Pending') as 'Pending' | 'Completed' } 
        : idea
    );
    setIdeas(updatedIdeas);
    setSyncedItem(SYNC_KEYS.FINANCES_BUSINESS_IDEAS, JSON.stringify(updatedIdeas));
  };

  const deleteIdea = (id: string) => {
    const updatedIdeas = ideas.filter(idea => idea.id !== id);
    setIdeas(updatedIdeas);
    setSyncedItem(SYNC_KEYS.FINANCES_BUSINESS_IDEAS, JSON.stringify(updatedIdeas));
  };

  const toggleChannel = (id: string) => {
    setExpandedChannels(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (!isLoaded) return null;

  const activeChannels = channels.filter(c => c.status === 'Active');

  return (
    <section className="w-full mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 px-2">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tight flex items-center gap-2">
            Content Queue
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 uppercase tracking-widest">
            Ready-to-use ideas to keep your execution consistent
          </p>
        </div>
        
        <button 
          onClick={() => setShowCompleted(!showCompleted)}
          className={`text-[10px] uppercase tracking-widest font-black px-4 py-2 rounded-xl transition-all border ${
            showCompleted 
              ? 'bg-teal-50 text-teal-600 border-teal-100 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20' 
              : 'text-zinc-500 border-zinc-200 dark:border-zinc-800'
          }`}
        >
          {showCompleted ? 'Hide Completed' : 'Show Completed'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeChannels.length > 0 ? activeChannels.map(channel => {
          const channelIdeas = ideas.filter(i => i.channelId === channel.id && (showCompleted || i.status === 'Pending'));
          const isExpanded = expandedChannels[channel.id];

          return (
            <div 
              key={channel.id} 
              className="bg-white dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-[32px] overflow-hidden flex flex-col shadow-sm group hover:shadow-md transition-all duration-300"
            >
              <div 
                className="p-5 flex items-center justify-between cursor-pointer group/header"
                onClick={() => toggleChannel(channel.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-white font-black text-xs">
                    {channel.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-tight leading-tight">
                      {channel.name}
                    </span>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-black uppercase tracking-widest">
                      {channel.platform} • {channelIdeas.length} ideas
                    </span>
                  </div>
                </div>
                {isExpanded ? <ChevronDown size={18} className="text-zinc-400" /> : <ChevronRight size={18} className="text-zinc-400" />}
              </div>

              {isExpanded && (
                <div className="px-5 pb-5 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  {/* Ideas List - Scrollable */}
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                    {channelIdeas.map(idea => (
                      <div 
                        key={idea.id} 
                        className={`group/item flex items-start gap-3 p-3 rounded-2xl border transition-all ${
                          idea.status === 'Completed' 
                            ? 'bg-zinc-50 dark:bg-zinc-800/10 border-zinc-100 dark:border-zinc-800/50 opacity-60' 
                            : 'bg-white dark:bg-zinc-800/30 border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                        }`}
                      >
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleIdeaStatus(idea.id); }}
                          className={`mt-0.5 shrink-0 transition-colors ${idea.status === 'Completed' ? 'text-emerald-500' : 'text-zinc-300 hover:text-zinc-400'}`}
                        >
                          {idea.status === 'Completed' ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-bold leading-relaxed ${idea.status === 'Completed' ? 'text-zinc-400 line-through' : 'text-zinc-700 dark:text-zinc-200'}`}>
                            {idea.title}
                          </p>
                          {idea.notes && (
                            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 leading-normal">
                              {idea.notes}
                            </p>
                          )}
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteIdea(idea.id); }}
                          className="opacity-0 group-hover/item:opacity-100 p-1 text-zinc-400 hover:text-rose-500 transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    {channelIdeas.length === 0 && !showCompleted && (
                      <div className="py-4 text-center">
                        <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-black">No pending ideas</span>
                      </div>
                    )}
                  </div>

                  {/* Add Idea Input */}
                  <div className="mt-2 flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Add an idea..."
                      value={newIdeaTexts[channel.id] || ''}
                      onChange={(e) => setNewIdeaTexts({...newIdeaTexts, [channel.id]: e.target.value})}
                      onKeyDown={(e) => e.key === 'Enter' && addIdea(channel.id)}
                      className="flex-1 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all font-medium"
                    />
                    <button 
                      onClick={() => addIdea(channel.id)}
                      className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 p-2.5 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-sm flex items-center justify-center shrink-0"
                    >
                      <Plus size={16} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        }) : (
          <div className="col-span-full py-12 bg-zinc-50 dark:bg-zinc-900/20 rounded-[40px] border border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center gap-3">
            <Lightbulb size={32} className="text-zinc-300" />
            <span className="text-xs text-zinc-400 uppercase tracking-widest font-black">No active channels found</span>
          </div>
        )}
      </div>
    </section>
  );
}
