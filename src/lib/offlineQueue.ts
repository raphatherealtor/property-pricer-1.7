// Phase 4: IndexedDB offline queue for core_intake and computed_outputs
// Syncs to Supabase on reconnect
// Also pre-fetches market_reference (ZIP medians, UII) for offline engine computation
import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'property-pricer-offline';
const DB_VERSION = 2; // bumped to add market_reference prefetch

interface OfflineQueueItem {
  id?: number;
  table: 'core_intake' | 'computed_outputs';
  data: Record<string, unknown>;
  createdAt: string;
  synced: boolean;
}

export interface MarketReferenceItem {
  zip: string;
  medianDom: number;
  uiiMonths: number;
  updatedAt: string;
}

// Default market reference data for common ZIPs — pre-seeded for offline use
const DEFAULT_MARKET_REFERENCE: MarketReferenceItem[] = [
  { zip: '10001', medianDom: 32, uiiMonths: 3.2, updatedAt: new Date().toISOString() },
  { zip: '90210', medianDom: 28, uiiMonths: 2.8, updatedAt: new Date().toISOString() },
  { zip: '60601', medianDom: 45, uiiMonths: 5.1, updatedAt: new Date().toISOString() },
  { zip: '77001', medianDom: 52, uiiMonths: 4.4, updatedAt: new Date().toISOString() },
  { zip: '92373', medianDom: 40, uiiMonths: 4.8, updatedAt: new Date().toISOString() },
  { zip: '85001', medianDom: 35, uiiMonths: 3.8, updatedAt: new Date().toISOString() },
  { zip: '30301', medianDom: 38, uiiMonths: 4.2, updatedAt: new Date().toISOString() },
  { zip: '98101', medianDom: 22, uiiMonths: 2.4, updatedAt: new Date().toISOString() },
  { zip: '02101', medianDom: 30, uiiMonths: 3.0, updatedAt: new Date().toISOString() },
  { zip: '33101', medianDom: 48, uiiMonths: 5.5, updatedAt: new Date().toISOString() },
];

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // Offline queue store
        if (!db.objectStoreNames.contains('offline_queue')) {
          const store = db.createObjectStore('offline_queue', { keyPath: 'id', autoIncrement: true });
          store.createIndex('synced', 'synced');
          store.createIndex('table', 'table');
        }
        // Market reference cache (ZIP medians + UII for offline engine computation)
        if (!db.objectStoreNames.contains('market_reference')) {
          db.createObjectStore('market_reference', { keyPath: 'zip' });
        }
      },
    });
  }
  return dbPromise;
}

export const offlineQueue = {
  async enqueue(table: 'core_intake' | 'computed_outputs', data: Record<string, unknown>): Promise<void> {
    const db = await getDb();
    await db.add('offline_queue', {
      table,
      data,
      createdAt: new Date().toISOString(),
      synced: false,
    } as OfflineQueueItem);
  },

  async getPending(): Promise<OfflineQueueItem[]> {
    const db = await getDb();
    const all = await db.getAll('offline_queue');
    return all.filter((item: OfflineQueueItem) => !item.synced);
  },

  async markSynced(id: number): Promise<void> {
    const db = await getDb();
    const item = await db.get('offline_queue', id);
    if (item) {
      item.synced = true;
      await db.put('offline_queue', item);
    }
  },

  async clearSynced(): Promise<void> {
    const db = await getDb();
    const tx = db.transaction('offline_queue', 'readwrite');
    const store = tx.objectStore('offline_queue');
    const all = await store.getAll();
    for (const item of all) {
      if (item.synced && item.id) {
        await store.delete(item.id);
      }
    }
    await tx.done;
  },
};

export const marketReferenceCache = {
  async get(zip: string): Promise<MarketReferenceItem | undefined> {
    const db = await getDb();
    return db.get('market_reference', zip);
  },

  async set(item: MarketReferenceItem): Promise<void> {
    const db = await getDb();
    await db.put('market_reference', item);
  },

  /**
   * Pre-fetch market_reference data into IndexedDB.
   * First tries Supabase (if online), then falls back to DEFAULT_MARKET_REFERENCE.
   * This ensures the engine can compute offline — airplane mode, load app, pull up a ZIP, move the slider.
   */
  async prefetch(zips?: string[]): Promise<void> {
    const db = await getDb();

    // Always seed defaults first (instant, no network)
    for (const item of DEFAULT_MARKET_REFERENCE) {
      const existing = await db.get('market_reference', item.zip);
      if (!existing) {
        await db.put('market_reference', item);
      }
    }

    // If specific ZIPs requested, ensure they have entries
    if (zips) {
      for (const zip of zips) {
        const existing = await db.get('market_reference', zip);
        if (!existing) {
          await db.put('market_reference', {
            zip,
            medianDom: 40,
            uiiMonths: 4.8,
            updatedAt: new Date().toISOString(),
          } as MarketReferenceItem);
        }
      }
    }

    // Try to refresh from Supabase if online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data, error } = await supabase
          .from('market_reference')
          .select('zip, median_dom, uii_months, updated_at')
          .limit(500);

        if (!error && data && data.length > 0) {
          for (const row of data) {
            await db.put('market_reference', {
              zip: row.zip,
              medianDom: row.median_dom,
              uiiMonths: row.uii_months,
              updatedAt: row.updated_at,
            } as MarketReferenceItem);
          }
        }
      } catch {
        // Supabase unavailable — defaults already seeded, engine will work offline
      }
    }
  },

  /**
   * Get market data for a ZIP, falling back to defaults.
   * Safe to call offline — will always return a value.
   */
  async getOrDefault(zip: string): Promise<MarketReferenceItem> {
    const cached = await marketReferenceCache.get(zip);
    if (cached) return cached;

    // Return sensible national defaults
    return {
      zip,
      medianDom: 40,
      uiiMonths: 4.8,
      updatedAt: new Date().toISOString(),
    };
  },
};

// Sync pending queue items to Supabase when online
export async function syncOfflineQueue(): Promise<{ synced: number; failed: number }> {
  const pending = await offlineQueue.getPending();
  if (pending.length === 0) return { synced: 0, failed: 0 };

  const { createClient } = await import('@/lib/supabase/client');
  const supabase = createClient();

  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      const { error } = await supabase.from(item.table).insert(item.data);
      if (error) {
        console.error(`Offline sync error for ${item.table}:`, error.message);
        failed++;
      } else {
        if (item.id) await offlineQueue.markSynced(item.id);
        synced++;
      }
    } catch {
      failed++;
    }
  }

  if (synced > 0) {
    await offlineQueue.clearSynced();
  }

  return { synced, failed };
}
