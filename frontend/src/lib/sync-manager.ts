import { api, ApiError } from './api-client';
import {
  saveOutboxItem,
  getPendingOutboxItems,
  removeOutboxItem,
  updateOutboxItemStatus,
  getAllOutboxItems,
  OutboxItem,
} from './offline-db';
import { Expense, Settlement } from '../types';

export type SyncStatusListener = (state: {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: Date | null;
}) => void;

let isSyncing = false;
let lastSyncedAt: Date | null = null;
const listeners = new Set<SyncStatusListener>();

export function generateClientId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function isDeviceOnline(): boolean {
  if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
    return navigator.onLine;
  }
  return true;
}

export function subscribeToSyncStatus(listener: SyncStatusListener): () => void {
  listeners.add(listener);
  // Emit initial state
  notifyListeners();
  return () => {
    listeners.delete(listener);
  };
}

async function notifyListeners() {
  let pendingCount = 0;
  try {
    const pending = await getPendingOutboxItems();
    pendingCount = pending.length;
  } catch {
    // IndexedDB not ready or error
  }

  const state = {
    isOnline: isDeviceOnline(),
    isSyncing,
    pendingCount,
    lastSyncedAt,
  };

  listeners.forEach((listener) => {
    try {
      listener(state);
    } catch (err) {
      console.error('Error notifying sync listener:', err);
    }
  });
}

/**
 * Queue an expense creation in the offline outbox and attempt immediate sync if online.
 */
export async function queueExpenseCreation(
  tripId: string,
  expenseInput: any,
  payerName: string = 'You'
): Promise<Expense> {
  const clientId = expenseInput.client_id || generateClientId();
  const payload = {
    ...expenseInput,
    client_id: clientId,
  };

  const outboxItem: OutboxItem = {
    client_id: clientId,
    type: 'EXPENSE',
    trip_id: tripId,
    endpoint: '/expenses/',
    method: 'POST',
    payload,
    created_at: new Date().toISOString(),
    status: 'PENDING',
    retry_count: 0,
  };

  await saveOutboxItem(outboxItem);
  notifyListeners();

  // Optimistic Expense representation
  const optimisticExpense: Expense = {
    id: clientId, // temporary local id
    trip_id: tripId,
    payer_id: payload.payer_id,
    payer_name: payerName,
    description: payload.description,
    amount_paise: payload.amount_paise,
    currency: payload.currency || 'INR',
    category: payload.category || 'Other',
    split_method: payload.split_method || 'EQUAL',
    date: payload.date || new Date().toISOString(),
    notes: payload.notes || null,
    is_void: false,
    client_id: clientId,
    is_pending_sync: true,
    created_by_id: payload.payer_id,
    created_at: new Date().toISOString(),
    splits: (payload.splits || []).map((s: any) => ({
      id: generateClientId(),
      user_id: s.user_id,
      user_name: s.user_name || 'Member',
      user_email: '',
      amount_paise: s.amount_paise || 0,
      percentage: s.percentage || null,
      shares: s.shares || null,
    })),
  };

  // If online, trigger background sync
  if (isDeviceOnline()) {
    syncOutbox().catch(console.error);
  }

  return optimisticExpense;
}

/**
 * Queue a settlement creation in the offline outbox and attempt immediate sync if online.
 */
export async function queueSettlementCreation(
  tripId: string,
  settlementInput: any,
  payerName: string = 'You',
  payeeName: string = 'Member'
): Promise<Settlement> {
  const clientId = settlementInput.client_id || generateClientId();
  const payload = {
    ...settlementInput,
    client_id: clientId,
  };

  const outboxItem: OutboxItem = {
    client_id: clientId,
    type: 'SETTLEMENT',
    trip_id: tripId,
    endpoint: '/settlements/',
    method: 'POST',
    payload,
    created_at: new Date().toISOString(),
    status: 'PENDING',
    retry_count: 0,
  };

  await saveOutboxItem(outboxItem);
  notifyListeners();

  // Optimistic Settlement representation
  const optimisticSettlement: Settlement = {
    id: clientId,
    trip_id: tripId,
    payer_id: payload.payer_id,
    payer_name: payerName,
    payee_id: payload.payee_id,
    payee_name: payeeName,
    amount_paise: payload.amount_paise,
    status: 'PENDING_CONFIRMATION',
    payment_method: payload.payment_method || 'CASH',
    reference_id: payload.reference_id || null,
    notes: payload.notes || null,
    client_id: clientId,
    is_pending_sync: true,
    created_by_id: payload.payer_id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (isDeviceOnline()) {
    syncOutbox().catch(console.error);
  }

  return optimisticSettlement;
}

/**
 * Sync all pending outbox items sequentially.
 */
export async function syncOutbox(): Promise<{ synced: number; failed: number }> {
  if (isSyncing || !isDeviceOnline()) {
    return { synced: 0, failed: 0 };
  }

  isSyncing = true;
  notifyListeners();

  let synced = 0;
  let failed = 0;

  try {
    const pendingItems = await getPendingOutboxItems();
    if (pendingItems.length === 0) {
      isSyncing = false;
      notifyListeners();
      return { synced: 0, failed: 0 };
    }

    for (const item of pendingItems) {
      // Re-verify network before each sync item
      if (!isDeviceOnline()) {
        break;
      }

      await updateOutboxItemStatus(item.client_id, 'SYNCING');

      try {
        let response: any;
        if (item.method === 'POST') {
          response = await api.post(item.endpoint, item.payload);
        } else if (item.method === 'PUT') {
          response = await api.put(item.endpoint, item.payload);
        } else if (item.method === 'PATCH') {
          response = await api.patch(item.endpoint, item.payload);
        }

        // Successfully synced (or returned idempotent response)
        await removeOutboxItem(item.client_id);
        synced++;
        lastSyncedAt = new Date();

        // Dispatch browser custom event so active pages can refresh data
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('onnago:item-synced', {
              detail: {
                type: item.type,
                trip_id: item.trip_id,
                client_id: item.client_id,
                response,
              },
            })
          );
        }
      } catch (err: any) {
        if (err instanceof ApiError) {
          // If 400 or 422, it's a validation error that won't resolve by retrying without edits
          if (err.status >= 400 && err.status < 500 && err.status !== 408) {
            await updateOutboxItemStatus(item.client_id, 'FAILED', err.message);
            failed++;
            continue;
          }
        }
        // Network error (e.g. offline, timeout, server 5xx)
        // Reset status to PENDING and stop batch so we don't spam a failing network
        await updateOutboxItemStatus(item.client_id, 'PENDING');
        failed++;
        break;
      }
    }
  } finally {
    isSyncing = false;
    notifyListeners();
  }

  return { synced, failed };
}

// Automatically listen for network reconnect and visibility change
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    notifyListeners();
    syncOutbox().catch(console.error);
  });

  window.addEventListener('offline', () => {
    notifyListeners();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isDeviceOnline()) {
      syncOutbox().catch(console.error);
    }
  });
}
