// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getOfflineDB,
  saveOutboxItem,
  getPendingOutboxItems,
  getFailedOutboxItems,
  getAllOutboxItems,
  cacheTripsList,
  getCachedTripsList,
  cacheTripDetails,
  getCachedTripDetails,
  clearAllOfflineData,
  OutboxItem,
} from '../lib/offline-db';
import {
  queueExpenseCreation,
  queueExpenseUpdate,
  queueExpenseDelete,
  syncOutbox,
  retryOutboxItem,
  discardOutboxItem,
  getSyncQueueState,
  resumeSyncQueue,
  resetSyncState,
} from '../lib/sync-manager';
import { calculateLocalBalances } from '../lib/balance-calculator';
import { api, ApiError } from '../lib/api-client';
import { TripMember, Expense, Settlement } from '../types';

describe('Phase 3 Gap 1: Clear IndexedDB stores and runtime caches on logout/account switch', () => {
  beforeEach(async () => {
    await clearAllOfflineData();
    resetSyncState();
    vi.restoreAllMocks();
  });

  it('completely wipes outbox, cached_trips, and cached_trip_details on clearAllOfflineData()', async () => {
    // 1. Seed outbox
    const dummyOutbox: OutboxItem = {
      client_id: 'outbox-1',
      type: 'EXPENSE',
      trip_id: 'trip-1',
      endpoint: '/expenses/',
      method: 'POST',
      payload: { description: 'Snacks', amount_paise: 2000 },
      created_at: new Date().toISOString(),
      status: 'PENDING',
      retry_count: 0,
    };
    await saveOutboxItem(dummyOutbox);

    // 2. Seed cached trips
    await cacheTripsList([
      { id: 'trip-1', name: 'Goa Holiday', currency: 'INR' } as any,
    ]);

    // 3. Seed cached trip details
    await cacheTripDetails(
      'trip-1',
      { id: 'trip-1', name: 'Goa Holiday', currency: 'INR' } as any,
      [{ id: 'exp-1', description: 'Petrol', amount_paise: 5000 } as any],
      [],
      [{ user_id: 'u-1', user_name: 'Alex' } as any]
    );

    // Verify stores are populated
    expect((await getAllOutboxItems()).length).toBe(1);
    expect((await getCachedTripsList()).length).toBe(1);
    expect(await getCachedTripDetails('trip-1')).toBeDefined();

    // 4. Perform clearAllOfflineData (invoked on logout / account switch)
    await clearAllOfflineData();
    resetSyncState();

    // Verify all stores are completely empty
    expect((await getAllOutboxItems()).length).toBe(0);
    expect((await getCachedTripsList()).length).toBe(0);
    expect(await getCachedTripDetails('trip-1')).toBeUndefined();

    // Verify runtime sync queue state is reset
    const syncState = getSyncQueueState();
    expect(syncState.isSyncing).toBe(false);
    expect(syncState.isPaused).toBe(false);
    expect(syncState.pauseReason).toBeNull();
  });
});

