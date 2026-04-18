"use client";

import { useState, useEffect, useMemo } from 'react';
import { getPrefixedKey } from '@/lib/keys';
import { SYNC_KEYS } from '@/lib/sync-keys';
import { MedicineItem, SupplementItem, InventoryStatus } from '@/types/health-system';

export type PriorityTier = 'CRITICAL' | 'DAILY' | 'MAINTENANCE';

export interface PulseAction {
  id: string;
  label: string;
  href: string;
  tier: PriorityTier;
  type: string;
}

export interface SystemPulse {
  ready: boolean;
  score: number; // 0-100
  scoreLabel: string;
  actions: PulseAction[];
  milestone: {
    title: string;
    daysDesc: string;
    bucket: string;
  } | null;
  stats: {
    healthReadiness: number;
    goalHealth: number;
    habitConsistency: number;
  };
}

export function useSystemPulse() {
  const [pulse, setPulse] = useState<SystemPulse>({
    ready: false,
    score: 0,
    scoreLabel: 'Calculating...',
    actions: [],
    milestone: null,
    stats: { healthReadiness: 0, goalHealth: 0, habitConsistency: 0 }
  });

  useEffect(() => {
    const calculatePulse = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      // --- 1. HEALTH DATA ---
      const healthKeys = [
        SYNC_KEYS.HEALTH_MEDICINE,
        SYNC_KEYS.HEALTH_TRAVEL_KIT,
        SYNC_KEYS.HEALTH_FIRST_AID_HOME,
        SYNC_KEYS.HEALTH_FIRST_AID_MOBILE,
        SYNC_KEYS.HEALTH_SUPPLEMENTS
      ];

      let totalHealthItems = 0;
      let okHealthItems = 0;
      const healthIssues: { type: InventoryStatus; name: string }[] = [];

      healthKeys.forEach(key => {
        const saved = localStorage.getItem(getPrefixedKey(key));
        if (saved) {
          try {
            const items = JSON.parse(saved);
            if (Array.isArray(items)) {
              items.forEach((item: any) => {
                totalHealthItems++;
                const name = item.itemName || item.medicineName || item.name || 'Item';
                const expiry = new Date(item.expiryDate);
                expiry.setHours(0, 0, 0, 0);

                if (expiry < today) {
                  healthIssues.push({ type: 'EXPIRED', name });
                } else if (item.quantity === 0) {
                  healthIssues.push({ type: 'MISSING', name });
                } else if (item.quantity < (item.targetQuantity || 1)) {
                  healthIssues.push({ type: 'LOW', name });
                } else {
                  okHealthItems++;
                }
              });
            }
          } catch (e) {}
        }
      });

      const healthReadiness = totalHealthItems > 0 ? (okHealthItems / totalHealthItems) * 100 : 100;

      // --- 2. GOALS DATA ---
      const savedProjects = localStorage.getItem(getPrefixedKey('goals_projects'));
      let totalProjects = 0;
      let onTrackProjects = 0;
      let overdueCount = 0;
      let dueTodayCount = 0;
      let nextMilestone: any = null;

      if (savedProjects) {
        try {
          const projects = JSON.parse(savedProjects);
          if (Array.isArray(projects)) {
            const activeProjects = projects.filter(p => !p.isCompleted && p.status !== 'completed');
            totalProjects = activeProjects.length;

            activeProjects.forEach(p => {
              if (p.dueDate) {
                if (p.dueDate < todayStr) overdueCount++;
                else if (p.dueDate === todayStr) dueTodayCount++;

                // Tracking milestone
                if (p.dueDate >= todayStr) {
                  if (!nextMilestone || p.dueDate < nextMilestone.dueDate) {
                    nextMilestone = p;
                  }
                }
              }

              // Simple on-track logic: not overdue
              if (!p.dueDate || p.dueDate >= todayStr) onTrackProjects++;
            });
          }
        } catch (e) {}
      }

      const goalHealth = totalProjects > 0 ? (onTrackProjects / totalProjects) * 100 : 100;

      // --- 3. HABITS DATA ---
      const savedHabits = localStorage.getItem(getPrefixedKey('os_habits'));
      let pendingHabitsCount = 0;
      let habitSuccessRate = 0;

      if (savedHabits) {
        try {
          const habits = JSON.parse(savedHabits);
          if (Array.isArray(habits)) {
            const mKey = `${today.getFullYear()}-${today.getMonth()}`;
            const dayIdx = today.getDate() - 1;
            
            habits.forEach(h => {
              const isActive = !h.monthScope || h.monthScope.includes(mKey);
              if (!isActive) return;
              const status = h.records?.[mKey]?.[dayIdx];
              if (status === 'none' || status === undefined) {
                pendingHabitsCount++;
              }
            });

            // Calculate success rate for the last 7 days
            let done = 0, total = 0;
            for (let i = 0; i < 7; i++) {
              const d = new Date(today);
              d.setDate(today.getDate() - i);
              const mk = `${d.getFullYear()}-${d.getMonth()}`;
              const di = d.getDate() - 1;
              habits.forEach(h => {
                const active = !h.monthScope || h.monthScope.includes(mk);
                if (!active) return;
                const s = h.records?.[mk]?.[di];
                if (s === 'done') { done++; total++; }
                else if (s === 'missed') { total++; }
              });
            }
            habitSuccessRate = total > 0 ? (done / total) * 100 : 100;
          }
        } catch (e) {}
      }

      // --- 4. AGGREGATE PULSE ---
      // Weighting: Health (40%), Goals (35%), Habits (25%)
      const pulseScore = Math.round(
        (healthReadiness * 0.4) + (goalHealth * 0.35) + (habitSuccessRate * 0.25)
      );

      const scoreLabel = pulseScore >= 90 ? 'Stable' : pulseScore >= 75 ? 'Optimal' : pulseScore >= 50 ? 'Warning' : 'Critical';

      // --- 5. PRIORITY ACTIONS ---
      const actions: PulseAction[] = [];

      // Critical Tiers
      const expired = healthIssues.filter(i => i.type === 'EXPIRED');
      if (expired.length > 0) {
        actions.push({
          id: 'health-expired',
          tier: 'CRITICAL',
          type: 'HEALTH',
          label: `Replace ${expired[0].name}${expired.length > 1 ? ` & ${expired.length - 1} more` : ''}`,
          href: '/health-system?filter=EXPIRED'
        });
      }
      if (overdueCount > 0) {
        actions.push({
          id: 'goals-overdue',
          tier: 'CRITICAL',
          type: 'GOALS',
          label: `${overdueCount} task${overdueCount !== 1 ? 's' : ''} overdue`,
          href: '/goals'
        });
      }

      // Daily Tiers
      if (dueTodayCount > 0) {
        actions.push({
          id: 'goals-today',
          tier: 'DAILY',
          type: 'GOALS',
          label: `${dueTodayCount} task${dueTodayCount !== 1 ? 's' : ''} due today`,
          href: '/goals'
        });
      }
      if (pendingHabitsCount > 0) {
        actions.push({
          id: 'habits-today',
          tier: 'DAILY',
          type: 'HABITS',
          label: `${pendingHabitsCount} habit${pendingHabitsCount !== 1 ? 's' : ''} pending`,
          href: '/habits'
        });
      }

      // Maintenance Tiers
      const missing = healthIssues.filter(i => i.type === 'MISSING');
      if (missing.length > 0) {
        actions.push({
          id: 'health-missing',
          tier: 'MAINTENANCE',
          type: 'HEALTH',
          label: `Restock ${missing[0].name}`,
          href: '/health-system?filter=MISSING'
        });
      }
      const low = healthIssues.filter(i => i.type === 'LOW');
      if (low.length > 0) {
        actions.push({
          id: 'health-low',
          tier: 'MAINTENANCE',
          type: 'HEALTH',
          label: `Refill ${low[0].name}`,
          href: '/health-system?filter=LOW'
        });
      }

      // --- 6. MILESTONE PREP ---
      let milestoneData = null;
      if (nextMilestone) {
        const msDate = new Date(nextMilestone.dueDate);
        const diff = Math.ceil((msDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        milestoneData = {
          title: nextMilestone.title,
          daysDesc: diff === 0 ? 'Due Today' : diff === 1 ? 'Due Tomorrow' : `In ${diff} days`,
          bucket: nextMilestone.bucketId || 'Goal'
        };
      }

      setPulse({
        ready: true,
        score: pulseScore,
        scoreLabel,
        actions,
        milestone: milestoneData,
        stats: { healthReadiness, goalHealth, habitConsistency: habitSuccessRate }
      });
    };

    calculatePulse();

    const handleStorage = (e: any) => {
      calculatePulse();
    };
    window.addEventListener('local-storage-change', handleStorage);
    window.addEventListener('storage', calculatePulse); // Cross-tab support
    
    return () => {
      window.removeEventListener('local-storage-change', handleStorage);
      window.removeEventListener('storage', calculatePulse);
    };
  }, []);

  return pulse;
}
