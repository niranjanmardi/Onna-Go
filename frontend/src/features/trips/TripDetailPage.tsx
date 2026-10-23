import React, { useEffect, useState, useMemo } from 'react';
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
  TrendingUp,
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
  ArrowRight,
  MoreVertical,
  ChevronRight,
  UserCheck,
  History,
  Sparkles,
} from 'lucide-react';
import { api, getAvatarUrl } from '@/lib/api-client';
import {
  Trip,
  TripMember,
  Expense,
  TripBalances,
  SettlementSuggestion,
  Settlement,
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

  // Core Data
  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<TripBalances | null>(null);
  const [suggestions, setSuggestions] = useState<SettlementSuggestion[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);

  // Page States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isRecordSettlementOpen, setIsRecordSettlementOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isAllExpensesModalOpen, setIsAllExpensesModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isCompleteTripConfirmOpen, setIsCompleteTripConfirmOpen] = useState(false);
  const [completingTrip, setCompletingTrip] = useState(false);

  // Settlement prefill
  const [settlePayer, setSettlePayer] = useState<string | undefined>(undefined);
  const [settlePayee, setSettlePayee] = useState<string | undefined>(undefined);
  const [settleAmount, setSettleAmount] = useState<number | undefined>(undefined);
  const [settlingActionId, setSettlingActionId] = useState<string | null>(null);

  // Invitation state inside Members modal
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriendsToInvite, setSelectedFriendsToInvite] = useState<string[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [sendingInvites, setSendingInvites] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLocation, setCopiedLocation] = useState(false);

  // Export states
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);

  // Expenses filtering inside the All Expenses modal
  const [expenseFilterCategory, setExpenseFilterCategory] = useState<string>('All');
  const [expenseFilterPayer, setExpenseFilterPayer] = useState<string>('All');
  const [expenseSearch, setExpenseSearch] = useState<string>('');

  // Load all trip data
  const loadAllTripData = async () => {
    if (!id) return;
    try {
      const [tData, mData, eData, bData, sData, stData] = await Promise.all([
        api.get<Trip>(`/trips/${id}`),
        api.get<TripMember[]>(`/trips/${id}/members`),
        api.get<Expense[]>(`/expenses/trip/${id}`),
        api.get<TripBalances>(`/balances/trip/${id}`).catch(() => null),
        api.get<{ trip_id: string; suggestions: SettlementSuggestion[] }>(`/balances/trip/${id}/suggestions`).catch(() => ({ trip_id: id, suggestions: [] })),
        api.get<Settlement[]>(`/settlements/trip/${id}`).catch(() => []),
      ]);

      setTrip(tData);
      setMembers(mData);
      setExpenses(eData);
      setBalances(bData);
      setSuggestions(sData?.suggestions || []);
      setSettlements(stData);
    } catch (err: any) {
      setError(err.message || 'Failed to load trip information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllTripData();
  }, [id]);

  // Derived user statistics
  const currentMember = useMemo(
    () => members.find((m) => m.user_id === user?.id),
    [members, user?.id]
  );
  const isOwnerOrAdmin = currentMember?.role === 'OWNER' || currentMember?.role === 'ADMIN';

  const userBalanceItem = useMemo(() => {
    if (!balances || !user?.id) return null;
    return balances.balances.find((b) => b.user_id === user.id) || null;
  }, [balances, user?.id]);

  const netBalancePaise = userBalanceItem?.net_balance_paise || 0;
  const userSharePaise = userBalanceItem?.total_share_paise || 0;
  const userPaidPaise = userBalanceItem?.total_spent_paise || 0;
  const totalTripExpensesPaise = balances?.total_expenses_paise || trip?.total_expenses_paise || 0;

  // Pending settlements
  const pendingSettlements = useMemo(() => {
    return settlements.filter(
      (s) => s.status === 'PENDING_CONFIRMATION' || s.status === 'INITIATED'
    );
  }, [settlements]);

  // Pending payments where current user is the RECEIVER (Action required: Confirm Received)
  const pendingForMeAsReceiver = useMemo(() => {
    return pendingSettlements.filter((s) => s.payee_id === user?.id);
  }, [pendingSettlements, user?.id]);

  // Pending payments where current user is the PAYER (Waiting for payee confirmation)
  const pendingFromMeAsPayer = useMemo(() => {
    return pendingSettlements.filter((s) => s.payer_id === user?.id);
  }, [pendingSettlements, user?.id]);

  // Recent active expenses (last 5)
  const recentExpenses = useMemo(() => {
    return expenses.filter((e) => !e.is_void).slice(0, 5);
  }, [expenses]);

  // Helper to check if a suggested debt has a pending settlement record
  const getPendingSettlementForSuggestion = (sug: SettlementSuggestion) => {
    return pendingSettlements.find(
      (s) => s.payer_id === sug.from_user_id && s.payee_id === sug.to_user_id
    );
  };

  // Handle Mark as Paid
  const handleOpenMarkAsPaid = (sug: SettlementSuggestion) => {
    setSettlePayer(sug.from_user_id);
    setSettlePayee(sug.to_user_id);
    setSettleAmount(sug.amount_paise);
    setIsRecordSettlementOpen(true);
  };

  // Handle Confirm Receipt of a payment
  const handleConfirmReceipt = async (settlementId: string) => {
    setSettlingActionId(settlementId);
    try {
      await api.patch(`/settlements/${settlementId}/status`, { status: 'CONFIRMED' });
      playSound('settlement_success');
      showConfirmation({
        title: 'Payment Confirmed! ✅',
        message: 'Settlement confirmed. Group balances have been updated.',
        sound: 'settlement_success',
      });
      await loadAllTripData();
    } catch (err: any) {
      playSound('error');
      alert(err.message || 'Failed to confirm settlement.');
    } finally {
      setSettlingActionId(null);
    }
  };

  // Handle Decline / Reject a payment report
  const handleRejectReceipt = async (settlementId: string) => {
    const reason = prompt('Please provide a brief reason for declining (optional):');
    if (reason === null) return;
    setSettlingActionId(settlementId);
    try {
      await api.patch(`/settlements/${settlementId}/status`, {
        status: 'REJECTED',
        reason: reason || 'Payment not received',
      });
      playSound('error');
      showConfirmation({
        title: 'Payment Declined',
        message: 'Settlement rejected. The balance remains open.',
        sound: 'notification',
      });
      await loadAllTripData();
    } catch (err: any) {
      playSound('error');
      alert(err.message || 'Failed to reject settlement.');
    } finally {
      setSettlingActionId(null);
    }
  };

  // Void Expense
  const handleVoidExpense = async (expenseId: string, description: string) => {
    if (!confirm(`Are you sure you want to void "${description}"? This will exclude it from balance calculations.`)) {
      return;
    }
    try {
      await api.delete(`/expenses/${expenseId}`);
      showConfirmation({
        title: 'Expense voided',
        message: `"${description}" has been removed from balances.`,
        sound: 'notification',
      });
      await loadAllTripData();
    } catch (err: any) {
      alert(err.message || 'Failed to void expense.');
    }
  };

  // Copy Invite Code
  const handleCopyCode = () => {
    if (!trip) return;
    navigator.clipboard.writeText(trip.invite_code);
    setCopiedCode(true);
    showConfirmation({
      title: 'Invite code copied!',
      message: `Code ${trip.invite_code} copied to clipboard. Share it with friends to join.`,
      sound: 'notification',
    });
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // Share Location
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

  // Complete Trip
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

  // Fetch friends for inviting
  const openInviteFriendsModal = async () => {
    setIsMembersModalOpen(true);
    setLoadingFriends(true);
    setInviteError(null);
    try {
      const allFriends = await api.get<Friend[]>('/friends');
      const existingMemberUserIds = new Set(members.map((m) => m.user_id));
      const nonMembers = allFriends.filter((f) => !existingMemberUserIds.has(f.id));
      setFriends(nonMembers);
    } catch (err: any) {
      setInviteError(err.message || 'Failed to load friends list.');
    } finally {
      setLoadingFriends(false);
    }
  };

  const handleSendInvitations = async () => {
    if (!id || selectedFriendsToInvite.length === 0) return;
    setSendingInvites(true);
    setInviteError(null);
    try {
      await api.post(`/trips/${id}/invitations`, { friend_ids: selectedFriendsToInvite });
      playSound('trip_success');
      showConfirmation({
        title: 'Invitations sent! ✉️',
        message: `Invited ${selectedFriendsToInvite.length} friend(s) to join ${trip?.name}.`,
        sound: 'trip_success',
      });
      setSelectedFriendsToInvite([]);
      await loadAllTripData();
    } catch (err: any) {
      playSound('error');
      setInviteError(err.message || 'Failed to send invitations.');
    } finally {
      setSendingInvites(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-12 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-[#E8E8E5] border-t-[#16834A] rounded-full animate-spin mb-3" />
        <p className="text-sm font-medium text-[#737373]">Loading trip expenses and balances...</p>
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
          className="px-4 py-2 bg-[#171717] text-white rounded-xl text-sm font-semibold cursor-pointer"
        >
          Back to Trips
        </button>
      </div>
    );
  }

  const isTripCompleted = trip.status === 'COMPLETED' || Boolean(trip.completed_at);

  return (
    <div className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full space-y-6">
      {/* --- TOP TRIP HEADER --- */}
      <div className="bg-white rounded-2xl border border-[#E8E8E5] p-6 md:p-8 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold text-[#16834A] bg-[#DDF5E5] border border-[#C6ECCF] px-2.5 py-0.5 rounded-md">
                ONNA-GO
              </span>
              <span className="text-[11px] font-semibold text-[#737373] bg-[#FAFAF8] border border-[#E8E8E5] px-2.5 py-0.5 rounded-md">
                {trip.currency}
              </span>
              {isTripCompleted && (
                <span className="text-[11px] font-semibold text-[#16834A] bg-[#DDF5E5] border border-[#C6ECCF] px-2.5 py-0.5 rounded-md flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Completed</span>
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
                  <span>
                    {formatDate(trip.start_date)}{' '}
                    {trip.end_date ? `— ${formatDate(trip.end_date)}` : ''}
                  </span>
                </span>
              )}
              <button
                onClick={() => setIsMembersModalOpen(true)}
                className="flex items-center gap-1.5 font-semibold text-[#16834A] hover:underline cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>{members.length} members</span>
              </button>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* PROMINENT RECORD EXPENSE BUTTON */}
            <button
              onClick={() => setIsAddExpenseOpen(true)}
              className="inline-flex items-center justify-center gap-2 bg-[#16834A] hover:bg-[#136F3F] text-white font-semibold py-2.5 px-4 rounded-xl shadow-xs transition-all active:scale-[0.98] text-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record Expense</span>
            </button>

            {/* Members & Invite Modal Button */}
            <button
              onClick={openInviteFriendsModal}
              className="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-[#FAFAF8] border border-[#E8E8E5] text-[#171717] font-semibold py-2.5 px-3.5 rounded-xl shadow-xs transition-all active:scale-[0.98] text-sm cursor-pointer"
              title="View members and invitation code"
            >
              <UserPlus className="w-4 h-4 text-[#16834A]" />
              <span>Members &amp; Invite</span>
            </button>

            {/* Settlement History Button */}
            <button
              onClick={() => setIsHistoryModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-[#FAFAF8] border border-[#E8E8E5] text-[#171717] font-semibold py-2.5 px-3 rounded-xl shadow-xs transition-all active:scale-[0.98] text-sm cursor-pointer"
              title="Settlement audit history"
            >
              <History className="w-4 h-4 text-[#737373]" />
              <span className="hidden sm:inline">History</span>
            </button>

            {/* Trip Reports Export */}
            <button
              onClick={() => {
                downloadTripPdf(trip.id, trip.name);
              }}
              className="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-[#FAFAF8] border border-[#E8E8E5] text-[#171717] font-semibold py-2.5 px-3 rounded-xl shadow-xs transition-all active:scale-[0.98] text-sm cursor-pointer"
              title="Export Trip Report PDF"
            >
              <Download className="w-4 h-4 text-[#737373]" />
              <span className="hidden sm:inline">PDF</span>
            </button>

            {/* Complete / Summary Actions */}
            {isOwnerOrAdmin && !isTripCompleted && (
              <button
                onClick={() => setIsCompleteTripConfirmOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-[#FAFAF8] border border-[#E8E8E5] text-[#171717] font-semibold py-2.5 px-3 rounded-xl shadow-xs transition-all active:scale-[0.98] text-sm cursor-pointer"
                title="Finalize & complete trip"
              >
                <CheckCircle2 className="w-4 h-4 text-[#16834A]" />
                <span className="hidden sm:inline">End Trip</span>
              </button>
            )}

            {isTripCompleted && (
              <button
                onClick={() => setIsSummaryModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 bg-[#DDF5E5] text-[#16834A] border border-[#C6ECCF] font-semibold py-2.5 px-3.5 rounded-xl shadow-xs transition-all active:scale-[0.98] text-sm cursor-pointer"
              >
                <Trophy className="w-4 h-4" />
                <span>Summary</span>
              </button>
            )}
          </div>
        </div>

        {/* --- THREE CORE FINANCIAL METRIC CARDS --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-[#E8E8E5]">
          {/* 1. Total Trip Expenses */}
          <div className="bg-[#FAFAF8] border border-[#E8E8E5] rounded-2xl p-5 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#737373] block">
              Total Trip Expenses
            </span>
            <div className="text-2xl font-bold font-mono tracking-tight text-[#171717] tabular-nums">
              {formatPaise(totalTripExpensesPaise, trip.currency)}
            </div>
            <p className="text-[11px] text-[#737373]">
              Across {expenses.filter((e) => !e.is_void).length} active group expense(s)
            </p>
          </div>

          {/* 2. Current User's Share */}
          <div className="bg-[#FAFAF8] border border-[#E8E8E5] rounded-2xl p-5 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#737373] block">
              Your Share (Consumed)
            </span>
            <div className="text-2xl font-bold font-mono tracking-tight text-[#171717] tabular-nums">
              {formatPaise(userSharePaise, trip.currency)}
            </div>
            <p className="text-[11px] text-[#737373]">
              You paid {formatPaise(userPaidPaise, trip.currency)} out of pocket
            </p>
          </div>

          {/* 3. Current User's Net Balance */}
          <div
            className={`border rounded-2xl p-5 space-y-1 ${
              netBalancePaise > 0
                ? 'bg-[#E8F8EE] border-[#C6ECCF]'
                : netBalancePaise < 0
                ? 'bg-[#FFF1F2] border-[#FECDD3]'
                : 'bg-[#FAFAF8] border-[#E8E8E5]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#737373]">
                Your Net Balance
              </span>
              {netBalancePaise > 0 ? (
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#16834A] bg-white px-2 py-0.5 rounded-md border border-[#C6ECCF]">
                  Receiving
                </span>
              ) : netBalancePaise < 0 ? (
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#E11D48] bg-white px-2 py-0.5 rounded-md border border-[#FECDD3]">
                  You Owe
                </span>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#737373] bg-white px-2 py-0.5 rounded-md border border-[#E8E8E5]">
                  Settled
                </span>
              )}
            </div>

            <div
              className={`text-2xl font-bold font-mono tracking-tight tabular-nums ${
                netBalancePaise > 0
                  ? 'text-[#16834A]'
                  : netBalancePaise < 0
                  ? 'text-[#E11D48]'
                  : 'text-[#171717]'
              }`}
            >
              {netBalancePaise > 0
                ? `+${formatPaise(netBalancePaise, trip.currency)}`
                : netBalancePaise < 0
                ? `-${formatPaise(Math.abs(netBalancePaise), trip.currency)}`
                : formatPaise(0, trip.currency)}
            </div>

            <p className="text-[11px] text-[#737373]">
              {netBalancePaise > 0
                ? 'Other trip members owe you money'
                : netBalancePaise < 0
                ? 'You need to repay members below'
                : 'All your trip debts are fully settled'}
            </p>
          </div>
        </div>
      </div>

      {/* --- PENDING PAYMENT CONFIRMATIONS (Relevant to Logged-in User) --- */}
      {pendingForMeAsReceiver.length > 0 && (
        <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#B45309]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              Action Required: {pendingForMeAsReceiver.length} Payment(s) Awaiting Your Confirmation
            </span>
          </div>

          <div className="space-y-2.5">
            {pendingForMeAsReceiver.map((st) => (
              <div
                key={st.id}
                className="bg-white rounded-xl p-3.5 border border-[#FDE68A] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#171717]">{st.payer_name}</span>
                    <span className="text-xs text-[#737373]">
                      sent you{' '}
                      <strong className="text-[#16834A] font-mono">
                        {formatPaise(st.amount_paise, trip.currency)}
                      </strong>{' '}
                      via {st.payment_method}
                    </span>
                  </div>
                  {st.notes && (
                    <p className="text-[11px] text-[#737373] mt-0.5 italic">"{st.notes}"</p>
                  )}
                  <p className="text-[10px] text-[#A3A3A3] mt-0.5">
                    Reported on {formatDate(st.created_at)}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleConfirmReceipt(st.id)}
                    disabled={settlingActionId === st.id}
                    className="px-3.5 py-1.5 bg-[#16834A] hover:bg-[#136F3F] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {settlingActionId === st.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>Confirm Received</span>
                  </button>

                  <button
                    onClick={() => handleRejectReceipt(st.id)}
                    disabled={settlingActionId === st.id}
                    className="px-3 py-1.5 bg-white hover:bg-[#FAFAF8] text-[#E11D48] border border-[#FDA4AF] text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Not Received
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingFromMeAsPayer.length > 0 && (
        <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-[#2563EB] shrink-0" />
            <p className="text-xs text-[#1E40AF]">
              You submitted {pendingFromMeAsPayer.length} payment(s) awaiting receiver confirmation.
              Your balance will update automatically once confirmed by the recipient.
            </p>
          </div>
          <button
            onClick={() => setIsHistoryModalOpen(true)}
            className="text-xs font-bold text-[#2563EB] hover:underline shrink-0 cursor-pointer"
          >
            View Details
          </button>
        </div>
      )}

      {/* --- WHO OWES WHOM (SETTLEMENT PLAN) --- */}
      <div className="bg-white rounded-2xl border border-[#E8E8E5] p-6 md:p-7 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E8E8E5]">
          <div>
            <h2 className="text-base font-bold text-[#171717] font-['Plus_Jakarta_Sans'] flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#16834A]" />
              <span>Who Owes Whom</span>
            </h2>
            <p className="text-xs text-[#737373] mt-0.5">
              Optimized payment instructions calculated from net trip balances
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSettlePayer(undefined);
                setSettlePayee(undefined);
                setSettleAmount(undefined);
                setIsRecordSettlementOpen(true);
              }}
              className="text-xs font-semibold text-[#16834A] bg-[#DDF5E5] hover:bg-[#C6ECCF] px-3 py-1.5 rounded-xl border border-[#C6ECCF] transition-colors cursor-pointer"
            >
              Custom Settle
            </button>
          </div>
        </div>

        {suggestions.length === 0 ? (
          <div className="p-8 text-center bg-[#FAFAF8] rounded-2xl border border-[#E8E8E5] space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-[#DDF5E5] text-[#16834A] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#171717]">All debts are settled!</h3>
            <p className="text-xs text-[#737373] max-w-sm mx-auto">
              No outstanding payments required. Every trip member is completely balanced.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map((sug, idx) => {
              const isDebtor = sug.from_user_id === user?.id;
              const isReceiver = sug.to_user_id === user?.id;
              const pendingSt = getPendingSettlementForSuggestion(sug);

              return (
                <div
                  key={`${sug.from_user_id}-${sug.to_user_id}-${idx}`}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isDebtor
                      ? 'bg-[#FFF7ED] border-[#FED7AA]'
                      : isReceiver
                      ? 'bg-[#F0FDF4] border-[#BBF7D0]'
                      : 'bg-white border-[#E8E8E5]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Debtor Avatar & Name */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[#171717] text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {sug.from_user_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-[#171717] block truncate">
                          {sug.from_user_name}
                          {isDebtor ? ' (You)' : ''}
                        </span>
                        <span className="text-[10px] text-[#737373] uppercase font-semibold">
                          Debtor
                        </span>
                      </div>
                    </div>

                    <ArrowRight className="w-4 h-4 text-[#A3A3A3] shrink-0" />

                    {/* Receiver Avatar & Name */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[#16834A] text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {sug.to_user_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-[#171717] block truncate">
                          {sug.to_user_name}
                          {isReceiver ? ' (You)' : ''}
                        </span>
                        <span className="text-[10px] text-[#737373] uppercase font-semibold">
                          Receiver
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Amount and Contextual Action */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="text-left sm:text-right">
                      <span className="text-sm font-bold font-mono text-[#171717] block tabular-nums">
                        {formatPaise(sug.amount_paise, trip.currency)}
                      </span>
                      <span className="text-[10px] text-[#737373]">
                        {isDebtor ? 'You owe' : isReceiver ? 'You receive' : 'Transfer'}
                      </span>
                    </div>

                    {/* Pending State */}
                    {pendingSt ? (
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] text-[11px] font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Awaiting confirmation</span>
                        </span>
                        {isReceiver && (
                          <button
                            onClick={() => handleConfirmReceipt(pendingSt.id)}
                            disabled={settlingActionId === pendingSt.id}
                            className="px-2.5 py-1 bg-[#16834A] hover:bg-[#136F3F] text-white text-[11px] font-semibold rounded-lg shadow-xs cursor-pointer"
                          >
                            Confirm
                          </button>
                        )}
                      </div>
                    ) : isDebtor ? (
                      /* DEBTOR ACTION: Mark as Paid */
                      <button
                        onClick={() => handleOpenMarkAsPaid(sug)}
                        className="px-3.5 py-1.5 bg-[#171717] hover:bg-black text-white text-xs font-semibold rounded-xl shadow-xs transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1"
                      >
                        <HandCoins className="w-3.5 h-3.5" />
                        <span>Mark as Paid</span>
                      </button>
                    ) : isReceiver ? (
                      /* RECEIVER STATUS */
                      <span className="px-3 py-1 rounded-xl bg-[#DDF5E5] text-[#16834A] text-[11px] font-semibold border border-[#C6ECCF]">
                        Awaiting payment
                      </span>
                    ) : (
                      /* THIRD-PARTY OBSERVER */
                      <span className="px-3 py-1 rounded-xl bg-[#FAFAF8] text-[#737373] text-[11px] font-medium border border-[#E8E8E5]">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- RECENT EXPENSES SECTION --- */}
      <div className="bg-white rounded-2xl border border-[#E8E8E5] p-6 md:p-7 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E8E8E5]">
          <div>
            <h2 className="text-base font-bold text-[#171717] font-['Plus_Jakarta_Sans'] flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#16834A]" />
              <span>Recent Expenses</span>
            </h2>
            <p className="text-xs text-[#737373] mt-0.5">
              Latest expenses recorded and split across trip members
            </p>
          </div>

          {expenses.length > 0 && (
            <button
              onClick={() => setIsAllExpensesModalOpen(true)}
              className="text-xs font-semibold text-[#16834A] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View all ({expenses.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {recentExpenses.length === 0 ? (
          <div className="p-8 text-center bg-[#FAFAF8] rounded-2xl border border-[#E8E8E5] space-y-3">
            <Receipt className="w-8 h-8 text-[#A3A3A3] mx-auto" />
            <h3 className="text-sm font-bold text-[#171717]">No expenses recorded yet</h3>
            <p className="text-xs text-[#737373] max-w-sm mx-auto">
              Start recording food, stay, petrol, or tickets to automatically split costs.
            </p>
            <button
              onClick={() => setIsAddExpenseOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#16834A] text-white text-xs font-semibold rounded-xl shadow-xs cursor-pointer hover:bg-[#136F3F]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record First Expense</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#E8E8E5]">
            {recentExpenses.map((exp) => {
              const mySplit = exp.splits.find((s) => s.user_id === user?.id);
              const isPayer = exp.payer_id === user?.id;

              return (
                <div
                  key={exp.id}
                  className="py-3.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#FAFAF8] border border-[#E8E8E5] text-[#16834A] flex items-center justify-center font-bold text-xs shrink-0">
                      {exp.category.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-[#171717] truncate">
                        {exp.description}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-[#737373] mt-0.5 flex-wrap">
                        <span>Paid by {exp.payer_name}</span>
                        <span>•</span>
                        <span>{formatDate(exp.date)}</span>
                        <span>•</span>
                        <span className="text-[#16834A] font-semibold">
                          {exp.splits.length} split
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold font-mono text-[#171717] block tabular-nums">
                      {formatPaise(exp.amount_paise, trip.currency)}
                    </span>
                    <span className="text-[11px] text-[#737373]">
                      {mySplit ? (
                        <span>
                          Your share: <strong className="text-[#171717] font-mono">{formatPaise(mySplit.amount_paise, trip.currency)}</strong>
                        </span>
                      ) : (
                        <span>Not in split</span>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- MEMBERS & INVITE MODAL --- */}
      {isMembersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E8E8E5] shadow-2xl max-w-lg w-full p-6 sm:p-7 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#E8E8E5]">
              <div>
                <h3 className="text-lg font-bold text-[#171717] font-['Plus_Jakarta_Sans']">
                  Trip Members &amp; Invitations
                </h3>
                <p className="text-xs text-[#737373] mt-0.5">
                  Manage participants and invite friends to {trip.name}
                </p>
              </div>
              <button
                onClick={() => setIsMembersModalOpen(false)}
                className="p-1.5 text-[#737373] hover:text-[#171717] rounded-lg hover:bg-[#F4F4F2] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 space-y-6">
              {/* Trip Invite Code Card (Hidden from main page, accessible here) */}
              <div className="bg-[#FAFAF8] border border-[#E8E8E5] rounded-2xl p-4 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#737373]">
                  Trip Invite Code
                </span>
                <div className="flex items-center justify-between gap-3 bg-white border border-[#E8E8E5] rounded-xl px-4 py-3">
                  <span className="text-lg font-mono font-bold tracking-widest text-[#171717]">
                    {trip.invite_code}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#171717] hover:bg-black text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer transition-colors"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-[#16834A]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-[#737373]">
                  Anyone with this code can join this trip from their dashboard.
                </p>
              </div>

              {/* Members List */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
                  Current Members ({members.length})
                </h4>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {members.map((m) => (
                    <div
                      key={m.user_id}
                      className="flex items-center justify-between p-3 rounded-xl border border-[#E8E8E5] bg-white"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#171717] text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {m.user_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#171717] truncate">
                            {m.user_name} {m.user_id === user?.id ? '(You)' : ''}
                          </p>
                          <p className="text-[10px] text-[#737373] truncate">{m.user_email}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#FAFAF8] text-[#737373] border border-[#E8E8E5]">
                        {m.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Invite Friends from Friends List */}
              <div className="space-y-3 pt-2 border-t border-[#E8E8E5]">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
                  Invite Friends Directly
                </h4>
                {loadingFriends ? (
                  <div className="p-4 text-center text-xs text-[#737373]">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />
                    <span>Loading friends...</span>
                  </div>
                ) : friends.length === 0 ? (
                  <p className="text-xs text-[#737373] p-3 rounded-xl bg-[#FAFAF8] border border-[#E8E8E5] text-center">
                    All your friends are already in this trip, or you have not added friends yet.{' '}
                    <a href="/friends" className="text-[#16834A] font-semibold hover:underline">
                      Find friends here
                    </a>.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                      {friends.map((f) => {
                        const isSelected = selectedFriendsToInvite.includes(f.id);
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => {
                              setSelectedFriendsToInvite((prev) =>
                                isSelected ? prev.filter((uid) => uid !== f.id) : [...prev, f.id]
                              );
                            }}
                            className={`flex items-center justify-between p-2.5 rounded-xl border text-left text-xs transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-[#FAFAF8] border-[#16834A] text-[#171717]'
                                : 'bg-white border-[#E8E8E5] text-[#737373]'
                            }`}
                          >
                            <span className="font-semibold truncate">{f.display_name}</span>
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center ${
                                isSelected ? 'bg-[#16834A] border-[#16834A] text-white' : 'border-[#D4D4D0]'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {inviteError && (
                      <p className="text-xs text-[#E11D48] mt-1">{inviteError}</p>
                    )}

                    <button
                      onClick={handleSendInvitations}
                      disabled={sendingInvites || selectedFriendsToInvite.length === 0}
                      className="w-full mt-2 py-2.5 bg-[#16834A] hover:bg-[#136F3F] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {sendingInvites ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <UserPlus className="w-3.5 h-3.5" />
                      )}
                      <span>
                        Send Invitations ({selectedFriendsToInvite.length} selected)
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- SETTLEMENT AUDIT HISTORY MODAL --- */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E8E8E5] shadow-2xl max-w-lg w-full p-6 sm:p-7 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#E8E8E5]">
              <div>
                <h3 className="text-lg font-bold text-[#171717] font-['Plus_Jakarta_Sans']">
                  Settlement History
                </h3>
                <p className="text-xs text-[#737373] mt-0.5">
                  Audit log of all payment reports and confirmations
                </p>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-1.5 text-[#737373] hover:text-[#171717] rounded-lg hover:bg-[#F4F4F2] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {settlements.length === 0 ? (
                <p className="text-xs text-[#737373] text-center p-6 bg-[#FAFAF8] rounded-xl border border-[#E8E8E5]">
                  No settlements recorded yet for this trip.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {settlements.map((st) => (
                    <div
                      key={st.id}
                      className="p-3.5 rounded-xl border border-[#E8E8E5] bg-white flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5 font-semibold text-[#171717]">
                          <span>{st.payer_name}</span>
                          <ArrowRight className="w-3 h-3 text-[#A3A3A3]" />
                          <span>{st.payee_name}</span>
                        </div>
                        <p className="text-[11px] text-[#737373] mt-0.5">
                          Method: {st.payment_method} • {formatDate(st.created_at)}
                        </p>
                        {st.notes && (
                          <p className="text-[10px] text-[#A3A3A3] italic mt-0.5">"{st.notes}"</p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-sm text-[#171717] block tabular-nums">
                          {formatPaise(st.amount_paise, trip.currency)}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md inline-block mt-1 ${
                            st.status === 'CONFIRMED'
                              ? 'bg-[#DDF5E5] text-[#16834A]'
                              : st.status === 'REJECTED' || st.status === 'CANCELLED'
                              ? 'bg-[#FFE4E6] text-[#E11D48]'
                              : 'bg-[#FEF3C7] text-[#B45309]'
                          }`}
                        >
                          {st.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- ALL EXPENSES MODAL --- */}
      {isAllExpensesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E8E8E5] shadow-2xl max-w-2xl w-full p-6 sm:p-7 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#E8E8E5]">
              <div>
                <h3 className="text-lg font-bold text-[#171717] font-['Plus_Jakarta_Sans']">
                  All Trip Expenses ({expenses.filter((e) => !e.is_void).length})
                </h3>
                <p className="text-xs text-[#737373] mt-0.5">
                  Complete list of expenses recorded for {trip.name}
                </p>
              </div>
              <button
                onClick={() => setIsAllExpensesModalOpen(false)}
                className="p-1.5 text-[#737373] hover:text-[#171717] rounded-lg hover:bg-[#F4F4F2] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter controls */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={expenseSearch}
                onChange={(e) => setExpenseSearch(e.target.value)}
                placeholder="Search description..."
                className="bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3 py-2 text-xs text-[#171717]"
              />

              <select
                value={expenseFilterCategory}
                onChange={(e) => setExpenseFilterCategory(e.target.value)}
                className="bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3 py-2 text-xs text-[#171717]"
              >
                <option value="All">All Categories</option>
                {['Food', 'Fuel', 'Transport', 'Stay', 'Activities', 'Shopping', 'Tickets', 'Other'].map(
                  (c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  )
                )}
              </select>

              <select
                value={expenseFilterPayer}
                onChange={(e) => setExpenseFilterPayer(e.target.value)}
                className="bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3 py-2 text-xs text-[#171717]"
              >
                <option value="All">All Payers</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.user_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Expenses list */}
            <div className="mt-4 divide-y divide-[#E8E8E5]">
              {expenses
                .filter((e) => {
                  if (e.is_void) return false;
                  if (expenseFilterCategory !== 'All' && e.category !== expenseFilterCategory)
                    return false;
                  if (expenseFilterPayer !== 'All' && e.payer_id !== expenseFilterPayer) return false;
                  if (
                    expenseSearch &&
                    !e.description.toLowerCase().includes(expenseSearch.toLowerCase())
                  )
                    return false;
                  return true;
                })
                .map((exp) => {
                  const mySplit = exp.splits.find((s) => s.user_id === user?.id);
                  const canVoid = isOwnerOrAdmin || exp.created_by_id === user?.id;

                  return (
                    <div
                      key={exp.id}
                      className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-[#FAFAF8] border border-[#E8E8E5] text-[#16834A] flex items-center justify-center font-bold text-xs shrink-0">
                          {exp.category.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#171717] truncate">{exp.description}</p>
                          <p className="text-[11px] text-[#737373]">
                            Paid by {exp.payer_name} • {formatDate(exp.date)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="text-xs font-bold font-mono text-[#171717] block tabular-nums">
                            {formatPaise(exp.amount_paise, trip.currency)}
                          </span>
                          <span className="text-[10px] text-[#737373]">
                            {mySplit ? `Your share: ${formatPaise(mySplit.amount_paise, trip.currency)}` : 'Not in split'}
                          </span>
                        </div>

                        {canVoid && (
                          <button
                            onClick={() => handleVoidExpense(exp.id, exp.description)}
                            className="p-1.5 text-[#A3A3A3] hover:text-[#E11D48] rounded-lg transition-colors cursor-pointer"
                            title="Void expense"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* --- ADD EXPENSE MODAL --- */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        tripId={trip.id}
        currency={trip.currency}
        members={members}
        activities={[]}
        onExpenseAdded={() => {
          loadAllTripData();
        }}
      />

      {/* --- RECORD SETTLEMENT MODAL --- */}
      <RecordSettlementModal
        isOpen={isRecordSettlementOpen}
        onClose={() => setIsRecordSettlementOpen(false)}
        tripId={trip.id}
        members={members}
        initialPayerId={settlePayer}
        initialPayeeId={settlePayee}
        initialAmountPaise={settleAmount}
        onSettlementRecorded={() => {
          loadAllTripData();
        }}
      />

      {/* --- TRIP SUMMARY & REPORT MODAL --- */}
      <TripSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        tripId={trip.id}
      />

      {/* --- COMPLETE TRIP CONFIRMATION DIALOG --- */}
      {isCompleteTripConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E8E8E5] shadow-2xl max-w-md w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#DDF5E5] text-[#16834A] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#171717]">Finalize &amp; End Trip?</h3>
              <p className="text-xs text-[#737373] mt-1">
                Marking this trip as completed will permanently finalize balances and save it to your trip history archive. You can still export reports and view summaries anytime.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCompleteTripConfirmOpen(false)}
                className="flex-1 py-2.5 bg-white hover:bg-[#FAFAF8] border border-[#E8E8E5] text-xs font-semibold rounded-xl text-[#737373] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompleteTrip}
                disabled={completingTrip}
                className="flex-1 py-2.5 bg-[#16834A] hover:bg-[#136F3F] text-white text-xs font-semibold rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {completingTrip ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>End Trip</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

