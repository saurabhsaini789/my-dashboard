"use client";

import { useEffect, useCallback, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getPrefixedKey } from '@/lib/keys';
import { ALL_SYNC_KEYS, LEGACY_KEY_MIGRATION } from '@/lib/sync-keys';
import { Session } from '@supabase/supabase-js';
import { shouldPushData, validateLocalData } from '@/lib/security';
import { setSyncedItem } from '@/lib/storage';

export function useSync() {
  const [isReady, setIsReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'unauthenticated' | 'connected' | 'initializing' | 'local'>('initializing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const isSyncingFromRemote = useRef(false);
  const isPushLocked = useRef(false);
  const syncStartTime = useRef(0);
  
  // Kill switch for rest sync rollout
  const IS_PUSH_DISABLED = process.env.NEXT_PUBLIC_DISABLE_REST_SYNC === 'true';

  // --- 0. Session Management ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        setSyncStatus('unauthenticated');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setSyncStatus('idle');
      } else {
        setSyncStatus('unauthenticated');
        syncStartTime.current = 0;
        // Optionally clear cache here if needed, but AuthGuard handles cleanup
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- 1. Push Local Changes to Supabase ---
  const pushToSupabase = useCallback(async (key: string, taggedValue: string | null) => {
    if (!session || !session.user) return;
    if (isPushLocked.current) {
      console.warn(`[Sync] Push blocked for ${key}: Initial hydration lock active.`);
      return;
    }
    if (IS_PUSH_DISABLED) {
      console.log(`[Sync] Push disabled via global flag.`);
      return;
    }
    if (!taggedValue) return;

    // Validate and extract raw data for cloud storage
    const rawValue = validateLocalData<any>(taggedValue, session.user.id);
    if (rawValue === null) {
      console.warn(`[Sync] Push rejected for ${key}: Data userId mismatch or invalid format.`);
      return;
    }

    // Prevent pushing empty/default datasets
    if (!shouldPushData(rawValue)) {
      // Only log if it's a real user action, not part of a broad migration check
      if (!isSyncingFromRemote.current) {
        console.log(`[Sync] Push skipped for ${key}: Dataset is empty or mock.`);
      }
      return;
    }

    const prefixedKey = getPrefixedKey(key);

    const performPush = async (attempt = 0): Promise<boolean> => {
      try {
        setSyncStatus('syncing');
        
        const { error } = await supabase
          .from('dashboard_data')
          .upsert({ 
            key: prefixedKey, 
            value: rawValue, 
            user_id: session.user.id,
            updated_at: new Date().toISOString() 
          }, { onConflict: 'key' });

        if (error) {
          if (attempt < 2 && !['401', '403', '409', '42P01'].includes(error.code)) {
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise(r => setTimeout(r, delay));
            return performPush(attempt + 1);
          }
          
          if (error.code === '401' || error.code === '403') {
            setSyncStatus('unauthenticated');
          } else {
            console.error(`[Sync] Error pushing ${prefixedKey}:`, error.message);
            setErrorMessage(error.message);
            setSyncStatus('error');
          }
          return false;
        }

        setSyncStatus('connected');
        setErrorMessage(null);
        setTimeout(() => setSyncStatus('idle'), 2000);
        return true;
      } catch (e: any) {
        setErrorMessage(e.message || 'Unknown error during push');
        setSyncStatus('error');
        return false;
      }
    };

    await performPush();
  }, [session, IS_PUSH_DISABLED]);

  // --- 2. Pull Initial Data from Supabase ---
  useEffect(() => {
    const initSync = async () => {
      if (!session) return;
      
      console.log('[Sync] Initializing authoritative pull from Supabase...');
      setSyncStatus('initializing');

      // 0. Pull from Supabase (PRIMARY SOURCE OF TRUTH)
      const { data: remoteData, error } = await supabase
        .from('dashboard_data')
        .select('*')
        .eq('user_id', session.user.id);

      if (error) {
        console.error('[Sync] Failed to pull initial cloud data:', error.message);
        setErrorMessage(error.message);
        setSyncStatus('error');
        setIsReady(true);
        return;
      }

      // Filter for keys that belong to this project/dashboard
      const projectID = process.env.NEXT_PUBLIC_DASHBOARD_ID;
      const projectRemoteData = remoteData?.filter(r => 
        projectID ? r.key.startsWith(`${projectID}:`) : !r.key.includes(':')
      ) || [];

      // Load remote data into local storage (TAGGED with userId)
      isSyncingFromRemote.current = true;
      projectRemoteData.forEach((row) => {
        const parts = row.key.split(':');
        const baseKey = parts[parts.length - 1];
        if (baseKey && ALL_SYNC_KEYS.includes(baseKey)) {
          // Wrap in tagged format before storing locally
          setSyncedItem(baseKey, JSON.stringify(row.value), session.user.id);
        }
      });
      
      // 1. Initial Migration (Local untagged data -> Cloud)
      // Only happens for keys NOT already on remote
      const remoteKeysMap = new Map(projectRemoteData.map(r => [r.key, r.value]));
      for (const baseKey of ALL_SYNC_KEYS) {
        const prefixedKey = getPrefixedKey(baseKey);
        if (!remoteKeysMap.has(prefixedKey)) {
          const localVal = localStorage.getItem(prefixedKey);
          if (localVal) {
            // Check if it's untagged (Legacy) or belongs to us
            const validated = validateLocalData(localVal, session.user.id);
            if (validated) {
              console.log(`[Sync] Migrating local '${baseKey}' to cloud.`);
              await pushToSupabase(baseKey, localVal);
            }
          }
        }
      }

      // Safety Lock: Prevent any pushes for 10 seconds to let components hydrate
      isPushLocked.current = true;
      isSyncingFromRemote.current = false;
      syncStartTime.current = Date.now();
      
      setIsReady(true);
      setSyncStatus('connected');
      
      setTimeout(() => {
        isPushLocked.current = false;
        console.log('[Sync] Initial hydration lock released.');
      }, 10000);
      
      setTimeout(() => setSyncStatus('idle'), 1000);
    };

    if (session) {
      initSync();
    }
  }, [session, pushToSupabase]);

  // --- 3. Listen for Local Storage Changes ---
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && !isSyncingFromRemote.current) {
        const baseKey = ALL_SYNC_KEYS.find(k => getPrefixedKey(k) === e.key);
        if (baseKey) {
          pushToSupabase(baseKey, e.newValue);
        }
      }
    };

    const handleLocalUpdate = (e: CustomEvent | Event) => {
      const event = e as CustomEvent<{ key: string, value: string }>;
      
      // Strict loop prevention:
      // 1. Must be a valid sync key
      // 2. We must not be currently pulling from remote
      // 3. We must not be in the initial hydration lock (10s)
      // 4. Double check: The update must have happened after the last remote pull ended
      const timeSinceSync = Date.now() - syncStartTime.current;
      
      if (
        event.detail && 
        ALL_SYNC_KEYS.includes(event.detail.key) && 
        !isSyncingFromRemote.current && 
        !isPushLocked.current &&
        timeSinceSync > 100 // Buffer to catch late events from the pull set
      ) {
        pushToSupabase(event.detail.key, event.detail.value);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage-change', handleLocalUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage-change', handleLocalUpdate);
    };
  }, [pushToSupabase]);

  // --- 4. Listen for Remote Changes (Realtime) ---
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel('dashboard-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dashboard_data' },
        (payload) => {
          const newRow = payload.new as { key: string; value: unknown };
          if (!newRow || !newRow.key) return;

          const projectID = process.env.NEXT_PUBLIC_DASHBOARD_ID;
          const isProjectKey = projectID ? newRow.key.startsWith(`${projectID}:`) : !newRow.key.includes(':');
          
          if (isProjectKey) {
            const parts = newRow.key.split(':');
            const baseKey = parts[parts.length - 1];
            
            if (baseKey && ALL_SYNC_KEYS.includes(baseKey)) {
              isSyncingFromRemote.current = true;
              setSyncedItem(baseKey, JSON.stringify(newRow.value), session.user.id);
              isSyncingFromRemote.current = false;
              
              setSyncStatus('connected');
              setTimeout(() => setSyncStatus('idle'), 2000);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  return { isReady, syncStatus, errorMessage };
}
