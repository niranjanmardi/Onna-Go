import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Compass,
  Plus,
  Users,
  MapPin,
  Calendar,
  Receipt,
  Scale,
  HandCoins,
  Copy,
  Check,
  TrendingDown,
  PieChart,
  Sliders,
  AlertCircle,
  Clock,
  ShieldCheck,
  Download,
  FileSpreadsheet,
  FileText,
  Trash2,
  UserPlus,
  X,
  Loader2,
  Smartphone,
  ExternalLink,
  Share2,
  Trophy,
  CheckCircle2,
  RotateCcw,
  Filter,
} from 'lucide-react';
import { api, getAvatarUrl } from '@/lib/api-client';
import {
  Trip,
  TripMember,
  Expense,
  TripBalances,
  SettlementSuggestion,
  Settlement,
  Activity,
  Budget,
  TripReport,
  Friend,
  TripInvitation,
} from '@/types';
import { formatPaise, formatDate } from '@/lib/currency';
import { useAuth } from '@/features/auth/AuthContext';
import { AddExpenseModal } from '@/features/expenses/AddExpenseModal';
import { RecordSettlementModal } from '@/features/settlements/RecordSettlementModal';
import { TripSummaryModal } from '@/features/trips/TripSummaryModal';
import { useFeedback } from '@/context/FeedbackContext';
import { playSound } from '@/lib/sounds';
import { downloadTripPdf, downloadTripCsv } from '@/lib/export-utils';

