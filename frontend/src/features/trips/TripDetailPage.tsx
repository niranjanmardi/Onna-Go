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

export const TripDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
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

  // Filters
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('All');
  const [copiedCode, setCopiedCode] = useState(false);

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
      setIsInviteFriendsOpen(false);
    } catch (err: any) {
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
      alert(err.message || 'Error voiding expense');
    }
  };

  const handleConfirmSettlement = async (settlementId: string) => {
    try {
      await api.put(`/settlements/${settlementId}/status`, {
        status: 'CONFIRMED',
        reason: 'Confirmed received by recipient',
      });
      await loadAllTripData();
    } catch (err: any) {
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

  const filteredExpenses = expenses.filter((e) => {
    const matchCat = expenseCategoryFilter === 'All' || e.category === expenseCategoryFilter;
    const matchSearch =
      !expenseSearch || e.description.toLowerCase().includes(expenseSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full space-y-6">
      {/* --- Apple-Style Trip Header Card --- */}
      <div className="bg-white rounded-2xl border border-[#E8E8E5] p-6 md:p-8 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-semibold text-[#16834A] bg-[#DDF5E5] border border-[#C6ECCF] px-2.5 py-0.5 rounded-md">
                ONNA-GO • Group Trip
              </span>
              <span className="text-[11px] font-semibold text-[#737373] bg-[#FAFAF8] border border-[#E8E8E5] px-2.5 py-0.5 rounded-md">
                {trip.currency}
              </span>
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

          {/* Quick Actions & Invite Code */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl p-2.5 px-3.5 flex items-center justify-between gap-3">
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

            <button
              onClick={() => setIsAddExpenseOpen(true)}
              className="inline-flex items-center justify-center gap-2 bg-[#16834A] hover:bg-[#136F3F] text-white font-semibold py-2.5 px-4 rounded-xl shadow-xs transition-all active:scale-[0.98] text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Record Expense</span>
            </button>
          </div>
        </div>

        {/* Metrics Ribbon */}
        <div className="mt-7 pt-5 border-t border-[#F4F4F2] grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
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
              {settlements.filter((s) => s.status === 'PENDING_CONFIRMATION').length}
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
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E8E8E5] shadow-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {['All', 'Fuel', 'Food', 'Stay', 'Transport', 'Tickets', 'Other'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setExpenseCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    expenseCategoryFilter === cat
                      ? 'bg-[#171717] text-white font-semibold'
                      : 'text-[#737373] hover:bg-[#F4F4F2]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Search expense description..."
                value={expenseSearch}
                onChange={(e) => setExpenseSearch(e.target.value)}
                className="w-full sm:w-60 bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3 py-1.5 text-xs text-[#171717] placeholder-[#A3A3A3] focus:outline-none focus:border-[#16834A]"
              />
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

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <span className="text-base font-bold font-mono text-[#171717] tabular-nums">
                        {formatPaise(sug.amount_paise)}
                      </span>
                      <button
                        onClick={() => handleTriggerSuggestion(sug)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#16834A] hover:bg-[#136F3F] text-white font-medium text-xs shadow-xs transition-all active:scale-[0.98]"
                      >
                        Record Payment
                      </button>
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
            <h3 className="text-base font-bold text-[#171717] font-['Plus_Jakarta_Sans']">
              Settlement Records &amp; Verification
            </h3>
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
                        className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${
                          st.status === 'CONFIRMED'
                            ? 'bg-[#DDF5E5] text-[#16834A]'
                            : st.status === 'DISPUTED'
                            ? 'bg-[#FFE4E6] text-[#E11D48]'
                            : 'bg-[#FEF3C7] text-[#B45309]'
                        }`}
                      >
                        {st.status.replace('_', ' ')}
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

                    {/* Status Actions */}
                    {st.status === 'PENDING_CONFIRMATION' && (
                      <div className="flex items-center gap-2">
                        {user?.id === st.payee_id && (
                          <button
                            onClick={() => handleConfirmSettlement(st.id)}
                            className="px-2.5 py-1 bg-[#16834A] hover:bg-[#136F3F] text-white text-[11px] font-semibold rounded-lg shadow-xs"
                          >
                            Confirm Receipt
                          </button>
                        )}
                        <button
                          onClick={() => handleDisputeSettlement(st.id)}
                          className="px-2 py-1 text-[#737373] hover:text-[#E11D48] text-[11px] font-medium"
                        >
                          Dispute
                        </button>
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
    </div>
  );
};
