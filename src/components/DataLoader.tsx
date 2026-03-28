"use client";

import { useEffect } from "react";
import type { Project, Task } from "./widgets/ProjectModal";

/**
 * Seeding data for new users or empty localStorage on public site.
 * Extracted from Goals.tsx (for Projects) and Habits.tsx (TODO).
 */
export function DataLoader() {
  useEffect(() => {
    // --- Project Seeding (from Goals.tsx v3) ---
    if (typeof window !== 'undefined' && !localStorage.getItem('goals_projects')) {
      const SEED_PROJECTS: Project[] = [
        { id: crypto.randomUUID(), bucketId: 'Health', title: 'Get Family Medical Insurance', dueDate: '', isImportant: false, isCompleted: false, tasks: [{ id: crypto.randomUUID(), title: 'NEXT STEP - Gather details.', isCompleted: false }] },
        { id: crypto.randomUUID(), bucketId: 'Health', title: 'Get Term Insurance', dueDate: '', isImportant: false, isCompleted: false, tasks: [{ id: crypto.randomUUID(), title: 'NEXT STEP - Gather details.', isCompleted: false }] },
        { id: crypto.randomUUID(), bucketId: 'Health', title: 'New Vaccines', dueDate: '', isImportant: false, isCompleted: false, tasks: [{ id: crypto.randomUUID(), title: 'NEXT STEP - Plan when to get which one...', isCompleted: false }] },
        { id: crypto.randomUUID(), bucketId: 'Health', title: 'Dental Checkup - October', dueDate: '', isImportant: false, isCompleted: false, tasks: [{ id: crypto.randomUUID(), title: 'Complete dental treatment and full health checkups for you and Neha.', isCompleted: false }] },
        { id: crypto.randomUUID(), bucketId: 'Health', title: 'Understand Local Hospitals', dueDate: '', isImportant: false, isCompleted: false, tasks: [{ id: crypto.randomUUID(), title: 'Explore Yamuna Nagar - the hospitals', isCompleted: false }, { id: crypto.randomUUID(), title: 'Connect with Saurabh Pal...', isCompleted: false }] },

        { id: crypto.randomUUID(), bucketId: 'Income', title: 'Website Creation', dueDate: '', isImportant: false, isCompleted: false, tasks: [{ id: crypto.randomUUID(), title: 'Prepare digital templates for school, bookshop, and coaching businesses...', isCompleted: false }] },
        { id: crypto.randomUUID(), bucketId: 'Income', title: 'ID Freelancing', dueDate: '', isImportant: false, isCompleted: false, tasks: [{ id: crypto.randomUUID(), title: 'Develop freelance outreach scripts and global client proposals...', isCompleted: false }] },
        { id: crypto.randomUUID(), bucketId: 'Income', title: 'Teaching', dueDate: '', isImportant: false, isCompleted: false, tasks: [{ id: crypto.randomUUID(), title: 'Begin teaching job and start building tuition leads...', isCompleted: false }] },
        { id: crypto.randomUUID(), bucketId: 'Income', title: 'Bookshop Expansion', dueDate: '', isImportant: false, isCompleted: false, tasks: [{ id: crypto.randomUUID(), title: 'Research and shortlist 10-15 large printing presses in Delhi, Haryana, an...', isCompleted: false }] },
        { id: crypto.randomUUID(), bucketId: 'Income', title: 'Performance & Learning Academy', dueDate: '', isImportant: false, isCompleted: false, tasks: [{ id: crypto.randomUUID(), title: 'Create structured tuition curriculum and batch plans...', isCompleted: false }] },
        { id: crypto.randomUUID(), bucketId: 'Income', title: 'Parlor and Tailoring', dueDate: '', isImportant: false, isCompleted: false, tasks: [{ id: crypto.randomUUID(), title: 'Finalize Neha\'s beauty and tailoring services, pricing, and branding...', isCompleted: false }] },

        { id: crypto.randomUUID(), bucketId: 'Career', title: 'Freelancing Packages', dueDate: '', isImportant: false, isCompleted: false, tasks: [{ id: crypto.randomUUID(), title: 'NEXT STEP - Finalize 2-3 global freelance service packages...', isCompleted: false }] },
        { id: crypto.randomUUID(), bucketId: 'Career', title: 'Portfolio Case Studies Update', dueDate: '', isImportant: false, isCompleted: false, tasks: [{ id: crypto.randomUUID(), title: 'Build strong case studies on your premium consulting portfolio...', isCompleted: false }] },
        { id: crypto.randomUUID(), bucketId: 'Career', title: 'Leads Management', dueDate: '', isImportant: false, isCompleted: false, tasks: [{ id: crypto.randomUUID(), title: 'Start collecting emails and leads from LinkedIn and your content channels.', isCompleted: false }] },
        { id: crypto.randomUUID(), bucketId: 'Career', title: 'Skill Development', dueDate: '', isImportant: false, isCompleted: false, tasks: [{ id: crypto.randomUUID(), title: 'NEXT STEP - Read E-Learning Magazines...', isCompleted: false }] },
        { id: crypto.randomUUID(), bucketId: 'Career', title: 'Portfolio Testimonials', dueDate: '', isImportant: false, isCompleted: false, tasks: [{ id: crypto.randomUUID(), title: 'Amelia Loving - Requested once', isCompleted: false }, { id: crypto.randomUUID(), title: 'John Lewinski - Not active...', isCompleted: false }] },
        { id: crypto.randomUUID(), bucketId: 'Career', title: 'Networking', dueDate: '', isImportant: false, isCompleted: false, tasks: [{ id: crypto.randomUUID(), title: 'Build relationships with teachers and administrators on LinkedIn and...', isCompleted: false }] },

        { id: crypto.randomUUID(), bucketId: 'Wealth', title: 'Savings Target - SEPT END', dueDate: '', isImportant: false, isCompleted: false, tasks: [{ id: crypto.randomUUID(), title: 'Save aggressively and cut unnecessary expenses to reach ₹6-6.5 lakh by...', isCompleted: false }] },
        { id: crypto.randomUUID(), bucketId: 'Wealth', title: 'Emergency Fund', dueDate: '', isImportant: false, isCompleted: false, tasks: [{ id: crypto.randomUUID(), title: 'Prepare a 12-month budget and emergency fund strategy.', isCompleted: false }] },
        { id: crypto.randomUUID(), bucketId: 'Wealth', title: 'Expenses', dueDate: '', isImportant: false, isCompleted: false, tasks: [{ id: crypto.randomUUID(), title: 'Identify essential purchases and avoid unnecessary spending.', isCompleted: false }] },
        { id: crypto.randomUUID(), bucketId: 'Wealth', title: 'UNDERSTANDING', dueDate: '', isImportant: false, isCompleted: false, tasks: [{ id: crypto.randomUUID(), title: 'YouTube - Labor Law Academy', isCompleted: false }] },
        { id: crypto.randomUUID(), bucketId: 'Wealth', title: 'Zerodha Account', dueDate: '', isImportant: false, isCompleted: false, tasks: [{ id: crypto.randomUUID(), title: 'Open account', isCompleted: false }] },

        { id: crypto.randomUUID(), bucketId: 'Family', title: 'Children Planning', dueDate: '', isImportant: false, isCompleted: false, tasks: [{ id: crypto.randomUUID(), title: 'Start child planning and medical consultation.', isCompleted: false }] },

        { id: crypto.randomUUID(), bucketId: 'Lifestyle', title: 'Home & Work Setup', dueDate: '', isImportant: false, isCompleted: false, tasks: [{ id: crypto.randomUUID(), title: 'Clean, declutter, and set up home and work environment.', isCompleted: false }] },

        { id: crypto.randomUUID(), bucketId: 'Learning', title: 'Understand', dueDate: '', isImportant: false, isCompleted: false, tasks: [{ id: crypto.randomUUID(), title: 'NRE vs Ordinary Bank Account', isCompleted: false }] },
        { id: crypto.randomUUID(), bucketId: 'Learning', title: 'CHECK', dueDate: '', isImportant: false, isCompleted: false, tasks: [{ id: crypto.randomUUID(), title: 'Mobile application - National Digital Library of India', isCompleted: false }] },

        { id: crypto.randomUUID(), bucketId: 'Admin', title: 'Transaction Details', dueDate: '', isImportant: false, isCompleted: false, tasks: [{ id: crypto.randomUUID(), title: 'List all the transactions - Everything sent to India', isCompleted: false }] },
        { id: crypto.randomUUID(), bucketId: 'Admin', title: 'India Move', dueDate: '', isImportant: false, isCompleted: false, tasks: [{ id: crypto.randomUUID(), title: 'Plan travel, relocation, and initial setup in India.', isCompleted: false }] },
        { id: crypto.randomUUID(), bucketId: 'Admin', title: 'FCA Address update', dueDate: '', isImportant: false, isCompleted: false, tasks: [{ id: crypto.randomUUID(), title: 'Update address in FCA data.', isCompleted: false }] },
        { id: crypto.randomUUID(), bucketId: 'Admin', title: 'iCloud Backup (Photos + Docume...)', dueDate: '', isImportant: false, isCompleted: false, tasks: [{ id: crypto.randomUUID(), title: 'Backup everything to new Seagate hard drive.', isCompleted: false }] },
        { id: crypto.randomUUID(), bucketId: 'Admin', title: 'Organization', dueDate: '', isImportant: false, isCompleted: false, tasks: [{ id: crypto.randomUUID(), title: 'Organize contacts, digital files, and systems for a smooth transition.', isCompleted: false }] },
        { id: crypto.randomUUID(), bucketId: 'Admin', title: 'Freedom', dueDate: '', isImportant: false, isCompleted: false, tasks: [{ id: crypto.randomUUID(), title: 'Call freedom to get cheapest plan...', isCompleted: false }] },

        { id: crypto.randomUUID(), bucketId: 'Mental', title: 'Forgive Others', dueDate: '', isImportant: false, isCompleted: false, tasks: [{ id: crypto.randomUUID(), title: 'Understand this properly - Forgive your parents...', isCompleted: false }] },
        { id: crypto.randomUUID(), bucketId: 'Mental', title: 'My Habits', dueDate: '', isImportant: false, isCompleted: false, tasks: [{ id: crypto.randomUUID(), title: 'Culmination of parents habits and values.', isCompleted: false }] }
      ];
      localStorage.setItem('goals_projects', JSON.stringify(SEED_PROJECTS));
      localStorage.setItem('goals_seeded_v2', 'true');
      localStorage.setItem('goals_seeded_v3', 'true');
      // Trigger event to update home widgets immediately
      window.dispatchEvent(new StorageEvent('storage', { key: 'goals_projects' }));
    }

    // --- Habit Seeding ---
    if (typeof window !== 'undefined' && !localStorage.getItem('os_habits')) {
      const SEED_HABITS = [
        { id: crypto.randomUUID(), name: 'Morning Meditation', period: 'daily', records: {} },
        { id: crypto.randomUUID(), name: 'Exercise', period: 'daily', records: {} },
        { id: crypto.randomUUID(), name: 'Read 30 mins', period: 'daily', records: {} },
        { id: crypto.randomUUID(), name: 'Deep Work', period: 'daily', records: {} }
      ];
      localStorage.setItem('os_habits', JSON.stringify(SEED_HABITS));
      window.dispatchEvent(new StorageEvent('storage', { key: 'os_habits' }));
    }
  }, []);

  return null;
}
