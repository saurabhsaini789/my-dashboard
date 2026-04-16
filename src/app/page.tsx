"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Quotes } from '@/components/widgets/Quotes';
import { GoalsSummary } from '@/components/widgets/GoalsSummary';
import { TasksCalendar } from '@/components/widgets/TasksCalendar';
import { OneNoteJournal } from '@/components/widgets/OneNoteJournal';
import { getPrefixedKey } from '@/lib/keys';
import { PageTitle, SectionTitle, Text, Description } from '@/components/ui/Text';

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
                        if (dayStatus === 'none' || dayStatus === undefined) {
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
            <div className="mx-auto w-full max-w-7xl">

                {/* Page Title */}
                <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="flex flex-col items-start">
                        <PageTitle>
                            Today Actions
                        </PageTitle>
                        <Description>Review and manage your critical alerts, daily tasks, and system insights.</Description>
                    </div>
                </header>

                {/* Page Status Container */}
                <div className="fade-in bg-white dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-6 md:p-8 mb-14 shadow-sm">
                    <div className="w-full flex flex-col md:flex-row gap-8 md:gap-12">
                        {/* Action Queue */}
                        <div className="w-full md:w-1/2">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-baseline gap-3 mb-0">
                                    <SectionTitle className="mb-0">Pending Actions</SectionTitle>

                                    <div className="flex items-center gap-2">
                                        <Text variant="bodySmall" className="font-semibold text-rose-600 dark:text-rose-400">
                                            {totalIssues > 0
                                                ? `${totalIssues} item${totalIssues !== 1 ? 's' : ''} need attention`
                                                : 'All systems stable'}
                                        </Text>

                                        {actionSegments.length > 0 && (
                                            <>
                                                <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
                                                <Text variant="label" as="span" className="text-zinc-500 dark:text-zinc-500">
                                                    {actionSegments.join(' · ')}
                                                </Text>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {actionQueue.length === 0 ? (
                                    <div className="flex flex-col gap-1.5 py-2">
                                        <Text variant="bodySmall" muted as="p" className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80"></span>
                                            All systems in good condition
                                        </Text>

                                        {expiredCount === 0 && missingCount === 0 && lowCount === 0 && (
                                            <Text variant="bodySmall" muted as="p" className="flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80"></span>
                                                All medical items are well stocked
                                            </Text>

                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        {actionQueue.map((action) => {
                                            const badgeClass =
                                                action.type === 'EXPIRED'
                                                    ? 'text-rose-600 bg-rose-50/80 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-100/50 dark:border-rose-500/20'
                                                    : action.type === 'MISSING' || action.type === 'OVERDUE_TASK'
                                                        ? 'text-amber-600 bg-amber-50/80 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-100/50 dark:border-amber-500/20'
                                                        : 'text-zinc-500 bg-zinc-50/80 dark:bg-zinc-800/50 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-700/50';

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
                                                    className="group flex justify-between items-center py-1.5 px-3 -mx-3 rounded-lg hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50 transition-all text-sm border border-transparent"
                                                >
                                                    <Text variant="body" as="span" className="font-medium truncate pr-4 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 transition-colors">
                                                        {action.label}
                                                    </Text>
                                                    <Text variant="label" as="span" className={`px-2 py-0.5 rounded-md shrink-0 transition-colors ${badgeClass}`}>
                                                        {badgeLabel}
                                                    </Text>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

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
                            if (overdueCount === 0)
                                patternInsights.push('No pending tasks for today');
                            else
                                patternInsights.push(`${overdueCount} overdue task${overdueCount !== 1 ? 's' : ''}`);
                            if (lowCount >= 3)
                                patternInsights.push('Some items frequently run low — consider increasing target levels');
                            if (pendingHabitsCount >= 3)
                                patternInsights.push('Multiple habits pending — consider reducing daily load');
                            if (overdueCount >= 2)
                                patternInsights.push('You often have overdue tasks — review workload planning');
                            if (missingCount >= 2)
                                patternInsights.push('Essential items missing — maintain minimum stock levels');

                            // Combine: risk first, then pattern, cap at 10
                            const combined = [...riskInsights, ...patternInsights].slice(0, 10);
                            if (combined.length === 0) return null;
                            return (
                                <div className="w-full md:w-1/2 flex flex-col gap-3 pt-6 md:pt-0 pl-0 md:pl-12 border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800/50">
                                    <SectionTitle>System Insights</SectionTitle>
                                    {combined.map((insight, i) => (
                                        <div key={i} className="flex gap-3 items-start group">
                                            <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 group-hover:bg-teal-500/50 dark:group-hover:bg-teal-400/50 transition-colors shrink-0" />
                                            <Text variant="body" as="p" className="leading-snug">
                                                {insight}
                                            </Text>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>
                </div>

                {/* Top Section: Quotes */}
                <section className="w-full fade-in mb-14">
                    <div className="w-full">
                        <Quotes />
                    </div>
                </section>

                {/* Middle Section: Full Width Calendar */}
                <section className="w-full fade-in mb-14" style={{ animationDelay: '100ms' }}>
                    <TasksCalendar />
                </section>

                {/* Bottom Section */}
                <section className="w-full fade-in pb-12" style={{ animationDelay: '200ms' }}>
                    <div className="w-full">
                        <OneNoteJournal />
                    </div>
                </section>

            </div>
        </main>
    );
}
