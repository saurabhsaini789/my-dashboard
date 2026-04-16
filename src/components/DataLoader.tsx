"use client";

import { useEffect } from "react";
import { setSyncedItem } from "@/lib/storage";
import { getPrefixedKey } from "@/lib/keys";
import type { Project, Task } from "./widgets/ProjectModal";
import type { MedicineItem, SupplementItem } from "@/types/health-system";
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

    // --- Medicine Inventory Seeding (Generic Placeholders) ---
    if (typeof window !== 'undefined' && !localStorage.getItem(getPrefixedKey('medicine_inventory_seeded_v1'))) {
      const SEED_MEDICINE: MedicineItem[] = [
        {
          id: crypto.randomUUID(),
          itemName: 'Generic Pain Relief',
          category: 'Pain Relief & Inflammation',
          purpose: 'General pain relief',
          whenToUse: 'As needed',
          quantity: 10,
          targetQuantity: 20,
          expiryDate: '2027-01-01',
          instructions: 'As per label',
          notes: ''
        }
      ];
      setSyncedItem('MEDICINE_INVENTORY', JSON.stringify(SEED_MEDICINE));
      setSyncedItem('medicine_inventory_seeded_v1', 'true');
    }

    // --- Travel Medical Kit Seeding (Generic Placeholders) ---
    if (typeof window !== 'undefined' && !localStorage.getItem(getPrefixedKey('travel_medical_kit_seeded_v1'))) {
      const SEED_TRAVEL_KIT: MedicineItem[] = [
        {
          id: crypto.randomUUID(),
          itemName: 'Travel First Aid Pack',
          category: 'External Use (Topicals)',
          purpose: 'Emergency first aid',
          whenToUse: 'Minor injuries while traveling',
          quantity: 1,
          targetQuantity: 1,
          expiryDate: '2027-01-01',
          instructions: 'For basic hygiene',
          notes: ''
        }
      ];
      setSyncedItem('TRAVEL_MEDICAL_KIT', JSON.stringify(SEED_TRAVEL_KIT));
      setSyncedItem('travel_medical_kit_seeded_v1', 'true');
    }

    // --- First Aid Kit Home Seeding - BUMPED V2 ---
    if (typeof window !== 'undefined' && !localStorage.getItem(getPrefixedKey('first_aid_home_seeded_v2'))) {
      const SEED_FIRST_AID_HOME: MedicineItem[] = [
        {
          id: crypto.randomUUID(),
          itemName: 'Adhesive Bandages',
          category: 'External Use (Topicals)',
          purpose: 'Cover small cuts',
          whenToUse: 'Minor cuts, blisters',
          quantity: 27,
          targetQuantity: 30,
          expiryDate: '2027-04-16',
          instructions: 'Clean wound before applying',
          notes: ''
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Sterile Gauze Pads',
          category: 'External Use (Topicals)',
          purpose: 'Cover larger wounds',
          whenToUse: 'Bleeding, deeper cuts',
          quantity: 17,
          targetQuantity: 20,
          expiryDate: '2027-04-16',
          instructions: 'Use with antiseptic',
          notes: ''
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Medical Tape',
          category: 'External Use (Topicals)',
          purpose: 'Secure gauze',
          whenToUse: 'Dressing wounds',
          quantity: 2,
          targetQuantity: 2,
          expiryDate: '2027-04-16',
          instructions: 'Apply over gauze',
          notes: ''
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Cotton',
          category: 'External Use (Topicals)',
          purpose: 'Clean wounds',
          whenToUse: 'Before dressing',
          quantity: 1,
          targetQuantity: 1,
          expiryDate: '2027-04-16',
          instructions: 'Use clean pieces',
          notes: ''
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Antiseptic Solution (Betadine)',
          category: 'External Use (Topicals)',
          purpose: 'Disinfect wounds',
          whenToUse: 'Cuts, abrasions',
          quantity: 1,
          targetQuantity: 1,
          expiryDate: '2027-04-16',
          instructions: 'Apply before dressing',
          notes: ''
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Antiseptic Ointment',
          category: 'External Use (Topicals)',
          purpose: 'Prevent infection',
          whenToUse: 'Minor wounds',
          quantity: 2,
          targetQuantity: 2,
          expiryDate: '2027-04-16',
          instructions: 'Apply thin layer',
          notes: ''
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Crepe Bandage',
          category: 'External Use (Topicals)',
          purpose: 'Support sprains',
          whenToUse: 'Muscle injury',
          quantity: 2,
          targetQuantity: 3,
          expiryDate: '2027-04-16',
          instructions: 'Wrap firmly',
          notes: ''
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Burn Ointment',
          category: 'External Use (Topicals)',
          purpose: 'Treat burns',
          whenToUse: 'Minor burns',
          quantity: 1,
          targetQuantity: 2,
          expiryDate: '2027-04-16',
          instructions: 'Apply gently',
          notes: ''
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Pain Relief Spray / Gel',
          category: 'Pain Relief & Inflammation',
          purpose: 'Muscle/joint relief',
          whenToUse: 'Sprain, back pain',
          quantity: 1,
          targetQuantity: 2,
          expiryDate: '2027-04-16',
          instructions: 'External use',
          notes: ''
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Pain Relief Balm',
          category: 'Pain Relief & Inflammation',
          purpose: 'Mild relief',
          whenToUse: 'Headache, body ache',
          quantity: 1,
          targetQuantity: 2,
          expiryDate: '2027-04-16',
          instructions: 'External use',
          notes: ''
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Scissors (Small)',
          category: 'General Health Essentials',
          purpose: 'Cut materials',
          whenToUse: 'Dressing wounds',
          quantity: 1,
          targetQuantity: 1,
          expiryDate: '2027-04-16',
          instructions: 'Keep clean',
          notes: ''
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Tweezers',
          category: 'General Health Essentials',
          purpose: 'Remove splinters',
          whenToUse: 'Minor injuries',
          quantity: 1,
          targetQuantity: 1,
          expiryDate: '2027-04-16',
          instructions: 'Clean before use',
          notes: ''
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Disposable Gloves',
          category: 'General Health Essentials',
          purpose: 'Hygiene',
          whenToUse: 'Handling wounds',
          quantity: 12,
          targetQuantity: 15,
          expiryDate: '2027-04-16',
          instructions: 'Single use',
          notes: ''
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Hand Sanitizer',
          category: 'External Use (Topicals)',
          purpose: 'Clean hands',
          whenToUse: 'Before/after care',
          quantity: 1,
          targetQuantity: 1,
          expiryDate: '2027-04-16',
          instructions: 'Apply thoroughly',
          notes: ''
        }
      ];
      setSyncedItem('FIRST_AID_HOME', JSON.stringify(SEED_FIRST_AID_HOME));
      setSyncedItem('first_aid_home_seeded_v2', 'true');
    }

    // --- First Aid Kit Mobile Seeding - BUMPED V2 ---
    if (typeof window !== 'undefined' && !localStorage.getItem(getPrefixedKey('first_aid_mobile_seeded_v2'))) {
      const SEED_FIRST_AID_MOBILE: MedicineItem[] = [
        {
          id: crypto.randomUUID(),
          itemName: 'Adhesive Bandages',
          category: 'External Use (Topicals)',
          purpose: 'Cover small cuts',
          whenToUse: 'Minor injuries',
          quantity: 10,
          targetQuantity: 12,
          expiryDate: '2027-04-16',
          instructions: 'Clean before applying',
          notes: 'Small pack'
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Sterile Gauze Pads',
          category: 'External Use (Topicals)',
          purpose: 'Cover wounds',
          whenToUse: 'Medium cuts',
          quantity: 6,
          targetQuantity: 8,
          expiryDate: '2027-04-16',
          instructions: 'Use with antiseptic',
          notes: ''
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Medical Tape',
          category: 'External Use (Topicals)',
          purpose: 'Secure gauze',
          whenToUse: 'Dressing wounds',
          quantity: 1,
          targetQuantity: 1,
          expiryDate: '2027-04-16',
          instructions: 'Apply over gauze',
          notes: ''
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Cotton (Small Pack)',
          category: 'External Use (Topicals)',
          purpose: 'Clean wounds',
          whenToUse: 'Before dressing',
          quantity: 1,
          targetQuantity: 1,
          expiryDate: '2027-04-16',
          instructions: 'Use clean pieces',
          notes: ''
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Antiseptic (Small Bottle)',
          category: 'External Use (Topicals)',
          purpose: 'Disinfect wounds',
          whenToUse: 'Cuts',
          quantity: 1,
          targetQuantity: 1,
          expiryDate: '2027-04-16',
          instructions: 'Apply before dressing',
          notes: 'Travel-size'
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Antiseptic Ointment',
          category: 'External Use (Topicals)',
          purpose: 'Prevent infection',
          whenToUse: 'Minor wounds',
          quantity: 1,
          targetQuantity: 1,
          expiryDate: '2027-04-16',
          instructions: 'Apply thin layer',
          notes: ''
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Crepe Bandage',
          category: 'External Use (Topicals)',
          purpose: 'Support sprains',
          whenToUse: 'Injury',
          quantity: 1,
          targetQuantity: 1,
          expiryDate: '2027-04-16',
          instructions: 'Wrap firmly',
          notes: ''
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Burn Ointment',
          category: 'External Use (Topicals)',
          purpose: 'Treat burns',
          whenToUse: 'Minor burns',
          quantity: 1,
          targetQuantity: 1,
          expiryDate: '2027-04-16',
          instructions: 'Apply gently',
          notes: 'Optional'
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Pain Relief Spray / Gel',
          category: 'Pain Relief & Inflammation',
          purpose: 'Muscle relief',
          whenToUse: 'Sprain',
          quantity: 1,
          targetQuantity: 1,
          expiryDate: '2027-04-16',
          instructions: 'External use',
          notes: ''
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Scissors (Compact)',
          category: 'General Health Essentials',
          purpose: 'Cut materials',
          whenToUse: 'Dressing',
          quantity: 1,
          targetQuantity: 1,
          expiryDate: '2027-04-16',
          instructions: 'Keep clean',
          notes: ''
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Disposable Gloves',
          category: 'General Health Essentials',
          purpose: 'Hygiene',
          whenToUse: 'Wound care',
          quantity: 5,
          targetQuantity: 6,
          expiryDate: '2027-04-16',
          instructions: 'Single use',
          notes: ''
        },
        {
          id: crypto.randomUUID(),
          itemName: 'Hand Sanitizer (Small)',
          category: 'External Use (Topicals)',
          purpose: 'Clean hands',
          whenToUse: 'Before care',
          quantity: 1,
          targetQuantity: 1,
          expiryDate: '2027-04-16',
          instructions: 'Apply thoroughly',
          notes: ''
        }
      ];
      setSyncedItem('FIRST_AID_MOBILE', JSON.stringify(SEED_FIRST_AID_MOBILE));
      setSyncedItem('first_aid_mobile_seeded_v2', 'true');
    }

    // --- Supplements Seeding ---
    if (typeof window !== 'undefined' && !localStorage.getItem(getPrefixedKey('supplements_seeded_v1'))) {
      const SEED_SUPPLEMENTS: SupplementItem[] = [
        {
          id: crypto.randomUUID(),
          name: 'Multivitamin',
          category: 'Vitamins',
          purpose: 'General health support',
          whoUses: 'Both',
          frequency: 'Daily',
          dosage: 'As per label',
          quantity: 1,
          targetQuantity: 1,
          expiryDate: '2027-04-16',
          notes: 'Base supplement'
        },
        {
          id: crypto.randomUUID(),
          name: 'Vitamin D',
          category: 'Vitamins',
          purpose: 'Bone health, immunity',
          whoUses: 'Both',
          frequency: 'Daily',
          dosage: 'As per label',
          quantity: 1,
          targetQuantity: 1,
          expiryDate: '2027-04-16',
          notes: 'Common deficiency'
        },
        {
          id: crypto.randomUUID(),
          name: 'Vitamin B12',
          category: 'Vitamins',
          purpose: 'Energy, nerve health',
          whoUses: 'Both',
          frequency: 'Daily/Weekly',
          dosage: 'As per label',
          quantity: 1,
          targetQuantity: 1,
          expiryDate: '2027-04-16',
          notes: 'Especially important'
        },
        {
          id: crypto.randomUUID(),
          name: 'Calcium',
          category: 'Minerals',
          purpose: 'Bone strength',
          whoUses: 'Wife / Both',
          frequency: 'Daily',
          dosage: 'As per label',
          quantity: 1,
          targetQuantity: 1,
          expiryDate: '2027-04-16',
          notes: ''
        },
        {
          id: crypto.randomUUID(),
          name: 'Magnesium',
          category: 'Minerals',
          purpose: 'Muscle, nerve support',
          whoUses: 'You',
          frequency: 'Daily',
          dosage: 'As per label',
          quantity: 1,
          targetQuantity: 1,
          expiryDate: '2027-04-16',
          notes: 'Helps with pain/sleep'
        },
        {
          id: crypto.randomUUID(),
          name: 'Zinc',
          category: 'Minerals',
          purpose: 'Immunity',
          whoUses: 'Both',
          frequency: 'Daily',
          dosage: 'As per label',
          quantity: 1,
          targetQuantity: 1,
          expiryDate: '2027-04-16',
          notes: ''
        },
        {
          id: crypto.randomUUID(),
          name: 'Ashwagandha',
          category: 'Herbal',
          purpose: 'Stress, energy balance',
          whoUses: 'You / Both',
          frequency: 'Daily',
          dosage: 'As per label',
          quantity: 1,
          targetQuantity: 1,
          expiryDate: '2027-04-16',
          notes: 'Traditional supplement'
        }
      ];
      setSyncedItem('SUPPLEMENTS', JSON.stringify(SEED_SUPPLEMENTS));
      setSyncedItem('supplements_seeded_v1', 'true');
    }
  }, []);

  return null;
}
