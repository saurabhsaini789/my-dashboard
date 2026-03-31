import { getPrefixedKey } from './keys';
import { SYNC_KEYS } from './sync-keys';
import { setSyncedItem } from './storage';

import { IncomeRecord, ExpenseRecord, Contribution, Asset, PaymentLog, Liability } from '@/types/finance';
export type { IncomeRecord, ExpenseRecord, Contribution, Asset, PaymentLog, Liability };

/**
 * Gets the current exchange rate for CAD to INR.
 * Defaults to 67.00 as requested by the user.
 */
export const getExchangeRate = (): number => {
  if (typeof window === 'undefined') return 67;
  const saved = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_EXCHANGE_RATE));
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
 * Converts an amount from INR to CAD.
 */
export const convertToCAD = (amount: number, currency: 'INR' | 'CAD' = 'INR', rate?: number): number => {
  if (currency === 'CAD') return amount;
  const currentRate = rate || getExchangeRate();
  return amount / currentRate;
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

/**
 * Updates asset contributions based on an expense.
 */
export const updateAssetFromExpense = (expenseId: string, assetId: string | undefined, amount: number, currency: 'INR' | 'CAD' = 'INR', date: string, isDelete = false) => {
  if (typeof window === 'undefined') return;
  const savedAssets = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_ASSETS));
  if (!savedAssets) return;

  try {
    let assetsList: Asset[] = JSON.parse(savedAssets);
    let changed = false;

    // 1. Remove old contribution from any asset that might have it
    assetsList = assetsList.map((asset) => {
      const initialLen = asset.contributions.length;
      asset.contributions = asset.contributions.filter((c) => c.id !== `expense-${expenseId}`);
      if (asset.contributions.length !== initialLen) {
          changed = true;
          asset.lastUpdated = new Date().toISOString().split('T')[0];
      }
      return asset;
    });

    // 2. Add new negative contribution if not deleting and assetId is present
    if (!isDelete && assetId) {
      const targetAsset = assetsList.find((a) => a.id === assetId);
      if (targetAsset) {
        targetAsset.contributions.unshift({
          id: `expense-${expenseId}`,
          date: date,
          amount: -amount,
          currency: currency
        });
        targetAsset.lastUpdated = new Date().toISOString().split('T')[0];
        changed = true;
      }
    }

    if (changed) {
      setSyncedItem(SYNC_KEYS.FINANCES_ASSETS, JSON.stringify(assetsList));
    }
  } catch (e) {
    console.error("Failed to update asset contributions from expenses", e);
  }
};

/**
 * Updates recipient contributions (Savings Goals, Emergency Fund, etc.) based on an expense.
 */
export const updateRecipientFromExpense = (expenseId: string, paidToType: string, paidToId: string | undefined, amount: number, currency: 'INR' | 'CAD' = 'INR', date: string, isDelete = false) => {
  if (typeof window === 'undefined') return;
  
  // 1. Savings Goals
  if (paidToType === 'savings') {
    const saved = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_SAVINGS_TARGETS));
    if (saved) {
      try {
        let goals = JSON.parse(saved);
        let changed = false;
        goals = goals.map((g: any) => {
          const initialLen = g.contributions.length;
          g.contributions = g.contributions.filter((c: any) => c.id !== `expense-${expenseId}`);
          if (g.contributions.length !== initialLen) changed = true;
          if (!isDelete && g.id === paidToId) {
            g.contributions.unshift({ id: `expense-${expenseId}`, date, amount, currency });
            changed = true;
          }
          return g;
        });
        if (changed) setSyncedItem(SYNC_KEYS.FINANCES_SAVINGS_TARGETS, JSON.stringify(goals));
      } catch (e) {}
    }
  }

  // 2. Emergency Fund
  if (paidToType === 'emergency') {
    const saved = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_EMERGENCY_FUND));
    if (saved) {
      try {
        let fund = JSON.parse(saved);
        let changed = false;
        const initialLen = fund.contributions.length;
        fund.contributions = fund.contributions.filter((c: any) => c.id !== `expense-${expenseId}`);
        if (fund.contributions.length !== initialLen) changed = true;
        if (!isDelete) {
          fund.contributions.unshift({ id: `expense-${expenseId}`, date, amount, currency });
          changed = true;
        }
        if (changed) setSyncedItem(SYNC_KEYS.FINANCES_EMERGENCY_FUND, JSON.stringify(fund));
      } catch (e) {}
    }
  }

  // 3. Asset (Contribution to asset)
  if (paidToType === 'asset') {
    const saved = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_ASSETS));
    if (saved) {
      try {
        let assetsList: Asset[] = JSON.parse(saved);
        let changed = false;
        assetsList = assetsList.map((asset) => {
          const initialLen = asset.contributions.length;
          asset.contributions = asset.contributions.filter((c) => c.id !== `expense-recip-${expenseId}`);
          if (asset.contributions.length !== initialLen) changed = true;
          if (!isDelete && asset.id === paidToId) {
            asset.contributions.unshift({ id: `expense-recip-${expenseId}`, date, amount, currency });
            changed = true;
          }
          return asset;
        });
        if (changed) setSyncedItem(SYNC_KEYS.FINANCES_ASSETS, JSON.stringify(assetsList));
      } catch (e) {}
    }
  }
};
