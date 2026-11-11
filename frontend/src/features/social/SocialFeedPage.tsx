import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Compass,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Users,
  User as UserIcon,
  MapPin,
  AlertCircle,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/features/auth/AuthContext';
import { useFeedback } from '@/context/FeedbackContext';
import { SocialPostItem, Trip } from '@/types';
import { SocialPostCard } from './SocialPostCard';
import { CreatePostModal } from './CreatePostModal';

export const SocialFeedPage: React.FC = () => {
  const { user } = useAuth();
  const { playClick } = useFeedback();

  const [posts, setPosts] = useState<SocialPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchParams] = useSearchParams();

  // Filter state
  const [activeFilter, setActiveFilter] = useState<'all' | 'mine' | 'trips'>(() => {
    const f = searchParams.get('filter');
    if (f === 'mine' || f === 'trips') return f;
    return 'all';
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Creation modal state
  const [isCreateOpen, setIsCreateOpen] = useState(() => searchParams.get('action') === 'create');
  const [userTrips, setUserTrips] = useState<Trip[]>([]);

  const fetchFeed = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      let endpoint = '/social/posts?limit=50';
      if (activeFilter === 'mine' && user?.id) {
        endpoint += `&user_id=${user.id}`;
      }
      const data = await api.get<SocialPostItem[]>(endpoint);
      setPosts(data);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Unable to load travel feed. Please verify your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter, user?.id]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Load user trips for post creation
  useEffect(() => {
    api.get<Trip[]>('/trips/')
      .then((res) => setUserTrips(res || []))
      .catch(() => {});
  }, []);

  const handlePostCreated = (newPost: SocialPostItem) => {
    setPosts((prev) => [newPost, ...prev]);
  };

  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handlePostUpdated = (updated: SocialPostItem) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  // Filtered by search query and trips pill
  const filteredPosts = posts.filter((p) => {
    if (activeFilter === 'trips' && !p.trip_id) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.caption && p.caption.toLowerCase().includes(q)) ||
      (p.location_name && p.location_name.toLowerCase().includes(q)) ||
      (p.author_name && p.author_name.toLowerCase().includes(q)) ||
      (p.trip_name && p.trip_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Top Header */}
      <header className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-sm flex items-center gap-2">
              <span>Memories</span>
              <Sparkles className="w-5 h-5 text-[var(--theme-accent,#22C55E)] animate-pulse" />
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-white/70 font-medium mt-0.5">
            Moments, photographs &amp; trip journals from your circle
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              playClick();
              fetchFeed(true);
            }}
            disabled={refreshing}
            className="w-10 h-10 rounded-2xl glass-interactive flex items-center justify-center text-white/80 hover:text-white transition-all cursor-pointer border border-white/25 disabled:opacity-50"
            title="Refresh feed"
            aria-label="Refresh feed"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => {
              playClick();
              setIsCreateOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-[var(--theme-accent,#22C55E)] text-[var(--theme-accent-text,#0F172A)] text-xs font-bold shadow-lg hover:brightness-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Share Memory</span>
          </button>
        </div>
      </header>

      {/* Search & Category Pills */}
      <div className="space-y-3">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memories by caption, city, or traveler..."
            className="w-full h-11 pl-10 pr-4 glass-input text-sm text-white placeholder-white/50 outline-none rounded-2xl"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none select-none">
          <button
            onClick={() => {
              playClick();
              setActiveFilter('all');
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-[var(--theme-accent,#22C55E)] text-[var(--theme-accent-text,#0F172A)] font-bold shadow-md'
                : 'glass-interactive text-white/70 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>All Moments</span>
          </button>

          <button
            onClick={() => {
              playClick();
              setActiveFilter('mine');
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeFilter === 'mine'
                ? 'bg-[var(--theme-accent,#22C55E)] text-[var(--theme-accent-text,#0F172A)] font-bold shadow-md'
                : 'glass-interactive text-white/70 hover:text-white'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>My Memories</span>
          </button>

          <button
            onClick={() => {
              playClick();
              setActiveFilter('trips');
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeFilter === 'trips'
                ? 'bg-[var(--theme-accent,#22C55E)] text-[var(--theme-accent-text,#0F172A)] font-bold shadow-md'
                : 'glass-interactive text-white/70 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Trip Memories</span>
          </button>
        </div>
      </div>

      {/* Feed Stream */}
      {error ? (
        <div className="p-6 glass-card rounded-3xl text-center space-y-3 border border-rose-500/30">
          <AlertCircle className="w-8 h-8 text-rose-300 mx-auto" />
          <p className="text-sm text-white font-medium">{error}</p>
          <button
            onClick={() => fetchFeed()}
            className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-bold text-white transition-colors cursor-pointer"
          >
            Try Again
          </button>
        </div>
      ) : loading ? (
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div key={i} className="glass-card rounded-3xl p-5 space-y-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20" />
                <div className="space-y-1.5">
                  <div className="w-32 h-4 bg-white/20 rounded" />
                  <div className="w-20 h-3 bg-white/10 rounded" />
                </div>
              </div>
              <div className="w-full h-64 bg-white/10 rounded-2xl" />
              <div className="w-3/4 h-4 bg-white/15 rounded" />
            </div>
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="glass-card rounded-3xl p-10 text-center space-y-4 border border-white/20">
          <div className="w-14 h-14 rounded-full bg-white/15 mx-auto flex items-center justify-center text-white/80 border border-white/25">
            <Compass className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">No travel memories yet</h3>
            <p className="text-xs text-white/70 max-w-sm mx-auto mt-1">
              {searchQuery
                ? 'No memories match your search filter.'
                : activeFilter === 'mine'
                ? "You haven't shared any travel moments yet. Publish your first trip memory!"
                : 'Connect with friends or publish a trip memory to fill your feed.'}
            </p>
          </div>
          <button
            onClick={() => {
              playClick();
              setIsCreateOpen(true);
            }}
            className="px-5 py-2.5 rounded-2xl bg-[var(--theme-accent,#22C55E)] text-[var(--theme-accent-text,#0F172A)] text-xs font-bold shadow-md hover:brightness-105 active:scale-95 transition-all inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create First Memory</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredPosts.map((post) => (
            <SocialPostCard
              key={post.id}
              post={post}
              onPostDeleted={handlePostDeleted}
              onPostUpdated={handlePostUpdated}
            />
          ))}
        </div>
      )}

      {/* Creation Modal */}
      {isCreateOpen && (
        <CreatePostModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onPostCreated={handlePostCreated}
          userTrips={userTrips}
        />
      )}
    </div>
  );
};
