import React, { useState } from 'react';
import { X, MapPin, Compass, Image as ImageIcon, Sparkles, Globe, Users, Lock, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useFeedback } from '@/context/FeedbackContext';
import { useAuth } from '@/features/auth/AuthContext';
import { Trip, SocialPostItem } from '@/types';
import { THEMES_CATALOG } from '@/config/themes';
import { UserAvatar } from '@/components/common/UserAvatar';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: (newPost: SocialPostItem) => void;
  defaultTripId?: string;
  defaultTripName?: string;
  userTrips?: Trip[];
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onPostCreated,
  defaultTripId,
  defaultTripName,
  userTrips = [],
}) => {
  const { user } = useAuth();
  const { playClick, showConfirmation } = useFeedback();

  const [caption, setCaption] = useState('');
  const [locationName, setLocationName] = useState('');
  const [selectedTripId, setSelectedTripId] = useState<string>(defaultTripId || '');
  const [privacy, setPrivacy] = useState<'PUBLIC' | 'FRIENDS' | 'PRIVATE'>('FRIENDS');
  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string>('');
  const [customMediaUrl, setCustomMediaUrl] = useState<string>('');
  const [showPhotoPicker, setShowPhotoPicker] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeMediaUrl = customMediaUrl.trim() || selectedMediaUrl;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim() && !activeMediaUrl) {
      setError('Please provide a caption or select a photo for your memory.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        caption: caption.trim() || null,
        location_name: locationName.trim() || null,
        trip_id: selectedTripId || null,
        privacy,
        media_urls: activeMediaUrl ? [activeMediaUrl] : [],
      };

      const res = await api.post<SocialPostItem>('/social/posts', payload);
      playClick();
      showConfirmation({
        title: 'Memory Published',
        message: 'Your travel memory has been shared successfully!',
        sound: 'trip_success',
      });

      onPostCreated(res);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to publish memory. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-post-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="glass-modal relative w-full max-w-lg rounded-3xl border border-white/30 flex flex-col overflow-hidden shadow-2xl max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/20 flex items-center justify-between shrink-0 glass-nav">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[var(--theme-accent,#22C55E)]/20 text-[var(--theme-accent,#22C55E)] flex items-center justify-center border border-white/25">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 id="create-post-title" className="text-base font-bold text-white tracking-tight">
                {defaultTripName ? `Memory for ${defaultTripName}` : 'Create Travel Memory'}
              </h2>
              <p className="text-[11px] text-white/70">
                Share moments with your travel circle
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playClick();
              onClose();
            }}
            className="p-1.5 rounded-xl text-white/70 hover:text-white glass-interactive transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* User Preview */}
          <div className="flex items-center gap-3">
            <UserAvatar
              name={user?.full_name}
              avatarUrl={user?.avatar_url}
              size="sm"
            />
            <div>
              <p className="text-xs font-bold text-white">{user?.full_name || 'You'}</p>
              <p className="text-[10px] text-white/70">@{user?.username || 'traveler'}</p>
            </div>
          </div>

          {/* Caption Input */}
          <div className="space-y-1">
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What made this trip moment unforgettable?..."
              rows={3}
              maxLength={2000}
              className="w-full p-3.5 glass-input text-sm text-white placeholder-white/50 outline-none rounded-2xl resize-none focus:ring-1 focus:ring-[var(--theme-accent,#22C55E)] transition-all"
            />
            <div className="flex justify-end text-[10px] text-white/50">
              {caption.length} / 2000
            </div>
          </div>

          {/* Location Input */}
          <div className="relative">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="Add location (e.g. Howrah Bridge, Rohtang Pass, Jodhpur)..."
              className="w-full h-11 pl-10 pr-3.5 glass-input text-sm text-white placeholder-white/50 outline-none rounded-xl"
            />
          </div>

          {/* Trip Selector (If user has trips and not locked) */}
          {!defaultTripId && userTrips.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-white/70" />
                <span>Link to a Trip (Optional)</span>
              </label>
              <select
                value={selectedTripId}
                onChange={(e) => setSelectedTripId(e.target.value)}
                className="w-full h-10 px-3 glass-input text-xs text-white outline-none rounded-xl bg-black/40"
              >
                <option value="" className="bg-zinc-900 text-white">None (Personal Moment)</option>
                {userTrips.map((t) => (
                  <option key={t.id} value={t.id} className="bg-zinc-900 text-white">
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Privacy Pill Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/80">Visibility</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPrivacy('FRIENDS')}
                className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  privacy === 'FRIENDS'
                    ? 'bg-[var(--theme-accent,#22C55E)] text-[var(--theme-accent-text,#0F172A)] font-bold shadow-md'
                    : 'glass-interactive text-white/70 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Friends</span>
              </button>
              <button
                type="button"
                onClick={() => setPrivacy('PUBLIC')}
                className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  privacy === 'PUBLIC'
                    ? 'bg-[var(--theme-accent,#22C55E)] text-[var(--theme-accent-text,#0F172A)] font-bold shadow-md'
                    : 'glass-interactive text-white/70 hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Public</span>
              </button>
              <button
                type="button"
                onClick={() => setPrivacy('PRIVATE')}
                className={`py-2 px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  privacy === 'PRIVATE'
                    ? 'bg-[var(--theme-accent,#22C55E)] text-[var(--theme-accent-text,#0F172A)] font-bold shadow-md'
                    : 'glass-interactive text-white/70 hover:text-white'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Private</span>
              </button>
            </div>
          </div>

          {/* Photo Attachment Section */}
          <div className="space-y-2 pt-1 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-white/70" />
                <span>Attach Travel Artwork / Photo</span>
              </span>
              <button
                type="button"
                onClick={() => setShowPhotoPicker(!showPhotoPicker)}
                className="text-[11px] text-[var(--theme-accent,#22C55E)] hover:underline cursor-pointer"
              >
                {showPhotoPicker ? 'Hide Palette' : 'Choose Travel Art'}
              </button>
            </div>

            {/* Travel Art Preset Selector */}
            {showPhotoPicker && (
              <div className="p-2.5 rounded-2xl glass-card space-y-2 border border-white/20">
                <p className="text-[10px] text-white/70">
                  Select an authentic travel artwork preset:
                </p>
                <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto pr-1">
                  {THEMES_CATALOG.slice(0, 8).map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => {
                        setSelectedMediaUrl(theme.full_url);
                        setCustomMediaUrl('');
                      }}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                        selectedMediaUrl === theme.full_url
                          ? 'border-[var(--theme-accent,#22C55E)] scale-95 shadow-md'
                          : 'border-white/20 hover:border-white/50'
                      }`}
                    >
                      <img src={theme.thumbnail_url} alt={theme.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1">
                        <span className="text-[8px] font-bold text-white leading-tight truncate">{theme.category_label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Image Preview */}
            {activeMediaUrl && (
              <div className="relative rounded-2xl overflow-hidden border border-white/30 max-h-48 group">
                <img src={activeMediaUrl} alt="Preview" className="w-full h-48 object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMediaUrl('');
                    setCustomMediaUrl('');
                  }}
                  className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl glass-interactive text-xs font-semibold text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (!caption.trim() && !activeMediaUrl)}
              className="px-5 py-2.5 rounded-xl bg-[var(--theme-accent,#22C55E)] text-[var(--theme-accent-text,#0F172A)] text-xs font-bold shadow-lg hover:brightness-105 active:scale-95 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting ? 'Sharing...' : 'Publish Memory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

