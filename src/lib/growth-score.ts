import { SYNC_KEYS } from "./sync-keys";
import { getPrefixedKey } from "./keys";

export interface CategoryScore {
  name: string;
  score: number; // 0-100
  color: string;
  fullPath: string;
}

export interface GrowthData {
  overallScore: number;
  categories: CategoryScore[];
  timestamp: string;
}

export type ScoreRange = '7D' | '1M' | '6M' | '1Y' | 'Custom';

export interface ScoreFilter {
  range: ScoreRange;
  month?: number;
  year?: number;
}

const HEALTH_KEYS = [
  'MEDICINE_INVENTORY',
  'TRAVEL_MEDICAL_KIT',
  'FIRST_AID_HOME',
  'FIRST_AID_MOBILE',
  'SUPPLEMENTS'
];

/**
 * Normalizes a value to 0-100 range
 */
const normalize = (val: number, min: number, max: number): number => {
  return Math.min(100, Math.max(0, ((val - min) / (max - min)) * 100));
};

/**
 * Checks if a date string falls within the filter range
 */
const isDateInRange = (dateStr: string, filter: ScoreFilter): boolean => {
  const d = new Date(dateStr);
  const now = new Date();
  
  if (filter.range === 'Custom') {
    return d.getMonth() === filter.month && d.getFullYear() === filter.year;
  }

  const diffTime = now.getTime() - d.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  if (filter.range === '7D') return diffDays <= 7;
  if (filter.range === '1M') return diffDays <= 30;
  if (filter.range === '6M') return diffDays <= 180;
  if (filter.range === '1Y') return diffDays <= 365;
  
  return true;
};

