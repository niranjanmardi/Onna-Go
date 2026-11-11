// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { SocialPostCard } from '../features/social/SocialPostCard';
import { CreatePostModal } from '../features/social/CreatePostModal';
import { SocialPostItem, PostCommentItem } from '../types';
import { api } from '@/lib/api-client';

const mockUser = {
  id: 'usr_me_123',
  email: 'me@onnago.com',
  full_name: 'Niranjan Mardi',
  username: 'niranjan',
  avatar_url: null,
};

// Mock AuthContext with both path formats
vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    token: 'test-token',
  }),
}));

vi.mock('../features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    token: 'test-token',
  }),
}));

// Mock FeedbackContext with both path formats
vi.mock('@/context/FeedbackContext', () => ({
  useFeedback: () => ({
    playClick: vi.fn(),
    showConfirmation: vi.fn(),
  }),
}));

vi.mock('../context/FeedbackContext', () => ({
  useFeedback: () => ({
    playClick: vi.fn(),
    showConfirmation: vi.fn(),
  }),
}));

describe('Social Feed & Trip Memories Components', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const mockPost: SocialPostItem = {
    id: 'post_101',
    user_id: 'usr_me_123',
    author_name: 'Niranjan Mardi',
    author_username: 'niranjan',
    author_avatar: null,
    trip_id: 'trip_ladakh_1',
    trip_name: 'Ladakh High Altitude Pass',
    caption: 'Sunset over Khardung La pass on bikes!',
    media_urls: ['/themes/wallpapers/ladakh_pangong.webp'],
    location_name: 'Khardung La, Ladakh',
    privacy: 'FRIENDS',
    likes_count: 5,
    is_liked_by_me: false,
    comments_count: 2,
    created_at: new Date().toISOString(),
  };

  it('renders social post card with author, trip link, caption, and media', () => {
    render(
      <BrowserRouter>
        <SocialPostCard post={mockPost} />
      </BrowserRouter>
    );

    const authorElements = screen.getAllByText('Niranjan Mardi');
    expect(authorElements.length).toBeGreaterThan(0);
    expect(screen.getByText('@niranjan')).toBeDefined();
    expect(screen.getByText('Sunset over Khardung La pass on bikes!')).toBeDefined();
    expect(screen.getByText('Khardung La, Ladakh')).toBeDefined();
    expect(screen.getByText('Ladakh High Altitude Pass')).toBeDefined();
    expect(screen.getByText('5')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined();
  });

  it('toggles like optimistically and calls like API', async () => {
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ status: 'success' });

    render(
      <BrowserRouter>
        <SocialPostCard post={mockPost} />
      </BrowserRouter>
    );

    const likeBtn = screen.getByRole('button', { name: 'Like memory' });
    fireEvent.click(likeBtn);

    // Optimistically updated to 6
    expect(screen.getByText('6')).toBeDefined();
    expect(postSpy).toHaveBeenCalledWith('/social/posts/post_101/like', {});
  });

  it('fetches and displays comments when comments button is clicked', async () => {
    const mockComments: PostCommentItem[] = [
      {
        id: 'c_1',
        post_id: 'post_101',
        user_id: 'usr_arun',
        user_name: 'Arun Kumar',
        user_avatar: null,
        comment_text: 'Legendary route! Safe travels bro.',
        created_at: new Date().toISOString(),
      },
    ];

    vi.spyOn(api, 'get').mockResolvedValue(mockComments);

    render(
      <BrowserRouter>
        <SocialPostCard post={mockPost} />
      </BrowserRouter>
    );

    const commentBtn = screen.getByRole('button', { name: 'View comments' });
    fireEvent.click(commentBtn);

    await waitFor(() => {
      expect(screen.getByText('Legendary route! Safe travels bro.')).toBeDefined();
      expect(screen.getByText('Arun Kumar')).toBeDefined();
    });
  });

  it('allows author to delete post and invokes onPostDeleted callback', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const deleteSpy = vi.spyOn(api, 'delete').mockResolvedValue({ message: 'Post deleted successfully' });
    const onDeletedMock = vi.fn();

    render(
      <BrowserRouter>
        <SocialPostCard post={mockPost} onPostDeleted={onDeletedMock} />
      </BrowserRouter>
    );

    // Open author menu
    const menuBtn = screen.getByLabelText('Post options');
    fireEvent.click(menuBtn);

    // Click delete post
    const deleteBtn = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith('/social/posts/post_101');
      expect(onDeletedMock).toHaveBeenCalledWith('post_101');
    });
  });

  it('validates required fields in CreatePostModal and disables submit when empty', () => {
    const onPostCreated = vi.fn();
    render(
      <CreatePostModal
        isOpen={true}
        onClose={vi.fn()}
        onPostCreated={onPostCreated}
      />
    );

    const shareBtn = screen.getByRole('button', { name: /Publish Memory/i }) as HTMLButtonElement;
    expect(shareBtn.disabled).toBe(true);
    expect(onPostCreated).not.toHaveBeenCalled();
  });

  it('submits a valid new memory post with caption and location', async () => {
    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({
      id: 'post_new_999',
      user_id: 'usr_me_123',
      author_name: 'Niranjan Mardi',
      author_username: 'niranjan',
      author_avatar: null,
      trip_id: null,
      trip_name: null,
      caption: 'Golden morning light at sunrise',
      media_urls: ['/themes/wallpapers/thanjavur_temple.webp'],
      location_name: 'Thanjavur, Tamil Nadu',
      privacy: 'FRIENDS',
      likes_count: 0,
      is_liked_by_me: false,
      comments_count: 0,
      created_at: new Date().toISOString(),
    });

    const onPostCreated = vi.fn();
    const onClose = vi.fn();

    render(
      <CreatePostModal
        isOpen={true}
        onClose={onClose}
        onPostCreated={onPostCreated}
      />
    );

    const captionInput = screen.getByPlaceholderText(/What made this trip moment unforgettable/i);
    fireEvent.change(captionInput, { target: { value: 'Golden morning light at sunrise' } });

    const locationInput = screen.getByPlaceholderText(/Add location/i);
    fireEvent.change(locationInput, { target: { value: 'Thanjavur, Tamil Nadu' } });

    const shareBtn = screen.getByRole('button', { name: /Publish Memory/i });
    expect((shareBtn as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(shareBtn);

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalled();
      expect(onPostCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'post_new_999',
          caption: 'Golden morning light at sunrise',
        })
      );
      expect(onClose).toHaveBeenCalled();
    });
  });
});
