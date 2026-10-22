import React, { useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { User, Mail, Coins, LogOut, Check, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SettingsPage: React.FC = () => {
  const { user, updateProfile, logout } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [defaultCurrency, setDefaultCurrency] = useState(user?.default_currency || 'INR');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await updateProfile({
        full_name: fullName.trim(),
        default_currency: defaultCurrency,
      });
      setMessage('Profile settings saved successfully.');
    } catch (err: any) {
      setError(err.message || 'Error updating settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex-1 p-5 md:p-8 max-w-2xl mx-auto w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#171717] font-['Plus_Jakarta_Sans']">
          Account &amp; Preferences
        </h1>
        <p className="text-sm text-[#737373]">Manage your traveler profile and default currency</p>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-[#DDF5E5] border border-[#C6ECCF] text-[#16834A] text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-[#16834A]" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-[#FFE4E6] border border-[#FDA4AF] text-[#E11D48] text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[#E11D48]" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-[#E8E8E5] p-6 shadow-xs space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1">
            Full Name
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A3A3A3]">
              <User className="w-4 h-4" />
            </div>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#171717] focus:outline-none focus:border-[#16834A] transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A3A3A3]">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full bg-[#F4F4F2] border border-[#E8E8E5] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#737373] cursor-not-allowed"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[#737373] mb-1">
            Default Currency
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#A3A3A3]">
              <Coins className="w-4 h-4" />
            </div>
            <select
              value={defaultCurrency}
              onChange={(e) => setDefaultCurrency(e.target.value)}
              className="w-full bg-[#FAFAF8] border border-[#E8E8E5] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#171717] focus:outline-none focus:border-[#16834A] transition-colors"
            >
              <option value="INR">INR (₹ - Indian Rupee)</option>
              <option value="USD">USD ($ - US Dollar)</option>
              <option value="EUR">EUR (€ - Euro)</option>
              <option value="GBP">GBP (£ - British Pound)</option>
              <option value="AED">AED (د.إ - UAE Dirham)</option>
            </select>
          </div>
        </div>

        <div className="pt-3 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-[#16834A] hover:bg-[#136F3F] text-white font-semibold text-xs shadow-xs transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </form>

      {/* About Box */}
      <div className="bg-white rounded-2xl border border-[#E8E8E5] p-6 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-[#171717]">ONNA-GO</span>
          <span className="text-[11px] font-semibold text-[#16834A] bg-[#DDF5E5] px-2 py-0.5 rounded-md border border-[#C6ECCF]">
            ஒண்ணா போ
          </span>
        </div>
        <p className="text-xs text-[#737373]">
          Tagline: <strong>Ride Together. Vibe Together. Split Together.</strong>
        </p>
        <p className="text-xs text-[#737373]">
          Engineered for group trips, road journeys, and friends with mathematical zero-sum split precision.
        </p>

        <div className="pt-3 border-t border-[#F4F4F2] flex justify-between items-center">
          <span className="text-[11px] text-[#A3A3A3]">Version 1.0.0</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#E11D48] hover:bg-[#FFE4E6] rounded-lg transition-colors font-medium"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
