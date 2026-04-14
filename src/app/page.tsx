"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Quotes } from '@/components/widgets/Quotes';
import { GoalsSummary } from '@/components/widgets/GoalsSummary';
import { TasksCalendar } from '@/components/widgets/TasksCalendar';
import { HabitsOverview } from '@/components/widgets/HabitsOverview';
import { OneNoteJournal } from '@/components/widgets/OneNoteJournal';
import { getPrefixedKey } from '@/lib/keys';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [expiredCount, setExpiredCount] = useState(0);
  const [missingCount, setMissingCount] = useState(0);
  const [lowCount, setLowCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [dueTodayCount, setDueTodayCount] = useState(0);
  const [pendingHabitsCount, setPendingHabitsCount] = useState(0);
  // Item-level name lists for smart action labels
  const [expiredItems, setExpiredItems] = useState<string[]>([]);
  const [missingItems, setMissingItems] = useState<string[]>([]);
  const [lowItems, setLowItems] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);

    // --- Health system: collect item names per status ---
    const healthKeys = [
      'MEDICINE_INVENTORY',
      'TRAVEL_MEDICAL_KIT',
      'FIRST_AID_HOME',
      'FIRST_AID_MOBILE',
      'SUPPLEMENTS'
    ];
    const expiredNames: string[] = [];
    const missingNames: string[] = [];
    const lowNames: string[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    healthKeys.forEach(key => {
      const saved = localStorage.getItem(getPrefixedKey(key));
      if (saved) {
        try {
          const items = JSON.parse(saved);
          if (Array.isArray(items)) {
            items.forEach((item: any) => {
              const name: string = item.name || item.medicineName || item.itemName || 'Item';
              const expiry = new Date(item.expiryDate);
              expiry.setHours(0, 0, 0, 0);
              if (expiry < today) expiredNames.push(name);
              else if (item.quantity === 0) missingNames.push(name);
              else if (item.quantity < (item.targetQuantity || 1)) lowNames.push(name);
            });
          }
        } catch (e) { /* skip */ }
      }
    });

    setExpiredItems(expiredNames);
    setMissingItems(missingNames);
    setLowItems(lowNames);
    setExpiredCount(expiredNames.length);
    setMissingCount(missingNames.length);
    setLowCount(lowNames.length);

    // --- Tasks: overdue + due today counts ---
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const savedProjects = localStorage.getItem(getPrefixedKey('goals_projects'));
    let overdue = 0;
    let dueToday = 0;
    if (savedProjects) {
      try {
        const projects = JSON.parse(savedProjects);
        if (Array.isArray(projects)) {
          projects.forEach((p: any) => {
            if (!p.isCompleted && p.status !== 'completed' && p.dueDate) {
              if (p.dueDate < todayStr) overdue++;
              else if (p.dueDate === todayStr) dueToday++;
            }
          });
        }
      } catch (e) { /* skip */ }
    }
    setOverdueCount(overdue);
    setDueTodayCount(dueToday);

    // --- Habits: pending today count ---
    const savedHabits = localStorage.getItem(getPrefixedKey('os_habits'));
    let pending = 0;
    if (savedHabits) {
      try {
        const habits = JSON.parse(savedHabits);
        if (Array.isArray(habits)) {
          const monthKey = `${today.getFullYear()}-${today.getMonth()}`;
          const dayIndex = today.getDate() - 1;
          habits.forEach((h: any) => {
            // Check if habit is active for this month
            const isActive = !h.monthScope || h.monthScope.length === 0 || h.monthScope.includes(monthKey);
            if (!isActive) return;
            const dayStatus = h.records?.[monthKey]?.[dayIndex];
            if (dayStatus !== 'done') {
              pending++;
            }
          });
        }
      } catch (e) { /* skip */ }
    }
    setPendingHabitsCount(pending);
  }, []);

  // --- Smart label builder ---
  // Shows up to `maxShow` item names; if more, appends "(N items)" fallback.
  const buildItemLabel = (prefix: string, names: string[], maxShow = 2): string => {
    if (names.length === 0) return prefix;
    if (names.length <= maxShow) return `${prefix}: ${names.join(', ')}`;
    const shown = names.slice(0, maxShow).join(', ');
    const remaining = names.length - maxShow;
    return `${prefix}: ${shown} +${remaining} more`;
  };

  if (!mounted) return null;

  const totalIssues = expiredCount + missingCount + lowCount + overdueCount;

  // Build action strip segments
  const actionSegments: string[] = [];
  if (expiredCount > 0) actionSegments.push(`${expiredCount} expired`);
  if (missingCount > 0) actionSegments.push(`${missingCount} missing`);
  if (lowCount > 0) actionSegments.push(`${lowCount} low`);
  if (overdueCount > 0) actionSegments.push(`${overdueCount} overdue`);

  // Priority map: lower number = higher priority
  const PRIORITY_MAP: Record<string, number> = {
    EXPIRED: 0,
    MISSING: 1,
    OVERDUE_TASK: 2,
    LOW: 3,
    TODAY_TASK: 4,
    HABIT: 5,
  };

  // Build action queue items with item-specific labels
  const actionQueue: { label: string; href: string; type: string }[] = [];
  if (expiredCount > 0) actionQueue.push({ label: buildItemLabel('Replace expired', expiredItems, 2), href: '/health-system?filter=EXPIRED', type: 'EXPIRED' });
  if (missingCount > 0) actionQueue.push({ label: buildItemLabel('Restock', missingItems, 2), href: '/health-system?filter=MISSING', type: 'MISSING' });
  if (overdueCount > 0) actionQueue.push({ label: 'Complete overdue tasks', href: '/goals', type: 'OVERDUE_TASK' });
  if (lowCount > 0) actionQueue.push({ label: buildItemLabel('Refill', lowItems, 2), href: '/health-system?filter=LOW', type: 'LOW' });
  if (dueTodayCount > 0) actionQueue.push({ label: 'Tasks due today', href: '/goals', type: 'TODAY_TASK' });
  if (pendingHabitsCount > 0) actionQueue.push({ label: `${pendingHabitsCount} habit${pendingHabitsCount !== 1 ? 's' : ''} pending today`, href: '/habits', type: 'HABIT' });

  // Sort by priority
  actionQueue.sort((a, b) => (PRIORITY_MAP[a.type] ?? 99) - (PRIORITY_MAP[b.type] ?? 99));

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 selection:bg-teal-500/30 font-sans p-4 md:p-8 xl:p-12">
      <div className="mx-auto w-full max-w-7xl flex flex-col gap-12 pt-4">
        
        {/* Page Title */}
        <div className="text-center fade-in">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900/80 dark:text-zinc-100/80">
            Today
          </h1>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mt-1">
            {totalIssues > 0
              ? `${totalIssues} item${totalIssues !== 1 ? 's' : ''} need attention`
              : 'All systems stable'}
          </p>

          {/* Action Strip */}
          {actionSegments.length > 0 && (
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mt-2">
              {actionSegments.join(' · ')}
            </p>
          )}

          {/* Action Queue */}
          {actionQueue.length === 0 ? (
            <div className="mt-2 flex flex-col gap-0.5">
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                All systems in good condition
              </p>
              {expiredCount === 0 && missingCount === 0 && lowCount === 0 && (
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  All medical items are well stocked
                </p>
              )}
            </div>
          ) : (
            <div className="mt-2 flex flex-col w-full max-w-sm mx-auto">
              {actionQueue.map((action) => {
                const badgeClass =
                  action.type === 'EXPIRED'
                    ? 'text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400'
                    : action.type === 'MISSING' || action.type === 'OVERDUE_TASK'
                    ? 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400'
                    : 'text-zinc-500 bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400';

                const badgeLabel =
                  action.type === 'EXPIRED'
                    ? 'Expired'
                    : action.type === 'MISSING'
                    ? 'Missing'
                    : action.type === 'OVERDUE_TASK'
                    ? 'Overdue'
                    : action.type === 'LOW'
                    ? 'Low'
                    : action.type === 'TODAY_TASK'
                    ? 'Today'
                    : 'Habit';

                return (
                  <Link
                    key={action.type}
                    href={action.href}
                    className="flex justify-between items-center py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                  >
                    <span>{action.label}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ml-3 shrink-0 ${badgeClass}`}>
                      {badgeLabel}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Cross-system Insights */}
          {(() => {
            // Tier 1: Risk insights (highest priority)
            const riskInsights: string[] = [];
            if (expiredCount > 0 && missingCount > 0)
              riskInsights.push('Critical gaps in medical inventory');
            if (lowCount >= 5)
              riskInsights.push('Multiple items running low — restock soon');
            if (overdueCount > 0 && pendingHabitsCount > 2)
              riskInsights.push('High workload today — focus on essentials');
            const totalActions = expiredCount + missingCount + lowCount + overdueCount + dueTodayCount + pendingHabitsCount;
            if (totalActions > 5)
              riskInsights.push('Multiple areas need attention today');

            // Tier 2: Pattern insights
            const patternInsights: string[] = [];
            if (lowCount >= 3)
              patternInsights.push('Some items frequently run low — consider increasing target levels');
            if (pendingHabitsCount >= 3)
              patternInsights.push('Multiple habits pending — consider reducing daily load');
            if (overdueCount >= 2)
              patternInsights.push('You often have overdue tasks — review workload planning');
            if (missingCount >= 2)
              patternInsights.push('Essential items missing — maintain minimum stock levels');

            // Combine: risk first, then pattern, cap at 3
            const combined = [...riskInsights, ...patternInsights].slice(0, 3);
            if (combined.length === 0) return null;
            return (
              <div className="mt-3 flex flex-col gap-1 w-full max-w-sm mx-auto">
                {combined.map((insight, i) => (
                  <p key={i} className="text-sm text-zinc-600 dark:text-zinc-400">
                    {insight}
                  </p>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Top Section: Goals Summary and Quotes */}
        <section className="w-full flex flex-col lg:flex-row gap-6 fade-in">
          <div className="w-full lg:w-1/2 flex flex-col">
            <div className="h-full"> 
              <GoalsSummary />
            </div>
          </div>
          <div className="w-full lg:w-1/2 flex flex-col">
            <Quotes />
          </div>
        </section>

        {/* Middle Section: Full Width Calendar */}
        <section className="w-full fade-in" style={{ animationDelay: '100ms' }}>
          {overdueCount > 0 ? (
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">{overdueCount} overdue task{overdueCount !== 1 ? 's' : ''}</p>
          ) : (
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">No pending tasks for today</p>
          )}
          <TasksCalendar />
        </section>

        {/* Bottom Section */}
        <section className="w-full flex flex-col xl:flex-row gap-6 fade-in pb-12" style={{ animationDelay: '200ms' }}>
          <div className="w-full xl:w-1/2">
            {pendingHabitsCount > 0 ? (
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">{pendingHabitsCount} habit{pendingHabitsCount !== 1 ? 's' : ''} pending today</p>
            ) : (
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">All habits completed today</p>
            )}
            <HabitsOverview />
          </div>
          <div className="w-full xl:w-1/2">
            <OneNoteJournal />
          </div>
        </section>
        
      </div>
    </main>
  );
}
