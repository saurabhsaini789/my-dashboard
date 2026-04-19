import { getPrefixedKey } from './keys';
import { TaggedData } from './security';

/**
 * Internal state to track the active userId for tagging.
 */
let currentUserId: string | null = null;

export const setCurrentUserId = (id: string | null) => {
  currentUserId = id;
};

export const getCurrentUserId = () => currentUserId;

/**
 * Helper to update localStorage and dispatch a custom event 
 * so the useSync hook can catch changes in the same tab.
 * @param userId Optional explicit userId (defaults to tracked session)
 */
export const setSyncedItem = (key: string, value: string, userId?: string) => {
  if (typeof window === 'undefined') return;
  
  const prefixedKey = getPrefixedKey(key);
  let finalValue = value;
  const targetUserId = userId || currentUserId;

  // Tag the data if userId is available
  if (targetUserId) {
    let parsedValue;
    try {
      parsedValue = JSON.parse(value);
    } catch {
      // If it's not valid JSON (like a raw string 'grid'), we treat the value as the raw data
      parsedValue = value;
    }

    const tagged: TaggedData<any> = {
      u: targetUserId,
      t: Date.now(),
      d: parsedValue
    };
    finalValue = JSON.stringify(tagged);
  }

  localStorage.setItem(prefixedKey, finalValue);
  
  // Custom event for same-window sync (Legacy global listener for useSync engine)
  window.dispatchEvent(new CustomEvent('local-storage-change', { 
    detail: { key, value: finalValue } 
  }));

  // NEW: Key-specific event to isolate component re-renders (Domain separation)
  window.dispatchEvent(new CustomEvent(`local-storage-change:${key}`, { 
    detail: { value: finalValue } 
  }));
  
  // Standard storage event for cross-tab sync 
  window.dispatchEvent(new StorageEvent('storage', { 
    key: prefixedKey, 
    newValue: finalValue, 
    url: window.location.href 
  }));
};
