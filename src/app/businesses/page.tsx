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
    <main className="min-h-screen bg-[#fcfcfc] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-teal-500/10 p-4 md:p-8 xl:p-12 relative overflow-hidden">
      <div className="mx-auto w-full max-w-7xl flex flex-col gap-12 relative z-10">

        {/* Page Title */}
        <header className="flex flex-col items-start mb-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Businesses
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">
            Manage your business operations, channels, and strategy.
          </p>
        </header>

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
