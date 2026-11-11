// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { FriendsPage } from '../features/friends/FriendsPage';
import { api } from '../lib/api-client';

// Mock useAuth
vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'usr_current',
      email: 'me@onnago.com',
      full_name: 'My Account',
      username: 'my_acct',
      avatar_url: null,
    },
    token: 'fake-test-token',
  }),
}));

vi.mock('../features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'usr_current',
      email: 'me@onnago.com',
      full_name: 'My Account',
      username: 'my_acct',
      avatar_url: null,
    },
    token: 'fake-test-token',
  }),
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock FeedbackContext
vi.mock('@/context/FeedbackContext', () => ({
  useFeedback: () => ({
    showConfirmation: vi.fn(),
    playClick: vi.fn(),
    soundsEnabled: true,
    setSoundsEnabled: vi.fn(),
    unreadCount: 0,
    refreshUnreadCount: vi.fn(),
  }),
}));

vi.mock('../context/FeedbackContext', () => ({
  useFeedback: () => ({
    showConfirmation: vi.fn(),
    playClick: vi.fn(),
    soundsEnabled: true,
    setSoundsEnabled: vi.fn(),
    unreadCount: 0,
    refreshUnreadCount: vi.fn(),
  }),
}));

// Mock sound module
vi.mock('@/lib/sounds', () => ({
  playSound: vi.fn(),
  areSoundsEnabled: () => true,
  setSoundsEnabled: vi.fn(),
  _resetAudioContextForTesting: vi.fn(),
}));

vi.mock('../lib/sounds', () => ({
  playSound: vi.fn(),
  areSoundsEnabled: () => true,
  setSoundsEnabled: vi.fn(),
  _resetAudioContextForTesting: vi.fn(),
}));

