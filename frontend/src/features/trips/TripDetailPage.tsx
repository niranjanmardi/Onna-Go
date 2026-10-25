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
  AlertCircle,
  Clock,
  Download,
  Trash2,
  UserPlus,
  X,
  Loader2,
  Share2,
  Trophy,
  CheckCircle2,
  Filter,
  ArrowRight,
  ChevronRight,
  History,
  Search,
  SlidersHorizontal,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { api, getAvatarUrl } from '@/lib/api-client';
import {
  Trip,
  TripMember,
  Expense,
  TripBalances,
  SettlementSuggestion,
  Settlement,
  Friend,
} from '@/types';
import { formatPaise, formatDate, rupeesToPaise } from '@/lib/currency';
import { useAuth } from '@/features/auth/AuthContext';
import { AddExpenseModal } from '@/features/expenses/AddExpenseModal';
import { RecordSettlementModal } from '@/features/settlements/RecordSettlementModal';
import { TripSummaryModal } from '@/features/trips/TripSummaryModal';
import { useFeedback } from '@/context/FeedbackContext';
import { playSound } from '@/lib/sounds';
import { downloadTripPdf, downloadTripCsv } from '@/lib/export-utils';
import {
  cacheTripDetails,
  getCachedTripDetails,
  getOutboxItemsForTrip,
} from '@/lib/offline-db';

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
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isEndTripModalOpen, setIsEndTripModalOpen] = useState(false);
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
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLocation, setCopiedLocation] = useState(false);

  // Expenses filtering suite
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseFilterPayer, setExpenseFilterPayer] = useState('All');
  const [expenseFilterSplitMethod, setExpenseFilterSplitMethod] = useState('All');
  const [expenseFilterDateRange, setExpenseFilterDateRange] = useState<'all' | '7days' | 'month' | 'custom'>('all');
  const [expenseFilterCustomStart, setExpenseFilterCustomStart] = useState('');
  const [expenseFilterCustomEnd, setExpenseFilterCustomEnd] = useState('');
  const [expenseFilterMinAmount, setExpenseFilterMinAmount] = useState('');
  const [expenseFilterMaxAmount, setExpenseFilterMaxAmount] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Load all trip data (with offline cache fallback & outbox merge)
  const loadAllTripData = async () => {
    if (!id) return;
    try {
      let tData: Trip | null = null;
      let mData: TripMember[] = [];
      let eData: Expense[] = [];
      let bData: TripBalances | null = null;
      let sData: SettlementSuggestion[] = [];
      let stData: Settlement[] = [];

      try {
        const [resT, resM, resE, resB, resS, resSt] = await Promise.all([
          api.get<Trip>(`/trips/${id}`),
          api.get<TripMember[]>(`/trips/${id}/members`),
          api.get<Expense[]>(`/expenses/trip/${id}`),
          api.get<TripBalances>(`/balances/trip/${id}`).catch(() => null),
          api.get<{ trip_id: string; suggestions: SettlementSuggestion[] }>(
            `/balances/trip/${id}/suggestions`
          ).catch(() => ({ trip_id: id, suggestions: [] })),
          api.get<Settlement[]>(`/settlements/trip/${id}`).catch(() => []),
        ]);
        tData = resT;
        mData = resM;
        eData = resE;
        bData = resB;
        sData = resS?.suggestions || [];
        stData = resSt;

        // Cache fresh trip details for offline use
        cacheTripDetails(id, tData, eData, stData, mData).catch(console.error);
      } catch (networkErr: any) {
        // Fall back to offline IndexedDB cache
        const cached = await getCachedTripDetails(id).catch(() => null);
        if (cached) {
          tData = cached.trip;
          mData = cached.members;
          eData = cached.expenses;
          stData = cached.settlements;
        } else {
          throw networkErr;
        }
      }

      // Merge local pending outbox items for this trip
      try {
        const outboxItems = await getOutboxItemsForTrip(id);
        const pendingExpenses: Expense[] = [];
        const pendingSettlements: Settlement[] = [];

        for (const item of outboxItems) {
          if (item.type === 'EXPENSE') {
            const alreadyPresent = eData.some(
              (e) => (e.client_id && e.client_id === item.client_id) || e.id === item.client_id
            );
            if (!alreadyPresent) {
              const payer = mData.find((m) => m.user_id === item.payload.payer_id);
              pendingExpenses.push({
                id: item.client_id,
                trip_id: item.trip_id,
                payer_id: item.payload.payer_id,
                payer_name: payer?.user_name || 'Member',
                description: item.payload.description,
                amount_paise: item.payload.amount_paise,
                currency: item.payload.currency || tData?.currency || 'INR',
                category: item.payload.category || 'Other',
                split_method: item.payload.split_method || 'EQUAL',
                date: item.payload.date || item.created_at,
                notes: item.payload.notes || null,
                is_void: false,
                client_id: item.client_id,
                is_pending_sync: true,
                created_by_id: item.payload.payer_id,
                created_at: item.created_at,
                splits: (item.payload.splits || []).map((s: any) => ({
                  id: s.id || item.client_id,
                  user_id: s.user_id,
                  user_name:
                    s.user_name ||
                    mData.find((m) => m.user_id === s.user_id)?.user_name ||
                    'Member',
                  user_email: '',
                  amount_paise: s.amount_paise || 0,
                  percentage: s.percentage || null,
                  shares: s.shares || null,
                })),
              });
            }
          } else if (item.type === 'SETTLEMENT') {
            const alreadyPresent = stData.some(
              (s) => (s.client_id && s.client_id === item.client_id) || s.id === item.client_id
            );
            if (!alreadyPresent) {
              const payer = mData.find((m) => m.user_id === item.payload.payer_id);
              const payee = mData.find((m) => m.user_id === item.payload.payee_id);
              pendingSettlements.push({
                id: item.client_id,
                trip_id: item.trip_id,
                payer_id: item.payload.payer_id,
                payer_name: payer?.user_name || 'Member',
                payee_id: item.payload.payee_id,
                payee_name: payee?.user_name || 'Member',
                amount_paise: item.payload.amount_paise,
                status: 'PENDING_CONFIRMATION',
                payment_method: item.payload.payment_method || 'CASH',
                reference_id: item.payload.reference_id || null,
                notes: item.payload.notes || null,
                client_id: item.client_id,
                is_pending_sync: true,
                created_by_id: item.payload.payer_id,
                created_at: item.created_at,
                updated_at: item.created_at,
              });
            }
          }
        }

        eData = [...pendingExpenses, ...eData];
        stData = [...pendingSettlements, ...stData];
      } catch (outboxErr) {
        console.error('Error reading outbox items:', outboxErr);
      }

      if (tData) setTrip(tData);
      setMembers(mData);
      setExpenses(eData);
      setBalances(bData);
      setSuggestions(sData);
      setSettlements(stData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load trip information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllTripData();

    const handleSynced = (e: any) => {
      if (!e.detail?.trip_id || e.detail?.trip_id === id) {
        loadAllTripData();
      }
    };

    const handleOnline = () => {
      loadAllTripData();
    };

    window.addEventListener('onnago:item-synced', handleSynced);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('onnago:item-synced', handleSynced);
      window.removeEventListener('online', handleOnline);
    };
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

  // Exact user-specific figures (fallback to backend trip response if balances is loading)
  const netBalancePaise = userBalanceItem?.net_balance_paise ?? trip?.user_net_balance_paise ?? 0;
  const userSharePaise = userBalanceItem?.total_share_paise ?? trip?.user_share_paise ?? 0;
  const userPaidPaise = userBalanceItem?.total_spent_paise ?? trip?.user_contribution_paise ?? 0;
  const totalTripExpensesPaise = balances?.total_expenses_paise ?? trip?.total_expenses_paise ?? 0;

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

  // Unsettled balances across all members (for End Trip validation)
  const unsettledMembers = useMemo(() => {
    if (!balances?.balances) return [];
    return balances.balances.filter((b) => Math.abs(b.net_balance_paise) > 1);
  }, [balances]);

  const canFinalizeTrip = unsettledMembers.length === 0 && pendingSettlements.length === 0;

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (e.is_void) return false;

      // Search description & payer
      if (expenseSearch.trim()) {
        const q = expenseSearch.toLowerCase().trim();
        const matchesDesc = e.description.toLowerCase().includes(q);
        const matchesPayer = e.payer_name?.toLowerCase().includes(q);
        if (!matchesDesc && !matchesPayer) return false;
      }

      // Paid by
      if (expenseFilterPayer !== 'All' && e.payer_id !== expenseFilterPayer) {
        return false;
      }

      // Split method
      if (expenseFilterSplitMethod !== 'All') {
        if (expenseFilterSplitMethod === 'EQUAL' && e.split_method !== 'EQUAL') return false;
        if (expenseFilterSplitMethod === 'SELECTED' && e.split_method !== 'SELECTED') return false;
      }

      // Date range
      if (expenseFilterDateRange === '7days') {
        const expDate = new Date(e.date);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        if (expDate < sevenDaysAgo) return false;
      } else if (expenseFilterDateRange === 'month') {
        const expDate = new Date(e.date);
        const now = new Date();
        if (expDate.getMonth() !== now.getMonth() || expDate.getFullYear() !== now.getFullYear()) {
          return false;
        }
      } else if (expenseFilterDateRange === 'custom') {
        const expDate = new Date(e.date);
        if (expenseFilterCustomStart && expDate < new Date(expenseFilterCustomStart)) return false;
        if (expenseFilterCustomEnd && expDate > new Date(`${expenseFilterCustomEnd}T23:59:59`)) return false;
      }

      // Amount range
      if (expenseFilterMinAmount) {
        const minPaise = rupeesToPaise(expenseFilterMinAmount);
        if (e.amount_paise < minPaise) return false;
      }
      if (expenseFilterMaxAmount) {
        const maxPaise = rupeesToPaise(expenseFilterMaxAmount);
        if (e.amount_paise > maxPaise) return false;
      }

      return true;
    });
  }, [
    expenses,
    expenseSearch,
    expenseFilterPayer,
    expenseFilterSplitMethod,
    expenseFilterDateRange,
    expenseFilterCustomStart,
    expenseFilterCustomEnd,
    expenseFilterMinAmount,
    expenseFilterMaxAmount,
  ]);

  const hasActiveFilters =
    Boolean(expenseSearch) ||
    expenseFilterPayer !== 'All' ||
    expenseFilterSplitMethod !== 'All' ||
    expenseFilterDateRange !== 'all' ||
    Boolean(expenseFilterMinAmount) ||
    Boolean(expenseFilterMaxAmount);

  const handleClearFilters = () => {
    setExpenseSearch('');
    setExpenseFilterPayer('All');
    setExpenseFilterSplitMethod('All');
    setExpenseFilterDateRange('all');
    setExpenseFilterCustomStart('');
    setExpenseFilterCustomEnd('');
    setExpenseFilterMinAmount('');
    setExpenseFilterMaxAmount('');
  };

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

  // Finalize & End Trip
  const handleFinalizeTrip = async () => {
    if (!id || !trip) return;
    setCompletingTrip(true);
    try {
      await api.post(`/trips/${id}/complete`);
      playSound('settlement_success');
      showConfirmation({
        title: 'Trip Ended & Finalized! 🏁',
        message: 'All balances confirmed and saved to permanent history archive.',
        sound: 'settlement_success',
      });
      await loadAllTripData();
      setIsEndTripModalOpen(false);
      setIsSummaryModalOpen(true);
    } catch (err: any) {
      playSound('error');
      alert(err.message || 'Failed to finalize trip.');
    } finally {
      setCompletingTrip(false);
    }
  };

  // Fetch friends for inviting
  const openInviteFriendsModal = async () => {
    setIsMembersModalOpen(true);
    setLoadingFriends(true);
    setInviteError(null);
    setShowInviteCode(false);
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
      <div className="flex-1 p-8 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#E8E8E5] border-t-[#16834A] rounded-full animate-spin" />
          <p className="text-xs font-semibold text-[#737373]">Loading trip details...</p>
        </div>
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
                  <span>Trip Ended</span>
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
                onClick={openInviteFriendsModal}
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
            {!isTripCompleted && (
              <button
                onClick={() => setIsAddExpenseOpen(true)}
                className="inline-flex items-center justify-center gap-2 bg-[#16834A] hover:bg-[#136F3F] text-white font-semibold py-2.5 px-4 rounded-xl shadow-xs transition-all active:scale-[0.98] text-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Record Expense</span>
              </button>
            )}

            {/* Members & Invite Modal Button */}
            <button
              onClick={openInviteFriendsModal}
              className="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-[#FAFAF8] border border-[#E8E8E5] text-[#171717] font-semibold py-2.5 px-3.5 rounded-xl shadow-xs transition-all active:scale-[0.98] text-sm cursor-pointer"
              title="View members and invitation code"
            >
              <UserPlus className="w-4 h-4 text-[#16834A]" />
              <span>Members</span>
            </button>

            {/* End Trip Action (For trip owner/admin) */}
            {isOwnerOrAdmin && !isTripCompleted && (
              <button
                onClick={() => setIsEndTripModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 bg-[#171717] hover:bg-black text-white font-semibold py-2.5 px-3.5 rounded-xl shadow-xs transition-all active:scale-[0.98] text-sm cursor-pointer"
                title="Settle all balances and finalize trip"
              >
                <CheckCircle2 className="w-4 h-4 text-[#C6ECCF]" />
                <span>End Trip</span>
              </button>
            )}

            {/* Completed Summary Action */}
            {isTripCompleted && (
              <button
                onClick={() => setIsSummaryModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 bg-[#DDF5E5] text-[#16834A] border border-[#C6ECCF] font-semibold py-2.5 px-3.5 rounded-xl shadow-xs transition-all active:scale-[0.98] text-sm cursor-pointer"
              >
                <Trophy className="w-4 h-4" />
                <span>Trip Summary</span>
              </button>
            )}

            {/* Settlement Audit History */}
            <button
              onClick={() => setIsHistoryModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-[#FAFAF8] border border-[#E8E8E5] text-[#737373] hover:text-[#171717] font-semibold py-2.5 px-3 rounded-xl shadow-xs transition-all active:scale-[0.98] text-sm cursor-pointer"
              title="Settlement History"
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
            </button>

            {/* Reports Export */}
            <button
              onClick={() => downloadTripPdf(trip.id, trip.name)}
              className="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-[#FAFAF8] border border-[#E8E8E5] text-[#737373] hover:text-[#171717] font-semibold py-2.5 px-3 rounded-xl shadow-xs transition-all active:scale-[0.98] text-sm cursor-pointer"
              title="Download PDF report"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </div>

        {/* --- FOUR USER-SPECIFIC FINANCIAL METRIC CARDS --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-[#E8E8E5]">
          {/* 1. Total Trip Expenses */}
          <div className="bg-[#FAFAF8] border border-[#E8E8E5] rounded-2xl p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#737373] block">
              Total Trip Expenses
            </span>
            <div className="text-xl font-bold font-mono tracking-tight text-[#171717] tabular-nums">
              {formatPaise(totalTripExpensesPaise, trip.currency)}
            </div>
            <p className="text-[11px] text-[#737373]">
              Across {expenses.filter((e) => !e.is_void).length} group expense(s)
            </p>
          </div>

          {/* 2. You Paid */}
          <div className="bg-[#FAFAF8] border border-[#E8E8E5] rounded-2xl p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#737373] block">
              You Paid
            </span>
            <div className="text-xl font-bold font-mono tracking-tight text-[#171717] tabular-nums">
              {formatPaise(userPaidPaise, trip.currency)}
            </div>
            <p className="text-[11px] text-[#737373]">
              Paid out of pocket by you
            </p>
          </div>

          {/* 3. Your Share */}
          <div className="bg-[#FAFAF8] border border-[#E8E8E5] rounded-2xl p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#737373] block">
              Your Share
            </span>
            <div className="text-xl font-bold font-mono tracking-tight text-[#171717] tabular-nums">
              {formatPaise(userSharePaise, trip.currency)}
            </div>
            <p className="text-[11px] text-[#737373]">
              Your consumed expense share
            </p>
          </div>

          {/* 4. Your Net Balance */}
          <div
            className={`border rounded-2xl p-4 space-y-1 ${
              netBalancePaise > 0
                ? 'bg-[#E8F8EE] border-[#C6ECCF]'
                : netBalancePaise < 0
                ? 'bg-[#FFF1F2] border-[#FECDD3]'
                : 'bg-[#FAFAF8] border-[#E8E8E5]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#737373]">
                Your Net Balance
              </span>
              {netBalancePaise > 0 ? (
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#16834A] bg-white px-2 py-0.5 rounded-md border border-[#C6ECCF]">
                  You Receive
                </span>
              ) : netBalancePaise < 0 ? (
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#E11D48] bg-white px-2 py-0.5 rounded-md border border-[#FECDD3]">
                  You Owe
                </span>
              ) : (
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#737373] bg-white px-2 py-0.5 rounded-md border border-[#E8E8E5]">
                  Settled
                </span>
              )}
            </div>

            <div
              className={`text-xl font-bold font-mono tracking-tight tabular-nums ${
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
                ? 'Members owe this money to you'
                : netBalancePaise < 0
                ? 'You need to pay members below'
                : 'All your trip debts are fully settled'}
            </p>
          </div>
        </div>
      </div>

      {/* --- PENDING PAYMENT CONFIRMATIONS BANNER --- */}
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-[#171717]">{st.payer_name}</span>
                    <span className="text-xs text-[#737373]">
                      says they paid you{' '}
                      <strong className="text-[#16834A] font-mono">
                        {formatPaise(st.amount_paise, trip.currency)}
                      </strong>{' '}
                      via {st.payment_method}.
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
              Waiting for receiver confirmation: You marked {pendingFromMeAsPayer.length} payment(s) as paid.
              Your balance will update automatically once confirmed by the recipient.
            </p>
          </div>
          <button
            onClick={() => setIsHistoryModalOpen(true)}
            className="text-xs font-bold text-[#2563EB] hover:underline shrink-0 cursor-pointer"
          >
            View
          </button>
        </div>
      )}

      {/* --- WHO OWES WHOM (SETTLEMENT SECTION) --- */}
      <div className="bg-white rounded-2xl border border-[#E8E8E5] p-6 md:p-7 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E8E8E5]">
          <div>
            <h2 className="text-base font-bold text-[#171717] font-['Plus_Jakarta_Sans'] flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#16834A]" />
              <span>Who Owes Whom</span>
            </h2>
            <p className="text-xs text-[#737373] mt-0.5">
              Clear payment directions calculated from everyone's net trip balance
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
                        {isDebtor
                          ? `You need to pay ${sug.to_user_name}`
                          : isReceiver
                          ? `You will receive from ${sug.from_user_name}`
                          : `${sug.from_user_name} pays ${sug.to_user_name}`}
                      </span>
                    </div>

                    {/* Actions and Status */}
                    {pendingSt ? (
                      <div className="flex items-center gap-2">
                        {pendingSt.is_pending_sync ? (
                          <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1 animate-pulse">
                            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            <span>Waiting to sync</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] text-[11px] font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Awaiting confirmation</span>
                          </span>
                        )}
                        {isReceiver && !pendingSt.is_pending_sync && (
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
                      <button
                        onClick={() => handleOpenMarkAsPaid(sug)}
                        className="px-3.5 py-1.5 bg-[#171717] hover:bg-black text-white text-xs font-semibold rounded-xl shadow-xs transition-all active:scale-[0.98] cursor-pointer flex items-center gap-1"
                      >
                        <HandCoins className="w-3.5 h-3.5" />
                        <span>Mark as Paid</span>
                      </button>
                    ) : isReceiver ? (
                      <span className="px-3 py-1 rounded-xl bg-[#DDF5E5] text-[#16834A] text-[11px] font-semibold border border-[#C6ECCF]">
                        Awaiting payment
                      </span>
                    ) : (
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

      {/* --- EXPENSES & BEGINNER-FRIENDLY FILTERS --- */}
      <div className="bg-white rounded-2xl border border-[#E8E8E5] p-6 md:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8E8E5]">
          <div>
            <h2 className="text-base font-bold text-[#171717] font-['Plus_Jakarta_Sans'] flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#16834A]" />
              <span>Trip Expenses</span>
              <span className="text-xs font-semibold text-[#737373] bg-[#FAFAF8] border border-[#E8E8E5] px-2 py-0.5 rounded-full">
                {filteredExpenses.length} of {expenses.filter((e) => !e.is_void).length}
              </span>
            </h2>
            <p className="text-xs text-[#737373] mt-0.5">
              Review and filter all expenses recorded for this trip
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors flex items-center gap-1.5 cursor-pointer ${
                hasActiveFilters || showAdvancedFilters
                  ? 'bg-[#16834A] text-white border-[#16834A]'
                  : 'bg-white text-[#737373] hover:text-[#171717] border-[#E8E8E5]'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters {hasActiveFilters ? '• Active' : ''}</span>
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs font-semibold text-[#E11D48] hover:underline cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter Inputs */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Search description */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#A3A3A3] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={expenseSearch}
                onChange={(e) => setExpenseSearch(e.target.value)}
                placeholder="Search description or payer..."
                className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl pl-8 pr-3 py-2 text-xs text-[#171717] focus:outline-none focus:border-[#16834A]"
              />
            </div>

            {/* Paid By Filter */}
            <select
              value={expenseFilterPayer}
              onChange={(e) => setExpenseFilterPayer(e.target.value)}
              className="bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3 py-2 text-xs text-[#171717] focus:outline-none focus:border-[#16834A]"
            >
              <option value="All">Paid by: All Members</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  Paid by: {m.user_name}
                </option>
              ))}
            </select>

            {/* Split Method Filter */}
            <select
              value={expenseFilterSplitMethod}
              onChange={(e) => setExpenseFilterSplitMethod(e.target.value)}
              className="bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3 py-2 text-xs text-[#171717] focus:outline-none focus:border-[#16834A]"
            >
              <option value="All">All Split Types</option>
              <option value="EQUAL">Split Equally</option>
              <option value="SELECTED">Selected Members</option>
            </select>
          </div>

          {/* Advanced collapsible filters: Date Range & Amount Range */}
          {showAdvancedFilters && (
            <div className="p-3.5 bg-[#FAFAF8] rounded-xl border border-[#E8E8E5] space-y-3 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Date range presets */}
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#737373] block mb-1.5">
                    Date Range
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['all', '7days', 'month', 'custom'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setExpenseFilterDateRange(r)}
                        className={`py-1 text-[11px] font-semibold rounded-lg border text-center transition-colors cursor-pointer ${
                          expenseFilterDateRange === r
                            ? 'bg-[#171717] text-white border-[#171717]'
                            : 'bg-white text-[#737373] hover:text-[#171717] border-[#E8E8E5]'
                        }`}
                      >
                        {r === 'all'
                          ? 'All Time'
                          : r === '7days'
                          ? 'Last 7D'
                          : r === 'month'
                          ? 'This Month'
                          : 'Custom'}
                      </button>
                    ))}
                  </div>

                  {expenseFilterDateRange === 'custom' && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <input
                        type="date"
                        value={expenseFilterCustomStart}
                        onChange={(e) => setExpenseFilterCustomStart(e.target.value)}
                        className="bg-white border border-[#E8E8E5] rounded-lg p-1.5 text-[11px] text-[#171717]"
                      />
                      <input
                        type="date"
                        value={expenseFilterCustomEnd}
                        onChange={(e) => setExpenseFilterCustomEnd(e.target.value)}
                        className="bg-white border border-[#E8E8E5] rounded-lg p-1.5 text-[11px] text-[#171717]"
                      />
                    </div>
                  )}
                </div>

                {/* Amount range */}
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#737373] block mb-1.5">
                    Amount Range (₹)
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={expenseFilterMinAmount}
                      onChange={(e) => setExpenseFilterMinAmount(e.target.value)}
                      placeholder="Min ₹"
                      className="bg-white border border-[#E8E8E5] rounded-lg p-1.5 text-[11px] text-[#171717]"
                    />
                    <input
                      type="number"
                      value={expenseFilterMaxAmount}
                      onChange={(e) => setExpenseFilterMaxAmount(e.target.value)}
                      placeholder="Max ₹"
                      className="bg-white border border-[#E8E8E5] rounded-lg p-1.5 text-[11px] text-[#171717]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Expenses List */}
        {filteredExpenses.length === 0 ? (
          <div className="p-8 text-center bg-[#FAFAF8] rounded-2xl border border-[#E8E8E5] space-y-2">
            <Receipt className="w-8 h-8 text-[#A3A3A3] mx-auto" />
            <h3 className="text-sm font-bold text-[#171717]">
              {hasActiveFilters ? 'No expenses match your filters' : 'No expenses recorded yet'}
            </h3>
            <p className="text-xs text-[#737373] max-w-sm mx-auto">
              {hasActiveFilters
                ? 'Try adjusting your search query, payer, or date range to view matching trip expenses.'
                : 'Click "Record Expense" above to add the first expense for this trip.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="mt-2 px-3 py-1.5 bg-white border border-[#E8E8E5] text-xs font-semibold rounded-xl text-[#171717] hover:bg-[#F4F4F2] cursor-pointer"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[#E8E8E5]">
            {filteredExpenses.map((exp) => {
              const mySplit = exp.splits.find((s) => s.user_id === user?.id);
              const canVoid = isOwnerOrAdmin || exp.created_by_id === user?.id;

              return (
                <div
                  key={exp.id}
                  className="py-3.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#FAFAF8] border border-[#E8E8E5] text-[#16834A] flex items-center justify-center font-bold text-xs shrink-0">
                      {exp.category?.charAt(0) || '₹'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-[#171717] truncate">
                          {exp.description}
                        </span>
                        {exp.is_pending_sync ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 dark:text-amber-200 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md animate-pulse">
                            <Clock className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                            <span>Waiting to sync</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-[#737373] bg-[#FAFAF8] border border-[#E8E8E5] px-2 py-0.5 rounded-md">
                            {exp.split_method === 'EQUAL'
                              ? `Split Equally (${exp.splits.length})`
                              : `Split with ${exp.splits.length} member(s)`}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#737373] mt-0.5">
                        Paid by <strong className="text-[#171717]">{exp.payer_name}</strong> •{' '}
                        {formatDate(exp.date)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-sm font-bold font-mono text-[#171717] block tabular-nums">
                        {formatPaise(exp.amount_paise, trip.currency)}
                      </span>
                      <span className="text-[11px] font-semibold text-[#16834A] block">
                        {mySplit
                          ? `Your share: ${formatPaise(mySplit.amount_paise, trip.currency)}`
                          : 'Not in split'}
                      </span>
                    </div>

                    {canVoid && !isTripCompleted && (
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
        )}
      </div>

      {/* --- MEMBERS & INVITE MODAL --- */}
      {isMembersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E8E8E5] shadow-2xl max-w-lg w-full p-6 sm:p-7 relative max-h-[90vh] overflow-y-auto space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E8E5]">
              <div>
                <h3 className="text-lg font-bold text-[#171717] font-['Plus_Jakarta_Sans']">
                  Trip Members ({members.length})
                </h3>
                <p className="text-xs text-[#737373] mt-0.5">
                  Manage members and invite friends to join {trip.name}
                </p>
              </div>
              <button
                onClick={() => setIsMembersModalOpen(false)}
                className="p-1.5 text-[#737373] hover:text-[#171717] rounded-lg hover:bg-[#F4F4F2] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Invite Code Accordion Section */}
            <div className="p-4 bg-[#FAFAF8] rounded-xl border border-[#E8E8E5] space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#171717] block">Trip Invite Code</span>
                  <span className="text-[11px] text-[#737373]">
                    Share this code with travelers so they can join
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInviteCode(!showInviteCode)}
                  className="px-3 py-1 bg-white hover:bg-[#F4F4F2] border border-[#E8E8E5] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  {showInviteCode ? 'Hide Code' : 'Show Invite Code'}
                </button>
              </div>

              {showInviteCode && (
                <div className="pt-2 flex items-center justify-between gap-3 border-t border-[#E8E8E5] animate-fadeIn">
                  <span className="font-mono font-bold text-lg text-[#16834A] tracking-widest">
                    {trip.invite_code}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#16834A] hover:bg-[#136F3F] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Current Members List */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#171717] uppercase tracking-wider block">
                Current Members
              </span>
              <div className="divide-y divide-[#E8E8E5] border border-[#E8E8E5] rounded-xl bg-white max-h-52 overflow-y-auto">
                {members.map((m) => {
                  const isUser = m.user_id === user?.id;
                  const memberBalance = balances?.balances.find((b) => b.user_id === m.user_id);
                  const paid = memberBalance?.total_spent_paise || 0;
                  const share = memberBalance?.total_share_paise || 0;
                  const net = memberBalance?.net_balance_paise || 0;

                  return (
                    <div key={m.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#171717] text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {m.user_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-[#171717] block truncate">
                            {m.user_name} {isUser ? ' (You)' : ''}
                          </span>
                          <span className="text-[10px] text-[#737373]">
                            Paid {formatPaise(paid, trip.currency)} • Share {formatPaise(share, trip.currency)}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`font-mono font-bold block tabular-nums ${
                            net > 0 ? 'text-[#16834A]' : net < 0 ? 'text-[#E11D48]' : 'text-[#737373]'
                          }`}
                        >
                          {net > 0
                            ? `+${formatPaise(net, trip.currency)}`
                            : net < 0
                            ? `-${formatPaise(Math.abs(net), trip.currency)}`
                            : formatPaise(0, trip.currency)}
                        </span>
                        <span className="text-[10px] uppercase font-semibold text-[#737373]">
                          {m.role}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Invite Registered Friends */}
            {!isTripCompleted && (
              <div className="space-y-3 pt-2 border-t border-[#E8E8E5]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#171717] uppercase tracking-wider">
                    Invite Registered Friends
                  </span>
                  {friends.length > 0 && (
                    <span className="text-[11px] text-[#737373]">{friends.length} available</span>
                  )}
                </div>

                {loadingFriends ? (
                  <div className="p-4 text-center">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#16834A]" />
                  </div>
                ) : friends.length === 0 ? (
                  <p className="text-xs text-[#737373] italic bg-[#FAFAF8] p-3 rounded-xl border border-[#E8E8E5]">
                    No new friends available to invite. Add friends from the Friends tab first or share the invite code above.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="max-h-36 overflow-y-auto space-y-1 border border-[#E8E8E5] rounded-xl p-2 bg-[#FAFAF8]">
                      {friends.map((f) => {
                        const isSelected = selectedFriendsToInvite.includes(f.id);
                        return (
                          <label
                            key={f.id}
                            className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-white border-[#16834A] shadow-2xs'
                                : 'bg-transparent border-transparent hover:bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  setSelectedFriendsToInvite((prev) =>
                                    isSelected ? prev.filter((id) => id !== f.id) : [...prev, f.id]
                                  );
                                }}
                                className="accent-[#16834A] rounded"
                              />
                              <span className="text-xs font-bold text-[#171717]">{f.display_name}</span>
                              {f.username && (
                                <span className="text-[11px] text-[#737373]">@{f.username}</span>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={handleSendInvitations}
                      disabled={selectedFriendsToInvite.length === 0 || sendingInvites}
                      className="w-full py-2 bg-[#16834A] hover:bg-[#136F3F] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      {sendingInvites ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <UserPlus className="w-3.5 h-3.5" />
                      )}
                      <span>Invite Selected Friends ({selectedFriendsToInvite.length})</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- SETTLEMENT AUDIT HISTORY MODAL --- */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E8E8E5] shadow-2xl max-w-xl w-full p-6 sm:p-7 relative max-h-[90vh] overflow-y-auto space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E8E5]">
              <div>
                <h3 className="text-lg font-bold text-[#171717] font-['Plus_Jakarta_Sans']">
                  Settlement History ({settlements.length})
                </h3>
                <p className="text-xs text-[#737373] mt-0.5">
                  Audit trail of repayments recorded for {trip.name}
                </p>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-1.5 text-[#737373] hover:text-[#171717] rounded-lg hover:bg-[#F4F4F2] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {settlements.length === 0 ? (
              <p className="text-xs text-[#737373] text-center py-8">
                No repayments have been recorded yet.
              </p>
            ) : (
              <div className="divide-y divide-[#E8E8E5] border border-[#E8E8E5] rounded-xl overflow-hidden">
                {settlements.map((st) => (
                  <div key={st.id} className="p-3.5 flex items-center justify-between gap-4 text-xs">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <strong className="text-[#171717]">{st.payer_name}</strong>
                        <span className="text-[#737373]">paid</span>
                        <strong className="text-[#171717]">{st.payee_name}</strong>
                      </div>
                      <p className="text-[11px] text-[#737373] mt-0.5">
                        via {st.payment_method} • {formatDate(st.created_at)}
                      </p>
                      {st.notes && (
                        <p className="text-[10px] text-[#A3A3A3] italic mt-0.5">"{st.notes}"</p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-sm text-[#171717] block tabular-nums">
                        {formatPaise(st.amount_paise, trip.currency)}
                      </span>
                      {st.is_pending_sync ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 dark:text-amber-200 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md mt-1 animate-pulse">
                          <Clock className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                          <span>Waiting to sync</span>
                        </span>
                      ) : (
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
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- END TRIP MODAL (STEP-BY-STEP FINALIZATION) --- */}
      {isEndTripModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#E8E8E5] shadow-2xl max-w-lg w-full p-6 sm:p-7 relative max-h-[90vh] overflow-y-auto space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E8E5]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#171717] text-white flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5 text-[#C6ECCF]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#171717] font-['Plus_Jakarta_Sans']">
                    End Trip: Final Settlement
                  </h3>
                  <p className="text-xs text-[#737373]">
                    Verify all balances before permanently archiving {trip.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEndTripModalOpen(false)}
                className="p-1.5 text-[#737373] hover:text-[#171717] rounded-lg hover:bg-[#F4F4F2] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 2: Member Balance Breakdown */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#171717] uppercase tracking-wider block">
                Member Balances Summary
              </span>
              <div className="border border-[#E8E8E5] rounded-xl overflow-hidden divide-y divide-[#E8E8E5]">
                {members.map((m) => {
                  const b = balances?.balances.find((item) => item.user_id === m.user_id);
                  const paid = b?.total_spent_paise || 0;
                  const share = b?.total_share_paise || 0;
                  const net = b?.net_balance_paise || 0;

                  return (
                    <div key={m.id} className="p-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-[#171717] block">{m.user_name}</span>
                        <span className="text-[10px] text-[#737373]">
                          Paid {formatPaise(paid, trip.currency)} • Share {formatPaise(share, trip.currency)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span
                          className={`font-mono font-bold block tabular-nums ${
                            net > 0 ? 'text-[#16834A]' : net < 0 ? 'text-[#E11D48]' : 'text-[#737373]'
                          }`}
                        >
                          {net > 0
                            ? `+${formatPaise(net, trip.currency)}`
                            : net < 0
                            ? `-${formatPaise(Math.abs(net), trip.currency)}`
                            : 'Settled (₹0.00)'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Outstanding Debts Alert */}
            {!canFinalizeTrip ? (
              <div className="p-4 bg-[#FFF1F2] border border-[#FECDD3] rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#E11D48]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Outstanding payments must be completed before ending this trip</span>
                </div>
                <div className="space-y-1.5 text-xs text-[#BE123C]">
                  {suggestions.map((sug, i) => (
                    <div key={i} className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-[#FDA4AF]">
                      <span>
                        <strong>{sug.from_user_name}</strong> needs to pay <strong>{sug.to_user_name}</strong>
                      </span>
                      <span className="font-mono font-bold">{formatPaise(sug.amount_paise, trip.currency)}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-[#737373]">
                  All debtors must mark payments as paid and receivers must confirm them so that all balances reach zero.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-[#DDF5E5] border border-[#C6ECCF] rounded-xl flex items-center gap-2.5 text-[#16834A]">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <p className="text-xs font-semibold">
                  All debts have been completely settled! You are ready to finalize and archive this trip.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2 border-t border-[#E8E8E5]">
              <button
                type="button"
                onClick={() => setIsEndTripModalOpen(false)}
                className="flex-1 py-2.5 bg-white hover:bg-[#FAFAF8] border border-[#E8E8E5] text-xs font-semibold rounded-xl text-[#737373] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFinalizeTrip}
                disabled={!canFinalizeTrip || completingTrip}
                className="flex-1 py-2.5 bg-[#16834A] hover:bg-[#136F3F] text-white text-xs font-semibold rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {completingTrip ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Confirm End Trip</span>
              </button>
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
    </div>
  );
};
