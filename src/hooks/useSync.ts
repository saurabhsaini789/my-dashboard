"use client";

import { useEffect, useCallback, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getPrefixedKey } from '@/lib/keys';
import { ALL_SYNC_KEYS, LEGACY_KEY_MIGRATION } from '@/lib/sync-keys';

export function useSync() {
  const [isReady, setIsReady] = useState(false);
  const isSyncingFromRemote = useRef(false);

  // --- 1. Push Local Changes to Supabase ---
  const pushToSupabase = useCallback(async (key: string, value: string | null) => {
    // If we are currently setting this from a remote update, don't push it back!
    if (isSyncingFromRemote.current) return;
    
    if (!value) return;

    const prefixedKey = getPrefixedKey(key);

    try {
      const parsedValue = JSON.parse(value);
      console.log(`[Sync] Pushing ${prefixedKey} to Supabase...`);
      
      const { error } = await supabase
        .from('dashboard_data')
        .upsert({ 
          key: prefixedKey, 
          value: parsedValue, 
          updated_at: new Date().toISOString() 
        }, { onConflict: 'key' });

      if (error) console.error(`[Sync] Error pushing ${prefixedKey}:`, error);
      else console.log(`[Sync] Successfully pushed ${prefixedKey}`);
    } catch (e) {
      console.error(`[Sync] Failed to parse ${prefixedKey} for push:`, e);
    }
  }, []);

  // --- 2. Pull Initial Data from Supabase & Initial Push ---
  useEffect(() => {
    const initSync = async () => {
      console.log('[Sync] Initializing sync...');

      // 0. Legacy Key Migration (Local)
      for (const [legacyKey, newKey] of Object.entries(LEGACY_KEY_MIGRATION)) {
        const legacyPrefixed = getPrefixedKey(legacyKey);
        const newPrefixed = getPrefixedKey(newKey);
        const legacyVal = localStorage.getItem(legacyPrefixed);
        
        if (legacyVal && !localStorage.getItem(newPrefixed)) {
          console.log(`[Sync] Migrating legacy local data: ${legacyKey} -> ${newKey}`);
          localStorage.setItem(newPrefixed, legacyVal);
          // We keep the legacy data for safety during the transition
        }
      }
      
      const { data: remoteData, error } = await supabase
        .from('dashboard_data')
        .select('*');

      if (error) {
        console.error('[Sync] Error loading initial data:', error);
        setIsReady(true);
        return;
      }

      // Filter for keys that belong to this project
      const projectID = process.env.NEXT_PUBLIC_DASHBOARD_ID;
      const projectRemoteData = remoteData?.filter(r => 
        projectID ? r.key.startsWith(`${projectID}:`) : !r.key.includes(':')
      ) || [];

      // Also migrate remote data if legacy keys exist in cloud
      const remoteKeysMap = new Map(projectRemoteData.map(r => [r.key, r.value]));

      // a) Load remote data into local storage
      if (projectRemoteData.length > 0) {
        isSyncingFromRemote.current = true;
        projectRemoteData.forEach((row) => {
          // Extract base key (e.g. "my_dashboard:os_habits" -> "os_habits")
          const baseKey = row.key.split(':').pop();
          if (baseKey && ALL_SYNC_KEYS.includes(baseKey)) {
            localStorage.setItem(row.key, JSON.stringify(row.value));
            // Notify components
            window.dispatchEvent(new CustomEvent('local-storage-change', { detail: { key: baseKey } }));
          }
        });
        isSyncingFromRemote.current = false;
        console.log(`[Sync] Loaded ${projectRemoteData.length} records for this project from Supabase.`);
      }

      // b) Push local data that isn't on remote yet (Migration)
      for (const baseKey of ALL_SYNC_KEYS) {
        const prefixedKey = getPrefixedKey(baseKey);
        if (!remoteKeysMap.has(prefixedKey)) {
          const localVal = localStorage.getItem(prefixedKey);
          if (localVal) {
            console.log(`[Sync] Migrating ${prefixedKey} to cloud for the first time...`);
            await pushToSupabase(baseKey, localVal);
          }
        }
      }

      setIsReady(true);
      console.log('[Sync] Initialization complete.');
    };

    initSync();
  }, [pushToSupabase]);

  // --- 3. Listen for Local Storage Changes ---
  useEffect(() => {
    // Other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key) {
        // Find if this prefixed key matches one of our sync keys
        const baseKey = ALL_SYNC_KEYS.find(k => getPrefixedKey(k) === e.key);
        if (baseKey) {
          pushToSupabase(baseKey, e.newValue);
        }
      }
    };

    // Current tab (via setSyncedItem)
    const handleLocalUpdate = (e: any) => {
      if (e.detail && ALL_SYNC_KEYS.includes(e.detail.key)) {
        const val = localStorage.getItem(getPrefixedKey(e.detail.key));
        pushToSupabase(e.detail.key, val);
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
    const channel = supabase
      .channel('dashboard-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dashboard_data' },
        (payload) => {
          const newRow = payload.new as any;
          if (!newRow) return;

          // Check if key belongs to this project
          const projectID = process.env.NEXT_PUBLIC_DASHBOARD_ID;
          const isProjectKey = projectID ? newRow.key.startsWith(`${projectID}:`) : !newRow.key.includes(':');
          
          if (isProjectKey) {
            const baseKey = newRow.key.split(':').pop();
            if (baseKey && ALL_SYNC_KEYS.includes(baseKey)) {
              console.log(`[Sync] Remote update received for ${newRow.key}`);
              isSyncingFromRemote.current = true;
              localStorage.setItem(newRow.key, JSON.stringify(newRow.value));
              window.dispatchEvent(new CustomEvent('local-storage-change', { detail: { key: baseKey } }));
              isSyncingFromRemote.current = false;
            }
          }
        }
      )
      .subscribe((status: string) => {
        console.log(`[Sync] Realtime subscription status: ${status}`);
        if (status === 'CHANNEL_ERROR') {
          console.error('[Sync] Realtime channel error. Check if table has Realtime enabled and RLS policies allow access.');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { isReady };
}
