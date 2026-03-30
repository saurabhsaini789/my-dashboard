"use client";

import { useSyncStatus } from "@/context/SyncContext";
import { DataLoader } from "./DataLoader";

export function SyncManager() {
  const { isReady } = useSyncStatus();

  // We wait for the initial sync from Supabase to complete 
  // before we allow the DataLoader to check for empty localStorage.
  // This prevents the DataLoader from seeding default data on a new device
  // before the actual synced data has arrived.
  if (!isReady) return null;

  return <DataLoader />;
}