describe('Phase 3 Gap 2: Sync error handling (401 pause, 5xx backoff, 4xx failed list with retry/discard)', () => {
  beforeEach(async () => {
    await clearAllOfflineData();
    resetSyncState();
    vi.restoreAllMocks();
  });

  it('pauses queue and keeps all items on 401 Unauthorized', async () => {
    const item: OutboxItem = {
      client_id: 'auth-item-1',
      type: 'EXPENSE',
      trip_id: 'trip-1',
      endpoint: '/expenses/',
      method: 'POST',
      payload: { description: 'Lunch', amount_paise: 4000 },
      created_at: new Date().toISOString(),
      status: 'PENDING',
      retry_count: 0,
    };
    await saveOutboxItem(item);

    let authRequiredFired = false;
    const authListener = () => {
      authRequiredFired = true;
    };
    window.addEventListener('onnago:auth-required', authListener);

    // Mock API 401
    vi.spyOn(api, 'post').mockRejectedValueOnce(new ApiError(401, 'Token expired'));

    const res = await syncOutbox();

    expect(res.synced).toBe(0);
    expect(authRequiredFired).toBe(true);

    const syncState = getSyncQueueState();
    expect(syncState.isPaused).toBe(true);
    expect(syncState.pauseReason).toBe('AUTH_REQUIRED');

    // Crucial requirement: items must be KEPT in outbox (not discarded or lost)
    const pending = await getPendingOutboxItems();
    expect(pending.length).toBe(1);
    expect(pending[0].client_id).toBe('auth-item-1');
    expect(pending[0].status).toBe('PENDING');

    window.removeEventListener('onnago:auth-required', authListener);
  });

  it('retries with exponential backoff on 5xx server error', async () => {
    const item: OutboxItem = {
      client_id: 'server-err-item',
      type: 'EXPENSE',
      trip_id: 'trip-1',
      endpoint: '/expenses/',
      method: 'POST',
      payload: { description: 'Dinner', amount_paise: 9000 },
      created_at: new Date().toISOString(),
      status: 'PENDING',
      retry_count: 0,
    };
    await saveOutboxItem(item);

    // Mock 500 internal server error
    vi.spyOn(api, 'post').mockRejectedValueOnce(new ApiError(500, 'Internal Server Error'));

    const res = await syncOutbox();
    expect(res.synced).toBe(0);
    expect(res.failed).toBe(1);

    const pending = await getPendingOutboxItems();
    expect(pending.length).toBe(1);
    expect(pending[0].status).toBe('PENDING');
    expect(pending[0].retry_count).toBe(1);
    expect(pending[0].next_retry_at).toBeDefined();

    // Verify next_retry_at is in the future
    const retryTime = new Date(pending[0].next_retry_at!).getTime();
    expect(retryTime).toBeGreaterThan(Date.now() - 100);
  });

  it('moves non-401 4xx errors to FAILED status and allows Retry and Discard', async () => {
    const item: OutboxItem = {
      client_id: 'bad-request-item',
      type: 'EXPENSE',
      trip_id: 'trip-1',
      endpoint: '/expenses/',
      method: 'POST',
      payload: { description: 'Invalid', amount_paise: 0 },
      created_at: new Date().toISOString(),
      status: 'PENDING',
      retry_count: 0,
    };
    await saveOutboxItem(item);

    // Mock 422 Unprocessable Entity
    vi.spyOn(api, 'post').mockRejectedValueOnce(new ApiError(422, 'Amount must be greater than 0'));

    const res = await syncOutbox();
    expect(res.synced).toBe(0);
    expect(res.failed).toBe(1);

    // Should be in failed outbox items
    const failedList = await getFailedOutboxItems();
    expect(failedList.length).toBe(1);
    expect(failedList[0].status).toBe('FAILED');
    expect(failedList[0].error).toBe('Amount must be greater than 0');

    // Test Retry: Resets status to PENDING without triggering auto-sync
    await retryOutboxItem('bad-request-item', false);
    const retried = await getAllOutboxItems();
    expect(retried[0].status).toBe('PENDING');
    expect(retried[0].error).toBeNull();

    // Test Discard: Permanently removes item
    await discardOutboxItem('bad-request-item');
    const remaining = await getAllOutboxItems();
    expect(remaining.length).toBe(0);
  });
});

