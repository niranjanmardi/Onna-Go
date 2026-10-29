import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Compass,
  Plus,
  KeyRound,
  Users,
  MapPin,
  Calendar,
  ChevronRight,
  AlertCircle,
  Check,
  Loader2,
  Sparkles,
  Search,
  Filter,
  History,
  Clock,
  UserCheck,
  SlidersHorizontal,
  X
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { cacheTripsList, getCachedTripsList } from '@/lib/offline-db';
import { Trip, TripInvitation } from '@/types';
import { formatPaise, formatDate } from '@/lib/currency';
import { CreateTripModal } from './CreateTripModal';
import { JoinTripModal } from './JoinTripModal';
import { TripCelebrationModal } from '@/components/common/TripCelebrationModal';
import { useFeedback } from '@/context/FeedbackContext';
import { useAuth } from '@/features/auth/AuthContext';
import { playSound } from '@/lib/sounds';

type FilterTab = 'all' | 'active' | 'history' | 'created' | 'joined';
type SortOption = 'newest' | 'oldest' | 'expenses_desc';

export const TripsListPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { showConfirmation } = useFeedback();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pending invitations state
  const [pendingInvitations, setPendingInvitations] = useState<TripInvitation[]>([]);
  const [processingInvId, setProcessingInvId] = useState<string | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);

  // Celebration Modal state
  const [celebratedTrip, setCelebratedTrip] = useState<Trip | null>(null);
  const [isCelebrationOpen, setIsCelebrationOpen] = useState(false);

  // Filtering & Search
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Handle URL routes /trips/new, /trips/join, and /history
  useEffect(() => {
    if (location.pathname === '/trips/new') {
      setIsCreateOpen(true);
    } else if (location.pathname === '/trips/join') {
      setIsJoinOpen(true);
    } else if (location.pathname === '/history') {
      setActiveTab('history');
    }
  }, [location.pathname]);

  const fetchTripsAndInvitations = async () => {
    setLoading(true);
    try {
      const [tripsData, invData] = await Promise.all([
        api.get<Trip[]>('/trips/?include_archived=true'),
        api.get<TripInvitation[]>('/trips/invitations/pending').catch(() => [] as TripInvitation[]),
      ]);
      setTrips(tripsData);
      setPendingInvitations(invData);
      setError(null);
      // Cache trips in IndexedDB for offline view
      cacheTripsList(tripsData).catch(console.error);
    } catch (err: any) {
      // Offline fallback: try reading cached trips from IndexedDB
      const cached = await getCachedTripsList().catch(() => []);
      if (cached && cached.length > 0) {
        setTrips(cached);
        setError(null);
      } else {
        setError(err.message || 'Failed to load trips.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTripsAndInvitations();

    const handleOnline = () => {
      fetchTripsAndInvitations();
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const handleTripCreated = (newTrip: Trip) => {
    // 1. Instantly prepend to trip state
    setTrips((prev) => [newTrip, ...prev.filter((t) => t.id !== newTrip.id)]);
    // 2. Open full-screen celebration
    setCelebratedTrip(newTrip);
    setIsCelebrationOpen(true);
    // 3. Clear modal route if at /trips/new
    if (location.pathname === '/trips/new') {
      navigate('/trips', { replace: true });
    }
  };

  const handleTripJoined = (joinedTrip: Trip) => {
    setTrips((prev) => [joinedTrip, ...prev.filter((t) => t.id !== joinedTrip.id)]);
    if (location.pathname === '/trips/join') {
      navigate('/trips', { replace: true });
    }
  };

  const handleAcceptInvitation = async (invId: string) => {
    setProcessingInvId(invId);
    try {
      const joinedTrip = await api.post<Trip>(`/trips/invitations/${invId}/accept`);
      setPendingInvitations((prev) => prev.filter((i) => i.id !== invId));
      setTrips((prev) => [joinedTrip, ...prev.filter((t) => t.id !== joinedTrip.id)]);
      showConfirmation({
        title: 'Trip invitation accepted!',
        message: `You joined ${joinedTrip.name}.`,
        sound: 'trip_success',
      });
      navigate(`/trips/${joinedTrip.id}`);
    } catch (err: any) {
      playSound('error');
      setError(err.message || 'Failed to accept invitation.');
    } finally {
      setProcessingInvId(null);
    }
  };

  const handleDeclineInvitation = async (invId: string) => {
    setProcessingInvId(invId);
    try {
      await api.post(`/trips/invitations/${invId}/decline`);
      setPendingInvitations((prev) => prev.filter((i) => i.id !== invId));
      showConfirmation({
        title: 'Invitation declined',
        sound: 'click',
      });
    } catch (err: any) {
      playSound('error');
      setError(err.message || 'Failed to decline invitation.');
    } finally {
      setProcessingInvId(null);
    }
  };

  // Helper to determine trip status and ownership (explicit completion)
  const isTripCompleted = (trip: Trip) => {
    if (trip.status === 'COMPLETED') return true;
    if (trip.completed_at) return true;
    if (trip.is_archived) return true;
    return false;
  };

  const isTripOwner = (trip: Trip) => {
    if (trip.user_role) return trip.user_role === 'OWNER';
    return trip.created_by_id === user?.id;
  };

  // Compute counts for tabs
  const counts = useMemo(() => {
    let active = 0;
    let history = 0;
    let created = 0;
    let joined = 0;

    trips.forEach((t) => {
      const completed = isTripCompleted(t);
      if (completed) history++;
      else active++;

      if (isTripOwner(t)) created++;
      else joined++;
    });

    return { all: trips.length, active, history, created, joined };
  }, [trips, user]);

  // Filter & Search logic
  const filteredTrips = useMemo(() => {
    return trips
      .filter((trip) => {
        // Tab filtering
        const completed = isTripCompleted(trip);
        const owner = isTripOwner(trip);

        if (activeTab === 'active' && completed) return false;
        if (activeTab === 'history' && !completed) return false;
        if (activeTab === 'created' && !owner) return false;
        if (activeTab === 'joined' && owner) return false;

        // Search query filtering
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = trip.name.toLowerCase().includes(q);
          const matchDest = trip.destination ? trip.destination.toLowerCase().includes(q) : false;
          const matchDesc = trip.description ? trip.description.toLowerCase().includes(q) : false;
          if (!matchName && !matchDest && !matchDesc) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        if (sortBy === 'expenses_desc') {
          return b.total_expenses_paise - a.total_expenses_paise;
        }
        return 0;
      });
  }, [trips, activeTab, searchQuery, sortBy, user]);

  return (
    <div className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#171717] dark:text-[#EDEDED]">
            Trips
          </h1>
          <p className="text-sm text-[#737373] dark:text-[#8E8E93] mt-1">
            Manage your journeys, explore historical rides, invite friends, and split travel expenses.
          </p>
        </div>

        {trips.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsJoinOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#737373] dark:text-[#8E8E93] hover:text-[#171717] dark:hover:text-[#EDEDED] border border-[#E8E8E5] dark:border-[#262626] rounded-xl hover:bg-[#F4F4F2] dark:hover:bg-[#1A1A1A] transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Join with code</span>
            </button>

            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#737373] dark:text-[#8E8E93] hover:text-[#171717] dark:hover:text-[#EDEDED] border border-[#E8E8E5] dark:border-[#262626] rounded-xl hover:bg-[#F4F4F2] dark:hover:bg-[#1A1A1A] transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New trip</span>
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#FFE4E6] dark:bg-[#3D1418] border border-[#FDA4AF] dark:border-[#881337] text-[#E11D48] dark:text-[#FB7185] text-sm flex items-center gap-3 animate-fadeIn">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* --- PENDING TRIP INVITATIONS BANNER --- */}
      {pendingInvitations.length > 0 && (
        <div className="bg-white dark:bg-[#141414] border border-[#E8E8E5] dark:border-[#262626] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5 animate-fadeIn">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#16834A] dark:text-[#22C55E]" />
            <h2 className="text-xs font-medium text-[#171717] dark:text-[#EDEDED]">
              Pending trip invitations ({pendingInvitations.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pendingInvitations.map((inv) => (
              <div
                key={inv.id}
                className="bg-[#FAFAF8] dark:bg-[#1A1A1A] rounded-xl border border-[#E8E8E5] dark:border-[#262626] p-4 flex flex-col justify-between gap-3 shadow-2xs"
              >
                <div>
                  <h3 className="font-semibold text-[#171717] dark:text-[#EDEDED] text-sm">{inv.trip_name}</h3>
                  <p className="text-xs text-[#737373] dark:text-[#8E8E93] mt-0.5">
                    Invited by <strong className="text-[#171717] dark:text-[#EDEDED] font-medium">{inv.inviter_name}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#E8E8E5] dark:border-[#262626]">
                  <button
                    type="button"
                    onClick={() => handleAcceptInvitation(inv.id)}
                    disabled={processingInvId === inv.id}
                    className="flex-1 py-1.5 px-3 bg-[#16834A] hover:bg-[#136F3F] dark:bg-[#22C55E] dark:hover:bg-[#1ea951] text-white dark:text-[#0A0A0A] text-xs font-medium rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                  >
                    {processingInvId === inv.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>Accept &amp; join</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeclineInvitation(inv.id)}
                    disabled={processingInvId === inv.id}
                    className="py-1.5 px-3 bg-white dark:bg-[#141414] hover:bg-[#F4F4F2] dark:hover:bg-[#222222] text-[#737373] dark:text-[#8E8E93] text-xs font-medium rounded-lg border border-[#E8E8E5] dark:border-[#262626] transition-colors cursor-pointer"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- TRIP HISTORY & FILTER BAR --- */}
      <div className="bg-white dark:bg-[#141414] rounded-2xl border border-[#E8E8E5] dark:border-[#262626] p-3 shadow-xs space-y-3">
        {/* Navigation Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F4F4F2] dark:border-[#262626] pb-3">
          <div className="flex flex-wrap items-center gap-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'all'
                  ? 'bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#0A0A0A] shadow-xs'
                  : 'text-[#737373] dark:text-[#8E8E93] hover:text-[#171717] dark:hover:text-[#EDEDED] hover:bg-[#F4F4F2] dark:hover:bg-[#1F1F1F]'
              }`}
            >
              All trips ({counts.all})
            </button>

            <button
              onClick={() => setActiveTab('active')}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'active'
                  ? 'bg-[#16834A] text-white dark:bg-[#22C55E] dark:text-[#0A0A0A] shadow-xs'
                  : 'text-[#737373] dark:text-[#8E8E93] hover:text-[#171717] dark:hover:text-[#EDEDED] hover:bg-[#F4F4F2] dark:hover:bg-[#1F1F1F]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Active ({counts.active})</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#0A0A0A] shadow-xs'
                  : 'text-[#737373] dark:text-[#8E8E93] hover:text-[#171717] dark:hover:text-[#EDEDED] hover:bg-[#F4F4F2] dark:hover:bg-[#1F1F1F]'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Trip history ({counts.history})</span>
            </button>

            <button
              onClick={() => setActiveTab('created')}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'created'
                  ? 'bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#0A0A0A] shadow-xs'
                  : 'text-[#737373] dark:text-[#8E8E93] hover:text-[#171717] dark:hover:text-[#EDEDED] hover:bg-[#F4F4F2] dark:hover:bg-[#1F1F1F]'
              }`}
            >
              Created by me ({counts.created})
            </button>

            <button
              onClick={() => setActiveTab('joined')}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-1 ${
                activeTab === 'joined'
                  ? 'bg-[#171717] text-white dark:bg-[#EDEDED] dark:text-[#0A0A0A] shadow-xs'
                  : 'text-[#737373] dark:text-[#8E8E93] hover:text-[#171717] dark:hover:text-[#EDEDED] hover:bg-[#F4F4F2] dark:hover:bg-[#1F1F1F]'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Joined ({counts.joined})</span>
            </button>
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-[#737373] dark:text-[#8E8E93]">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#A3A3A3] dark:text-[#666666]" />
            <select
              value={sortBy}
              aria-label="Sort trips by"
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-[#FAFAF8] dark:bg-[#1A1A1A] border border-[#E8E8E5] dark:border-[#262626] text-[#171717] dark:text-[#EDEDED] rounded-lg px-2 py-1 text-xs font-medium focus:outline-hidden focus:border-[#16834A] dark:focus:border-[#22C55E]"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="expenses_desc">Highest spend</option>
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#A3A3A3] dark:text-[#666666] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search trips by name, destination, or description..."
            className="w-full bg-[#FAFAF8] dark:bg-[#1A1A1A] border border-[#E8E8E5] dark:border-[#262626] text-[#171717] dark:text-[#EDEDED] placeholder-[#A3A3A3] dark:placeholder-[#666666] text-sm rounded-xl pl-9 pr-9 py-2 focus:outline-hidden focus:border-[#16834A] dark:focus:border-[#22C55E] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A3A3A3] dark:text-[#666666] hover:text-[#171717] dark:hover:text-[#EDEDED] p-0.5 rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* --- CONTENT AREA --- */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#E8E8E5] dark:border-[#262626] border-t-[#16834A] dark:border-t-[#22C55E] rounded-full animate-spin mb-3" />
          <p className="text-sm text-[#737373] dark:text-[#8E8E93]">Loading your travel history...</p>
        </div>
      ) : filteredTrips.length === 0 ? (
        <div className="bg-white dark:bg-[#141414] rounded-2xl border border-[#E8E8E5] dark:border-[#262626] p-10 sm:p-12 text-center max-w-lg mx-auto shadow-xs">
          <div className="w-12 h-12 bg-[#FAFAF8] dark:bg-[#1A1A1A] border border-[#E8E8E5] dark:border-[#262626] text-[#737373] dark:text-[#8E8E93] rounded-xl flex items-center justify-center mx-auto mb-4">
            {activeTab === 'history' ? (
              <History className="w-6 h-6 text-[#16834A] dark:text-[#22C55E]" />
            ) : (
              <Compass className="w-6 h-6" />
            )}
          </div>

          <h2 className="text-lg font-semibold text-[#171717] dark:text-[#EDEDED]">
            {searchQuery
              ? 'No matching trips found'
              : activeTab === 'history'
              ? 'No past trips in history'
              : activeTab === 'active'
              ? 'No active trips right now'
              : activeTab === 'joined'
              ? 'No joined trips yet'
              : activeTab === 'created'
              ? 'You have not created any trips yet'
              : 'No trips yet'}
          </h2>

          <p className="text-sm text-[#737373] dark:text-[#8E8E93] mt-1.5 leading-relaxed">
            {searchQuery
              ? `We couldn't find any trips matching "${searchQuery}". Try searching for another destination or trip name.`
              : activeTab === 'history'
              ? 'Completed journeys and past rides will automatically appear here to preserve your travel history and shared expenses.'
              : activeTab === 'joined'
              ? 'When friends share an invite code with you, enter it here to participate in group expenses.'
              : 'Create a trip now to invite friends and start tracking your shared travel expenses.'}
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="inline-flex items-center justify-center gap-2 bg-[#FAFAF8] dark:bg-[#1A1A1A] border border-[#E8E8E5] dark:border-[#262626] text-[#171717] dark:text-[#EDEDED] hover:bg-[#F4F4F2] dark:hover:bg-[#222222] px-4 py-2 rounded-xl font-medium text-sm transition-colors cursor-pointer"
              >
                Clear search
              </button>
            ) : (
              <>
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#16834A] hover:bg-[#136F3F] dark:bg-[#22C55E] dark:hover:bg-[#1ea951] text-white dark:text-[#0A0A0A] px-5 py-2.5 rounded-xl font-medium text-sm transition-colors shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create your first trip</span>
                </button>
                <button
                  onClick={() => setIsJoinOpen(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white dark:bg-[#1A1A1A] border border-[#E8E8E5] dark:border-[#262626] text-[#171717] dark:text-[#EDEDED] hover:bg-[#F4F4F2] dark:hover:bg-[#222222] px-5 py-2.5 rounded-xl font-medium text-sm transition-colors cursor-pointer"
                >
                  <KeyRound className="w-4 h-4 text-[#737373] dark:text-[#8E8E93]" />
                  <span>Join with code</span>
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTrips.map((trip) => {
            const completed = isTripCompleted(trip);
            const owner = isTripOwner(trip);

            return (
              <div
                key={trip.id}
                onClick={() => navigate(`/trips/${trip.id}`)}
                className="bg-white dark:bg-[#141414] rounded-2xl border border-[#E8E8E5] dark:border-[#262626] p-5 shadow-xs hover:border-[#16834A]/50 dark:hover:border-[#22C55E]/50 transition-all duration-200 cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  {/* Badges Bar: Currency, Status & Ownership */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Active vs Completed Status Badge */}
                      {completed ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-[#222222] text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-[#333333]">
                          <Check className="w-3 h-3 text-neutral-500" />
                          <span>History</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Active</span>
                        </span>
                      )}

                      {/* Owner vs Member Badge */}
                      {owner ? (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#FAFAF8] dark:bg-[#1B1B1E] text-[#18181B] dark:text-[#F5F5F7] border border-[#E4E4E7] dark:border-[#2A2A2E]">
                          Owner
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-neutral-50 dark:bg-[#1B1B1E] text-neutral-600 dark:text-[#A1A1AA] border border-neutral-200 dark:border-[#2A2A2E]">
                          Member
                        </span>
                      )}
                    </div>

                    <span className="text-xs text-[#737373] dark:text-[#8E8E93] flex items-center gap-1 shrink-0">
                      <Users className="w-3.5 h-3.5 text-[#A3A3A3] dark:text-[#666666]" />
                      <span>{trip.members_count}</span>
                    </span>
                  </div>

                  {/* Trip Title */}
                  <h3 className="text-base font-semibold text-[#171717] dark:text-[#EDEDED] group-hover:text-[#16834A] dark:group-hover:text-[#22C55E] transition-colors tracking-tight line-clamp-1">
                    {trip.name}
                  </h3>

                  {/* Destination */}
                  {trip.destination && (
                    <p className="text-xs text-[#737373] dark:text-[#8E8E93] flex items-center gap-1.5 mt-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#16834A] dark:text-[#22C55E] shrink-0" />
                      <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate">{trip.destination}</span>
                    </p>
                  )}

                  {/* Dates */}
                  {trip.start_date && (
                    <p className="text-xs text-[#737373] dark:text-[#8E8E93] flex items-center gap-1.5 mt-1">
                      <Calendar className="w-3.5 h-3.5 text-[#737373] dark:text-[#8E8E93] shrink-0" />
                      <span>
                        {formatDate(trip.start_date)}
                        {trip.end_date ? ` – ${formatDate(trip.end_date)}` : ''}
                      </span>
                    </p>
                  )}

                  {/* Description */}
                  {trip.description && (
                    <p className="text-xs text-[#737373] dark:text-[#8E8E93] mt-2 line-clamp-2 leading-relaxed">
                      {trip.description}
                    </p>
                  )}
                </div>

                {/* Card Footer */}
                <div className="mt-5 pt-3 border-t border-[#F4F4F2] dark:border-[#262626] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-medium text-[#737373] dark:text-[#8E8E93] block">
                      Total spent
                    </span>
                    <span className="text-sm font-semibold font-mono text-[#171717] dark:text-[#EDEDED] tabular-nums">
                      {formatPaise(trip.total_expenses_paise, trip.currency)}
                    </span>
                  </div>

                  <div className="flex items-center text-xs font-medium text-[#16834A] dark:text-[#22C55E] gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    <span>View trip</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <CreateTripModal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          if (location.pathname === '/trips/new') {
            navigate('/trips', { replace: true });
          }
        }}
        onTripCreated={handleTripCreated}
      />

      <JoinTripModal
        isOpen={isJoinOpen}
        onClose={() => {
          setIsJoinOpen(false);
          if (location.pathname === '/trips/join') {
            navigate('/trips', { replace: true });
          }
        }}
        onTripJoined={handleTripJoined}
      />

      {/* Reusable Full-Screen Trip Creation Celebration */}
      <TripCelebrationModal
        isOpen={isCelebrationOpen}
        trip={celebratedTrip}
        onClose={() => setIsCelebrationOpen(false)}
        onViewTrip={(trip) => {
          setIsCelebrationOpen(false);
          navigate(`/trips/${trip.id}`);
        }}
        onGoDashboard={() => {
          setIsCelebrationOpen(false);
          navigate('/dashboard');
        }}
      />
    </div>
  );
};
