import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Trip, Expense, Settlement, TripMember } from '../types';

export interface OutboxItem {
  client_id: string;
  type: 'EXPENSE' | 'SETTLEMENT';
  trip_id: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH';
  payload: any;
  created_at: string;
  status: 'PENDING' | 'SYNCING' | 'FAILED';
  error?: string | null;
  retry_count: number;
}

export interface CachedTripData {
  trip_id: string;
  trip: Trip;
  expenses: Expense[];
  settlements: Settlement[];
  members: TripMember[];
  updated_at: string;
}

interface OnnaGoOfflineDB extends DBSchema {
  outbox: {
    key: string;
    value: OutboxItem;
    indexes: {
      'by_trip': string;
      'by_status': string;
      'by_created': string;
    };
  };
  cached_trips: {
    key: string;
    value: Trip;
  };
  cached_trip_details: {
    key: string;
    value: CachedTripData;
  };
}

const DB_NAME = 'onnago_offline_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<OnnaGoOfflineDB>> | null = null;

export function getOfflineDB(): Promise<IDBPDatabase<OnnaGoOfflineDB>> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB is not supported in this environment.'));
  }
  if (!dbPromise) {
    dbPromise = openDB<OnnaGoOfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // 1. Outbox store
        if (!db.objectStoreNames.contains('outbox')) {
          const outboxStore = db.createObjectStore('outbox', { keyPath: 'client_id' });
          outboxStore.createIndex('by_trip', 'trip_id');
          outboxStore.createIndex('by_status', 'status');
          outboxStore.createIndex('by_created', 'created_at');
        }

        // 2. Cached trips store (active trip list)
        if (!db.objectStoreNames.contains('cached_trips')) {
          db.createObjectStore('cached_trips', { keyPath: 'id' });
        }

        // 3. Cached full trip details (expenses, settlements, members)
        if (!db.objectStoreNames.contains('cached_trip_details')) {
          db.createObjectStore('cached_trip_details', { keyPath: 'trip_id' });
        }
      },
    });
  }
  return dbPromise;
}

// --- Outbox Operations ---

export async function saveOutboxItem(item: OutboxItem): Promise<void> {
  const db = await getOfflineDB();
  await db.put('outbox', item);
}

export async function getOutboxItem(clientId: string): Promise<OutboxItem | undefined> {
  const db = await getOfflineDB();
  return db.get('outbox', clientId);
}

export async function getAllOutboxItems(): Promise<OutboxItem[]> {
  const db = await getOfflineDB();
  return db.getAll('outbox');
}

export async function getPendingOutboxItems(): Promise<OutboxItem[]> {
  const db = await getOfflineDB();
  const all = await db.getAll('outbox');
  return all
    .filter((item) => item.status === 'PENDING' || item.status === 'FAILED')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

export async function getOutboxItemsForTrip(tripId: string): Promise<OutboxItem[]> {
  const db = await getOfflineDB();
  const index = db.transaction('outbox').store.index('by_trip');
  return index.getAll(tripId);
}

export async function removeOutboxItem(clientId: string): Promise<void> {
  const db = await getOfflineDB();
  await db.delete('outbox', clientId);
}

export async function updateOutboxItemStatus(
  clientId: string,
  status: 'PENDING' | 'SYNCING' | 'FAILED',
  error?: string | null
): Promise<void> {
  const db = await getOfflineDB();
  const item = await db.get('outbox', clientId);
  if (item) {
    item.status = status;
    item.error = error !== undefined ? error : item.error;
    if (status === 'FAILED') {
      item.retry_count = (item.retry_count || 0) + 1;
    }
    await db.put('outbox', item);
  }
}

export async function clearSyncedOutbox(): Promise<void> {
  // Can be called to cleanup any stale items if needed
}

// --- Cache Operations ---

export async function cacheTripsList(trips: Trip[]): Promise<void> {
  const db = await getOfflineDB();
  const tx = db.transaction('cached_trips', 'readwrite');
  for (const trip of trips) {
    await tx.store.put(trip);
  }
  await tx.done;
}

export async function getCachedTripsList(): Promise<Trip[]> {
  const db = await getOfflineDB();
  return db.getAll('cached_trips');
}

export async function cacheTripDetails(
  tripId: string,
  trip: Trip,
  expenses: Expense[],
  settlements: Settlement[],
  members: TripMember[]
): Promise<void> {
  const db = await getOfflineDB();
  await db.put('cached_trip_details', {
    trip_id: tripId,
    trip,
    expenses,
    settlements,
    members,
    updated_at: new Date().toISOString(),
  });
}

export async function getCachedTripDetails(tripId: string): Promise<CachedTripData | undefined> {
  const db = await getOfflineDB();
  return db.get('cached_trip_details', tripId);
}
