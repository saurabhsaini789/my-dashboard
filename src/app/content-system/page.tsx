"use client";

import React, { useState, useEffect } from 'react';
import { TodayActions } from '@/components/content-system/TodayActions';
import { BusinessChannelsSection } from '@/components/content-system/BusinessChannelsSection';
import { ContentQueue } from '@/components/content-system/ContentQueue';
import { Insights } from '@/components/content-system/Insights';
import { PageTitle, Text, Description } from '@/components/ui/Text';

export default function ContentSystemPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-[#fcfcfc] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-teal-500/10 p-4 md:p-8 xl:p-12 relative overflow-hidden">
      <div className="mx-auto w-full max-w-7xl relative z-10">

        {/* Page Title */}
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col items-start">
            <PageTitle>Content System</PageTitle>
            <Description>Manage you content operations, channels and strategy</Description>
          </div>
        </header>

        {/* Insights - Actionable Guidance */}
        <div className="fade-in mb-14" style={{ animationDelay: '0.2s' }}>
          <Insights />
        </div>

        {/* Today's Actions - Highlighted Section */}
        <div className="fade-in mb-14" style={{ animationDelay: '0.4s' }}>
          <TodayActions />
        </div>

        {/* Business Channels & Management */}
        <div className="fade-in mb-14" style={{ animationDelay: '0.6s' }}>
          <BusinessChannelsSection />
        </div>

        {/* Content Queue - New Section */}
        <div className="fade-in mb-14" style={{ animationDelay: '0.8s' }}>
          <ContentQueue />
        </div>

      </div>

      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[120px] -z-10 animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[120px] -z-10" />
    </main>
  );
}