describe('Phase 3 Gap 3: Update balances locally while offline, including pending items', () => {
  it('accurately computes member balances and settlement suggestions offline with pending items', () => {
    const members: TripMember[] = [
      { id: 'm1', trip_id: 'trip-1', user_id: 'user-a', user_name: 'Alice', user_email: 'a@test.com', role: 'OWNER', joined_at: '' },
      { id: 'm2', trip_id: 'trip-1', user_id: 'user-b', user_name: 'Bob', user_email: 'b@test.com', role: 'MEMBER', joined_at: '' },
    ];

    // Expense 1: Synced expense paid by Alice (10000 paise), split equally (5000 each)
    const syncedExpense: Expense = {
      id: 'server-exp-1',
      trip_id: 'trip-1',
      payer_id: 'user-a',
      payer_name: 'Alice',
      description: 'Groceries',
      amount_paise: 10000,
      currency: 'INR',
      category: 'Food',
      split_method: 'EQUAL',
      date: new Date().toISOString(),
      notes: null,
      is_void: false,
      created_by_id: 'user-a',
      created_at: new Date().toISOString(),
      splits: [
        { id: 's1', user_id: 'user-a', user_name: 'Alice', user_email: '', amount_paise: 5000 },
        { id: 's2', user_id: 'user-b', user_name: 'Bob', user_email: '', amount_paise: 5000 },
      ],
    };

    // Expense 2: Offline pending outbox expense paid by Bob (6000 paise), split equally (3000 each)
    const pendingExpense: Expense = {
      id: 'client-uuid-exp-2',
      trip_id: 'trip-1',
      payer_id: 'user-b',
      payer_name: 'Bob',
      description: 'Cab fare',
      amount_paise: 6000,
      currency: 'INR',
      category: 'Transport',
      split_method: 'EQUAL',
      date: new Date().toISOString(),
      notes: null,
      is_void: false,
      is_pending_sync: true,
      created_by_id: 'user-b',
      created_at: new Date().toISOString(),
      splits: [
        { id: 's3', user_id: 'user-a', user_name: 'Alice', user_email: '', amount_paise: 3000 },
        { id: 's4', user_id: 'user-b', user_name: 'Bob', user_email: '', amount_paise: 3000 },
      ],
    };

    const result = calculateLocalBalances('trip-1', members, [syncedExpense, pendingExpense], []);

    // Total trip spending: 10000 + 6000 = 16000 paise (₹160.00)
    expect(result.balances.total_expenses_paise).toBe(16000);

    const aliceBalance = result.balances.balances.find((b) => b.user_id === 'user-a');
    const bobBalance = result.balances.balances.find((b) => b.user_id === 'user-b');

    // Alice: paid 10000, consumed 5000 + 3000 = 8000 -> Net +2000 paise (owed ₹20.00)
    expect(aliceBalance?.net_balance_paise).toBe(2000);
    expect(aliceBalance?.status).toBe('IS_OWED');

    // Bob: paid 6000, consumed 5000 + 3000 = 8000 -> Net -2000 paise (owes ₹20.00)
    expect(bobBalance?.net_balance_paise).toBe(-2000);
    expect(bobBalance?.status).toBe('OWES');

    // Suggested settlement: Bob pays Alice 2000 paise
    expect(result.suggestions.length).toBe(1);
    expect(result.suggestions[0].from_user_id).toBe('user-b');
    expect(result.suggestions[0].to_user_id).toBe('user-a');
    expect(result.suggestions[0].amount_paise).toBe(2000);
  });
});

describe('Phase 3 Gap 4: Edit and delete expenses offline', () => {
  beforeEach(async () => {
    await clearAllOfflineData();
    resetSyncState();
    vi.restoreAllMocks();
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  });

  it('queues expense edit offline, updating pending outbox payload and cached details', async () => {
    // 1. Create an expense offline
    const created = await queueExpenseCreation('trip-xyz', {
      description: 'Breakfast',
      amount_paise: 3000,
      payer_id: 'user-1',
    });

    expect(created.amount_paise).toBe(3000);

    // 2. Edit the expense while offline
    const updated = await queueExpenseUpdate(
      'trip-xyz',
      created.id,
      { description: 'Breakfast with juice', amount_paise: 4500 },
      created
    );

    expect(updated.description).toBe('Breakfast with juice');
    expect(updated.amount_paise).toBe(4500);

    // Verify outbox has the updated payload
    const pending = await getPendingOutboxItems();
    expect(pending.length).toBe(1);
    expect(pending[0].payload.description).toBe('Breakfast with juice');
    expect(pending[0].payload.amount_paise).toBe(4500);
  });

  it('queues expense delete/void offline', async () => {
    // 1. Create offline expense
    const created = await queueExpenseCreation('trip-xyz', {
      description: 'Snack',
      amount_paise: 1500,
      payer_id: 'user-1',
    });

    // 2. Delete the offline expense before it syncs
    await queueExpenseDelete('trip-xyz', created.id);

    // Outbox should be completely clean because it never left the device
    const pending = await getPendingOutboxItems();
    expect(pending.length).toBe(0);

    // 3. For an existing server expense, queue a DELETE request
    await queueExpenseDelete('trip-xyz', 'server-exp-888');
    const deletePending = await getPendingOutboxItems();
    expect(deletePending.length).toBe(1);
    expect(deletePending[0].type).toBe('EXPENSE_DELETE');
    expect(deletePending[0].method).toBe('DELETE');
    expect(deletePending[0].endpoint).toBe('/expenses/server-exp-888');
  });
});
