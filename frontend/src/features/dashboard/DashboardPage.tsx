import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  Receipt,
  Users,
  AlertCircle,
  ChevronRight,
  CheckCircle2,
  Clock,
  KeyRound,
  MapPin,
  Calendar,
  FileText,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { DashboardSummary } from '@/types';
import { formatPaise, formatDate } from '@/lib/currency';
import { useAuth } from '@/features/auth/AuthContext';
import { downloadHistoryPdf, downloadHistoryCsv } from '@/lib/export-utils';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

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
      <div className="flex-1 p-6 md:p-12 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#E8E8E5] border-t-[#16834A] rounded-full animate-spin" />
          <p className="text-sm font-medium text-[#737373]">Loading summary...</p>
        </div>
      </div>
    );
  }

  const firstName = user?.full_name ? user.full_name.split(' ')[0] : 'Traveler';

  return (
    <div className="flex-1 p-5 md:p-8 max-w-6xl mx-auto w-full space-y-8">
      {/* --- Personalized Welcome Header & Actions --- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#171717] font-['Plus_Jakarta_Sans']">
              Welcome back, {firstName}
            </h1>
          </div>
          <p className="text-sm text-[#737373] mt-1">
            Here is your active group travel &amp; shared balance overview.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={async () => {
              if (exportingPdf) return;
              setExportingPdf(true);
              try {
                await downloadHistoryPdf();
              } catch (err: any) {
                alert(err.message || 'Failed to download travel history PDF');
              } finally {
                setExportingPdf(false);
              }
            }}
            disabled={exportingPdf}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#171717] bg-white hover:bg-[#F4F4F2] border border-[#E8E8E5] rounded-xl shadow-xs transition-colors disabled:opacity-50"
            title="Download complete personal travel & expense history report"
          >
            {exportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#16834A]" /> : <FileText className="w-3.5 h-3.5 text-[#16834A]" />}
            <span>{exportingPdf ? 'Exporting PDF...' : 'History PDF'}</span>
          </button>
          <button
            onClick={async () => {
              if (exportingCsv) return;
              setExportingCsv(true);
              try {
                await downloadHistoryCsv();
              } catch (err: any) {
                alert(err.message || 'Failed to download travel history CSV');
              } finally {
                setExportingCsv(false);
              }
            }}
            disabled={exportingCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#171717] bg-white hover:bg-[#F4F4F2] border border-[#E8E8E5] rounded-xl shadow-xs transition-colors disabled:opacity-50"
            title="Download personal travel expenses spreadsheet"
          >
            {exportingCsv ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#16834A]" /> : <FileSpreadsheet className="w-3.5 h-3.5 text-[#16834A]" />}
            <span>{exportingCsv ? 'Exporting CSV...' : 'History CSV'}</span>
          </button>
          <button
            onClick={() => navigate('/trips/join')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#171717] bg-white hover:bg-[#F4F4F2] border border-[#E8E8E5] rounded-xl shadow-xs transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5 text-[#737373]" />
            <span>Join with Code</span>
          </button>
          <button
            onClick={() => navigate('/trips/new')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#16834A] hover:bg-[#136F3F] rounded-xl shadow-xs transition-all active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
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

      {/* --- Apple-Style Financial Overview Cards --- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Spent */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8E8E5] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#737373]">Total Spent</span>
            <div className="w-8 h-8 rounded-lg bg-[#FAFAF8] border border-[#E8E8E5] flex items-center justify-center text-[#737373]">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold font-mono tracking-tight text-[#171717] tabular-nums">
              {formatPaise(data?.total_spent_paise || 0)}
            </p>
            <p className="text-xs text-[#737373] mt-1">Across all your trips</p>
          </div>
        </div>

        {/* You Are Owed (Positive Net Balance) */}
        <div className="bg-[#DDF5E5]/40 p-5 rounded-2xl border border-[#C6ECCF] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#16834A]">You Are Owed</span>
            <div className="w-8 h-8 rounded-lg bg-[#DDF5E5] text-[#16834A] flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold font-mono tracking-tight text-[#16834A] tabular-nums">
              {formatPaise(data?.total_owed_paise || 0)}
            </p>
            <p className="text-xs text-[#16834A]/80 mt-1">Friends owe this to you</p>
          </div>
        </div>

        {/* You Owe (Negative Net Balance) */}
        <div className="bg-[#FEF3C7]/40 p-5 rounded-2xl border border-[#FDE68A] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#B45309]">You Owe</span>
            <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] text-[#B45309] flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-3xl font-bold font-mono tracking-tight text-[#B45309] tabular-nums">
              {formatPaise(data?.total_owe_paise || 0)}
            </p>
            <p className="text-xs text-[#B45309]/80 mt-1">To settle with friends</p>
          </div>
        </div>
      </div>

      {/* --- Main 2-Column Grid: Active Trips & Settlements --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Active Trips (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#16834A]" />
              <h2 className="text-lg font-bold text-[#171717] font-['Plus_Jakarta_Sans']">
                Active Trips ({data?.active_trips.length || 0})
              </h2>
            </div>
            <button
              onClick={() => navigate('/trips')}
              className="text-xs font-medium text-[#16834A] hover:underline flex items-center gap-0.5"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {data?.active_trips.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E8E8E5] p-10 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 bg-[#FAFAF8] border border-[#E8E8E5] text-[#737373] rounded-xl flex items-center justify-center mx-auto">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#171717]">No active trips yet</h3>
              <p className="text-sm text-[#737373] max-w-sm mx-auto">
                Planning a bike trip, road expedition, or weekend outing? Start your first trip and invite your friends.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => navigate('/trips/new')}
                  className="inline-flex items-center gap-1.5 bg-[#16834A] hover:bg-[#136F3F] text-white font-medium text-sm py-2 px-4 rounded-xl shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Trip</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data?.active_trips.map((trip) => {
                const userOwes = trip.user_owes_paise || 0;
                const userReceives = trip.user_receives_paise || 0;
                const userPaid = trip.user_contribution_paise || 0;
                const pendingCount = trip.pending_settlements_count || 0;
                const contributions = trip.member_contributions || [];

                return (
                  <div
                    key={trip.id}
                    className="bg-white p-5 rounded-2xl border border-[#E8E8E5] shadow-xs hover:border-[#16834A]/50 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      {/* Header */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#FAFAF8] text-[#16834A] border border-[#E8E8E5]">
                            {trip.currency}
                          </span>
                          {trip.destination && (
                            <span className="text-xs text-[#737373] truncate flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-[#16834A] flex-shrink-0" />
                              <span className="truncate">{trip.destination}</span>
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-[#737373] flex items-center gap-1 flex-shrink-0">
                          <Users className="w-3.5 h-3.5 text-[#A3A3A3]" />
                          <span>{trip.members_count} members</span>
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-[#171717] mt-2 font-['Plus_Jakarta_Sans'] truncate">
                        {trip.name}
                      </h3>

                      {/* Total Expenses & Your Contribution */}
                      <div className="mt-3 grid grid-cols-2 gap-2 p-3 bg-[#FAFAF8] rounded-xl border border-[#E8E8E5]/70">
                        <div>
                          <span className="text-[10px] font-semibold text-[#737373] uppercase tracking-wider block">
                            Total Expenses
                          </span>
                          <span className="text-sm font-bold font-mono text-[#171717] tabular-nums">
                            {formatPaise(trip.total_expenses_paise, trip.currency)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold text-[#737373] uppercase tracking-wider block">
                            You Paid
                          </span>
                          <span className="text-sm font-bold font-mono text-[#16834A] tabular-nums">
                            {formatPaise(userPaid, trip.currency)}
                          </span>
                        </div>
                      </div>

                      {/* Your Net Balance Status */}
                      <div className="mt-2.5 flex items-center justify-between text-xs px-1">
                        <span className="text-[#737373] font-medium">
                          You owe:{' '}
                          <strong className={userOwes > 0 ? 'text-[#B45309]' : 'text-[#171717]'}>
                            {formatPaise(userOwes, trip.currency)}
                          </strong>
                        </span>
                        <span className="text-[#737373] font-medium">
                          You will receive:{' '}
                          <strong className={userReceives > 0 ? 'text-[#16834A]' : 'text-[#171717]'}>
                            {formatPaise(userReceives, trip.currency)}
                          </strong>
                        </span>
                      </div>

                      {/* Member Contributions Summary */}
                      {contributions.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-[#F4F4F2] space-y-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#A3A3A3] block">
                            Member Contributions
                          </span>
                          <div className="space-y-1 max-h-16 overflow-y-auto">
                            {contributions.slice(0, 3).map((c) => (
                              <div key={c.user_id} className="flex items-center justify-between text-xs text-[#737373]">
                                <span className="truncate pr-2">{c.user_name}</span>
                                <span className="font-mono font-medium text-[#171717] tabular-nums flex-shrink-0">
                                  {formatPaise(c.amount_paise, trip.currency)}
                                </span>
                              </div>
                            ))}
                            {contributions.length > 3 && (
                              <p className="text-[10px] text-[#A3A3A3] italic">
                                +{contributions.length - 3} more members
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Pending Settlement Alert */}
                      {pendingCount > 0 && (
                        <div className="mt-2.5 px-2.5 py-1.5 rounded-lg bg-[#FEF3C7] border border-[#FDE68A] text-[#B45309] text-xs flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="font-medium text-[11px]">
                            {pendingCount} settlement {pendingCount === 1 ? 'request' : 'requests'} pending confirmation
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-[#F4F4F2] flex items-center justify-end gap-2">
                      <button
                        onClick={() => navigate(`/trips/${trip.id}?tab=settlements`)}
                        className="px-3 py-1.5 text-xs font-semibold text-[#171717] bg-white hover:bg-[#F4F4F2] border border-[#E8E8E5] rounded-xl shadow-xs transition-colors"
                      >
                        View Settlement
                      </button>
                      <button
                        onClick={() => navigate(`/trips/${trip.id}`)}
                        className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#16834A] hover:bg-[#136F3F] rounded-xl shadow-xs transition-colors"
                      >
                        <span>View Trip</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* --- Recent Expenses --- */}
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#16834A]" />
                <h2 className="text-lg font-bold text-[#171717] font-['Plus_Jakarta_Sans']">
                  Recent Expenses
                </h2>
              </div>
            </div>

            {data?.recent_expenses.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E8E8E5] p-6 text-center text-sm text-[#737373] shadow-xs">
                No recent expenses recorded yet.
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#E8E8E5] divide-y divide-[#F4F4F2] shadow-xs overflow-hidden">
                {data?.recent_expenses.map((exp) => (
                  <div key={exp.id} className="p-4 flex items-center justify-between hover:bg-[#FAFAF8] transition-colors">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#F4F4F2] text-[#171717] flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {exp.category[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#171717] truncate">{exp.description}</p>
                        <p className="text-xs text-[#737373]">
                          Paid by <span className="font-medium text-[#171717]">{exp.payer_name}</span> • {formatDate(exp.date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="text-sm font-bold font-mono text-[#171717] tabular-nums">
                        {formatPaise(exp.amount_paise, exp.currency)}
                      </p>
                      <span className="text-[10px] font-medium text-[#737373] bg-[#F4F4F2] px-2 py-0.5 rounded-md">
                        {exp.split_method}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Pending Settlements (1/3 width) */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#B45309]" />
              <h2 className="text-lg font-bold text-[#171717] font-['Plus_Jakarta_Sans']">
                Settlements Pending
              </h2>
            </div>
          </div>

          {data?.pending_settlements.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E8E8E5] p-6 text-center shadow-xs">
              <CheckCircle2 className="w-7 h-7 text-[#16834A] mx-auto mb-2" />
              <p className="text-sm font-bold text-[#171717]">All Settled Up</p>
              <p className="text-xs text-[#737373] mt-1">No unverified transfers currently pending.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E8E8E5] p-4 space-y-3 shadow-xs">
              {data?.pending_settlements.map((st) => (
                <div key={st.id} className="p-3.5 rounded-xl bg-[#FAFAF8] border border-[#E8E8E5] flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[#171717]">
                      {st.payer_name} ➔ {st.payee_name}
                    </p>
                    <p className="text-[11px] text-[#737373] mt-0.5">
                      via {st.payment_method} {st.reference_id ? `(${st.reference_id})` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold font-mono text-[#171717] tabular-nums">
                      {formatPaise(st.amount_paise)}
                    </span>
                    <span className="text-[10px] block text-[#B45309] font-medium">
                      Awaiting verification
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick Info Box */}
          <div className="bg-white rounded-2xl border border-[#E8E8E5] p-5 shadow-xs space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#171717]">
              Zero-Sum Assurance
            </h3>
            <p className="text-xs text-[#737373] leading-relaxed">
              All financial calculations in ONNA-GO are computed in integer paise minor units. Group balances always reconcile to zero with zero rounding discrepancies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
