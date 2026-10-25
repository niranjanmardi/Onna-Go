import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  subscribeToSyncStatus,
  syncOutbox,
  isDeviceOnline,
  queueExpenseCreation,
  queueExpenseUpdate,
  queueExpenseDelete,
  queueSettlementCreation,
  retryOutboxItem,
  discardOutboxItem,
  PauseReason,
} from '../lib/sync-manager';
import { getFailedOutboxItems, OutboxItem } from '../lib/offline-db';
import { Expense, Settlement } from '../types';

interface OfflineContextType {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  isPaused: boolean;
  pauseReason: PauseReason;
  failedItems: OutboxItem[];
  lastSyncedAt: Date | null;
  syncNow: () => Promise<{ synced: number; failed: number }>;
  retryItem: (clientId: string) => Promise<void>;
  discardItem: (clientId: string) => Promise<void>;
  queueOfflineExpense: (tripId: string, expenseInput: any, payerName?: string) => Promise<Expense>;
  queueOfflineExpenseUpdate: (
    tripId: string,
    expenseId: string,
    input: any,
    existingExpense: Expense
  ) => Promise<Expense>;
  queueOfflineExpenseDelete: (tripId: string, expenseId: string) => Promise<void>;
  queueOfflineSettlement: (
    tripId: string,
    settlementInput: any,
    payerName?: string,
    payeeName?: string
  ) => Promise<Settlement>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(isDeviceOnline());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [failedCount, setFailedCount] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [pauseReason, setPauseReason] = useState<PauseReason>(null);
  const [failedItems, setFailedItems] = useState<OutboxItem[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const refreshFailedItems = useCallback(async () => {
    try {
      const items = await getFailedOutboxItems();
      setFailedItems(items);
    } catch {
      setFailedItems([]);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToSyncStatus((status) => {
      setIsOnline(status.isOnline);
      setIsSyncing(status.isSyncing);
      setPendingCount(status.pendingCount);
      setFailedCount(status.failedCount);
      setIsPaused(status.isPaused);
      setPauseReason(status.pauseReason);
      setLastSyncedAt(status.lastSyncedAt);
      refreshFailedItems();
    });

    refreshFailedItems();

    return () => {
      unsubscribe();
    };
  }, [refreshFailedItems]);

  const syncNow = useCallback(async () => {
    return syncOutbox();
  }, []);

  const retryItem = useCallback(async (clientId: string) => {
    await retryOutboxItem(clientId);
    await refreshFailedItems();
  }, [refreshFailedItems]);

  const discardItem = useCallback(async (clientId: string) => {
    await discardOutboxItem(clientId);
    await refreshFailedItems();
  }, [refreshFailedItems]);

  const queueOfflineExpense = useCallback(
    async (tripId: string, expenseInput: any, payerName?: string) => {
      return queueExpenseCreation(tripId, expenseInput, payerName);
    },
    []
  );

  const queueOfflineExpenseUpdateCb = useCallback(
    async (tripId: string, expenseId: string, input: any, existingExpense: Expense) => {
      return queueExpenseUpdate(tripId, expenseId, input, existingExpense);
    },
    []
  );

  const queueOfflineExpenseDeleteCb = useCallback(
    async (tripId: string, expenseId: string) => {
      return queueExpenseDelete(tripId, expenseId);
    },
    []
  );

  const queueOfflineSettlement = useCallback(
    async (
      tripId: string,
      settlementInput: any,
      payerName?: string,
      payeeName?: string
    ) => {
      return queueSettlementCreation(tripId, settlementInput, payerName, payeeName);
    },
    []
  );

  const value = useMemo(
    () => ({
      isOnline,
      isSyncing,
      pendingCount,
      failedCount,
      isPaused,
      pauseReason,
      failedItems,
      lastSyncedAt,
      syncNow,
      retryItem,
      discardItem,
      queueOfflineExpense,
      queueOfflineExpenseUpdate: queueOfflineExpenseUpdateCb,
      queueOfflineExpenseDelete: queueOfflineExpenseDeleteCb,
      queueOfflineSettlement,
    }),
    [
      isOnline,
      isSyncing,
      pendingCount,
      failedCount,
      isPaused,
      pauseReason,
      failedItems,
      lastSyncedAt,
      syncNow,
      retryItem,
      discardItem,
      queueOfflineExpense,
      queueOfflineExpenseUpdateCb,
      queueOfflineExpenseDeleteCb,
      queueOfflineSettlement,
    ]
  );

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
};

export function useOffline(): OfflineContextType {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}
