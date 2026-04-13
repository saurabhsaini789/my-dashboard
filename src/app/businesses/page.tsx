"use client";

import React, { useState, useEffect } from 'react';
import { TodayActions } from '@/components/businesses/TodayActions';
import { BusinessChannelsSection } from '@/components/businesses/BusinessChannelsSection';
import { ContentQueue } from '@/components/businesses/ContentQueue';
import { Insights } from '@/components/businesses/Insights';

export default function BusinessesPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-[#fcfcfc] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-teal-500/10 p-6 md:p-10 lg:p-12 relative overflow-hidden">
      <div className="mx-auto w-full max-w-7xl flex flex-col gap-12 pt-4 relative z-10">

        {/* Page Title & Strategic Description */}
        <div className="flex flex-col gap-6 items-start mb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-white tracking-tight fade-in drop-shadow-sm leading-tight">
            Businesses
          </h1>
          <div className="h-1 w-20 bg-teal-500 rounded-full animate-pulse" />
        </div>

        {/* Insights - Actionable Guidance */}
        <div className="fade-in pt-4" style={{ animationDelay: '0.2s' }}>
          <Insights />
        </div>

        {/* Today's Actions - Highlighted Section */}
        <div className="fade-in pt-4" style={{ animationDelay: '0.4s' }}>
          <TodayActions />
        </div>

        {/* Business Channels & Management */}
        <div className="fade-in pt-4" style={{ animationDelay: '0.6s' }}>
          <BusinessChannelsSection />
        </div>

        {/* Content Queue - New Section */}
        <div className="fade-in pt-4" style={{ animationDelay: '0.8s' }}>
          <ContentQueue />
        </div>

      </div>

      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[120px] -z-10 animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[120px] -z-10" />
    </main>
  );
}
