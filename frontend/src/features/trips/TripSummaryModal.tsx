import React, { useEffect, useState } from 'react';
import {
  X,
  Trophy,
  CheckCircle2,
  Calendar,
  Receipt,
  Scale,
  TrendingDown,
  AlertCircle,
  Loader2,
  Share2,
  FileSpreadsheet,
  FileText,
  Check,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { TripSummary } from '@/types';
import { formatPaise, formatDate } from '@/lib/currency';
import { downloadTripPdf, downloadTripCsv } from '@/lib/export-utils';

interface TripSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  preloadedSummary?: TripSummary | null;
}

export const TripSummaryModal: React.FC<TripSummaryModalProps> = ({
  isOpen,
  onClose,
  tripId,
  preloadedSummary,
}) => {
  const [summary, setSummary] = useState<TripSummary | null>(preloadedSummary || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (preloadedSummary) {
      setSummary(preloadedSummary);
      return;
    }
    const fetchSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.get<TripSummary>(`/trips/${tripId}/summary`);
        setSummary(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load trip summary.');
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [isOpen, tripId, preloadedSummary]);

  if (!isOpen) return null;

  const handleShareSummary = () => {
    if (!summary) return;
    const textLines = [
      `* ${summary.trip_name} — Final Trip Summary`,
      `Total Trip Expenses: ${formatPaise(summary.total_expenses_paise)}`,
      `Status: ${summary.is_fully_settled ? 'Fully Settled' : 'Settlements Pending'}`,
      '',
      '--- Member Breakdown ---',
      ...summary.participant_breakdown.map(
        (m) =>
          `- ${m.user_name}: Paid ${formatPaise(m.amount_spent_paise)} | Fair Share ${formatPaise(
            m.amount_consumed_paise
          )} | Net: ${
            m.net_balance_paise > 0
              ? `+${formatPaise(m.net_balance_paise)} (Receives)`
              : m.net_balance_paise < 0
              ? `${formatPaise(m.net_balance_paise)} (Owes)`
              : 'Settled'
          }`
      ),
      '',
      summary.settlement_suggestions.length > 0 ? '--- Final Settlements ---' : '',
      ...summary.settlement_suggestions.map(
        (t) => `- ${t.from_user_name} -> ${t.to_user_name}: ${formatPaise(t.amount_paise)}`
      ),
      '',
      'Calculated accurately via ONNA-GO',
    ];
    navigator.clipboard.writeText(textLines.filter(Boolean).join('\n'));
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-[#E8E8E5] max-w-2xl w-full shadow-2xl overflow-hidden my-auto animate-scaleUp">
        {/* Modal Header */}
        <div className="relative bg-gradient-to-b from-[#DDF5E5]/70 to-white px-6 pt-7 pb-5 border-b border-[#E8E8E5]">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-[#737373] hover:text-[#171717] hover:bg-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-[#16834A] text-white flex items-center justify-center shadow-md">
              <Trophy className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-[#16834A] tracking-wider uppercase">
                Trip Ledger Finalized
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-[#171717] font-['Plus_Jakarta_Sans']">
                {summary?.trip_name || 'Trip Summary'}
              </h2>
            </div>
          </div>

          <p className="text-xs text-[#737373] max-w-lg mt-1">
            This trip has been completed and saved to your permanent travel history. Review final contributions, fair shares, and the zero-sum debt ledger below.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {loading ? (
            <div className="p-12 text-center text-[#737373] space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#16834A]" />
              <p className="text-xs font-medium">Generating complete trip summary...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-[#FFE4E6] border border-[#FDA4AF] text-[#E11D48] text-xs">
              {error}
            </div>
          ) : summary ? (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-[#FAFAF8] border border-[#E8E8E5] rounded-2xl p-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#737373] block mb-1">
                    Total Expenses
                  </span>
                  <span className="text-xl sm:text-2xl font-bold font-mono text-[#171717] tabular-nums">
                    {formatPaise(summary.total_expenses_paise, summary.currency)}
                  </span>
                </div>

                <div className="bg-[#FAFAF8] border border-[#E8E8E5] rounded-2xl p-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#737373] block mb-1">
                    Settlement Status
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
                      summary.is_fully_settled
                        ? 'bg-[#DDF5E5] text-[#16834A] border border-[#C6ECCF]'
                        : 'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]'
                    }`}
                  >
                    {summary.is_fully_settled ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>All Settled</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Debts Open</span>
                      </>
                    )}
                  </span>
                </div>

                <div className="col-span-2 sm:col-span-1 bg-[#FAFAF8] border border-[#E8E8E5] rounded-2xl p-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#737373] block mb-1">
                    Completed On
                  </span>
                  <span className="text-xs font-semibold text-[#171717]">
                    {summary.completed_at ? formatDate(summary.completed_at) : 'Just Now'}
                  </span>
                </div>
              </div>

              {/* Category Breakdown */}
              {summary.category_breakdown && summary.category_breakdown.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#737373] flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-[#16834A]" />
                    <span>Category Spending Breakdown</span>
                  </h3>
                  <div className="bg-[#FAFAF8] border border-[#E8E8E5] rounded-2xl p-4 space-y-3">
                    {summary.category_breakdown.map((cat) => (
                      <div key={cat.category} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#171717]">{cat.category}</span>
                          <span className="font-mono text-[#737373] tabular-nums">
                            {formatPaise(cat.amount_paise)} ({cat.percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-[#E8E8E5] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#16834A] h-full rounded-full transition-all"
                            style={{ width: `${Math.min(100, Math.max(0, cat.percentage))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Member Contributions vs Fair Shares */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#737373] flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-[#16834A]" />
                  <span>Member Contributions vs. Fair Shares</span>
                </h3>
                <div className="bg-white border border-[#E8E8E5] rounded-2xl overflow-hidden divide-y divide-[#F4F4F2]">
                  {summary.participant_breakdown.map((m) => (
                    <div
                      key={m.user_id}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <p className="font-bold text-[#171717] text-sm">{m.user_name}</p>
                        <p className="text-[#737373] text-[11px] mt-0.5">
                          Paid: <strong className="text-[#171717]">{formatPaise(m.amount_spent_paise)}</strong> • Fair Share: <strong className="text-[#171717]">{formatPaise(m.amount_consumed_paise)}</strong>
                        </p>
                      </div>

                      <div className="text-left sm:text-right">
                        <span
                          className={`font-mono font-bold text-sm tabular-nums ${
                            m.net_balance_paise > 0
                              ? 'text-[#16834A]'
                              : m.net_balance_paise < 0
                              ? 'text-[#B45309]'
                              : 'text-[#737373]'
                          }`}
                        >
                          {m.net_balance_paise > 0
                            ? `+${formatPaise(m.net_balance_paise)}`
                            : formatPaise(m.net_balance_paise)}
                        </span>
                        <span
                          className={`ml-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                            m.net_balance_paise > 0
                              ? 'bg-[#DDF5E5] text-[#16834A]'
                              : m.net_balance_paise < 0
                              ? 'bg-[#FEF3C7] text-[#B45309]'
                              : 'bg-[#F4F4F2] text-[#737373]'
                          }`}
                        >
                          {m.net_balance_paise > 0 ? 'Receives' : m.net_balance_paise < 0 ? 'Owes' : 'Settled'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Who Owes Who: Simplified Settlement Ledger */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#737373] flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5 text-[#16834A]" />
                  <span>Settlement Ledger (Who Owes Who)</span>
                </h3>

                {summary.settlement_suggestions.length === 0 ? (
                  <div className="p-4 bg-[#DDF5E5]/50 border border-[#C6ECCF] rounded-2xl text-xs text-[#16834A] font-semibold text-center flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>No outstanding debts! Everyone has settled up.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {summary.settlement_suggestions.map((sug, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#171717] text-white flex items-center justify-center font-bold text-[10px]">
                            {idx + 1}
                          </span>
                          <span>
                            <strong className="text-[#B45309]">{sug.from_user_name}</strong> pays{' '}
                            <strong className="text-[#16834A]">{sug.to_user_name}</strong>
                          </span>
                        </div>
                        <span className="font-mono font-bold text-sm text-[#171717] tabular-nums">
                          {formatPaise(sug.amount_paise)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pending Settlements Alert */}
              {summary.pending_settlements && summary.pending_settlements.length > 0 && (
                <div className="p-4 bg-[#FEF3C7] border border-[#FDE68A] rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#B45309]">
                    <AlertCircle className="w-4 h-4" />
                    <span>
                      {summary.pending_settlements.length} Pending Settlement(s) Require Payee Confirmation
                    </span>
                  </div>
                  <p className="text-[11px] text-[#92400E]">
                    The payee must verify their bank account / UPI app and click "Confirm Receipt" in the Settlements tab to close these records.
                  </p>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#FAFAF8] border-t border-[#E8E8E5] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleShareSummary}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#F4F4F2] border border-[#E8E8E5] text-xs font-semibold text-[#171717] transition-colors"
            >
              {copiedSummary ? <Check className="w-3.5 h-3.5 text-[#16834A]" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedSummary ? 'Summary Copied!' : 'Copy Summary'}</span>
            </button>
            <button
              onClick={async () => {
                if (downloadingPdf) return;
                setDownloadingPdf(true);
                try {
                  await downloadTripPdf(tripId, summary?.trip_name || 'Trip');
                } catch (err: any) {
                  alert(err.message || 'Failed to download PDF');
                } finally {
                  setDownloadingPdf(false);
                }
              }}
              disabled={downloadingPdf}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#F4F4F2] border border-[#E8E8E5] text-xs font-semibold text-[#171717] transition-colors disabled:opacity-50"
            >
              {downloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#16834A]" /> : <FileText className="w-3.5 h-3.5 text-[#16834A]" />}
              <span>{downloadingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
            </button>
            <button
              onClick={async () => {
                if (downloadingCsv) return;
                setDownloadingCsv(true);
                try {
                  await downloadTripCsv(tripId, summary?.trip_name || 'Trip');
                } catch (err: any) {
                  alert(err.message || 'Failed to download CSV');
                } finally {
                  setDownloadingCsv(false);
                }
              }}
              disabled={downloadingCsv}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#F4F4F2] border border-[#E8E8E5] text-xs font-semibold text-[#171717] transition-colors disabled:opacity-50"
            >
              {downloadingCsv ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#16834A]" /> : <FileSpreadsheet className="w-3.5 h-3.5 text-[#16834A]" />}
              <span>{downloadingCsv ? 'Preparing CSV...' : 'Download CSV'}</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 bg-[#171717] hover:bg-black text-white text-xs font-semibold rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
