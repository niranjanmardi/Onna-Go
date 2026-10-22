import React, { useState, useEffect } from 'react';
import {
  X,
  Receipt,
  Coins,
  Calendar,
  Users,
  Check,
  AlertCircle,
  FileText,
  Upload,
  ArrowRight,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { TripMember, Activity, Expense } from '@/types';
import { formatPaise, rupeesToPaise } from '@/lib/currency';

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
  'Fuel',
  'Food',
  'Stay',
  'Transport',
  'Tickets',
  'Groceries',
  'Entertainment',
  'Shopping',
  'Other',
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
  const [description, setDescription] = useState('');
  const [amountRupees, setAmountRupees] = useState('');
  const [category, setCategory] = useState('Food');
  const [payerId, setPayerId] = useState('');
  const [activityId, setActivityId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [splitMethod, setSplitMethod] = useState<'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'CUSTOM'>('EQUAL');

  // Equal split: participant selections (all selected by default)
  const [selectedParticipants, setSelectedParticipants] = useState<Record<string, boolean>>({});

  // Exact split: rupee inputs
  const [exactShares, setExactShares] = useState<Record<string, string>>({});

  // Percentage split: percentage inputs
  const [percentageShares, setPercentageShares] = useState<Record<string, string>>({});

  // Custom split: shares inputs
  const [customShares, setCustomShares] = useState<Record<string, string>>({});

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (members.length > 0) {
      if (!payerId) setPayerId(members[0].user_id);
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
  }, [members]);

  if (!isOpen) return null;

  const totalPaise = rupeesToPaise(amountRupees || 0);

  // Participant IDs selected for equal split
  const activeEqualParticipants = Object.keys(selectedParticipants).filter(
    (uid) => selectedParticipants[uid]
  );
  const equalPerPersonPaise =
    activeEqualParticipants.length > 0 && totalPaise > 0
      ? Math.floor(totalPaise / activeEqualParticipants.length)
      : 0;
  const equalRemainder =
    activeEqualParticipants.length > 0 && totalPaise > 0
      ? totalPaise % activeEqualParticipants.length
      : 0;

  // Exact split sum validation
  const exactSumPaise = Object.values(exactShares).reduce(
    (acc, val) => acc + (val ? rupeesToPaise(val) : 0),
    0
  );
  const exactDiffPaise = totalPaise - exactSumPaise;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (totalPaise <= 0) {
      setError('Expense amount must be greater than 0.');
      return;
    }

    let payloadSplits: any = null;
    let payloadParticipantIds: string[] | null = null;

    if (splitMethod === 'EQUAL') {
      if (activeEqualParticipants.length === 0) {
        setError('At least one participant must be selected for the split.');
        return;
      }
      payloadParticipantIds = activeEqualParticipants;
    } else if (splitMethod === 'EXACT') {
      if (exactDiffPaise !== 0) {
        setError(
          `Exact shares do not match total expense. Difference is ${formatPaise(exactDiffPaise)}.`
        );
        return;
      }
      payloadSplits = members.map((m) => ({
        user_id: m.user_id,
        amount_paise: rupeesToPaise(exactShares[m.user_id] || 0),
      }));
    } else if (splitMethod === 'PERCENTAGE') {
      const sumPct = Object.values(percentageShares).reduce(
        (acc, val) => acc + (parseFloat(val) || 0),
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
        notes: notes || null,
        participant_ids: payloadParticipantIds,
        splits: payloadSplits,
      });

      // Upload receipt if selected
      if (receiptFile) {
        try {
          await api.uploadFile(`/receipts/upload/${created.id}`, receiptFile);
        } catch {
          // Non-fatal if receipt upload fails
        }
      }

      onExpenseAdded(created);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record expense.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 sm:p-7 relative max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-50 text-orange-600">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-['Plus_Jakarta_Sans']">
                Record Group Expense
              </h3>
              <p className="text-xs text-slate-500">Split costs fairly with ONNA-GO engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Description & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Description *
              </label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Highway Fuel, Dhaba Lunch, Resort Room"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Amount ({currency}) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono font-bold focus:outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Category & Payer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Paid By
              </label>
              <select
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:border-indigo-500 focus:bg-white"
              >
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.user_name} ({m.user_email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Optional Activity & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Link to Activity (Optional)
              </label>
              <select
                value={activityId}
                onChange={(e) => setActivityId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
              >
                <option value="">General Trip Expense</option>
                {activities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Split Method Selector Tabs */}
          <div className="pt-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
              Split Method
            </label>
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-xl">
              {(['EQUAL', 'EXACT', 'PERCENTAGE', 'CUSTOM'] as const).map((method) => (
                <button
                  type="button"
                  key={method}
                  onClick={() => setSplitMethod(method)}
                  className={`py-2 text-xs font-bold rounded-lg transition-all ${
                    splitMethod === method
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {method === 'EQUAL' && 'Equal'}
                  {method === 'EXACT' && 'Exact (₹)'}
                  {method === 'PERCENTAGE' && 'Percent (%)'}
                  {method === 'CUSTOM' && 'Custom Parts'}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Split Configuration Area */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            {splitMethod === 'EQUAL' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700">Select Participants:</span>
                  <span className="text-xs font-mono font-bold text-indigo-600">
                    {activeEqualParticipants.length} people • {formatPaise(equalPerPersonPaise)} each
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {members.map((m) => (
                    <label
                      key={m.user_id}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                        selectedParticipants[m.user_id]
                          ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900 font-semibold'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!!selectedParticipants[m.user_id]}
                        onChange={(e) =>
                          setSelectedParticipants({
                            ...selectedParticipants,
                            [m.user_id]: e.target.checked,
                          })
                        }
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="truncate">{m.user_name}</span>
                    </label>
                  ))}
                </div>
                {equalRemainder > 0 && (
                  <p className="text-[11px] text-amber-600 mt-2">
                    Note: Remainder of {equalRemainder} paise will be deterministically added +₹0.01 to the first {equalRemainder} riders.
                  </p>
                )}
              </div>
            )}

            {splitMethod === 'EXACT' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>Enter exact amounts:</span>
                  <span
                    className={`font-mono ${
                      exactDiffPaise === 0 ? 'text-emerald-600 font-bold' : 'text-rose-600'
                    }`}
                  >
                    Remaining: {formatPaise(exactDiffPaise)}
                  </span>
                </div>
                {members.map((m) => (
                  <div key={m.user_id} className="flex items-center justify-between gap-3 text-xs">
                    <span className="truncate font-medium text-slate-700 flex-1">{m.user_name}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={exactShares[m.user_id] || ''}
                      onChange={(e) =>
                        setExactShares({ ...exactShares, [m.user_id]: e.target.value })
                      }
                      placeholder="0.00"
                      className="w-28 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-right font-mono"
                    />
                  </div>
                ))}
              </div>
            )}

            {splitMethod === 'PERCENTAGE' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>Enter percentages (must total 100%):</span>
                </div>
                {members.map((m) => (
                  <div key={m.user_id} className="flex items-center justify-between gap-3 text-xs">
                    <span className="truncate font-medium text-slate-700 flex-1">{m.user_name}</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={percentageShares[m.user_id] || ''}
                        onChange={(e) =>
                          setPercentageShares({
                            ...percentageShares,
                            [m.user_id]: e.target.value,
                          })
                        }
                        className="w-20 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-right font-mono"
                      />
                      <span>%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {splitMethod === 'CUSTOM' && (
              <div className="space-y-2">
                <p className="text-xs text-slate-600">Enter custom share weights (e.g., 2 parts vs 1 part):</p>
                {members.map((m) => (
                  <div key={m.user_id} className="flex items-center justify-between gap-3 text-xs">
                    <span className="truncate font-medium text-slate-700 flex-1">{m.user_name}</span>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={customShares[m.user_id] || '1'}
                      onChange={(e) =>
                        setCustomShares({ ...customShares, [m.user_id]: e.target.value })
                      }
                      className="w-20 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-right font-mono"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Receipt Attachment & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Receipt Attachment (Optional)
              </label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={(e) => setReceiptFile(e.target.files ? e.target.files[0] : null)}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Bill number, UPI ref, etc."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold text-sm py-2.5 px-6 rounded-xl shadow-md shadow-orange-500/25 active:scale-95 transition-all disabled:opacity-50"
            >
              <span>{loading ? 'Saving Expense...' : 'Save Expense'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
