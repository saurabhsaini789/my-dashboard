"use client";

import { useEffect, useCallback, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getPrefixedKey } from '@/lib/keys';

// The local storage keys we want to sync
const SYNC_KEYS = ['os_habits', 'goals_projects', 'goals_seeded_v2', 'goals_seeded_v3', 'dashboard_quotes', 'finances_income', 'finances_expenses', 'finances_emergency_fund', 'finances_assets', 'finances_liabilities', 'finances_business', 'finances_goals', 'finances_snapshots'];

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

      const remoteKeysMap = new Map(projectRemoteData.map(r => [r.key, r.value]));

      // a) Load remote data into local storage
      if (projectRemoteData.length > 0) {
        isSyncingFromRemote.current = true;
        projectRemoteData.forEach((row) => {
          // Extract base key (e.g. "my_dashboard:os_habits" -> "os_habits")
          const baseKey = row.key.split(':').pop();
          if (baseKey && SYNC_KEYS.includes(baseKey)) {
            localStorage.setItem(row.key, JSON.stringify(row.value));
            // Notify components
            window.dispatchEvent(new CustomEvent('local-storage-change', { detail: { key: baseKey } }));
          }
        });
        isSyncingFromRemote.current = false;
        console.log(`[Sync] Loaded ${projectRemoteData.length} records for this project from Supabase.`);
      }

      // b) Push local data that isn't on remote yet (Migration)
      for (const baseKey of SYNC_KEYS) {
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
        const baseKey = SYNC_KEYS.find(k => getPrefixedKey(k) === e.key);
        if (baseKey) {
          pushToSupabase(baseKey, e.newValue);
        }
      }
    };

    // Current tab (via setSyncedItem)
    const handleLocalUpdate = (e: any) => {
      if (e.detail && SYNC_KEYS.includes(e.detail.key)) {
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
            if (baseKey && SYNC_KEYS.includes(baseKey)) {
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
