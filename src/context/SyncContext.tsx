"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { useSync } from '@/hooks/useSync';

interface SyncContextType {
  isReady: boolean;
  syncStatus: 'idle' | 'syncing' | 'error' | 'unauthenticated' | 'connected' | 'initializing' | 'local';
  isLocalhost: boolean;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: ReactNode }) {
  const sync = useSync();

  return (
    <SyncContext.Provider value={sync}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSyncStatus() {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSyncStatus must be used within a SyncProvider');
  }
  return context;
}
