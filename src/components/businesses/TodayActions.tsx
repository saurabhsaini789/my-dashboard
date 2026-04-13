"use client";

import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Rocket, Calendar, Layout, PlusCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getPrefixedKey } from '@/lib/keys';
import { setSyncedItem } from '@/lib/storage';
import { SYNC_KEYS } from '@/lib/sync-keys';
import type { BusinessChannel } from '@/types/business';

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

    // Trigger confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#3b82f6', '#f59e0b']
    });

    setChannels(updatedChannels);
    setSyncedItem(SYNC_KEYS.FINANCES_BUSINESS, JSON.stringify(updatedChannels));
  };

  if (!isLoaded) return null;

  return (
    <section className="w-full mb-12">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
          Today&apos;s actions
        </h2>
      </div>

      <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-[32px] p-8 shadow-sm hover:shadow-md transition-all">
        {dueToday.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dueToday.map(channel => (
              <div 
                key={channel.id} 
                className={`group relative border border-zinc-200 dark:border-zinc-800/50 rounded-2xl p-6 hover:scale-[1.02] transition-all duration-300 ${channel.rowColor || 'bg-zinc-100 dark:bg-zinc-800/50'}`}
              >
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg text-zinc-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                        {channel.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">
                          {channel.platform}
                        </span>
                        {channel.contentType && (
                          <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest border border-zinc-200 dark:border-zinc-700 px-1.5 rounded">
                            {channel.contentType}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="bg-teal-500/10 text-teal-600 dark:text-teal-400 p-2 rounded-xl">
                      <Rocket size={20} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-4 border-t border-zinc-200/50 dark:border-zinc-700/50">
                    <span className="text-xs font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400 animate-pulse">
                      Post Today
                    </span>
                    <button
                      onClick={() => markAsPosted(channel.id)}
                      className="flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2 rounded-xl text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-zinc-900/20 dark:shadow-white/10"
                    >
                      <CheckCircle2 size={14} />
                      Mark as Posted
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in duration-500">
            <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4 border border-zinc-100 dark:border-zinc-700">
              <CheckCircle2 size={32} className="text-emerald-500" />
            </div>
            <p className="text-xl font-bold text-zinc-900 dark:text-white">
              No posts due today — you&apos;re on track
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-300 mt-2">
              Enjoy your free time or prepare for upcoming content.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
