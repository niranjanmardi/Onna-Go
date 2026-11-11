import React, { useState } from 'react';
import { X, MapPin, Globe, Users, Lock, AlertCircle, Edit3 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useFeedback } from '@/context/FeedbackContext';
import { SocialPostItem } from '@/types';

interface EditPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: SocialPostItem;
  onPostUpdated: (updated: SocialPostItem) => void;
}

export const EditPostModal: React.FC<EditPostModalProps> = ({
  isOpen,
  onClose,
  post,
  onPostUpdated,
}) => {
  const { playClick, showConfirmation } = useFeedback();
  const [caption, setCaption] = useState(post.caption || '');
  const [locationName, setLocationName] = useState(post.location_name || '');
  const [privacy, setPrivacy] = useState<'PUBLIC' | 'FRIENDS' | 'PRIVATE'>(post.privacy);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        caption: caption.trim() || null,
        location_name: locationName.trim() || null,
        privacy,
      };

      const res = await api.put<SocialPostItem>(`/social/posts/${post.id}`, payload);
      playClick();
      showConfirmation({
        title: 'Memory Updated',
        message: 'Your post edits have been saved.',
        sound: 'trip_success',
      });
      onPostUpdated(res);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to update post.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-post-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="glass-modal relative w-full max-w-md rounded-3xl border border-white/30 flex flex-col overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-white/20 flex items-center justify-between shrink-0 glass-nav">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-white" />
            <h2 id="edit-post-title" className="text-sm font-bold text-white tracking-tight">
              Edit Memory
            </h2>
          </div>
          <button
            onClick={() => {
              playClick();
              onClose();
            }}
            className="p-1.5 rounded-xl text-white/70 hover:text-white glass-interactive transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/80">Caption</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              maxLength={2000}
              className="w-full p-3.5 glass-input text-sm text-white placeholder-white/50 outline-none rounded-2xl resize-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/80">Location</label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="Location..."
                className="w-full h-11 pl-10 pr-3.5 glass-input text-sm text-white outline-none rounded-xl"
              />
            </div>
          </div>

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

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl glass-interactive text-xs font-semibold text-white/80"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[var(--theme-accent,#22C55E)] text-[var(--theme-accent-text,#0F172A)] text-xs font-bold shadow-md hover:brightness-105 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

