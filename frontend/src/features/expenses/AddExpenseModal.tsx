import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  AlertCircle,
  Upload,
  ChevronDown,
  ChevronUp,
  Utensils,
  Fuel,
  Car,
  Bed,
  Ticket,
  Tag,
  Calendar,
  Users,
  ShoppingBag,
  Compass,
  UserCheck,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { TripMember, Activity, Expense } from '@/types';
import { formatPaise, rupeesToPaise, getCurrencySymbol } from '@/lib/currency';
import { useAuth } from '@/features/auth/AuthContext';
import { BlueTick } from '@/components/common/BlueTick';
import { useFeedback } from '@/context/FeedbackContext';
import { playSound } from '@/lib/sounds';
import { queueExpenseCreation, queueExpenseUpdate, isDeviceOnline } from '@/lib/sync-manager';
import { suggestCategoryFromTitle } from '@/lib/add-expense-coordinator';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  currency: string;
  members: TripMember[];
  activities: Activity[];
  onExpenseAdded: (exp: Expense) => void;
  initialExpense?: Expense | null;
  onExpenseUpdated?: (exp: Expense) => void;
}

const CATEGORIES = [
  { name: 'Food', icon: Utensils },
  { name: 'Petrol / Fuel', icon: Fuel },
  { name: 'Transport', icon: Car },
  { name: 'Accommodation', icon: Bed },
  { name: 'Activities', icon: Compass },
  { name: 'Shopping', icon: ShoppingBag },
  { name: 'Tickets', icon: Ticket },
  { name: 'Miscellaneous', icon: Tag },
];

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  tripId,
  currency,
  members,
  activities,
  onExpenseAdded,
  initialExpense,
  onExpenseUpdated,
}) => {
  const { user } = useAuth();
  const { showConfirmation } = useFeedback();

  // Core essential fields
  const [amountRupees, setAmountRupees] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Food');
  const [hasManuallySelectedCategory, setHasManuallySelectedCategory] = useState(false);
  const [payerId, setPayerId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Two Split Methods: Method A (Equal among all) or Method B (Selected members)
  const [splitMode, setSplitMode] = useState<'EQUAL_ALL' | 'SELECTED_MEMBERS'>('EQUAL_ALL');
  const [selectedParticipants, setSelectedParticipants] = useState<Record<string, boolean>>({});

  // Optional collapsed fields
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [notes, setNotes] = useState('');
  const [activityId, setActivityId] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // Advanced splits (Exact, Percentage, Parts)
  const [advancedSplitMethod, setAdvancedSplitMethod] = useState<'NONE' | 'EXACT' | 'PERCENTAGE' | 'CUSTOM'>('NONE');
  const [exactShares, setExactShares] = useState<Record<string, string>>({});
  const [percentageShares, setPercentageShares] = useState<Record<string, string>>({});
  const [customShares, setCustomShares] = useState<Record<string, string>>({});

  // Submission state
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currencySymbol = getCurrencySymbol(currency);

  // Initialize defaults when modal opens, members change, or initialExpense changes
  useEffect(() => {
    if (initialExpense) {
      setAmountRupees((initialExpense.amount_paise / 100).toString());
      setDescription(initialExpense.description);
      setCategory(initialExpense.category || 'Food');
      setPayerId(initialExpense.payer_id);
      setDate(
        initialExpense.date
          ? new Date(initialExpense.date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0]
      );
      setNotes(initialExpense.notes || '');
      setActivityId(initialExpense.activity_id || '');

      const initSelected: Record<string, boolean> = {};
      const initExact: Record<string, string> = {};
      const initPct: Record<string, string> = {};
      const initCustom: Record<string, string> = {};

      const defaultPct = (100 / (members.length || 1)).toFixed(2);
      members.forEach((m) => {
        initSelected[m.user_id] = false;
        initExact[m.user_id] = '';
        initPct[m.user_id] = defaultPct;
        initCustom[m.user_id] = '1';
      });

      if (initialExpense.splits && initialExpense.splits.length > 0) {
        initialExpense.splits.forEach((s) => {
          initSelected[s.user_id] = true;
          if (s.amount_paise) initExact[s.user_id] = (s.amount_paise / 100).toString();
          if (s.percentage) initPct[s.user_id] = s.percentage.toString();
          if (s.shares) initCustom[s.user_id] = s.shares.toString();
        });
      } else {
        members.forEach((m) => (initSelected[m.user_id] = true));
      }

      setSelectedParticipants(initSelected);
      setExactShares(initExact);
      setPercentageShares(initPct);
      setCustomShares(initCustom);
      setSplitMode(
        initialExpense.splits && initialExpense.splits.length < members.length
          ? 'SELECTED_MEMBERS'
          : 'EQUAL_ALL'
      );
      setError(null);
      setSuccess(null);
    } else if (members.length > 0) {
      setAmountRupees('');
      setDescription('');
      setCategory('Food');
      setNotes('');
      setActivityId('');
      setDate(new Date().toISOString().split('T')[0]);

      const currentUserMember = members.find((m) => m.user_id === user?.id);
      setPayerId(currentUserMember ? currentUserMember.user_id : members[0].user_id);

      const initSelected: Record<string, boolean> = {};
      const initExact: Record<string, string> = {};
      const initPct: Record<string, string> = {};
      const initCustom: Record<string, string> = {};

      const defaultPct = (100 / members.length).toFixed(2);
      members.forEach((m) => {
        initSelected[m.user_id] = true;
        initExact[m.user_id] = '';
        initPct[m.user_id] = defaultPct;
        initCustom[m.user_id] = '1';
      });

      setSelectedParticipants(initSelected);
      setExactShares(initExact);
      setPercentageShares(initPct);
      setCustomShares(initCustom);
      setSplitMode('EQUAL_ALL');
      setError(null);
      setSuccess(null);
    }
  }, [members, user?.id, isOpen, initialExpense]);

  if (!isOpen) return null;

  const totalPaise = rupeesToPaise(amountRupees || 0);

  // Active participants list
  const activeParticipantIds =
    splitMode === 'EQUAL_ALL'
      ? members.map((m) => m.user_id)
      : Object.keys(selectedParticipants).filter((uid) => selectedParticipants[uid]);

  const participantCount = activeParticipantIds.length;

  // Split calculation per person
  const perPersonPaise =
    totalPaise > 0 && participantCount > 0 ? Math.floor(totalPaise / participantCount) : 0;
  const remainderPaise =
    totalPaise > 0 && participantCount > 0 ? totalPaise % participantCount : 0;

  const handleSelectAll = (selectAll: boolean) => {
    const updated: Record<string, boolean> = {};
    members.forEach((m) => {
      updated[m.user_id] = selectAll;
    });
    setSelectedParticipants(updated);
  };

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setError(null);
    setSuccess(null);

    if (totalPaise <= 0) {
      setError('Please enter a valid expense amount greater than 0.');
      return;
    }

    if (!description.trim()) {
      setError('Please enter an expense title.');
      return;
    }

    if (!payerId) {
      setError('Please select who paid for this expense.');
      return;
    }

    if (participantCount === 0) {
      setError('Please select at least one trip member to split with.');
      return;
    }

    // Build payload
    let splitMethodPayload = 'EQUAL';
    let payloadParticipantIds: string[] = activeParticipantIds;
    let payloadSplits: any[] = [];

    if (advancedSplitMethod === 'EXACT') {
      splitMethodPayload = 'EXACT';
      const sumPaise = members.reduce(
        (acc, m) => acc + rupeesToPaise(exactShares[m.user_id] || 0),
        0
      );
      if (sumPaise !== totalPaise) {
        setError(
          `Sum of shares (${formatPaise(sumPaise, currency)}) must equal total amount (${formatPaise(
            totalPaise,
            currency
          )}).`
        );
        return;
      }
      payloadSplits = members.map((m) => ({
        user_id: m.user_id,
        amount_paise: rupeesToPaise(exactShares[m.user_id] || 0),
      }));
    } else if (advancedSplitMethod === 'PERCENTAGE') {
      splitMethodPayload = 'PERCENTAGE';
      const sumPct = members.reduce(
        (acc, m) => acc + parseFloat(percentageShares[m.user_id] || '0'),
        0
      );
      if (Math.abs(sumPct - 100.0) > 0.1) {
        setError(`Percentages must sum to 100.0%. Current sum: ${sumPct.toFixed(1)}%.`);
        return;
      }
      payloadSplits = members.map((m) => ({
        user_id: m.user_id,
        percentage: parseFloat(percentageShares[m.user_id] || '0'),
      }));
    } else if (advancedSplitMethod === 'CUSTOM') {
      splitMethodPayload = 'CUSTOM';
      payloadSplits = members.map((m) => ({
        user_id: m.user_id,
        shares: parseFloat(customShares[m.user_id] || '1'),
      }));
    } else {
      // Standard Equal or Selected-Member split
      splitMethodPayload = splitMode === 'EQUAL_ALL' ? 'EQUAL' : 'SELECTED';
    }

    setLoading(true);
    try {
      const expensePayload = {
        trip_id: tripId,
        activity_id: activityId || null,
        payer_id: payerId,
        description: description.trim(),
        amount_paise: totalPaise,
        currency,
        category,
        split_method: splitMethodPayload,
        date: new Date(date).toISOString(),
        notes: notes.trim() || null,
        participant_ids: payloadParticipantIds,
        splits: payloadSplits.length > 0 ? payloadSplits : undefined,
      };

      const payerObj = members.find((m) => m.user_id === payerId);

      // --- EDIT EXISTING EXPENSE ---
      if (initialExpense) {
        let updated: Expense;
        if (!isDeviceOnline()) {
          updated = await queueExpenseUpdate(tripId, initialExpense.id, expensePayload, initialExpense);
          setSuccess('Updated offline. Waiting to sync.');
          showConfirmation({
            title: 'Updated offline ⏳',
            message: `${description} (${formatPaise(totalPaise, currency)}) updated locally and will sync when online.`,
            sound: 'expense_success',
          });
        } else {
          try {
            updated = await api.put<Expense>(`/expenses/${initialExpense.id}`, expensePayload);
            setSuccess('Expense updated successfully.');
            showConfirmation({
              title: 'Expense updated successfully',
              message: `${description} (${formatPaise(totalPaise, currency)}) updated.`,
              sound: 'expense_success',
            });
          } catch (apiErr: any) {
            if (!window.navigator.onLine || apiErr?.message?.includes('fetch') || apiErr?.message?.includes('Network')) {
              updated = await queueExpenseUpdate(tripId, initialExpense.id, expensePayload, initialExpense);
              setSuccess('Network unavailable. Updated offline.');
              showConfirmation({
                title: 'Updated offline ⏳',
                message: `${description} (${formatPaise(totalPaise, currency)}) updated locally.`,
                sound: 'expense_success',
              });
            } else {
              throw apiErr;
            }
          }
        }

        if (onExpenseUpdated) {
          onExpenseUpdated(updated);
        } else {
          onExpenseAdded(updated);
        }
        setTimeout(() => {
          onClose();
        }, 600);
        return;
      }

      // --- CREATE NEW EXPENSE ---
      let created: Expense;
      if (!isDeviceOnline()) {
        created = await queueExpenseCreation(tripId, expensePayload, payerObj?.user_name || 'You');
        setSuccess('Saved offline. Waiting to sync.');
        showConfirmation({
          title: 'Saved offline ⏳',
          message: `${description} (${formatPaise(totalPaise, currency)}) will sync when you are back online.`,
          sound: 'expense_success',
        });
      } else {
        try {
          created = await api.post<Expense>('/expenses/', expensePayload);

          // Optional receipt upload
          if (receiptFile) {
            try {
              await api.uploadFile(`/receipts/upload/${created.id}`, receiptFile);
            } catch {
              // Non-fatal
            }
          }

          setSuccess('Expense recorded successfully.');
          showConfirmation({
            title: 'Expense recorded successfully',
            message: `${description} (${formatPaise(totalPaise, currency)}) split with ${participantCount} member(s).`,
            sound: 'expense_success',
          });
        } catch (apiErr: any) {
          // If offline or network drop occurred during fetch
          if (!window.navigator.onLine || apiErr?.message?.includes('fetch') || apiErr?.message?.includes('Network')) {
            created = await queueExpenseCreation(tripId, expensePayload, payerObj?.user_name || 'You');
            setSuccess('Network unavailable. Saved offline.');
            showConfirmation({
              title: 'Saved offline ⏳',
              message: `${description} (${formatPaise(totalPaise, currency)}) queued in outbox.`,
              sound: 'expense_success',
            });
          } else {
            throw apiErr;
          }
        }
      }

      onExpenseAdded(created);
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err: any) {
      playSound('error');
      setError(err.message || 'Failed to record expense.');
    } finally {
      setLoading(false);
    }
  };

  const handleDescriptionChange = (val: string) => {
    setDescription(val);
    if (!hasManuallySelectedCategory && !initialExpense) {
      const suggested = suggestCategoryFromTitle(val);
      if (suggested) {
        setCategory(suggested);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60">
      <div className="bg-white dark:bg-[#141416] text-[#18181B] dark:text-[#F5F5F7] rounded-t-2xl sm:rounded-2xl border-t sm:border border-[#E4E4E7] dark:border-[#2A2A2E] shadow-2xl max-w-lg w-full p-5 sm:p-7 relative max-h-[90vh] sm:max-h-[92vh] overflow-y-auto">
        {/* Mobile handle indicator */}
        <div className="sm:hidden w-12 h-1 bg-[#E4E4E7] dark:bg-[#2A2A2E] rounded-full mx-auto mb-4" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E4E4E7] dark:border-[#2A2A2E]">
          <h2 className="text-base sm:text-lg font-bold tracking-tight">
            {initialExpense ? 'Edit expense' : 'Add expense'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-[#F5F5F7] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Banner */}
        {success && (
          <div className="mt-4 p-3 rounded-xl bg-[#DDF5E5] dark:bg-[#16834A]/15 border border-[#BCEAC8] dark:border-[#22C55E]/30 text-[#16834A] dark:text-[#4ADE80] text-xs font-semibold flex items-center gap-2.5">
            <BlueTick size="sm" animate={true} />
            <span>{success}</span>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-[#FFE4E6] dark:bg-[#E11D48]/10 border border-[#FDA4AF] dark:border-[#E11D48]/30 text-[#DC2626] dark:text-[#EF4444] text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* 1. AMOUNT-FIRST (LARGE NUMERIC KEYPAD) */}
          <div className="bg-[#FAFAF8] dark:bg-[#1B1B1E] border border-[#E4E4E7] dark:border-[#2A2A2E] rounded-2xl p-5 text-center flex flex-col items-center justify-center">
            <label htmlFor="expense-amount" className="text-xs font-medium text-[#71717A] dark:text-[#A1A1AA] mb-1">
              Amount
            </label>
            <div className="flex items-baseline justify-center">
              <span className="text-3xl sm:text-4xl font-bold font-mono text-[#737373] dark:text-[#8E8E93] mr-2 select-none">
                {currencySymbol}
              </span>
              <input
                id="expense-amount"
                type="number"
                step="any"
                min="0.01"
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                required
                autoFocus
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                placeholder="0.00"
                className="w-44 sm:w-56 text-3xl sm:text-4xl font-bold font-mono text-[#18181B] dark:text-[#F5F5F7] bg-transparent border-none focus:outline-none tabular-nums text-left placeholder-[#D4D4D8] dark:placeholder-[#52525B]"
              />
            </div>
            {totalPaise > 0 && participantCount > 0 && advancedSplitMethod === 'NONE' && (
              <p className="mt-2 text-xs font-medium text-[#18181B] dark:text-[#F5F5F7] bg-[#F4F4F5] dark:bg-[#222226] border border-[#E4E4E7] dark:border-[#2A2A2E] px-3 py-1 rounded-full">
                Each participant owes {formatPaise(perPersonPaise, currency)}{' '}
                <span className="text-[#71717A] dark:text-[#A1A1AA]">
                  ({participantCount} {participantCount === 1 ? 'member' : 'members'})
                </span>
                {remainderPaise > 0 && (
                  <span className="ml-1 text-[10px] text-[#71717A] dark:text-[#A1A1AA] font-mono">
                    (+1p adjusted)
                  </span>
                )}
              </p>
            )}
          </div>

          {/* 2. DESCRIPTION & SMART CATEGORY */}
          <div className="space-y-3">
            <div>
              <label htmlFor="expense-title" className="block text-xs font-semibold text-[#71717A] dark:text-[#A1A1AA] mb-1.5">
                Description
              </label>
              <input
                id="expense-title"
                type="text"
                required
                value={description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder="e.g. Petrol refill, Highway dhaba, Resort stay"
                className="w-full bg-[#FAFAF8] dark:bg-[#1B1B1E] border border-[#E4E4E7] dark:border-[#2A2A2E] rounded-xl px-3.5 py-2.5 text-sm text-[#18181B] dark:text-[#F5F5F7] placeholder-[#A1A1AA] dark:placeholder-[#71717A] focus:outline-none focus:border-[#16834A] dark:focus:border-[#22C55E] transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#71717A] dark:text-[#A1A1AA]">
                  Category
                </label>
                <span className="text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
                  {category}
                </span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.name;
                  return (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => {
                        setHasManuallySelectedCategory(true);
                        setCategory(cat.name);
                      }}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border text-[11px] font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#16834A] dark:bg-[#22C55E] text-white dark:text-[#0B0B0C] border-[#16834A] dark:border-[#22C55E] shadow-xs'
                          : 'bg-white dark:bg-[#1B1B1E] hover:bg-[#FAFAF8] dark:hover:bg-[#222226] text-[#71717A] dark:text-[#A1A1AA] border-[#E4E4E7] dark:border-[#2A2A2E]'
                      }`}
                      title={cat.name}
                    >
                      <Icon className="w-4 h-4 mb-1" />
                      <span className="truncate max-w-full text-[10px]">{cat.name.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. PAID BY & DATE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="payer-select" className="block text-xs font-semibold text-[#71717A] dark:text-[#A1A1AA] mb-1.5">
                Paid by
              </label>
              <select
                id="payer-select"
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                className="w-full bg-[#FAFAF8] dark:bg-[#1B1B1E] border border-[#E4E4E7] dark:border-[#2A2A2E] rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-[#18181B] dark:text-[#F5F5F7] focus:outline-none focus:border-[#16834A] dark:focus:border-[#22C55E] transition-colors"
              >
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id} className="dark:bg-[#1B1B1E] dark:text-[#F5F5F7]">
                    {m.user_name} {m.user_id === user?.id ? '(You)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="expense-date" className="block text-xs font-semibold text-[#737373] dark:text-[#8E8E93] mb-1.5">
                Date
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#A3A3A3] pointer-events-none" />
                <input
                  id="expense-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-[#FAFAF8] dark:bg-[#1B1B1E] border border-[#E4E4E7] dark:border-[#2A2A2E] rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-[#18181B] dark:text-[#F5F5F7] focus:outline-none focus:border-[#16834A] dark:focus:border-[#22C55E] transition-colors"
                />
              </div>
            </div>
          </div>

          {/* 4. SPLIT METHOD */}
          <div>
            <label className="block text-xs font-semibold text-[#71717A] dark:text-[#A1A1AA] mb-2">
              Split
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#F4F4F5] dark:bg-[#1B1B1E] rounded-xl border border-[#E4E4E7] dark:border-[#2A2A2E]">
              <button
                type="button"
                onClick={() => {
                  setSplitMode('EQUAL_ALL');
                  handleSelectAll(true);
                  setAdvancedSplitMethod('NONE');
                }}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  splitMode === 'EQUAL_ALL' && advancedSplitMethod === 'NONE'
                    ? 'bg-white dark:bg-[#2A2A2E] text-[#18181B] dark:text-[#F5F5F7] shadow-xs'
                    : 'text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-[#F5F5F7]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Equal split</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSplitMode('SELECTED_MEMBERS');
                  setAdvancedSplitMethod('NONE');
                }}
                className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  splitMode === 'SELECTED_MEMBERS' && advancedSplitMethod === 'NONE'
                    ? 'bg-white dark:bg-[#2A2A2E] text-[#18181B] dark:text-[#F5F5F7] shadow-xs'
                    : 'text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-[#F5F5F7]'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Selected members</span>
              </button>
            </div>

            {/* Split description helper */}
            <p className="text-[11px] text-[#71717A] dark:text-[#A1A1AA] mt-2">
              {splitMode === 'EQUAL_ALL'
                ? `Expense is divided equally among all ${members.length} trip members.`
                : 'Choose which trip members participated. Payer can be included or excluded.'}
            </p>
          </div>

          {/* 5. PARTICIPANTS SELECTION (When Selected Members mode is active) */}
          {splitMode === 'SELECTED_MEMBERS' && advancedSplitMethod === 'NONE' && (
            <div className="bg-[#FAFAF8] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#2A2A2E] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#18181B] dark:text-[#F5F5F7]">
                  Select participants ({participantCount} of {members.length})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAll(true)}
                    className="text-[#16834A] dark:text-[#22C55E] font-medium hover:underline cursor-pointer"
                  >
                    Select all
                  </button>
                  <span className="text-[#A1A1AA]">•</span>
                  <button
                    type="button"
                    onClick={() => handleSelectAll(false)}
                    className="text-[#71717A] dark:text-[#A1A1AA] hover:underline cursor-pointer"
                  >
                    Clear all
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {members.map((m) => {
                  const isSelected = Boolean(selectedParticipants[m.user_id]);
                  const isPayer = m.user_id === payerId;
                  return (
                    <button
                      key={m.user_id}
                      type="button"
                      onClick={() => toggleParticipant(m.user_id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-left text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-white dark:bg-[#222226] border-[#16834A] dark:border-[#22C55E] text-[#18181B] dark:text-[#F5F5F7]'
                          : 'bg-[#F4F4F5]/60 dark:bg-[#1B1B1E] border-transparent text-[#71717A] dark:text-[#A1A1AA] hover:bg-white dark:hover:bg-[#222226]'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div
                          className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] ${
                            isSelected
                              ? 'bg-[#16834A] dark:bg-[#22C55E] text-white dark:text-[#0B0B0C]'
                              : 'bg-[#E4E4E7] dark:bg-[#2A2A2E] text-[#71717A] dark:text-[#A1A1AA]'
                          }`}
                        >
                          {m.user_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate min-w-0">
                          <p className="font-semibold truncate">
                            {m.user_name} {m.user_id === user?.id ? '(You)' : ''}
                          </p>
                          {isPayer && (
                            <span className="text-[10px] text-[#16834A] dark:text-[#22C55E] font-medium">
                              Payer
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-1.5 shrink-0">
                        {isSelected && totalPaise > 0 && participantCount > 0 && (
                          <span className="text-[11px] font-mono font-medium text-[#16834A] dark:text-[#22C55E]">
                            {formatPaise(perPersonPaise, currency)}
                          </span>
                        )}
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border ${
                            isSelected
                              ? 'bg-[#16834A] dark:bg-[#22C55E] border-[#16834A] dark:border-[#22C55E] text-white dark:text-[#0B0B0C]'
                              : 'border-[#D4D4D8] dark:border-[#3F3F46] bg-white dark:bg-[#1B1B1E]'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Payer exclusion indicator */}
              {!selectedParticipants[payerId] && (
                <div className="p-2.5 rounded-xl bg-[#FEF3C7] dark:bg-[#B45309]/15 border border-[#FDE68A] dark:border-[#B45309]/30 text-[#92400E] dark:text-[#FBBF24] text-[11px] flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Payer ({members.find((m) => m.user_id === payerId)?.user_name || 'Member'}) is excluded and will be reimbursed the full expense amount.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 6. OPTIONAL COLLAPSIBLE: NOTES & RECEIPT PHOTO */}
          <div className="border border-[#E4E4E7] dark:border-[#2A2A2E] rounded-2xl overflow-hidden bg-white dark:bg-[#141416]">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between p-3.5 text-xs font-medium text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-[#F5F5F7] bg-[#FAFAF8] dark:bg-[#18181B] transition-colors cursor-pointer"
            >
              <span>Additional options (Notes, receipt photo, custom ratios)</span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAdvanced && (
              <div className="p-4 space-y-4 border-t border-[#E4E4E7] dark:border-[#2A2A2E]">
                {/* Notes */}
                <div>
                  <label htmlFor="expense-notes" className="block text-xs font-semibold text-[#71717A] dark:text-[#A1A1AA] mb-1">
                    Notes
                  </label>
                  <textarea
                    id="expense-notes"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes or breakdown"
                    className="w-full bg-[#FAFAF8] dark:bg-[#1B1B1E] border border-[#E4E4E7] dark:border-[#2A2A2E] rounded-xl p-2.5 text-xs text-[#18181B] dark:text-[#F5F5F7] focus:outline-none focus:border-[#16834A] dark:focus:border-[#22C55E] transition-colors"
                  />
                </div>

                {/* Receipt Upload */}
                <div>
                  <label className="block text-xs font-semibold text-[#71717A] dark:text-[#A1A1AA] mb-1">
                    Receipt photo
                  </label>
                  <label className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-[#E4E4E7] dark:border-[#2A2A2E] bg-[#FAFAF8] dark:bg-[#1B1B1E] hover:bg-white dark:hover:bg-[#222226] text-xs text-[#71717A] dark:text-[#A1A1AA] cursor-pointer transition-colors">
                    <Upload className="w-4 h-4 text-[#A1A1AA]" />
                    <span>{receiptFile ? receiptFile.name : 'Choose receipt image (JPG, PNG, PDF)'}</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* PRIMARY SUBMIT BUTTON */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || Boolean(success)}
              className="w-full flex items-center justify-center gap-2 bg-[#16834A] dark:bg-[#22C55E] hover:bg-[#136F3F] dark:hover:bg-[#16A34A] text-white dark:text-[#0A0A0A] font-medium py-3 px-6 rounded-xl shadow-xs active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer text-sm"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{initialExpense ? 'Saving changes...' : 'Recording expense...'}</span>
                </>
              ) : success ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>{initialExpense ? 'Changes saved' : 'Expense saved'}</span>
                </>
              ) : (
                <span>{initialExpense ? 'Save changes' : 'Record expense'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
