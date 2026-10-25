import React, { useEffect, useState } from 'react';
import { WifiOff, RotateCw, CheckCircle2, CloudUpload } from 'lucide-react';
import { useOffline } from '../../context/OfflineContext';

export const OfflineBanner: React.FC = () => {
  const { isOnline, isSyncing, pendingCount, syncNow, lastSyncedAt } = useOffline();
  const [showSyncedSuccess, setShowSyncedSuccess] = useState<boolean>(false);
  const [prevPendingCount, setPrevPendingCount] = useState<number>(pendingCount);

  // Detect transition from syncing with items to 0 pending items -> show temporary success pill
  useEffect(() => {
    if (prevPendingCount > 0 && pendingCount === 0 && isOnline && !isSyncing) {
      setShowSyncedSuccess(true);
      const timer = setTimeout(() => {
        setShowSyncedSuccess(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
    setPrevPendingCount(pendingCount);
  }, [pendingCount, isOnline, isSyncing, prevPendingCount]);

  // If online, not syncing, no pending items, and not recently synced -> render nothing
  if (isOnline && !isSyncing && pendingCount === 0 && !showSyncedSuccess) {
    return null;
  }

  return (
    <aside
      role="status"
      aria-live="polite"
      className="w-full transition-all duration-300 z-40 border-b select-none"
    >
      {/* 1. Offline Banner */}
      {!isOnline && (
        <div className="bg-amber-500/10 dark:bg-amber-950/30 border-b border-amber-500/20 px-4 py-2 text-amber-800 dark:text-amber-300 text-xs sm:text-sm font-medium flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
              <WifiOff className="w-3.5 h-3.5 animate-pulse" />
            </span>
            <span className="truncate">
              You are offline. Expenses and settlements will be saved locally.
            </span>
          </div>
          {pendingCount > 0 && (
            <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/30">
              {pendingCount} waiting to sync
            </span>
          )}
        </div>
      )}

      {/* 2. Syncing In Progress */}
      {isOnline && isSyncing && (
        <div className="bg-blue-500/10 dark:bg-blue-950/30 border-b border-blue-500/20 px-4 py-2 text-blue-800 dark:text-blue-300 text-xs sm:text-sm font-medium flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <RotateCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-spin shrink-0" />
            <span className="truncate">
              Reconnected — syncing {pendingCount} offline {pendingCount === 1 ? 'change' : 'changes'}...
            </span>
          </div>
        </div>
      )}

      {/* 3. Online with Pending items awaiting sync */}
      {isOnline && !isSyncing && pendingCount > 0 && (
        <div className="bg-emerald-500/10 dark:bg-emerald-950/30 border-b border-emerald-500/20 px-4 py-2 text-emerald-900 dark:text-emerald-300 text-xs sm:text-sm font-medium flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <CloudUpload className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="truncate">
              {pendingCount} offline {pendingCount === 1 ? 'item' : 'items'} ready to sync.
            </span>
          </div>
          <button
            onClick={() => syncNow()}
            className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all"
          >
            <span>Sync Now</span>
          </button>
        </div>
      )}

      {/* 4. Just Synced Success Confirmation */}
      {isOnline && !isSyncing && showSyncedSuccess && (
        <div className="bg-emerald-500/10 dark:bg-emerald-950/30 border-b border-emerald-500/20 px-4 py-2 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-medium flex items-center gap-2 shadow-xs transition-opacity duration-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>All offline changes synced with server!</span>
        </div>
      )}
    </aside>
  );
};
