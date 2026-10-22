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
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { Trip } from '@/types';
import { formatPaise, formatDate } from '@/lib/currency';
import { CreateTripModal } from './CreateTripModal';
import { JoinTripModal } from './JoinTripModal';

export const TripsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const data = await api.get<Trip[]>('/trips/');
      setTrips(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load trips.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const handleTripCreated = (newTrip: Trip) => {
    setTrips([newTrip, ...trips]);
    navigate(`/trips/${newTrip.id}`);
  };

  const handleTripJoined = (joinedTrip: Trip) => {
    setTrips([joinedTrip, ...trips]);
    navigate(`/trips/${joinedTrip.id}`);
  };

  return (
    <div className="flex-1 p-5 md:p-8 max-w-6xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#171717] font-['Plus_Jakarta_Sans']">
              Trips &amp; Rides
            </h1>
            <span className="text-[11px] font-semibold text-[#16834A] bg-[#DDF5E5] px-2 py-0.5 rounded-md border border-[#C6ECCF]">
              ஒண்ணா போ
            </span>
          </div>
          <p className="text-sm text-[#737373] mt-1">
            Manage your motorcycle tours, road journeys, weekend getaways, and shared expenses.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsJoinOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-[#171717] bg-white hover:bg-[#F4F4F2] border border-[#E8E8E5] rounded-xl shadow-xs transition-colors"
          >
            <KeyRound className="w-4 h-4 text-[#737373]" />
            <span>Join with Code</span>
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-[#16834A] hover:bg-[#136F3F] rounded-xl shadow-xs transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Create Trip</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#FFE4E6] border border-[#FDA4AF] text-[#E11D48] text-sm flex items-center gap-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#E8E8E5] border-t-[#16834A] rounded-full animate-spin mb-3" />
          <p className="text-sm text-[#737373]">Loading trips...</p>
        </div>
      ) : trips.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8E8E5] p-12 text-center max-w-lg mx-auto shadow-xs">
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
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#16834A] hover:bg-[#136F3F] text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors"
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
                    <span>{trip.members_count || 1} members</span>
                  </span>
                </div>

                <h3 className="text-lg font-bold text-[#171717] mt-3 tracking-tight truncate">
                  {trip.name}
                </h3>

                {trip.destination && (
                  <p className="text-xs text-[#737373] mt-1 flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-[#16834A] flex-shrink-0" />
                    <span>{trip.destination}</span>
                  </p>
                )}

                {trip.description && !trip.destination && (
                  <p className="text-xs text-[#737373] mt-1 line-clamp-1">
                    {trip.description}
                  </p>
                )}

                {trip.start_date && (
                  <p className="text-[11px] text-[#A3A3A3] mt-2 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(trip.start_date)} {trip.end_date ? `— ${formatDate(trip.end_date)}` : ''}</span>
                  </p>
                )}
              </div>

              <div className="mt-6 pt-3.5 border-t border-[#F4F4F2] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#A3A3A3] uppercase font-semibold block">Total Expenses</span>
                  <span className="text-base font-bold font-mono text-[#171717] tabular-nums">
                    {formatPaise(trip.total_expenses_paise, trip.currency)}
                  </span>
                </div>
                <div className="text-[#16834A] text-xs font-semibold flex items-center gap-0.5">
                  <span>View Trip</span>
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
