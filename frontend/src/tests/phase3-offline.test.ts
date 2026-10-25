// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getOfflineDB,
  saveOutboxItem,
  getPendingOutboxItems,
  getOutboxItemsForTrip,
  removeOutboxItem,
  updateOutboxItemStatus,
  cacheTripsList,
  getCachedTripsList,
  cacheTripDetails,
  getCachedTripDetails,
  OutboxItem,
} from '../lib/offline-db';
import {
  generateClientId,
  isDeviceOnline,
  queueExpenseCreation,
  queueSettlementCreation,
  syncOutbox,
} from '../lib/sync-manager';
import { api } from '../lib/api-client';

describe('Phase 3: Client ID & Offline Utilities', () => {
  it('generates a valid UUID v4 format client_id', () => {
    const id1 = generateClientId();
    const id2 = generateClientId();
    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    expect(id1).not.toBe(id2);
    // UUID v4 regex format (8-4-4-4-12)
    expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('correctly reports online/offline device status', () => {
    expect(typeof isDeviceOnline()).toBe('boolean');
  });
});

describe('Phase 3: IndexedDB Store (offline-db.ts)', () => {
  beforeEach(async () => {
    // Clear outbox and cache stores
    const db = await getOfflineDB();
    await db.clear('outbox');
    await db.clear('cached_trips');
    await db.clear('cached_trip_details');
  });

  it('saves, queries, and filters outbox items', async () => {
    const testItem: OutboxItem = {
      client_id: 'test-uuid-1',
      type: 'EXPENSE',
      trip_id: 'trip-101',
      endpoint: '/expenses/',
      method: 'POST',
      payload: { description: 'Dinner', amount_paise: 50000 },
      created_at: new Date().toISOString(),
      status: 'PENDING',
      retry_count: 0,
    };

    await saveOutboxItem(testItem);

    const pending = await getPendingOutboxItems();
    expect(pending.length).toBe(1);
    expect(pending[0].client_id).toBe('test-uuid-1');

    const tripItems = await getOutboxItemsForTrip('trip-101');
    expect(tripItems.length).toBe(1);
    expect(tripItems[0].client_id).toBe('test-uuid-1');

    const otherTripItems = await getOutboxItemsForTrip('trip-999');
    expect(otherTripItems.length).toBe(0);
  });

  it('updates outbox item status and failure details', async () => {
    const testItem: OutboxItem = {
      client_id: 'test-uuid-2',
      type: 'SETTLEMENT',
      trip_id: 'trip-102',
      endpoint: '/settlements/',
      method: 'POST',
      payload: { amount_paise: 25000 },
      created_at: new Date().toISOString(),
      status: 'PENDING',
      retry_count: 0,
    };

    await saveOutboxItem(testItem);
    await updateOutboxItemStatus('test-uuid-2', 'FAILED', 'Invalid member');

    const pending = await getPendingOutboxItems();
    expect(pending.length).toBe(1);
    expect(pending[0].status).toBe('FAILED');
    expect(pending[0].error).toBe('Invalid member');
    expect(pending[0].retry_count).toBe(1);
  });

  it('removes item from outbox upon successful sync', async () => {
    const testItem: OutboxItem = {
      client_id: 'test-uuid-3',
      type: 'EXPENSE',
      trip_id: 'trip-103',
      endpoint: '/expenses/',
      method: 'POST',
      payload: { description: 'Fuel', amount_paise: 120000 },
      created_at: new Date().toISOString(),
      status: 'PENDING',
      retry_count: 0,
    };

    await saveOutboxItem(testItem);
    let pending = await getPendingOutboxItems();
    expect(pending.length).toBe(1);

    await removeOutboxItem('test-uuid-3');
    pending = await getPendingOutboxItems();
    expect(pending.length).toBe(0);
  });

  it('caches trips list and retrieves from cache', async () => {
    const dummyTrips: any[] = [
      { id: 'trip-1', name: 'Goa Trip', currency: 'INR', status: 'ACTIVE' },
      { id: 'trip-2', name: 'Manali Ride', currency: 'INR', status: 'COMPLETED' },
    ];

    await cacheTripsList(dummyTrips);
    const cached = await getCachedTripsList();
    expect(cached.length).toBe(2);
    expect(cached.find((t) => t.id === 'trip-1')?.name).toBe('Goa Trip');
    expect(cached.find((t) => t.id === 'trip-2')?.name).toBe('Manali Ride');
  });

  it('caches full trip details including expenses, settlements, and members', async () => {
    const dummyTrip: any = { id: 'trip-detail-1', name: 'Ooty Trek', currency: 'INR' };
    const dummyExpenses: any[] = [{ id: 'exp-1', description: 'Toll', amount_paise: 15000 }];
    const dummySettlements: any[] = [{ id: 'st-1', amount_paise: 5000 }];
    const dummyMembers: any[] = [{ user_id: 'u-1', user_name: 'Arun', role: 'OWNER' }];

    await cacheTripDetails('trip-detail-1', dummyTrip, dummyExpenses, dummySettlements, dummyMembers);
    const cached = await getCachedTripDetails('trip-detail-1');

    expect(cached).toBeDefined();
    expect(cached?.trip.name).toBe('Ooty Trek');
    expect(cached?.expenses.length).toBe(1);
    expect(cached?.expenses[0].description).toBe('Toll');
    expect(cached?.settlements.length).toBe(1);
    expect(cached?.members.length).toBe(1);
  });
});

describe('Phase 3: Sync Manager & Optimistic Outbox Queuing', () => {
  beforeEach(async () => {
    const db = await getOfflineDB();
    await db.clear('outbox');
    vi.restoreAllMocks();
  });

  it('queues an expense with optimistic representation and waiting to sync marker', async () => {
    const expenseInput = {
      payer_id: 'user-1',
      description: 'Breakfast',
      amount_paise: 35000,
      currency: 'INR',
      category: 'Food',
      split_method: 'EQUAL',
      splits: [{ user_id: 'user-1', amount_paise: 17500 }, { user_id: 'user-2', amount_paise: 17500 }],
    };

    const optimistic = await queueExpenseCreation('trip-xyz', expenseInput, 'Niranjan');

    // Verify optimistic shape
    expect(optimistic.trip_id).toBe('trip-xyz');
    expect(optimistic.description).toBe('Breakfast');
    expect(optimistic.amount_paise).toBe(35000);
    expect(optimistic.is_pending_sync).toBe(true);
    expect(optimistic.client_id).toBeDefined();
    expect(optimistic.payer_name).toBe('Niranjan');

    // Verify written to outbox
    const pending = await getPendingOutboxItems();
    expect(pending.length).toBe(1);
    expect(pending[0].client_id).toBe(optimistic.client_id);
    expect(pending[0].type).toBe('EXPENSE');
  });

  it('queues a settlement with optimistic representation and waiting to sync marker', async () => {
    const settlementInput = {
      payer_id: 'user-1',
      payee_id: 'user-2',
      amount_paise: 50000,
      payment_method: 'UPI',
      notes: 'Cleared breakfast share',
    };

    const optimistic = await queueSettlementCreation('trip-xyz', settlementInput, 'Niranjan', 'Karthik');

    // Verify optimistic shape
    expect(optimistic.trip_id).toBe('trip-xyz');
    expect(optimistic.payer_name).toBe('Niranjan');
    expect(optimistic.payee_name).toBe('Karthik');
    expect(optimistic.amount_paise).toBe(50000);
    expect(optimistic.is_pending_sync).toBe(true);
    expect(optimistic.client_id).toBeDefined();

    // Verify written to outbox
    const pending = await getPendingOutboxItems();
    expect(pending.length).toBe(1);
    expect(pending[0].client_id).toBe(optimistic.client_id);
    expect(pending[0].type).toBe('SETTLEMENT');
  });

  it('syncOutbox executes pending items, clears outbox, and dispatches item-synced event', async () => {
    // Mock API post before queuing/syncing
    vi.spyOn(api, 'post').mockResolvedValue({
      id: 'server-id-999',
      description: 'Coffee',
      amount_paise: 10000,
    });

    let eventFired = false;
    let eventDetail: any = null;
    const listener = (e: any) => {
      eventFired = true;
      eventDetail = e.detail;
    };
    window.addEventListener('onnago:item-synced', listener);

    const testItem: OutboxItem = {
      client_id: 'sync-test-uuid',
      type: 'EXPENSE',
      trip_id: 'trip-abc',
      endpoint: '/expenses/',
      method: 'POST',
      payload: { description: 'Coffee', amount_paise: 10000 },
      created_at: new Date().toISOString(),
      status: 'PENDING',
      retry_count: 0,
    };
    await saveOutboxItem(testItem);

    const result = await syncOutbox();

    expect(result.synced).toBe(1);
    expect(result.failed).toBe(0);

    // Outbox should now be empty
    const remaining = await getPendingOutboxItems();
    expect(remaining.length).toBe(0);

    // Event should have been triggered
    expect(eventFired).toBe(true);
    expect(eventDetail?.type).toBe('EXPENSE');
    expect(eventDetail?.trip_id).toBe('trip-abc');

    window.removeEventListener('onnago:item-synced', listener);
  });
});
