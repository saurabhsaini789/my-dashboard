export interface Book {
  id: string;
  order: number;
  name: string;
  language: 'English' | 'Hindi';
  category: string;
  status: 'Planned' | 'Reading' | 'Completed';
  createdAt: string;
}

export const BOOK_CATEGORIES = [
  'Fiction',
  'Non-Fiction',
  'Self-help',
  'Technical',
  'Finance',
  'Health',
  'Biography',
  'History',
  'Philosophy',
  'Spirituality',
  'Other'
];

export interface MonthlyEntry {
  english: string;
  hindi: string;
  englishStatus: 'Completed' | 'Reading' | 'Planned' | 'None';
  hindiStatus: 'Completed' | 'Reading' | 'Planned' | 'None';
}

export type YearlyLogData = Record<string, MonthlyEntry>; // Month name is key

export type MultiYearLogData = Record<number, YearlyLogData>; // Year is key

export interface CompletedBook {
  id: string;
  name: string;
  language: 'English' | 'Hindi';
  completionDate: string; // YYYY-MM-DD
  rating: number; // 1-5
  notes: string;
  wouldRecommend: boolean;
  createdAt: string;
}
