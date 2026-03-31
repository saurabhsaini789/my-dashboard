export interface BusinessChannel {
  id: string;
  name: string;
  platform: string;
  contentType?: string;
  status: 'Active' | 'Paused' | 'Idea';
  lastPostedDate: string; // ISO date
  postingFrequency: number; // in days
  nextPostDueDate: string; // ISO date
}

export interface ContentIdea {
  id: string;
  channelId: string;
  title: string;
  notes?: string;
  status: 'Pending' | 'Completed';
  createdAt: string;
}

export const DEFAULT_PLATFORMS = [
  'Instagram',
  'YouTube',
  'LinkedIn',
  'Other'
];

export const CONTENT_TYPES = [
  'Reels',
  'Posts',
  'Shorts',
  'Mixed'
];
