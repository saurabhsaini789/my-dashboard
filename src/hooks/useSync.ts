"use client";

import { useEffect, useCallback, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

// The local storage keys we want to sync
const SYNC_KEYS = ['os_habits', 'goals_projects', 'goals_seeded_v2', 'goals_seeded_v3', 'dashboard_quotes'];

export function useSync() {
  const [isReady, setIsReady] = useState(false);
  const isSyncingFromRemote = useRef(false);

  // --- 1. Push Local Changes to Supabase ---
  const pushToSupabase = useCallback(async (key: string, value: string | null) => {
    // If we are currently setting this from a remote update, don't push it back!
    if (isSyncingFromRemote.current) return;
    
    if (!value) return;

    try {
      const parsedValue = JSON.parse(value);
      console.log(`[Sync] Pushing ${key} to Supabase...`);
      
      const { error } = await supabase
        .from('dashboard_data')
        .upsert({ 
          key, 
          value: parsedValue, 
          updated_at: new Date().toISOString() 
        }, { onConflict: 'key' });

      if (error) console.error(`[Sync] Error pushing ${key}:`, error);
      else console.log(`[Sync] Successfully pushed ${key}`);
    } catch (e) {
      console.error(`[Sync] Failed to parse ${key} for push:`, e);
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

      const remoteKeys = new Set(remoteData?.map(r => r.key) || []);

      // a) Load remote data into local storage
      if (remoteData && remoteData.length > 0) {
        isSyncingFromRemote.current = true;
        remoteData.forEach((row) => {
          if (SYNC_KEYS.includes(row.key)) {
            localStorage.setItem(row.key, JSON.stringify(row.value));
            // Notify components
            window.dispatchEvent(new CustomEvent('local-storage-change', { detail: { key: row.key } }));
          }
        });
        isSyncingFromRemote.current = false;
        console.log(`[Sync] Loaded ${remoteData.length} records from Supabase.`);
      }

      // b) Push local data that isn't on remote yet (Migration)
      for (const key of SYNC_KEYS) {
        if (!remoteKeys.has(key)) {
          const localVal = localStorage.getItem(key);
          if (localVal) {
            console.log(`[Sync] Migrating ${key} to cloud for the first time...`);
            await pushToSupabase(key, localVal);
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
      if (e.key && SYNC_KEYS.includes(e.key)) {
        pushToSupabase(e.key, e.newValue);
      }
    };

    // Current tab (via setSyncedItem)
    const handleLocalUpdate = (e: any) => {
      if (e.detail && SYNC_KEYS.includes(e.detail.key)) {
        const val = localStorage.getItem(e.detail.key);
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
          // payload.new for INSERT/UPDATE
          const newRow = payload.new as any;
          if (newRow && SYNC_KEYS.includes(newRow.key)) {
            console.log(`[Sync] Remote update received for ${newRow.key}`);
            isSyncingFromRemote.current = true;
            localStorage.setItem(newRow.key, JSON.stringify(newRow.value));
            window.dispatchEvent(new CustomEvent('local-storage-change', { detail: { key: newRow.key } }));
            isSyncingFromRemote.current = false;
          }
        }
      )
      .subscribe((status) => {
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
