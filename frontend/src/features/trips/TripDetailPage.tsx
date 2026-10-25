import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  MoreHorizontal,
  Plus,
  Clock,
  UserPlus,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  Trophy,
  Trash2,
  Pencil,
  X,
  MapPin,
  Calendar,
  Users,
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
import { formatPaise, formatDate } from '@/lib/currency';
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
import { calculateLocalBalances } from '@/lib/balance-calculator';
import { queueExpenseDelete, isDeviceOnline } from '@/lib/sync-manager';

function formatRelativeTime(dateString?: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (isNaN(diffSec) || diffSec < 0) return 'just now';
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function groupExpensesByDate(expensesList: Expense[]) {
  const map = new Map<string, Expense[]>();
  for (const exp of expensesList) {
    if (exp.is_void) continue;
    const d = new Date(exp.date || exp.created_at || Date.now());
    const dateKey = isNaN(d.getTime())
      ? new Date().toISOString().split('T')[0]
      : d.toISOString().split('T')[0];
    if (!map.has(dateKey)) {
      map.set(dateKey, []);
    }
    map.get(dateKey)!.push(exp);
  }

  const sortedKeys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  return sortedKeys.map((key) => {
    let label = key;
    if (key === todayStr) {
      label = 'Today';
    } else if (key === yesterdayStr) {
      label = 'Yesterday';
    } else {
      const d = new Date(key);
      label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return { dateLabel: label, items: map.get(key)! };
  });
}

export const TripDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { showConfirmation } = useFeedback();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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

  // Active Tab: Expenses | Balances | Members
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances' | 'members'>(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'balances' || tabParam === 'members') return tabParam;
    return 'expenses';
  });

  // Top bar dropdown menu
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Modals
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(() => searchParams.get('action') === 'add-expense');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedExpenseForAction, setSelectedExpenseForAction] = useState<Expense | null>(null);
  const [isRecordSettlementOpen, setIsRecordSettlementOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isEndTripModalOpen, setIsEndTripModalOpen] = useState(false);
  const [completingTrip, setCompletingTrip] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Settlement prefill
  const [settlePayer, setSettlePayer] = useState<string | undefined>(undefined);
  const [settlePayee, setSettlePayee] = useState<string | undefined>(undefined);
  const [settleAmount, setSettleAmount] = useState<number | undefined>(undefined);
  const [settlingActionId, setSettlingActionId] = useState<string | null>(null);

  // Friends invite state
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriendsToInvite, setSelectedFriendsToInvite] = useState<string[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [sendingInvites, setSendingInvites] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Close top menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load all trip data
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

      // Compute live balances locally
      if (mData.length > 0) {
        const localBalances = calculateLocalBalances(id, mData, eData, stData);
        setBalances(localBalances.balances);
        setSuggestions(localBalances.suggestions);
      } else {
        setBalances(bData);
        setSuggestions(sData);
      }

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
    const handleOnline = () => loadAllTripData();

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

  const netBalancePaise = userBalanceItem?.net_balance_paise ?? trip?.user_net_balance_paise ?? 0;
  const userSharePaise = userBalanceItem?.total_share_paise ?? trip?.user_share_paise ?? 0;
  const totalTripExpensesPaise = balances?.total_expenses_paise ?? trip?.total_expenses_paise ?? 0;

  // Pending settlements
  const pendingSettlements = useMemo(() => {
    return settlements.filter(
      (s) => s.status === 'PENDING_CONFIRMATION' || s.status === 'INITIATED'
    );
  }, [settlements]);

  const pendingForMeAsReceiver = useMemo(() => {
    return pendingSettlements.filter((s) => s.payee_id === user?.id);
  }, [pendingSettlements, user?.id]);

  // Expenses grouped by date
  const groupedExpenses = useMemo(() => {
    return groupExpensesByDate(expenses);
  }, [expenses]);

  // Confirm received payment
  const handleConfirmReceipt = async (settlementId: string) => {
    setSettlingActionId(settlementId);
    try {
      await api.patch(`/settlements/${settlementId}/status`, { status: 'CONFIRMED' });
      playSound('settlement_success');
      showConfirmation({
        title: 'Payment Confirmed',
        message: 'Settlement confirmed. Group balances updated.',
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

  // Reject received payment
  const handleRejectReceipt = async (settlementId: string) => {
    const reason = prompt('Reason for declining (optional):');
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
    if (!confirm(`Are you sure you want to void "${description}"?`)) return;
    try {
      if (!isDeviceOnline()) {
        await queueExpenseDelete(id!, expenseId);
        showConfirmation({
          title: 'Saved offline',
          message: `"${description}" voided locally. Changes will sync when online.`,
          sound: 'notification',
        });
      } else {
        try {
          await api.delete(`/expenses/${expenseId}`);
          showConfirmation({
            title: 'Expense voided',
            message: `"${description}" removed from balances.`,
            sound: 'notification',
          });
        } catch (apiErr: any) {
          if (!window.navigator.onLine || apiErr?.message?.includes('fetch') || apiErr?.message?.includes('Network')) {
            await queueExpenseDelete(id!, expenseId);
            showConfirmation({
              title: 'Saved offline',
              message: `"${description}" voided locally. Changes will sync when online.`,
              sound: 'notification',
            });
          } else {
            throw apiErr;
          }
        }
      }
      setSelectedExpenseForAction(null);
      await loadAllTripData();
    } catch (err: any) {
      alert(err.message || 'Failed to void expense.');
    }
  };

  const handleStartEditExpense = (exp: Expense) => {
    setSelectedExpenseForAction(null);
    setEditingExpense(exp);
    setIsAddExpenseOpen(true);
  };

  const handleCopyCode = () => {
    if (!trip) return;
    navigator.clipboard.writeText(trip.invite_code);
    setCopiedCode(true);
    showConfirmation({
      title: 'Invite code copied',
      message: `Code ${trip.invite_code} copied to clipboard.`,
      sound: 'notification',
    });
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleShareLocation = () => {
    if (!trip) return;
    const destName = trip.destination || trip.name;
    const addr = trip.destination_address ? ` (${trip.destination_address})` : '';
    const mapsLink =
      trip.destination_lat && trip.destination_lng
        ? `https://www.google.com/maps/search/?api=1&query=${trip.destination_lat},${trip.destination_lng}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trip.destination || '')}`;
    const textToCopy = `Destination: ${destName}${addr}\nMaps: ${mapsLink}`;
    navigator.clipboard.writeText(textToCopy);
    showConfirmation({
      title: 'Location copied',
      message: 'Maps link copied to clipboard.',
      sound: 'notification',
    });
  };

  const handleOpenInviteFriends = async () => {
    setIsInviteModalOpen(true);
    setLoadingFriends(true);
    try {
      const allFriends = await api.get<Friend[]>('/friends');
      const existingMemberUserIds = new Set(members.map((m) => m.user_id));
      const nonMembers = allFriends.filter((f) => !existingMemberUserIds.has(f.id));
      setFriends(nonMembers);
    } catch (err: any) {
      console.error('Failed to load friends:', err);
    } finally {
      setLoadingFriends(false);
    }
  };

  const handleSendInvitations = async () => {
    if (!id || selectedFriendsToInvite.length === 0) return;
    setSendingInvites(true);
    try {
      await api.post(`/trips/${id}/invitations`, { friend_ids: selectedFriendsToInvite });
      playSound('trip_success');
      showConfirmation({
        title: 'Invitations sent',
        message: `Invited ${selectedFriendsToInvite.length} friend(s).`,
        sound: 'trip_success',
      });
      setSelectedFriendsToInvite([]);
      setIsInviteModalOpen(false);
      await loadAllTripData();
    } catch (err: any) {
      playSound('error');
      alert(err.message || 'Failed to send invitations.');
    } finally {
      setSendingInvites(false);
    }
  };

  const handleFinalizeTrip = async () => {
    if (!id) return;
    setCompletingTrip(true);
    try {
      await api.post(`/trips/${id}/complete`);
      playSound('trip_success');
      showConfirmation({
        title: 'Trip Ended',
        message: 'This trip is now finalized and archived.',
        sound: 'trip_success',
      });
      setIsEndTripModalOpen(false);
      await loadAllTripData();
    } catch (err: any) {
      playSound('error');
      alert(err.message || 'Failed to finalize trip.');
    } finally {
      setCompletingTrip(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-6" aria-busy="true">
        {/* Top bar skeleton */}
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#E8E8E5] dark:bg-[#262626] animate-pulse" />
            <div className="w-40 h-6 rounded bg-[#E8E8E5] dark:bg-[#262626] animate-pulse" />
          </div>
          <div className="w-8 h-8 rounded-lg bg-[#E8E8E5] dark:bg-[#262626] animate-pulse" />
        </div>

        {/* Summary line skeleton */}
        <div className="py-4 border-b border-[#E8E8E5] dark:border-[#262626] flex gap-12">
          <div className="w-24 h-10 rounded bg-[#E8E8E5] dark:bg-[#262626] animate-pulse" />
          <div className="w-24 h-10 rounded bg-[#E8E8E5] dark:bg-[#262626] animate-pulse" />
          <div className="w-24 h-10 rounded bg-[#E8E8E5] dark:bg-[#262626] animate-pulse" />
        </div>

        {/* Tabs skeleton */}
        <div className="w-64 h-6 rounded bg-[#E8E8E5] dark:bg-[#262626] animate-pulse" />

        {/* Feed rows skeleton */}
        <div className="divide-y divide-[#E8E8E5] dark:divide-[#262626] mt-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#E8E8E5] dark:bg-[#262626] animate-pulse" />
                <div className="space-y-1.5">
                  <div className="w-36 h-4 rounded bg-[#E8E8E5] dark:bg-[#262626] animate-pulse" />
                  <div className="w-24 h-3 rounded bg-[#E8E8E5] dark:bg-[#262626] animate-pulse" />
                </div>
              </div>
              <div className="w-16 h-4 rounded bg-[#E8E8E5] dark:bg-[#262626] animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="flex-1 max-w-md mx-auto px-4 py-12 text-center space-y-4">
        <p className="text-sm text-[#DC2626] dark:text-[#EF4444]">{error || 'Trip not found.'}</p>
        <button
          onClick={() => navigate('/trips')}
          className="px-4 py-2 bg-[#171717] dark:bg-[#EDEDED] text-white dark:text-[#0A0A0A] rounded-xl text-xs font-semibold cursor-pointer"
        >
          Back to Trips
        </button>
      </div>
    );
  }

  const isTripCompleted = trip.status === 'COMPLETED' || Boolean(trip.completed_at);

  return (
    <div className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 md:py-8">
      {/* --- Top Bar: Back arrow, Trip name, "..." menu --- */}
      <header className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
          <button
            onClick={() => navigate('/trips')}
            className="p-1.5 -ml-1.5 text-[#737373] dark:text-[#8E8E93] hover:text-[#171717] dark:hover:text-[#EDEDED] rounded-lg hover:bg-[#F4F4F2] dark:hover:bg-[#1C1C1C] transition-colors cursor-pointer shrink-0"
            aria-label="Back to Trips"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[#171717] dark:text-[#EDEDED] truncate">
            {trip.name}
          </h1>
        </div>

        {/* Right Actions: Add Expense (Desktop) & "..." Dropdown Menu */}
        <div className="flex items-center gap-2 shrink-0">
          {!isTripCompleted && (
            <button
              onClick={() => {
                setEditingExpense(null);
                setIsAddExpenseOpen(true);
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#16834A] dark:bg-[#22C55E] hover:bg-[#136F3F] dark:hover:bg-[#16A34A] text-white dark:text-[#0A0A0A] font-medium text-xs rounded-xl shadow-xs transition-all active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add expense</span>
            </button>
          )}

          {/* "..." Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 text-[#737373] dark:text-[#8E8E93] hover:text-[#171717] dark:hover:text-[#EDEDED] rounded-xl hover:bg-[#F4F4F2] dark:hover:bg-[#1C1C1C] transition-colors cursor-pointer"
              aria-label="Trip actions"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1A1A1A] border border-[#E8E8E5] dark:border-[#2E2E2E] rounded-xl shadow-lg py-1.5 z-40 text-xs sm:text-sm">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleOpenInviteFriends();
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-[#F4F4F2] dark:hover:bg-[#262626] flex items-center gap-2.5 text-[#171717] dark:text-[#EDEDED] cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-[#737373] dark:text-[#8E8E93]" />
                  <span>Invite Friends</span>
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleCopyCode();
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-[#F4F4F2] dark:hover:bg-[#262626] flex items-center gap-2.5 text-[#171717] dark:text-[#EDEDED] cursor-pointer"
                >
                  <Users className="w-4 h-4 text-[#737373] dark:text-[#8E8E93]" />
                  <span>Copy Invite Code</span>
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleShareLocation();
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-[#F4F4F2] dark:hover:bg-[#262626] flex items-center gap-2.5 text-[#171717] dark:text-[#EDEDED] cursor-pointer"
                >
                  <MapPin className="w-4 h-4 text-[#737373] dark:text-[#8E8E93]" />
                  <span>Share Location</span>
                </button>
                <div className="border-t border-[#E8E8E5] dark:border-[#2E2E2E] my-1" />
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    downloadTripPdf(trip.id, trip.name);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-[#F4F4F2] dark:hover:bg-[#262626] flex items-center gap-2.5 text-[#171717] dark:text-[#EDEDED] cursor-pointer"
                >
                  <Download className="w-4 h-4 text-[#737373] dark:text-[#8E8E93]" />
                  <span>Export PDF</span>
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    downloadTripCsv(trip.id, trip.name);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-[#F4F4F2] dark:hover:bg-[#262626] flex items-center gap-2.5 text-[#171717] dark:text-[#EDEDED] cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#737373] dark:text-[#8E8E93]" />
                  <span>Export CSV</span>
                </button>
                {isOwnerOrAdmin && !isTripCompleted && (
                  <div className="border-t border-[#E8E8E5] dark:border-[#2E2E2E] my-1 pt-1">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setIsEndTripModalOpen(true);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-[#FFE4E6]/50 dark:hover:bg-[#E11D48]/10 flex items-center gap-2.5 text-[#E11D48] dark:text-[#FB7185] cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>End Trip</span>
                    </button>
                  </div>
                )}
                {isTripCompleted && (
                  <div className="border-t border-[#E8E8E5] dark:border-[#2E2E2E] my-1 pt-1">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setIsSummaryModalOpen(true);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-[#F4F4F2] dark:hover:bg-[#262626] flex items-center gap-2.5 text-[#16834A] dark:text-[#22C55E] cursor-pointer"
                    >
                      <Trophy className="w-4 h-4" />
                      <span>Trip Summary</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* --- Summary Line: Total spent, Your share, Your balance as plain numbers --- */}
      <section className="py-4 border-b border-[#E8E8E5] dark:border-[#262626] flex items-center justify-between sm:justify-start sm:gap-12">
        <div>
          <span className="text-xs text-[#737373] dark:text-[#8E8E93] block mb-0.5 font-medium">
            Total spent
          </span>
          <span className="text-lg sm:text-xl font-semibold tabular-nums tracking-tight text-[#171717] dark:text-[#EDEDED]">
            {formatPaise(totalTripExpensesPaise, trip.currency)}
          </span>
        </div>
        <div>
          <span className="text-xs text-[#737373] dark:text-[#8E8E93] block mb-0.5 font-medium">
            Your share
          </span>
          <span className="text-lg sm:text-xl font-semibold tabular-nums tracking-tight text-[#171717] dark:text-[#EDEDED]">
            {formatPaise(userSharePaise, trip.currency)}
          </span>
        </div>
        <div>
          <span className="text-xs text-[#737373] dark:text-[#8E8E93] block mb-0.5 font-medium">
            Your balance
          </span>
          <span
            className={`text-lg sm:text-xl font-semibold tabular-nums tracking-tight ${
              netBalancePaise > 0
                ? 'text-[#16834A] dark:text-[#22C55E]'
                : netBalancePaise < 0
                ? 'text-[#DC2626] dark:text-[#EF4444]'
                : 'text-[#737373] dark:text-[#8E8E93]'
            }`}
          >
            {netBalancePaise > 0
              ? `+${formatPaise(netBalancePaise, trip.currency)}`
              : netBalancePaise < 0
              ? `-${formatPaise(Math.abs(netBalancePaise), trip.currency)}`
              : formatPaise(0, trip.currency)}
          </span>
        </div>
      </section>

      {/* --- Underlined Tab Row: Expenses | Balances | Members --- */}
      <nav className="flex items-center gap-8 border-b border-[#E8E8E5] dark:border-[#262626] mt-4 mb-4 text-sm font-medium">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`pb-2.5 transition-colors cursor-pointer relative ${
            activeTab === 'expenses'
              ? 'text-[#171717] dark:text-[#EDEDED] font-semibold border-b-2 border-[#171717] dark:border-[#EDEDED] -mb-[1px]'
              : 'text-[#737373] dark:text-[#8E8E93] hover:text-[#171717] dark:hover:text-[#EDEDED]'
          }`}
        >
          Expenses
        </button>

        <button
          onClick={() => setActiveTab('balances')}
          className={`pb-2.5 transition-colors cursor-pointer relative flex items-center gap-1.5 ${
            activeTab === 'balances'
              ? 'text-[#171717] dark:text-[#EDEDED] font-semibold border-b-2 border-[#171717] dark:border-[#EDEDED] -mb-[1px]'
              : 'text-[#737373] dark:text-[#8E8E93] hover:text-[#171717] dark:hover:text-[#EDEDED]'
          }`}
        >
          <span>Balances</span>
          {pendingForMeAsReceiver.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-[#B45309] dark:bg-[#F59E0B]" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`pb-2.5 transition-colors cursor-pointer relative ${
            activeTab === 'members'
              ? 'text-[#171717] dark:text-[#EDEDED] font-semibold border-b-2 border-[#171717] dark:border-[#EDEDED] -mb-[1px]'
              : 'text-[#737373] dark:text-[#8E8E93] hover:text-[#171717] dark:hover:text-[#EDEDED]'
          }`}
        >
          Members ({members.length})
        </button>
      </nav>

      {/* ========================================================================= */}
      {/* --- TAB 1: EXPENSES --- */}
      {/* ========================================================================= */}
      {activeTab === 'expenses' && (
        <section className="space-y-6 pb-24 sm:pb-8">
          {groupedExpenses.length === 0 ? (
            <div className="py-8 text-center border-b border-[#E8E8E5] dark:border-[#262626]">
              <p className="text-sm text-[#737373] dark:text-[#8E8E93] mb-3">
                No expenses recorded yet.
              </p>
              {!isTripCompleted && (
                <button
                  onClick={() => {
                    setEditingExpense(null);
                    setIsAddExpenseOpen(true);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-[#171717] dark:text-[#EDEDED] bg-white dark:bg-[#1A1A1A] border border-[#E8E8E5] dark:border-[#262626] rounded-xl hover:bg-[#F4F4F2] dark:hover:bg-[#222222] transition-colors cursor-pointer"
                >
                  Add an expense
                </button>
              )}
            </div>
          ) : (
            groupedExpenses.map((group) => (
              <div key={group.dateLabel} className="space-y-1">
                {/* Small Section Header */}
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#737373] dark:text-[#8E8E93] pt-2 pb-1">
                  {group.dateLabel}
                </h3>

                {/* Feed Rows for this date */}
                <div className="divide-y divide-[#E8E8E5] dark:divide-[#262626]">
                  {group.items.map((exp) => {
                    const initial = exp.category ? exp.category.charAt(0).toUpperCase() : 'E';

                    return (
                      <div
                        key={exp.id}
                        onClick={() => setSelectedExpenseForAction(exp)}
                        className="py-3 px-2 -mx-2 hover:bg-[#F4F4F2]/70 dark:hover:bg-[#1A1A1A]/70 rounded-xl transition-colors cursor-pointer flex items-center justify-between"
                      >
                        {/* Left + Middle */}
                        <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                          {/* Category initial avatar */}
                          <div className="w-9 h-9 rounded-lg bg-[#F4F4F2] dark:bg-[#1C1C1C] text-[#171717] dark:text-[#EDEDED] font-semibold text-xs flex items-center justify-center shrink-0 border border-[#E8E8E5] dark:border-[#262626]">
                            {initial}
                          </div>

                          {/* Title & Subtitle */}
                          <div className="min-w-0 flex-1 truncate">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="text-sm font-medium text-[#171717] dark:text-[#EDEDED] truncate">
                                {exp.description}
                              </span>
                              {exp.is_pending_sync && (
                                <span title="Waiting to sync">
                                  <Clock className="w-3.5 h-3.5 text-[#B45309] dark:text-[#FBBF24] shrink-0" />
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#737373] dark:text-[#8E8E93] mt-0.5 truncate">
                              Paid by {exp.payer_name || 'Member'} - {formatRelativeTime(exp.created_at || exp.date)}
                            </p>
                          </div>
                        </div>

                        {/* Right: Amount */}
                        <div className="text-right shrink-0 ml-3">
                          <span className="text-sm font-semibold font-mono tabular-nums text-[#171717] dark:text-[#EDEDED]">
                            {formatPaise(exp.amount_paise, exp.currency)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* --- TAB 2: BALANCES --- */}
      {/* ========================================================================= */}
      {activeTab === 'balances' && (
        <section className="space-y-6 pb-24 sm:pb-8">
          {/* Pending Confirmations if any */}
          {pendingForMeAsReceiver.length > 0 && (
            <div className="border-b border-[#E8E8E5] dark:border-[#262626] pb-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#B45309] dark:text-[#FBBF24] mb-2">
                Awaiting your confirmation
              </h3>
              <div className="divide-y divide-[#E8E8E5] dark:divide-[#262626]">
                {pendingForMeAsReceiver.map((st) => (
                  <div key={st.id} className="py-3 flex items-center justify-between">
                    <div className="min-w-0 flex-1 pr-3">
                      <p className="text-sm text-[#171717] dark:text-[#EDEDED]">
                        <span className="font-medium">{st.payer_name}</span> paid you{' '}
                        <span className="font-mono font-semibold">
                          {formatPaise(st.amount_paise, trip.currency)}
                        </span>
                      </p>
                      <p className="text-xs text-[#737373] dark:text-[#8E8E93] mt-0.5">
                        via {st.payment_method}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => handleConfirmReceipt(st.id)}
                        disabled={settlingActionId === st.id}
                        className="text-xs font-semibold text-[#16834A] dark:text-[#22C55E] hover:underline cursor-pointer disabled:opacity-50"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => handleRejectReceipt(st.id)}
                        disabled={settlingActionId === st.id}
                        className="text-xs font-semibold text-[#DC2626] dark:text-[#EF4444] hover:underline cursor-pointer disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* "Who owes whom" Plain Rows */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#737373] dark:text-[#8E8E93] mb-2">
              Who owes whom
            </h3>

            {suggestions.length === 0 ? (
              <div className="py-8 text-center border-b border-[#E8E8E5] dark:border-[#262626]">
                <p className="text-sm text-[#737373] dark:text-[#8E8E93]">All debts are settled.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#E8E8E5] dark:divide-[#262626]">
                {suggestions.map((sug, idx) => {
                  const isDebtor = sug.from_user_id === user?.id;
                  const isReceiver = sug.to_user_id === user?.id;
                  const initial = sug.from_user_name ? sug.from_user_name.charAt(0).toUpperCase() : 'U';

                  let rowText = `${sug.from_user_name} pays ${sug.to_user_name}`;
                  if (isReceiver) {
                    rowText = `${sug.from_user_name} pays you`;
                  } else if (isDebtor) {
                    rowText = `You pay ${sug.to_user_name}`;
                  }

                  return (
                    <div
                      key={`${sug.from_user_id}-${sug.to_user_id}-${idx}`}
                      className="py-3.5 flex items-center justify-between"
                    >
                      {/* Avatar & "Priya pays you" */}
                      <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                        <div className="w-8 h-8 rounded-full bg-[#E8E8E5] dark:bg-[#262626] text-[#171717] dark:text-[#EDEDED] font-semibold text-xs flex items-center justify-center shrink-0">
                          {initial}
                        </div>
                        <span className="text-sm font-medium text-[#171717] dark:text-[#EDEDED] truncate">
                          {rowText}
                        </span>
                      </div>

                      {/* Amount & "Settle up" text button */}
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="text-sm font-semibold font-mono tabular-nums text-[#171717] dark:text-[#EDEDED]">
                          {formatPaise(sug.amount_paise, trip.currency)}
                        </span>
                        {!isTripCompleted && (
                          <button
                            onClick={() => {
                              setSettlePayer(sug.from_user_id);
                              setSettlePayee(sug.to_user_id);
                              setSettleAmount(sug.amount_paise);
                              setIsRecordSettlementOpen(true);
                            }}
                            className="text-xs font-semibold text-[#16834A] dark:text-[#22C55E] hover:underline cursor-pointer"
                          >
                            Settle up
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* --- TAB 3: MEMBERS --- */}
      {/* ========================================================================= */}
      {activeTab === 'members' && (
        <section className="space-y-6 pb-24 sm:pb-8">
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#737373] dark:text-[#8E8E93]">
              Trip members ({members.length})
            </h3>
            <button
              onClick={handleOpenInviteFriends}
              className="text-xs font-semibold text-[#16834A] dark:text-[#22C55E] hover:underline cursor-pointer"
            >
              + Invite friends
            </button>
          </div>

          <div className="divide-y divide-[#E8E8E5] dark:divide-[#262626]">
            {members.map((m) => {
              const isCurrentUser = m.user_id === user?.id;
              const initial = m.user_name ? m.user_name.charAt(0).toUpperCase() : 'M';
              const roleLabel = m.role === 'OWNER' ? 'Organizer' : m.role === 'ADMIN' ? 'Admin' : 'Member';

              return (
                <div key={m.id || m.user_id} className="py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                    <div className="w-8 h-8 rounded-full bg-[#E8E8E5] dark:bg-[#262626] text-[#171717] dark:text-[#EDEDED] font-semibold text-xs flex items-center justify-center shrink-0">
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-[#171717] dark:text-[#EDEDED] truncate block">
                        {m.user_name} {isCurrentUser ? '(You)' : ''}
                      </span>
                      <span className="text-xs text-[#737373] dark:text-[#8E8E93] truncate block">
                        {m.user_email || `@${m.user_name.toLowerCase().replace(/\s+/g, '_')}`}
                      </span>
                    </div>
                  </div>

                  <span className="text-xs text-[#737373] dark:text-[#8E8E93] shrink-0 font-medium">
                    {roleLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* --- Mobile Floating Action Button (+) --- */}
      {!isTripCompleted && (
        <button
          onClick={() => {
            setEditingExpense(null);
            setIsAddExpenseOpen(true);
          }}
          className="sm:hidden fixed bottom-20 right-5 w-14 h-14 rounded-full bg-[#16834A] dark:bg-[#22C55E] text-white dark:text-[#0A0A0A] flex items-center justify-center shadow-lg active:scale-95 transition-transform z-30 cursor-pointer"
          aria-label="Add expense"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      )}

      {/* --- Expense Action Drawer / Modal (Tap for edit and void) --- */}
      {selectedExpenseForAction && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#141414] text-[#171717] dark:text-[#EDEDED] rounded-t-2xl sm:rounded-2xl border-t sm:border border-[#E8E8E5] dark:border-[#262626] shadow-xl max-w-sm w-full p-5 space-y-4">
            <div className="sm:hidden w-12 h-1 bg-[#E8E8E5] dark:bg-[#333333] rounded-full mx-auto mb-2" />

            <div className="flex items-start justify-between pb-2 border-b border-[#E8E8E5] dark:border-[#262626]">
              <div className="min-w-0 flex-1 pr-2">
                <h3 className="text-base font-bold truncate">
                  {selectedExpenseForAction.description}
                </h3>
                <p className="text-xs text-[#737373] dark:text-[#8E8E93] mt-0.5">
                  Paid by {selectedExpenseForAction.payer_name} &bull; {formatDate(selectedExpenseForAction.date)}
                </p>
              </div>
              <button
                onClick={() => setSelectedExpenseForAction(null)}
                className="p-1 rounded-lg text-[#737373] dark:text-[#8E8E93] hover:text-[#171717] dark:hover:text-[#EDEDED] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-2">
              <span className="text-xs text-[#737373] dark:text-[#8E8E93] block mb-0.5">Total Amount</span>
              <span className="text-2xl font-bold font-mono tabular-nums">
                {formatPaise(selectedExpenseForAction.amount_paise, selectedExpenseForAction.currency)}
              </span>
            </div>

            {/* Split Breakdown */}
            {selectedExpenseForAction.splits && selectedExpenseForAction.splits.length > 0 && (
              <div className="border-t border-[#E8E8E5] dark:border-[#262626] pt-3 space-y-1.5 max-h-36 overflow-y-auto">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#737373] dark:text-[#8E8E93] block">
                  Splits
                </span>
                {selectedExpenseForAction.splits.map((s) => (
                  <div key={s.id || s.user_id} className="flex items-center justify-between text-xs">
                    <span className="text-[#737373] dark:text-[#8E8E93] truncate pr-2">
                      {s.user_name || 'Member'}
                    </span>
                    <span className="font-mono font-medium tabular-nums">
                      {formatPaise(s.amount_paise, selectedExpenseForAction.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons: Edit and Void */}
            {!isTripCompleted && (selectedExpenseForAction.payer_id === user?.id || isOwnerOrAdmin) && (
              <div className="border-t border-[#E8E8E5] dark:border-[#262626] pt-3 flex gap-2">
                <button
                  onClick={() => handleStartEditExpense(selectedExpenseForAction)}
                  className="flex-1 py-2 px-3 rounded-xl border border-[#E8E8E5] dark:border-[#2E2E2E] bg-white dark:bg-[#1C1C1C] text-xs font-semibold hover:bg-[#F4F4F2] dark:hover:bg-[#262626] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5 text-[#16834A] dark:text-[#22C55E]" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleVoidExpense(selectedExpenseForAction.id, selectedExpenseForAction.description)}
                  className="flex-1 py-2 px-3 rounded-xl border border-[#FDA4AF] dark:border-[#E11D48]/30 bg-[#FFE4E6]/40 dark:bg-[#E11D48]/10 text-xs font-semibold text-[#DC2626] dark:text-[#EF4444] hover:bg-[#FFE4E6] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Void</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- Add / Edit Expense Modal (Bottom Sheet on Mobile) --- */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => {
          setIsAddExpenseOpen(false);
          setEditingExpense(null);
        }}
        tripId={trip.id}
        currency={trip.currency}
        members={members}
        activities={[]}
        initialExpense={editingExpense}
        onExpenseAdded={() => loadAllTripData()}
        onExpenseUpdated={() => loadAllTripData()}
      />

      {/* --- Record Settlement Modal --- */}
      <RecordSettlementModal
        isOpen={isRecordSettlementOpen}
        onClose={() => setIsRecordSettlementOpen(false)}
        tripId={trip.id}
        members={members}
        initialPayerId={settlePayer}
        initialPayeeId={settlePayee}
        initialAmountPaise={settleAmount}
        onSettlementRecorded={() => loadAllTripData()}
      />

      {/* --- Invite Friends Modal --- */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#141414] text-[#171717] dark:text-[#EDEDED] rounded-2xl border border-[#E8E8E5] dark:border-[#262626] shadow-xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E5] dark:border-[#262626]">
              <h3 className="text-base font-semibold">Invite to {trip.name}</h3>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="p-1 rounded-lg text-[#737373] dark:text-[#8E8E93] hover:text-[#171717] dark:hover:text-[#EDEDED] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Invite code block */}
            <div className="p-3 bg-[#FAFAF8] dark:bg-[#1C1C1C] rounded-xl border border-[#E8E8E5] dark:border-[#2E2E2E] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#737373] dark:text-[#8E8E93] block">
                  Trip Invite Code
                </span>
                <span className="text-base font-mono font-bold tracking-wider">
                  {trip.invite_code}
                </span>
              </div>
              <button
                onClick={handleCopyCode}
                className="px-3 py-1.5 bg-[#16834A] dark:bg-[#22C55E] text-white dark:text-[#0A0A0A] text-xs font-semibold rounded-lg hover:opacity-90 cursor-pointer"
              >
                {copiedCode ? 'Copied' : 'Copy'}
              </button>
            </div>

            {/* Select friends list */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-[#737373] dark:text-[#8E8E93] block">
                Or select friends to invite:
              </span>
              {loadingFriends ? (
                <div className="py-4 text-center text-xs text-[#737373] dark:text-[#8E8E93]">
                  Loading friends...
                </div>
              ) : friends.length === 0 ? (
                <p className="text-xs text-[#737373] dark:text-[#8E8E93] py-2">
                  All your friends are already in this trip!
                </p>
              ) : (
                <div className="divide-y divide-[#E8E8E5] dark:divide-[#262626] max-h-48 overflow-y-auto">
                  {friends.map((f) => {
                    const isSelected = selectedFriendsToInvite.includes(f.id);
                    return (
                      <div
                        key={f.id}
                        onClick={() => {
                          setSelectedFriendsToInvite((prev) =>
                            isSelected ? prev.filter((x) => x !== f.id) : [...prev, f.id]
                          );
                        }}
                        className="py-2.5 px-2 flex items-center justify-between hover:bg-[#FAFAF8] dark:hover:bg-[#1C1C1C] rounded-lg cursor-pointer"
                      >
                        <span className="text-xs font-medium truncate">{f.display_name || f.username || 'Friend'}</span>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded text-[#16834A] focus:ring-[#16834A]"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {friends.length > 0 && (
              <button
                onClick={handleSendInvitations}
                disabled={sendingInvites || selectedFriendsToInvite.length === 0}
                className="w-full py-2.5 bg-[#16834A] dark:bg-[#22C55E] text-white dark:text-[#0A0A0A] rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
              >
                {sendingInvites ? 'Sending...' : `Send Invites (${selectedFriendsToInvite.length})`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* --- End Trip Modal --- */}
      {isEndTripModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#141414] text-[#171717] dark:text-[#EDEDED] rounded-2xl border border-[#E8E8E5] dark:border-[#262626] shadow-xl max-w-sm w-full p-5 space-y-4">
            <h3 className="text-base font-semibold">End &amp; Finalize Trip</h3>
            <p className="text-xs text-[#737373] dark:text-[#8E8E93] leading-relaxed">
              Ending this trip will mark it completed and archive it. No further expenses can be added.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsEndTripModalOpen(false)}
                className="flex-1 py-2 text-xs font-semibold border border-[#E8E8E5] dark:border-[#2E2E2E] rounded-xl hover:bg-[#F4F4F2] dark:hover:bg-[#1C1C1C] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalizeTrip}
                disabled={completingTrip}
                className="flex-1 py-2 text-xs font-semibold bg-[#171717] dark:bg-[#EDEDED] text-white dark:text-[#0A0A0A] rounded-xl hover:opacity-90 cursor-pointer disabled:opacity-50"
              >
                {completingTrip ? 'Ending...' : 'Confirm End Trip'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Trip Summary Modal --- */}
      <TripSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        tripId={trip.id}
      />
    </div>
  );
};

export default TripDetailPage;
