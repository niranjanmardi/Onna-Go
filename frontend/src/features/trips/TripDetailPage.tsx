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
import { UPIPaymentModal } from '@/features/settlements/UPIPaymentModal';
import { TripSummaryModal } from '@/features/trips/TripSummaryModal';
import { useFeedback } from '@/context/FeedbackContext';
import { playSound } from '@/lib/sounds';

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

  // UPI payment state
  const [isUPIPaymentOpen, setIsUPIPaymentOpen] = useState(false);
  const [upiPayer, setUpiPayer] = useState<{ id: string; name: string } | null>(null);
  const [upiPayee, setUpiPayee] = useState<{ id: string; name: string; upiId?: string | null } | null>(null);
  const [upiAmount, setUpiAmount] = useState<number>(0);

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

  const handleTriggerSuggestion = (sug: SettlementSuggestion) => {
    setSettlePayer(sug.from_user_id);
    setSettlePayee(sug.to_user_id);
    setSettleAmount(sug.amount_paise);
    setIsRecordSettlementOpen(true);
  };

  const handleInitiateUPI = (sug: SettlementSuggestion) => {
    const payeeMember = members.find((m) => m.user_id === sug.to_user_id);
    setUpiPayer({ id: sug.from_user_id, name: sug.from_user_name });
    setUpiPayee({
      id: sug.to_user_id,
      name: sug.to_user_name,
      upiId: sug.to_user_upi_id || payeeMember?.user_upi_id || null,
    });
    setUpiAmount(sug.amount_paise);
    setIsUPIPaymentOpen(true);
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

            {/* Complete Trip Button (Owner/Admin only) */}
            {isOwnerOrAdmin && !isTripCompleted && (
              <button
                onClick={() => setIsCompleteTripConfirmOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-[#FAFAF8] border border-[#E8E8E5] text-[#171717] font-semibold py-2.5 px-3.5 rounded-xl shadow-xs transition-all active:scale-[0.98] text-sm"
              >
                <CheckCircle2 className="w-4 h-4 text-[#16834A]" />
                <span>Complete Trip</span>
              </button>
            )}

            {isTripCompleted && (
              <button
                onClick={() => setIsSummaryModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-[#FAFAF8] border border-[#E8E8E5] text-[#171717] font-semibold py-2.5 px-3.5 rounded-xl shadow-xs transition-all active:scale-[0.98] text-sm"
              >
                <Trophy className="w-4 h-4 text-[#16834A]" />
                <span>Trip Summary</span>
              </button>
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

      {/* --- TAB 2: BALANCES & DEBT SIMPLIFICATION --- */}
      {activeTab === 'balances' && (
        <div className="space-y-6">
          {/* Member Net Balances */}
          <div className="bg-white rounded-2xl border border-[#E8E8E5] p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F4F4F2]">
              <div>
                <h3 className="text-base font-bold text-[#171717] font-['Plus_Jakarta_Sans']">
                  Member Net Balances
                </h3>
                <p className="text-xs text-[#737373]">
                  Calculated using ONNA-GO zero-sum conservation invariant
                </p>
              </div>
              <div className="px-2.5 py-1 rounded-full bg-[#DDF5E5] text-[#16834A] text-xs font-semibold flex items-center gap-1.5 border border-[#C6ECCF]">
                <Check className="w-3.5 h-3.5" />
                <span>∑ Net = 0.00</span>
              </div>
            </div>

            <div className="divide-y divide-[#F4F4F2]">
              {balances?.balances.map((item) => (
                <div key={item.user_id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#171717] text-white font-bold flex items-center justify-center text-xs">
                      {item.user_name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#171717]">{item.user_name}</p>
                      <p className="text-xs text-[#737373]">
                        Paid {formatPaise(item.total_spent_paise)} • Share {formatPaise(item.total_share_paise)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p
                      className={`text-base font-bold font-mono tabular-nums ${
                        item.net_balance_paise > 0
                          ? 'text-[#16834A]'
                          : item.net_balance_paise < 0
                          ? 'text-[#B45309]'
                          : 'text-[#737373]'
                      }`}
                    >
                      {item.net_balance_paise > 0
                        ? `+${formatPaise(item.net_balance_paise)}`
                        : formatPaise(item.net_balance_paise)}
                    </p>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${
                        item.status === 'IS_OWED'
                          ? 'bg-[#DDF5E5] text-[#16834A]'
                          : item.status === 'OWES'
                          ? 'bg-[#FEF3C7] text-[#B45309]'
                          : 'bg-[#F4F4F2] text-[#737373]'
                      }`}
                    >
                      {item.status === 'IS_OWED' ? 'Receives' : item.status === 'OWES' ? 'Owes' : 'Settled'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Optimal Settlement Suggestions */}
          <div className="bg-white rounded-2xl border border-[#E8E8E5] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#DDF5E5] text-[#16834A] flex items-center justify-center">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#171717] font-['Plus_Jakarta_Sans']">
                    Optimal Debt Simplification
                  </h3>
                  <p className="text-xs text-[#737373]">
                    Minimum transfers required to fully settle all group debts
                  </p>
                </div>
              </div>
            </div>

            {suggestions.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#737373] bg-[#FAFAF8] rounded-xl border border-[#E8E8E5]">
                Everyone in this trip is completely settled up!
              </div>
            ) : (
              <div className="space-y-3">
                {suggestions.map((sug, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-[#FAFAF8] border border-[#E8E8E5] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#171717] text-white flex items-center justify-center font-bold text-xs">
                        #{idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#171717]">
                          <strong className="text-[#B45309] font-medium">{sug.from_user_name}</strong> pays{' '}
                          <strong className="text-[#16834A] font-medium">{sug.to_user_name}</strong>
                        </p>
                        <p className="text-xs text-[#737373]">Direct transfer via UPI / Cash</p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between sm:justify-end gap-2.5">
                      <span className="text-base font-bold font-mono text-[#171717] tabular-nums">
                        {formatPaise(sug.amount_paise)}
                      </span>

                      {/* If debtor is current user, offer one-click UPI handoff */}
                      {user?.id === sug.from_user_id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleInitiateUPI(sug)}
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#16834A] hover:bg-[#136F3F] text-white font-semibold text-xs shadow-xs transition-all active:scale-[0.98]"
                          >
                            <Smartphone className="w-3.5 h-3.5" />
                            <span>Pay via UPI</span>
                          </button>
                          <button
                            onClick={() => handleTriggerSuggestion(sug)}
                            className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#F4F4F2] border border-[#E8E8E5] text-[#737373] hover:text-[#171717] font-medium text-xs transition-colors"
                          >
                            Offline / Cash
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleTriggerSuggestion(sug)}
                          className="px-3.5 py-1.5 rounded-xl bg-[#16834A] hover:bg-[#136F3F] text-white font-medium text-xs shadow-xs transition-all active:scale-[0.98]"
                        >
                          Record Payment
                        </button>
                      )}
                    </div>
                  </div>
                ))}
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

      {/* --- TAB 6: REPORTS & EXPORTS --- */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[#171717] font-['Plus_Jakarta_Sans']">
                Financial Reports &amp; Export
              </h3>
              <p className="text-xs text-[#737373]">
                Formula injection-protected CSV and PDF invoices
              </p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`/api/v1/reports/trip/${trip.id}/export/csv`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#F4F4F2] text-[#171717] border border-[#E8E8E5] text-xs font-semibold shadow-xs transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#16834A]" />
                <span>Export CSV</span>
              </a>

              <a
                href={`/api/v1/reports/trip/${trip.id}/export/pdf`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#16834A] hover:bg-[#136F3F] text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Export PDF</span>
              </a>
            </div>
          </div>

          {/* Category Spending Breakdown */}
          {report && (
            <div className="bg-white p-6 rounded-2xl border border-[#E8E8E5] shadow-xs space-y-4">
              <h4 className="text-sm font-bold text-[#171717]">Category Spending Breakdown</h4>
              <div className="space-y-3">
                {report.category_breakdown.map((cat) => (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#171717]">{cat.category}</span>
                      <span className="font-mono text-[#737373] tabular-nums">
                        {formatPaise(cat.amount_paise)} ({cat.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-[#F4F4F2] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#16834A] h-full rounded-full"
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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

      {/* Complete Trip Confirmation Modal */}
      {isCompleteTripConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E8E8E5] p-6 max-w-md w-full shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#DDF5E5] text-[#16834A] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#171717]">
                  Complete &amp; Finalize Trip?
                </h3>
                <p className="text-xs text-[#737373]">
                  Permanent history &amp; settlement lock
                </p>
              </div>
            </div>

            <div className="bg-[#FAFAF8] border border-[#E8E8E5] rounded-2xl p-4 text-xs text-[#737373] space-y-2">
              <p>
                Marking <strong className="text-[#171717]">{trip.name}</strong> as completed will:
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-[#737373]">
                <li>Finalize the expense pool and debt allocation ledger</li>
                <li>Archive this trip into your permanent travel history</li>
                <li>Generate the official trip financial summary report</li>
                <li>Notify all trip members that the trip has concluded</li>
              </ul>
              <p className="text-[11px] text-[#16834A] font-semibold pt-1">
                Note: You and your group members will always be able to view details and settle remaining debts.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsCompleteTripConfirmOpen(false)}
                disabled={completingTrip}
                className="px-4 py-2 text-xs font-semibold text-[#737373] hover:text-[#171717] rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompleteTrip}
                disabled={completingTrip}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#16834A] hover:bg-[#136F3F] text-white text-xs font-semibold rounded-xl shadow-xs transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {completingTrip && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm &amp; Complete Trip</span>
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
        onSettlementRecorded={loadAllTripData}
      />

      {/* UPI Payment Modal */}
      {upiPayer && upiPayee && (
        <UPIPaymentModal
          isOpen={isUPIPaymentOpen}
          onClose={() => setIsUPIPaymentOpen(false)}
          tripId={trip.id}
          tripName={trip.name}
          payerId={upiPayer.id}
          payerName={upiPayer.name}
          payeeId={upiPayee.id}
          payeeName={upiPayee.name}
          payeeUpiId={upiPayee.upiId}
          amountPaise={upiAmount}
          onSettlementInitiated={async () => {
            setIsUPIPaymentOpen(false);
            await loadAllTripData();
          }}
        />
      )}

      {/* Trip Summary Modal */}
      <TripSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        tripId={trip.id}
      />
    </div>
  );
};
