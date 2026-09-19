'use client';
import React, { useEffect } from 'react';
import { syncOfflineQueue, marketReferenceCache } from '@/lib/offlineQueue';

export default function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Pre-fetch market reference data into IndexedDB on mount
    // This ensures the engine can compute offline (airplane mode)
    marketReferenceCache.prefetch().catch(() => {
      // Silently fail — defaults are already seeded in IndexedDB
    });

    // Sync any pending offline queue items on mount (if online)
    if (navigator.onLine) {
      syncOfflineQueue().catch(() => {});
    }

    // Sync on reconnect
    const handleOnline = () => {
      syncOfflineQueue().catch(() => {});
      // Refresh market reference from Supabase when back online
      marketReferenceCache.prefetch().catch(() => {});
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return <>{children}</>;
}
