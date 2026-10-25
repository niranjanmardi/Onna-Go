import React, { useEffect, useState } from 'react';
import { WifiOff, RotateCw, CheckCircle2, CloudUpload, AlertTriangle, RefreshCw, Trash2, LogIn, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOffline } from '../../context/OfflineContext';

export const OfflineBanner: React.FC = () => {
  const {
    isOnline,
    isSyncing,
    pendingCount,
    failedCount,
    isPaused,
    pauseReason,
    failedItems,
    syncNow,
    retryItem,
    discardItem,
  } = useOffline();

  const navigate = useNavigate();
  const [showSyncedSuccess, setShowSyncedSuccess] = useState<boolean>(false);
  const [prevPendingCount, setPrevPendingCount] = useState<number>(pendingCount);
  const [showFailedDetails, setShowFailedDetails] = useState<boolean>(false);

  // Detect transition from syncing with items to 0 pending items -> show temporary success pill
  useEffect(() => {
    if (prevPendingCount > 0 && pendingCount === 0 && failedCount === 0 && isOnline && !isSyncing) {
      setShowSyncedSuccess(true);
      const timer = setTimeout(() => {
        setShowSyncedSuccess(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
    setPrevPendingCount(pendingCount);
  }, [pendingCount, failedCount, isOnline, isSyncing, prevPendingCount]);

  // If online, not syncing, not paused, no pending items, and no failed items -> render nothing
  if (isOnline && !isSyncing && !isPaused && pendingCount === 0 && failedCount === 0 && !showSyncedSuccess) {
    return null;
  }

  return (
    <aside
      role="status"
      aria-live="polite"
      className="w-full transition-all duration-300 z-40 border-b select-none"
    >
      {/* 1. Auth Required / 401 Paused Banner */}
      {isPaused && pauseReason === 'AUTH_REQUIRED' && (
        <div className="bg-red-500/10 dark:bg-red-950/30 border-b border-red-500/20 px-4 py-2.5 text-red-800 dark:text-red-300 text-xs sm:text-sm font-medium flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded-full bg-red-500/20 text-red-600 dark:text-red-400 shrink-0">
              <LogIn className="w-3.5 h-3.5" />
            </span>
            <span className="truncate">
              Your session expired while syncing. Sign in to sync {pendingCount} offline changes.
            </span>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] bg-[#16834A] dark:bg-[#22C55E] text-white dark:text-[#0A0A0A] text-xs font-semibold hover:opacity-90 active:scale-95 transition-all cursor-pointer"
          >
            <span>Sign in</span>
          </button>
        </div>
      )}

      {/* 2. Couldn't Sync (Other 4xx Client Failures) with Retry & Discard */}
      {failedCount > 0 && (
        <div className="bg-amber-500/10 dark:bg-amber-950/30 border-b border-amber-500/20 px-4 py-2.5 text-amber-900 dark:text-amber-200 text-xs sm:text-sm shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0 font-medium">
              <span className="p-1 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                <AlertTriangle className="w-3.5 h-3.5" />
              </span>
              <span className="truncate">
                Couldn't sync {failedCount} {failedCount === 1 ? 'item' : 'items'} (validation or permissions).
              </span>
            </div>
            <button
              onClick={() => setShowFailedDetails(!showFailedDetails)}
              className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:underline cursor-pointer"
            >
              <span>{showFailedDetails ? 'Hide' : 'Review'}</span>
              {showFailedDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Expandable Failed Items List */}
          {showFailedDetails && (
            <div className="mt-2.5 pt-2 border-t border-amber-500/20 space-y-2">
              {failedItems.map((item) => (
                <div
                  key={item.client_id}
                  className="p-2 rounded-[8px] bg-white/70 dark:bg-[#121212] border border-amber-500/30 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-[#121212] dark:text-[#EDEDED] truncate">
                      {item.type} {item.payload?.description ? `— ${item.payload.description}` : ''}
                    </div>
                    {item.error && (
                      <div className="text-red-600 dark:text-red-400 text-[11px] truncate">
                        {item.error}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => retryItem(item.client_id)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-[6px] bg-amber-600/10 hover:bg-amber-600/20 text-amber-800 dark:text-amber-300 font-medium transition-colors cursor-pointer"
                      title="Retry sync"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Retry</span>
                    </button>
                    <button
                      onClick={() => discardItem(item.client_id)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-[6px] bg-red-600/10 hover:bg-red-600/20 text-red-700 dark:text-red-400 font-medium transition-colors cursor-pointer"
                      title="Discard item"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Discard</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. Offline Banner */}
      {!isOnline && (
        <div className="bg-amber-500/10 dark:bg-amber-950/30 border-b border-amber-500/20 px-4 py-2 text-amber-800 dark:text-amber-300 text-xs sm:text-sm font-medium flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
              <WifiOff className="w-3.5 h-3.5 animate-pulse" />
            </span>
            <span className="truncate">
              You are offline. Expenses, edits, and settlements are saved locally.
            </span>
          </div>
          {pendingCount > 0 && (
            <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/30">
              {pendingCount} waiting to sync
            </span>
          )}
        </div>
      )}

      {/* 4. Syncing In Progress */}
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

      {/* 5. Online with Pending items awaiting sync */}
      {isOnline && !isSyncing && !isPaused && pendingCount > 0 && (
        <div className="bg-emerald-500/10 dark:bg-emerald-950/30 border-b border-emerald-500/20 px-4 py-2 text-emerald-900 dark:text-emerald-300 text-xs sm:text-sm font-medium flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <CloudUpload className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="truncate">
              {pendingCount} offline {pendingCount === 1 ? 'item' : 'items'} ready to sync.
            </span>
          </div>
          <button
            onClick={() => syncNow()}
            className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-[#16834A] dark:bg-[#22C55E] hover:opacity-95 active:scale-95 text-white dark:text-[#0A0A0A] text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <span>Sync Now</span>
          </button>
        </div>
      )}

      {/* 6. Just Synced Success Confirmation */}
      {isOnline && !isSyncing && showSyncedSuccess && (
        <div className="bg-emerald-500/10 dark:bg-emerald-950/30 border-b border-emerald-500/20 px-4 py-2 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-medium flex items-center gap-2 shadow-xs transition-opacity duration-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#16834A] dark:text-[#22C55E] shrink-0" />
          <span>All offline changes synced with server!</span>
        </div>
      )}
    </aside>
  );
};
