import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  TrendingUp,
  Receipt,
  Users,
  AlertCircle,
  Calendar,
  ChevronRight,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { DashboardSummary } from '@/types';
import { formatPaise, formatDate } from '@/lib/currency';
import { useAuth } from '@/features/auth/AuthContext';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get<DashboardSummary>('/dashboard/summary');
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard summary.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 p-6 md:p-10 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading your ONNA-GO balances...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-5 md:p-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Header with Greeting & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 font-['Plus_Jakarta_Sans']">
            Namaste, {user?.full_name?.split(' ')[0]} 🏍️
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Ride Together. Split Smarter. Here is your trip financial summary.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/trips/join')}
            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-sm transition-all"
          >
            Join with Code
          </button>
          <button
            onClick={() => navigate('/trips/new')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-600/30 transition-all active:scale-95"
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

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Total Spent */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Spent</span>
            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black font-mono tracking-tight text-slate-900">
              {formatPaise(data?.total_spent_paise || 0)}
            </p>
            <p className="text-xs text-slate-400 mt-1">Across all your active journeys</p>
          </div>
        </div>

        {/* You Are Owed (Positive Net Balance) */}
        <div className="bg-white p-6 rounded-2xl border border-emerald-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">You Are Owed</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black font-mono tracking-tight text-emerald-600">
              {formatPaise(data?.total_owed_paise || 0)}
            </p>
            <p className="text-xs text-emerald-600/70 mt-1">Riders owe this to you</p>
          </div>
        </div>

        {/* You Owe (Negative Net Balance) */}
        <div className="bg-white p-6 rounded-2xl border border-amber-200/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">You Owe</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black font-mono tracking-tight text-amber-600">
              {formatPaise(data?.total_owe_paise || 0)}
            </p>
            <p className="text-xs text-amber-600/70 mt-1">To settle with friends</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Trips & Settlements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Active Trips (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                Active Trips & Expeditions ({data?.active_trips.length || 0})
              </h2>
            </div>
            <button
              onClick={() => navigate('/trips')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {data?.active_trips.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-4">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
                <Compass className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No active trips yet!</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                Planning a bike trip to Ladakh, weekend in Goa, or road trip with buddies? Start a trip and invite everyone.
              </p>
              <button
                onClick={() => navigate('/trips/new')}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm py-2.5 px-5 rounded-xl shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Create Your First Trip</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data?.active_trips.map((trip) => (
                <div
                  key={trip.id}
                  onClick={() => navigate(`/trips/${trip.id}`)}
                  className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-indigo-400/80 hover:shadow-md cursor-pointer transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                        {trip.currency}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        <span>{trip.members_count} riders</span>
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 mt-2 truncate">
                      {trip.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                      {trip.destination ? `📍 ${trip.destination}` : trip.description || 'No destination specified'}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Pool</span>
                      <span className="text-sm font-bold font-mono text-slate-800">
                        {formatPaise(trip.total_expenses_paise, trip.currency)}
                      </span>
                    </div>
                    <div className="text-indigo-600 text-xs font-semibold flex items-center gap-0.5">
                      <span>View</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recent Group Expenses */}
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                  Recent Expenses
                </h2>
              </div>
            </div>

            {data?.recent_expenses.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 text-center text-sm text-slate-500">
                No recent expenses recorded yet.
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 shadow-sm overflow-hidden">
                {data?.recent_expenses.map((exp) => (
                  <div key={exp.id} className="p-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {exp.category[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{exp.description}</p>
                        <p className="text-xs text-slate-400">
                          Paid by <span className="font-medium text-slate-600">{exp.payer_name}</span> • {formatDate(exp.date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="text-sm font-bold font-mono text-slate-900">
                        {formatPaise(exp.amount_paise, exp.currency)}
                      </p>
                      <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        {exp.split_method}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Pending Settlements & Help (1/3 width) */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                Settlements Pending
              </h2>
            </div>
          </div>

          {data?.pending_settlements.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">All Settled Up!</p>
              <p className="text-xs text-slate-400 mt-1">No unverified transfers currently pending.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3 shadow-sm">
              {data?.pending_settlements.map((st) => (
                <div key={st.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      {st.payer_name} ➔ {st.payee_name}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      via {st.payment_method} {st.reference_id ? `(${st.reference_id})` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold font-mono text-indigo-600">
                      {formatPaise(st.amount_paise)}
                    </p>
                    <span className="text-[9px] font-bold text-amber-600 uppercase bg-amber-50 px-1.5 py-0.5 rounded">
                      Pending
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ONNA-GO Pro-Tips Card */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-lg space-y-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-orange-400">ONNA-GO Rule of Thumb • ஒண்ணா போ</span>
            <h4 className="text-sm font-bold">Automatic Debt Simplification</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              If Alice owes Bob ₹500 and Bob owes Charlie ₹500, ONNA-GO automatically recommends that Alice pays Charlie ₹500 directly, cutting 50% of the transactions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
