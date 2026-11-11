import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Compass, ArrowRight, Receipt, Users, MessageCircle, Camera } from 'lucide-react';
import { api, getAvatarUrl } from '@/lib/api-client';
import { Trip, Expense, DashboardSummary } from '@/types';
import { formatPaise } from '@/lib/currency';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { cacheTripsList, getCachedTripsList } from '@/lib/offline-db';
import { GlassSolid, GlassSecondary, GlassButton, GlassModal } from '@/components/glass';
import { UserAvatar } from '@/components/common/UserAvatar';

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
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-white/80 font-medium mt-0.5">
            Your travel balances, fair shares &amp; active trip ledgers
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {trips.length > 0 && (
            <GlassButton
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4 stroke-[2.5]" />}
              onClick={handleOpenAddExpense}
            >
              Add expense
            </GlassButton>
          )}

          {/* Friends Link */}
          <button
            onClick={() => navigate('/friends')}
            className="w-10 h-10 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer border border-white/30 shadow-xs relative"
            title="Friends & Connections"
            aria-label="Friends & Connections"
          >
            <Users className="w-5 h-5 text-white/90" />
          </button>

          {/* Moments & Feed Link */}
          <button
            onClick={() => navigate('/feed')}
            className="w-10 h-10 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer border border-white/30 shadow-xs relative"
            title="Travel Moments & Memories"
            aria-label="Travel Moments & Memories"
          >
            <Camera className="w-5 h-5 text-white/90" />
          </button>

          {/* Messages Link */}
          <button
            onClick={() => navigate('/messages')}
            className="w-10 h-10 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer border border-white/30 shadow-xs relative"
            title="Messages"
            aria-label="Messages"
          >
            <MessageCircle className="w-5 h-5 text-white/90" />
          </button>

          {/* Profile Avatar */}
          <button
            onClick={() => navigate('/profile')}
            className="cursor-pointer active:scale-95 transition-transform rounded-2xl focus:outline-hidden"
            title={user?.full_name || 'Profile'}
            aria-label="Profile"
          >
            <UserAvatar
              name={user?.full_name}
              avatarUrl={user?.avatar_url}
              size="md"
              shape="rounded-2xl"
            />
          </button>
        </div>
      </header>

      {/* --- Loading State: Skeleton Loaders (No spinners) --- */}
      {loading ? (
        <div className="space-y-6 mt-2" aria-busy="true" aria-label="Loading dashboard">
          <div className="glass-solid p-6 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6 rounded-3xl">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <div className="w-20 h-3.5 bg-white/20 rounded animate-pulse mb-2" />
                <div className="w-28 h-7 bg-white/20 rounded animate-pulse" />
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="w-24 h-4 bg-white/20 rounded animate-pulse" />
            <div className="glass-card p-4 rounded-3xl space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl animate-pulse" />
                    <div className="space-y-1.5">
                      <div className="w-36 h-4 bg-white/20 rounded animate-pulse" />
                      <div className="w-24 h-3 bg-white/20 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="w-16 h-5 bg-white/20 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* --- Summary Block: 4 Clear Financial Metrics (Apple Frosted Solid Glass) --- */}
          <section className="glass-solid p-5 sm:p-6 shadow-xl border border-white/40 rounded-3xl">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-white/75 block mb-1">
                  Total Expenses
                </span>
                <span className="text-xl sm:text-2xl font-bold tabular-nums font-mono tracking-tight text-white drop-shadow-xs">
                  {formatPaise(totalExpensesPaise)}
                </span>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-white/75 block mb-1">
                  Your Fair Share
                </span>
                <span className="text-xl sm:text-2xl font-bold tabular-nums font-mono tracking-tight text-white drop-shadow-xs">
                  {formatPaise(totalSharePaise)}
                </span>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-white/75 block mb-1">
                  You Paid
                </span>
                <span className="text-xl sm:text-2xl font-bold tabular-nums font-mono tracking-tight text-white drop-shadow-xs">
                  {formatPaise(totalSpentPaise)}
                </span>
              </div>
              <div>
                {totalOwePaise > totalOwedPaise ? (
                  <>
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-300 block mb-1">
                      You Owe
                    </span>
                    <span className="text-xl sm:text-2xl font-bold tabular-nums font-mono tracking-tight text-rose-300 drop-shadow-xs">
                      {formatPaise(totalOwePaise - totalOwedPaise)}
                    </span>
                  </>
                ) : totalOwedPaise > totalOwePaise ? (
                  <>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 block mb-1">
                      You Get Back
                    </span>
                    <span className="text-xl sm:text-2xl font-bold tabular-nums font-mono tracking-tight text-emerald-300 drop-shadow-xs">
                      {formatPaise(totalOwedPaise - totalOwePaise)}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-xs font-bold uppercase tracking-wider text-white/75 block mb-1">
                      Net Balance
                    </span>
                    <span className="text-xl sm:text-2xl font-bold tracking-tight text-white/90">
                      Settled Up
                    </span>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* --- Quick Access Shortcuts: Friends & Travel Memories --- */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div
              onClick={() => navigate('/friends')}
              className="glass-card p-3.5 rounded-2xl flex items-center gap-3 cursor-pointer hover:bg-white/15 active:scale-[0.98] transition-all group border border-white/25 shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs sm:text-sm font-bold text-white block truncate">
                  Friends
                </span>
                <span className="text-[11px] text-white/70 block truncate">
                  Find &amp; manage friends
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-white/50 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>

            <div
              onClick={() => navigate('/feed')}
              className="glass-card p-3.5 rounded-2xl flex items-center gap-3 cursor-pointer hover:bg-white/15 active:scale-[0.98] transition-all group border border-white/25 shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 text-purple-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Camera className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs sm:text-sm font-bold text-white block truncate">
                  Memories
                </span>
                <span className="text-[11px] text-white/70 block truncate">
                  Trip feed &amp; snapshots
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-white/50 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
          </div>

          {/* --- Trips List (Feed Rows) --- */}
          <section className="mt-8 space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-white/80">
                Active Trips
              </h2>
              {trips.length > 0 && (
                <span className="text-xs font-semibold text-[var(--theme-accent,#22C55E)] bg-white/15 px-2.5 py-0.5 rounded-full border border-white/25">
                  {trips.length} {trips.length === 1 ? 'trip' : 'trips'}
                </span>
              )}
            </div>

            {trips.length === 0 ? (
              <GlassSecondary className="py-12 px-6 text-center rounded-3xl my-3">
                <Compass className="w-10 h-10 text-white/60 mx-auto mb-3" />
                <p className="text-base font-bold text-white mb-1.5">No trips yet</p>
                <p className="text-xs text-white/75 mb-6 max-w-sm mx-auto font-medium">
                  Create a journey to start sharing expenses and tracking split settlements with your group.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <GlassButton
                    variant="primary"
                    onClick={() => navigate('/trips/new')}
                  >
                    Create your first trip
                  </GlassButton>
                  <GlassButton
                    variant="secondary"
                    onClick={() => navigate('/trips/join')}
                  >
                    Join with code
                  </GlassButton>
                </div>
              </GlassSecondary>
            ) : (
              <div className="glass-card rounded-3xl p-2 sm:p-3 divide-y divide-white/10">
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
                      className="py-3.5 px-3 rounded-2xl hover:bg-white/15 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between group"
                    >
                      {/* Left + Middle */}
                      <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-3">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 text-white font-bold text-base flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                          {initial}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-sm sm:text-base text-white truncate drop-shadow-xs">
                            {trip.name}
                          </h3>
                          <p className="text-xs text-white/75 font-medium mt-0.5 truncate">
                            {membersCount} {membersCount === 1 ? 'person' : 'people'} &bull; {expensesCount} {expensesCount === 1 ? 'expense' : 'expenses'}
                          </p>
                        </div>
                      </div>

                      {/* Right: Your Balance */}
                      <div className="text-right shrink-0 ml-3">
                        {userReceives > 0 ? (
                          <>
                            <span className="text-sm sm:text-base font-bold tabular-nums font-mono text-emerald-300 drop-shadow-xs block">
                              +{formatPaise(userReceives, trip.currency)}
                            </span>
                            <span className="text-[10px] font-semibold text-emerald-300">
                              you're owed
                            </span>
                          </>
                        ) : userOwes > 0 ? (
                          <>
                            <span className="text-sm sm:text-base font-bold tabular-nums font-mono text-rose-300 drop-shadow-xs block">
                              -{formatPaise(userOwes, trip.currency)}
                            </span>
                            <span className="text-[10px] font-semibold text-rose-300">
                              you owe
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-sm font-semibold tabular-nums font-mono text-white/80 block">
                              {formatPaise(0, trip.currency)}
                            </span>
                            <span className="text-[10px] font-medium text-white/60">
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

          {/* --- Quick Access Shortcuts: Friends & Travel Memories --- */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div
              onClick={() => navigate('/friends')}
              className="glass-card p-3.5 rounded-2xl flex items-center gap-3 cursor-pointer hover:bg-white/15 active:scale-[0.98] transition-all group border border-white/25 shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs sm:text-sm font-bold text-white block truncate">
                  Friends
                </span>
                <span className="text-[11px] text-white/70 block truncate">
                  Find &amp; manage friends
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-white/50 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>

            <div
              onClick={() => navigate('/feed')}
              className="glass-card p-3.5 rounded-2xl flex items-center gap-3 cursor-pointer hover:bg-white/15 active:scale-[0.98] transition-all group border border-white/25 shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 text-purple-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Camera className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs sm:text-sm font-bold text-white block truncate">
                  Memories
                </span>
                <span className="text-[11px] text-white/70 block truncate">
                  Trip feed &amp; snapshots
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-white/50 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
          </div>

          {/* --- Recent Activity List (Feed Rows) --- */}
          <section className="mt-8 mb-24 sm:mb-12">
            <h2 className="text-xs font-bold uppercase tracking-wider text-white/80 mb-2.5 px-1">
              Recent activity
            </h2>

            {recentExpenses.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-white/60">No recent activity.</p>
              </div>
            ) : (
              <div className="glass-card rounded-3xl p-2 sm:p-3 divide-y divide-white/10">
                {recentExpenses.map((exp) => {
                  const initial = exp.category ? exp.category.charAt(0).toUpperCase() : 'E';

                  return (
                    <div
                      key={exp.id}
                      onClick={() => navigate(`/trips/${exp.trip_id}`)}
                      className="py-3 px-3 rounded-2xl hover:bg-white/15 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between group"
                    >
                      {/* Left: Category avatar */}
                      <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                        <div className="w-9 h-9 rounded-xl bg-white/20 border border-white/30 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                          {initial}
                        </div>

                        {/* Middle: Description with relative time */}
                        <div className="flex items-center min-w-0 flex-1 truncate">
                          <span className="text-sm font-semibold text-white truncate drop-shadow-xs">
                            {exp.description}
                          </span>
                          <span className="text-xs text-white/60 shrink-0 ml-1.5">
                            &bull; {formatRelativeTime(exp.created_at || exp.date)}
                          </span>
                        </div>
                      </div>

                      {/* Right: Amount */}
                      <div className="text-right shrink-0 ml-3">
                        <span className="text-sm font-bold font-mono tabular-nums text-white drop-shadow-xs">
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

      {/* --- Trip Picker Modal (GlassModal) --- */}
      <GlassModal
        isOpen={isTripPickerOpen}
        onClose={() => setIsTripPickerOpen(false)}
        title="Select a Trip"
        maxWidth="sm"
      >
        <div className="divide-y divide-white/15 max-h-60 overflow-y-auto -mx-2 px-2">
          {trips.map((trip) => (
            <button
              key={trip.id}
              onClick={() => {
                setIsTripPickerOpen(false);
                navigate(`/trips/${trip.id}?action=add-expense`);
              }}
              className="w-full text-left py-3 px-3 flex items-center justify-between hover:bg-white/15 rounded-xl transition-colors cursor-pointer"
            >
              <span className="text-sm font-semibold text-white truncate drop-shadow-xs">
                {trip.name}
              </span>
              <span className="text-xs text-white/75 shrink-0 ml-2 bg-white/15 px-2 py-0.5 rounded-full">
                {trip.members_count || 1} {trip.members_count === 1 ? 'person' : 'people'}
              </span>
            </button>
          ))}
        </div>

        <div className="pt-3 border-t border-white/15 mt-3">
          <button
            onClick={() => {
              setIsTripPickerOpen(false);
              navigate('/trips/new');
            }}
            className="w-full py-2 text-xs font-bold text-center text-[var(--theme-accent,#22C55E)] hover:underline cursor-pointer"
          >
            + Create a new trip
          </button>
        </div>
      </GlassModal>
    </div>
  );
};

export default DashboardPage;
