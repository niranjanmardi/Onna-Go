import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  Plus,
  KeyRound,
  Users,
  MapPin,
  Calendar,
  ChevronRight,
  AlertCircle,
  Mail,
  Check,
  X,
  Loader2,
  Sparkles
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { Trip, TripInvitation } from '@/types';
import { formatPaise, formatDate } from '@/lib/currency';
import { CreateTripModal } from './CreateTripModal';
import { JoinTripModal } from './JoinTripModal';
import { useFeedback } from '@/context/FeedbackContext';
import { playSound } from '@/lib/sounds';

export const TripsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { showConfirmation } = useFeedback();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pending invitations state
  const [pendingInvitations, setPendingInvitations] = useState<TripInvitation[]>([]);
  const [processingInvId, setProcessingInvId] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);

  const fetchTripsAndInvitations = async () => {
    setLoading(true);
    try {
      const [tripsData, invData] = await Promise.all([
        api.get<Trip[]>('/trips/'),
        api.get<TripInvitation[]>('/trips/invitations/pending').catch(() => [] as TripInvitation[]),
      ]);
      setTrips(tripsData);
      setPendingInvitations(invData);
    } catch (err: any) {
      setError(err.message || 'Failed to load trips.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTripsAndInvitations();
  }, []);

  const handleTripCreated = (newTrip: Trip) => {
    setTrips([newTrip, ...trips]);
    navigate(`/trips/${newTrip.id}`);
  };

  const handleTripJoined = (joinedTrip: Trip) => {
    setTrips([joinedTrip, ...trips]);
    navigate(`/trips/${joinedTrip.id}`);
  };

  const handleAcceptInvitation = async (invId: string) => {
    setProcessingInvId(invId);
    try {
      const joinedTrip = await api.post<Trip>(`/trips/invitations/${invId}/accept`);
      setPendingInvitations((prev) => prev.filter((i) => i.id !== invId));
      setTrips((prev) => [joinedTrip, ...prev]);
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

  return (
    <div className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#171717] font-['Plus_Jakarta_Sans']">
              Trips &amp; Rides
            </h1>
          </div>
          <p className="text-sm text-[#737373] mt-1">
            Manage your motorcycle tours, road journeys, weekend getaways, and shared expenses.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsJoinOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-[#171717] bg-white hover:bg-[#F4F4F2] border border-[#E8E8E5] rounded-xl shadow-xs transition-colors"
          >
            <KeyRound className="w-4 h-4 text-[#737373]" />
            <span>Join with Code</span>
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#16834A] hover:bg-[#136F3F] rounded-xl shadow-xs transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Create Trip</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#FFE4E6] border border-[#FDA4AF] text-[#E11D48] text-sm flex items-center gap-3 animate-fadeIn">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* --- PENDING TRIP INVITATIONS BANNER --- */}
      {pendingInvitations.length > 0 && (
        <div className="bg-[#DDF5E5]/30 border border-[#C6ECCF] rounded-2xl p-5 shadow-xs space-y-3.5 animate-fadeIn">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#16834A]" />
            <h2 className="text-sm font-bold text-[#16834A] uppercase tracking-wider">
              Pending Trip Invitations ({pendingInvitations.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pendingInvitations.map((inv) => (
              <div
                key={inv.id}
                className="bg-white rounded-xl border border-[#C6ECCF] p-4 flex flex-col justify-between gap-3 shadow-2xs"
              >
                <div>
                  <h3 className="font-bold text-[#171717] text-sm">{inv.trip_name}</h3>
                  <p className="text-xs text-[#737373] mt-0.5">
                    Invited by <strong className="text-[#171717]">{inv.inviter_name}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-[#F4F4F2]">
                  <button
                    type="button"
                    onClick={() => handleAcceptInvitation(inv.id)}
                    disabled={processingInvId === inv.id}
                    className="flex-1 py-1.5 px-3 bg-[#16834A] hover:bg-[#136F3F] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    {processingInvId === inv.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>Accept &amp; Join</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeclineInvitation(inv.id)}
                    disabled={processingInvId === inv.id}
                    className="py-1.5 px-3 bg-[#FAFAF8] hover:bg-[#F4F4F2] text-[#737373] text-xs font-medium rounded-lg border border-[#E8E8E5] transition-colors"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#E8E8E5] border-t-[#16834A] rounded-full animate-spin mb-3" />
          <p className="text-sm text-[#737373]">Loading trips...</p>
        </div>
      ) : trips.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8E8E5] p-10 sm:p-12 text-center max-w-lg mx-auto shadow-xs">
          <div className="w-12 h-12 bg-[#FAFAF8] border border-[#E8E8E5] text-[#737373] rounded-xl flex items-center justify-center mx-auto mb-4">
            <Compass className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-[#171717]">No trips found</h2>
          <p className="text-sm text-[#737373] mt-1.5 leading-relaxed">
            Ready to hit the road? Create a trip now to invite friends and start tracking your shared travel expenses.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#16834A] hover:bg-[#136F3F] text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Your First Trip</span>
            </button>
            <button
              onClick={() => setIsJoinOpen(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white border border-[#E8E8E5] text-[#171717] hover:bg-[#F4F4F2] px-4 py-2.5 rounded-xl font-medium text-sm transition-colors"
            >
              <KeyRound className="w-4 h-4 text-[#737373]" />
              <span>Join with Invite Code</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {trips.map((trip) => (
            <div
              key={trip.id}
              onClick={() => navigate(`/trips/${trip.id}`)}
              className="bg-white rounded-2xl border border-[#E8E8E5] p-5 shadow-xs hover:border-[#16834A]/50 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#FAFAF8] text-[#737373] border border-[#E8E8E5]">
                    {trip.currency}
                  </span>
                  <span className="text-xs text-[#737373] flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-[#A3A3A3]" />
                    <span>{trip.members_count} members</span>
                  </span>
                </div>

                <h3 className="text-base font-bold text-[#171717] mt-3 group-hover:text-[#16834A] transition-colors">
                  {trip.name}
                </h3>

                {trip.destination && (
                  <p className="text-xs text-[#737373] flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-[#A3A3A3]" />
                    <span>{trip.destination}</span>
                  </p>
                )}

                {trip.start_date && (
                  <p className="text-xs text-[#737373] flex items-center gap-1.5 mt-1">
                    <Calendar className="w-3.5 h-3.5 text-[#A3A3A3]" />
                    <span>
                      {formatDate(trip.start_date)}
                      {trip.end_date ? ` – ${formatDate(trip.end_date)}` : ''}
                    </span>
                  </p>
                )}

                {trip.description && (
                  <p className="text-xs text-[#737373] mt-2 line-clamp-2 leading-relaxed">
                    {trip.description}
                  </p>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-[#F4F4F2] flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#737373] tracking-wider block">
                    Total Spent
                  </span>
                  <span className="text-sm font-bold font-mono text-[#171717] tabular-nums">
                    {formatPaise(trip.total_expenses_paise, trip.currency)}
                  </span>
                </div>

                <div className="flex items-center text-xs font-semibold text-[#16834A] gap-0.5">
                  <span>View Details</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateTripModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onTripCreated={handleTripCreated}
      />
      <JoinTripModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        onTripJoined={handleTripJoined}
      />
    </div>
  );
};