describe('FriendsPage & Friend Request Workflow Tests', () => {
  const mockFriends = [
    {
      id: 'usr_friend_1',
      username: 'bikerrider',
      display_name: 'Biker Rider',
      avatar_url: null,
      city: 'Bengaluru',
      bio: 'Loves ghat roads',
      created_at: '2026-11-01T10:00:00Z',
    },
  ];

  const mockRequests = {
    incoming: [
      {
        id: 'req_inc_1',
        requester_id: 'usr_sender_2',
        requester_name: 'Rohan Sharma',
        requester_username: 'rohan_s',
        requester_avatar: null,
        addressee_id: 'usr_current',
        addressee_name: 'My Account',
        addressee_username: 'my_acct',
        addressee_avatar: null,
        status: 'PENDING',
        created_at: '2026-11-10T12:00:00Z',
      },
    ],
    outgoing: [
      {
        id: 'req_out_1',
        requester_id: 'usr_current',
        requester_name: 'My Account',
        requester_username: 'my_acct',
        requester_avatar: null,
        addressee_id: 'usr_target_3',
        addressee_name: 'Ananya Roy',
        addressee_username: 'ananya_r',
        addressee_avatar: null,
        status: 'PENDING',
        created_at: '2026-11-10T13:00:00Z',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders friends list and pending requests count badge correctly', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (path: string) => {
      if (path === '/friends' || path === '/friends/') {
        return mockFriends;
      }
      if (path === '/friends/requests' || path === '/friends/requests/') {
        return mockRequests;
      }
      return [];
    });

    render(<FriendsPage />);

    // Check header and friend item
    await waitFor(() => {
      expect(screen.getByText('Biker Rider')).toBeTruthy();
      expect(screen.getByText('@bikerrider')).toBeTruthy();
    });

    // Check Requests tab badge shows 1 incoming
    const badges = screen.getAllByText('1');
    expect(badges.length).toBeGreaterThan(0);
  });

  it('searches for a user and sends a friend request with robust payload', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (path: string) => {
      if (path === '/friends' || path === '/friends/') return [];
      if (path === '/friends/requests') return { incoming: [], outgoing: [] };
      if (path.startsWith('/friends/search')) {
        return [
          {
            id: 'usr_target_4',
            username: 'praveen_k',
            display_name: 'Praveen Kumar',
            avatar_url: null,
            city: 'Chennai',
            bio: 'Bullet 350',
            created_at: '2026-10-01T00:00:00Z',
            relationship_status: 'none',
            request_id: null,
          },
        ];
      }
      return [];
    });

    const postSpy = vi.spyOn(api, 'post').mockImplementation(async (path: string) => {
      if (path === '/friends/request') {
        return {
          message: 'Friend request sent successfully.',
          status: 'PENDING',
          id: 'new_req_4',
        };
      }
      return {};
    });

    render(<FriendsPage />);

    // Click "Find Friends" button in the tabs
    const findTabs = screen.getAllByText(/find friends/i);
    fireEvent.click(findTabs[findTabs.length - 1]);

    // Enter search query with @
    const searchInput = screen.getByPlaceholderText(/rider_alex/i);
    fireEvent.change(searchInput, { target: { value: '@praveen_k' } });

    // Click Search button
    const searchBtn = screen.getByRole('button', { name: /^search$/i });
    fireEvent.click(searchBtn);

    // Wait for search result
    await waitFor(() => {
      expect(screen.getByText('Praveen Kumar')).toBeTruthy();
      expect(screen.getByText('@praveen_k')).toBeTruthy();
    });

    // Click Add button
    const addBtn = screen.getByRole('button', { name: /^add$/i });
    fireEvent.click(addBtn);

    // Verify api.post was called with friend_id and username_or_uid
    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith('/friends/request', {
        friend_id: 'usr_target_4',
        username_or_uid: 'praveen_k',
      });
    });

    // Status should transition to Cancel button (pending_outgoing)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^cancel$/i })).toBeTruthy();
    });
  });

  it('accepts incoming friend request from requests tab', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (path: string) => {
      if (path === '/friends') return [];
      if (path === '/friends/requests') return mockRequests;
      return [];
    });

    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({
      message: 'Friend request accepted! You are now friends.',
    });

    render(<FriendsPage />);

    // Switch to Requests tab
    const reqTab = screen.getByRole('button', { name: /requests/i });
    fireEvent.click(reqTab);

    // Verify incoming request card is visible
    await waitFor(() => {
      expect(screen.getByText('Rohan Sharma')).toBeTruthy();
      expect(screen.getByText('@rohan_s')).toBeTruthy();
    });

    // Click Accept button
    const acceptBtn = screen.getByRole('button', { name: /^accept$/i });
    fireEvent.click(acceptBtn);

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith('/friends/requests/req_inc_1/accept');
    });
  });

  it('declines incoming friend request from requests tab', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (path: string) => {
      if (path === '/friends') return [];
      if (path === '/friends/requests') return mockRequests;
      return [];
    });

    const postSpy = vi.spyOn(api, 'post').mockResolvedValue({
      message: 'Friend request declined.',
    });

    render(<FriendsPage />);

    // Switch to Requests tab
    const reqTab = screen.getByRole('button', { name: /requests/i });
    fireEvent.click(reqTab);

    await waitFor(() => {
      expect(screen.getByText('Rohan Sharma')).toBeTruthy();
    });

    // Click Decline button
    const declineBtn = screen.getByRole('button', { name: /^decline$/i });
    fireEvent.click(declineBtn);

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith('/friends/requests/req_inc_1/decline');
    });
  });

  it('cancels outgoing friend request from requests tab', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (path: string) => {
      if (path === '/friends') return [];
      if (path === '/friends/requests') return mockRequests;
      return [];
    });

    const deleteSpy = vi.spyOn(api, 'delete').mockResolvedValue({
      message: 'Friend request cancelled.',
    });

    render(<FriendsPage />);

    // Switch to Requests tab
    const reqTab = screen.getByRole('button', { name: /requests/i });
    fireEvent.click(reqTab);

    await waitFor(() => {
      expect(screen.getByText('Ananya Roy')).toBeTruthy();
    });

    // Click Cancel button in outgoing section
    const cancelBtn = screen.getByRole('button', { name: /^cancel$/i });
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith('/friends/requests/req_out_1/cancel');
    });
  });
});
