import { api, ApiError } from './api-client';
import {
  saveOutboxItem,
  getPendingOutboxItems,
  removeOutboxItem,
  updateOutboxItemStatus,
  getAllOutboxItems,
  getFailedOutboxItems,
  getOutboxItem,
  updateCachedExpense,
  voidCachedExpense,
  deleteCachedExpense,
  OutboxItem,
} from './offline-db';
import { Expense, Settlement } from '../types';

export type PauseReason = 'AUTH_REQUIRED' | null;

export interface SyncStatusState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  isPaused: boolean;
  pauseReason: PauseReason;
  lastSyncedAt: Date | null;
}

export type SyncStatusListener = (state: SyncStatusState) => void;

let isSyncing = false;
let isSyncPaused = false;
let pauseReason: PauseReason = null;
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

export function getSyncQueueState(): {
  isSyncing: boolean;
  isPaused: boolean;
  pauseReason: PauseReason;
  lastSyncedAt: Date | null;
} {
  return {
    isSyncing,
    isPaused: isSyncPaused,
    pauseReason,
    lastSyncedAt,
  };
}

export function resumeSyncQueue(): void {
  isSyncPaused = false;
  pauseReason = null;
  notifyListeners();
  if (isDeviceOnline()) {
    syncOutbox().catch(console.error);
  }
}

export function resetSyncState(): void {
  isSyncing = false;
  isSyncPaused = false;
  pauseReason = null;
  lastSyncedAt = null;
  notifyListeners();
}

export function subscribeToSyncStatus(listener: SyncStatusListener): () => void {
  listeners.add(listener);
  // Emit initial state
  notifyListeners();
  return () => {
    listeners.delete(listener);
  };
}

export async function notifyListeners() {
  let pendingCount = 0;
  let failedCount = 0;
  try {
    const pending = await getPendingOutboxItems();
    pendingCount = pending.length;
    const failed = await getFailedOutboxItems();
    failedCount = failed.length;
  } catch {
    // IndexedDB not ready or errored
  }

  const state: SyncStatusState = {
    isOnline: isDeviceOnline(),
    isSyncing,
    pendingCount,
    failedCount,
    isPaused: isSyncPaused,
    pauseReason,
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
    id: clientId,
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

  // Cache optimistically
  await updateCachedExpense(tripId, optimisticExpense);

  if (isDeviceOnline() && !isSyncPaused) {
    syncOutbox().catch(console.error);
  }

  return optimisticExpense;
}

/**
 * Queue an expense edit/update in the offline outbox and update local cache.
 */
export async function queueExpenseUpdate(
  tripId: string,
  expenseId: string,
  updateInput: any,
  existingExpense: Expense
): Promise<Expense> {
  const updatedExpense: Expense = {
    ...existingExpense,
    description: updateInput.description ?? existingExpense.description,
    amount_paise: updateInput.amount_paise ?? existingExpense.amount_paise,
    category: updateInput.category ?? existingExpense.category,
    payer_id: updateInput.payer_id ?? existingExpense.payer_id,
    date: updateInput.date ?? existingExpense.date,
    notes: updateInput.notes !== undefined ? updateInput.notes : existingExpense.notes,
    split_method: updateInput.split_method ?? existingExpense.split_method,
    splits: updateInput.splits
      ? updateInput.splits.map((s: any) => ({
          id: s.id || generateClientId(),
          user_id: s.user_id,
          user_name: s.user_name || 'Member',
          user_email: '',
          amount_paise: s.amount_paise || 0,
          percentage: s.percentage || null,
          shares: s.shares || null,
        }))
      : existingExpense.splits,
    is_pending_sync: true,
  };

  // 1. If this expense is already a pending outbox item that hasn't synced yet, update its creation payload directly
  const pendingOutbox = await getOutboxItem(expenseId);
  if (pendingOutbox && pendingOutbox.type === 'EXPENSE') {
    pendingOutbox.payload = {
      ...pendingOutbox.payload,
      ...updateInput,
    };
    pendingOutbox.status = 'PENDING';
    pendingOutbox.error = null;
    await saveOutboxItem(pendingOutbox);
  } else {
    // 2. Otherwise create a PUT update outbox item
    const updateClientId = generateClientId();
    const outboxItem: OutboxItem = {
      client_id: updateClientId,
      type: 'EXPENSE_UPDATE',
      trip_id: tripId,
      endpoint: `/expenses/${expenseId}`,
      method: 'PUT',
      payload: updateInput,
      created_at: new Date().toISOString(),
      status: 'PENDING',
      retry_count: 0,
    };
    await saveOutboxItem(outboxItem);
  }

  await updateCachedExpense(tripId, updatedExpense);
  notifyListeners();

  if (isDeviceOnline() && !isSyncPaused) {
    syncOutbox().catch(console.error);
  }

  return updatedExpense;
}

/**
 * Queue an expense void/delete in the offline outbox and update local cache.
 */
export async function queueExpenseDelete(
  tripId: string,
  expenseId: string
): Promise<void> {
  // 1. If this expense was created offline and never synced, simply delete it locally
  const pendingOutbox = await getOutboxItem(expenseId);
  if (pendingOutbox && pendingOutbox.type === 'EXPENSE') {
    await removeOutboxItem(expenseId);
    await deleteCachedExpense(tripId, expenseId);
    notifyListeners();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('onnago:item-deleted', { detail: { trip_id: tripId, expense_id: expenseId } })
      );
    }
    return;
  }

  // 2. Otherwise queue a DELETE request for server sync and mark void locally
  const deleteClientId = generateClientId();
  const outboxItem: OutboxItem = {
    client_id: deleteClientId,
    type: 'EXPENSE_DELETE',
    trip_id: tripId,
    endpoint: `/expenses/${expenseId}`,
    method: 'DELETE',
    payload: { expense_id: expenseId },
    created_at: new Date().toISOString(),
    status: 'PENDING',
    retry_count: 0,
  };

  await saveOutboxItem(outboxItem);
  await voidCachedExpense(tripId, expenseId);
  notifyListeners();

  if (isDeviceOnline() && !isSyncPaused) {
    syncOutbox().catch(console.error);
  }
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

  if (isDeviceOnline() && !isSyncPaused) {
    syncOutbox().catch(console.error);
  }

  return optimisticSettlement;
}

