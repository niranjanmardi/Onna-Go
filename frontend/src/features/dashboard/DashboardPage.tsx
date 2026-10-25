import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { api, getAvatarUrl } from '@/lib/api-client';
import { Trip, Expense, DashboardSummary } from '@/types';
import { formatPaise } from '@/lib/currency';
import { useAuth } from '@/features/auth/AuthContext';
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
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [totalOwePaise, setTotalOwePaise] = useState(0);
  const [totalOwedPaise, setTotalOwedPaise] = useState(0);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [isTripPickerOpen, setIsTripPickerOpen] = useState(false);

  const loadDashboardData = useCallback(async () => {
    try {
      const res = await api.get<DashboardSummary>('/dashboard/summary');
      setTotalOwePaise(res.total_owe_paise || 0);
      setTotalOwedPaise(res.total_owed_paise || 0);
      setTrips(res.active_trips || []);
      setRecentExpenses(res.recent_expenses || []);

      // Cache trips for offline use
      if (res.active_trips && res.active_trips.length > 0) {
        cacheTripsList(res.active_trips).catch(() => {});
      }
    } catch {
      // Fallback to offline cached data
      try {
        const cached = await getCachedTripsList();
        if (cached && cached.length > 0) {
          setTrips(cached);
          const owe = cached.reduce((sum, t) => sum + (t.user_owes_paise || 0), 0);
          const owed = cached.reduce((sum, t) => sum + (t.user_receives_paise || 0), 0);
          setTotalOwePaise(owe);
          setTotalOwedPaise(owed);
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

    const handleAddAction = (e: Event) => {
      e.preventDefault();
      handleOpenAddExpense();
    };
    window.addEventListener('app-add-action', handleAddAction);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('app-add-action', handleAddAction);
    };
  }, [loadDashboardData, trips]);

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
    <div className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 md:py-8">
      {/* --- Top Bar: Page title & Profile avatar --- */}
      <header className="flex items-center justify-between pb-4">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#171717] dark:text-[#EDEDED]">
          Dashboard
        </h1>

        {/* Profile Avatar */}
        <button
          onClick={() => navigate('/profile')}
          className="cursor-pointer active:scale-95 transition-transform rounded-full focus:outline-hidden"
          title={user?.full_name || 'Profile'}
          aria-label="Profile"
        >
          {user?.avatar_url ? (
            <img
              src={getAvatarUrl(user.avatar_url)}
              alt={user.full_name}
              className="w-9 h-9 rounded-full object-cover border border-[#E8E8E5] dark:border-[#262626]"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[#E8E8E5] dark:bg-[#262626] text-[#171717] dark:text-[#EDEDED] flex items-center justify-center font-semibold text-xs">
              {userInitial}
            </div>
          )}
        </button>
      </header>

      {/* --- Loading State: Skeleton Loaders (No spinners) --- */}
      {loading ? (
        <div className="space-y-8 mt-2" aria-busy="true" aria-label="Loading dashboard">
          {/* Summary Block Skeleton */}
          <div className="py-5 border-b border-[#E8E8E5] dark:border-[#262626] grid grid-cols-2 gap-6 sm:flex sm:gap-16">
            <div>
              <div className="w-16 h-3.5 bg-[#E8E8E5] dark:bg-[#262626] rounded animate-pulse mb-2" />
              <div className="w-28 h-8 bg-[#E8E8E5] dark:bg-[#262626] rounded animate-pulse" />
            </div>
            <div>
              <div className="w-20 h-3.5 bg-[#E8E8E5] dark:bg-[#262626] rounded animate-pulse mb-2" />
              <div className="w-28 h-8 bg-[#E8E8E5] dark:bg-[#262626] rounded animate-pulse" />
            </div>
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
          {/* --- Summary Block: Two Plain Numbers (Red & Green, Tabular) --- */}
          <section className="py-5 border-b border-[#E8E8E5] dark:border-[#262626] grid grid-cols-2 gap-6 sm:flex sm:gap-16">
            <div>
              <span className="text-xs font-medium text-[#737373] dark:text-[#8E8E93] block mb-1">
                You owe
              </span>
              <span className="text-2xl sm:text-3xl font-semibold tabular-nums tracking-tight text-[#DC2626] dark:text-[#EF4444]">
                {formatPaise(totalOwePaise)}
              </span>
            </div>
            <div>
              <span className="text-xs font-medium text-[#737373] dark:text-[#8E8E93] block mb-1">
                You're owed
              </span>
              <span className="text-2xl sm:text-3xl font-semibold tabular-nums tracking-tight text-[#16834A] dark:text-[#22C55E]">
                {formatPaise(totalOwedPaise)}
              </span>
            </div>
          </section>

          {/* --- Trips List (Feed Rows) --- */}
          <section className="mt-8">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#737373] dark:text-[#8E8E93] mb-2">
              Trips
            </h2>

            {trips.length === 0 ? (
              <div className="py-8 text-center border-b border-[#E8E8E5] dark:border-[#262626]">
                <p className="text-sm text-[#737373] dark:text-[#8E8E93] mb-3">No trips yet.</p>
                <button
                  onClick={() => navigate('/trips/new')}
                  className="px-4 py-2 text-xs font-semibold text-[#171717] dark:text-[#EDEDED] bg-white dark:bg-[#1A1A1A] border border-[#E8E8E5] dark:border-[#262626] rounded-xl hover:bg-[#F4F4F2] dark:hover:bg-[#222222] transition-colors cursor-pointer"
                >
                  Create a trip
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#E8E8E5] dark:divide-[#262626]">
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
                      className="py-3.5 px-2 -mx-2 hover:bg-[#F4F4F2]/70 dark:hover:bg-[#1A1A1A]/70 rounded-xl transition-colors cursor-pointer flex items-center justify-between group"
                    >
                      {/* Left + Middle */}
                      <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-3">
                        {/* Cover image or initial avatar */}
                        <div className="w-11 h-11 rounded-lg bg-[#F4F4F2] dark:bg-[#1C1C1C] text-[#171717] dark:text-[#EDEDED] font-semibold text-sm flex items-center justify-center shrink-0 border border-[#E8E8E5] dark:border-[#262626]">
                          {initial}
                        </div>

                        {/* Middle: Name and "X people · Y expenses" */}
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-sm sm:text-base text-[#171717] dark:text-[#EDEDED] truncate">
                            {trip.name}
                          </h3>
                          <p className="text-xs text-[#737373] dark:text-[#8E8E93] mt-0.5 truncate">
                            {membersCount} {membersCount === 1 ? 'person' : 'people'} - {expensesCount} {expensesCount === 1 ? 'expense' : 'expenses'}
                          </p>
                        </div>
                      </div>

                      {/* Right: Your Balance */}
                      <div className="text-right shrink-0 ml-3">
                        {userReceives > 0 ? (
                          <>
                            <span className="text-sm font-semibold tabular-nums text-[#16834A] dark:text-[#22C55E] block">
                              +{formatPaise(userReceives, trip.currency)}
                            </span>
                            <span className="text-[10px] text-[#16834A]/80 dark:text-[#22C55E]/80">
                              you're owed
                            </span>
                          </>
                        ) : userOwes > 0 ? (
                          <>
                            <span className="text-sm font-semibold tabular-nums text-[#DC2626] dark:text-[#EF4444] block">
                              -{formatPaise(userOwes, trip.currency)}
                            </span>
                            <span className="text-[10px] text-[#DC2626]/80 dark:text-[#EF4444]/80">
                              you owe
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-sm font-medium tabular-nums text-[#737373] dark:text-[#8E8E93] block">
                              {formatPaise(0, trip.currency)}
                            </span>
                            <span className="text-[10px] text-[#737373] dark:text-[#8E8E93]">
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
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#737373] dark:text-[#8E8E93] mb-2">
              Recent activity
            </h2>

            {recentExpenses.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-[#737373] dark:text-[#8E8E93]">No recent activity.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#E8E8E5] dark:divide-[#262626]">
                {recentExpenses.map((exp) => {
                  const initial = exp.category ? exp.category.charAt(0).toUpperCase() : 'E';

                  return (
                    <div
                      key={exp.id}
                      onClick={() => navigate(`/trips/${exp.trip_id}`)}
                      className="py-3 px-2 -mx-2 hover:bg-[#F4F4F2]/70 dark:hover:bg-[#1A1A1A]/70 rounded-xl transition-colors cursor-pointer flex items-center justify-between"
                    >
                      {/* Left: Category avatar */}
                      <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                        <div className="w-8 h-8 rounded-lg bg-[#F4F4F2] dark:bg-[#1C1C1C] text-[#171717] dark:text-[#EDEDED] font-medium text-xs flex items-center justify-center shrink-0 border border-[#E8E8E5] dark:border-[#262626]">
                          {initial}
                        </div>

                        {/* Middle: One line per item with relative time */}
                        <div className="flex items-center min-w-0 flex-1 truncate">
                          <span className="text-sm font-medium text-[#171717] dark:text-[#EDEDED] truncate">
                            {exp.description}
                          </span>
                          <span className="text-xs text-[#737373] dark:text-[#8E8E93] shrink-0 ml-1.5">
                            &bull; {formatRelativeTime(exp.created_at || exp.date)}
                          </span>
                        </div>
                      </div>

                      {/* Right: Amount */}
                      <div className="text-right shrink-0 ml-3">
                        <span className="text-sm font-medium font-mono tabular-nums text-[#171717] dark:text-[#EDEDED]">
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

      {/* --- Mobile Floating Action Button (+) --- */}
      <button
        onClick={handleOpenAddExpense}
        className="sm:hidden fixed bottom-20 right-5 w-14 h-14 rounded-full bg-[#16834A] dark:bg-[#22C55E] text-white dark:text-[#0A0A0A] flex items-center justify-center shadow-lg active:scale-95 transition-transform z-30 cursor-pointer"
        aria-label="Add expense"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>

      {/* --- Trip Picker Modal (if multiple trips exist when adding expense) --- */}
      {isTripPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#141414] border border-[#E8E8E5] dark:border-[#262626] rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E5] dark:border-[#262626]">
              <h3 className="text-base font-semibold text-[#171717] dark:text-[#EDEDED]">
                Select a trip
              </h3>
              <button
                onClick={() => setIsTripPickerOpen(false)}
                className="p-1 rounded-lg text-[#737373] dark:text-[#8E8E93] hover:text-[#171717] dark:hover:text-[#EDEDED] cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="divide-y divide-[#E8E8E5] dark:divide-[#262626] max-h-60 overflow-y-auto">
              {trips.map((trip) => (
                <button
                  key={trip.id}
                  onClick={() => {
                    setIsTripPickerOpen(false);
                    navigate(`/trips/${trip.id}?action=add-expense`);
                  }}
                  className="w-full text-left py-3 px-2 flex items-center justify-between hover:bg-[#F4F4F2] dark:hover:bg-[#1F1F1F] rounded-lg transition-colors cursor-pointer"
                >
                  <span className="text-sm font-medium text-[#171717] dark:text-[#EDEDED] truncate">
                    {trip.name}
                  </span>
                  <span className="text-xs text-[#737373] dark:text-[#8E8E93] shrink-0 ml-2">
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
              className="w-full py-2.5 text-xs font-semibold text-center text-[#16834A] dark:text-[#22C55E] hover:underline"
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
