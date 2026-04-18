export type InventoryStatus = 'OK' | 'LOW' | 'MISSING' | 'EXPIRED';

/* =========================
 MEDICINE INVENTORY
========================= */

export interface MedicineItem {
 id: string;

 itemName: string;
 category: string;

 purpose: string;
 whenToUse: string;

 quantity: number;
 targetQuantity: number;

 expiryDate: string; // ISO

 instructions: string;

 notes?: string;
}

/* =========================
 SUPPLEMENTS
========================= */

export interface SupplementItem {
  id: string;

  itemName: string;
  category: string;
  person: string; // Who is taking this

  purpose: string;
  frequency: string;
  dose: string;

  quantity: number;
  targetQuantity: number;

  expiryDate: string;

  instructions: string;

  notes?: string;
}

/* =========================
 CATEGORY CONSTANTS
========================= */

export const MEDICINE_CATEGORIES = [
 'Pain Relief & Inflammation',
 'Digestive Care',
 'Cold, Cough & Flu',
 'Chronic Conditions',
 'Dental Care',
 'Women’s Health',
 'External Use (Topicals)',
 'Eye & Minor Care',
 'Emergency Medication',
 'General Health Essentials'
];

export const SUPPLEMENT_CATEGORIES = [
  'Multivitamin',
  'Vitamin',
  'Mineral',
  'Herbal / Traditional',
  'Protein / Nutrition',
  'Specialty Supplement'
];

export const DOSE_UNITS = [
  'mg',
  'mcg',
  'g',
  'IU',
  'mL',
  'drops',
  'capsules',
  'tablets',
  'Other'
];

// Initial seed for family members
export const FAMILY_MEMBERS = [
  'Saurabh',
  'Neha',
];