export function calculateCategoryScores(filter: ScoreFilter = { range: '7D' }): CategoryScore[] {
  if (typeof window === 'undefined') return [];

  const now = new Date();

  // 1. Habits Score
  let habitsScore = 0;
  try {
    const savedHabits = localStorage.getItem(getPrefixedKey(SYNC_KEYS.HABITS));
    if (savedHabits) {
      const habits = JSON.parse(savedHabits);
      if (Array.isArray(habits) && habits.length > 0) {
        let totalPossible = 0;
        let totalDone = 0;
        
        const daysToLookBack = filter.range === '7D' ? 7 : filter.range === '1M' ? 30 : filter.range === '6M' ? 180 : filter.range === '1Y' ? 365 : 31;

        if (filter.range === 'Custom') {
            const year = filter.year || now.getFullYear();
            const month = filter.month || now.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const monthKey = `${year}-${month}`;

            habits.forEach((h: any) => {
                const isActive = !h.monthScope || h.monthScope.length === 0 || h.monthScope.includes(monthKey);
                if (!isActive) return;
                
                for (let day = 0; day < daysInMonth; day++) {
                    const status = h.records?.[monthKey]?.[day];
                    if (status) {
                        totalPossible++;
                        if (status === 'done') totalDone++;
                        else if (status === 'skip') totalPossible--;
                    }
                }
            });
        } else {
            for (let i = 0; i < daysToLookBack; i++) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
                const dayIndex = d.getDate() - 1;
      
                habits.forEach((h: any) => {
                  const isActive = !h.monthScope || h.monthScope.length === 0 || h.monthScope.includes(monthKey);
                  if (!isActive) return;
      
                  const status = h.records?.[monthKey]?.[dayIndex];
                  if (status) {
                    totalPossible++;
                    if (status === 'done') totalDone++;
                    else if (status === 'skip') totalPossible--;
                  }
                });
            }
        }
        habitsScore = totalPossible > 0 ? (totalDone / totalPossible) * 100 : 0; // STRICTURE: 0 if no data
      }
    }
  } catch (e) { console.error("Habits score error", e); }

  // 2. Projects Score
  let projectsScore = 0;
  try {
    const savedProjects = localStorage.getItem(getPrefixedKey(SYNC_KEYS.GOALS_PROJECTS));
    if (savedProjects) {
      const projects = JSON.parse(savedProjects);
      if (Array.isArray(projects) && projects.length > 0) {
        let totalHistorical = 0;
        let completedHistorical = 0;

        projects.forEach((p: any) => {
          if ((p.isCompleted || p.status === 'completed') && p.completedAt && isDateInRange(p.completedAt, filter)) {
             completedHistorical++;
             totalHistorical++;
          } else if (!p.isCompleted && p.status !== 'completed' && p.createdAt && isDateInRange(p.createdAt, filter)) {
             totalHistorical++;
          }

          if (p.tasks && Array.isArray(p.tasks)) {
            p.tasks.forEach((t: any) => {
              if (t.isCompleted && t.completedAt && isDateInRange(t.completedAt, filter)) {
                completedHistorical++;
                totalHistorical++;
              } else if (!t.isCompleted && t.createdAt && isDateInRange(t.createdAt, filter)) {
                totalHistorical++;
              }
            });
          }
        });
        projectsScore = totalHistorical > 0 ? (completedHistorical / totalHistorical) * 100 : 0; // STRICTURE: 0 if no data
      }
    }
  } catch (e) { console.error("Projects score error", e); }

  // 3. Finance Score (Savings Rate)
  let financeScore = 0;
  try {
    const incomeData = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_INCOME));
    const expenseData = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_EXPENSES));
    
    let totalIncome = 0;
    let totalExpenses = 0;

    if (incomeData) {
      const records = JSON.parse(incomeData);
      totalIncome = records.filter((r: any) => isDateInRange(r.date, filter)).reduce((sum: number, r: any) => sum + r.amount, 0);
    }
    if (expenseData) {
      const records = JSON.parse(expenseData);
      totalExpenses = records.filter((r: any) => isDateInRange(r.date, filter)).reduce((sum: number, r: any) => sum + r.amount, 0);
    }

    if (totalIncome > 0) {
      const savingsRate = (totalIncome - totalExpenses) / totalIncome;
      financeScore = normalize(savingsRate, 0, 0.2);
    } else {
      financeScore = 0; // STRICTURE: 0 if no income data
    }
  } catch (e) { console.error("Finance score error", e); }

  // 4. Expenses Quality Score
  let expensesScore = 0;
  try {
    const expenseData = localStorage.getItem(getPrefixedKey(SYNC_KEYS.FINANCES_EXPENSES));
    if (expenseData) {
      const records = JSON.parse(expenseData);
      const filtered = records.filter((r: any) => isDateInRange(r.date, filter));
      if (filtered.length > 0) {
        const needs = filtered.filter((r: any) => r.type === 'need' || r.type === 'investment').reduce((sum: number, r: any) => sum + r.amount, 0);
        const total = filtered.reduce((sum: number, r: any) => sum + r.amount, 0);
        expensesScore = total > 0 ? (needs / total) * 100 : 0;
      } else {
        expensesScore = 0; // STRICTURE: 0 if no expenses
      }
    }
  } catch (e) { console.error("Expenses quality error", e); }

  // 5. Inventory Health Score
  let inventoryScore = 0;
  try {
    let medTotal = 0;
    let medIssues = 0;
    HEALTH_KEYS.forEach(key => {
      const saved = localStorage.getItem(getPrefixedKey(key));
      if (saved) {
        const items = JSON.parse(saved);
        if (Array.isArray(items)) {
          items.forEach((item: any) => {
            medTotal++;
            const expiry = new Date(item.expiryDate);
            if (expiry < now || item.quantity === 0) medIssues++;
          });
        }
      }
    });

    let wardrobeScore = 0;
    const savedWardrobe = localStorage.getItem(getPrefixedKey(SYNC_KEYS.WARDROBE_INVENTORY));
    if (savedWardrobe) {
      const items = JSON.parse(savedWardrobe);
      if (Array.isArray(items) && items.length > 0) {
        const activeCount = items.filter((i: any) => i.status === 'Active').length;
        wardrobeScore = (activeCount / items.length) * 100;
      }
    }
    
    // If no medical data and no wardrobe data, inventory score is 0
    if (medTotal === 0 && wardrobeScore === 0) {
        inventoryScore = 0;
    } else if (medTotal === 0) {
        inventoryScore = wardrobeScore;
    } else {
        const medScore = ((medTotal - medIssues) / medTotal) * 100;
        inventoryScore = (medScore + wardrobeScore) / 2;
    }
  } catch (e) { console.error("Inventory health error", e); }

  return [
    { name: 'Habits', score: Math.round(habitsScore), color: '#10b981', fullPath: '/habits' },
    { name: 'Projects', score: Math.round(projectsScore), color: '#3b82f6', fullPath: '/goals' },
    { name: 'Finance', score: Math.round(financeScore), color: '#6366f1', fullPath: '/finances' },
    { name: 'Expenses', score: Math.round(expensesScore), color: '#f59e0b', fullPath: '/finances' },
    { name: 'Inventory', score: Math.round(inventoryScore), color: '#ec4899', fullPath: '/health-system' },
  ];
}

export function getOverallGrowthScore(categories: CategoryScore[]): number {
  if (categories.length === 0) return 0;
  const sum = categories.reduce((acc, c) => acc + c.score, 0);
  return Math.round(sum / categories.length);
}

/**
 * Calculates historical scores for each point in the trend
 */
export function getGrowthTrendData(filter: ScoreFilter) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const data = [];

  let count = 7;
  if (filter.range === '1M') count = 4; // Weeks
  if (filter.range === '6M') count = 6; // Months
  if (filter.range === '1Y') count = 12; // Months
  if (filter.range === 'Custom') count = 4; // Weeks in month

  for (let i = count - 1; i >= 0; i--) {
    let name = '';
    let pointFilter: ScoreFilter = { ...filter };

    if (filter.range === '7D') {
      const d = new Date();
      d.setDate(d.getDate() - i);
      name = days[d.getDay()];
      pointFilter = { range: '7D', month: d.getMonth(), year: d.getFullYear() }; // This is a bit simplified
    } else if (filter.range === '1M' || filter.range === 'Custom') {
      name = `W${count - i}`;
      // In a real app we'd calculate for that specific week
    } else {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      name = months[d.getMonth()];
      pointFilter = { range: 'Custom', month: d.getMonth(), year: d.getFullYear() };
    }

    // Calculate real score for this point
    const scores = calculateCategoryScores(pointFilter);
    const score = getOverallGrowthScore(scores);

    data.push({ name, score });
  }
  return data;
}
