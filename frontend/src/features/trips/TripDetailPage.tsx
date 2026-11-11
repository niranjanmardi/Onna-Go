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
  MessageSquare,
  Camera,
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
  SocialPostItem,
} from '@/types';
import { formatPaise, formatDate } from '@/lib/currency';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { AddExpenseModal } from '@/features/expenses/AddExpenseModal';
import { RecordSettlementModal } from '@/features/settlements/RecordSettlementModal';
import { TripSummaryModal } from '@/features/trips/TripSummaryModal';
import { ChatConversationModal } from '@/features/chat/ChatConversationModal';
import { SocialPostCard } from '@/features/social/SocialPostCard';
import { CreatePostModal } from '@/features/social/CreatePostModal';
import { useFeedback } from '@/context/FeedbackContext';
import { playSound } from '@/lib/sounds';
import { downloadTripPdf, downloadTripCsv } from '@/lib/export-utils';
import {
  GlassPrimary,
  GlassSecondary,
  GlassInteractive,
  GlassSolid,
  GlassButton,
  GlassModal,
} from '@/components/glass';
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
  const { activeThemeId } = useTheme();
  const hasCustomWallpaper = activeThemeId !== 'default';
  const showFeedback = useFeedback();
  const { showConfirmation } = showFeedback;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

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

  // Active Tab: Expenses | Balances | Members | Memories
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances' | 'members' | 'memories'>(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'balances' || tabParam === 'members' || tabParam === 'memories') return tabParam;
    return 'expenses';
  });

  // Trip Memories state
  const [memories, setMemories] = useState<SocialPostItem[]>([]);
  const [loadingMemories, setLoadingMemories] = useState(false);
  const [isCreateMemoryOpen, setIsCreateMemoryOpen] = useState(false);

  const loadTripMemories = async () => {
    if (!id) return;
    setLoadingMemories(true);
    try {
      const data = await api.get<SocialPostItem[]>(`/social/trips/${id}/memories`);
      setMemories(data || []);
    } catch (err) {
      console.error('Failed to load trip memories', err);
    } finally {
      setLoadingMemories(false);
    }
  };

  // Top bar dropdown menu
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Modals
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(() => searchParams.get('action') === 'add-expense');
  const [isChatOpen, setIsChatOpen] = useState(() => searchParams.get('action') === 'chat');
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0);
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

        // Fetch unread trip chat count asynchronously
        api.get<{ unread_count?: number }>(`/chat/trips/${id}/conversation`)
          .then((conv) => {
            if (typeof conv?.unread_count === 'number') {
              setUnreadChatCount(conv.unread_count);
            }
          })
          .catch(() => {});

        // Fetch trip memories asynchronously
        api.get<SocialPostItem[]>(`/social/trips/${id}/memories`)
          .then((mems) => {
            if (Array.isArray(mems)) setMemories(mems);
          })
          .catch(() => {});

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

  // Listen to app-add-action from bottom bar / sidebar
  useEffect(() => {
    const handleAddExpenseEvent = (e: Event) => {
      e.preventDefault();
      setEditingExpense(null);
      setIsAddExpenseOpen(true);
    };
    window.addEventListener('app-add-action', handleAddExpenseEvent);
    return () => window.removeEventListener('app-add-action', handleAddExpenseEvent);
  }, []);

  const isTripCompleted = trip?.status === 'COMPLETED' || Boolean(trip?.completed_at) || Boolean(trip?.is_archived);

  // Handle action=add-expense in URL query
  useEffect(() => {
    if (searchParams.get('action') === 'add-expense' && !isTripCompleted) {
      setIsAddExpenseOpen(true);
      setSearchParams(
        (prev: URLSearchParams) => {
          const next = new URLSearchParams(prev);
          next.delete('action');
          return next;
        },
        { replace: true }
      );
    }
  }, [searchParams, isTripCompleted, setSearchParams]);

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
  const userContributionPaise = userBalanceItem?.total_spent_paise ?? trip?.user_contribution_paise ?? 0;
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
        <div className="py-4 border-b border-[#E8E8E5] dark:border-[#2A2A2E] grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
          <div className="w-24 h-10 rounded bg-[#E8E8E5] dark:bg-[#1B1B1E] animate-pulse" />
          <div className="w-24 h-10 rounded bg-[#E8E8E5] dark:bg-[#1B1B1E] animate-pulse" />
          <div className="w-24 h-10 rounded bg-[#E8E8E5] dark:bg-[#1B1B1E] animate-pulse" />
          <div className="w-24 h-10 rounded bg-[#E8E8E5] dark:bg-[#1B1B1E] animate-pulse" />
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

  return (
    <div className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-5">
      {/* --- Top Bar: Back arrow, Trip name, "..." menu --- */}
      <header className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
          <button
            onClick={() => navigate('/trips')}
            className="p-2 -ml-2 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            aria-label="Back to Trips"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-white truncate drop-shadow-xs">
            {trip.name}
          </h1>
        </div>

        {/* Right Actions: Trip Chat, Add Expense & "..." Dropdown Menu */}
        <div className="flex items-center gap-2 shrink-0">
          <GlassButton
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/messages?tripId=${id}`)}
            className="gap-1.5 relative cursor-pointer"
            aria-label="Trip Chat"
          >
            <MessageSquare className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">Trip Chat</span>
            {unreadChatCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            )}
          </GlassButton>

          {!isTripCompleted && (
            <GlassButton
              variant="primary"
              size="sm"
              onClick={() => {
                setEditingExpense(null);
                setIsAddExpenseOpen(true);
              }}
              className="gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add expense</span>
            </GlassButton>
          )}

          {/* "..." Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Trip actions"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-52 glass-solid rounded-2xl border border-white/50 dark:border-white/15 shadow-xl py-1.5 z-40 text-xs sm:text-sm animate-scaleUp">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    navigate(`/messages?tripId=${id}`);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-between text-zinc-900 dark:text-white font-medium cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <MessageSquare className="w-4 h-4 text-blue-400" />
                    <span>Trip Chat</span>
                  </div>
                  {unreadChatCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-blue-500 text-[10px] font-bold text-white">
                      {unreadChatCount}
                    </span>
                  )}
                </button>
                <div className="border-t border-black/5 dark:border-white/10 my-1" />
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleOpenInviteFriends();
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2.5 text-zinc-900 dark:text-white font-medium cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-zinc-400" />
                  <span>Invite Friends</span>
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleCopyCode();
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2.5 text-zinc-900 dark:text-white font-medium cursor-pointer"
                >
                  <Users className="w-4 h-4 text-zinc-400" />
                  <span>Copy Invite Code</span>
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleShareLocation();
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2.5 text-zinc-900 dark:text-white font-medium cursor-pointer"
                >
                  <MapPin className="w-4 h-4 text-zinc-400" />
                  <span>Share Location</span>
                </button>
                <div className="border-t border-black/5 dark:border-white/10 my-1" />
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    downloadTripPdf(trip.id, trip.name);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2.5 text-zinc-900 dark:text-white font-medium cursor-pointer"
                >
                  <Download className="w-4 h-4 text-zinc-400" />
                  <span>Export PDF</span>
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    downloadTripCsv(trip.id, trip.name);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2.5 text-zinc-900 dark:text-white font-medium cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-zinc-400" />
                  <span>Export CSV</span>
                </button>
                {isOwnerOrAdmin && !isTripCompleted && (
                  <div className="border-t border-black/5 dark:border-white/10 my-1 pt-1">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setIsEndTripModalOpen(true);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-red-500/10 flex items-center gap-2.5 text-red-600 dark:text-red-400 font-medium cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>End Trip</span>
                    </button>
                  </div>
                )}
                {isTripCompleted && (
                  <div className="border-t border-black/5 dark:border-white/10 my-1 pt-1">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setIsSummaryModalOpen(true);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-emerald-500/10 flex items-center gap-2.5 text-[#16834A] dark:text-[#22C55E] font-medium cursor-pointer"
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

      {/* --- Summary Line: 4 Distinct Financial Metrics (iPhone Frosted Solid Glass) --- */}
      <GlassSolid className="p-5 sm:p-6 shadow-xl grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
        <div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 block mb-0.5 font-semibold uppercase tracking-wider">
            Total Expenses
          </span>
          <span className="text-lg sm:text-xl font-bold tabular-nums font-mono tracking-tight text-zinc-900 dark:text-white">
            {formatPaise(totalTripExpensesPaise, trip.currency)}
          </span>
        </div>
        <div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 block mb-0.5 font-semibold uppercase tracking-wider">
            Your Fair Share
          </span>
          <span className="text-lg sm:text-xl font-bold tabular-nums font-mono tracking-tight text-zinc-900 dark:text-white">
            {formatPaise(userSharePaise, trip.currency)}
          </span>
        </div>
        <div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 block mb-0.5 font-semibold uppercase tracking-wider">
            You Paid
          </span>
          <span className="text-lg sm:text-xl font-bold tabular-nums font-mono tracking-tight text-zinc-900 dark:text-white">
            {formatPaise(userContributionPaise, trip.currency)}
          </span>
        </div>
        <div>
          {netBalancePaise < 0 ? (
            <>
              <span className="text-xs text-red-600 dark:text-red-400 block mb-0.5 font-semibold uppercase tracking-wider">
                You Owe
              </span>
              <span className="text-lg sm:text-xl font-bold tabular-nums font-mono tracking-tight text-red-600 dark:text-red-400">
                {formatPaise(Math.abs(netBalancePaise), trip.currency)}
              </span>
            </>
          ) : netBalancePaise > 0 ? (
            <>
              <span className="text-xs text-[#16834A] dark:text-[#22C55E] block mb-0.5 font-semibold uppercase tracking-wider">
                You Get Back
              </span>
              <span className="text-lg sm:text-xl font-bold tabular-nums font-mono tracking-tight text-[#16834A] dark:text-[#22C55E]">
                {formatPaise(netBalancePaise, trip.currency)}
              </span>
            </>
          ) : (
            <>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 block mb-0.5 font-semibold uppercase tracking-wider">
                Net Balance
              </span>
              <span className="text-lg sm:text-xl font-bold tracking-tight text-zinc-600 dark:text-zinc-400">
                Settled Up
              </span>
            </>
          )}
        </div>
      </GlassSolid>

      {/* Quick Action Pill Row */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => navigate(`/messages?tripId=${id}`)}
          className="glass-card px-3.5 py-2 rounded-2xl flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white hover:bg-white/20 transition-all cursor-pointer border border-white/25 shrink-0"
        >
          <MessageSquare className="w-4 h-4 text-blue-400" />
          <span>Trip Chat</span>
          {unreadChatCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-blue-500 text-[10px] font-extrabold text-white">
              {unreadChatCount}
            </span>
          )}
        </button>
        <button
          onClick={handleOpenInviteFriends}
          className="glass-card px-3.5 py-2 rounded-2xl flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white hover:bg-white/20 transition-all cursor-pointer border border-white/25 shrink-0"
        >
          <UserPlus className="w-4 h-4 text-emerald-400" />
          <span>Invite Friends</span>
        </button>
        <button
          onClick={handleShareLocation}
          className="glass-card px-3.5 py-2 rounded-2xl flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white hover:bg-white/20 transition-all cursor-pointer border border-white/25 shrink-0"
        >
          <MapPin className="w-4 h-4 text-amber-400" />
          <span>Share Location</span>
        </button>
      </div>

      {/* --- Underlined Tab Row: Expenses | Balances | Members --- */}
      <nav className="flex items-center gap-8 border-b border-black/5 dark:border-white/10 mt-4 mb-4 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`pb-2.5 transition-colors cursor-pointer relative ${
            activeTab === 'expenses'
              ? 'text-zinc-900 dark:text-white border-b-2 border-[#16834A] dark:border-[#22C55E] -mb-[1px]'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          Expenses
        </button>

        <button
          onClick={() => setActiveTab('balances')}
          className={`pb-2.5 transition-colors cursor-pointer relative flex items-center gap-1.5 ${
            activeTab === 'balances'
              ? 'text-zinc-900 dark:text-white border-b-2 border-[#16834A] dark:border-[#22C55E] -mb-[1px]'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <span>Balances</span>
          {pendingForMeAsReceiver.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`pb-2.5 transition-colors cursor-pointer relative shrink-0 ${
            activeTab === 'members'
              ? 'text-zinc-900 dark:text-white border-b-2 border-[#16834A] dark:border-[#22C55E] -mb-[1px]'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          Members ({members.length})
        </button>

        <button
          onClick={() => {
            setActiveTab('memories');
            loadTripMemories();
          }}
          className={`pb-2.5 transition-colors cursor-pointer relative flex items-center gap-1.5 shrink-0 ${
            activeTab === 'memories'
              ? 'text-zinc-900 dark:text-white border-b-2 border-[#16834A] dark:border-[#22C55E] -mb-[1px]'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Memories</span>
          {memories.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-black/5 dark:bg-white/10 text-[11px] font-bold">
              {memories.length}
            </span>
          )}
        </button>
      </nav>

      {/* ========================================================================= */}
      {/* --- TAB 1: EXPENSES --- */}
      {/* ========================================================================= */}
      {activeTab === 'expenses' && (
        <section className="space-y-6 pb-24 sm:pb-8">
          {groupedExpenses.length === 0 ? (
            <GlassSecondary className="p-10 text-center space-y-3">
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 font-medium">
                No expenses recorded yet.
              </p>
              {!isTripCompleted && (
                <GlassButton
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setEditingExpense(null);
                    setIsAddExpenseOpen(true);
                  }}
                  className="gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add an expense</span>
                </GlassButton>
              )}
            </GlassSecondary>
          ) : (
            groupedExpenses.map((group) => (
              <div key={group.dateLabel} className="space-y-1.5">
                {/* Small Section Header */}
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 pt-2 pb-1 px-1">
                  {group.dateLabel}
                </h3>

                {/* Feed Rows for this date */}
                <GlassSecondary className="p-2 sm:p-3 divide-y divide-black/5 dark:divide-white/10">
                  {group.items.map((exp) => {
                    const initial = exp.category ? exp.category.charAt(0).toUpperCase() : 'E';

                    return (
                      <GlassInteractive
                        key={exp.id}
                        onClick={() => setSelectedExpenseForAction(exp)}
                        className="py-3 px-3 flex items-center justify-between group"
                      >
                        {/* Left + Middle */}
                        <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                          {/* Category initial avatar */}
                          <div className="w-9 h-9 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold text-xs flex items-center justify-center shrink-0 border border-white/40 dark:border-white/10 shadow-xs">
                            {initial}
                          </div>

                          {/* Title & Subtitle */}
                          <div className="min-w-0 flex-1 truncate">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                                {exp.description}
                              </span>
                              {exp.is_pending_sync && (
                                <span title="Waiting to sync">
                                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate font-medium">
                              Paid by {exp.payer_name || 'Member'} &bull; {formatRelativeTime(exp.created_at || exp.date)}
                            </p>
                          </div>
                        </div>

                        {/* Right: Amount */}
                        <div className="text-right shrink-0 ml-3">
                          <span className="text-sm font-bold font-mono tabular-nums text-zinc-900 dark:text-white">
                            {formatPaise(exp.amount_paise, exp.currency)}
                          </span>
                        </div>
                      </GlassInteractive>
                    );
                  })}
                </GlassSecondary>
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
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 px-1">
                Awaiting your confirmation
              </h3>
              <GlassSecondary className="p-3 sm:p-4 divide-y divide-black/5 dark:divide-white/10">
                {pendingForMeAsReceiver.map((st) => (
                  <div key={st.id} className="py-3 flex items-center justify-between">
                    <div className="min-w-0 flex-1 pr-3">
                      <p className="text-sm text-zinc-900 dark:text-white font-medium">
                        <span className="font-bold">{st.payer_name}</span> paid you{' '}
                        <span className="font-mono font-bold">
                          {formatPaise(st.amount_paise, trip.currency)}
                        </span>
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-medium">
                        via {st.payment_method}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <GlassButton
                        variant="primary"
                        size="sm"
                        onClick={() => handleConfirmReceipt(st.id)}
                        disabled={settlingActionId === st.id}
                      >
                        Confirm
                      </GlassButton>
                      <GlassButton
                        variant="danger"
                        size="sm"
                        onClick={() => handleRejectReceipt(st.id)}
                        disabled={settlingActionId === st.id}
                      >
                        Decline
                      </GlassButton>
                    </div>
                  </div>
                ))}
              </GlassSecondary>
            </div>
          )}

          {/* --- Section A: Who Owes Whom (Settlement Suggestions) --- */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 px-1">
              Debt Settlements (Who Owes Whom)
            </h3>

            {suggestions.length === 0 ? (
              <GlassSecondary className="p-8 text-center">
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 font-medium">All debts are settled.</p>
              </GlassSecondary>
            ) : (
              <GlassSecondary className="p-3 sm:p-4 divide-y divide-black/5 dark:divide-white/10">
                {suggestions.map((sug, idx) => {
                  const isDebtor = sug.from_user_id === user?.id;
                  const isReceiver = sug.to_user_id === user?.id;
                  const otherUserName = isDebtor ? sug.to_user_name : isReceiver ? sug.from_user_name : sug.to_user_name;
                  const initial = otherUserName ? otherUserName.charAt(0).toUpperCase() : 'M';

                  return (
                    <div
                      key={`${sug.from_user_id}-${sug.to_user_id}-${idx}`}
                      className="py-3.5 flex items-center justify-between"
                    >
                      {/* Avatar & Directional Wording */}
                      <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold text-xs flex items-center justify-center shrink-0 border border-white/40 dark:border-white/10">
                          {initial}
                        </div>
                        <div className="min-w-0 truncate">
                          {isDebtor ? (
                            <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                              You owe <span className="font-bold">{sug.to_user_name}</span>{' '}
                              <span className="font-mono font-bold tabular-nums text-red-600 dark:text-red-400">
                                {formatPaise(sug.amount_paise, trip.currency)}
                              </span>
                            </p>
                          ) : isReceiver ? (
                            <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                              <span className="font-bold">{sug.from_user_name}</span> owes you{' '}
                              <span className="font-mono font-bold tabular-nums text-[#16834A] dark:text-[#22C55E]">
                                {formatPaise(sug.amount_paise, trip.currency)}
                              </span>
                            </p>
                          ) : (
                            <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                              <span className="font-bold">{sug.from_user_name}</span> owes{' '}
                              <span className="font-bold">{sug.to_user_name}</span>{' '}
                              <span className="font-mono font-bold tabular-nums text-zinc-900 dark:text-white">
                                {formatPaise(sug.amount_paise, trip.currency)}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action: Clear Settle Up Button */}
                      <div className="flex items-center gap-3 shrink-0">
                        {!isTripCompleted && (isDebtor || isOwnerOrAdmin) && (
                          <GlassButton
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setSettlePayer(sug.from_user_id);
                              setSettlePayee(sug.to_user_id);
                              setSettleAmount(sug.amount_paise);
                              setIsRecordSettlementOpen(true);
                            }}
                          >
                            Settle Up
                          </GlassButton>
                        )}
                        {!isTripCompleted && isReceiver && !isOwnerOrAdmin && (
                          <span className="text-[11px] font-semibold text-[#16834A] dark:text-[#22C55E] bg-emerald-500/15 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                            Awaiting payment
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </GlassSecondary>
            )}
          </div>

          {/* --- Section B: Member Balances Breakdown --- */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 px-1">
              Member Balances
            </h3>

            <GlassSecondary className="p-3 sm:p-4 divide-y divide-black/5 dark:divide-white/10">
              {(balances?.balances || []).map((mb) => {
                const isCurrentUser = mb.user_id === user?.id;
                const initial = mb.user_name ? mb.user_name.charAt(0).toUpperCase() : 'M';
                const isCreditor = mb.net_balance_paise > 0;
                const isDebtor = mb.net_balance_paise < 0;

                return (
                  <div key={mb.user_id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    {/* Left: Avatar & Name */}
                    <div className="flex items-center gap-3 min-w-0">
                      {mb.avatar_url ? (
                        <img
                          src={getAvatarUrl(mb.avatar_url)}
                          alt={mb.user_name}
                          className="w-9 h-9 rounded-full object-cover border border-white/40 dark:border-white/10 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold text-xs flex items-center justify-center shrink-0 border border-white/40 dark:border-white/10">
                          {initial}
                        </div>
                      )}
                      <div className="min-w-0 truncate">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                            {mb.user_name}
                          </span>
                          {isCurrentUser && (
                            <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 border border-black/5 dark:border-white/10">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-3 mt-0.5 font-medium">
                          <span>Paid: <strong className="font-mono tabular-nums text-zinc-900 dark:text-white">{formatPaise(mb.total_spent_paise, trip.currency)}</strong></span>
                          <span>&bull;</span>
                          <span>Share: <strong className="font-mono tabular-nums text-zinc-900 dark:text-white">{formatPaise(mb.total_share_paise, trip.currency)}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Net Balance & Status Badge */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 ml-12 sm:ml-0">
                      <span
                        className={`text-sm font-bold font-mono tabular-nums ${
                          isCreditor
                            ? 'text-[#16834A] dark:text-[#22C55E]'
                            : isDebtor
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-zinc-500'
                        }`}
                      >
                        {isCreditor
                          ? `+${formatPaise(mb.net_balance_paise, trip.currency)}`
                          : isDebtor
                          ? `-${formatPaise(Math.abs(mb.net_balance_paise), trip.currency)}`
                          : formatPaise(0, trip.currency)}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                          isCreditor
                            ? 'bg-emerald-500/15 text-[#16834A] dark:text-[#22C55E] border-emerald-500/30'
                            : isDebtor
                            ? 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30'
                            : 'bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 border-black/5 dark:border-white/10'
                        }`}
                      >
                        {isCreditor ? 'Gets back' : isDebtor ? 'Owes' : 'Settled up'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </GlassSecondary>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* --- TAB 3: MEMBERS --- */}
      {/* ========================================================================= */}
      {activeTab === 'members' && (
        <section className="space-y-4 pb-24 sm:pb-8">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
              Trip members ({members.length})
            </h3>
            <GlassButton
              variant="secondary"
              size="sm"
              onClick={handleOpenInviteFriends}
            >
              + Invite friends
            </GlassButton>
          </div>

          <GlassSecondary className="p-3 sm:p-4 divide-y divide-black/5 dark:divide-white/10">
            {members.map((m) => {
              const isCurrentUser = m.user_id === user?.id;
              const initial = m.user_name ? m.user_name.charAt(0).toUpperCase() : 'M';
              const roleLabel = m.role === 'OWNER' ? 'Organizer' : m.role === 'ADMIN' ? 'Admin' : 'Member';

              return (
                <div key={m.id || m.user_id} className="py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold text-xs flex items-center justify-center shrink-0 border border-white/40 dark:border-white/10">
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-bold text-zinc-900 dark:text-white truncate block">
                        {m.user_name} {isCurrentUser ? '(You)' : ''}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate block font-medium">
                        {m.user_email || `@${m.user_name.toLowerCase().replace(/\s+/g, '_')}`}
                      </span>
                    </div>
                  </div>

                  <span className="text-xs text-zinc-600 dark:text-zinc-300 shrink-0 font-semibold px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10">
                    {roleLabel}
                  </span>
                </div>
              );
            })}
          </GlassSecondary>
        </section>
      )}

      {/* ========================================================================= */}
      {/* --- TAB 4: MEMORIES --- */}
      {/* ========================================================================= */}
      {activeTab === 'memories' && (
        <section className="space-y-4 pb-24 sm:pb-8">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
              Trip Memories ({memories.length})
            </h3>
            <GlassButton
              variant="primary"
              size="sm"
              onClick={() => setIsCreateMemoryOpen(true)}
              className="gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Capture Memory</span>
            </GlassButton>
          </div>

          {loadingMemories ? (
            <div className="space-y-4 py-8">
              {[1, 2].map((i) => (
                <div key={i} className="glass-card p-4 rounded-2xl animate-pulse space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/20" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3.5 bg-white/20 rounded w-1/4" />
                      <div className="h-2.5 bg-white/15 rounded w-1/6" />
                    </div>
                  </div>
                  <div className="h-48 bg-white/10 rounded-xl" />
                </div>
              ))}
            </div>
          ) : memories.length === 0 ? (
            <GlassSecondary className="p-10 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-3xl bg-white/15 flex items-center justify-center text-white/90 shadow-md">
                <Camera className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-zinc-900 dark:text-white">
                  No memories captured for this trip yet
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                  Share candid moments, trip scenery, and travel vibes with fellow trip members.
                </p>
              </div>
              <GlassButton
                variant="primary"
                size="sm"
                onClick={() => setIsCreateMemoryOpen(true)}
                className="mx-auto gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>Capture First Memory</span>
              </GlassButton>
            </GlassSecondary>
          ) : (
            <div className="space-y-4 max-w-2xl mx-auto">
              {memories.map((post) => (
                <SocialPostCard
                  key={post.id}
                  post={post}
                  onPostUpdated={(updated: SocialPostItem) => {
                    setMemories((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
                  }}
                  onPostDeleted={(postId: string) => {
                    setMemories((prev) => prev.filter((m) => m.id !== postId));
                  }}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* --- Mobile Sticky Bottom Action Button --- */}
      {!isTripCompleted && (
        <div className="sm:hidden fixed bottom-20 right-4 z-30">
          <GlassButton
            variant="primary"
            size="md"
            onClick={() => {
              setEditingExpense(null);
              setIsAddExpenseOpen(true);
            }}
            className="rounded-full shadow-lg gap-1.5"
            aria-label="Add expense"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add expense</span>
          </GlassButton>
        </div>
      )}

      {/* --- Expense Action Modal --- */}
      {selectedExpenseForAction && (
        <GlassModal
          isOpen={Boolean(selectedExpenseForAction)}
          onClose={() => setSelectedExpenseForAction(null)}
          title={selectedExpenseForAction.description}
          subtitle={`Paid by ${selectedExpenseForAction.payer_name} • ${formatDate(selectedExpenseForAction.date)}`}
          size="sm"
        >
          <div className="space-y-4">
            <div className="py-2">
              <span className="text-xs text-zinc-500 dark:text-zinc-400 block mb-0.5 font-semibold uppercase tracking-wider">
                Total Amount
              </span>
              <span className="text-2xl font-bold font-mono tabular-nums text-zinc-900 dark:text-white">
                {formatPaise(selectedExpenseForAction.amount_paise, selectedExpenseForAction.currency)}
              </span>
            </div>

            {/* Split Breakdown */}
            {selectedExpenseForAction.splits && selectedExpenseForAction.splits.length > 0 && (
              <div className="border-t border-black/5 dark:border-white/10 pt-3 space-y-1.5 max-h-36 overflow-y-auto">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                  Splits
                </span>
                {selectedExpenseForAction.splits.map((s) => (
                  <div key={s.id || s.user_id} className="flex items-center justify-between text-xs">
                    <span className="text-zinc-600 dark:text-zinc-300 truncate pr-2 font-medium">
                      {s.user_name || 'Member'}
                    </span>
                    <span className="font-mono font-bold tabular-nums text-zinc-900 dark:text-white">
                      {formatPaise(s.amount_paise, selectedExpenseForAction.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons: Edit and Void */}
            {!isTripCompleted && (selectedExpenseForAction.payer_id === user?.id || isOwnerOrAdmin) && (
              <div className="border-t border-black/5 dark:border-white/10 pt-3 flex gap-2">
                <GlassButton
                  variant="secondary"
                  size="sm"
                  onClick={() => handleStartEditExpense(selectedExpenseForAction)}
                  className="flex-1 gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5 text-[#16834A] dark:text-[#22C55E]" />
                  <span>Edit</span>
                </GlassButton>
                <GlassButton
                  variant="danger"
                  size="sm"
                  onClick={() => handleVoidExpense(selectedExpenseForAction.id, selectedExpenseForAction.description)}
                  className="flex-1 gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Void</span>
                </GlassButton>
              </div>
            )}
          </div>
        </GlassModal>
      )}

      {/* --- Add / Edit Expense Modal --- */}
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
        tripName={trip.name}
        members={members}
        initialPayerId={settlePayer}
        initialPayeeId={settlePayee}
        initialAmountPaise={settleAmount}
        onSettlementRecorded={() => loadAllTripData()}
      />

      {/* --- Invite Friends Modal --- */}
      {isInviteModalOpen && (
        <GlassModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          title={`Invite to ${trip.name}`}
          subtitle="Share code or invite existing friends"
          size="sm"
        >
          <div className="space-y-4">
            {/* Invite code block */}
            <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                  Trip Invite Code
                </span>
                <span className="text-base font-mono font-bold tracking-wider text-zinc-900 dark:text-white">
                  {trip.invite_code}
                </span>
              </div>
              <GlassButton
                variant="primary"
                size="sm"
                onClick={handleCopyCode}
              >
                {copiedCode ? 'Copied' : 'Copy'}
              </GlassButton>
            </div>

            {/* Select friends list */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                Or select friends to invite:
              </span>
              {loadingFriends ? (
                <div className="py-4 text-center text-xs text-zinc-500">
                  Loading friends...
                </div>
              ) : friends.length === 0 ? (
                <p className="text-xs text-zinc-500 py-2">
                  All your friends are already in this trip!
                </p>
              ) : (
                <div className="divide-y divide-black/5 dark:divide-white/10 max-h-48 overflow-y-auto">
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
                        className="py-2.5 px-2 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 rounded-lg cursor-pointer"
                      >
                        <span className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                          {f.display_name || f.username || 'Friend'}
                        </span>
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
              <GlassButton
                variant="primary"
                size="md"
                onClick={handleSendInvitations}
                disabled={sendingInvites || selectedFriendsToInvite.length === 0}
                className="w-full"
              >
                {sendingInvites ? 'Sending...' : `Send Invites (${selectedFriendsToInvite.length})`}
              </GlassButton>
            )}
          </div>
        </GlassModal>
      )}

      {/* --- End Trip Modal --- */}
      {isEndTripModalOpen && (
        <GlassModal
          isOpen={isEndTripModalOpen}
          onClose={() => setIsEndTripModalOpen(false)}
          title="End & Finalize Trip"
          subtitle="Finalize and archive this journey"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">
              Ending this trip will mark it completed and archive it. No further expenses can be added.
            </p>
            <div className="flex gap-2.5 pt-2">
              <GlassButton
                variant="secondary"
                size="sm"
                onClick={() => setIsEndTripModalOpen(false)}
                className="flex-1"
              >
                Cancel
              </GlassButton>
              <GlassButton
                variant="primary"
                size="sm"
                onClick={handleFinalizeTrip}
                disabled={completingTrip}
                className="flex-1"
              >
                {completingTrip ? 'Ending...' : 'Confirm End Trip'}
              </GlassButton>
            </div>
          </div>
        </GlassModal>
      )}

      {/* --- Trip Summary Modal --- */}
      <TripSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        tripId={trip.id}
      />

      {/* --- Trip Group Chat Modal --- */}
      <ChatConversationModal
        isOpen={isChatOpen}
        onClose={() => {
          setIsChatOpen(false);
          if (searchParams.get('action') === 'chat') {
            searchParams.delete('action');
            setSearchParams(searchParams, { replace: true });
          }
        }}
        tripId={trip.id}
        tripName={trip.name}
        memberCount={members.length}
        onUnreadCountChange={(count) => setUnreadChatCount(count)}
      />

      {/* --- Create Trip Memory Modal --- */}
      <CreatePostModal
        isOpen={isCreateMemoryOpen}
        onClose={() => setIsCreateMemoryOpen(false)}
        defaultTripId={trip.id}
        defaultTripName={trip.name}
        onPostCreated={(newPost) => {
          setMemories((prev) => [newPost, ...prev]);
        }}
      />
    </div>
  );
};

export default TripDetailPage;
