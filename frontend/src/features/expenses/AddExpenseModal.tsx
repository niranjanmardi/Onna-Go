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
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { TripMember, Activity, Expense } from '@/types';
import { formatPaise, rupeesToPaise, getCurrencySymbol } from '@/lib/currency';
import { useAuth } from '@/features/auth/AuthContext';
import { BlueTick } from '@/components/common/BlueTick';
import { useFeedback } from '@/context/FeedbackContext';
import { playSound } from '@/lib/sounds';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  currency: string;
  members: TripMember[];
  activities: Activity[];
  onExpenseAdded: (exp: Expense) => void;
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
}) => {
  const { user } = useAuth();
  const { showConfirmation } = useFeedback();

  // Core essential fields
  const [amountRupees, setAmountRupees] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Food');
  const [payerId, setPayerId] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<Record<string, boolean>>({});

  // Optional collapsed fields
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [activityId, setActivityId] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // Advanced split methods (preserved for power users)
  const [splitMethod, setSplitMethod] = useState<'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'CUSTOM'>('EQUAL');
  const [exactShares, setExactShares] = useState<Record<string, string>>({});
  const [percentageShares, setPercentageShares] = useState<Record<string, string>>({});
  const [customShares, setCustomShares] = useState<Record<string, string>>({});

  // Submission state
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currencySymbol = getCurrencySymbol(currency);

  // Initialize defaults when modal opens or members change
  useEffect(() => {
    if (members.length > 0) {
      // Default payer to current user if a member, otherwise first member
      const currentUserMember = members.find((m) => m.user_id === user?.id);
      setPayerId(currentUserMember ? currentUserMember.user_id : members[0].user_id);

      // Select all participants by default
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
    }
  }, [members, user?.id, isOpen]);

  if (!isOpen) return null;

  const totalPaise = rupeesToPaise(amountRupees || 0);
  const activeEqualParticipants = Object.keys(selectedParticipants).filter(
    (uid) => selectedParticipants[uid]
  );
  const participantCount = activeEqualParticipants.length;

  // Split preview per person for Equal split
  const perPersonPaise =
    totalPaise > 0 && participantCount > 0 ? Math.floor(totalPaise / participantCount) : 0;

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
    if (loading) return; // Prevent duplicate submission

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

    // Build splits payload based on method
    let payloadParticipantIds: string[] = [];
    let payloadSplits: any[] = [];

    if (splitMethod === 'EQUAL') {
      if (participantCount === 0) {
        setError('Please select at least one group member to split with.');
        return;
      }
      payloadParticipantIds = activeEqualParticipants;
    } else if (splitMethod === 'EXACT') {
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
    } else if (splitMethod === 'PERCENTAGE') {
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
    } else if (splitMethod === 'CUSTOM') {
      payloadSplits = members.map((m) => ({
        user_id: m.user_id,
        shares: parseFloat(customShares[m.user_id] || '1'),
      }));
    }

    setLoading(true);
    try {
      const created = await api.post<Expense>('/expenses/', {
        trip_id: tripId,
        activity_id: activityId || null,
        payer_id: payerId,
        description: description.trim(),
        amount_paise: totalPaise,
        currency,
        category,
        split_method: splitMethod,
        date: new Date(date).toISOString(),
        notes: notes.trim() || null,
        participant_ids: payloadParticipantIds,
        splits: payloadSplits,
      });

      // Optional receipt upload
      if (receiptFile) {
        try {
          await api.uploadFile(`/receipts/upload/${created.id}`, receiptFile);
        } catch {
          // Non-fatal if receipt fails
        }
      }

      setSuccess('Expense recorded successfully.');
      showConfirmation({
        title: 'Expense recorded successfully',
        message: `${description} (${currency}) split with participants.`,
        sound: 'expense_success',
      });
      onExpenseAdded(created);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      playSound('error');
      setError(err.message || 'Failed to record expense.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-[#E8E8E5] shadow-2xl max-w-lg w-full p-6 sm:p-7 relative max-h-[92vh] overflow-y-auto selection:bg-[#DDF5E5] selection:text-[#16834A]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E8E8E5]">
          <div>
            <h2 className="text-lg font-bold text-[#171717] font-['Plus_Jakarta_Sans']">
              Add Expense
            </h2>
            <p className="text-xs text-[#737373] mt-0.5">Record a group expense and split with friends</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#737373] hover:text-[#171717] rounded-lg hover:bg-[#F4F4F2] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Banner with Blue Tick */}
        {success && (
          <div className="mt-4 p-3 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#1E40AF] text-xs font-semibold flex items-center gap-2.5">
            <BlueTick size="sm" animate={true} />
            <span>{success}</span>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-[#FFE4E6] border border-[#FDA4AF] text-[#E11D48] text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {/* 1. VISUAL FOCUS: LARGE AMOUNT INPUT */}
          <div className="bg-[#FAFAF8] border border-[#E8E8E5] rounded-2xl p-5 text-center flex flex-col items-center justify-center">
            <label htmlFor="expense-amount" className="text-[11px] font-bold uppercase tracking-wider text-[#737373] mb-1">
              Amount
            </label>
            <div className="flex items-baseline justify-center">
              <span className="text-3xl sm:text-4xl font-bold font-mono text-[#737373] mr-2 select-none">
                {currencySymbol}
              </span>
              <input
                id="expense-amount"
                type="number"
                step="any"
                min="0.01"
                required
                autoFocus
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                placeholder="0.00"
                className="w-44 sm:w-56 text-3xl sm:text-4xl font-bold font-mono text-[#171717] bg-transparent border-none focus:outline-none tabular-nums text-left placeholder-[#D4D4D0]"
              />
            </div>
            {totalPaise > 0 && participantCount > 0 && splitMethod === 'EQUAL' && (
              <p className="mt-2 text-xs font-medium text-[#16834A] bg-[#DDF5E5] border border-[#C6ECCF] px-2.5 py-1 rounded-full">
                Each pays {formatPaise(perPersonPaise, currency)} ({participantCount} {participantCount === 1 ? 'person' : 'people'})
              </p>
            )}
          </div>

          {/* 2. EXPENSE TITLE */}
          <div>
            <label htmlFor="expense-title" className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1.5">
              Expense title
            </label>
            <input
              id="expense-title"
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Petrol, Hotel stay, Dinner, Museum tickets"
              className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3.5 py-2.5 text-sm text-[#171717] placeholder-[#A3A3A3] focus:outline-none focus:border-[#16834A] transition-colors"
            />
          </div>

          {/* 3. CATEGORY CHIPS */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1.5">
              Category
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.name;
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setCategory(cat.name)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#16834A] text-white border-[#16834A] shadow-xs'
                        : 'bg-white hover:bg-[#FAFAF8] text-[#737373] border-[#E8E8E5]'
                    }`}
                  >
                    <Icon className="w-4 h-4 mb-1" />
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. PAID BY */}
          <div>
            <label htmlFor="payer-select" className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1.5">
              Paid by
            </label>
            <select
              id="payer-select"
              value={payerId}
              onChange={(e) => setPayerId(e.target.value)}
              className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3.5 py-2.5 text-sm text-[#171717] focus:outline-none focus:border-[#16834A] transition-colors"
            >
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.user_name} {m.user_id === user?.id ? '(You)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 5. SPLIT BETWEEN GROUP MEMBERS */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373]">
                Split between
              </label>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleSelectAll(true)}
                  className="text-[#16834A] hover:underline font-semibold"
                >
                  Select all
                </button>
                <span className="text-[#A3A3A3]">•</span>
                <button
                  type="button"
                  onClick={() => handleSelectAll(false)}
                  className="text-[#737373] hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {members.map((m) => {
                const isSelected = Boolean(selectedParticipants[m.user_id]);
                return (
                  <button
                    key={m.user_id}
                    type="button"
                    onClick={() => toggleParticipant(m.user_id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#FAFAF8] border-[#16834A] text-[#171717]'
                        : 'bg-white border-[#E8E8E5] text-[#A3A3A3]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div
                        className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] ${
                          isSelected ? 'bg-[#16834A] text-white' : 'bg-[#F4F4F2] text-[#737373]'
                        }`}
                      >
                        {m.user_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium truncate">
                        {m.user_name} {m.user_id === user?.id ? '(You)' : ''}
                      </span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#16834A] flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6. OPTIONAL DETAILS COLLAPSIBLE */}
          <div className="border border-[#E8E8E5] rounded-2xl overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between p-3.5 text-xs font-semibold text-[#737373] hover:text-[#171717] bg-[#FAFAF8] transition-colors"
            >
              <span>Additional details (Date, Notes, Custom Split, Receipt)</span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAdvanced && (
              <div className="p-4 space-y-4 border-t border-[#E8E8E5]">
                {/* Date */}
                <div>
                  <label htmlFor="expense-date" className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1">
                    Date
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A3A3A3]">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <input
                      id="expense-date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl pl-9 pr-3 py-2 text-xs text-[#171717]"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label htmlFor="expense-notes" className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1">
                    Notes
                  </label>
                  <textarea
                    id="expense-notes"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional details or bill notes..."
                    className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl p-2.5 text-xs text-[#171717] placeholder-[#A3A3A3] focus:outline-none focus:border-[#16834A]"
                  />
                </div>

                {/* Custom Split Engines (Advanced Option) */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1.5">
                    Split calculation method
                  </label>
                  <div className="grid grid-cols-4 gap-1.5 p-1 bg-[#FAFAF8] rounded-xl border border-[#E8E8E5] text-[11px]">
                    {(['EQUAL', 'EXACT', 'PERCENTAGE', 'CUSTOM'] as const).map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setSplitMethod(method)}
                        className={`py-1.5 rounded-lg font-medium transition-all ${
                          splitMethod === method
                            ? 'bg-white text-[#171717] shadow-xs'
                            : 'text-[#737373] hover:text-[#171717]'
                        }`}
                      >
                        {method === 'EQUAL' && 'Equal'}
                        {method === 'EXACT' && 'Exact'}
                        {method === 'PERCENTAGE' && 'Percent'}
                        {method === 'CUSTOM' && 'Parts'}
                      </button>
                    ))}
                  </div>

                  {splitMethod === 'EXACT' && (
                    <div className="mt-3 space-y-2">
                      {members.map((m) => (
                        <div key={m.user_id} className="flex items-center justify-between gap-3 text-xs">
                          <span className="truncate">{m.user_name}</span>
                          <input
                            type="number"
                            step="any"
                            value={exactShares[m.user_id] || ''}
                            onChange={(e) => setExactShares({ ...exactShares, [m.user_id]: e.target.value })}
                            placeholder="0.00"
                            className="w-24 bg-[#FAFAF8] border border-[#E8E8E5] rounded-lg px-2 py-1 text-right font-mono"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {splitMethod === 'PERCENTAGE' && (
                    <div className="mt-3 space-y-2">
                      {members.map((m) => (
                        <div key={m.user_id} className="flex items-center justify-between gap-3 text-xs">
                          <span className="truncate">{m.user_name}</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="any"
                              value={percentageShares[m.user_id] || ''}
                              onChange={(e) => setPercentageShares({ ...percentageShares, [m.user_id]: e.target.value })}
                              placeholder="0"
                              className="w-16 bg-[#FAFAF8] border border-[#E8E8E5] rounded-lg px-2 py-1 text-right font-mono"
                            />
                            <span>%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {splitMethod === 'CUSTOM' && (
                    <div className="mt-3 space-y-2">
                      {members.map((m) => (
                        <div key={m.user_id} className="flex items-center justify-between gap-3 text-xs">
                          <span className="truncate">{m.user_name}</span>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={customShares[m.user_id] || '1'}
                            onChange={(e) => setCustomShares({ ...customShares, [m.user_id]: e.target.value })}
                            className="w-16 bg-[#FAFAF8] border border-[#E8E8E5] rounded-lg px-2 py-1 text-right font-mono"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Receipt Upload */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1">
                    Receipt photo
                  </label>
                  <label className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-[#E8E8E5] bg-[#FAFAF8] hover:bg-white text-xs text-[#737373] cursor-pointer transition-colors">
                    <Upload className="w-4 h-4 text-[#A3A3A3]" />
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

          {/* PRIMARY SUBMISSION BUTTON */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || Boolean(success)}
              className="w-full flex items-center justify-center gap-2 bg-[#16834A] hover:bg-[#136F3F] text-white font-semibold py-3 px-6 rounded-xl shadow-xs active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer text-sm"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving Expense...</span>
                </>
              ) : success ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Expense Saved</span>
                </>
              ) : (
                <span>Add Expense</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
