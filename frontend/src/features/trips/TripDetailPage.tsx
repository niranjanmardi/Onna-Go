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
  Share2,
} from 'lucide-react';
import { api } from '@/lib/api-client';
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

  const [activeTab, setActiveTab] = useState<'expenses' | 'balances' | 'settlements' | 'activities' | 'budgets' | 'reports' | 'members'>('expenses');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Modals state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isRecordSettlementOpen, setIsRecordSettlementOpen] = useState(false);
  const [settlePayer, setSettlePayer] = useState<string | undefined>();
  const [settlePayee, setSettlePayee] = useState<string | undefined>();
  const [settleAmount, setSettleAmount] = useState<number | undefined>();

  // Filter expenses
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('All');
  const [expenseSearch, setExpenseSearch] = useState('');

  const loadAllTripData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
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
        api.get<{ trip_id: string; suggestions: SettlementSuggestion[] }>(`/balances/trip/${id}/suggestions`),
        api.get<Settlement[]>(`/settlements/trip/${id}`),
        api.get<Activity[]>(`/activities/trip/${id}`),
        api.get<Budget[]>(`/budgets/trip/${id}`),
        api.get<TripReport>(`/reports/trip/${id}`).catch(() => null),
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
    } catch (err: any) {
      setError(err.message || 'Failed to load trip details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllTripData();
  }, [id]);

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
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500 mt-3">Loading trip details...</p>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {error || 'Trip not found.'}
        </div>
        <button
          onClick={() => navigate('/trips')}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold"
        >
          Back to Trips
        </button>
      </div>
    );
  }

  // Filtered expenses
  const filteredExpenses = expenses.filter((e) => {
    const matchCat = expenseCategoryFilter === 'All' || e.category === expenseCategoryFilter;
    const matchSearch =
      !expenseSearch || e.description.toLowerCase().includes(expenseSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* --- Trip Header Banner --- */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-orange-500/20 via-indigo-600/20 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2.5 py-0.5 rounded-full">
                ONNA-GO • ஒண்ணா போ
              </span>
              <span className="text-xs font-bold text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full">
                {trip.currency}
              </span>
            </div>

            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight font-['Plus_Jakarta_Sans']">
              {trip.name}
            </h1>

            <div className="flex items-center gap-4 text-xs text-slate-300 flex-wrap">
              {trip.destination && (
                <span className="flex items-center gap-1.5 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-orange-400" />
                  <span>{trip.destination}</span>
                </span>
              )}
              {trip.start_date && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formatDate(trip.start_date)} - {formatDate(trip.end_date)}</span>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>{members.length} Riders / Friends</span>
              </span>
            </div>
          </div>

          {/* Quick Invite Code Banner */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-3 flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Invite Code</span>
                <span className="text-sm font-mono font-bold tracking-widest text-orange-400">{trip.invite_code}</span>
              </div>
              <button
                onClick={handleCopyCode}
                className="p-2 rounded-xl bg-slate-700/80 hover:bg-slate-600 text-slate-200 transition-colors"
                title="Copy Code"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <button
              onClick={() => setIsAddExpenseOpen(true)}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-3 px-5 rounded-2xl shadow-lg shadow-orange-500/25 active:scale-95 transition-all text-sm"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add Expense</span>
            </button>
          </div>
        </div>

        {/* Total Expenses / Balances ribbon */}
        <div className="mt-8 pt-5 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Total Spent</span>
            <span className="text-xl font-bold font-mono text-white">
              {formatPaise(trip.total_expenses_paise, trip.currency)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Recorded Expenses</span>
            <span className="text-xl font-bold font-mono text-indigo-400">
              {expenses.filter((e) => !e.is_void).length}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Your Position</span>
            {(() => {
              const myBal = balances?.balances.find((b) => b.user_id === user?.id);
              const amt = myBal?.net_balance_paise || 0;
              return (
                <span
                  className={`text-xl font-bold font-mono ${
                    amt > 0 ? 'text-emerald-400' : amt < 0 ? 'text-amber-400' : 'text-slate-300'
                  }`}
                >
                  {amt > 0 ? `+${formatPaise(amt)}` : formatPaise(amt)}
                </span>
              );
            })()}
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Pending Settlements</span>
            <span className="text-xl font-bold font-mono text-orange-400">
              {settlements.filter((s) => s.status === 'PENDING_CONFIRMATION').length}
            </span>
          </div>
        </div>
      </div>

      {/* --- Navigation Tabs --- */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
        {[
          { key: 'expenses', label: 'Expenses', icon: Receipt, count: expenses.length },
          { key: 'balances', label: 'Balances & Settle', icon: Scale },
          { key: 'settlements', label: 'Settlement History', icon: HandCoins, count: settlements.length },
          { key: 'activities', label: 'Activities', icon: Compass, count: activities.length },
          { key: 'budgets', label: 'Budgets', icon: Sliders, count: budgets.length },
          { key: 'reports', label: 'Reports & Export', icon: PieChart },
          { key: 'members', label: 'Riders', icon: Users, count: members.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {['All', 'Fuel', 'Food', 'Stay', 'Transport', 'Tickets', 'Other'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setExpenseCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    expenseCategoryFilter === cat
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold'
                      : 'text-slate-600 hover:bg-slate-100'
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
                className="w-full sm:w-60 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Expenses List */}
          {filteredExpenses.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center space-y-3">
              <Receipt className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="text-base font-bold text-slate-800">No expenses recorded yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Paid for highway fuel, food, or bike repairs? Add an expense and split it with the group.
              </p>
              <button
                onClick={() => setIsAddExpenseOpen(true)}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2 px-4 rounded-xl"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Expense</span>
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 shadow-sm overflow-hidden">
              {filteredExpenses.map((exp) => (
                <div
                  key={exp.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    exp.is_void ? 'bg-slate-50 opacity-60' : 'hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                      {exp.category[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4
                          className={`text-sm font-bold text-slate-900 truncate ${
                            exp.is_void ? 'line-through text-slate-400' : ''
                          }`}
                        >
                          {exp.description}
                        </h4>
                        {exp.is_void && (
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                            VOID
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Paid by <strong className="text-slate-800">{exp.payer_name}</strong> • {formatDate(exp.date)}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                          {exp.split_method} Split
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {exp.splits.length} participants: {exp.splits.map((s) => `${s.user_name} (${formatPaise(s.amount_paise)})`).join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 flex-shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                    <span className="text-base font-bold font-mono text-slate-900">
                      {formatPaise(exp.amount_paise, exp.currency)}
                    </span>
                    {!exp.is_void && (
                      <button
                        onClick={() => handleVoidExpense(exp.id)}
                        className="text-[11px] text-rose-500 hover:text-rose-700 flex items-center gap-1 font-medium"
                        title="Void Expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
          {/* Member Net Balances Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                  Rider Net Balances
                </h3>
                <p className="text-xs text-slate-500">
                  Calculated using ONNA-GO zero-sum conservation invariant
                </p>
              </div>
              <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-1.5 border border-emerald-200">
                <Check className="w-3.5 h-3.5" />
                <span>Sum Equals Exactly 0</span>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {balances?.balances.map((item) => (
                <div key={item.user_id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-orange-400 text-white font-bold flex items-center justify-center text-xs">
                      {item.user_name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{item.user_name}</p>
                      <p className="text-xs text-slate-400">
                        Paid {formatPaise(item.total_spent_paise)} • Share {formatPaise(item.total_share_paise)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p
                      className={`text-base font-bold font-mono ${
                        item.net_balance_paise > 0
                          ? 'text-emerald-600'
                          : item.net_balance_paise < 0
                          ? 'text-amber-600'
                          : 'text-slate-500'
                      }`}
                    >
                      {item.net_balance_paise > 0
                        ? `+${formatPaise(item.net_balance_paise)}`
                        : formatPaise(item.net_balance_paise)}
                    </p>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        item.status === 'IS_OWED'
                          ? 'bg-emerald-50 text-emerald-700'
                          : item.status === 'OWES'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
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
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-['Plus_Jakarta_Sans']">
                    Optimal Debt Simplification Suggestions
                  </h3>
                  <p className="text-xs text-slate-400">
                    Minimum transactions required to fully settle all group debts
                  </p>
                </div>
              </div>
            </div>

            {suggestions.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-800/60 rounded-xl">
                Everyone in this trip is completely settled up!
              </div>
            ) : (
              <div className="space-y-3">
                {suggestions.map((sug, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                        #{idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">
                          <strong className="text-amber-400">{sug.from_user_name}</strong> pays{' '}
                          <strong className="text-emerald-400">{sug.to_user_name}</strong>
                        </p>
                        <p className="text-xs text-slate-400">Direct payment via UPI / Cash</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <span className="text-lg font-bold font-mono text-cyan-400">
                        {formatPaise(sug.amount_paise)}
                      </span>
                      <button
                        onClick={() => handleTriggerSuggestion(sug)}
                        className="px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md transition-all active:scale-95"
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
            <h3 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
              Settlement Records & Verification Lifecycle
            </h3>
            <button
              onClick={() => {
                setSettlePayer(undefined);
                setSettlePayee(undefined);
                setSettleAmount(undefined);
                setIsRecordSettlementOpen(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
            >
              Record Payment
            </button>
          </div>

          {settlements.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center text-xs text-slate-500">
              No settlement payments recorded yet.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 shadow-sm overflow-hidden">
              {settlements.map((st) => (
                <div key={st.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {st.payer_name} ➔ {st.payee_name}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          st.status === 'CONFIRMED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : st.status === 'DISPUTED'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {st.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Mode: {st.payment_method} {st.reference_id ? `• Ref: ${st.reference_id}` : ''} • {formatDate(st.created_at)}
                    </p>
                    {st.notes && <p className="text-xs text-slate-400 mt-1 italic">"{st.notes}"</p>}
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                    <span className="text-base font-bold font-mono text-slate-900">
                      {formatPaise(st.amount_paise)}
                    </span>

                    {/* Status Actions */}
                    {st.status === 'PENDING_CONFIRMATION' && (
                      <div className="flex items-center gap-2">
                        {user?.id === st.payee_id && (
                          <button
                            onClick={() => handleConfirmSettlement(st.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg"
                          >
                            Confirm Receipt
                          </button>
                        )}
                        <button
                          onClick={() => handleDisputeSettlement(st.id)}
                          className="px-2 py-1 text-slate-500 hover:text-rose-600 text-[11px] font-medium"
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
              <h3 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                Trip Activities & Stops
              </h3>
              <p className="text-xs text-slate-500">Group bike rides, dinners, bonfire hangouts</p>
            </div>
          </div>

          {activities.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center text-xs text-slate-500">
              No activities created for this trip yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activities.map((a) => (
                <div key={a.id} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
                  <h4 className="text-base font-bold text-slate-900">{a.name}</h4>
                  {a.location && (
                    <p className="text-xs text-slate-600 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-orange-500" />
                      <span>{a.location}</span>
                    </p>
                  )}
                  {a.description && <p className="text-xs text-slate-500">{a.description}</p>}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">{a.participants_count} participants</span>
                    <span className="font-mono font-bold text-indigo-600">{formatPaise(a.total_expenses_paise)}</span>
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
          <h3 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
            Budget Tracking & Threshold Warnings
          </h3>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm font-bold mb-1.5">
                <span>Trip Budget Consumption</span>
                <span className="font-mono text-indigo-600">
                  {formatPaise(trip.total_expenses_paise)} / {trip.budget_paise ? formatPaise(trip.budget_paise) : 'No Budget Set'}
                </span>
              </div>
              {trip.budget_paise && (
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      trip.total_expenses_paise > trip.budget_paise
                        ? 'bg-rose-500'
                        : trip.total_expenses_paise / trip.budget_paise >= 0.8
                        ? 'bg-amber-500'
                        : 'bg-indigo-600'
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
              <h3 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                Financial Reports & Export
              </h3>
              <p className="text-xs text-slate-500">
                Formula injection-protected CSV and PDF reports
              </p>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`/api/v1/reports/trip/${trip.id}/export/csv`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Export CSV</span>
              </a>

              <a
                href={`/api/v1/reports/trip/${trip.id}/export/pdf`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span>Export PDF</span>
              </a>
            </div>
          </div>

          {/* Category Spending Breakdown */}
          {report && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <h4 className="text-sm font-bold text-slate-900">Category Spending Distribution</h4>
              <div className="space-y-3">
                {report.category_breakdown.map((cat) => (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">{cat.category}</span>
                      <span className="font-mono text-slate-600">
                        {formatPaise(cat.amount_paise)} ({cat.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full"
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
        <div className="space-y-4">
          <h3 className="text-base font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
            Trip Members ({members.length})
          </h3>
          <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 shadow-sm overflow-hidden">
            {members.map((m) => (
              <div key={m.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
                    {m.user_name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{m.user_name}</p>
                    <p className="text-xs text-slate-400">{m.user_email}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                  {m.role}
                </span>
              </div>
            ))}
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
