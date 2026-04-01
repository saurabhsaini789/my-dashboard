"use client";

import { useEffect, useCallback, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getPrefixedKey } from '@/lib/keys';
import { ALL_SYNC_KEYS, LEGACY_KEY_MIGRATION } from '@/lib/sync-keys';

export function useSync() {
  const [isReady, setIsReady] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'unauthenticated' | 'connected' | 'initializing' | 'local'>('initializing');
  const isSyncingFromRemote = useRef(false);
  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  // Diagnostic Log (Runs once)
  useEffect(() => {
    const projectID = process.env.NEXT_PUBLIC_DASHBOARD_ID;
    console.log(`[Sync] Dashboard ID: ${projectID || 'NONE (unprefixed)'}`);
  }, []);

  // --- 0. Session Management ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        console.warn('[Sync] No session found. Cloud sync will be disabled.');
        setSyncStatus('unauthenticated');
      } else {
        console.log('[Sync] Session established for:', session.user?.email);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        console.log('[Sync] Auth change: Authenticated');
        setSyncStatus('idle');
      } else {
        console.warn('[Sync] Auth change: Unauthenticated');
        setSyncStatus('unauthenticated');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- 1. Push Local Changes to Supabase ---
  const pushToSupabase = useCallback(async (key: string, value: string | null) => {
    if (isSyncingFromRemote.current) return;
    if (!value) return;
    if (!session) {
      // Don't log error here as it might be normal on localhost
      return;
    }

    if (isLocalhost) {
      console.log(`[Sync] Localhost: Skipping push for ${key} to protect cloud data.`);
      setSyncStatus('local');
      setTimeout(() => setSyncStatus('idle'), 2000);
      return;
    }

    const prefixedKey = getPrefixedKey(key);

    const performPush = async (attempt = 0): Promise<boolean> => {
      try {
        const parsedValue = JSON.parse(value);
        setSyncStatus('syncing');
        
        const { error } = await supabase
          .from('dashboard_data')
          .upsert({ 
            key: prefixedKey, 
            value: parsedValue, 
            updated_at: new Date().toISOString() 
          }, { onConflict: 'key' });

        if (error) {
          // If it's a network/transient error and we have retries left
          if (attempt < 2 && !['401', '403', '409', '42P01'].includes(error.code)) {
            const delay = Math.pow(2, attempt) * 1000;
            console.warn(`[Sync] Push failed for ${prefixedKey}, retrying in ${delay}ms...`, error.message);
            await new Promise(r => setTimeout(r, delay));
            return performPush(attempt + 1);
          }
          
          // Final failure or non-retryable error
          if (error.code === '401' || error.code === '403') {
            setSyncStatus('unauthenticated');
          } else {
            console.error(`[Sync] Error pushing ${prefixedKey} (Code: ${error.code}):`, error.message || error);
            setSyncStatus('error');
          }
          return false;
        }

        setSyncStatus('connected'); // Show we are talking to the cloud
        setTimeout(() => setSyncStatus('idle'), 2000); // Back to idle after showing success
        console.log(`[Sync] Cloud update: ${prefixedKey} pushed.`);
        return true;
      } catch (e: any) {
        console.error(`[Sync] Failed to parse ${prefixedKey} for push:`, e.message || e);
        setSyncStatus('error');
        return false;
      }
    };

    await performPush();
  }, [session]);

  // --- 2. Pull Initial Data from Supabase & Initial Push ---
  useEffect(() => {
    const initSync = async () => {
      console.log('[Sync] Initializing pull from cloud...');
      setSyncStatus('initializing');

      // 0. Legacy Key Migration (Local)
      for (const [legacyKey, newKey] of Object.entries(LEGACY_KEY_MIGRATION)) {
        const legacyPrefixed = getPrefixedKey(legacyKey);
        const newPrefixed = getPrefixedKey(newKey);
        const legacyVal = localStorage.getItem(legacyPrefixed);
        
        if (legacyVal && !localStorage.getItem(newPrefixed)) {
          console.log(`[Sync] Migrating legacy local data: ${legacyKey} -> ${newKey}`);
          localStorage.setItem(newPrefixed, legacyVal);
        }
      }
      
      const { data: remoteData, error } = session 
        ? await supabase.from('dashboard_data').select('*')
        : { data: null, error: null };

      if (error) {
        console.error('[Sync] Error loading initial cloud data:', error.message || error);
        setSyncStatus('error');
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
          const parts = row.key.split(':');
          const baseKey = parts[parts.length - 1];
          if (baseKey && ALL_SYNC_KEYS.includes(baseKey)) {
            const currentLocal = localStorage.getItem(row.key);
            const remoteVal = JSON.stringify(row.value);
            
            // Only update if different
            if (currentLocal !== remoteVal) {
              console.log(`[Sync] Updating local '${baseKey}' from cloud.`);
              localStorage.setItem(row.key, remoteVal);
              window.dispatchEvent(new CustomEvent('local-storage-change', { detail: { key: baseKey } }));
            }
          }
        });
        isSyncingFromRemote.current = false;
        console.log(`[Sync] Synchronized ${projectRemoteData.length} records from Supabase.`);
      }

      // b) Push local data that isn't on remote yet (Migration)
      if (session && !isLocalhost) {
        for (const baseKey of ALL_SYNC_KEYS) {
          const prefixedKey = getPrefixedKey(baseKey);
          if (!remoteKeysMap.has(prefixedKey)) {
            const localVal = localStorage.getItem(prefixedKey);
            if (localVal) {
              console.log(`[Sync] Initial push of '${baseKey}' to cloud.`);
              await pushToSupabase(baseKey, localVal);
            }
          }
        }
      } else if (session && isLocalhost) {
        console.log('[Sync] Localhost detected: Initial push/migrations skipped to protect cloud data.');
      }

      setIsReady(true);
      if (session) setSyncStatus('connected');
      setTimeout(() => setSyncStatus('idle'), 1000);
      console.log('[Sync] Ready.');
    };

    if (session !== undefined) {
      initSync();
    }
  }, [pushToSupabase, session]);

  // --- 3. Listen for Local Storage Changes ---
  useEffect(() => {
    // Other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && !isSyncingFromRemote.current) {
        // Find if this prefixed key matches one of our sync keys
        const baseKey = ALL_SYNC_KEYS.find(k => getPrefixedKey(k) === e.key);
        if (baseKey) {
          pushToSupabase(baseKey, e.newValue);
        }
      }
    };

    // Current tab (via setSyncedItem)
    const handleLocalUpdate = (e: any) => {
      if (e.detail && ALL_SYNC_KEYS.includes(e.detail.key) && !isSyncingFromRemote.current) {
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
    if (!session) return;

    const channel = supabase
      .channel('dashboard-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dashboard_data' },
        (payload) => {
          const newRow = payload.new as any;
          if (!newRow || !newRow.key) return;

          // Check if key belongs to this project
          const projectID = process.env.NEXT_PUBLIC_DASHBOARD_ID;
          const isProjectKey = projectID ? newRow.key.startsWith(`${projectID}:`) : !newRow.key.includes(':');
          
          if (isProjectKey) {
            const parts = newRow.key.split(':');
            const baseKey = parts[parts.length - 1];
            
            if (baseKey && ALL_SYNC_KEYS.includes(baseKey)) {
              console.log(`[Sync] Incoming cloud update: ${newRow.key}`);
              
              const currentLocal = localStorage.getItem(newRow.key);
              const remoteVal = JSON.stringify(newRow.value);
              
              if (currentLocal !== remoteVal) {
                isSyncingFromRemote.current = true;
                localStorage.setItem(newRow.key, remoteVal);
                window.dispatchEvent(new CustomEvent('local-storage-change', { detail: { key: baseKey } }));
                
                // Visual feedback of sync
                setSyncStatus('connected');
                setTimeout(() => setSyncStatus('idle'), 2000);
                
                isSyncingFromRemote.current = false;
              }
            }
          }
        }
      )
      .subscribe((status: string) => {
        console.log(`[Sync] Realtime channel status: ${status}`);
        if (status === 'SUBSCRIBED') {
          setSyncStatus('connected');
          setTimeout(() => setSyncStatus('idle'), 1000);
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[Sync] Realtime connection failed. Check if Realtime is enabled on the table and RLS allows access.');
          setSyncStatus('error');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  return { isReady, syncStatus, isLocalhost };
}
