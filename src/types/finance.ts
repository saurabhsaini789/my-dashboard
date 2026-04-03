export type ExpenseCategory = 'rent' | 'EMI' | 'Insurance' | 'food' | 'travel' | 'shopping' | 'investment' | 'savings' | 'Grocery' | 'Clothing' | 'Transport' | 'Dining' | 'Bills' | 'Other';
export type ExpenseType = 'need' | 'want' | 'investment';
export type PaymentMethod = 'Cash' | 'Debit Card' | 'Credit Card' | 'UPI / Wallet' | 'Bank Transfer';
export type EntryType = 'Bill' | 'Quick';

export interface ExpenseItem {
  id: string;
  name: string;
  category: string; // Grocery, Clothing, Transport, Dining, Bills, Others
  type: 'need' | 'want';
  quantity: string;
  unitPrice: number;
  totalPrice: number;
  size?: string;
  brand?: string;
  notes?: string;
  
  // Clothing extras (supporting multi-item clothing bills)
  itemType?: string; 
  color?: string;
  person?: string;
  quality?: string;
}

export interface GroceryPlanItem {
  id: string;
  name: string;
  category?: string;
  plannedQuantity: number;
  unitSize: string; // e.g. 1L, 500g, 1 Dozen
  frequency: 'Daily' | 'Weekly' | 'Bi-Weekly' | 'Monthly' | 'As Needed';
  idealTiming: string; // e.g. "Start of month", "Every Sunday"
  expectedPrice: number;
  checkedUnits?: ('bought' | 'skipped' | 'pending')[]; 
  skippedMonths?: string[]; // Array of 'YYYY-MM' strings where this item was skipped
  consumptionDays?: number; // How many days it takes to consume 1 unit
}

export interface ExpenseRecord {
  id: string;
  category: ExpenseCategory;
  subcategory: string;
  amount: number;
  date: string;
  type: ExpenseType; // Need vs Want
  assetId?: string; // Account used for payment
  paidToType: 'savings' | 'emergency' | 'asset' | 'other';
  paidToId?: string; // ID of Goal/Asset or 'emergency'
  paidToName?: string; // For 'other' recipient
  
  // Pantry / Detailed Fields
  entryType: EntryType;
  paymentMethod: PaymentMethod;
  vendor?: string; // Place of Shop
  notes?: string;
  tags?: string[];
  items?: ExpenseItem[];
  sgst?: number;
  cgst?: number;
  
  // Category specific fields (dynamic)
  quantity?: string; // for Top-level quick entry
  size?: string;
  person?: string;
  brand?: string;
  transportType?: 'Recharge' | 'Ticket' | 'Ride' | 'Other';
  mealType?: 'Lunch' | 'Dinner' | 'Snack';
  occasion?: string;
  peopleCount?: number;
  balanceAfter?: number;
  color?: string;
  quality?: string;
  itemType?: string; // clothing type
}

export interface IncomeRecord {
  id: string;
  source: 'salary' | 'bonus' | 'freelance' | 'business' | 'investment' | 'Govt Benefits' | 'tax refund' | 'gift' | 'sale' | 'refund' | 'other';
  amount: number;
  date: string;
  type: 'active' | 'passive' | 'one time';
  assetId?: string;
  notes?: string;
  customSource?: string;
}

export interface Contribution {
  id: string;
  date: string;
  amount: number;
}

export interface Asset {
  id: string;
  name: string;
  type: string;
  initialValue: number;
  startDate: string;
  contributions: Contribution[];
  growthRate: number;
  lastUpdated: string;
  balance?: number;
}

export interface PaymentLog {
  id: string;
  date: string;
  amount: number;
  type: 'Regular EMI' | 'Prepayment';
}

export interface Liability {
  id: string;
  name: string;
  type: string;
  totalAmount: number;
  remainingBalance: number;
  interestRate: number;
  emi: number;
  tenureRemaining: number;
  paymentLogs: PaymentLog[];
  lastUpdated: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  unit: string;          // e.g., 'bottles', 'kg', 'L'
  monthlyUsage: number;  // How many units consumed per month
  quantity: number;      // Stock amount recorded at lastUpdated
  lastUpdated: string;   // ISO date when stock was last manually verified
}
