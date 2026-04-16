"use client";

import { useEffect } from "react";
import { setSyncedItem } from "@/lib/storage";
import { getPrefixedKey } from "@/lib/keys";
import type { Project, Task } from "./widgets/ProjectModal";
import type { MedicineItem } from "@/types/health-system";
import type { BusinessChannel } from "@/types/business";

/**
 * Seeding data for new users or empty localStorage on public site.
 * Extracted from Goals.tsx (for Projects) and Habits.tsx (TODO).
 */
export function DataLoader() {
  useEffect(() => {
    // --- Project Seeding (Generic Examples) ---
    if (typeof window !== 'undefined' && !localStorage.getItem(getPrefixedKey('goals_projects'))) {
      const SEED_PROJECTS: Project[] = [
        { id: crypto.randomUUID(), bucketId: 'Health', title: 'Schedule Annual Health Checkup', dueDate: '', isImportant: false, isCompleted: false, status: 'not-started', createdAt: new Date().toISOString(), tasks: [{ id: crypto.randomUUID(), title: 'Contact clinic and book appointment', isCompleted: false }] },
        { id: crypto.randomUUID(), bucketId: 'Health', title: 'Update Medical Insurance', dueDate: '', isImportant: false, isCompleted: false, status: 'not-started', createdAt: new Date().toISOString(), tasks: [{ id: crypto.randomUUID(), title: 'Review current coverage and options', isCompleted: false }] },
        { id: crypto.randomUUID(), bucketId: 'Health', title: 'Plan Vaccination Schedule', dueDate: '', isImportant: false, isCompleted: false, status: 'not-started', createdAt: new Date().toISOString(), tasks: [{ id: crypto.randomUUID(), title: 'Check which vaccines are due this year', isCompleted: false }] },
        { id: crypto.randomUUID(), bucketId: 'Health', title: 'Dental Maintenance', dueDate: '', isImportant: false, isCompleted: false, status: 'not-started', createdAt: new Date().toISOString(), tasks: [{ id: crypto.randomUUID(), title: 'Schedule hygiene appointment', isCompleted: false }] },
        { id: crypto.randomUUID(), bucketId: 'Health', title: 'Local Hospital Research', dueDate: '', isImportant: false, isCompleted: false, status: 'not-started', createdAt: new Date().toISOString(), tasks: [{ id: crypto.randomUUID(), title: 'Identify nearest emergency facilities', isCompleted: false }] },

        { id: crypto.randomUUID(), bucketId: 'Income', title: 'Professional Portfolio Website', dueDate: '', isImportant: false, isCompleted: false, status: 'not-started', createdAt: new Date().toISOString(), tasks: [{ id: crypto.randomUUID(), title: 'Draft content for home page and case studies', isCompleted: false }] },
        { id: crypto.randomUUID(), bucketId: 'Income', title: 'Freelance Service Development', dueDate: '', isImportant: false, isCompleted: false, status: 'not-started', createdAt: new Date().toISOString(), tasks: [{ id: crypto.randomUUID(), title: 'Define 3 service tiers and pricing', isCompleted: false }] },
        { id: crypto.randomUUID(), bucketId: 'Income', title: 'Passive Income Stream Research', dueDate: '', isImportant: false, isCompleted: false, status: 'not-started', createdAt: new Date().toISOString(), tasks: [{ id: crypto.randomUUID(), title: 'Research 10 potential niches for digital products', isCompleted: false }] },
        
        { id: crypto.randomUUID(), bucketId: 'Career', title: 'Skill Certification Plan', dueDate: '', isImportant: false, isCompleted: false, status: 'not-started', createdAt: new Date().toISOString(), tasks: [{ id: crypto.randomUUID(), title: 'Identify relevant industry certifications', isCompleted: false }] },
        { id: crypto.randomUUID(), bucketId: 'Career', title: 'Network Expansion', dueDate: '', isImportant: false, isCompleted: false, status: 'not-started', createdAt: new Date().toISOString(), tasks: [{ id: crypto.randomUUID(), title: 'Connect with 10 professionals in target field', isCompleted: false }] },

        { id: crypto.randomUUID(), bucketId: 'Wealth', title: 'Emergency Fund Strategy', dueDate: '', isImportant: false, isCompleted: false, status: 'not-started', createdAt: new Date().toISOString(), tasks: [{ id: crypto.randomUUID(), title: 'Define target balance for 6 months of expenses', isCompleted: false }] },
        { id: crypto.randomUUID(), bucketId: 'Wealth', title: 'Investment Account Review', dueDate: '', isImportant: false, isCompleted: false, status: 'not-started', createdAt: new Date().toISOString(), tasks: [{ id: crypto.randomUUID(), title: 'Check asset allocation and rebalance if needed', isCompleted: false }] },

        { id: crypto.randomUUID(), bucketId: 'Family', title: 'Family Heritage Digital Archive', dueDate: '', isImportant: false, isCompleted: false, status: 'not-started', createdAt: new Date().toISOString(), tasks: [{ id: crypto.randomUUID(), title: 'Scan and organize 50 family photos', isCompleted: false }] },

        { id: crypto.randomUUID(), bucketId: 'Lifestyle', title: 'Home Workspace Optimization', dueDate: '', isImportant: false, isCompleted: false, status: 'not-started', createdAt: new Date().toISOString(), tasks: [{ id: crypto.randomUUID(), title: 'Declutter desk and improve lighting setup', isCompleted: false }] },

        { id: crypto.randomUUID(), bucketId: 'Learning', title: 'New Language Basics', dueDate: '', isImportant: false, isCompleted: false, status: 'not-started', createdAt: new Date().toISOString(), tasks: [{ id: crypto.randomUUID(), title: 'Complete first 5 lessons on language app', isCompleted: false }] },

        { id: crypto.randomUUID(), bucketId: 'Admin', title: 'Digital Security Audit', dueDate: '', isImportant: false, isCompleted: false, status: 'not-started', createdAt: new Date().toISOString(), tasks: [{ id: crypto.randomUUID(), title: 'Enable 2FA on all important accounts', isCompleted: false }] },
        { id: crypto.randomUUID(), bucketId: 'Admin', title: 'System Backup Routine', dueDate: '', isImportant: false, isCompleted: false, status: 'not-started', createdAt: new Date().toISOString(), tasks: [{ id: crypto.randomUUID(), title: 'Configure automatic weekly cloud backups', isCompleted: false }] },

        { id: crypto.randomUUID(), bucketId: 'Mental', title: 'Daily Gratitude Practice', dueDate: '', isImportant: false, isCompleted: false, status: 'not-started', createdAt: new Date().toISOString(), tasks: [{ id: crypto.randomUUID(), title: 'Write down 3 things you are grateful for daily', isCompleted: false }] }
      ];
      setSyncedItem('goals_projects', JSON.stringify(SEED_PROJECTS));
      setSyncedItem('goals_seeded_v2', 'true');
      setSyncedItem('goals_seeded_v3', 'true');
    }

    // --- Habit Seeding (Generic Examples) ---
    if (typeof window !== 'undefined' && !localStorage.getItem(getPrefixedKey('os_habits'))) {
      const SEED_HABITS = [
        { id: crypto.randomUUID(), name: 'Morning Meditation', period: 'daily', records: {} },
        { id: crypto.randomUUID(), name: 'Exercise', period: 'daily', records: {} },
        { id: crypto.randomUUID(), name: 'Read 30 mins', period: 'daily', records: {} },
        { id: crypto.randomUUID(), name: 'Deep Work', period: 'daily', records: {} }
      ];
      setSyncedItem('os_habits', JSON.stringify(SEED_HABITS));
    }

    // --- Content System Seeding (Generic Examples) ---
    if (typeof window !== 'undefined' && !localStorage.getItem(getPrefixedKey('finances_business'))) {
      const today = new Date().toISOString().split('T')[0];
      const SEED_BUSINESSES: BusinessChannel[] = [
        { 
          id: crypto.randomUUID(), 
          name: 'Tech Insights', 
          platform: 'YouTube', 
          contentType: 'Long Video', 
          status: 'Active', 
          lastPostedDate: today, 
          postingFrequency: 7, 
          nextPostDueDate: today 
        },
        { 
          id: crypto.randomUUID(), 
          name: 'Productivity Tips', 
          platform: 'Instagram', 
          contentType: 'Reel', 
          status: 'Active', 
          lastPostedDate: today, 
          postingFrequency: 1, 
          nextPostDueDate: today 
        },
        { 
          id: crypto.randomUUID(), 
          name: 'Career Advice', 
          platform: 'LinkedIn', 
          contentType: 'Post', 
          status: 'Active', 
          lastPostedDate: today, 
          postingFrequency: 2, 
          nextPostDueDate: today 
        }
      ];
      setSyncedItem('finances_business', JSON.stringify(SEED_BUSINESSES));
    }

    // --- Medicine Inventory Seeding ---
    if (typeof window !== 'undefined' && !localStorage.getItem(getPrefixedKey('medicine_inventory_seeded_v1'))) {
      const SEED_MEDICINE: MedicineItem[] = [
        {
          id: crypto.randomUUID(),
          itemName: 'Paracetamol',
          category: 'Pain Relief & Inflammation',
          purpose: 'Pain, fever relief',
          whenToUse: 'Headache, fever',
          quantity: 25,
          targetQuantity: 30,
          expiryDate: '2027-04-16',
          instructions: 'As per label',
          notes: 'Core stock'
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Ibuprofen',
          category: 'Pain Relief & Inflammation',
          purpose: 'Anti-inflammatory pain relief',
          whenToUse: 'Migraine, body pain, sciatica',
          quantity: 17,
          targetQuantity: 20,
          expiryDate: '2027-04-16',
          instructions: 'After food',
          notes: ''
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Sciatica Medication',
          category: 'Chronic Conditions',
          purpose: 'Nerve pain control',
          whenToUse: 'Sciatica flare-up',
          quantity: 12,
          targetQuantity: 15,
          expiryDate: '2027-04-16',
          instructions: 'As prescribed',
          notes: 'Critical'
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Blood Pressure Medication',
          category: 'Chronic Conditions',
          purpose: 'Control BP',
          whenToUse: 'Daily use',
          quantity: 30,
          targetQuantity: 30,
          expiryDate: '2027-04-16',
          instructions: 'As prescribed',
          notes: 'Critical'
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Diabetes Medication',
          category: 'Chronic Conditions',
          purpose: 'Control sugar',
          whenToUse: 'Daily use',
          quantity: 30,
          targetQuantity: 30,
          expiryDate: '2027-04-16',
          instructions: 'As prescribed',
          notes: 'Critical'
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Glucose Tablets / Powder',
          category: 'Chronic Conditions',
          purpose: 'Raise blood sugar',
          whenToUse: 'Low sugar episode',
          quantity: 12,
          targetQuantity: 15,
          expiryDate: '2027-04-16',
          instructions: 'Immediate use',
          notes: ''
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Antacid',
          category: 'Digestive Care',
          purpose: 'Reduce acidity',
          whenToUse: 'Acid reflux',
          quantity: 17,
          targetQuantity: 20,
          expiryDate: '2027-04-16',
          instructions: 'After meals',
          notes: ''
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Gas Relief Medicine',
          category: 'Digestive Care',
          purpose: 'Reduce bloating',
          whenToUse: 'Gas discomfort',
          quantity: 12,
          targetQuantity: 15,
          expiryDate: '2027-04-16',
          instructions: 'As needed',
          notes: ''
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Cough Syrup',
          category: 'Cold, Cough & Flu',
          purpose: 'Relieve cough',
          whenToUse: 'Persistent cough',
          quantity: 1,
          targetQuantity: 1,
          expiryDate: '2027-04-16',
          instructions: 'As per label',
          notes: ''
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Cold & Flu Tablets',
          category: 'Cold, Cough & Flu',
          purpose: 'Relieve symptoms',
          whenToUse: 'Cold, congestion',
          quantity: 12,
          targetQuantity: 15,
          expiryDate: '2027-04-16',
          instructions: 'As needed',
          notes: ''
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Tooth Pain Relief',
          category: 'Dental Care',
          purpose: 'Relieve toothache',
          whenToUse: 'Dental pain',
          quantity: 8,
          targetQuantity: 10,
          expiryDate: '2027-04-16',
          instructions: 'As needed',
          notes: ''
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Period Pain Relief',
          category: 'Women’s Health',
          purpose: 'Reduce cramps',
          whenToUse: 'Menstrual pain',
          quantity: 12,
          targetQuantity: 15,
          expiryDate: '2027-04-16',
          instructions: 'As needed',
          notes: ''
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Eye Drops',
          category: 'Eye & Minor Care',
          purpose: 'Relieve irritation',
          whenToUse: 'Dryness, irritation',
          quantity: 1,
          targetQuantity: 2,
          expiryDate: '2027-04-16',
          instructions: 'As needed',
          notes: ''
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Heart Emergency Medication',
          category: 'Emergency Medication',
          purpose: 'Cardiac emergency',
          whenToUse: 'Chest pain (if prescribed)',
          quantity: 1,
          targetQuantity: 1,
          expiryDate: '2027-04-16',
          instructions: 'As prescribed',
          notes: 'Critical'
        },
        {
          id: crypto.randomUUID(),
          itemName: 'ORS Sachets',
          category: 'General Health Essentials',
          purpose: 'Hydration',
          whenToUse: 'Dehydration',
          quantity: 7,
          targetQuantity: 10,
          expiryDate: '2027-04-16',
          instructions: 'Mix with water',
          notes: ''
        }
      ];
      setSyncedItem('MEDICINE_INVENTORY', JSON.stringify(SEED_MEDICINE));
      setSyncedItem('medicine_inventory_seeded_v1', 'true');
    }

    // --- Travel Medical Kit Seeding ---
    if (typeof window !== 'undefined' && !localStorage.getItem(getPrefixedKey('travel_medical_kit_seeded_v1'))) {
      const SEED_TRAVEL_KIT: MedicineItem[] = [
        {
          id: crypto.randomUUID(),
          itemName: 'Paracetamol / Ibuprofen',
          category: 'Pain Relief & Inflammation',
          purpose: 'Pain, fever relief',
          whenToUse: 'Headache, body pain, fever',
          quantity: 8,
          targetQuantity: 10,
          expiryDate: '2027-04-16',
          instructions: 'As per label',
          notes: 'Strip, not full bottle'
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Sciatica Medication',
          category: 'Chronic Conditions',
          purpose: 'Nerve pain control',
          whenToUse: 'Sciatica flare-up',
          quantity: 1,
          targetQuantity: 1,
          expiryDate: '2027-04-16',
          instructions: 'As prescribed',
          notes: 'Critical'
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Blood Pressure Medication',
          category: 'Chronic Conditions',
          purpose: 'Control BP',
          whenToUse: 'Daily use',
          quantity: 1,
          targetQuantity: 1,
          expiryDate: '2027-04-16',
          instructions: 'As prescribed',
          notes: 'Critical'
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Diabetes Medication',
          category: 'Chronic Conditions',
          purpose: 'Control sugar',
          whenToUse: 'Daily use',
          quantity: 1,
          targetQuantity: 1,
          expiryDate: '2027-04-16',
          instructions: 'As prescribed',
          notes: 'Critical'
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Glucose Tablets / Sugar Sachets',
          category: 'Chronic Conditions',
          purpose: 'Raise blood sugar',
          whenToUse: 'Low sugar episode',
          quantity: 5,
          targetQuantity: 6,
          expiryDate: '2027-04-16',
          instructions: 'Immediate use',
          notes: 'Must have'
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Antacid',
          category: 'Digestive Care',
          purpose: 'Reduce acidity',
          whenToUse: 'Heartburn, acidity',
          quantity: 5,
          targetQuantity: 6,
          expiryDate: '2027-04-16',
          instructions: 'After meals',
          notes: ''
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Gas Relief Medicine',
          category: 'Digestive Care',
          purpose: 'Reduce bloating',
          whenToUse: 'Gas discomfort',
          quantity: 5,
          targetQuantity: 6,
          expiryDate: '2027-04-16',
          instructions: 'As needed',
          notes: ''
        },
        {
          id: crypto.randomUUID(),
          itemName: 'ORS (Oral Rehydration Salts)',
          category: 'General Health Essentials',
          purpose: 'Prevent dehydration',
          whenToUse: 'Diarrhea, fatigue',
          quantity: 3,
          targetQuantity: 4,
          expiryDate: '2027-04-16',
          instructions: 'Mix with clean water',
          notes: 'Essential'
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Cough Tablets / Small Syrup',
          category: 'Cold, Cough & Flu',
          purpose: 'Relieve cough',
          whenToUse: 'Cough symptoms',
          quantity: 1,
          targetQuantity: 1,
          expiryDate: '2027-04-16',
          instructions: 'As per label',
          notes: 'Prefer tablets for travel'
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Cold & Flu Tablets',
          category: 'Cold, Cough & Flu',
          purpose: 'Relieve symptoms',
          whenToUse: 'Runny nose, congestion',
          quantity: 5,
          targetQuantity: 6,
          expiryDate: '2027-04-16',
          instructions: 'As needed',
          notes: ''
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Tooth Pain Relief',
          category: 'Dental Care',
          purpose: 'Relieve toothache',
          whenToUse: 'Sudden dental pain',
          quantity: 3,
          targetQuantity: 4,
          expiryDate: '2027-04-16',
          instructions: 'As needed',
          notes: 'Useful backup'
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Period Pain Relief',
          category: 'Women’s Health',
          purpose: 'Reduce cramps',
          whenToUse: 'Menstrual pain',
          quantity: 5,
          targetQuantity: 6,
          expiryDate: '2027-04-16',
          instructions: 'As needed',
          notes: 'If applicable'
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Eye Drops (Small)',
          category: 'Eye & Minor Care',
          purpose: 'Relieve irritation',
          whenToUse: 'Dryness, irritation',
          quantity: 1,
          targetQuantity: 1,
          expiryDate: '2027-04-16',
          instructions: 'As needed',
          notes: 'Travel-size'
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Basic Bandages',
          category: 'External Use (Topicals)',
          purpose: 'Cover small cuts',
          whenToUse: 'Minor injuries',
          quantity: 7,
          targetQuantity: 10,
          expiryDate: '2027-04-16',
          instructions: 'Clean before applying',
          notes: 'Minimal set'
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Antiseptic (Small)',
          category: 'External Use (Topicals)',
          purpose: 'Clean wounds',
          whenToUse: 'Cuts',
          quantity: 1,
          targetQuantity: 1,
          expiryDate: '2027-04-16',
          instructions: 'Apply before dressing',
          notes: 'Travel-size'
        }
      ];
      setSyncedItem('TRAVEL_MEDICAL_KIT', JSON.stringify(SEED_TRAVEL_KIT));
      setSyncedItem('travel_medical_kit_seeded_v1', 'true');
    }
  }, []);

  return null;
}
