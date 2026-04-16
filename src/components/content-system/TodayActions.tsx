"use client";

import React, { useState, useEffect, useRef } from 'react';
import { getPrefixedKey } from '@/lib/keys';
import { setSyncedItem } from '@/lib/storage';
import { SYNC_KEYS } from '@/lib/sync-keys';
import type { BusinessChannel } from '@/types/content-system';

export function TodayActions() {
  const [channels, setChannels] = useState<BusinessChannel[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const channelsRef = useRef<BusinessChannel[]>([]);

  useEffect(() => {
    channelsRef.current = channels;
  }, [channels]);

  useEffect(() => {
    const saved = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_BUSINESS));
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setChannels(parsed);
      } catch (e) {
        console.error("Failed to parse business data", e);
      }
    }
    setIsLoaded(true);

    const handleLocal = (e: any) => {
      if (e.detail && e.detail.key === SYNC_KEYS.FINANCES_BUSINESS) {
        const val = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_BUSINESS));
        if (val && val !== JSON.stringify(channelsRef.current)) {
          try { setChannels(JSON.parse(val)); } catch (e) {}
        }
      }
    };
    window.addEventListener('local-storage-change', handleLocal);
    return () => window.removeEventListener('local-storage-change', handleLocal);
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  const dueToday = channels.filter(c => 
    c.status === 'Active' && 
    c.nextPostDueDate &&
    c.nextPostDueDate <= todayStr
  );

  const markAsPosted = (id: string) => {
    const today = new Date();
    const todayISO = today.toISOString().split('T')[0];
    
    const updatedChannels = channels.map(c => {
      if (c.id === id) {
        const nextDate = new Date(today);
        nextDate.setDate(today.getDate() + c.postingFrequency);
        const nextDateISO = nextDate.toISOString().split('T')[0];
        
        return {
          ...c,
          lastPostedDate: todayISO,
          nextPostDueDate: nextDateISO
        };
      }
      return c;
    });

    setChannels(updatedChannels);
    setSyncedItem(SYNC_KEYS.FINANCES_BUSINESS, JSON.stringify(updatedChannels));
  };

  const getPlatformDotColor = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes('instagram')) return 'bg-rose-400';
    if (p.includes('youtube')) return 'bg-red-400';
    if (p.includes('linkedin')) return 'bg-blue-400';
    return 'bg-zinc-400';
  };

  if (!isLoaded) return null;

  return (
    <section className="w-full mb-12">
      <div className="flex flex-col mb-6 px-2">
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Today&apos;s Actions
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 uppercase tracking-widest font-bold">
          Prioritize execution based on your scheduled velocity
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[32px] p-8 shadow-sm">
        {dueToday.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dueToday.map(channel => (
              <div 
                key={channel.id} 
                className="group relative border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 bg-zinc-50/50 dark:bg-zinc-900/40 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all duration-300"
              >
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getPlatformDotColor(channel.platform)} opacity-80`} />
                      <span className="text-xs font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                        {channel.platform}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg text-zinc-900 dark:text-white leading-snug">
                      {channel.name}
                    </h3>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {channel.contentType && (
                      <span className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest bg-white dark:bg-zinc-800 px-2 py-1 rounded-lg border border-zinc-100 dark:border-zinc-700">
                        {channel.contentType}
                      </span>
                    )}
                    <span className="text-xs font-black text-rose-500 dark:text-rose-400 uppercase tracking-widest border border-rose-100 dark:border-rose-900/30 px-2 py-1 rounded-lg bg-rose-50/30 dark:bg-rose-500/5">
                      Urgent Post
                    </span>
                  </div>

                  <div className="pt-4 border-t border-zinc-200/50 dark:border-zinc-800/50">
                    <button
                      onClick={() => markAsPosted(channel.id)}
                      className="w-full flex items-center justify-center bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-md"
                    >
                      Complete Entry
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-widest">
              Schedule Clear
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 uppercase tracking-widest font-black">
              All active channels are current. No actions required today.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
