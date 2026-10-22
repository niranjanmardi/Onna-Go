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
  Sparkles,
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
    <div className="flex-1 p-5 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 font-['Plus_Jakarta_Sans']">
              Trips & Rides
            </h1>
            <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
              ஒண்ணா போ
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage your motorcycle tours, road journeys, weekend getaways, and shared expenses.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsJoinOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-sm transition-all"
          >
            <KeyRound className="w-4 h-4 text-orange-500" />
            <span>Join with Code</span>
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/25 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create Trip</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500 mt-3">Loading your trips...</p>
        </div>
      ) : trips.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Compass className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No trips recorded yet</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Ready to ride together and split smarter? Create a new trip or join your friends with an invite code.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm py-2.5 px-5 rounded-xl shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New Trip</span>
            </button>
            <button
              onClick={() => setIsJoinOpen(true)}
              className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold text-sm py-2.5 px-5 rounded-xl shadow-sm transition-all"
            >
              <KeyRound className="w-4 h-4 text-orange-500" />
              <span>Join Trip</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {trips.map((trip) => (
            <div
              key={trip.id}
              onClick={() => navigate(`/trips/${trip.id}`)}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:border-indigo-400/80 hover:shadow-md cursor-pointer transition-all duration-200 flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold tracking-wide uppercase px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {trip.currency}
                  </span>
                  <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{trip.members_count} members</span>
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mt-3 group-hover:text-indigo-600 transition-colors truncate">
                  {trip.name}
                </h3>

                {trip.destination && (
                  <p className="text-xs text-slate-600 font-medium flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                    <span className="truncate">{trip.destination}</span>
                  </p>
                )}

                {trip.description && (
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    {trip.description}
                  </p>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                    Total Pool
                  </span>
                  <span className="text-base font-black font-mono text-slate-900">
                    {formatPaise(trip.total_expenses_paise, trip.currency)}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform">
                  <span>Open</span>
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
