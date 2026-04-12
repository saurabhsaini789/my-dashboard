"use client";

import { useState, useEffect, useCallback } from 'react';
import { WardrobeItem } from '@/types/wardrobe';
import { SYNC_KEYS } from '@/lib/sync-keys';
import { getPrefixedKey } from '@/lib/keys';

const STORAGE_KEY = SYNC_KEYS.WARDROBE_INVENTORY;

export function useWardrobe() {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from local storage
  const loadItems = useCallback(() => {
    try {
      const prefixedKey = getPrefixedKey(STORAGE_KEY);
      const stored = localStorage.getItem(prefixedKey);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load wardrobe items', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadItems();

    const handleStorageChange = (e: StorageEvent) => {
      const prefixedKey = getPrefixedKey(STORAGE_KEY);
      if (e.key === prefixedKey) {
        loadItems();
      }
    };

    const handleLocalUpdate = (e: any) => {
      if (e.detail && e.detail.key === STORAGE_KEY) {
        loadItems();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage-change', handleLocalUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage-change', handleLocalUpdate);
    };
  }, [loadItems]);

  const saveItems = (newItems: WardrobeItem[]) => {
    setItems(newItems);
    const prefixedKey = getPrefixedKey(STORAGE_KEY);
    localStorage.setItem(prefixedKey, JSON.stringify(newItems));
    
    // Dispatch event for sync
    window.dispatchEvent(new CustomEvent('local-storage-change', { 
      detail: { key: STORAGE_KEY } 
    }));
  };

  const addItem = (item: Omit<WardrobeItem, 'id' | 'createdAt'>) => {
    const newItem: WardrobeItem = {
      ...item,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    saveItems([...items, newItem]);
  };

  const updateItem = (id: string, updates: Partial<WardrobeItem>) => {
    const newItems = items.map(item => 
      item.id === id ? { ...item, ...updates } : item
    );
    saveItems(newItems);
  };

  const deleteItem = (id: string) => {
    saveItems(items.filter(item => item.id !== id));
  };

  return {
    items,
    isLoaded,
    addItem,
    updateItem,
    deleteItem
  };
}
