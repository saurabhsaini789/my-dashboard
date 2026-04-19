export interface ContentTypeSchedule {
 id: string;
 type: string; // 'Post', 'Reel', 'Video', 'Networking', or custom
 frequency: number; // in days
 lastPostedDate: string; // ISO date
 nextPostDueDate: string; // ISO date
}

export interface BusinessChannel {
 id: string;
 name: string;
 platform: string;
 status: 'Active' | 'Paused' | 'Idea';
 schedules: ContentTypeSchedule[];
 rowColor?: string;
 about?: string;
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
 'X (Twitter)',
 'Facebook',
 'TikTok',
 'Pinterest',
 'Other'
];

export const POST_TYPES = [
 'Post',
 'Reel',
 'Video',
 'Shorts',
 'Networking',
 'Story',
 'Carousel',
 'Other'
];

export const CONTENT_TYPES = POST_TYPES; // Maintain compatibility if needed elsewhere