/**
 * Retry an outbox item that previously failed.
 */
export async function retryOutboxItem(clientId: string, autoSync = true): Promise<void> {
  const item = await getOutboxItem(clientId);
  if (item) {
    item.status = 'PENDING';
    item.error = null;
    item.retry_count = 0;
    item.next_retry_at = null;
    await saveOutboxItem(item);
    notifyListeners();
    if (autoSync && isDeviceOnline() && !isSyncPaused) {
      syncOutbox().catch(console.error);
    }
  }
}

/**
 * Discard an outbox item that failed or cannot be synced.
 */
export async function discardOutboxItem(clientId: string): Promise<void> {
  const item = await getOutboxItem(clientId);
  if (item) {
    await removeOutboxItem(clientId);
    // If it was an optimistic expense or settlement, clean from local cached details
    if (item.type === 'EXPENSE') {
      await deleteCachedExpense(item.trip_id, clientId);
    }
    notifyListeners();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('onnago:item-discarded', {
          detail: { client_id: clientId, trip_id: item.trip_id, type: item.type },
        })
      );
    }
  }
}

/**
 * Sync all pending outbox items sequentially.
 * - 401: Pauses the queue, keeps all items intact, and triggers auth request.
 * - Network errors & 5xx: Retries with exponential backoff.
 * - Other 4xx: Moves item to "Couldn't sync" (FAILED status) with Retry and Discard.
 */
export async function syncOutbox(): Promise<{ synced: number; failed: number }> {
  if (isSyncing || !isDeviceOnline() || isSyncPaused) {
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

    const now = Date.now();

    for (const item of pendingItems) {
      // Re-verify network & pause status before each sync item
      if (!isDeviceOnline() || isSyncPaused) {
        break;
      }

      // If backoff hasn't elapsed, skip this item for now
      if (item.next_retry_at && new Date(item.next_retry_at).getTime() > now) {
        continue;
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
        } else if (item.method === 'DELETE') {
          response = await api.delete(item.endpoint);
        }

        // Successfully synced
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
          // 1. 401 Unauthorized: Pause queue, keep all items, ask to log in again
          if (err.status === 401) {
            isSyncPaused = true;
            pauseReason = 'AUTH_REQUIRED';
            // Reset status to PENDING so it is kept in outbox
            await updateOutboxItemStatus(item.client_id, 'PENDING');
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('onnago:auth-required', {
                  detail: { reason: '401 Unauthorized during sync' },
                })
              );
            }
            break; // Stop sync queue immediately
          }

          // 2. 5xx Server Error: Retry with backoff
          if (err.status >= 500) {
            const existing = await getOutboxItem(item.client_id);
            if (existing) {
              const retryCount = (existing.retry_count || 0) + 1;
              const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 60000);
              existing.status = 'PENDING';
              existing.retry_count = retryCount;
              existing.next_retry_at = new Date(Date.now() + backoffMs).toISOString();
              existing.error = err.message || 'Server error';
              await saveOutboxItem(existing);
            }
            failed++;
            break; // Break loop to avoid hammering failing server
          }

          // 3. Other 4xx Client Errors (400, 403, 404, 422, etc.): Move to "Couldn't sync" (FAILED)
          if (err.status >= 400 && err.status < 500 && err.status !== 408) {
            await updateOutboxItemStatus(item.client_id, 'FAILED', err.message);
            failed++;
            continue; // Continue processing other items in outbox
          }
        }

        // 4. Network error (TypeError / fetch failed / timeout): Retry with backoff
        const existing = await getOutboxItem(item.client_id);
        if (existing) {
          const retryCount = (existing.retry_count || 0) + 1;
          const backoffMs = Math.min(1000 * Math.pow(2, retryCount), 60000);
          existing.status = 'PENDING';
          existing.retry_count = retryCount;
          existing.next_retry_at = new Date(Date.now() + backoffMs).toISOString();
          existing.error = err?.message || 'Network connection failed';
          await saveOutboxItem(existing);
        }
        failed++;
        break; // Stop current batch
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
    if (!isSyncPaused) {
      syncOutbox().catch(console.error);
    }
  });

  window.addEventListener('offline', () => {
    notifyListeners();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isDeviceOnline() && !isSyncPaused) {
      syncOutbox().catch(console.error);
    }
  });
}
