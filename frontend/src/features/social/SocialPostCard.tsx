import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  MessageCircle,
  MapPin,
  Compass,
  MoreVertical,
  Trash2,
  Edit,
  Send,
  Globe,
  Users,
  Lock,
} from 'lucide-react';
import { api, getAvatarUrl } from '@/lib/api-client';
import { useFeedback } from '@/context/FeedbackContext';
import { useAuth } from '@/features/auth/AuthContext';
import { SocialPostItem, PostCommentItem } from '@/types';
import { EditPostModal } from './EditPostModal';
import { UserAvatar } from '@/components/common/UserAvatar';

interface SocialPostCardProps {
  post: SocialPostItem;
  onPostDeleted?: (postId: string) => void;
  onPostUpdated?: (updated: SocialPostItem) => void;
}

export const SocialPostCard: React.FC<SocialPostCardProps> = ({
  post,
  onPostDeleted,
  onPostUpdated,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playClick, showConfirmation } = useFeedback();

  const [isLiked, setIsLiked] = useState(post.is_liked_by_me);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [isLiking, setIsLiking] = useState(false);

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<PostCommentItem[]>([]);
  const [commentsCount, setCommentsCount] = useState(post.comments_count);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const [showMenu, setShowMenu] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAuthor = Boolean(user?.id && (user.id === post.user_id || user.id === (post as any).author_id));

  const handleToggleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);

    const prevLiked = isLiked;
    const prevCount = likesCount;

    // Optimistic update
    setIsLiked(!prevLiked);
    setLikesCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);
    playClick();

    try {
      const res = await api.post<{ liked: boolean; likes_count: number }>(
        `/social/posts/${post.id}/like`,
        {}
      );
      setIsLiked(res.liked);
      setLikesCount(res.likes_count);
    } catch {
      // Revert on failure
      setIsLiked(prevLiked);
      setLikesCount(prevCount);
    } finally {
      setIsLiking(false);
    }
  };

  const handleToggleComments = async () => {
    playClick();
    const nextState = !showComments;
    setShowComments(nextState);

    if (nextState && comments.length === 0) {
      setIsLoadingComments(true);
      try {
        const res = await api.get<PostCommentItem[]>(`/social/posts/${post.id}/comments`);
        setComments(res);
      } catch {
        // Ignore failure
      } finally {
        setIsLoadingComments(false);
      }
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    const content = commentText.trim();
    setCommentText('');

    try {
      const newComment = await api.post<PostCommentItem>(`/social/posts/${post.id}/comments`, {
        content,
      });
      playClick();
      setComments((prev) => [...prev, newComment]);
      setCommentsCount((prev) => prev + 1);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to post comment.');
      setCommentText(content);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm('Are you sure you want to delete this travel memory?')) return;
    setIsDeleting(true);
    playClick();

    try {
      await api.delete(`/social/posts/${post.id}`);
      showConfirmation({
        title: 'Memory Deleted',
        message: 'Your post has been removed.',
        sound: 'notification',
      });
      onPostDeleted?.(post.id);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to delete post.');
    } finally {
      setIsDeleting(false);
      setShowMenu(false);
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);
      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <>
      <article className="glass-card rounded-3xl overflow-hidden border border-white/25 shadow-xl transition-all duration-200 hover:border-white/40">
        {/* Card Header */}
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <UserAvatar
              name={post.author_name}
              avatarUrl={post.author_avatar}
              size="md"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-bold text-white tracking-tight truncate">
                  {post.author_name}
                </span>
                {post.author_username && (
                  <span className="text-[11px] text-white/60">@{post.author_username}</span>
                )}
                <span className="text-[10px] text-white/40">• {formatTime(post.created_at)}</span>
              </div>

              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {post.location_name && (
                  <span className="text-[11px] text-[var(--theme-accent,#22C55E)] flex items-center gap-0.5 font-medium">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate max-w-[140px] sm:max-w-[200px]">
                      {post.location_name}
                    </span>
                  </span>
                )}

                {post.trip_name && (
                  <button
                    onClick={() => post.trip_id && navigate(`/trips/${post.trip_id}`)}
                    className="text-[10px] font-semibold text-white/80 bg-white/15 hover:bg-white/25 px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors cursor-pointer border border-white/20"
                    title={`View ${post.trip_name}`}
                  >
                    <Compass className="w-2.5 h-2.5 text-[var(--theme-accent,#22C55E)]" />
                    <span className="truncate max-w-[120px]">{post.trip_name}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Privacy & Author Menu */}
          <div className="flex items-center gap-1.5 shrink-0 relative">
            <span
              className="p-1 text-white/50"
              title={
                post.privacy === 'PUBLIC'
                  ? 'Public'
                  : post.privacy === 'FRIENDS'
                  ? 'Friends Only'
                  : 'Trip Members Only'
              }
            >
              {post.privacy === 'PUBLIC' ? (
                <Globe className="w-3.5 h-3.5" />
              ) : post.privacy === 'FRIENDS' ? (
                <Users className="w-3.5 h-3.5" />
              ) : (
                <Lock className="w-3.5 h-3.5" />
              )}
            </span>

            {isAuthor && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1.5 text-white/60 hover:text-white glass-interactive rounded-xl transition-colors cursor-pointer"
                  aria-label="Post options"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {showMenu && (
                  <div className="absolute right-0 top-full mt-1 w-36 glass-modal rounded-2xl border border-white/30 shadow-2xl py-1.5 z-20 animate-in fade-in zoom-in-95">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setIsEditOpen(true);
                      }}
                      className="w-full px-3 py-2 text-left text-xs text-white hover:bg-white/15 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit caption</span>
                    </button>
                    <button
                      onClick={handleDeletePost}
                      disabled={isDeleting}
                      className="w-full px-3 py-2 text-left text-xs text-rose-300 hover:bg-rose-500/20 flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Media Photo */}
        {post.media_urls && post.media_urls.length > 0 && (
          <div className="relative w-full bg-black/40 overflow-hidden border-b border-white/10 group">
            <img
              src={post.media_urls[0]}
              alt={post.caption || 'Travel memory'}
              loading="lazy"
              className="w-full max-h-[460px] object-cover transition-transform duration-300 group-hover:scale-[1.01]"
            />
          </div>
        )}

        {/* Action Bar */}
        <div className="px-4 py-3 sm:px-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Like Button */}
            <button
              onClick={handleToggleLike}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                isLiked
                  ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40 shadow-xs'
                  : 'glass-interactive text-white/80 hover:text-white'
              }`}
              aria-label={isLiked ? 'Unlike memory' : 'Like memory'}
            >
              <Heart
                className={`w-4 h-4 transition-transform ${
                  isLiked ? 'fill-rose-400 text-rose-400 scale-110' : 'text-white/80'
                }`}
              />
              <span className="tabular-nums font-bold">{likesCount}</span>
            </button>

            {/* Comments Button */}
            <button
              onClick={handleToggleComments}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                showComments
                  ? 'bg-white/25 text-white border border-white/40 shadow-xs'
                  : 'glass-interactive text-white/80 hover:text-white'
              }`}
              aria-label="View comments"
            >
              <MessageCircle className="w-4 h-4 text-white/80" />
              <span className="tabular-nums font-bold">{commentsCount}</span>
            </button>
          </div>
        </div>

        {/* Caption */}
        {post.caption && (
          <div className="px-4 pb-4 sm:px-5 text-sm text-white/90 leading-relaxed font-normal whitespace-pre-wrap">
            <span className="font-bold text-white mr-2">{post.author_name}</span>
            {post.caption}
          </div>
        )}

        {/* Inline Comments Section */}
        {showComments && (
          <div className="px-4 pb-4 sm:px-5 border-t border-white/10 pt-3 space-y-3 bg-black/20">
            {isLoadingComments ? (
              <div className="py-3 text-center text-xs text-white/60 animate-pulse">
                Loading comments...
              </div>
            ) : comments.length === 0 ? (
              <p className="text-xs text-white/50 italic py-1">
                No comments yet. Leave a thought for {post.author_name}!
              </p>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-2 text-xs">
                    <span className="font-bold text-white shrink-0">{c.user_name}</span>
                    <span className="text-white/80 break-words flex-1">{c.comment_text}</span>
                    <span className="text-[10px] text-white/40 shrink-0">
                      {formatTime(c.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Comment Composer */}
            <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 h-9 px-3 glass-input text-xs text-white placeholder-white/50 outline-none rounded-xl"
              />
              <button
                type="submit"
                disabled={!commentText.trim() || isSubmittingComment}
                className="w-9 h-9 rounded-xl bg-[var(--theme-accent,#22C55E)] text-[var(--theme-accent-text,#0F172A)] flex items-center justify-center disabled:opacity-40 hover:brightness-105 active:scale-95 transition-all cursor-pointer shrink-0"
                aria-label="Send comment"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </article>

      {/* Edit Modal */}
      {isEditOpen && (
        <EditPostModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          post={post}
          onPostUpdated={(updated) => {
            onPostUpdated?.(updated);
          }}
        />
      )}
    </>
  );
};