export const TripDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showConfirmation } = useFeedback();
  const navigate = useNavigate();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<TripBalances | null>(null);
  const [suggestions, setSuggestions] = useState<SettlementSuggestion[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [report, setReport] = useState<TripReport | null>(null);

  // Invitations state
  const [invitations, setInvitations] = useState<TripInvitation[]>([]);
  const [isInviteFriendsOpen, setIsInviteFriendsOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriendsToInvite, setSelectedFriendsToInvite] = useState<string[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [sendingInvites, setSendingInvites] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'expenses' | 'balances' | 'settlements' | 'activities' | 'budgets' | 'reports' | 'members'>('expenses');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isRecordSettlementOpen, setIsRecordSettlementOpen] = useState(false);
  const [settlePayer, setSettlePayer] = useState<string | undefined>(undefined);
  const [settlePayee, setSettlePayee] = useState<string | undefined>(undefined);
  const [settleAmount, setSettleAmount] = useState<number | undefined>(undefined);
  const [settlePaymentMethod, setSettlePaymentMethod] = useState<string>('CASH');

  // Export states
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);

  // Trip Completion & Summary Modal
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isCompleteTripConfirmOpen, setIsCompleteTripConfirmOpen] = useState(false);
  const [completingTrip, setCompletingTrip] = useState(false);

  // Filters & Location
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('All');
  const [expensePayerFilter, setExpensePayerFilter] = useState('All');
  const [expenseStartDate, setExpenseStartDate] = useState('');
  const [expenseEndDate, setExpenseEndDate] = useState('');
  const [reportCategoryFilter, setReportCategoryFilter] = useState('All');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLocation, setCopiedLocation] = useState(false);

  const loadAllTripData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [
        tripData,
        membersData,
        expensesData,
        balancesData,
        suggestionsData,
        settlementsData,
        activitiesData,
        budgetsData,
        reportData,
      ] = await Promise.all([
        api.get<Trip>(`/trips/${id}`),
        api.get<TripMember[]>(`/trips/${id}/members`),
        api.get<Expense[]>(`/expenses/trip/${id}`),
        api.get<TripBalances>(`/balances/trip/${id}`),
        api.get<{ suggestions: SettlementSuggestion[] }>(`/balances/trip/${id}/suggestions`),
        api.get<Settlement[]>(`/settlements/trip/${id}`),
        api.get<Activity[]>(`/activities/trip/${id}`),
        api.get<Budget[]>(`/budgets/trip/${id}`),
        api.get<TripReport>(`/reports/trip/${id}`),
      ]);

      setTrip(tripData);
      setMembers(membersData);
      setExpenses(expensesData);
      setBalances(balancesData);
      setSuggestions(suggestionsData.suggestions);
      setSettlements(settlementsData);
      setActivities(activitiesData);
      setBudgets(budgetsData);
      setReport(reportData);

      // Load trip invitations (owner/admin)
      try {
        const invData = await api.get<TripInvitation[]>(`/trips/${id}/invitations`);
        setInvitations(invData);
      } catch {
        setInvitations([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load trip details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllTripData();
  }, [id]);

  const currentUserMember = members.find((m) => m.user_id === user?.id);
  const isOwnerOrAdmin = currentUserMember?.role === 'OWNER' || currentUserMember?.role === 'ADMIN' || trip?.created_by_id === user?.id;

  const handleOpenInviteModal = async () => {
    setIsInviteFriendsOpen(true);
    setLoadingFriends(true);
    setSelectedFriendsToInvite([]);
    setInviteError(null);
    try {
      const data = await api.get<Friend[]>('/friends');
      setFriends(data);
    } catch {
      setFriends([]);
    } finally {
      setLoadingFriends(false);
    }
  };

  const toggleFriendToInvite = (friendId: string) => {
    setSelectedFriendsToInvite((prev) =>
      prev.includes(friendId) ? prev.filter((fId) => fId !== friendId) : [...prev, friendId]
    );
  };

  const handleSendTripInvites = async () => {
    if (selectedFriendsToInvite.length === 0) return;
    setSendingInvites(true);
    setInviteError(null);
    try {
      const res = await api.post<TripInvitation[]>(`/trips/${id}/invite`, {
        friend_ids: selectedFriendsToInvite,
      });
      setInvitations((prev) => [...res, ...prev]);
      showConfirmation({
        title: 'Trip invitations sent!',
        message: `Invitations delivered to ${selectedFriendsToInvite.length} friend(s).`,
        sound: 'notification',
      });
      setIsInviteFriendsOpen(false);
    } catch (err: any) {
      playSound('error');
      setInviteError(err.message || 'Failed to send invitations.');
    } finally {
      setSendingInvites(false);
    }
  };

  const handleCancelInvitation = async (invId: string) => {
    try {
      await api.delete(`/trips/${id}/invitations/${invId}`);
      setInvitations((prev) => prev.filter((i) => i.id !== invId));
    } catch (err: any) {
      playSound('error');
      alert(err.message || 'Failed to cancel invitation.');
    }
  };

  const handleCopyCode = () => {
    if (trip?.invite_code) {
      navigator.clipboard.writeText(trip.invite_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleVoidExpense = async (expenseId: string) => {
    if (!window.confirm('Void this expense? It will be excluded from all balance calculations.')) return;
    try {
      await api.delete(`/expenses/${expenseId}`);
      await loadAllTripData();
    } catch (err: any) {
      playSound('error');
      alert(err.message || 'Error voiding expense');
    }
  };

  const handleConfirmSettlement = async (settlementId: string) => {
    try {
      await api.put(`/settlements/${settlementId}/status`, {
        status: 'CONFIRMED',
        reason: 'Confirmed received by recipient',
      });
      showConfirmation({
        title: 'Settlement confirmed successfully',
        message: 'Effective group balances and debts have been settled.',
        sound: 'settlement_success',
      });
      await loadAllTripData();
    } catch (err: any) {
      playSound('error');
      alert(err.message || 'Failed to confirm settlement.');
    }
  };

  const handleDisputeSettlement = async (settlementId: string) => {
    const reason = window.prompt('Enter reason for dispute:');
    if (!reason) return;
    try {
      await api.put(`/settlements/${settlementId}/status`, {
        status: 'DISPUTED',
        reason,
      });
      await loadAllTripData();
    } catch (err: any) {
      alert(err.message || 'Failed to dispute settlement.');
    }
  };

  const handleRejectSettlement = async (settlementId: string) => {
    const reason = window.prompt('Enter reason for rejecting settlement confirmation (optional):') || 'Payment not received';
    try {
      await api.put(`/settlements/${settlementId}/status`, {
        status: 'REJECTED',
        reason,
      });
      showConfirmation({
        title: 'Settlement rejected',
        message: 'The settlement remains unpaid.',
        sound: 'error',
      });
      await loadAllTripData();
    } catch (err: any) {
      playSound('error');
      alert(err.message || 'Failed to reject settlement.');
    }
  };

  const handleTriggerSuggestion = (sug: SettlementSuggestion, method: 'CASH' | 'UPI' | 'BANK_TRANSFER' = 'CASH') => {
    setSettlePayer(sug.from_user_id);
    setSettlePayee(sug.to_user_id);
    setSettleAmount(sug.amount_paise);
    setSettlePaymentMethod(method);
    setIsRecordSettlementOpen(true);
  };

  const handleShareLocation = () => {
    if (!trip) return;
    const destName = trip.destination || trip.name;
    const addr = trip.destination_address ? ` (${trip.destination_address})` : '';
    const mapsLink =
      trip.destination_lat && trip.destination_lng
        ? `https://www.google.com/maps/search/?api=1&query=${trip.destination_lat},${trip.destination_lng}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trip.destination || '')}`;
    const textToCopy = `📍 ONNA-GO Trip Destination: ${destName}${addr}\nOpen in Maps: ${mapsLink}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedLocation(true);
    showConfirmation({
      title: 'Location copied!',
      message: 'Maps link and destination details copied to clipboard.',
      sound: 'notification',
    });
    setTimeout(() => setCopiedLocation(false), 2500);
  };

  const handleCompleteTrip = async () => {
    if (!id || !trip) return;
    setCompletingTrip(true);
    try {
      await api.post(`/trips/${id}/complete`);
      playSound('settlement_success');
      showConfirmation({
        title: 'Trip marked as completed!',
        message: 'All records finalized and saved to permanent history.',
        sound: 'settlement_success',
      });
      await loadAllTripData();
      setIsCompleteTripConfirmOpen(false);
      setIsSummaryModalOpen(true);
    } catch (err: any) {
      playSound('error');
      alert(err.message || 'Failed to complete trip.');
    } finally {
      setCompletingTrip(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-12 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-[#E8E8E5] border-t-[#16834A] rounded-full animate-spin mb-3" />
        <p className="text-sm font-medium text-[#737373]">Loading trip details...</p>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="p-8 max-w-md mx-auto text-center space-y-4">
        <div className="p-4 rounded-xl bg-[#FFE4E6] border border-[#FDA4AF] text-[#E11D48] text-sm">
          {error || 'Trip not found.'}
        </div>
        <button
          onClick={() => navigate('/trips')}
          className="px-4 py-2 bg-[#171717] text-white rounded-xl text-sm font-semibold"
        >
          Back to Trips
        </button>
      </div>
    );
  }

  const isTripCompleted = trip.status === 'COMPLETED' || Boolean(trip.completed_at);

  const filteredExpenses = expenses.filter((e) => {
    const matchCat =
      expenseCategoryFilter === 'All' ||
      e.category === expenseCategoryFilter ||
      (expenseCategoryFilter === 'Petrol / Fuel' && (e.category === 'Fuel' || e.category === 'Petrol')) ||
      (expenseCategoryFilter === 'Accommodation' && e.category === 'Stay') ||
      (expenseCategoryFilter === 'Miscellaneous' && e.category === 'Other');

    const matchSearch =
      !expenseSearch ||
      e.description.toLowerCase().includes(expenseSearch.toLowerCase()) ||
      e.payer_name.toLowerCase().includes(expenseSearch.toLowerCase());

    const matchPayer = expensePayerFilter === 'All' || e.payer_id === expensePayerFilter;

    const matchDateStart = !expenseStartDate || new Date(e.date) >= new Date(expenseStartDate);
    const matchDateEnd = !expenseEndDate || new Date(e.date) <= new Date(`${expenseEndDate}T23:59:59`);

    return matchCat && matchSearch && matchPayer && matchDateStart && matchDateEnd;
  });

  const categoryTotals: Record<string, number> = {};
  expenses
    .filter((e) => !e.is_void)
    .forEach((e) => {
      let cat = e.category;
      if (cat === 'Fuel') cat = 'Petrol / Fuel';
      if (cat === 'Stay') cat = 'Accommodation';
      if (cat === 'Other') cat = 'Miscellaneous';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + e.amount_paise;
    });

  return (
    <div className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full space-y-6">
      {/* --- Trip Completion Banner (if completed) --- */}
      {isTripCompleted && (
        <div className="bg-gradient-to-r from-[#DDF5E5] via-[#E8F8EE] to-[#DDF5E5] border border-[#C6ECCF] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#16834A] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-[#171717]">
                  Trip Completed &amp; Saved to Permanent History
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#16834A] text-white px-2 py-0.5 rounded-full">
                  Completed
                </span>
              </div>
              <p className="text-xs text-[#737373] mt-0.5">
                Finalized on {trip.completed_at ? formatDate(trip.completed_at) : 'recently'}. All expense allocations and debt transfers are permanent.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsSummaryModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#16834A] hover:bg-[#136F3F] text-white text-xs font-semibold rounded-xl shadow-xs transition-all shrink-0 active:scale-[0.98]"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>View Final Trip Summary</span>
          </button>
        </div>
      )}

      {/* --- Apple-Style Trip Header Card --- */}
      <div className="bg-white rounded-2xl border border-[#E8E8E5] p-6 md:p-8 shadow-xs relative overflow-hidden space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold text-[#16834A] bg-[#DDF5E5] border border-[#C6ECCF] px-2.5 py-0.5 rounded-md">
                ONNA-GO • Group Trip
              </span>
              <span className="text-[11px] font-semibold text-[#737373] bg-[#FAFAF8] border border-[#E8E8E5] px-2.5 py-0.5 rounded-md">
                {trip.currency}
              </span>
              {isTripCompleted && (
                <span className="text-[11px] font-semibold text-[#16834A] bg-[#DDF5E5] border border-[#C6ECCF] px-2.5 py-0.5 rounded-md flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Permanent History</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#171717] font-['Plus_Jakarta_Sans']">
              {trip.name}
            </h1>

            <div className="flex items-center gap-4 text-xs text-[#737373] flex-wrap">
              {trip.destination && (
                <span className="flex items-center gap-1.5 font-medium text-[#171717]">
                  <MapPin className="w-3.5 h-3.5 text-[#16834A]" />
                  <span>{trip.destination}</span>
                </span>
              )}
              {trip.start_date && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#A3A3A3]" />
                  <span>{formatDate(trip.start_date)} {trip.end_date ? `— ${formatDate(trip.end_date)}` : ''}</span>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#A3A3A3]" />
                <span>{members.length} members</span>
              </span>
            </div>
          </div>

          {/* Quick Actions & Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl p-2 px-3 flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-[#A3A3A3] font-semibold uppercase tracking-wider block">Invite Code</span>
                <span className="text-sm font-mono font-bold tracking-widest text-[#171717]">{trip.invite_code}</span>
              </div>
              <button
                onClick={handleCopyCode}
                className="p-1.5 rounded-lg bg-white hover:bg-[#F4F4F2] text-[#737373] border border-[#E8E8E5] transition-colors"
                title="Copy Code"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-[#16834A]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* End Trip Button (Owner/Admin only) */}
            {isOwnerOrAdmin && !isTripCompleted && (
              <button
                onClick={() => setIsCompleteTripConfirmOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-[#FAFAF8] border border-[#E8E8E5] text-[#171717] font-semibold py-2.5 px-3.5 rounded-xl shadow-xs transition-all active:scale-[0.98] text-sm"
              >
                <CheckCircle2 className="w-4 h-4 text-[#16834A]" />
                <span>End Trip</span>
              </button>
            )}

            {isTripCompleted && (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#DDF5E5] text-[#16834A] border border-[#C6ECCF] text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Trip Completed</span>
                </span>
                <button
                  onClick={() => setIsSummaryModalOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-[#FAFAF8] border border-[#E8E8E5] text-[#171717] font-semibold py-2.5 px-3.5 rounded-xl shadow-xs transition-all active:scale-[0.98] text-sm"
                >
                  <Trophy className="w-4 h-4 text-[#16834A]" />
                  <span>Trip Summary &amp; Report</span>
                </button>
              </div>
            )}

            <button
              onClick={() => setIsAddExpenseOpen(true)}
              className="inline-flex items-center justify-center gap-2 bg-[#16834A] hover:bg-[#136F3F] text-white font-semibold py-2.5 px-4 rounded-xl shadow-xs transition-all active:scale-[0.98] text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Record Expense</span>
            </button>
          </div>
        </div>

        {/* --- Location Map Preview & Details Card --- */}
        {(trip.destination || trip.destination_address || (trip.destination_lat && trip.destination_lng)) && (
          <div className="bg-[#FAFAF8] border border-[#E8E8E5] rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#DDF5E5] text-[#16834A] flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-[#171717] truncate">
                      {trip.destination || 'Trip Destination'}
                    </h4>
                    {trip.destination_lat && trip.destination_lng && (
                      <span className="text-[10px] font-mono text-[#737373] bg-white border border-[#E8E8E5] px-2 py-0.5 rounded-md">
                        {trip.destination_lat.toFixed(4)}°, {trip.destination_lng.toFixed(4)}°
                      </span>
                    )}
                  </div>
                  {trip.destination_address && (
                    <p className="text-xs text-[#737373] truncate mt-0.5">
                      {trip.destination_address}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleShareLocation}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#F4F4F2] border border-[#E8E8E5] text-xs font-semibold text-[#171717] shadow-xs transition-colors"
                >
                  {copiedLocation ? <Check className="w-3.5 h-3.5 text-[#16834A]" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span>{copiedLocation ? 'Copied Link' : 'Share Location'}</span>
                </button>

                <a
                  href={
                    trip.destination_lat && trip.destination_lng
                      ? `https://www.google.com/maps/search/?api=1&query=${trip.destination_lat},${trip.destination_lng}`
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          trip.destination_address || trip.destination || ''
                        )}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#16834A] hover:bg-[#136F3F] text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Maps</span>
                </a>
              </div>
            </div>

            {/* Embedded OpenStreetMap Preview */}
            {trip.destination_lat && trip.destination_lng && (
              <div className="rounded-xl overflow-hidden border border-[#E8E8E5] bg-white relative">
                <iframe
                  title="Destination Location Map"
                  width="100%"
                  height="160"
                  className="w-full border-0 block"
                  loading="lazy"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                    trip.destination_lng - 0.02
                  }%2C${trip.destination_lat - 0.02}%2C${trip.destination_lng + 0.02}%2C${
                    trip.destination_lat + 0.02
                  }&layer=mapnik&marker=${trip.destination_lat}%2C${trip.destination_lng}`}
                />
              </div>
            )}
          </div>
        )}

        {/* Metrics Ribbon */}
        <div className="pt-4 border-t border-[#F4F4F2] grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
          <div>
            <span className="text-[10px] text-[#A3A3A3] uppercase font-semibold tracking-wider block">Total Pool</span>
            <span className="text-xl font-bold font-mono text-[#171717] tabular-nums">
              {formatPaise(trip.total_expenses_paise, trip.currency)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-[#A3A3A3] uppercase font-semibold tracking-wider block">Recorded Expenses</span>
            <span className="text-xl font-bold font-mono text-[#171717] tabular-nums">
              {expenses.filter((e) => !e.is_void).length}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-[#A3A3A3] uppercase font-semibold tracking-wider block">Your Position</span>
            {(() => {
              const myBal = balances?.balances.find((b) => b.user_id === user?.id);
              const amt = myBal?.net_balance_paise || 0;
              return (
                <span
                  className={`text-xl font-bold font-mono tabular-nums ${
                    amt > 0 ? 'text-[#16834A]' : amt < 0 ? 'text-[#B45309]' : 'text-[#737373]'
                  }`}
                >
                  {amt > 0 ? `+${formatPaise(amt)}` : formatPaise(amt)}
                </span>
              );
            })()}
          </div>
          <div>
            <span className="text-[10px] text-[#A3A3A3] uppercase font-semibold tracking-wider block">Pending Settlements</span>
            <span className="text-xl font-bold font-mono text-[#B45309] tabular-nums">
              {settlements.filter((s) => s.status === 'PENDING_CONFIRMATION' || s.status === 'INITIATED').length}
            </span>
          </div>
        </div>
      </div>

      {/* --- Segmented Control Tabs --- */}
      <div className="bg-[#F4F4F2] p-1 rounded-xl flex gap-1 overflow-x-auto">
        {[
          { key: 'expenses', label: 'Expenses', icon: Receipt, count: expenses.length },
          { key: 'balances', label: 'Balances & Settle', icon: Scale },
          { key: 'settlements', label: 'Settlement History', icon: HandCoins, count: settlements.length },
          { key: 'activities', label: 'Activities', icon: Compass, count: activities.length },
          { key: 'budgets', label: 'Budgets', icon: Sliders, count: budgets.length },
          { key: 'reports', label: 'Reports', icon: PieChart },
          { key: 'members', label: 'Members', icon: Users, count: members.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-white text-[#171717] font-semibold shadow-xs border border-[#E8E8E5]'
                  : 'text-[#737373] hover:text-[#171717]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-[#DDF5E5] text-[#16834A]' : 'bg-[#E8E8E5] text-[#737373]'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* --- TAB 1: EXPENSES --- */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {/* Category Spending Breakdown Strip */}
          {Object.keys(categoryTotals).length > 0 && (
            <div className="bg-white p-4 rounded-2xl border border-[#E8E8E5] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#737373] flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-[#16834A]" />
                  <span>Category-Wise Expense Report</span>
                </span>
                <span className="text-xs font-mono font-bold text-[#171717] tabular-nums">
                  Total: {formatPaise(trip.total_expenses_paise, trip.currency)}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {Object.entries(categoryTotals).map(([catName, catAmt]) => {
                  const pct =
                    trip.total_expenses_paise > 0
                      ? Math.round((catAmt / trip.total_expenses_paise) * 100)
                      : 0;
                  const isSelected = expenseCategoryFilter === catName;
                  return (
                    <button
                      key={catName}
                      onClick={() =>
                        setExpenseCategoryFilter(isSelected ? 'All' : catName)
                      }
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-[#DDF5E5] border-[#16834A] shadow-xs'
                          : 'bg-[#FAFAF8] border-[#E8E8E5] hover:bg-[#F4F4F2]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-semibold text-[#737373]">
                        <span className="truncate">{catName}</span>
                        <span className="font-mono text-[10px]">{pct}%</span>
                      </div>
                      <div className="text-sm font-bold font-mono text-[#171717] tabular-nums mt-0.5">
                        {formatPaise(catAmt, trip.currency)}
                      </div>
                      <div className="w-full bg-[#E8E8E5] h-1 rounded-full overflow-hidden mt-1.5">
                        <div
                          className="bg-[#16834A] h-full rounded-full"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Advanced Filters & Search Suite */}
          <div className="bg-white p-4 rounded-2xl border border-[#E8E8E5] shadow-xs space-y-3">
            {/* Category Pills (All 8 official categories) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {[
                'All',
                'Food',
                'Petrol / Fuel',
                'Transport',
                'Accommodation',
                'Activities',
                'Shopping',
                'Tickets',
                'Miscellaneous',
              ].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setExpenseCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    expenseCategoryFilter === cat
                      ? 'bg-[#171717] text-white shadow-xs'
                      : 'bg-[#FAFAF8] text-[#737373] hover:text-[#171717] hover:bg-[#F4F4F2] border border-[#E8E8E5]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Payer, Date Range & Description Search Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-2 border-t border-[#F4F4F2]">
              {/* Search Description */}
              <div className="sm:col-span-1">
                <input
                  type="text"
                  placeholder="Search description..."
                  value={expenseSearch}
                  onChange={(e) => setExpenseSearch(e.target.value)}
                  className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3 py-2 text-xs text-[#171717] placeholder-[#A3A3A3] focus:outline-none focus:border-[#16834A]"
                />
              </div>

              {/* Payer Filter */}
              <div>
                <select
                  value={expensePayerFilter}
                  onChange={(e) => setExpensePayerFilter(e.target.value)}
                  className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3 py-2 text-xs text-[#171717] focus:outline-none focus:border-[#16834A]"
                >
                  <option value="All">All Payers</option>
                  {members.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      Paid by {m.user_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range Start & End */}
              <div className="flex items-center gap-1.5 sm:col-span-1">
                <input
                  type="date"
                  value={expenseStartDate}
                  onChange={(e) => setExpenseStartDate(e.target.value)}
                  placeholder="From date"
                  title="From date"
                  className="w-1/2 bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-2.5 py-2 text-xs text-[#171717] focus:outline-none focus:border-[#16834A]"
                />
                <input
                  type="date"
                  value={expenseEndDate}
                  onChange={(e) => setExpenseEndDate(e.target.value)}
                  placeholder="To date"
                  title="To date"
                  className="w-1/2 bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-2.5 py-2 text-xs text-[#171717] focus:outline-none focus:border-[#16834A]"
                />
              </div>

              {/* Active Filter Indicator / Reset */}
              <div className="flex items-center justify-between sm:justify-end gap-2">
                <span className="text-[11px] text-[#737373]">
                  Showing <strong className="text-[#171717]">{filteredExpenses.length}</strong> of {expenses.length}
                </span>
                {(expenseCategoryFilter !== 'All' ||
                  expensePayerFilter !== 'All' ||
                  expenseSearch ||
                  expenseStartDate ||
                  expenseEndDate) && (
                  <button
                    onClick={() => {
                      setExpenseCategoryFilter('All');
                      setExpensePayerFilter('All');
                      setExpenseSearch('');
                      setExpenseStartDate('');
                      setExpenseEndDate('');
                    }}
                    className="p-1.5 rounded-lg bg-[#FAFAF8] hover:bg-[#F4F4F2] text-[#737373] hover:text-[#E11D48] text-[11px] font-semibold flex items-center gap-1 border border-[#E8E8E5] transition-colors"
                    title="Clear All Filters"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Expenses List */}
          {filteredExpenses.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E8E8E5] p-12 text-center space-y-3 shadow-xs">
              <Receipt className="w-8 h-8 text-[#A3A3A3] mx-auto" />
              <h4 className="text-base font-bold text-[#171717]">No expenses recorded yet</h4>
              <p className="text-xs text-[#737373] max-w-sm mx-auto">
                Paid for highway fuel, food, or bike repairs? Add an expense and split it with the group.
              </p>
              <button
                onClick={() => setIsAddExpenseOpen(true)}
                className="inline-flex items-center gap-1.5 bg-[#16834A] hover:bg-[#136F3F] text-white font-semibold text-xs py-2 px-4 rounded-xl shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Expense</span>
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E8E8E5] divide-y divide-[#F4F4F2] shadow-xs overflow-hidden">
              {filteredExpenses.map((exp) => (
                <div
                  key={exp.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    exp.is_void ? 'bg-[#FAFAF8] opacity-60' : 'hover:bg-[#FAFAF8]'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#F4F4F2] text-[#171717] flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                      {exp.category[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4
                          className={`text-sm font-semibold text-[#171717] truncate ${
                            exp.is_void ? 'line-through text-[#A3A3A3]' : ''
                          }`}
                        >
                          {exp.description}
                        </h4>
                        {exp.is_void && (
                          <span className="text-[10px] font-bold text-[#E11D48] bg-[#FFE4E6] px-2 py-0.5 rounded">
                            VOID
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#737373] mt-0.5">
                        Paid by <strong className="text-[#171717] font-medium">{exp.payer_name}</strong> • {formatDate(exp.date)}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-[10px] font-medium text-[#737373] bg-[#F4F4F2] px-2 py-0.5 rounded">
                          {exp.split_method} Split
                        </span>
                        <span className="text-[10px] text-[#A3A3A3]">
                          {exp.splits.length} participants: {exp.splits.map((s) => `${s.user_name} (${formatPaise(s.amount_paise)})`).join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 flex-shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#F4F4F2]">
                    <span className="text-base font-bold font-mono text-[#171717] tabular-nums">
                      {formatPaise(exp.amount_paise, exp.currency)}
                    </span>
                    {!exp.is_void && (
                      <button
                        onClick={() => handleVoidExpense(exp.id)}
                        className="text-[11px] text-[#A3A3A3] hover:text-[#E11D48] flex items-center gap-1 font-medium transition-colors"
                        title="Void Expense"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Void</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 2: EXPENSE SUMMARY & WHO PAYS WHOM --- */}
      {activeTab === 'balances' && (
        <div className="space-y-6">
          {/* FEATURE 1: SIMPLE EXPENSE SUMMARY */}
          <div className="bg-white rounded-2xl border border-[#E8E8E5] p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#F4F4F2] gap-2">
              <div>
                <h3 className="text-base font-bold text-[#171717] font-['Plus_Jakarta_Sans']">
                  Member Expense Summary
                </h3>
                <p className="text-xs text-[#737373]">
                  All contributions, fair shares, and individual expenses calculated from recorded database data
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] text-[#A3A3A3] uppercase font-semibold block">Total Trip Expenses</span>
                  <span className="text-base font-bold font-mono text-[#171717] tabular-nums">
                    {formatPaise(trip.total_expenses_paise, trip.currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Member Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {members.map((m) => {
                const memberExpenses = expenses.filter((e) => e.payer_id === m.user_id && !e.is_void);
                const memberBalance = balances?.balances.find((b) => b.user_id === m.user_id);
                const totalPaid = memberBalance?.total_spent_paise || 0;
                const fairShare = memberBalance?.total_share_paise || 0;
                const netBal = memberBalance?.net_balance_paise || 0;

                return (
                  <div
                    key={m.user_id}
                    className="p-4 rounded-2xl bg-[#FAFAF8] border border-[#E8E8E5] flex flex-col justify-between space-y-3.5 hover:border-[#16834A]/40 transition-colors"
                  >
                    <div>
                      {/* Member Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#171717] text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {m.user_name[0].toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-[#171717] font-['Plus_Jakarta_Sans']">
                              {m.user_name}'s Expenses
                            </h4>
                            <span className="text-[10px] text-[#737373]">
                              {m.role === 'OWNER' ? 'Trip Organizer' : m.role}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${
                            netBal > 0
                              ? 'bg-[#DDF5E5] text-[#16834A] border-[#C6ECCF]'
                              : netBal < 0
                              ? 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]'
                              : 'bg-white text-[#737373] border-[#E8E8E5]'
                          }`}
                        >
                          {netBal > 0 ? 'Receives' : netBal < 0 ? 'Owes' : 'Settled'}
                        </span>
                      </div>

                      {/* Member's Individual Recorded Expenses */}
                      <div className="mt-3.5 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {memberExpenses.length === 0 ? (
                          <p className="text-xs text-[#A3A3A3] italic py-2">
                            No recorded expenses paid yet by this member.
                          </p>
                        ) : (
                          memberExpenses.map((exp) => (
                            <div
                              key={exp.id}
                              className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-white border border-[#E8E8E5]/60"
                            >
                              <div className="min-w-0 pr-2">
                                <span className="font-semibold text-[#171717] block truncate">
                                  {exp.description}
                                </span>
                                <span className="text-[10px] text-[#737373]">{exp.category}</span>
                              </div>
                              <span className="font-mono font-bold text-[#171717] tabular-nums shrink-0">
                                {formatPaise(exp.amount_paise, exp.currency)}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Member Totals & Share Pills */}
                    <div className="pt-3 border-t border-[#E8E8E5] grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-white p-2 rounded-xl border border-[#E8E8E5]/70">
                        <span className="text-[10px] text-[#737373] uppercase font-semibold block">Total Paid</span>
                        <span className="font-mono font-bold text-sm text-[#171717] tabular-nums block mt-0.5">
                          {formatPaise(totalPaid)}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-[#E8E8E5]/70">
                        <span className="text-[10px] text-[#737373] uppercase font-semibold block">Fair Share</span>
                        <span className="font-mono font-bold text-sm text-[#737373] tabular-nums block mt-0.5">
                          {formatPaise(fairShare)}
                        </span>
                      </div>
                      <div
                        className={`p-2 rounded-xl border ${
                          netBal > 0
                            ? 'bg-[#DDF5E5]/50 border-[#C6ECCF]'
                            : netBal < 0
                            ? 'bg-[#FEF3C7]/50 border-[#FDE68A]'
                            : 'bg-white border-[#E8E8E5]/70'
                        }`}
                      >
                        <span className="text-[10px] text-[#737373] uppercase font-semibold block">Balance</span>
                        <span
                          className={`font-mono font-bold text-sm tabular-nums block mt-0.5 ${
                            netBal > 0
                              ? 'text-[#16834A]'
                              : netBal < 0
                              ? 'text-[#B45309]'
                              : 'text-[#737373]'
                          }`}
                        >
                          {netBal > 0 ? `+${formatPaise(netBal)}` : formatPaise(netBal)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* FEATURE 2 & FEATURE 3 & FEATURE 4: WHO PAYS WHOM */}
          <div className="bg-white rounded-2xl border border-[#E8E8E5] p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#F4F4F2] gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#DDF5E5] text-[#16834A] flex items-center justify-center shrink-0">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#171717] font-['Plus_Jakarta_Sans']">
                    Who Pays Whom
                  </h3>
                  <p className="text-xs text-[#737373]">
                    Net outstanding settlement transfers required to balance group debts
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setSettlePayer(undefined);
                  setSettlePayee(undefined);
                  setSettleAmount(undefined);
                  setSettlePaymentMethod('CASH');
                  setIsRecordSettlementOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#16834A] hover:bg-[#136F3F] rounded-xl shadow-xs transition-colors self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record Settlement</span>
              </button>
            </div>

            {/* Pending In-App Settlement Confirmations */}
            {settlements.filter((s) => s.status === 'PENDING_CONFIRMATION' || s.status === 'INITIATED').length > 0 && (
              <div className="space-y-3 p-4 bg-[#FEF3C7]/30 border border-[#FDE68A] rounded-2xl">
                <div className="flex items-center gap-2 text-xs font-bold text-[#B45309] uppercase tracking-wider">
                  <Clock className="w-4 h-4" />
                  <span>
                    Pending Confirmation Requests ({settlements.filter((s) => s.status === 'PENDING_CONFIRMATION' || s.status === 'INITIATED').length})
                  </span>
                </div>

                <div className="space-y-2.5">
                  {settlements
                    .filter((s) => s.status === 'PENDING_CONFIRMATION' || s.status === 'INITIATED')
                    .map((st) => {
                      const isPayee = user?.id === st.payee_id;
                      const isPayer = user?.id === st.payer_id;
                      const isCash = st.payment_method === 'CASH';

                      return (
                        <div
                          key={st.id}
                          className="p-3.5 bg-white rounded-xl border border-[#E8E8E5] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                        >
                          <div className="space-y-1">
                            <p className="text-xs font-semibold text-[#171717]">
                              {isPayee ? (
                                <>
                                  <strong className="text-[#B45309]">{st.payer_name}</strong> says they gave you{' '}
                                  <strong className="font-mono text-[#16834A]">{formatPaise(st.amount_paise)}</strong>{' '}
                                  in {isCash ? 'cash' : st.payment_method}. Did you receive it?
                                </>
                              ) : isPayer ? (
                                <>
                                  You reported paying <strong className="font-mono">{formatPaise(st.amount_paise)}</strong> in{' '}
                                  {isCash ? 'cash' : st.payment_method} to{' '}
                                  <strong className="text-[#16834A]">{st.payee_name}</strong>. Awaiting their confirmation.
                                </>
                              ) : (
                                <>
                                  {st.payer_name} reported paying {formatPaise(st.amount_paise)} to {st.payee_name} via {st.payment_method}.
                                </>
                              )}
                            </p>
                            <p className="text-[11px] text-[#737373]">
                              Method: {st.payment_method} {st.reference_id ? `• Ref: ${st.reference_id}` : ''} • Date: {formatDate(st.created_at)}
                              {st.notes ? ` • Note: "${st.notes}"` : ''}
                            </p>
                          </div>

                          {isPayee ? (
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => handleConfirmSettlement(st.id)}
                                className="px-3.5 py-1.5 bg-[#16834A] hover:bg-[#136F3F] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                              >
                                Confirm Received
                              </button>
                              <button
                                onClick={() => handleRejectSettlement(st.id)}
                                className="px-3 py-1.5 bg-white hover:bg-[#FFE4E6] border border-[#FDA4AF] text-[#E11D48] text-xs font-semibold rounded-xl transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          ) : isPayer ? (
                            <span className="text-[11px] font-semibold text-[#B45309] bg-[#FEF3C7] px-2.5 py-1 rounded-lg border border-[#FDE68A] shrink-0">
                              Awaiting Payee Confirmation
                            </span>
                          ) : isOwnerOrAdmin ? (
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => handleConfirmSettlement(st.id)}
                                className="px-2.5 py-1 bg-[#16834A] text-white text-[11px] font-semibold rounded-lg"
                              >
                                Admin Confirm
                              </button>
                              <button
                                onClick={() => handleRejectSettlement(st.id)}
                                className="px-2.5 py-1 bg-white border border-[#FDA4AF] text-[#E11D48] text-[11px] font-semibold rounded-lg"
                              >
                                Admin Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-[#737373] italic">Pending</span>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Who Pays Whom List */}
            {suggestions.length === 0 ? (
              <div className="p-8 text-center bg-[#DDF5E5]/30 rounded-2xl border border-[#C6ECCF] space-y-2">
                <CheckCircle2 className="w-8 h-8 text-[#16834A] mx-auto" />
                <h4 className="text-base font-bold text-[#16834A]">All settled!</h4>
                <p className="text-xs text-[#737373]">
                  No money is owed between any members. Group balances reconcile to zero.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {suggestions.map((sug, idx) => {
                  const isYouOwe = user?.id === sug.from_user_id;
                  const isYouReceive = user?.id === sug.to_user_id;

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        isYouOwe
                          ? 'bg-[#FEF3C7]/40 border-[#FDE68A]'
                          : isYouReceive
                          ? 'bg-[#DDF5E5]/40 border-[#C6ECCF]'
                          : 'bg-[#FAFAF8] border-[#E8E8E5]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isYouOwe
                              ? 'bg-[#B45309] text-white'
                              : isYouReceive
                              ? 'bg-[#16834A] text-white'
                              : 'bg-[#171717] text-white'
                          }`}
                        >
                          #{idx + 1}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#171717]">
                            <strong className={isYouOwe ? 'text-[#B45309]' : 'text-[#171717]'}>
                              {isYouOwe ? 'You' : sug.from_user_name}
                            </strong>{' '}
                            →{' '}
                            <strong className={isYouReceive ? 'text-[#16834A]' : 'text-[#171717]'}>
                              {isYouReceive ? 'You' : sug.to_user_name}
                            </strong>
                          </p>
                          <p className="text-xs text-[#737373]">
                            {isYouOwe ? (
                              <span className="text-[#B45309] font-medium">You owe {sug.to_user_name}</span>
                            ) : isYouReceive ? (
                              <span className="text-[#16834A] font-medium">{sug.from_user_name} owes you</span>
                            ) : (
                              <span>Outstanding group payment</span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        <span className="text-base font-bold font-mono text-[#171717] tabular-nums">
                          {formatPaise(sug.amount_paise)}
                        </span>

                        {isYouOwe ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleTriggerSuggestion(sug, 'CASH')}
                              className="px-3.5 py-1.5 rounded-xl bg-[#16834A] hover:bg-[#136F3F] text-white font-semibold text-xs shadow-xs transition-all active:scale-[0.98]"
                            >
                              I Gave Cash
                            </button>
                            <button
                              onClick={() => handleTriggerSuggestion(sug, 'UPI')}
                              className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#F4F4F2] border border-[#E8E8E5] text-[#171717] font-semibold text-xs shadow-xs transition-colors"
                            >
                              I Paid
                            </button>
                          </div>
                        ) : isYouReceive ? (
                          <span className="text-xs font-semibold text-[#16834A] bg-[#DDF5E5] px-2.5 py-1 rounded-lg border border-[#C6ECCF]">
                            You will receive
                          </span>
                        ) : (
                          <button
                            onClick={() => handleTriggerSuggestion(sug, 'CASH')}
                            className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#F4F4F2] border border-[#E8E8E5] text-[#171717] font-semibold text-xs shadow-xs transition-colors"
                          >
                            Settle
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 3: SETTLEMENT HISTORY & VERIFICATION --- */}
      {activeTab === 'settlements' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#171717] font-['Plus_Jakarta_Sans']">
                Settlement Records &amp; Verification
              </h3>
              <p className="text-xs text-[#737373]">
                Zero-credential security: Payee must verify funds before confirming receipt
              </p>
            </div>
            <button
              onClick={() => {
                setSettlePayer(undefined);
                setSettlePayee(undefined);
                setSettleAmount(undefined);
                setIsRecordSettlementOpen(true);
              }}
              className="px-4 py-2 bg-[#16834A] hover:bg-[#136F3F] text-white font-semibold text-xs rounded-xl shadow-xs transition-all"
            >
              Record Payment
            </button>
          </div>

          {settlements.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E8E8E5] p-10 text-center text-xs text-[#737373] shadow-xs">
              No settlement payments recorded yet.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E8E8E5] divide-y divide-[#F4F4F2] shadow-xs overflow-hidden">
              {settlements.map((st) => (
                <div key={st.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#171717]">
                        {st.payer_name} ➔ {st.payee_name}
                      </span>
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${
                          st.status === 'CONFIRMED'
                            ? 'bg-[#DDF5E5] text-[#16834A] border-[#C6ECCF]'
                            : st.status === 'INITIATED'
                            ? 'bg-[#EEF2FF] text-[#4F46E5] border-[#C7D2FE]'
                            : st.status === 'DISPUTED'
                            ? 'bg-[#FFE4E6] text-[#E11D48] border-[#FDA4AF]'
                            : 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]'
                        }`}
                      >
                        {st.status === 'INITIATED' ? 'UPI INITIATED' : st.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-[#737373] mt-0.5">
                      Mode: {st.payment_method} {st.reference_id ? `• Ref: ${st.reference_id}` : ''} • {formatDate(st.created_at)}
                    </p>
                    {st.notes && <p className="text-xs text-[#A3A3A3] mt-1 italic">"{st.notes}"</p>}
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                    <span className="text-base font-bold font-mono text-[#171717] tabular-nums">
                      {formatPaise(st.amount_paise)}
                    </span>

                    {/* Status Actions & Verification */}
                    {(st.status === 'PENDING_CONFIRMATION' || st.status === 'INITIATED') && (
                      <div className="flex items-center gap-2">
                        {user?.id === st.payee_id ? (
                          <>
                            <button
                              onClick={() => handleConfirmSettlement(st.id)}
                              className="px-2.5 py-1 bg-[#16834A] hover:bg-[#136F3F] text-white text-[11px] font-semibold rounded-lg shadow-xs transition-colors"
                            >
                              Confirm Receipt
                            </button>
                            <button
                              onClick={() => handleDisputeSettlement(st.id)}
                              className="px-2 py-1 text-[#737373] hover:text-[#E11D48] text-[11px] font-medium transition-colors"
                            >
                              Dispute
                            </button>
                          </>
                        ) : user?.id === st.payer_id ? (
                          <span className="text-[11px] font-semibold text-[#B45309] bg-[#FEF3C7] px-2 py-0.5 rounded border border-[#FDE68A]">
                            Awaiting Payee Confirmation
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#737373]">
                            Pending verification
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 4: ACTIVITIES --- */}
      {activeTab === 'activities' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#171717] font-['Plus_Jakarta_Sans']">
                Trip Activities &amp; Itinerary
              </h3>
              <p className="text-xs text-[#737373]">Group bike rides, stops, dinners, hangouts</p>
            </div>
          </div>

          {activities.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E8E8E5] p-10 text-center text-xs text-[#737373] shadow-xs">
              No activities created for this trip yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activities.map((a) => (
                <div key={a.id} className="bg-white p-5 rounded-2xl border border-[#E8E8E5] shadow-xs space-y-2">
                  <h4 className="text-base font-bold text-[#171717]">{a.name}</h4>
                  {a.location && (
                    <p className="text-xs text-[#737373] flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#16834A]" />
                      <span>{a.location}</span>
                    </p>
                  )}
                  {a.description && <p className="text-xs text-[#737373]">{a.description}</p>}
                  <div className="pt-3 border-t border-[#F4F4F2] flex items-center justify-between text-xs">
                    <span className="text-[#737373]">{a.participants_count} participants</span>
                    <span className="font-mono font-bold text-[#171717] tabular-nums">{formatPaise(a.total_expenses_paise)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- TAB 5: BUDGETS --- */}
      {activeTab === 'budgets' && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-[#171717] font-['Plus_Jakarta_Sans']">
            Budget Tracking
          </h3>

          <div className="bg-white p-6 rounded-2xl border border-[#E8E8E5] shadow-xs space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm font-semibold mb-2">
                <span>Trip Budget Consumption</span>
                <span className="font-mono text-[#171717] tabular-nums">
                  {formatPaise(trip.total_expenses_paise)} / {trip.budget_paise ? formatPaise(trip.budget_paise) : 'No Budget Set'}
                </span>
              </div>
              {trip.budget_paise && (
                <div className="w-full bg-[#F4F4F2] h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      trip.total_expenses_paise > trip.budget_paise
                        ? 'bg-[#E11D48]'
                        : trip.total_expenses_paise / trip.budget_paise >= 0.8
                        ? 'bg-[#B45309]'
                        : 'bg-[#16834A]'
                    }`}
                    style={{
                      width: `${Math.min(100, (trip.total_expenses_paise / trip.budget_paise) * 100)}%`,
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 6: REPORTS & EXPORTS (FEATURE 7) --- */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[#171717] font-['Plus_Jakarta_Sans']">
                Financial Statement &amp; Export
              </h3>
              <p className="text-xs text-[#737373]">
                Official audit statements with zero-discrepancy balance verification
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  if (downloadingCsv) return;
                  setDownloadingCsv(true);
                  try {
                    await downloadTripCsv(trip.id, trip.name);
                  } catch (err: any) {
                    alert(err.message || 'Failed to download CSV');
                  } finally {
                    setDownloadingCsv(false);
                  }
                }}
                disabled={downloadingCsv}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#F4F4F2] text-[#171717] border border-[#E8E8E5] text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
              >
                {downloadingCsv ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#16834A]" /> : <FileSpreadsheet className="w-3.5 h-3.5 text-[#16834A]" />}
                <span>{downloadingCsv ? 'Preparing CSV...' : 'Download CSV'}</span>
              </button>

              <button
                onClick={async () => {
                  if (downloadingPdf) return;
                  setDownloadingPdf(true);
                  try {
                    await downloadTripPdf(trip.id, trip.name);
                  } catch (err: any) {
                    alert(err.message || 'Failed to download PDF');
                  } finally {
                    setDownloadingPdf(false);
                  }
                }}
                disabled={downloadingPdf}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#16834A] hover:bg-[#136F3F] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
              >
                {downloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                <span>{downloadingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
              </button>
            </div>
          </div>

          {/* Category Filter for Report Analysis */}
          <div className="bg-white p-4 rounded-2xl border border-[#E8E8E5] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#16834A]" />
                <span className="text-xs font-bold text-[#171717]">Filter by Category</span>
              </div>
              <span className="text-xs text-[#737373]">
                Total: <strong className="font-mono text-[#171717]">{formatPaise(trip.total_expenses_paise)}</strong>
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {[
                'All',
                'Food',
                'Petrol / Fuel',
                'Transport',
                'Accommodation',
                'Activities',
                'Shopping',
                'Other',
              ].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setReportCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    reportCategoryFilter === cat
                      ? 'bg-[#16834A] text-white shadow-xs'
                      : 'bg-[#FAFAF8] text-[#737373] hover:text-[#171717] hover:bg-[#F4F4F2] border border-[#E8E8E5]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Category Spending Breakdown */}
          {report && (
            <div className="bg-white p-6 rounded-2xl border border-[#E8E8E5] shadow-xs space-y-4">
              <h4 className="text-sm font-bold text-[#171717]">Category-Wise Spending Breakdown</h4>
              <div className="space-y-3">
                {report.category_breakdown
                  .filter((cat) => reportCategoryFilter === 'All' || cat.category.toLowerCase().includes(reportCategoryFilter.toLowerCase()))
                  .map((cat) => (
                    <div key={cat.category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#171717]">{cat.category}</span>
                        <span className="font-mono text-[#737373] tabular-nums">
                          {formatPaise(cat.amount_paise)} ({cat.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-[#F4F4F2] h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-[#16834A] h-full rounded-full"
                          style={{ width: `${Math.min(100, cat.percentage)}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Member Spending & Balances Summary Table */}
          {report && (
            <div className="bg-white p-6 rounded-2xl border border-[#E8E8E5] shadow-xs space-y-4">
              <h4 className="text-sm font-bold text-[#171717]">Member Contribution &amp; Fair Share Summary</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E8E8E5] text-[11px] font-bold uppercase text-[#737373]">
                      <th className="pb-3">Member</th>
                      <th className="pb-3 text-right">Amount Paid</th>
                      <th className="pb-3 text-right">Fair Share</th>
                      <th className="pb-3 text-right">Net Balance</th>
                      <th className="pb-3 text-center">Position</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F4F4F2] text-xs">
                    {report.participant_breakdown.map((p) => (
                      <tr key={p.user_id} className="hover:bg-[#FAFAF8]">
                        <td className="py-3 font-semibold text-[#171717]">{p.user_name}</td>
                        <td className="py-3 text-right font-mono tabular-nums">{formatPaise(p.amount_spent_paise)}</td>
                        <td className="py-3 text-right font-mono tabular-nums text-[#737373]">{formatPaise(p.amount_consumed_paise)}</td>
                        <td className={`py-3 text-right font-mono font-bold tabular-nums ${p.net_balance_paise > 0 ? 'text-[#16834A]' : p.net_balance_paise < 0 ? 'text-[#B45309]' : 'text-[#737373]'}`}>
                          {p.net_balance_paise > 0 ? `+${formatPaise(p.net_balance_paise)}` : formatPaise(p.net_balance_paise)}
                        </td>
                        <td className="py-3 text-center">
                          <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${
                            p.net_balance_paise > 0 ? 'bg-[#DDF5E5] text-[#16834A] border-[#C6ECCF]' : p.net_balance_paise < 0 ? 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]' : 'bg-[#FAFAF8] text-[#737373] border-[#E8E8E5]'
                          }`}>
                            {p.net_balance_paise > 0 ? 'Is Owed' : p.net_balance_paise < 0 ? 'Owes' : 'Settled'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Settlements Overview in Report */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-[#E8E8E5] shadow-xs space-y-2">
              <span className="text-[10px] uppercase font-semibold text-[#16834A] tracking-wider block">Completed Settlements</span>
              <span className="text-2xl font-bold font-mono text-[#16834A] tabular-nums block">
                {formatPaise(settlements.filter((s) => s.status === 'CONFIRMED').reduce((acc, s) => acc + s.amount_paise, 0))}
              </span>
              <p className="text-xs text-[#737373]">
                {settlements.filter((s) => s.status === 'CONFIRMED').length} verified transactions
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E8E8E5] shadow-xs space-y-2">
              <span className="text-[10px] uppercase font-semibold text-[#B45309] tracking-wider block">Outstanding Unpaid Debts</span>
              <span className="text-2xl font-bold font-mono text-[#B45309] tabular-nums block">
                {formatPaise(suggestions.reduce((acc, s) => acc + s.amount_paise, 0))}
              </span>
              <p className="text-xs text-[#737373]">
                {suggestions.length === 0 ? 'Zero outstanding balances' : `${suggestions.length} payment(s) pending`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 7: RIDERS / MEMBERS --- */}
      {activeTab === 'members' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#171717] font-['Plus_Jakarta_Sans']">
                Trip Members ({members.length})
              </h3>
              <p className="text-xs text-[#737373]">
                Confirmed participants in expenses and settlements
              </p>
            </div>

            {isOwnerOrAdmin && (
              <button
                type="button"
                onClick={handleOpenInviteModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#16834A] hover:bg-[#136F3F] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Invite Friends</span>
              </button>
            )}
          </div>

          {/* Confirmed Members List */}
          <div className="bg-white rounded-2xl border border-[#E8E8E5] divide-y divide-[#F4F4F2] shadow-xs overflow-hidden">
            {members.map((m) => (
              <div key={m.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#171717] text-white flex items-center justify-center font-bold text-xs">
                    {m.user_name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#171717]">{m.user_name}</p>
                    <p className="text-xs text-[#737373]">{m.user_email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${
                      m.role === 'OWNER'
                        ? 'bg-[#DDF5E5] text-[#16834A] border border-[#C6ECCF]'
                        : 'bg-[#FAFAF8] text-[#737373] border border-[#E8E8E5]'
                    }`}
                  >
                    {m.role}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Pending Invitations Section (Owner/Admin only) */}
          {isOwnerOrAdmin && invitations.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E8E8E5] p-5 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between pb-3 border-b border-[#F4F4F2]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#737373]">
                  Pending Invitations ({invitations.filter((i) => i.status === 'PENDING').length})
                </h4>
              </div>

              <div className="divide-y divide-[#F4F4F2]">
                {invitations.map((inv) => (
                  <div key={inv.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {inv.invitee_avatar ? (
                        <img
                          src={getAvatarUrl(inv.invitee_avatar)}
                          alt={inv.invitee_name || 'Invitee'}
                          className="w-8 h-8 rounded-lg object-cover border border-[#E8E8E5]"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-[#FAFAF8] border border-[#E8E8E5] text-[#171717] flex items-center justify-center font-bold text-xs">
                          {(inv.invitee_name || 'F')[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#171717] truncate">
                          {inv.invitee_name}
                        </p>
                        {inv.invitee_username && (
                          <p className="text-[11px] text-[#16834A] truncate">
                            @{inv.invitee_username}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
                        {inv.status}
                      </span>
                      {inv.status === 'PENDING' && (
                        <button
                          type="button"
                          onClick={() => handleCancelInvitation(inv.id)}
                          className="text-xs text-[#737373] hover:text-[#E11D48] transition-colors p-1"
                          title="Cancel Invitation"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Invite Friends Modal */}
      {isInviteFriendsOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E8E8E5] p-6 max-w-md w-full shadow-xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E8E5]">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#16834A]" />
                <h3 className="text-base font-bold text-[#171717]">Invite Friends to Trip</h3>
              </div>
              <button
                onClick={() => setIsInviteFriendsOpen(false)}
                className="text-[#737373] hover:text-[#171717]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inviteError && (
              <p className="p-3 rounded-xl bg-[#FFE4E6] text-[#E11D48] text-xs border border-[#FDA4AF]">
                {inviteError}
              </p>
            )}

            {loadingFriends ? (
              <div className="p-8 text-center text-[#737373]">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#16834A]" />
                <p className="text-xs">Loading friends list...</p>
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <p className="text-xs text-[#737373]">
                  You have not added any friends yet. Add friends on the Friends page to invite them with one tap.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsInviteFriendsOpen(false);
                    navigate('/friends');
                  }}
                  className="px-4 py-2 bg-[#16834A] text-white text-xs font-semibold rounded-xl"
                >
                  Go to Friends
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                <p className="text-xs text-[#737373] mb-1">
                  Select friends to invite to <strong className="text-[#171717]">{trip.name}</strong>:
                </p>

                {friends.map((friend) => {
                  const alreadyMember = members.some((m) => m.user_id === friend.id);
                  const alreadyPending = invitations.some(
                    (i) => i.invitee_id === friend.id && i.status === 'PENDING'
                  );
                  const isSelected = selectedFriendsToInvite.includes(friend.id);
                  const avatarSrc = getAvatarUrl(friend.avatar_url);

                  return (
                    <div
                      key={friend.id}
                      onClick={() => {
                        if (!alreadyMember && !alreadyPending) {
                          toggleFriendToInvite(friend.id);
                        }
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                        alreadyMember || alreadyPending
                          ? 'opacity-50 bg-[#FAFAF8] border-[#E8E8E5] cursor-not-allowed'
                          : isSelected
                          ? 'bg-[#DDF5E5] border-[#16834A] cursor-pointer'
                          : 'bg-white border-[#E8E8E5] hover:bg-[#FAFAF8] cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {avatarSrc ? (
                          <img
                            src={avatarSrc}
                            alt={friend.display_name}
                            className="w-8 h-8 rounded-lg object-cover border border-[#E8E8E5]"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-[#171717] text-white flex items-center justify-center font-bold text-xs">
                            {friend.display_name[0].toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#171717] truncate">
                            {friend.display_name}
                          </p>
                          <p className="text-[11px] text-[#16834A] truncate">
                            @{friend.username || 'user'}
                          </p>
                        </div>
                      </div>

                      <div>
                        {alreadyMember ? (
                          <span className="text-[10px] font-semibold text-[#737373] bg-[#E8E8E5] px-2 py-0.5 rounded">
                            Member
                          </span>
                        ) : alreadyPending ? (
                          <span className="text-[10px] font-semibold text-[#B45309] bg-[#FEF3C7] px-2 py-0.5 rounded">
                            Invited
                          </span>
                        ) : (
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                              isSelected
                                ? 'bg-[#16834A] border-[#16834A] text-white'
                                : 'border-[#E8E8E5] bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E8E8E5]">
              <button
                type="button"
                onClick={() => setIsInviteFriendsOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#737373] hover:text-[#171717] rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendTripInvites}
                disabled={sendingInvites || selectedFriendsToInvite.length === 0}
                className="px-5 py-2 bg-[#16834A] hover:bg-[#136F3F] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {sendingInvites && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Send Invitations ({selectedFriendsToInvite.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete / End Trip Confirmation Modal (FEATURE 6) */}
      {isCompleteTripConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 max-w-lg w-full shadow-2xl space-y-4 animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 pb-3 border-b border-[#F4F4F2]">
              <div className="w-10 h-10 rounded-2xl bg-[#DDF5E5] text-[#16834A] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#171717] font-['Plus_Jakarta_Sans']">
                  End Trip: {trip.name}
                </h3>
                <p className="text-xs text-[#737373]">
                  Review financial standing before marking trip as completed
                </p>
              </div>
            </div>

            {/* Total Expenses & Summary Figures */}
            <div className="p-3.5 bg-[#FAFAF8] rounded-2xl border border-[#E8E8E5] grid grid-cols-2 gap-3 text-center">
              <div>
                <span className="text-[10px] text-[#737373] uppercase font-semibold block">Total Group Expenses</span>
                <span className="text-base font-bold font-mono text-[#171717] tabular-nums mt-0.5 block">
                  {formatPaise(trip.total_expenses_paise, trip.currency)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#737373] uppercase font-semibold block">Outstanding Balances</span>
                <span className="text-base font-bold font-mono text-[#B45309] tabular-nums mt-0.5 block">
                  {formatPaise(suggestions.reduce((acc, s) => acc + s.amount_paise, 0))}
                </span>
              </div>
            </div>

            {/* Member Contributions & Fair Shares */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#171717] uppercase tracking-wider block">
                Member Standing &amp; Fair Shares
              </span>
              <div className="max-h-40 overflow-y-auto divide-y divide-[#F4F4F2] border border-[#E8E8E5] rounded-xl bg-white">
                {members.map((m) => {
                  const b = balances?.balances.find((item) => item.user_id === m.user_id);
                  const paid = b?.total_spent_paise || 0;
                  const share = b?.total_share_paise || 0;
                  const net = b?.net_balance_paise || 0;
                  return (
                    <div key={m.user_id} className="p-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-[#171717] block">{m.user_name}</span>
                        <span className="text-[11px] text-[#737373]">
                          Paid: {formatPaise(paid)} • Share: {formatPaise(share)}
                        </span>
                      </div>
                      <span className={`font-mono font-bold text-xs ${net > 0 ? 'text-[#16834A]' : net < 0 ? 'text-[#B45309]' : 'text-[#737373]'}`}>
                        {net > 0 ? `+${formatPaise(net)}` : formatPaise(net)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Outstanding Settlements & Pending Confirmations Warning */}
            {(() => {
              const pendingCount = settlements.filter(
                (s) => s.status === 'PENDING_CONFIRMATION' || s.status === 'INITIATED'
              ).length;
              const hasDebts = suggestions.length > 0 || pendingCount > 0;

              return hasDebts ? (
                <div className="p-3.5 rounded-2xl bg-[#FEF3C7]/60 border border-[#FDE68A] text-[#B45309] text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0 text-[#B45309]" />
                    <span>Outstanding Payments Pending</span>
                  </div>
                  <p className="leading-relaxed text-[11px] text-[#92400E]">
                    There {suggestions.length === 1 ? 'is' : 'are'} <strong>{suggestions.length} unpaid settlement(s)</strong> and{' '}
                    <strong>{pendingCount} pending confirmation request(s)</strong>. You can return to settle them first, or complete the trip now. Unpaid balances will remain safely preserved in your Trip History.
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-[#DDF5E5]/50 border border-[#C6ECCF] text-[#16834A] text-xs flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>All debts are fully settled! Ready for permanent completion.</span>
                </div>
              );
            })()}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-3 border-t border-[#E8E8E5]">
              <button
                type="button"
                onClick={() => {
                  setIsCompleteTripConfirmOpen(false);
                  setActiveTab('balances');
                }}
                disabled={completingTrip}
                className="px-4 py-2.5 text-xs font-semibold text-[#171717] bg-white hover:bg-[#F4F4F2] border border-[#E8E8E5] rounded-xl transition-colors"
              >
                Return &amp; Settle First
              </button>
              <button
                type="button"
                onClick={handleCompleteTrip}
                disabled={completingTrip}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[#16834A] hover:bg-[#136F3F] text-white text-xs font-semibold rounded-xl shadow-xs transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {completingTrip && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm &amp; End Trip</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        tripId={trip.id}
        currency={trip.currency}
        members={members}
        activities={activities}
        onExpenseAdded={loadAllTripData}
      />

      <RecordSettlementModal
        isOpen={isRecordSettlementOpen}
        onClose={() => setIsRecordSettlementOpen(false)}
        tripId={trip.id}
        members={members}
        initialPayerId={settlePayer}
        initialPayeeId={settlePayee}
        initialAmountPaise={settleAmount}
        initialPaymentMethod={settlePaymentMethod}
        onSettlementRecorded={loadAllTripData}
      />

      {/* Trip Summary Modal */}
      <TripSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        tripId={trip.id}
      />
    </div>
  );
};
