import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { api, getAvatarUrl } from '@/lib/api-client';
import { Trip, Expense, DashboardSummary } from '@/types';
import { formatPaise } from '@/lib/currency';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { cacheTripsList, getCachedTripsList } from '@/lib/offline-db';

function formatRelativeTime(dateString?: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (isNaN(diffSec) || diffSec < 0) return 'just now';
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { activeThemeId } = useTheme();
  const hasCustomWallpaper = activeThemeId !== 'default';
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [totalOwePaise, setTotalOwePaise] = useState(0);
  const [totalOwedPaise, setTotalOwedPaise] = useState(0);
  const [totalSpentPaise, setTotalSpentPaise] = useState(0);
  const [totalExpensesPaise, setTotalExpensesPaise] = useState(0);
  const [totalSharePaise, setTotalSharePaise] = useState(0);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [isTripPickerOpen, setIsTripPickerOpen] = useState(false);

  const loadDashboardData = useCallback(async () => {
    try {
      const res = await api.get<DashboardSummary>('/dashboard/summary');
      setTotalOwePaise(res.total_owe_paise || 0);
      setTotalOwedPaise(res.total_owed_paise || 0);
      setTotalSpentPaise(res.total_spent_paise || 0);

      const activeTripsList = res.active_trips || [];
      const computedExpenses = res.total_trip_expenses_paise ?? activeTripsList.reduce((sum, t) => sum + (t.total_expenses_paise || 0), 0);
      const computedShare = res.total_share_paise ?? activeTripsList.reduce((sum, t) => sum + (t.user_share_paise || 0), 0);
      setTotalExpensesPaise(computedExpenses);
      setTotalSharePaise(computedShare);

      setTrips(activeTripsList);
      setRecentExpenses(res.recent_expenses || []);

      // Cache trips for offline use
      if (activeTripsList.length > 0) {
        cacheTripsList(activeTripsList).catch(() => {});
      }
    } catch {
      // Fallback to offline cached data
      try {
        const cached = await getCachedTripsList();
        if (cached && cached.length > 0) {
          setTrips(cached);
          const owe = cached.reduce((sum, t) => sum + (t.user_owes_paise || 0), 0);
          const owed = cached.reduce((sum, t) => sum + (t.user_receives_paise || 0), 0);
          const spent = cached.reduce((sum, t) => sum + (t.user_contribution_paise || 0), 0);
          const expenses = cached.reduce((sum, t) => sum + (t.total_expenses_paise || 0), 0);
          const share = cached.reduce((sum, t) => sum + (t.user_share_paise || 0), 0);
          setTotalOwePaise(owe);
          setTotalOwedPaise(owed);
          setTotalSpentPaise(spent);
          setTotalExpensesPaise(expenses);
          setTotalSharePaise(share);
        }
      } catch {
        // Ignore offline read failure
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();

    const handleOnline = () => loadDashboardData();
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [loadDashboardData]);

  useEffect(() => {
    const handleAddAction = (e: Event) => {
      e.preventDefault();
      handleOpenAddExpense();
    };
    window.addEventListener('app-add-action', handleAddAction);

    return () => {
      window.removeEventListener('app-add-action', handleAddAction);
    };
  }, [trips]);

  const handleOpenAddExpense = () => {
    if (!trips || trips.length === 0) {
      navigate('/trips/new');
      return;
    }
    if (trips.length === 1) {
      navigate(`/trips/${trips[0].id}?action=add-expense`);
      return;
    }
    setIsTripPickerOpen(true);
  };

  const userInitial = user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-6">
      {/* --- Top Bar: Page title & Profile avatar --- */}
      <header className="flex items-center justify-between pb-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white drop-shadow-sm">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 font-medium mt-0.5">
            Your travel balances, fair shares &amp; active trip ledgers
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {trips.length > 0 && (
            <button
              onClick={handleOpenAddExpense}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#16834A] hover:bg-[#136F3F] dark:bg-[#22C55E] dark:hover:bg-[#1ea951] dark:text-zinc-950 rounded-xl transition-all cursor-pointer shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add expense</span>
            </button>
          )}

          {/* Profile Avatar */}
          <button
            onClick={() => navigate('/profile')}
            className="cursor-pointer active:scale-95 transition-transform rounded-2xl focus:outline-hidden"
            title={user?.full_name || 'Profile'}
            aria-label="Profile"
          >
            {user?.avatar_url ? (
              <img
                src={getAvatarUrl(user.avatar_url)}
                alt={user.full_name}
                className="w-10 h-10 rounded-2xl object-cover border border-white/40 dark:border-white/10 shadow-sm"
              />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white flex items-center justify-center font-bold text-xs uppercase border border-white/40 dark:border-white/10 shadow-sm">
                {userInitial}
              </div>
            )}
          </button>
        </div>
      </header>

      {/* --- Loading State: Skeleton Loaders (No spinners) --- */}
      {loading ? (
        <div className="space-y-8 mt-2" aria-busy="true" aria-label="Loading dashboard">
          {/* Summary Block Skeleton */}
          <div className="py-5 border-b border-[#E8E8E5] dark:border-[#2A2A2E] grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <div className="w-18 h-3.5 bg-[#E8E8E5] dark:bg-[#1B1B1E] rounded animate-pulse mb-2" />
                <div className="w-24 h-7 bg-[#E8E8E5] dark:bg-[#1B1B1E] rounded animate-pulse" />
              </div>
            ))}
          </div>

          {/* Trips Feed Skeleton */}
          <div>
            <div className="w-16 h-3 bg-[#E8E8E5] dark:bg-[#262626] rounded animate-pulse mb-4" />
            <div className="divide-y divide-[#E8E8E5] dark:divide-[#262626]">
              {[1, 2, 3].map((i) => (
                <div key={i} className="py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-lg bg-[#E8E8E5] dark:bg-[#262626] rounded animate-pulse shrink-0" />
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="w-36 h-4 bg-[#E8E8E5] dark:bg-[#262626] rounded animate-pulse" />
                      <div className="w-24 h-3 bg-[#E8E8E5] dark:bg-[#262626] rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="w-16 h-5 bg-[#E8E8E5] dark:bg-[#262626] rounded animate-pulse shrink-0 ml-4" />
                </div>
              ))}
            </div>
          </div>

          {/* Activity Feed Skeleton */}
          <div>
            <div className="w-28 h-3 bg-[#E8E8E5] dark:bg-[#262626] rounded animate-pulse mb-4" />
            <div className="divide-y divide-[#E8E8E5] dark:divide-[#262626]">
              {[1, 2, 3].map((i) => (
                <div key={i} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                    <div className="w-8 h-8 rounded-lg bg-[#E8E8E5] dark:bg-[#262626] rounded animate-pulse shrink-0" />
                    <div className="w-48 h-4 bg-[#E8E8E5] dark:bg-[#262626] rounded animate-pulse" />
                  </div>
                  <div className="w-14 h-4 bg-[#E8E8E5] dark:bg-[#262626] rounded animate-pulse shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* --- Summary Block: 4 Clear Financial Metrics (Apple/Minimalist, Tabular) --- */}
          {/* --- Summary Block: 4 Clear Financial Metrics (Apple Frosted Solid Glass) --- */}
          <section className="glass-solid p-5 sm:p-6 shadow-xl border border-white/50 dark:border-white/10 rounded-3xl">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 block mb-1">
                  Total Expenses
                </span>
                <span className="text-xl sm:text-2xl font-bold tabular-nums font-mono tracking-tight text-zinc-900 dark:text-white">
                  {formatPaise(totalExpensesPaise)}
                </span>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 block mb-1">
                  Your Fair Share
                </span>
                <span className="text-xl sm:text-2xl font-bold tabular-nums font-mono tracking-tight text-zinc-900 dark:text-white">
                  {formatPaise(totalSharePaise)}
                </span>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 block mb-1">
                  You Paid
                </span>
                <span className="text-xl sm:text-2xl font-bold tabular-nums font-mono tracking-tight text-zinc-900 dark:text-white">
                  {formatPaise(totalSpentPaise)}
                </span>
              </div>
              <div>
                {totalOwePaise > totalOwedPaise ? (
                  <>
                    <span className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 block mb-1">
                      You Owe
                    </span>
                    <span className="text-xl sm:text-2xl font-bold tabular-nums font-mono tracking-tight text-red-600 dark:text-red-400">
                      {formatPaise(totalOwePaise - totalOwedPaise)}
                    </span>
                  </>
                ) : totalOwedPaise > totalOwePaise ? (
                  <>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#16834A] dark:text-[#22C55E] block mb-1">
                      You Get Back
                    </span>
                    <span className="text-xl sm:text-2xl font-bold tabular-nums font-mono tracking-tight text-[#16834A] dark:text-[#22C55E]">
                      {formatPaise(totalOwedPaise - totalOwePaise)}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 block mb-1">
                      Net Balance
                    </span>
                    <span className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-600 dark:text-zinc-300">
                      Settled Up
                    </span>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* --- Trips List (Feed Rows) --- */}
          <section className="mt-8 space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                Active Trips
              </h2>
              {trips.length > 0 && (
                <span className="text-xs font-semibold text-[#16834A] dark:text-[#22C55E]">
                  {trips.length} {trips.length === 1 ? 'trip' : 'trips'}
                </span>
              )}
            </div>

            {trips.length === 0 ? (
              <div className="glass-card py-12 px-6 text-center border border-white/40 dark:border-white/10 rounded-3xl shadow-sm my-3">
                <p className="text-base font-bold text-zinc-900 dark:text-white mb-1.5">No trips yet</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 mb-6 max-w-sm mx-auto font-medium">
                  Create a journey to start sharing expenses and tracking split settlements with your group.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={() => navigate('/trips/new')}
                    className="w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-[#16834A] hover:bg-[#136F3F] dark:bg-[#22C55E] dark:hover:bg-[#1ea951] dark:text-zinc-950 rounded-xl transition-all cursor-pointer shadow-md active:scale-95"
                  >
                    Create your first trip
                  </button>
                  <button
                    onClick={() => navigate('/trips/join')}
                    className="w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm font-bold text-zinc-900 dark:text-white bg-white/70 dark:bg-white/10 border border-white/40 dark:border-white/15 rounded-xl hover:bg-white/90 dark:hover:bg-white/20 transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    Join with code
                  </button>
                </div>
              </div>
            ) : (
              <div className="glass-card rounded-3xl p-3 sm:p-4 border border-white/40 dark:border-white/10 shadow-md divide-y divide-black/5 dark:divide-white/10">
                {trips.map((trip) => {
                  const userOwes = trip.user_owes_paise || 0;
                  const userReceives = trip.user_receives_paise || 0;
                  const membersCount = trip.members_count || 1;
                  const expensesCount = trip.expenses_count ?? 0;
                  const initial = trip.name ? trip.name.charAt(0).toUpperCase() : 'T';

                  return (
                    <div
                      key={trip.id}
                      onClick={() => navigate(`/trips/${trip.id}`)}
                      className="py-3.5 px-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer flex items-center justify-between group"
                    >
                      {/* Left + Middle */}
                      <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-3">
                        {/* Cover image or initial avatar */}
                        <div className="w-12 h-12 rounded-2xl bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold text-base flex items-center justify-center shrink-0 border border-white/40 dark:border-white/10 shadow-sm group-hover:scale-105 transition-transform">
                          {initial}
                        </div>

                        {/* Middle: Name and "X people · Y expenses" */}
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white truncate">
                            {trip.name}
                          </h3>
                          <p className="text-xs text-zinc-600 dark:text-zinc-300 font-medium mt-0.5 truncate">
                            {membersCount} {membersCount === 1 ? 'person' : 'people'} &bull; {expensesCount} {expensesCount === 1 ? 'expense' : 'expenses'}
                          </p>
                        </div>
                      </div>

                      {/* Right: Your Balance */}
                      <div className="text-right shrink-0 ml-3">
                        {userReceives > 0 ? (
                          <>
                            <span className="text-sm sm:text-base font-bold tabular-nums text-[#16834A] dark:text-[#22C55E] block">
                              +{formatPaise(userReceives, trip.currency)}
                            </span>
                            <span className="text-[10px] font-semibold text-[#16834A] dark:text-[#22C55E]">
                              you're owed
                            </span>
                          </>
                        ) : userOwes > 0 ? (
                          <>
                            <span className="text-sm sm:text-base font-bold tabular-nums text-red-600 dark:text-red-400 block">
                              -{formatPaise(userOwes, trip.currency)}
                            </span>
                            <span className="text-[10px] font-semibold text-red-600 dark:text-red-400">
                              you owe
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-sm font-semibold tabular-nums text-zinc-600 dark:text-zinc-300 block">
                              {formatPaise(0, trip.currency)}
                            </span>
                            <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                              settled
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* --- Recent Activity List (Feed Rows) --- */}
          <section className="mt-8 mb-24 sm:mb-12">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-2.5 px-1">
              Recent activity
            </h2>

            {recentExpenses.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-zinc-400">No recent activity.</p>
              </div>
            ) : (
              <div className="glass-card rounded-3xl p-3 sm:p-4 border border-white/40 dark:border-white/10 shadow-sm divide-y divide-black/5 dark:divide-white/10">
                {recentExpenses.map((exp) => {
                  const initial = exp.category ? exp.category.charAt(0).toUpperCase() : 'E';

                  return (
                    <div
                      key={exp.id}
                      onClick={() => navigate(`/trips/${exp.trip_id}`)}
                      className="py-3 px-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer flex items-center justify-between group"
                    >
                      {/* Left: Category avatar */}
                      <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                        <div className="w-9 h-9 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold text-xs flex items-center justify-center shrink-0 border border-white/40 dark:border-white/10 shadow-xs">
                          {initial}
                        </div>

                        {/* Middle: One line per item with relative time */}
                        <div className="flex items-center min-w-0 flex-1 truncate">
                          <span className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                            {exp.description}
                          </span>
                          <span className="text-xs text-zinc-400 shrink-0 ml-1.5">
                            &bull; {formatRelativeTime(exp.created_at || exp.date)}
                          </span>
                        </div>
                      </div>

                      {/* Right: Amount */}
                      <div className="text-right shrink-0 ml-3">
                        <span className="text-sm font-bold font-mono tabular-nums text-zinc-900 dark:text-white">
                          {formatPaise(exp.amount_paise, exp.currency)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      {/* --- Trip Picker Modal (if multiple trips exist when adding expense) --- */}
      {isTripPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-modal border border-white/30 rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-white/15">
              <h3 className="text-base font-bold text-white">
                Select a trip
              </h3>
              <button
                onClick={() => setIsTripPickerOpen(false)}
                className="p-1 rounded-lg text-white/70 hover:text-white cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="divide-y divide-white/10 max-h-60 overflow-y-auto">
              {trips.map((trip) => (
                <button
                  key={trip.id}
                  onClick={() => {
                    setIsTripPickerOpen(false);
                    navigate(`/trips/${trip.id}?action=add-expense`);
                  }}
                  className="w-full text-left py-3 px-3 flex items-center justify-between hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                >
                  <span className="text-sm font-semibold text-white truncate">
                    {trip.name}
                  </span>
                  <span className="text-xs text-white/70 shrink-0 ml-2">
                    {trip.members_count || 1} people
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setIsTripPickerOpen(false);
                navigate('/trips/new');
              }}
              className="w-full py-2.5 text-xs font-bold text-center text-[#22C55E] hover:underline"
            >
              + Create a new trip
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
