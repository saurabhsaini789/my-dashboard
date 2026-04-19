import { getPrefixedKey } from './keys';

export interface TaggedData<T> {
  u: string; // userId
  t: number; // timestamp
  d: T;      // data
}

/**
 * Validates if the local data belongs to the current user.
 */
export function validateLocalData<T>(rawData: string | null, currentUserId: string): T | null {
  if (!rawData) return null;

  try {
    const parsed = JSON.parse(rawData);
    
    // Check if it's the new tagged format
    if (parsed && typeof parsed === 'object' && 'u' in parsed && 'd' in parsed) {
      if (parsed.u === currentUserId) {
        return parsed.d as T;
      } else {
        console.warn('[Security] Data userId mismatch. Ignoring stale/foreign data.');
        return null;
      }
    }

    // Legacy data (untagged) - we treat it as potentially insecure or "local-only"
    // In a strict regime, we might return null here, but for migration, 
    // we might allow it once if they are logged in.
    return parsed as T;
  } catch {
    return null;
  }
}

/**
 * Determines if a dataset should be pushed to the cloud.
 * Prevents pushing empty/default data that might overwrite remote content.
 */
export function shouldPushData(data: any): boolean {
  if (data === null || data === undefined) return false;
  
  // Prevent pushing empty arrays if they represent "no data"
  if (Array.isArray(data) && data.length === 0) {
    // Note: This might block legitimate "clear all" actions.
    // However, the user requested to prevent pushing empty datasets.
    return false;
  }

  // Prevent pushing objects that are obviously "placeholders" or defaults
  if (typeof data === 'object' && Object.keys(data).length === 0) {
    return false;
  }

  return true;
}

/**
 * Clears all project-related localStorage for the current dashboard.
 */
export function clearUserCache() {
  if (typeof window === 'undefined') return;
  
  const dashboardId = process.env.NEXT_PUBLIC_DASHBOARD_ID;
  const prefix = dashboardId ? `${dashboardId}:` : '';
  
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (prefix === '' || key.startsWith(prefix))) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(k => localStorage.removeItem(k));
  console.log(`[Security] Cleared ${keysToRemove.length} cached project keys (Prefix: '${prefix}').`);
}
