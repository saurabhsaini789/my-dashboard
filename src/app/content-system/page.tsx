"use client";

import React, { useState, useEffect } from 'react';
import { TodayActions } from '@/components/content-system/TodayActions';
import { BusinessChannelsSection } from '@/components/content-system/BusinessChannelsSection';
import { ContentQueue } from '@/components/content-system/ContentQueue';
import { Insights } from '@/components/content-system/Insights';
import { PageContainer } from '@/components/PageContainer';
import { MedicineInventorySection } from '@/components/health-system/MedicineInventorySection';

export default function ContentSystemPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-zinc-500/10 relative overflow-hidden">
      <PageContainer>
        {/* Page Title & Strategic Description */}
        <div className="flex flex-col gap-6 items-start">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">
              Content
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mt-1">Strategic creation and distribution management</p>
          </div>
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

        <div className="fade-in pt-4" style={{ animationDelay: '1.0s' }}>
          <MedicineInventorySection />
        </div>
      </PageContainer>

      {/* Minimal background texture (optional, keeping it blank for ultimate minimalism) */}
    </main>
  );
}
