/**
 * Standardized keys for local storage and database synchronization.
 * Using a consistent 'finances_' prefix for all finance-related data.
 */

export const SYNC_KEYS = {
  // Habits & Productivity
  HABITS: 'os_habits',
  GOALS_PROJECTS: 'goals_projects',
  TASKS: 'os_tasks',
  
  // Finances
  FINANCES_INCOME: 'finances_income',
  FINANCES_EXPENSES: 'finances_expenses',
  FINANCES_EMERGENCY_FUND: 'finances_emergency_fund',
  FINANCES_ASSETS: 'finances_assets',
  FINANCES_LIABILITIES: 'finances_liabilities',
  FINANCES_SAVINGS_TARGETS: 'finances_goals',
  FINANCES_EXCHANGE_RATE: 'finances_exchange_rate',
  FINANCES_SNAPSHOTS: 'finances_snapshots',
  FINANCES_BUSINESS: 'finances_business',
  FINANCES_BUSINESS_IDEAS: 'finances_business_ideas',
  FINANCES_GROCERY_PLAN: 'finances_grocery_plan',
  FINANCES_INVENTORY: 'finances_inventory',
  
  // Books
  BOOKS_QUEUE: 'os_books_queue',
  BOOKS_YEARLY_LOG: 'os_books_yearly_log',
  BOOKS_COMPLETED: 'os_books_completed',
  
  // Settings & UI
  DASHBOARD_QUOTES: 'dashboard_quotes',
  
  // Legacy / Migration Seeds
  GOALS_SEEDED_V2: 'goals_seeded_v2',
  GOALS_SEEDED_V3: 'goals_seeded_v3',
};

/**
 * Mapping of legacy keys to their new standardized counterparts.
 * This is used by the useSync hook to migrate old data automatically.
 */
export const LEGACY_KEY_MIGRATION: Record<string, string> = {
  'finance_income': SYNC_KEYS.FINANCES_INCOME,
  'finance_expenses': SYNC_KEYS.FINANCES_EXPENSES,
  'finance_emergency_fund': SYNC_KEYS.FINANCES_EMERGENCY_FUND,
  'finance_assets': SYNC_KEYS.FINANCES_ASSETS,
  'finance_liabilities': SYNC_KEYS.FINANCES_LIABILITIES,
  'finance_savings_goals': SYNC_KEYS.FINANCES_SAVINGS_TARGETS,
  'finance_exchange_rate': SYNC_KEYS.FINANCES_EXCHANGE_RATE,
};

export const ALL_SYNC_KEYS = Object.values(SYNC_KEYS);
