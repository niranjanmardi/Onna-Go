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
import { GlassModal, GlassButton } from '@/components/glass';

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
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title={summary?.trip_name || 'Trip Summary'}
      subtitle="Finalized trip ledger & zero-sum settlement analysis"
      size="lg"
    >
      <div className="space-y-6 max-h-[75vh] overflow-y-auto text-zinc-900 dark:text-white pr-1">
        {loading ? (
          <div className="p-12 text-center text-zinc-500 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#16834A] dark:text-[#22C55E]" />
            <p className="text-xs font-semibold">Generating complete trip summary...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-300 text-xs font-semibold">
            {error}
          </div>
        ) : summary ? (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1">
                  Total Expenses
                </span>
                <span className="text-xl sm:text-2xl font-bold font-mono text-zinc-900 dark:text-white tabular-nums">
                  {formatPaise(summary.total_expenses_paise, summary.currency)}
                </span>
              </div>

              <div className="bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1">
                  Settlement Status
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
                    summary.is_fully_settled
                      ? 'bg-emerald-500/15 text-[#16834A] dark:text-[#4ADE80] border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
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

              <div className="col-span-2 sm:col-span-1 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl p-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-1">
                  Completed On
                </span>
                <span className="text-xs font-bold text-zinc-900 dark:text-white">
                  {summary.completed_at ? formatDate(summary.completed_at) : 'Just Now'}
                </span>
              </div>
            </div>

            {/* Category Breakdown */}
            {summary.category_breakdown && summary.category_breakdown.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-[#16834A] dark:text-[#22C55E]" />
                  <span>Category Spending Breakdown</span>
                </h3>
                <div className="bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl p-4 space-y-3">
                  {summary.category_breakdown.map((cat) => (
                    <div key={cat.category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-zinc-900 dark:text-white">{cat.category}</span>
                        <span className="font-mono text-zinc-500 dark:text-zinc-400 tabular-nums font-semibold">
                          {formatPaise(cat.amount_paise)} ({cat.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-black/10 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#16834A] dark:bg-[#22C55E] h-full rounded-full transition-all"
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
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-[#16834A] dark:text-[#22C55E]" />
                <span>Member Contributions vs. Fair Shares</span>
              </h3>
              <div className="bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl overflow-hidden divide-y divide-black/5 dark:divide-white/10">
                {summary.participant_breakdown.map((m) => (
                  <div
                    key={m.user_id}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-bold text-zinc-900 dark:text-white text-sm">{m.user_name}</p>
                      <p className="text-zinc-500 dark:text-zinc-400 text-[11px] mt-0.5 font-medium">
                        Paid: <strong className="text-zinc-800 dark:text-zinc-200">{formatPaise(m.amount_spent_paise)}</strong> &bull; Fair Share: <strong className="text-zinc-800 dark:text-zinc-200">{formatPaise(m.amount_consumed_paise)}</strong>
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <span
                        className={`font-mono font-bold text-sm tabular-nums ${
                          m.net_balance_paise > 0
                            ? 'text-[#16834A] dark:text-[#4ADE80]'
                            : m.net_balance_paise < 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-zinc-500'
                        }`}
                      >
                        {m.net_balance_paise > 0
                          ? `+${formatPaise(m.net_balance_paise)}`
                          : formatPaise(m.net_balance_paise)}
                      </span>
                      <span
                        className={`ml-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          m.net_balance_paise > 0
                            ? 'bg-emerald-500/15 text-[#16834A] dark:text-[#4ADE80]'
                            : m.net_balance_paise < 0
                            ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                            : 'bg-black/5 dark:bg-white/10 text-zinc-500'
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
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-[#16834A] dark:text-[#22C55E]" />
                <span>Settlement Ledger (Who Owes Who)</span>
              </h3>

              {summary.settlement_suggestions.length === 0 ? (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-[#16834A] dark:text-[#4ADE80] font-bold text-center flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>No outstanding debts! Everyone has settled up.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {summary.settlement_suggestions.map((sug, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-zinc-800 dark:bg-zinc-700 text-white flex items-center justify-center font-bold text-[10px]">
                          {idx + 1}
                        </span>
                        <span className="text-zinc-800 dark:text-zinc-200">
                          <strong className="text-red-600 dark:text-red-400">{sug.from_user_name}</strong> pays{' '}
                          <strong className="text-[#16834A] dark:text-[#4ADE80]">{sug.to_user_name}</strong>
                        </span>
                      </div>
                      <span className="font-mono font-bold text-sm text-zinc-900 dark:text-white tabular-nums">
                        {formatPaise(sug.amount_paise)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending Settlements Alert */}
            {summary.pending_settlements && summary.pending_settlements.length > 0 && (
              <div className="p-4 bg-amber-500/15 border border-amber-500/30 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300">
                  <AlertCircle className="w-4 h-4" />
                  <span>
                    {summary.pending_settlements.length} Pending Settlement(s) Require Payee Confirmation
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-200 font-medium">
                  The payee must verify their bank account / UPI app and click "Confirm Receipt" in the Settlements tab to close these records.
                </p>
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Modal Footer */}
      <div className="pt-4 border-t border-black/5 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <GlassButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleShareSummary}
            className="gap-1.5"
          >
            {copiedSummary ? <Check className="w-3.5 h-3.5 text-[#16834A] dark:text-[#22C55E]" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedSummary ? 'Summary Copied!' : 'Copy Summary'}</span>
          </GlassButton>
          <GlassButton
            type="button"
            variant="secondary"
            size="sm"
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
            className="gap-1.5"
          >
            {downloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#16834A] dark:text-[#22C55E]" /> : <FileText className="w-3.5 h-3.5 text-[#16834A] dark:text-[#22C55E]" />}
            <span>{downloadingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
          </GlassButton>
          <GlassButton
            type="button"
            variant="secondary"
            size="sm"
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
            className="gap-1.5"
          >
            {downloadingCsv ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#16834A] dark:text-[#22C55E]" /> : <FileSpreadsheet className="w-3.5 h-3.5 text-[#16834A] dark:text-[#22C55E]" />}
            <span>{downloadingCsv ? 'Preparing CSV...' : 'Download CSV'}</span>
          </GlassButton>
        </div>

        <GlassButton
          type="button"
          variant="primary"
          size="sm"
          onClick={onClose}
          className="w-full sm:w-auto"
        >
          Done
        </GlassButton>
      </div>
    </GlassModal>
  );
};
