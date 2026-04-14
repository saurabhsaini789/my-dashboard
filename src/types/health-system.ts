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

  name: string;
  category: string;

  purpose: string;
  whoUses: string;

  frequency: string;
  dosage: string;

  quantity: number;
  targetQuantity: number;

  expiryDate: string;

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
