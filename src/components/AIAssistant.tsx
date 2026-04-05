"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, RotateCcw } from "lucide-react";
import { usePathname } from "next/navigation";
import { updateAssetFromExpense, updateRecipientFromExpense, updateAssetFromIncome, updateLiabilityFromExpense } from "@/lib/finances";
import { getPrefixedKey } from "@/lib/keys";
import { setSyncedItem } from "@/lib/storage";
import { sendMessageToEva } from "@/lib/ai";


interface Message {
  id: string;
  role: "user" | "assistant";
  content?: string;
  timestamp: Date;
  toolCalls?: any[];
  functionResponse?: any;
  rawParts?: any[];
}

export function AIAssistant() {
  const pathname = usePathname();

  const getGreeting = () => {
    if (pathname?.startsWith('/habits')) {
      return "Hey… ready to become 1% better today? I've got you 💛";
    }
    if (pathname?.startsWith('/finances')) {
      return "Hey, ready to make smart money moves today? 😉";
    }
    if (pathname?.startsWith('/pantry')) {
      return "Hey… what's on the list today? Let's get it sorted 🛒😄";
    }
    if (pathname?.startsWith('/books')) {
      return "Hey… what are we exploring today? 📚✨";
    }
    if (pathname?.startsWith('/businesses')) {
      return "Let’s get things moving… what are we working on today? 💼⚡";
    }
    if (pathname?.startsWith('/projects') || pathname?.startsWith('/goals')) {
      return "Let’s build something meaningful today… what’s the goal? 🎯✨";
    }
    return "Hey! I'm Eva — your personal assistant. What can I help you with? ✨";
  };

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: getGreeting(),
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const executeToolCall = async (toolCall: any) => {
    const { getPrefixedKey } = await import('@/lib/keys');

    if (toolCall.name === "insert_record") {
      const { tableKey, payload } = toolCall.args;
      let parsedPayload: any = {};
      try {
        parsedPayload = JSON.parse(payload);
      } catch(e) {
        return { success: false, error: "Invalid JSON payload format." };
      }
      
      try {
        let finalDate = parsedPayload.date || new Date().toISOString().split('T')[0];
        if (isNaN(new Date(finalDate).getTime())) finalDate = new Date().toISOString().split('T')[0];

        const finalRecord = {
          ...parsedPayload,
          id: crypto.randomUUID(),
          amount: parseFloat(parsedPayload.amount) || 0,
          date: finalDate,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { setSyncedItem } = await import('@/lib/storage');
        const pKey = getPrefixedKey(tableKey);
        
        let currentData = [];
        try {
          const raw = localStorage.getItem(pKey);
          if (raw) currentData = JSON.parse(raw);
          if (!Array.isArray(currentData)) currentData = [];
        } catch (e) {
          currentData = [];
        }
        
        currentData.unshift(finalRecord);
        setSyncedItem(tableKey, JSON.stringify(currentData));

        // Cascading Relational Updates using Standard Library Helpers
        if (tableKey === 'finances_income') {
          updateAssetFromIncome(finalRecord.id, finalRecord.assetId, finalRecord.amount, finalRecord.date);
        } else if (tableKey === 'finances_expenses') {
          updateAssetFromExpense(finalRecord.id, finalRecord.assetId, finalRecord.amount, finalRecord.date);
          if (finalRecord.paidToType && finalRecord.paidToType !== 'other') {
            if (finalRecord.paidToType === 'liability') {
              updateLiabilityFromExpense(finalRecord.id, finalRecord.paidToId, finalRecord.amount, finalRecord.date);
            } else {
              updateRecipientFromExpense(finalRecord.id, finalRecord.paidToType, finalRecord.paidToId, finalRecord.amount, finalRecord.date);
            }
          }
        }
        
        return { success: true, message: "Record inserted successfully." };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    if (toolCall.name === "query_records") {
      const { tableKey: rawTableKey, filters } = toolCall.args;

      // Normalize tableKey if Eva sends short form
      const keyMap: Record<string, string> = {
        expenses: 'finances_expenses',
        income: 'finances_income',
        assets: 'finances_assets',
        liabilities: 'finances_liabilities',
        goals: 'finances_goals',
        savings: 'finances_goals',
        'savings targets': 'finances_goals',
        emergency: 'finances_emergency_fund',
        'emergency fund': 'finances_emergency_fund',
        'emergency funds': 'finances_emergency_fund',
        habits: 'os_habits',
        habit: 'os_habits',
      };
      const tableKey = keyMap[rawTableKey?.toLowerCase()] || rawTableKey;

      // Tables that hold state/balances, not transaction arrays
      const SNAPSHOT_TABLES = ['finances_emergency_fund', 'finances_assets', 'finances_liabilities', 'finances_goals', 'os_habits'];

      try {
        const pKey = getPrefixedKey(tableKey);

        // Debug: log what Eva is actually searching
        const sampleKeys = Object.keys(localStorage).filter(k => k.includes('finances'));
        console.log('[Eva Query]', { rawTableKey, tableKey, pKey, filters, availableKeys: sampleKeys });

        const raw = localStorage.getItem(pKey);
        if (!raw) {
          return { 
            success: false, 
            message: `Table not found: '${tableKey}'. Searched key '${pKey}'. Available finance keys: ${sampleKeys.join(', ')}.`,
          };
        }
        
        let data = JSON.parse(raw);

        // === SNAPSHOT TABLE: return current balances, not transaction list ===
        if (SNAPSHOT_TABLES.includes(tableKey)) {
          if (tableKey === 'finances_emergency_fund') {
            // Could be single object or array
            const fund = Array.isArray(data) ? data[0] : data;
            return {
              success: true,
              type: 'snapshot',
              table: tableKey,
              data: Array.isArray(data) ? data : [data],
              summary: fund
                ? `Emergency Fund: Current balance $${fund.currentAmount ?? fund.balance ?? fund.amount ?? 'N/A'}, Target: $${fund.targetAmount ?? fund.target ?? 'N/A'}`
                : 'No emergency fund data found.',
            };
          }
          if (tableKey === 'finances_assets') {
            const items = Array.isArray(data) ? data : [data];
            const totalBalance = items.reduce((s: number, a: any) => s + (parseFloat(a.balance ?? a.amount ?? 0)), 0);
            return {
              success: true,
              type: 'snapshot',
              table: tableKey,
              summary: `You have ${items.length} asset(s) with a total balance of $${totalBalance.toFixed(2)}.`,
              items: items.map((a: any) => ({ name: a.name, balance: a.balance ?? a.amount })),
            };
          }
          if (tableKey === 'finances_liabilities') {
            const items = Array.isArray(data) ? data : [data];
            const totalOwed = items.reduce((s: number, l: any) => s + (parseFloat(l.remainingBalance ?? l.balance ?? l.amount ?? 0)), 0);
            return {
              success: true,
              type: 'snapshot',
              table: tableKey,
              summary: `You have ${items.length} loan(s)/liability(s) with a total remaining balance of $${totalOwed.toFixed(2)}.`,
              items: items.map((l: any) => ({ name: l.name, remaining: l.remainingBalance ?? l.balance })),
            };
          }
          if (tableKey === 'finances_goals') {
            const items = Array.isArray(data) ? data : [data];
            return {
              success: true,
              type: 'snapshot',
              table: tableKey,
              summary: `You have ${items.length} savings goal(s).`,
              items: items.map((g: any) => ({ name: g.name, saved: g.currentAmount ?? g.saved ?? 0, target: g.targetAmount ?? g.target })),
            };
          }
          if (tableKey === 'os_habits') {
            const items = Array.isArray(data) ? data : [data];
            const today = new Date();
            const monthKey = `${today.getFullYear()}-${today.getMonth()}`;
            const todayIndex = today.getDate() - 1;
            return {
              success: true,
              type: 'snapshot',
              table: tableKey,
              summary: `You have ${items.length} habits tracked.`,
              habits: items.map((h: any) => {
                const monthDays: string[] = h.records?.[monthKey] || [];
                const todayStatus = monthDays[todayIndex] || 'none';
                const doneCount = monthDays.filter((s: string) => s === 'done').length;
                const missedCount = monthDays.filter((s: string) => s === 'missed').length;
                return { id: h.id, name: h.name, todayStatus, doneThisMonth: doneCount, missedThisMonth: missedCount };
              }),
            };
          }
        }

        // === LEDGER TABLE: filter transactions ===
        if (!Array.isArray(data)) return { success: true, message: "No valid records found.", data: [] };

        const totalInTable = data.length;

        // Apply filters (more flexible matching)
        if (filters) {
          const searchCat = filters.category?.toLowerCase();
          const searchSub = filters.subcategory?.toLowerCase();

          if (filters.startDate) {
            data = data.filter((r: any) => r.date >= filters.startDate);
          }
          if (filters.endDate) {
            data = data.filter((r: any) => r.date <= filters.endDate);
          }
          
          if (searchCat) {
            // Match against category OR subcategory
            data = data.filter((r: any) => 
               r.category?.toLowerCase() === searchCat || 
               r.subcategory?.toLowerCase() === searchCat ||
               r.category?.toLowerCase().includes(searchCat) ||
               r.subcategory?.toLowerCase().includes(searchCat)
            );
          }
          if (searchSub) {
            data = data.filter((r: any) => 
               r.subcategory?.toLowerCase() === searchSub ||
               r.subcategory?.toLowerCase().includes(searchSub)
            );
          }
        }

        if (data.length === 0) {
           return { 
             success: true, 
             message: `No records found matching these specific filters. However, this table contains ${totalInTable} total records.`,
             totalRecordsInTable: totalInTable,
             data: [] 
           };
        }

        // Summarize results if many records
        const totalAmount = data.reduce((sum: number, r: any) => sum + (parseFloat(r.amount) || 0), 0);
        
        if (data.length > 0) {
           // Categorized summary
           const summary: Record<string, number> = {};
           data.forEach((r: any) => {
             const cat = r.category || 'Other';
             summary[cat] = (summary[cat] || 0) + (parseFloat(r.amount) || 0);
           });
           
           // Detailed top items
           const sorted = [...data].sort((a,b) => (parseFloat(b.amount) || 0) - (parseFloat(a.amount) || 0));
           const topItems = sorted.slice(0, 5).map(r => ({ description: r.subcategory || r.category, amount: r.amount, date: r.date }));

           return {
             success: true,
             count: data.length,
             totalAmount: totalAmount.toFixed(2),
             averageAmount: (totalAmount / data.length).toFixed(2),
             categorizedSummary: summary,
             topItems: topItems,
             message: `Found ${data.length} records totaling $${totalAmount.toFixed(2)}.`
           };
        }
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    if (toolCall.name === "update_habit_status") {
      const { habitName, date, status } = toolCall.args;
      try {
        const pKey = getPrefixedKey('os_habits');
        const raw = localStorage.getItem(pKey);
        if (!raw) return { success: false, error: "No habits found." };
        let habits = JSON.parse(raw);
        if (!Array.isArray(habits)) return { success: false, error: "Invalid habits data." };

        const d = date ? new Date(date) : new Date();
        const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
        const dayIndex = d.getDate() - 1;
        const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();

        const match = habits.find((h: any) => h.name?.toLowerCase() === habitName?.toLowerCase());
        if (!match) {
          const names = habits.map((h: any) => h.name).join(', ');
          return { success: false, error: `Habit "${habitName}" not found. Available: ${names}` };
        }

        const { setSyncedItem } = await import('@/lib/storage');
        const updatedHabits = habits.map((h: any) => {
          if (h.id !== match.id) return h;
          const newRecords = { ...h.records };
          const monthDays: string[] = newRecords[monthKey] ? [...newRecords[monthKey]] : Array(daysInMonth).fill('none');
          while (monthDays.length < daysInMonth) monthDays.push('none');
          monthDays[dayIndex] = status;
          newRecords[monthKey] = monthDays;
          return { ...h, records: newRecords };
        });
        setSyncedItem('os_habits', JSON.stringify(updatedHabits));
        return { success: true, message: `Updated "${match.name}" to '${status}' on ${d.toDateString()}.` };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    if (toolCall.name === "add_habit") {
      const { name, scope } = toolCall.args;
      try {
        const pKey = getPrefixedKey('os_habits');
        const raw = localStorage.getItem(pKey);
        let habits = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(habits)) habits = [];

        // Check for duplicates
        if (habits.find((h: any) => h.name?.toLowerCase() === name?.toLowerCase())) {
          return { success: false, error: `A habit named "${name}" already exists.` };
        }

        const today = new Date();
        const getScopeMonths = (sc: string) => {
          const y = today.getFullYear(), m = today.getMonth();
          if (sc === 'all') return undefined;
          const countMap: Record<string, number> = { 'this-month': 1, 'next-1': 2, 'next-2': 3, 'next-3': 4, 'next-6': 7 };
          const count = countMap[sc] ?? 1;
          return Array.from({ length: count }, (_, i) => {
            const d = new Date(y, m + i, 1);
            return `${d.getFullYear()}-${d.getMonth()}`;
          });
        };

        const newHabit = {
          id: crypto.randomUUID(),
          name: name.trim(),
          records: {},
          monthScope: getScopeMonths(scope || 'all'),
        };

        const { setSyncedItem } = await import('@/lib/storage');
        habits.push(newHabit);
        setSyncedItem('os_habits', JSON.stringify(habits));
        return { success: true, message: `Habit "${name}" added successfully.` };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    // ─── PROJECTS & GOALS TOOLS ──────────────────────────────────────────────

    if (toolCall.name === "query_projects") {
      const { filters } = toolCall.args || {};
      try {
        const pKey = getPrefixedKey('goals_projects');
        const raw = localStorage.getItem(pKey);
        if (!raw) return { success: true, count: 0, items: [], summary: 'No projects found.' };
        let items: any[] = JSON.parse(raw);
        if (!Array.isArray(items)) return { success: false, error: 'Data corrupted.' };

        if (filters?.bucketId) items = items.filter((i: any) => i.bucketId?.toLowerCase() === filters.bucketId.toLowerCase());
        if (filters?.status) items = items.filter((i: any) => i.status?.toLowerCase() === filters.status.toLowerCase());
        if (filters?.isImportant !== undefined) items = items.filter((i: any) => i.isImportant === filters.isImportant);

        const summary = `Found ${items.length} project(s).`;
        return { success: true, count: items.length, summary, items };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    if (toolCall.name === "upsert_project") {
      const { projectId, payload } = toolCall.args || {};
      try {
        let data: any = {};
        try { data = JSON.parse(payload); } catch { return { success: false, error: 'Invalid JSON payload.' }; }

        const pKey = getPrefixedKey('goals_projects');
        const raw = localStorage.getItem(pKey);
        let projects: any[] = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(projects)) projects = [];

        const { setSyncedItem } = await import('@/lib/storage');

        if (projectId) {
          const idx = projects.findIndex((p: any) => p.id === projectId);
          if (idx === -1) return { success: false, error: `Project not found.` };
          
          if (data.status === 'completed') {
             data.isCompleted = true;
             data.completedAt = new Date().toISOString();
          } else if (data.status && data.status !== 'completed') {
             data.isCompleted = false;
          }

          projects[idx] = { ...projects[idx], ...data, id: projectId };
          setSyncedItem('goals_projects', JSON.stringify(projects));
          return { success: true, message: `Updated project "${projects[idx].title}".`, project: projects[idx] };
        } else {
          const newProject = {
            id: crypto.randomUUID(),
            bucketId: 'Learning',
            status: 'not-started',
            isImportant: false,
            dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            tasks: [],
            ...data
          };
          if (newProject.status === 'completed') {
            newProject.isCompleted = true;
            newProject.completedAt = new Date().toISOString();
          }
          projects.push(newProject);
          setSyncedItem('goals_projects', JSON.stringify(projects));
          return { success: true, message: `Created project "${newProject.title}".`, project: newProject };
        }
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    if (toolCall.name === "upsert_project_task") {
      const { projectId, taskId, payload } = toolCall.args || {};
      try {
        let data: any = {};
        try { data = JSON.parse(payload); } catch { return { success: false, error: 'Invalid JSON payload.' }; }
        if (!taskId && !data.title) return { success: false, error: 'Missing title for new task.' };

        const pKey = getPrefixedKey('goals_projects');
        const raw = localStorage.getItem(pKey);
        let projects: any[] = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(projects)) return { success: false, error: 'Data corrupted.' };

        const idx = projects.findIndex((p: any) => p.id === projectId);
        if (idx === -1) return { success: false, error: `Project not found.` };

        const project = projects[idx];
        if (!Array.isArray(project.tasks)) project.tasks = [];

        if (taskId) {
           const tIdx = project.tasks.findIndex((t: any) => t.id === taskId);
           if (tIdx === -1) return { success: false, error: `Task not found.` };
           
           if (data.isCompleted !== undefined && data.isCompleted !== project.tasks[tIdx].isCompleted) {
              data.completedAt = data.isCompleted ? new Date().toISOString() : undefined;
           }

           project.tasks[tIdx] = { ...project.tasks[tIdx], ...data, id: taskId };
           projects[idx] = project;
           const { setSyncedItem } = await import('@/lib/storage');
           setSyncedItem('goals_projects', JSON.stringify(projects));
           return { success: true, message: `Updated task in "${project.title}".`, task: project.tasks[tIdx] };
        } else {
           const newTask = {
             id: crypto.randomUUID(),
             isCompleted: false,
             ...data
           };
           project.tasks.push(newTask);
           projects[idx] = project;
           const { setSyncedItem } = await import('@/lib/storage');
           setSyncedItem('goals_projects', JSON.stringify(projects));
           return { success: true, message: `Added task "${newTask.title}" to project "${project.title}".`, task: newTask };
        }
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    if (toolCall.name === "delete_project") {
      const { projectId, projectTitle } = toolCall.args || {};
      try {
        const pKey = getPrefixedKey('goals_projects');
        const raw = localStorage.getItem(pKey);
        if (!raw) return { success: false, error: 'No data found.' };
        let items: any[] = JSON.parse(raw);
        const before = items.length;
        items = items.filter((i: any) => i.id !== projectId);
        if (items.length === before) return { success: false, error: `Project not found with ID: ${projectId}` };
        
        const { setSyncedItem } = await import('@/lib/storage');
        setSyncedItem('goals_projects', JSON.stringify(items));
        return { success: true, message: `"${projectTitle || projectId}" has been deleted.` };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    // ─── BUSINESS TOOLS ──────────────────────────────────────────────────────

    if (toolCall.name === "query_business_data") {
      const { tableKey, filters } = toolCall.args || {};
      try {
        const pKey = getPrefixedKey(tableKey);
        const raw = localStorage.getItem(pKey);
        if (!raw) return { success: true, count: 0, items: [], summary: 'No records found.' };
        let items: any[] = JSON.parse(raw);
        if (!Array.isArray(items)) return { success: false, error: 'Data corrupted.' };

        if (filters?.status) items = items.filter((i: any) => i.status?.toLowerCase() === filters.status.toLowerCase());
        if (filters?.platform) items = items.filter((i: any) => i.platform?.toLowerCase() === filters.platform.toLowerCase());
        if (filters?.channelId) items = items.filter((i: any) => i.channelId === filters.channelId);

        const summary = `Found ${items.length} record(s) in ${tableKey}.`;
        return { success: true, count: items.length, summary, items };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    if (toolCall.name === "upsert_business_channel") {
      const { channelId, payload, ...rest } = toolCall.args || {};
      try {
        let data: any = Object.keys(rest).length > 0 ? rest : {};
        if (payload && typeof payload === 'string') {
          try { data = { ...data, ...JSON.parse(payload) }; } catch {}
        }

        const pKey = getPrefixedKey('finances_business');
        const raw = localStorage.getItem(pKey);
        let channels: any[] = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(channels)) channels = [];

        const { setSyncedItem } = await import('@/lib/storage');

        if (channelId) {
          const idx = channels.findIndex((c: any) => c.id === channelId);
          if (idx === -1) return { success: false, error: `Channel not found.` };
          channels[idx] = { ...channels[idx], ...data, id: channelId };
          setSyncedItem('finances_business', JSON.stringify(channels));
          return { success: true, message: `Updated channel "${channels[idx].name}".`, channel: channels[idx] };
        } else {
          const newChannel = {
            id: crypto.randomUUID(),
            platform: 'Other',
            contentType: 'Mixed',
            status: 'Idea',
            postingFrequency: 7,
            lastPostedDate: new Date().toISOString().split('T')[0],
            nextPostDueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
            rowColor: '',
            ...data
          };
          channels.unshift(newChannel);
          setSyncedItem('finances_business', JSON.stringify(channels));
          return { success: true, message: `Created channel "${newChannel.name}".`, channel: newChannel };
        }
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    if (toolCall.name === "upsert_business_idea") {
      const { ideaId, payload, ...rest } = toolCall.args || {};
      try {
        let data: any = Object.keys(rest).length > 0 ? rest : {};
        if (payload && typeof payload === 'string') {
          try { data = { ...data, ...JSON.parse(payload) }; } catch {}
        }
        if (!ideaId && !data.channelId) return { success: false, error: 'Missing channelId for new idea.' };

        const pKey = getPrefixedKey('finances_business_ideas');
        const raw = localStorage.getItem(pKey);
        let ideas: any[] = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(ideas)) ideas = [];

        const { setSyncedItem } = await import('@/lib/storage');

        if (ideaId) {
          const idx = ideas.findIndex((i: any) => i.id === ideaId);
          if (idx === -1) return { success: false, error: `Idea not found.` };
          ideas[idx] = { ...ideas[idx], ...data, id: ideaId };
          setSyncedItem('finances_business_ideas', JSON.stringify(ideas));
          return { success: true, message: `Updated idea "${ideas[idx].title}".`, idea: ideas[idx] };
        } else {
          const newIdea = {
            id: crypto.randomUUID(),
            status: 'Pending',
            createdAt: new Date().toISOString(),
            ...data
          };
          ideas.unshift(newIdea);
          setSyncedItem('finances_business_ideas', JSON.stringify(ideas));
          return { success: true, message: `Created idea "${newIdea.title}".`, idea: newIdea };
        }
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    if (toolCall.name === "delete_business_record") {
      const { tableKey, recordId, recordName } = toolCall.args || {};
      try {
        const pKey = getPrefixedKey(tableKey);
        const raw = localStorage.getItem(pKey);
        if (!raw) return { success: false, error: 'No data found.' };
        let items: any[] = JSON.parse(raw);
        const before = items.length;
        items = items.filter((i: any) => i.id !== recordId);
        if (items.length === before) return { success: false, error: `Record not found with ID: ${recordId}` };
        
        const { setSyncedItem } = await import('@/lib/storage');
        // If deleting a channel, ideally we should delete its ideas too
        if (tableKey === 'finances_business') {
          const ideasKey = getPrefixedKey('finances_business_ideas');
          const rawIdeas = localStorage.getItem(ideasKey);
          if (rawIdeas) {
             let ideas: any[] = JSON.parse(rawIdeas);
             ideas = ideas.filter((i: any) => i.channelId !== recordId);
             setSyncedItem('finances_business_ideas', JSON.stringify(ideas));
          }
        }
        
        setSyncedItem(tableKey === 'finances_business' ? 'finances_business' : 'finances_business_ideas', JSON.stringify(items));
        return { success: true, message: `"${recordName || recordId}" has been deleted.` };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    // ─── BOOKS TOOLS ────────────────────────────────────────────────────────

    if (toolCall.name === "query_books") {
      const { tableKey, filters } = toolCall.args || {};
      try {
        const key = tableKey === 'os_books_completed' ? 'os_books_completed' : 'os_books_queue';
        const pKey = getPrefixedKey(key);
        const raw = localStorage.getItem(pKey);
        if (!raw) return { success: true, count: 0, items: [], summary: 'No books found.' };
        let items: any[] = JSON.parse(raw);
        if (!Array.isArray(items)) return { success: false, error: 'Data corrupted.' };

        if (filters?.status) items = items.filter((b: any) => b.status?.toLowerCase() === filters.status.toLowerCase());
        if (filters?.language) items = items.filter((b: any) => b.language?.toLowerCase() === filters.language.toLowerCase());
        if (filters?.category) items = items.filter((b: any) => b.category?.toLowerCase().includes(filters.category.toLowerCase()));
        if (filters?.name) items = items.filter((b: any) => b.name?.toLowerCase().includes(filters.name.toLowerCase()) || b.title?.toLowerCase().includes(filters.name.toLowerCase()));
        if (filters?.author) items = items.filter((b: any) => b.author?.toLowerCase().includes(filters.author.toLowerCase()));
        if (filters?.minRating) items = items.filter((b: any) => (b.rating || 0) >= Number(filters.minRating));

        const summary = key === 'os_books_completed'
          ? `Found ${items.length} completed book(s). Avg rating: ${ items.length ? (items.reduce((s: number, b: any) => s + (b.rating || 0), 0) / items.length).toFixed(1) : 'N/A' }.`
          : `Found ${items.length} book(s) in queue. Statuses: ${[...new Set(items.map((b: any) => b.status))].join(', ') || 'none'}.`;

        return { success: true, count: items.length, summary, items };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    if (toolCall.name === "upsert_queue_book") {
      const { bookId, payload } = toolCall.args || {};
      try {
        let data: any = {};
        try { data = JSON.parse(payload); } catch { return { success: false, error: 'Invalid JSON payload.' }; }

        const pKey = getPrefixedKey('os_books_queue');
        const raw = localStorage.getItem(pKey);
        let books: any[] = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(books)) books = [];

        const { setSyncedItem } = await import('@/lib/storage');

        if (bookId) {
          // Update
          const idx = books.findIndex((b: any) => b.id === bookId);
          if (idx === -1) return { success: false, error: `Book with ID ${bookId} not found in queue.` };
          books[idx] = { ...books[idx], ...data, id: bookId };
          setSyncedItem('os_books_queue', JSON.stringify(books));
          return { success: true, message: `Updated "${books[idx].name}" in queue.`, book: books[idx] };
        } else {
          // Insert
          const newBook = {
            id: crypto.randomUUID(),
            order: books.length + 1,
            status: 'Planned',
            language: 'English',
            category: 'Other',
            createdAt: new Date().toISOString(),
            ...data
          };
          books.push(newBook);
          setSyncedItem('os_books_queue', JSON.stringify(books));
          return { success: true, message: `Added "${newBook.name}" to the reading queue at position ${newBook.order}.`, book: newBook };
        }
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    if (toolCall.name === "upsert_completed_book") {
      const { bookId, payload } = toolCall.args || {};
      try {
        let data: any = {};
        try { data = JSON.parse(payload); } catch { return { success: false, error: 'Invalid JSON payload.' }; }

        const pKey = getPrefixedKey('os_books_completed');
        const raw = localStorage.getItem(pKey);
        let books: any[] = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(books)) books = [];

        const { setSyncedItem } = await import('@/lib/storage');

        if (bookId) {
          // Update
          const idx = books.findIndex((b: any) => b.id === bookId);
          if (idx === -1) return { success: false, error: `Completed book not found.` };
          books[idx] = { ...books[idx], ...data, id: bookId };
          setSyncedItem('os_books_completed', JSON.stringify(books));
          return { success: true, message: `Updated "${books[idx].name}" in completed books.`, book: books[idx] };
        } else {
          // Insert
          const newBook = {
            id: crypto.randomUUID(),
            language: 'English',
            category: 'Other',
            rating: 5,
            notes: '',
            wouldRecommend: true,
            completionDate: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
            ...data
          };
          books.unshift(newBook); // newest first
          setSyncedItem('os_books_completed', JSON.stringify(books));

          // Seamless Flow: Also remove from queue if it exists there
          const qKey = getPrefixedKey('os_books_queue');
          const rawQ = localStorage.getItem(qKey);
          if (rawQ) {
            let queue = JSON.parse(rawQ);
            if (Array.isArray(queue)) {
              const beforeLen = queue.length;
              queue = queue.filter((qb: any) => qb.name.toLowerCase() !== newBook.name.toLowerCase());
              if (queue.length < beforeLen) {
                // Re-index
                queue = queue.map((b: any, i: number) => ({ ...b, order: i + 1 }));
                setSyncedItem('os_books_queue', JSON.stringify(queue));
              }
            }
          }

          // Seamless Flow 2: Automatically log to Yearly Reading Log
          try {
            const dateObj = new Date(newBook.completionDate);
            const yearStr = dateObj.getFullYear().toString();
            const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            const monthStr = MONTHS[dateObj.getMonth()];
            
            const logKey = getPrefixedKey('os_books_yearly_log');
            const rawLog = localStorage.getItem(logKey);
            let yearlyLog = rawLog ? JSON.parse(rawLog) : {};
            
            if (!yearlyLog[yearStr]) yearlyLog[yearStr] = {};
            if (!yearlyLog[yearStr][monthStr]) yearlyLog[yearStr][monthStr] = { englishBooks: [], hindiBooks: [] };
            
            const bookEntry = {
              id: newBook.id,
              title: newBook.name,
              author: newBook.author || '',
              category: newBook.category,
              status: 'Completed'
            };
            
            const keyType = newBook.language === 'Hindi' ? 'hindiBooks' : 'englishBooks';
            yearlyLog[yearStr][monthStr][keyType].push(bookEntry);
            
            setSyncedItem('os_books_yearly_log', JSON.stringify(yearlyLog));
          } catch (e) {
            console.error('Failed to sync to yearly log', e);
          }

          return { success: true, message: `Logged "${newBook.name}" as completed with rating ${newBook.rating}/5. Removed from queue and added to Yearly Log.`, book: newBook };
        }
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    if (toolCall.name === "delete_book") {
      const { tableKey, bookId, bookName } = toolCall.args || {};
      try {
        const key = tableKey === 'os_books_completed' ? 'os_books_completed' : 'os_books_queue';
        const pKey = getPrefixedKey(key);
        const raw = localStorage.getItem(pKey);
        if (!raw) return { success: false, error: 'No books data found.' };
        let books: any[] = JSON.parse(raw);
        const before = books.length;
        books = books.filter((b: any) => b.id !== bookId);
        if (books.length === before) return { success: false, error: `Book not found with ID: ${bookId}` };
        // Re-index queue order
        if (key === 'os_books_queue') books = books.map((b: any, i: number) => ({ ...b, order: i + 1 }));
        const { setSyncedItem } = await import('@/lib/storage');
        setSyncedItem(key, JSON.stringify(books));
        return { success: true, message: `"${bookName || bookId}" has been removed.` };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    // ─── PANTRY TOOLS ────────────────────────────────────────────────────────

    if (toolCall.name === "query_grocery_plan") {
      const { filters } = toolCall.args || {};
      try {
        const pKey = getPrefixedKey('finances_grocery_plan');
        const raw = localStorage.getItem(pKey);
        if (!raw) return { success: true, summary: 'Your grocery plan is empty — nothing added yet.', items: [] };
        let items: any[] = JSON.parse(raw);
        if (!Array.isArray(items)) return { success: false, error: 'Grocery plan data is corrupted.' };

        // Optional filters
        if (filters?.category) {
          const cat = filters.category.toLowerCase();
          items = items.filter((i: any) => i.category?.toLowerCase().includes(cat));
        }
        if (filters?.name) {
          const n = filters.name.toLowerCase();
          items = items.filter((i: any) => i.name?.toLowerCase().includes(n));
        }

        const totalPlanned = items.reduce((s: number, i: any) => s + (i.expectedPrice * i.plannedQuantity), 0);
        const summary = `You have ${items.length} item(s) in your grocery plan. Total planned cost: $${totalPlanned.toFixed(2)}.`;
        return {
          success: true,
          summary,
          count: items.length,
          totalPlannedCost: totalPlanned.toFixed(2),
          items: items.map((i: any) => ({
            id: i.id,
            name: i.name,
            category: i.category,
            plannedQuantity: i.plannedQuantity,
            unitSize: i.unitSize,
            frequency: i.frequency,
            expectedPrice: i.expectedPrice,
            consumptionDays: i.consumptionDays,
            checkedUnits: i.checkedUnits,
          }))
        };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    if (toolCall.name === "upsert_grocery_plan_item") {
      const { itemId, payload } = toolCall.args;
      let parsedPayload: any = {};
      try { parsedPayload = JSON.parse(payload); } catch (e) {
        return { success: false, error: 'Invalid JSON payload.' };
      }
      try {
        const pKey = getPrefixedKey('finances_grocery_plan');
        const raw = localStorage.getItem(pKey);
        let items: any[] = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(items)) items = [];

        const { setSyncedItem } = await import('@/lib/storage');

        if (itemId) {
          // UPDATE existing item
          const idx = items.findIndex((i: any) => i.id === itemId);
          if (idx === -1) return { success: false, error: `Item with id '${itemId}' not found.` };
          items[idx] = { ...items[idx], ...parsedPayload };
          setSyncedItem('finances_grocery_plan', JSON.stringify(items));
          return { success: true, message: `Updated "${items[idx].name}" in your grocery plan.` };
        } else {
          // INSERT new item
          const newItem = {
            id: crypto.randomUUID(),
            name: parsedPayload.name,
            category: parsedPayload.category || '📦 Other',
            plannedQuantity: parseFloat(parsedPayload.plannedQuantity) || 1,
            unitSize: parsedPayload.unitSize || '1 Unit',
            frequency: parsedPayload.frequency || 'Monthly',
            idealTiming: parsedPayload.idealTiming || '',
            expectedPrice: parseFloat(parsedPayload.expectedPrice) || 0,
            checkedUnits: new Array(Math.ceil(parseFloat(parsedPayload.plannedQuantity) || 1)).fill('pending'),
            consumptionDays: parseInt(parsedPayload.consumptionDays) || 0,
            skippedMonths: []
          };
          items.push(newItem);
          setSyncedItem('finances_grocery_plan', JSON.stringify(items));
          return { success: true, message: `Added "${newItem.name}" to your grocery plan.` };
        }
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    if (toolCall.name === "delete_grocery_plan_item") {
      const { itemId, itemName } = toolCall.args;
      try {
        const pKey = getPrefixedKey('finances_grocery_plan');
        const raw = localStorage.getItem(pKey);
        if (!raw) return { success: false, error: 'Grocery plan is empty.' };
        let items: any[] = JSON.parse(raw);
        if (!Array.isArray(items)) return { success: false, error: 'Corrupted data.' };

        const before = items.length;
        items = items.filter((i: any) => i.id !== itemId);
        if (items.length === before) return { success: false, error: `Item not found: ${itemId}` };

        const { setSyncedItem } = await import('@/lib/storage');
        setSyncedItem('finances_grocery_plan', JSON.stringify(items));
        return { success: true, message: `Deleted "${itemName || itemId}" from your grocery plan.` };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    if (toolCall.name === "update_grocery_unit_status") {
      const { itemId, unitIndex, status } = toolCall.args;
      try {
        const pKey = getPrefixedKey('finances_grocery_plan');
        const raw = localStorage.getItem(pKey);
        if (!raw) return { success: false, error: 'Grocery plan is empty.' };
        let items: any[] = JSON.parse(raw);
        if (!Array.isArray(items)) return { success: false, error: 'Corrupted data.' };

        const idx = items.findIndex((i: any) => i.id === itemId);
        if (idx === -1) return { success: false, error: `Item not found.` };

        const item = items[idx];
        const units: string[] = item.checkedUnits || new Array(Math.ceil(item.plannedQuantity)).fill('pending');
        if (unitIndex < 0 || unitIndex >= units.length) return { success: false, error: `Unit index ${unitIndex} out of range (0–${units.length - 1}).` };
        units[unitIndex] = status;
        items[idx] = { ...item, checkedUnits: units };

        const { setSyncedItem } = await import('@/lib/storage');
        setSyncedItem('finances_grocery_plan', JSON.stringify(items));
        return { success: true, message: `Marked unit ${unitIndex + 1} of "${item.name}" as '${status}'.` };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    return { success: false, error: "Unknown tool call." };
  };

  const processResponse = async (data: any, nextHistory: Message[]) => {
    if (data.message?.toolCalls) {
      const toolCalls = data.message.toolCalls;
      const results: any[] = [];
      
      for (const tc of toolCalls) {
        const res = await executeToolCall(tc);
        results.push({
          name: tc.name,
          response: res
        });
      }

      // Add assistant tool-call message and function response message to history
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        toolCalls: toolCalls,
        rawParts: data.message.rawParts,
        timestamp: new Date()
      };

      const responseMsg: Message = {
        id: (Date.now() + 2).toString(),
        role: "assistant",

        functionResponse: results[0], // Stores both name and response
        timestamp: new Date()
      };
      
      const updatedHistory = [...nextHistory, assistantMsg, responseMsg];
      setMessages(updatedHistory);

      // Gather Context for Follow-up (reuse helper)
      const followUpCtx = await buildContext();

      // Re-trigger the API with the tool execution result using Sliding Window
      // Gemini Safety: History MUST start with 'user' role.
      const sliceSize = 11;
      const rawSlice = updatedHistory.slice(-sliceSize).filter(m => m.id !== 'welcome');
      const firstUserIndex = rawSlice.findIndex(m => m.role === 'user');
      const followUpWindow = firstUserIndex !== -1 ? rawSlice.slice(firstUserIndex) : rawSlice;

      const followUpResponse = await fetch("/my-dashboard/api/chat/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: followUpWindow.map(m => ({ 
            id: m.id, 
            role: m.role, 
            content: m.content,
            toolCalls: m.toolCalls,
            rawParts: m.rawParts,
            functionResponse: m.functionResponse
          })),
          pathname,
          context: followUpCtx
        }),
      });

      const followUpData = await followUpResponse.json();
      if (!followUpResponse.ok) throw new Error(followUpData.error || "Failed final response");
      
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 3).toString(),
          role: "assistant",
          content: followUpData.message?.content || (results[0]?.response?.message || "Processed."),
          timestamp: new Date()
        }
      ]);
    } else {
      // Standard text response
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.message?.content || "No response received.",
          timestamp: new Date()
        }
      ]);
    }
  };

  // Helper: build full context object depending on current page
  const buildContext = async () => {
    const { getPrefixedKey } = await import('@/lib/keys');
    const today = new Date().toISOString().split('T')[0];

    let availableAssets = "";
    let availableSavings = "";
    let availableEmergency = "";
    let availableLiabilities = "";
    let groceryPlanSnapshot = "";

    try {
      const assetsRaw = localStorage.getItem(getPrefixedKey('finances_assets'));
      if (assetsRaw) {
        const assetsParsed = JSON.parse(assetsRaw);
        availableAssets = Array.isArray(assetsParsed) ? assetsParsed.map((a: any) => `${a.name} (ID: ${a.id})`).join(', ') : '';
      }
      const goalsRaw = localStorage.getItem(getPrefixedKey('finances_goals'));
      if (goalsRaw) {
        const goalsParsed = JSON.parse(goalsRaw);
        availableSavings = Array.isArray(goalsParsed) ? goalsParsed.map((g: any) => `${g.name} (ID: ${g.id})`).join(', ') : '';
      }
      const emergencyRaw = localStorage.getItem(getPrefixedKey('finances_emergency_fund'));
      if (emergencyRaw) {
        const emergencyParsed = JSON.parse(emergencyRaw);
        if (Array.isArray(emergencyParsed)) {
          availableEmergency = emergencyParsed.map(e => `${(e as any).name || 'Emergency'} (ID: ${(e as any).id})`).join(', ');
        } else if (emergencyParsed && typeof emergencyParsed === 'object') {
          availableEmergency = `${(emergencyParsed as any).name || 'Emergency'} (ID: ${(emergencyParsed as any).id})`;
        }
      }
      const liabilitiesRaw = localStorage.getItem(getPrefixedKey('finances_liabilities'));
      if (liabilitiesRaw) {
        const liabilitiesParsed = JSON.parse(liabilitiesRaw);
        if (Array.isArray(liabilitiesParsed)) {
          availableLiabilities = liabilitiesParsed.map((l: any) => `${l.name} (ID: ${l.id})`).join(', ');
        }
      }

      // Pantry-specific: snapshot of grocery plan items
      if (pathname?.startsWith('/pantry')) {
        const gpRaw = localStorage.getItem(getPrefixedKey('finances_grocery_plan'));
        if (gpRaw) {
          const gpParsed = JSON.parse(gpRaw);
          if (Array.isArray(gpParsed)) {
            groceryPlanSnapshot = JSON.stringify(
              gpParsed.map((i: any) => ({
                id: i.id,
                name: i.name,
                category: i.category,
                plannedQuantity: i.plannedQuantity,
                unitSize: i.unitSize,
                frequency: i.frequency,
                expectedPrice: i.expectedPrice,
                consumptionDays: i.consumptionDays,
                checkedUnits: i.checkedUnits,
              }))
            );
          }
        }
      }
    } catch (e) {}

    return { today, availableAssets, availableSavings, availableEmergency, availableLiabilities, groceryPlanSnapshot };
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userText = inputValue;
    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userText,
      timestamp: new Date()
    };

    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setInputValue("");
    setIsLoading(true);

    try {
      const context = await buildContext();

      // Latency Optimization: Sliding Window History (Last 10 messages)
      // Gemini Safety: Conv must start with 'user' role.
      const sliceSize = 11;
      const rawSlice = updatedMessages.slice(-sliceSize).filter(m => m.id !== 'welcome');
      const firstUserIndex = rawSlice.findIndex(m => m.role === 'user');
      const messageWindow = firstUserIndex !== -1 ? rawSlice.slice(firstUserIndex) : rawSlice;

      const data = await sendMessageToEva(messageWindow.map(m => ({ 
        id: m.id, 
        role: m.role, 
        content: m.content,
        toolCalls: m.toolCalls,
        functionResponse: m.functionResponse
      })), pathname, context);

      await processResponse(data, updatedMessages);
      
    } catch (error: any) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Error: ${error.message || "Failed to connect to the server."}`,
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const resetChat = () => {
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: getGreeting(),
      timestamp: new Date()
    }]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 bg-zinc-900 dark:bg-zinc-100 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all text-white dark:text-black group relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <MessageCircle className="w-8 h-8 relative z-10" />
      </button>

      {isOpen && (
        <div className="absolute bottom-20 right-0 w-[400px] h-[600px] bg-white dark:bg-zinc-900 rounded-[32px] shadow-2xl border border-zinc-100 dark:border-zinc-800 flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 duration-300">
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-900 dark:bg-zinc-100 rounded-2xl flex items-center justify-center">
                <Bot className="w-6 h-6 text-white dark:text-black" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tighter">Eva</span>
                <span className="text-[10px] text-emerald-500 uppercase tracking-widest font-bold">Online</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={resetChat}
                className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                title="New Chat"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button onClick={() => setIsOpen(false)} className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth">
            {messages.filter(m => m.content || m.toolCalls || m.functionResponse).map((m) => {
              if (!m.content) return null; // Don't show bubbles for empty/hidden background messages
              
              return (
              <div key={m.id} className={`flex ${m.role === "assistant" ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[85%] px-5 py-3 rounded-2xl text-sm leading-relaxed ${
                    m.role === "assistant"
                      ? "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 rounded-bl-none"
                      : "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black rounded-br-none"
                  }`}
                >
                  {m.content}
                </div>
              </div>
              );
            })}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-zinc-50 dark:bg-zinc-800/50 px-5 py-3 rounded-2xl text-sm animate-pulse flex gap-1">
                  <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" />
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="p-6 border-t border-zinc-100 dark:border-zinc-800">
            <div className="relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Message Eva..."
                className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl px-6 py-4 pr-14 text-sm outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all text-zinc-900 dark:text-white"
              />
              <button
                disabled={isLoading || !inputValue.trim()}
                className="absolute right-2 top-2 bottom-2 w-10 bg-zinc-900 dark:bg-zinc-100 rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
              >
                <Send className="w-5 h-5 text-white dark:text-black" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
