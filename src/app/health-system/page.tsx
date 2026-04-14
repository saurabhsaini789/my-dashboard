"use client";

import React, { useState, useEffect, useRef } from 'react';
import { MedicineInventorySection } from '@/components/health-system/MedicineInventorySection';
import { TravelMedicalKitSection } from '@/components/health-system/TravelMedicalKitSection';
import { FirstAidHomeSection } from '@/components/health-system/FirstAidHomeSection';
import { FirstAidMobileSection } from '@/components/health-system/FirstAidMobileSection';
import { SupplementSection } from '@/components/health-system/SupplementSection';
import { PageContainer } from '@/components/PageContainer';
import { getPrefixedKey } from '@/lib/keys';

export default function HealthSystemPage() {
  const [mounted, setMounted] = useState(false);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [globalStatusFilter, setGlobalStatusFilter] = useState<
    'ALL' | 'LOW' | 'MISSING' | 'EXPIRED'
  >('ALL');
  const medicineRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);

    // Safely load all health-related data from local storage
    const keys = [
      'MEDICINE_INVENTORY',
      'TRAVEL_MEDICAL_KIT',
      'FIRST_AID_HOME',
      'FIRST_AID_MOBILE',
      'SUPPLEMENTS'
    ];

    let combined: any[] = [];
    keys.forEach(key => {
      const saved = localStorage.getItem(getPrefixedKey(key));
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            combined = [...combined, ...parsed];
          }
        } catch (e) {
          console.error(`Failed to load health inventory for key: ${key}`, e);
        }
      }
    });

    setAllItems(combined);
  }, []);

  useEffect(() => {
    if (globalStatusFilter !== 'ALL' && medicineRef.current) {
      medicineRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [globalStatusFilter]);

  // Shared status logic consistent with section components
  const getStatus = (item: any) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(item.expiryDate);
    expiry.setHours(0, 0, 0, 0);

    if (expiry < today) return 'EXPIRED';
    if (item.quantity === 0) return 'MISSING';
    if (item.quantity < (item.targetQuantity || 1)) return 'LOW';
    return 'OK';
  };

  const expiredCount = allItems.filter(i => getStatus(i) === 'EXPIRED').length;
  const missingCount = allItems.filter(i => getStatus(i) === 'MISSING').length;
  const lowCount = allItems.filter(i => getStatus(i) === 'LOW').length;

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-zinc-500/10 relative overflow-hidden">
      <PageContainer>
        {/* Page Title & Strategic Description */}
        <div className="flex flex-col gap-6 items-start">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">
              Health
            </h1>
            <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest">Medical inventory and preparedness system</p>
          </div>
        </div>

        {/* Global Alert System */}
        {(expiredCount > 0 || missingCount > 0 || lowCount > 0) && (
          <div className="mt-8 mb-2 px-2">
            <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex items-center">
              Attention needed:
              {expiredCount > 0 && (
                <button 
                  onClick={() => setGlobalStatusFilter('EXPIRED')}
                  className="hover:underline ml-1"
                >
                  {expiredCount} expired
                </button>
              )}
              {missingCount > 0 && (
                <>
                  <span className="mx-1">•</span>
                  <button 
                    onClick={() => setGlobalStatusFilter('MISSING')}
                    className="hover:underline"
                  >
                    {missingCount} missing
                  </button>
                </>
              )}
              {lowCount > 0 && (
                <>
                  <span className="mx-1">•</span>
                  <button 
                    onClick={() => setGlobalStatusFilter('LOW')}
                    className="hover:underline"
                  >
                    {lowCount} low
                  </button>
                </>
              )}
              {globalStatusFilter !== 'ALL' && (
                <button
                  onClick={() => setGlobalStatusFilter('ALL')}
                  className="ml-2 text-[11px] uppercase tracking-widest text-zinc-400 hover:text-zinc-600 font-bold"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}

        {/* Medicine Inventory Section - Animated Entry */}
        <div ref={medicineRef} className="fade-in pt-4" style={{ animationDelay: '0.2s' }}>
          <MedicineInventorySection externalFilter={globalStatusFilter} />
        </div>

        <div className="fade-in pt-4" style={{ animationDelay: '1.2s' }}>
          <TravelMedicalKitSection externalFilter={globalStatusFilter} />
        </div>

        <div className="fade-in pt-4" style={{ animationDelay: '1.4s' }}>
          <FirstAidHomeSection externalFilter={globalStatusFilter} />
        </div>

        <div className="fade-in pt-4" style={{ animationDelay: '1.6s' }}>
          <FirstAidMobileSection externalFilter={globalStatusFilter} />
        </div>

        <div className="fade-in pt-4" style={{ animationDelay: '1.8s' }}>
          <SupplementSection externalFilter={globalStatusFilter} />
        </div>
      </PageContainer>

      {/* Minimal background texture (optional, keeping it blank for ultimate minimalism) */}
    </main>
  );
}
