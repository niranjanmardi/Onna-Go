import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  subscribeToSyncStatus,
  syncOutbox,
  isDeviceOnline,
  queueExpenseCreation,
  queueSettlementCreation,
} from '../lib/sync-manager';
import { Expense, Settlement } from '../types';

interface OfflineContextType {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: Date | null;
  syncNow: () => Promise<{ synced: number; failed: number }>;
  queueOfflineExpense: (tripId: string, expenseInput: any, payerName?: string) => Promise<Expense>;
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
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToSyncStatus((status) => {
      setIsOnline(status.isOnline);
      setIsSyncing(status.isSyncing);
      setPendingCount(status.pendingCount);
      setLastSyncedAt(status.lastSyncedAt);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const syncNow = useCallback(async () => {
    return syncOutbox();
  }, []);

  const queueOfflineExpense = useCallback(
    async (tripId: string, expenseInput: any, payerName?: string) => {
      return queueExpenseCreation(tripId, expenseInput, payerName);
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
      lastSyncedAt,
      syncNow,
      queueOfflineExpense,
      queueOfflineSettlement,
    }),
    [isOnline, isSyncing, pendingCount, lastSyncedAt, syncNow, queueOfflineExpense, queueOfflineSettlement]
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
