"use client";

import React from 'react';

interface SyncStatusProps {
  status: 'idle' | 'syncing' | 'error' | 'unauthenticated' | 'connected' | 'initializing';
}

export function SyncStatus({ status }: SyncStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'syncing':
        return { 
          color: 'bg-amber-500', 
          text: 'Syncing...', 
          ping: true,
          label: 'text-amber-600 dark:text-amber-400'
        };
      case 'connected':
        return { 
          color: 'bg-emerald-500', 
          text: 'Cloud Active', 
          ping: false,
          label: 'text-emerald-600 dark:text-emerald-400'
        };
      case 'error':
        return { 
          color: 'bg-rose-500', 
          text: 'Sync Error', 
          ping: false,
          label: 'text-rose-600 dark:text-rose-400'
        };
      case 'unauthenticated':
        return { 
          color: 'bg-zinc-400', 
          text: 'Offline (Local Only)', 
          ping: false,
          label: 'text-zinc-500 dark:text-zinc-400'
        };
      case 'initializing':
        return { 
          color: 'bg-blue-500', 
          text: 'Initializing...', 
          ping: true,
          label: 'text-blue-600 dark:text-blue-400'
        };
      default:
        return { 
          color: 'bg-emerald-500/50', 
          text: 'Cloud Synced', 
          ping: false,
          label: 'text-zinc-400 dark:text-zinc-500'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100/50 dark:bg-zinc-800/30 border border-zinc-200/50 dark:border-zinc-700/30 transition-all duration-500">
      <div className="relative flex h-2 w-2">
        {config.ping && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.color} opacity-75`}></span>
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${config.color}`}></span>
      </div>
      <span className={`text-[10px] font-bold uppercase tracking-[0.15em] ${config.label} transition-colors duration-500`}>
        {config.text}
      </span>
    </div>
  );
}
