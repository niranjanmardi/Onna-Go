import React, { useState } from 'react';
import { X, HandCoins, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api-client';
import { TripMember, Settlement } from '@/types';
import { rupeesToPaise, formatPaise } from '@/lib/currency';
import { useFeedback } from '@/context/FeedbackContext';
import { playSound } from '@/lib/sounds';

interface RecordSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  members: TripMember[];
  initialPayerId?: string;
  initialPayeeId?: string;
  initialAmountPaise?: number;
  onSettlementRecorded: (st: Settlement) => void;
}

export const RecordSettlementModal: React.FC<RecordSettlementModalProps> = ({
  isOpen,
  onClose,
  tripId,
  members,
  initialPayerId,
  initialPayeeId,
  initialAmountPaise,
  onSettlementRecorded,
}) => {
  const { showConfirmation } = useFeedback();
  const [payerId, setPayerId] = useState(initialPayerId || (members[0]?.user_id || ''));
  const [payeeId, setPayeeId] = useState(
    initialPayeeId || (members[1]?.user_id || members[0]?.user_id || '')
  );
  const [amountRupees, setAmountRupees] = useState(
    initialAmountPaise ? (initialAmountPaise / 100).toString() : ''
  );
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [referenceId, setReferenceId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (payerId === payeeId) {
      setError('Sender (Payer) and Receiver (Payee) cannot be the same person.');
      return;
    }

    const paise = rupeesToPaise(amountRupees);
    if (paise <= 0) {
      setError('Settlement amount must be greater than 0.');
      return;
    }

    setLoading(true);
    try {
      const recorded = await api.post<Settlement>('/settlements/', {
        trip_id: tripId,
        payer_id: payerId,
        payee_id: payeeId,
        amount_paise: paise,
        payment_method: paymentMethod,
        reference_id: referenceId || null,
        notes: notes || null,
      });
      showConfirmation({
        title: 'Settlement recorded successfully',
        message: 'Payment recorded and pending recipient confirmation.',
        sound: 'settlement_success',
      });
      onSettlementRecorded(recorded);
      onClose();
    } catch (err: any) {
      playSound('error');
      setError(err.message || 'Failed to record settlement.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-[#E8E8E5] shadow-xl max-w-md w-full p-6 relative">
        <div className="flex items-center justify-between pb-4 border-b border-[#E8E8E5]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#DDF5E5] text-[#16834A] flex items-center justify-center">
              <HandCoins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#171717] font-['Plus_Jakarta_Sans']">
                Record Payment / Settlement
              </h3>
              <p className="text-xs text-[#737373]">Record an off-app payment to settle balances</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#737373] hover:text-[#171717] rounded-lg hover:bg-[#F4F4F2] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-[#FFE4E6] border border-[#FDA4AF] text-[#E11D48] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1">
                Sender (Paid by) *
              </label>
              <select
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3 py-2 text-xs font-medium text-[#171717] focus:outline-none focus:border-[#16834A] transition-colors"
              >
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.user_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1">
                Receiver (Paid to) *
              </label>
              <select
                value={payeeId}
                onChange={(e) => setPayeeId(e.target.value)}
                className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3 py-2 text-xs font-medium text-[#171717] focus:outline-none focus:border-[#16834A] transition-colors"
              >
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.user_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1">
              Amount (₹) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              placeholder="0.00"
              className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-4 py-2.5 text-base font-bold font-mono text-[#171717] tabular-nums focus:outline-none focus:border-[#16834A] transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1">
                Payment Mode
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3 py-2 text-xs font-medium text-[#171717] focus:outline-none focus:border-[#16834A] transition-colors"
              >
                <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank IMPS / NEFT</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1">
                Reference ID (UPI Ref)
              </label>
              <input
                type="text"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                placeholder="e.g. 402919293123"
                className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3 py-2 text-xs text-[#171717] focus:outline-none focus:border-[#16834A] font-mono transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1">
              Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Settled after dinner, hotel deposit return..."
              className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-4 py-2 text-xs text-[#171717] focus:outline-none focus:border-[#16834A] transition-colors"
            />
          </div>

          <div className="p-3 rounded-xl bg-[#FAFAF8] border border-[#E8E8E5] text-[#737373] text-[11px] space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-[#171717]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#16834A]" />
              <span>Settlement Verification Policy</span>
            </div>
            <p>
              This payment begins in <strong>Pending Confirmation</strong> status. Once the recipient confirms receipt, effective group balances are updated.
            </p>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#E8E8E5]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#737373] hover:text-[#171717] rounded-xl hover:bg-[#F4F4F2] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 bg-[#16834A] hover:bg-[#136F3F] text-white font-semibold text-xs py-2 px-5 rounded-xl shadow-xs transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <span>{loading ? 'Recording...' : 'Record Payment'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
