"use client";

import { useSyncExternalStore, useCallback, useState, useEffect, useRef } from 'react';
import { getPrefixedKey } from '@/lib/keys';
import { validateLocalData } from '@/lib/security';
import { createClient } from '@/lib/supabase/client';

/**
 * A store-agnostic hook to subscribe to a specific storage key.
 * This abstracts away the internal storage mechanism (events vs direct store).
 */
export function useStorageSubscription<T>(key: string, defaultValue: T): T {
  const [userId, setUserId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  
  const cache = useRef<{ raw: string | null; parsed: T; initialized: boolean }>({
    raw: null,
    parsed: defaultValue,
    initialized: false
  });

  useEffect(() => {
    setIsMounted(true);
    const supabase = createClient();
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const subscribe = useCallback((callback: () => void) => {
    const eventName = `local-storage-change:${key}`;
    
    // 1. Listen for key-specific local events (same tab)
    window.addEventListener(eventName, callback as EventListener);
    
    // 2. Listen for cross-tab storage events
    const handleStorage = (e: StorageEvent) => {
      if (e.key === getPrefixedKey(key)) {
        callback();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(eventName, callback as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, [key]);

  const getSnapshot = useCallback(() => {
    // During hydration, return the server's defaultValue
    if (!isMounted || typeof window === 'undefined') return defaultValue;
    
    const prefixedKey = getPrefixedKey(key);
    const rawVal = localStorage.getItem(prefixedKey);
    
    if (cache.current.initialized && rawVal && !cache.current.raw) {
      console.log(`[Storage:${key}] Found new data in storage for ${prefixedKey}`);
    }

    // 1. If raw string hasn't changed, return cached reference
    if (cache.current.initialized && rawVal === cache.current.raw) {
      return cache.current.parsed;
    }

    // 2. Data changed or initializing - parse/validate
    let nextVal: T;

    if (!rawVal) {
      nextVal = defaultValue;
    } else if (userId) {
      const validated = validateLocalData<T>(rawVal, userId);
      if (validated === null) {
        console.warn(`[Storage:${key}] Validation failed for ${prefixedKey}. Data might be for a different user.`);
      }
      nextVal = validated !== null ? validated : defaultValue;
    } else if (rawVal && rawVal.includes('"u":"')) {
      console.log(`[Storage:${key}] Tagged data found but userId not available yet. Returning default.`);
      nextVal = defaultValue;
    } else {
      try {
        nextVal = rawVal ? JSON.parse(rawVal) : defaultValue;
      } catch {
        nextVal = (rawVal as unknown as T) || defaultValue;
      }
    }

    // 3. Update cache and return
    cache.current = { raw: rawVal, parsed: nextVal, initialized: true };
    return nextVal;
  }, [key, defaultValue, userId, isMounted]);

  const getServerSnapshot = useCallback(() => {
    return defaultValue;
  }, [defaultValue]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

