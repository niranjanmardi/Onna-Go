import React, { useState, useEffect } from 'react';
import { X, HandCoins, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api-client';
import { TripMember, Settlement } from '@/types';
import { rupeesToPaise, formatPaise } from '@/lib/currency';
import { useFeedback } from '@/context/FeedbackContext';
import { playSound } from '@/lib/sounds';
import { queueSettlementCreation, isDeviceOnline } from '@/lib/sync-manager';

interface RecordSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  tripName?: string;
  members: TripMember[];
  initialPayerId?: string;
  initialPayeeId?: string;
  initialAmountPaise?: number;
  initialPaymentMethod?: string;
  onSettlementRecorded: (st: Settlement) => void;
}

export const RecordSettlementModal: React.FC<RecordSettlementModalProps> = ({
  isOpen,
  onClose,
  tripId,
  tripName,
  members,
  initialPayerId,
  initialPayeeId,
  initialAmountPaise,
  initialPaymentMethod = 'CASH',
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
  const [paymentMethod, setPaymentMethod] = useState(initialPaymentMethod);
  const [referenceId, setReferenceId] = useState('');
  const [notes, setNotes] = useState('');
  const [confirmedByUser, setConfirmedByUser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Sync state when modal opens or initial props change
  useEffect(() => {
    if (isOpen) {
      if (initialPayerId) setPayerId(initialPayerId);
      if (initialPayeeId) setPayeeId(initialPayeeId);
      if (initialAmountPaise) setAmountRupees((initialAmountPaise / 100).toString());
      if (initialPaymentMethod) setPaymentMethod(initialPaymentMethod);
      setError(null);
      setReferenceId('');
      setNotes('');
      setConfirmedByUser(false);
    }
  }, [isOpen, initialPayerId, initialPayeeId, initialAmountPaise, initialPaymentMethod]);

  if (!isOpen) return null;

  const payerMember = members.find((m) => m.user_id === payerId);
  const payeeMember = members.find((m) => m.user_id === payeeId);

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

    if (!confirmedByUser) {
      setError('Please confirm that this payment has already occurred outside ONNA-GO.');
      return;
    }

    setLoading(true);
    try {
      const settlementPayload = {
        trip_id: tripId,
        payer_id: payerId,
        payee_id: payeeId,
        amount_paise: paise,
        payment_method: paymentMethod,
        reference_id: referenceId.trim() || null,
        notes: notes.trim() || null,
      };

      let recorded: Settlement;

      if (!isDeviceOnline()) {
        recorded = await queueSettlementCreation(
          tripId,
          settlementPayload,
          payerMember?.user_name || 'You',
          payeeMember?.user_name || 'Member'
        );
        showConfirmation({
          title: 'Saved offline ⏳',
          message: `Settlement of ${formatPaise(paise, 'INR')} saved on device. Will sync when you are back online.`,
          sound: 'settlement_success',
        });
      } else {
        try {
          recorded = await api.post<Settlement>('/settlements/', settlementPayload);
          showConfirmation({
            title: 'Settlement request created',
            message: `${payeeMember?.user_name || 'Payee'} will receive a notification to verify and confirm receipt.`,
            sound: 'settlement_success',
          });
        } catch (apiErr: any) {
          if (!window.navigator.onLine || apiErr?.message?.includes('fetch') || apiErr?.message?.includes('Network')) {
            recorded = await queueSettlementCreation(
              tripId,
              settlementPayload,
              payerMember?.user_name || 'You',
              payeeMember?.user_name || 'Member'
            );
            showConfirmation({
              title: 'Saved offline ⏳',
              message: `Network unavailable. Settlement saved in outbox.`,
              sound: 'settlement_success',
            });
          } else {
            throw apiErr;
          }
        }
      }

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#141416] text-[#18181B] dark:text-[#F5F5F7] rounded-2xl border border-[#E4E4E7] dark:border-[#2A2A2E] shadow-2xl max-w-md w-full p-5 sm:p-6 relative">
        <div className="flex items-center justify-between pb-4 border-b border-[#E4E4E7] dark:border-[#2A2A2E]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#DDF5E5] dark:bg-[#22C55E]/10 text-[#16834A] dark:text-[#22C55E] flex items-center justify-center">
              <HandCoins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight">
                Record Settlement
              </h3>
              <p className="text-xs text-[#71717A] dark:text-[#A1A1AA]">
                {tripName ? `Trip: ${tripName}` : 'Record a payment between trip members'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-[#F5F5F7] rounded-lg hover:bg-[#F0F0F2] dark:hover:bg-[#1B1B1E] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-[#FFE4E6] dark:bg-[#EF4444]/10 border border-[#FDA4AF] dark:border-[#EF4444]/30 text-[#DC2626] dark:text-[#EF4444] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] mb-1">
                Payer (Who Paid) *
              </label>
              <select
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                className="w-full bg-[#F7F7F8] dark:bg-[#1B1B1E] border border-[#E4E4E7] dark:border-[#2A2A2E] rounded-xl px-3 py-2 text-xs font-medium text-[#18181B] dark:text-[#F5F5F7] focus:outline-none focus:border-[#16834A] dark:focus:border-[#22C55E] transition-colors"
              >
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.user_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] mb-1">
                Receiver (Paid To) *
              </label>
              <select
                value={payeeId}
                onChange={(e) => setPayeeId(e.target.value)}
                className="w-full bg-[#F7F7F8] dark:bg-[#1B1B1E] border border-[#E4E4E7] dark:border-[#2A2A2E] rounded-xl px-3 py-2 text-xs font-medium text-[#18181B] dark:text-[#F5F5F7] focus:outline-none focus:border-[#16834A] dark:focus:border-[#22C55E] transition-colors"
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
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] mb-1">
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
              className="w-full bg-[#F7F7F8] dark:bg-[#1B1B1E] border border-[#E4E4E7] dark:border-[#2A2A2E] rounded-xl px-4 py-2.5 text-base font-bold font-mono text-[#18181B] dark:text-[#F5F5F7] tabular-nums focus:outline-none focus:border-[#16834A] dark:focus:border-[#22C55E] transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] mb-1">
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-[#F7F7F8] dark:bg-[#1B1B1E] border border-[#E4E4E7] dark:border-[#2A2A2E] rounded-xl px-3 py-2 text-xs font-medium text-[#18181B] dark:text-[#F5F5F7] focus:outline-none focus:border-[#16834A] dark:focus:border-[#22C55E] transition-colors"
              >
                <option value="CASH">Cash (Given in person)</option>
                <option value="UPI">UPI (Paid outside ONNA-GO)</option>
                <option value="BANK_TRANSFER">Bank Transfer (IMPS / NEFT)</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] mb-1">
                Reference / Note
              </label>
              <input
                type="text"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                placeholder={paymentMethod === 'CASH' ? 'e.g. Handed over at tea shop' : 'e.g. UTR / Ref No'}
                className="w-full bg-[#F7F7F8] dark:bg-[#1B1B1E] border border-[#E4E4E7] dark:border-[#2A2A2E] rounded-xl px-3 py-2 text-xs text-[#18181B] dark:text-[#F5F5F7] focus:outline-none focus:border-[#16834A] dark:focus:border-[#22C55E] font-mono transition-colors"
              >
              </input>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] mb-1">
              Optional Note
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Settled for fuel and hotel"
              className="w-full bg-[#F7F7F8] dark:bg-[#1B1B1E] border border-[#E4E4E7] dark:border-[#2A2A2E] rounded-xl px-4 py-2 text-xs text-[#18181B] dark:text-[#F5F5F7] focus:outline-none focus:border-[#16834A] dark:focus:border-[#22C55E] transition-colors"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-[#F7F7F8] dark:bg-[#1B1B1E] border border-[#E4E4E7] dark:border-[#2A2A2E] text-[#71717A] dark:text-[#A1A1AA] text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-[#18181B] dark:text-[#F5F5F7]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#16834A] dark:text-[#22C55E]" />
              <span>Record-Keeping Notice</span>
            </div>
            <p className="leading-relaxed">
              Recording this settlement updates group balances. It does not transfer money through your bank account or UPI. The settlement will remain in <strong>Pending Confirmation</strong> until {payeeMember?.user_name || 'the recipient'} verifies receipt.
            </p>
          </div>

          {/* Explicit User Confirmation */}
          <div className="pt-1">
            <label className="flex items-start gap-2.5 text-xs text-[#18181B] dark:text-[#F5F5F7] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmedByUser}
                onChange={(e) => setConfirmedByUser(e.target.checked)}
                className="mt-0.5 rounded border-[#E4E4E7] dark:border-[#2A2A2E] text-[#16834A] dark:text-[#22C55E] focus:ring-[#16834A]"
              />
              <span className="leading-tight">
                I confirm that this payment of {amountRupees ? `₹${amountRupees}` : 'the specified amount'} was completed outside ONNA-GO.
              </span>
            </label>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#E4E4E7] dark:border-[#2A2A2E]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-[#71717A] dark:text-[#A1A1AA] hover:text-[#18181B] dark:hover:text-[#F5F5F7] rounded-xl hover:bg-[#F0F0F2] dark:hover:bg-[#1B1B1E] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !confirmedByUser}
              className="inline-flex items-center gap-1.5 bg-[#16834A] dark:bg-[#22C55E] hover:bg-[#136F3F] dark:hover:bg-[#16A34A] text-white dark:text-[#0A0A0A] font-semibold text-xs py-2 px-5 rounded-xl shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <span>{loading ? 'Recording...' : 'Confirm & Record Settlement'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
