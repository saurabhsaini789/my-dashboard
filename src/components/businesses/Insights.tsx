"use client";

import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, Clock, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react';
import { getPrefixedKey } from '@/lib/keys';
import { SYNC_KEYS } from '@/lib/sync-keys';
import { type BusinessChannel } from '@/types/business';

export function Insights() {
  const [channels, setChannels] = useState<BusinessChannel[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const channelsRef = useRef(channels);
  useEffect(() => {
    channelsRef.current = channels;
  }, [channels]);

  useEffect(() => {
    const saved = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_BUSINESS));
    if (saved) {
      try {
        setChannels(JSON.parse(saved));
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

  const generateInsights = () => {
    const insights: { type: 'urgent' | 'warning' | 'positive', icon: React.ReactNode, message: string }[] = [];
    const activeChannels = channels.filter(c => c.status === 'Active');
    
    if (activeChannels.length === 0) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    // 1. Post Ratio - "You posted X out of Y expected this week"
    let totalExpectedWeekly = 0;
    let actualOnTrack = 0;
    
    activeChannels.forEach(c => {
      const weeklyFrequency = Math.max(1, Math.floor(7 / c.postingFrequency));
      totalExpectedWeekly += weeklyFrequency;
      
      const lastPosted = new Date(c.lastPostedDate);
      if (lastPosted >= sevenDaysAgo) {
        // Simple heuristic: if they posted in the last 7 days, they are "active" for this week
        actualOnTrack++;
      }
    });

    const onTrackChannels = activeChannels.filter(c => {
      const due = new Date(c.nextPostDueDate);
      due.setHours(0, 0, 0, 0);
      return due >= today;
    }).length;

    insights.push({
      type: onTrackChannels === activeChannels.length ? 'positive' : 'warning',
      icon: <TrendingUp size={16} />,
      message: `You are on track for ${onTrackChannels} out of ${activeChannels.length} active channels this week.`
    });

    // 🔴 Attention Required
    const overdue = activeChannels.filter(c => {
      const due = new Date(c.nextPostDueDate);
      due.setHours(0, 0, 0, 0);
      return due < today;
    });

    if (overdue.length > 0) {
      insights.push({
        type: 'urgent',
        icon: <AlertCircle size={16} />,
        message: overdue.length === 1 
          ? `"${overdue[0].name}" is overdue. Post now to maintain momentum.` 
          : `${overdue.length} channels are overdue. Your consistency is dropping.`
      });
    }

    // 🟡 Smart Tips & Moderate Signals
    const mostConsistent = activeChannels.reduce((prev, curr) => {
      const prevDate = new Date(prev.lastPostedDate);
      const currDate = new Date(curr.lastPostedDate);
      return currDate > prevDate ? curr : prev;
    }, activeChannels[0]);

    if (mostConsistent && new Date(mostConsistent.lastPostedDate) >= sevenDaysAgo) {
      insights.push({
        type: 'positive',
        icon: <Sparkles size={16} />,
        message: `"${mostConsistent.name}" is your most consistent channel right now. Keep it up!`
      });
    }

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dueTomorrow = activeChannels.filter(c => {
      const due = new Date(c.nextPostDueDate);
      due.setHours(0, 0, 0, 0);
      return due.getTime() === tomorrow.getTime();
    });

    if (dueTomorrow.length > 0) {
      insights.push({
        type: 'warning',
        icon: <Clock size={16} />,
        message: `Preparation: ${dueTomorrow.length} ${dueTomorrow.length === 1 ? 'post is' : 'posts are'} due tomorrow.`
      });
    }

    // 🟢 Positive Signals
    if (overdue.length === 0 && onTrackChannels === activeChannels.length) {
       insights.push({
        type: 'positive',
        icon: <CheckCircle2 size={16} />,
        message: "Perfect Streak! All channels are currently on schedule."
      });
    }

    // Limit to 3-6 insights
    return insights.slice(0, 6);
  };

  if (!isLoaded) return null;

  const insightsList = generateInsights();

  if (insightsList.length === 0) return null;

  return (
    <section className="w-full">
      <div className="flex flex-col mb-6 px-2">
        <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tight flex items-center gap-2">
          Insights
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 uppercase tracking-widest">
          Quick, actionable guidance for your content activity
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {insightsList.map((insight, idx) => (
          <div 
            key={idx}
            className={`flex items-start gap-4 p-5 rounded-[24px] border transition-all hover:shadow-lg dark:hover:shadow-zinc-900/50 ${
              insight.type === 'urgent'
                ? 'bg-rose-50/50 dark:bg-rose-500/5 border-rose-100 dark:border-rose-500/20'
                : insight.type === 'warning'
                ? 'bg-amber-50/50 dark:bg-amber-500/5 border-amber-100 dark:border-amber-500/20'
                : 'bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/20'
            }`}
          >
            <div className={`mt-1 p-2 rounded-xl ${
              insight.type === 'urgent' ? 'text-rose-500 bg-rose-100 dark:bg-rose-500/20' : 
              insight.type === 'warning' ? 'text-amber-500 bg-amber-100 dark:bg-amber-500/20' : 
              'text-emerald-500 bg-emerald-100 dark:bg-emerald-500/20'
            }`}>
              {insight.icon}
            </div>
            <div className="flex flex-col gap-0.5 mt-1">
              <span className={`text-[10px] font-black uppercase tracking-[0.15em] ${
                insight.type === 'urgent' ? 'text-rose-500' : 
                insight.type === 'warning' ? 'text-amber-500' : 
                'text-emerald-500'
              }`}>
                {insight.type === 'urgent' ? 'Attention Required' : insight.type === 'warning' ? 'Moderate Signal' : 'Positive Signal'}
              </span>
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                {insight.message}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
