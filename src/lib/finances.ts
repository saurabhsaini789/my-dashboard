import { getPrefixedKey } from './keys';

export interface IncomeRecord {
  id: string;
  source: 'salary' | 'bonus' | 'freelance' | 'business' | 'investment' | 'Govt Benefits' | 'tax refund' | 'gift' | 'sale' | 'refund' | 'other';
  amount: number;
  currency?: 'INR' | 'CAD';
  date: string;
  type: 'active' | 'passive' | 'one time';
  assetId?: string;
}

export interface ExpenseRecord {
  id: string;
  category: 'rent' | 'EMI' | 'Insurance' | 'food' | 'travel' | 'shopping' | 'investment' | 'savings';
  subcategory: string;
  amount: number;
  currency?: 'INR' | 'CAD';
  date: string;
  type: 'need' | 'want' | 'investment';
  assetId?: string;
  paidToType: 'savings' | 'emergency' | 'asset' | 'other';
  paidToId?: string;
  paidToName?: string;
}

export interface Contribution {
  id: string;
  date: string;
  amount: number;
  currency?: 'INR' | 'CAD';
}

export interface Asset {
  id: string;
  name: string;
  type: string;
  initialValue: number;
  initialCurrency?: 'INR' | 'CAD';
  startDate: string;
  contributions: Contribution[];
  growthRate: number;
  lastUpdated: string;
}

export interface PaymentLog {
  id: string;
  date: string;
  amount: number;
  currency?: 'INR' | 'CAD';
  type: 'Regular EMI' | 'Prepayment';
}

export interface Liability {
  id: string;
  name: string;
  type: string;
  totalAmount: number;
  totalAmountCurrency?: 'INR' | 'CAD';
  remainingBalance: number;
  remainingBalanceCurrency?: 'INR' | 'CAD';
  interestRate: number;
  emi: number;
  emiCurrency?: 'INR' | 'CAD';
  tenureRemaining: number;
  paymentLogs: PaymentLog[];
  lastUpdated: string;
}

/**
 * Gets the current exchange rate for CAD to INR.
 * Defaults to 67.00 as requested by the user.
 */
export const getExchangeRate = (): number => {
  if (typeof window === 'undefined') return 67;
  const saved = localStorage.getItem(getPrefixedKey('finance_exchange_rate'));
  return saved ? parseFloat(saved) : 67;
};

/**
 * Converts an amount from CAD or INR to the base currency (INR).
 */
export const convertToINR = (amount: number, currency: 'INR' | 'CAD' = 'INR', rate?: number): number => {
  if (currency === 'INR' || !currency) return amount;
  const currentRate = rate || getExchangeRate();
  return amount * currentRate;
};

/**
 * Calculates the current balance of an asset considering its initial value,
 * contributions/withdrawals, and compound growth rate.
 */
export const calculateAssetBalance = (asset: Asset): number => {
  const rate = (asset.growthRate || 0) / 100;
  const now = new Date();
  const exchangeRate = getExchangeRate();
  
  // Calculate years since startDate for initialValue
  const startDateStr = asset.startDate || asset.lastUpdated || new Date().toISOString();
  const startDate = new Date(startDateStr);
  const yearsInit = Math.max(0, (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  
  // Convert initial value to INR dynamically
  const initialInINR = convertToINR(asset.initialValue, asset.initialCurrency || 'INR', exchangeRate);
  const initGrown = initialInINR * Math.pow(1 + rate, yearsInit);
  
  // Calculate years since contribution date for each contribution
  const contribsGrown = (asset.contributions || []).reduce((sum: number, c: Contribution) => {
    const cDate = new Date(c.date);
    const yearsC = Math.max(0, (now.getTime() - cDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
    // Convert to INR if the contribution was in CAD
    const amountInINR = convertToINR(c.amount, c.currency || 'INR', exchangeRate);
    return sum + (amountInINR * Math.pow(1 + rate, yearsC));
  }, 0);

  return initGrown + contribsGrown;
};

export const calculateLiabilityBalance = (liability: Liability): number => {
  const exchangeRate = getExchangeRate();
  return convertToINR(liability.remainingBalance, liability.remainingBalanceCurrency || 'INR', exchangeRate);
};
