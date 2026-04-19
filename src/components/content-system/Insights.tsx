"use client";

import React from 'react';
import { AlertCircle, Clock, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react';
import { SYNC_KEYS } from '@/lib/sync-keys';
import { type BusinessChannel } from '@/types/business';
import { Text, SectionTitle } from '../ui/Text';
import { useStorageSubscription } from '@/hooks/useStorageSubscription';

export function Insights() {
  const channels = useStorageSubscription<BusinessChannel[]>(SYNC_KEYS.FINANCES_BUSINESS, []);

  const generateInsights = () => {
    const insights: { type: 'urgent' | 'warning' | 'positive', icon: React.ReactNode, message: string }[] = [];
    const activeChannels = channels.filter(c => c.status === 'Active');
    
    if (activeChannels.length === 0) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    // Track schedules instead of just channels
    let totalSchedules = 0;
    let onTrackSchedules = 0;
    const overdueChannels: BusinessChannel[] = [];
    const dueTomorrowChannels: BusinessChannel[] = [];
    
    for (const c of activeChannels) {
      if (!c.schedules) continue;
      let channelHasOverdue = false;
      let channelHasTomorrow = false;
      
      for (const s of c.schedules) {
        if (!s.nextPostDueDate) continue;
        totalSchedules++;
        const due = new Date(s.nextPostDueDate);
        if (isNaN(due.getTime())) continue;
        due.setHours(0, 0, 0, 0);
        
        if (due >= today) {
          onTrackSchedules++;
        } else {
          channelHasOverdue = true;
        }
        
        if (due.getTime() === tomorrow.getTime()) {
          channelHasTomorrow = true;
        }
      }
      
      if (channelHasOverdue) overdueChannels.push(c);
      if (channelHasTomorrow) dueTomorrowChannels.push(c);
    }

    if (totalSchedules > 0) {
      insights.push({
        type: onTrackSchedules === totalSchedules ? 'positive' : 'warning',
        icon: <TrendingUp size={16} />,
        message: `You are on track for ${onTrackSchedules} out of ${totalSchedules} post schedules this week.`
      });
    }

    if (overdueChannels.length > 0) {
      insights.push({
        type: 'urgent',
        icon: <AlertCircle size={16} />,
        message: overdueChannels.length === 1 
          ? `"${overdueChannels[0].name}" has overdue posts. Update now to maintain momentum.` 
          : `${overdueChannels.length} channels have overdue schedules. Consistency is dropping.`
      });
    }

    // Most consistent: find channel with most recent post across all schedules
    let mostRecentDate = 0;
    let mostConsistentChannel: BusinessChannel | null = null;
    
    for (const c of activeChannels) {
      if (!c.schedules) continue;
      for (const s of c.schedules) {
        if (!s.lastPostedDate) continue;
        const d = new Date(s.lastPostedDate).getTime();
        if (isNaN(d)) continue;
        if (d > mostRecentDate) {
          mostRecentDate = d;
          mostConsistentChannel = c;
        }
      }
    }

    if (mostConsistentChannel && mostRecentDate >= sevenDaysAgo.getTime()) {
      insights.push({
        type: 'positive',
        icon: <Sparkles size={16} />,
        message: `"${mostConsistentChannel.name}" is your most active channel lately. Great momentum!`
      });
    }

    if (dueTomorrowChannels.length > 0) {
      insights.push({
        type: 'warning',
        icon: <Clock size={16} />,
        message: `Preparation: ${dueTomorrowChannels.length} ${dueTomorrowChannels.length === 1 ? 'channel has' : 'channels have'} posts due tomorrow.`
      });
    }

    if (overdueChannels.length === 0 && onTrackSchedules === totalSchedules && totalSchedules > 0) {
      insights.push({
        type: 'positive',
        icon: <CheckCircle2 size={16} />,
        message: "Perfect Streak! All post types are currently on schedule."
      });
    }

    return insights.slice(0, 6);
  };

  const insightsList = generateInsights();
  if (insightsList.length === 0) return null;

  return (
    <section className="w-full">
      <div className="flex flex-col mb-6 px-2">
        <SectionTitle>Insights</SectionTitle>
        <Text variant="label" className="mt-1">Quick, actionable guidance for your content activity</Text>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {insightsList.map((insight, idx) => (
          <div key={idx} className={`flex items-start gap-4 p-5 rounded-2xl border transition-all shadow-sm bg-white dark:bg-zinc-900 ${
            insight.type === 'urgent' ? 'border-rose-100' : insight.type === 'warning' ? 'border-amber-100' : 'border-emerald-100'
          }`}>
            <div className={`mt-1 p-2 rounded-xl ${
              insight.type === 'urgent' ? 'text-rose-500 bg-rose-50' : insight.type === 'warning' ? 'text-amber-500 bg-amber-50' : 'text-emerald-500 bg-emerald-50'
            }`}>{insight.icon}</div>
            <div className="flex flex-col gap-0.5 mt-1">
              <span className={`text-[10px] font-bold uppercase ${
                insight.type === 'urgent' ? 'text-rose-500' : insight.type === 'warning' ? 'text-amber-500' : 'text-emerald-500'
              }`}>{insight.type}</span>
              <Text variant="body" className="font-bold leading-tight">{insight.message}</Text>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
