import React, { useState, useEffect } from 'react';
import { HandCoins, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api-client';
import { TripMember, Settlement } from '@/types';
import { rupeesToPaise, formatPaise } from '@/lib/currency';
import { useFeedback } from '@/context/FeedbackContext';
import { playSound } from '@/lib/sounds';
import { queueSettlementCreation, isDeviceOnline } from '@/lib/sync-manager';
import { GlassModal, GlassButton } from '@/components/glass';

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
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Settlement"
      subtitle={tripName ? `Trip: ${tripName}` : 'Record a payment between trip members'}
      size="md"
    >
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1">
              Payer (Who Paid) *
            </label>
            <select
              value={payerId}
              onChange={(e) => setPayerId(e.target.value)}
              className="glass-input w-full text-xs font-semibold [&>option]:bg-zinc-900 [&>option]:text-white"
            >
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.user_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1">
              Receiver (Paid To) *
            </label>
            <select
              value={payeeId}
              onChange={(e) => setPayeeId(e.target.value)}
              className="glass-input w-full text-xs font-semibold [&>option]:bg-zinc-900 [&>option]:text-white"
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
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1">
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
            className="glass-input w-full text-base font-bold font-mono tabular-nums"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1">
              Payment Method *
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="glass-input w-full text-xs font-semibold [&>option]:bg-zinc-900 [&>option]:text-white"
            >
              <option value="CASH">Cash (Given in person)</option>
              <option value="UPI">UPI (Paid outside ONNA-GO)</option>
              <option value="BANK_TRANSFER">Bank Transfer (IMPS / NEFT)</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1">
              Reference / Note
            </label>
            <input
              type="text"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              placeholder={paymentMethod === 'CASH' ? 'e.g. Handed over at tea shop' : 'e.g. UTR / Ref No'}
              className="glass-input w-full text-xs font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1">
            Optional Note
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Settled for fuel and hotel"
            className="glass-input w-full text-xs"
          />
        </div>

        <div className="p-3.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 text-zinc-600 dark:text-zinc-300 text-xs space-y-1.5 font-medium">
          <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-white">
            <ShieldCheck className="w-3.5 h-3.5 text-[#16834A] dark:text-[#22C55E]" />
            <span>Record-Keeping Notice</span>
          </div>
          <p className="leading-relaxed">
            Recording this settlement updates group balances. It does not transfer money through your bank account or UPI. The settlement will remain in <strong>Pending Confirmation</strong> until {payeeMember?.user_name || 'the recipient'} verifies receipt.
          </p>
        </div>

        {/* Explicit User Confirmation */}
        <div className="pt-1">
          <label className="flex items-start gap-2.5 text-xs text-zinc-900 dark:text-white font-medium cursor-pointer select-none">
            <input
              type="checkbox"
              checked={confirmedByUser}
              onChange={(e) => setConfirmedByUser(e.target.checked)}
              className="mt-0.5 rounded border-zinc-400 text-[#16834A] focus:ring-[#16834A]"
            />
            <span className="leading-tight">
              I confirm that this payment of {amountRupees ? `₹${amountRupees}` : 'the specified amount'} was completed outside ONNA-GO.
            </span>
          </label>
        </div>

        <div className="pt-3 flex items-center justify-end gap-3 border-t border-black/5 dark:border-white/10">
          <GlassButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </GlassButton>
          <GlassButton
            type="submit"
            variant="primary"
            size="sm"
            disabled={loading || !confirmedByUser}
            className="gap-1.5"
          >
            <span>{loading ? 'Recording...' : 'Confirm & Record'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </GlassButton>
        </div>
      </form>
    </GlassModal>
  );
};
