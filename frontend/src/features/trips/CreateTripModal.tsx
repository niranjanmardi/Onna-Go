import React, { useState } from 'react';
import { X, Compass, MapPin, Calendar, Coins, ArrowRight, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Trip } from '@/types';
import { rupeesToPaise } from '@/lib/currency';

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTripCreated: (trip: Trip) => void;
}

export const CreateTripModal: React.FC<CreateTripModalProps> = ({
  isOpen,
  onClose,
  onTripCreated,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [budgetRupees, setBudgetRupees] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const budgetPaise = budgetRupees ? rupeesToPaise(budgetRupees) : null;
      const trip = await api.post<Trip>('/trips/', {
        name,
        description: description || null,
        destination: destination || null,
        start_date: startDate ? new Date(startDate).toISOString() : null,
        end_date: endDate ? new Date(endDate).toISOString() : null,
        currency,
        budget_paise: budgetPaise,
      });
      onTripCreated(trip);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create trip.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-[#E8E8E5] shadow-xl max-w-lg w-full p-6 sm:p-7 relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-[#E8E8E5]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#DDF5E5] text-[#16834A] flex items-center justify-center">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#171717] font-['Plus_Jakarta_Sans']">
                Start a New Trip
              </h3>
              <p className="text-xs text-[#737373]">Create your group and invite friends with ONNA-GO</p>
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
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1">
              Trip Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Western Ghats Monsoon Ride, Goa 2026"
              className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3.5 py-2.5 text-[#171717] text-sm focus:outline-none focus:border-[#16834A] focus:ring-2 focus:ring-[#16834A]/10 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1">
                Destination
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-3 text-[#A3A3A3]" />
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Manali, Coorg"
                  className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl pl-9 pr-3.5 py-2.5 text-[#171717] text-sm focus:outline-none focus:border-[#16834A] focus:ring-2 focus:ring-[#16834A]/10 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3.5 py-2.5 text-[#171717] text-sm focus:outline-none focus:border-[#16834A] focus:ring-2 focus:ring-[#16834A]/10 transition-colors"
              >
                <option value="INR">INR (₹) — Indian Rupee</option>
                <option value="USD">USD ($) — US Dollar</option>
                <option value="EUR">EUR (€) — Euro</option>
                <option value="GBP">GBP (£) — British Pound</option>
                <option value="AED">AED (د.إ) — UAE Dirham</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3.5 py-2 text-[#171717] text-sm focus:outline-none focus:border-[#16834A] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3.5 py-2 text-[#171717] text-sm focus:outline-none focus:border-[#16834A] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1">
              Estimated Total Budget ({currency})
            </label>
            <input
              type="number"
              min="0"
              value={budgetRupees}
              onChange={(e) => setBudgetRupees(e.target.value)}
              placeholder="e.g. 50000 (optional)"
              className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3.5 py-2.5 text-[#171717] text-sm font-mono tabular-nums focus:outline-none focus:border-[#16834A] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1">
              Description or Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Trip guidelines, bike route checkpoints, stay arrangements..."
              className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl px-3.5 py-2.5 text-[#171717] text-sm focus:outline-none focus:border-[#16834A] transition-colors resize-none"
            />
          </div>

          <div className="pt-3 border-t border-[#E8E8E5] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[#737373] hover:text-[#171717] rounded-xl hover:bg-[#F4F4F2] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-[#16834A] hover:bg-[#136F3F] rounded-xl shadow-xs transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <span>{loading ? 'Creating...' : 'Create Trip'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
