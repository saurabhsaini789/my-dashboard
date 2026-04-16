"use client";

import React, { useState, useEffect, useRef } from 'react';
import { getPrefixedKey } from '@/lib/keys';
import { setSyncedItem } from '@/lib/storage';
import { SYNC_KEYS } from '@/lib/sync-keys';
import type { BusinessChannel, ContentIdea } from '@/types/content-system';

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
    const savedChannels = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_BUSINESS));
    if (savedChannels) {
      try { setChannels(JSON.parse(savedChannels)); } catch (e) {}
    }

    const savedIdeas = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_BUSINESS_IDEAS));
    if (savedIdeas) {
      try { 
        const parsedIdeas = JSON.parse(savedIdeas);
        setIdeas(parsedIdeas);
        
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

  const getPlatformDotColor = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes('instagram')) return 'bg-rose-400';
    if (p.includes('youtube')) return 'bg-red-400';
    if (p.includes('linkedin')) return 'bg-blue-400';
    return 'bg-zinc-400';
  };

  return (
    <section className="w-full mt-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 px-2">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Content Queue
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 uppercase tracking-widest font-bold">
            Backlog of distribution-ready concepts
          </p>
        </div>
        
        <button 
          onClick={() => setShowCompleted(!showCompleted)}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-xl transition-all border shadow-sm active:scale-95 ${
            showCompleted 
              ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-white shadow-md' 
              : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200/80 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800'
          }`}
        >
          {showCompleted ? 'Hide Archive' : 'Show Archive'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeChannels.length > 0 ? activeChannels.map(channel => {
          const channelIdeas = ideas.filter(i => i.channelId === channel.id && (showCompleted || i.status === 'Pending'));
          const isExpanded = expandedChannels[channel.id];

          return (
            <div 
              key={channel.id} 
              className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/50 rounded-3xl overflow-hidden flex flex-col shadow-sm group hover:shadow-md transition-all duration-300"
            >
              <div 
                className="p-6 flex items-center justify-between cursor-pointer"
                onClick={() => toggleChannel(channel.id)}
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getPlatformDotColor(channel.platform)} opacity-80`} />
                    <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                      {channel.platform}
                    </span>
                  </div>
                  <span className="text-base font-bold text-zinc-900 dark:text-white tracking-tight leading-tight">
                    {channel.name}
                  </span>
                </div>
                <span className="text-xs font-bold uppercase text-zinc-300 dark:text-zinc-600 tracking-widest">
                  {isExpanded ? 'CLOSE' : `${channelIdeas.length} IDEAS`}
                </span>
              </div>

              {isExpanded && (
                <div className="px-6 pb-6 flex flex-col gap-4">
                  <div className="space-y-1 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                    {channelIdeas.map(idea => (
                      <div 
                        key={idea.id} 
                        className="group/item flex items-center gap-3 py-3 border-b border-zinc-100 dark:border-zinc-800/50 last:border-0"
                      >
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleIdeaStatus(idea.id); }}
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                            idea.status === 'Completed' 
                              ? 'bg-teal-500 border-teal-500 shadow-sm shadow-teal-500/20' 
                              : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400'
                          }`}
                        >
                          {idea.status === 'Completed' && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-bold leading-snug transition-all ${
                            idea.status === 'Completed' 
                              ? 'text-zinc-400 line-through decoration-zinc-300' 
                              : 'text-zinc-700 dark:text-zinc-200'
                          }`}>
                            {idea.title}
                          </p>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteIdea(idea.id); }}
                          className="opacity-0 group-hover/item:opacity-100 text-xs font-bold uppercase tracking-widest text-rose-500 hover:text-rose-700 transition-all"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                    {channelIdeas.length === 0 && !showCompleted && (
                      <div className="py-8 text-center">
                        <span className="text-xs text-zinc-400 uppercase tracking-widest font-bold">No Ideas Pending</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <input 
                      type="text" 
                      placeholder="NEW CONCEPT..."
                      value={newIdeaTexts[channel.id] || ''}
                      onChange={(e) => setNewIdeaTexts({...newIdeaTexts, [channel.id]: e.target.value})}
                      onKeyDown={(e) => e.key === 'Enter' && addIdea(channel.id)}
                      className="w-full bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200/80 dark:border-zinc-800/50 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-widest text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-400/30 transition-all placeholder:text-zinc-300"
                    />
                    <button 
                      onClick={() => addIdea(channel.id)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-widest rounded-xl bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all border border-zinc-200/80 dark:border-zinc-800/50 shadow-sm active:scale-95"
                    >
                      <span className="text-lg leading-none">+</span>
                      Add Idea
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        }) : (
         <div className="col-span-full py-20 text-center">
            <span className="text-xs text-zinc-400 uppercase tracking-widest font-black">No Operational Data Found</span>
          </div>
        )}
      </div>
    </section>
  );
}
