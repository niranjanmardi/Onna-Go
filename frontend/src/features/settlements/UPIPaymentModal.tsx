import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  QrCode,
  ArrowRight,
  ExternalLink,
  Lock,
  Loader2,
  FileText,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { Settlement } from '@/types';
import { formatPaise } from '@/lib/currency';
import { useFeedback } from '@/context/FeedbackContext';
import { playSound } from '@/lib/sounds';

interface UPIPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  tripName: string;
  payerId: string;
  payerName: string;
  payeeId: string;
  payeeName: string;
  payeeUpiId?: string | null;
  amountPaise: number;
  onSettlementInitiated: (st: Settlement) => void;
}

export const UPIPaymentModal: React.FC<UPIPaymentModalProps> = ({
  isOpen,
  onClose,
  tripId,
  tripName,
  payerId,
  payerName,
  payeeId,
  payeeName,
  payeeUpiId,
  amountPaise,
  onSettlementInitiated,
}) => {
  const { showConfirmation } = useFeedback();

  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [hasLaunchedApp, setHasLaunchedApp] = useState(false);
  const [referenceId, setReferenceId] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const amountRupees = (amountPaise / 100).toFixed(2);
  const transactionNote = `ONNA-GO: ${tripName}`;

  // Standard NPCI UPI URI Specification:
  // upi://pay?pa=<payee_upi>&pn=<payee_name>&am=<amount>&cu=INR&tn=<note>
  const upiUri = payeeUpiId
    ? `upi://pay?pa=${encodeURIComponent(payeeUpiId)}&pn=${encodeURIComponent(
        payeeName
      )}&am=${encodeURIComponent(amountRupees)}&cu=INR&tn=${encodeURIComponent(transactionNote)}`
    : '';

  const qrImageUrl = upiUri
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
        upiUri
      )}&bgcolor=FFFFFF&color=171717&margin=1`
    : '';

  const handleCopyUpi = () => {
    if (!payeeUpiId) return;
    navigator.clipboard.writeText(payeeUpiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleCopyAmount = () => {
    navigator.clipboard.writeText(amountRupees);
    setCopiedAmount(true);
    setTimeout(() => setCopiedAmount(false), 2000);
  };

  const handleOpenUPIApp = () => {
    if (!upiUri) return;
    setHasLaunchedApp(true);
    // Direct external app handoff
    window.location.href = upiUri;
  };

  const handleConfirmInitiation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const st = await api.post<Settlement>('/settlements/', {
        trip_id: tripId,
        payer_id: payerId,
        payee_id: payeeId,
        amount_paise: amountPaise,
        payment_method: 'UPI',
        status: 'INITIATED',
        reference_id: referenceId.trim() || null,
        notes: notes.trim() || `UPI transfer to ${payeeName}`,
      });

      showConfirmation({
        title: 'Transfer marked as initiated',
        message: `${payeeName} will verify in their bank and confirm receipt.`,
        sound: 'settlement_success',
      });
      onSettlementInitiated(st);
      onClose();
    } catch (err: any) {
      playSound('error');
      setError(err.message || 'Failed to submit settlement record.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-3xl border border-[#E8E8E5] shadow-2xl max-w-md w-full p-6 relative max-h-[92vh] overflow-y-auto animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#F4F4F2]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#DDF5E5] text-[#16834A] flex items-center justify-center shadow-xs">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#171717] font-['Plus_Jakarta_Sans']">
                Pay via UPI
              </h3>
              <p className="text-xs text-[#737373]">Peer-to-peer secure payment handoff</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#737373] hover:text-[#171717] rounded-xl hover:bg-[#F4F4F2] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-[#FFE4E6] border border-[#FDA4AF] text-[#E11D48] text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Payment Details Card */}
        <div className="mt-5 p-5 bg-[#FAFAF8] rounded-2xl border border-[#E8E8E5] text-center space-y-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#737373] block">
            Amount Due to {payeeName}
          </span>
          <div className="text-3xl sm:text-4xl font-bold font-mono text-[#171717] tracking-tight tabular-nums">
            {formatPaise(amountPaise)}
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-[#737373]">
            <span>Trip: <strong>{tripName}</strong></span>
          </div>
        </div>

        {/* Recipient UPI Section */}
        {payeeUpiId ? (
          <div className="mt-4 p-4 rounded-2xl bg-white border border-[#E8E8E5] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[#A3A3A3] font-semibold uppercase tracking-wider block">
                  Recipient UPI ID (VPA)
                </span>
                <span className="text-sm font-mono font-bold text-[#171717] break-all">
                  {payeeUpiId}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyUpi}
                className="p-2 rounded-xl border border-[#E8E8E5] hover:bg-[#F4F4F2] text-[#737373] transition-colors flex items-center gap-1 text-xs"
                title="Copy UPI ID"
              >
                {copiedUpi ? (
                  <Check className="w-4 h-4 text-[#16834A]" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Direct App Launch Button */}
            <button
              type="button"
              onClick={handleOpenUPIApp}
              className="w-full py-3 px-4 bg-[#16834A] hover:bg-[#136F3F] text-white font-semibold text-sm rounded-xl shadow-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Smartphone className="w-4 h-4" />
              <span>Open in UPI App (GPay / PhonePe / Paytm)</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </button>

            {/* Toggle QR fallback */}
            <div className="pt-2 flex items-center justify-between border-t border-[#F4F4F2] text-xs">
              <button
                type="button"
                onClick={() => setShowQR(!showQR)}
                className="text-[#16834A] hover:underline flex items-center gap-1 font-medium"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{showQR ? 'Hide UPI QR Code' : 'Scan via QR Code (Desktop)'}</span>
              </button>
              <button
                type="button"
                onClick={handleCopyAmount}
                className="text-[#737373] hover:text-[#171717] flex items-center gap-1"
              >
                {copiedAmount ? <Check className="w-3.5 h-3.5 text-[#16834A]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedAmount ? 'Amount Copied' : 'Copy Amount'}</span>
              </button>
            </div>

            {/* QR Code display */}
            {showQR && (
              <div className="mt-3 p-4 bg-white border border-[#E8E8E5] rounded-2xl flex flex-col items-center justify-center space-y-2 animate-fadeIn">
                <img
                  src={qrImageUrl}
                  alt="UPI QR Code"
                  className="w-44 h-44 rounded-xl border border-[#E8E8E5] shadow-xs"
                />
                <p className="text-[11px] text-[#737373] text-center">
                  Scan with any BHIM UPI app on your phone to transfer ₹{amountRupees} directly to {payeeName}.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 p-4 rounded-2xl bg-[#FEF3C7]/40 border border-[#FDE68A] text-left space-y-2">
            <div className="flex items-center gap-2 text-[#B45309] font-bold text-xs">
              <AlertTriangle className="w-4 h-4" />
              <span>Recipient has not saved a UPI ID yet</span>
            </div>
            <p className="text-xs text-[#737373]">
              {payeeName} has not added their UPI ID to their ONNA-GO profile yet. Ask them to add it in Settings, or pay via Cash/Bank IMPS and record the payment below.
            </p>
          </div>
        )}

        {/* Security Disclaimers */}
        <div className="mt-4 p-3.5 rounded-2xl bg-[#FAFAF8] border border-[#E8E8E5] text-[11px] text-[#737373] space-y-1.5">
          <div className="flex items-center gap-1.5 text-[#171717] font-semibold">
            <Lock className="w-3.5 h-3.5 text-[#16834A]" />
            <span>Zero-Credential Security Architecture</span>
          </div>
          <p>
            • ONNA-GO <strong>never</strong> asks for or stores UPI PINs, OTPs, or bank passwords.
          </p>
          <p>
            • Payments are peer-to-peer transfers handled entirely inside your authentic bank UPI app.
          </p>
          <p>
            • <strong>Receipt Verification:</strong> To protect against false claims, a transfer is only marked as Settled when <strong>{payeeName}</strong> confirms receipt.
          </p>
        </div>

        {/* Confirmation Form after user attempts transfer */}
        <form onSubmit={handleConfirmInitiation} className="mt-5 pt-4 border-t border-[#F4F4F2] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#171717]">
              {hasLaunchedApp ? 'Did you complete the transfer?' : 'Report Transfer as Initiated'}
            </span>
            <span className="text-[10px] text-[#A3A3A3]">Requires payee confirmation</span>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#737373] mb-1">
              UPI Reference / UTR Number (Optional)
            </label>
            <input
              type="text"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              placeholder="e.g. 402919293123 (12-digit UPI ref)"
              className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3.5 py-2 text-xs font-mono text-[#171717] focus:outline-none focus:border-[#16834A]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#737373] mb-1">
              Note (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Sent via Google Pay"
              className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3.5 py-2 text-xs text-[#171717] focus:outline-none focus:border-[#16834A]"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#737373] hover:text-[#171717] rounded-xl hover:bg-[#F4F4F2] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 bg-[#16834A] hover:bg-[#136F3F] text-white font-semibold text-xs py-2 px-5 rounded-xl shadow-xs transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Recording...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>I've Sent the Money</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
