"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { MedicineInventorySection } from '@/components/health-system/MedicineInventorySection';
import { TravelMedicalKitSection } from '@/components/health-system/TravelMedicalKitSection';
import { FirstAidHomeSection } from '@/components/health-system/FirstAidHomeSection';
import { FirstAidMobileSection } from '@/components/health-system/FirstAidMobileSection';
import { SupplementSection } from '@/components/health-system/SupplementSection';
import { HealthInsightsPanel } from '@/components/health-system/HealthInsightsPanel';
import { SupplementRoutineSection } from '@/components/health-system/SupplementRoutineSection';
import { PageContainer } from '@/components/PageContainer';
import { getPrefixedKey } from '@/lib/keys';
import { PageTitle, Text, Description } from '@/components/ui/Text';

export default function HealthSystemPage() {
  const searchParams = useSearchParams();

  const getInitialFilter = (): 'ALL' | 'LOW' | 'MISSING' | 'EXPIRED' | 'OK' => {
    const param = searchParams.get('filter')?.toUpperCase();
    if (param === 'EXPIRED' || param === 'MISSING' || param === 'LOW' || param === 'OK') return param as any;
    return 'ALL';
  };

  const [globalStatusFilter, setGlobalStatusFilter] = useState<
    'ALL' | 'LOW' | 'MISSING' | 'EXPIRED' | 'OK'
  >(getInitialFilter());
  const medicineRef = useRef<HTMLDivElement | null>(null);


  useEffect(() => {
    if (globalStatusFilter !== 'ALL' && medicineRef.current) {
      medicineRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [globalStatusFilter]);


  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-zinc-500/10 relative overflow-hidden">
      <PageContainer>
        {/* Page Title */}
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col items-start">
            <PageTitle>Health</PageTitle>
            <Description>Medical inventory and preparedness system</Description>
          </div>
        </header>

        {/* Health Insights Panel */}
        <div className="fade-in" style={{ animationDelay: '0.1s' }}>
          <HealthInsightsPanel
            activeFilter={globalStatusFilter}
            onFilterChange={setGlobalStatusFilter}
          />
        </div>

        {/* Medicine Inventory Section - Animated Entry */}
        <div ref={medicineRef} className="fade-in mb-14" style={{ animationDelay: '0.2s' }}>
          <MedicineInventorySection externalFilter={globalStatusFilter} />
        </div>

        <div className="fade-in mb-14" style={{ animationDelay: '1.2s' }}>
          <TravelMedicalKitSection externalFilter={globalStatusFilter} />
        </div>

        <div className="fade-in mb-14" style={{ animationDelay: '1.4s' }}>
          <FirstAidHomeSection externalFilter={globalStatusFilter} />
        </div>

        <div className="fade-in mb-14" style={{ animationDelay: '1.6s' }}>
          <FirstAidMobileSection externalFilter={globalStatusFilter} />
        </div>

        <div className="fade-in mb-14" style={{ animationDelay: '1.8s' }}>
          <SupplementSection externalFilter={globalStatusFilter} />
        </div>

        <div className="fade-in mb-14" style={{ animationDelay: '2.0s' }}>
          <SupplementRoutineSection />
        </div>
      </PageContainer>

      {/* Minimal background texture (optional, keeping it blank for ultimate minimalism) */}
    </main>
  );
}
