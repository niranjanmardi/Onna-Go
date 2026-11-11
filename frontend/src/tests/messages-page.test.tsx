// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MessagesPage } from '../features/messages/MessagesPage';
import { ActiveConversationView } from '../features/messages/ActiveConversationView';
import { api } from '../lib/api-client';
import * as soundModule from '../lib/sounds';

// Mock useAuth
vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'usr_me_123',
      email: 'me@onnago.com',
      full_name: 'Niranjan Mardi',
      username: 'mardi',
      avatar_url: null,
    },
    token: 'fake-test-token',
  }),
}));

vi.mock('../features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'usr_me_123',
      email: 'me@onnago.com',
      full_name: 'Niranjan Mardi',
      username: 'mardi',
      avatar_url: null,
    },
    token: 'fake-test-token',
  }),
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
let mockParams: Record<string, string> = {};
let mockSearchParams = new URLSearchParams();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
  useSearchParams: () => [mockSearchParams, vi.fn()],
}));

// Mock FeedbackContext
vi.mock('@/context/FeedbackContext', () => ({
  useFeedback: () => ({
    playClick: vi.fn(),
    showConfirmation: vi.fn(),
    soundsEnabled: true,
    setSoundsEnabled: vi.fn(),
    unreadCount: 0,
    refreshUnreadCount: vi.fn(),
  }),
}));

vi.mock('../context/FeedbackContext', () => ({
  useFeedback: () => ({
    playClick: vi.fn(),
    showConfirmation: vi.fn(),
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

describe('Instagram-Inspired Messages Page & ActiveConversationView', () => {
  const mockConversations = [
    {
      id: 'conv_direct_1',
      type: 'DIRECT' as const,
      title: 'Praveen Kumar',
      last_message_preview: 'Let us ride via Charmadi Ghat tomorrow!',
      last_message_at: '2026-11-11T08:00:00Z',
      unread_count: 2,
      other_member: {
        id: 'usr_praveen_456',
        display_name: 'Praveen Kumar',
        avatar_url: null,
      },
      created_at: '2026-11-10T10:00:00Z',
    },
    {
      id: 'conv_trip_2',
      type: 'TRIP_GROUP' as const,
      trip_id: 'trip_coorg_789',
      title: 'Coorg Coffee Ride',
      last_message_preview: 'Homestay booking confirmed for 4 riders',
      last_message_at: '2026-11-11T07:30:00Z',
      unread_count: 0,
      other_member: null,
      created_at: '2026-11-09T08:00:00Z',
    },
  ];

  const mockMessages = [
    {
      id: 'msg_1',
      conversation_id: 'conv_direct_1',
      sender_id: 'usr_praveen_456',
      sender: {
        id: 'usr_praveen_456',
        display_name: 'Praveen Kumar',
        avatar_url: null,
      },
      message_type: 'TEXT',
      content: 'Hey Niranjan, is the route finalized?',
      created_at: '2026-11-11T07:55:00Z',
    },
    {
      id: 'msg_2',
      conversation_id: 'conv_direct_1',
      sender_id: 'usr_me_123',
      sender: {
        id: 'usr_me_123',
        display_name: 'Niranjan Mardi',
        avatar_url: null,
      },
      message_type: 'TEXT',
      content: 'Yes! Let us ride via Charmadi Ghat tomorrow!',
      created_at: '2026-11-11T08:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = {};
    mockSearchParams = new URLSearchParams();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders Messages inbox with conversation list, titles, previews, and unread badges', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (path: string) => {
      if (path === '/chat/conversations') {
        return mockConversations;
      }
      return [];
    });

    render(<MessagesPage />);

    // Header and conversations list
    await waitFor(() => {
      expect(screen.getByText('Messages')).toBeTruthy();
      expect(screen.getByText('@mardi')).toBeTruthy();
      expect(screen.getByText('Praveen Kumar')).toBeTruthy();
      expect(screen.getByText(/Charmadi Ghat/i)).toBeTruthy();
      expect(screen.getByText('Coorg Coffee Ride')).toBeTruthy();
      expect(screen.getByText(/Homestay booking confirmed/i)).toBeTruthy();
    });

    // Unread count badge
    expect(screen.getByText('2')).toBeTruthy();

    // Desktop empty state placeholder is shown when no conversation is selected
    expect(screen.getByText('Your Messages')).toBeTruthy();
  });

  it('filters conversation list when typing in search bar', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (path: string) => {
      if (path === '/chat/conversations') {
        return mockConversations;
      }
      return [];
    });

    render(<MessagesPage />);

    await waitFor(() => {
      expect(screen.getByText('Praveen Kumar')).toBeTruthy();
      expect(screen.getByText('Coorg Coffee Ride')).toBeTruthy();
    });

    // Type in search query
    const searchInput = screen.getByPlaceholderText(/search conversations/i);
    fireEvent.change(searchInput, { target: { value: 'Coorg' } });

    // Coorg should remain visible, Praveen should be filtered out
    expect(screen.getByText('Coorg Coffee Ride')).toBeTruthy();
    expect(screen.queryByText('Praveen Kumar')).toBeNull();
  });

  it('filters by category pills (Direct vs Trips)', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (path: string) => {
      if (path === '/chat/conversations') {
        return mockConversations;
      }
      return [];
    });

    render(<MessagesPage />);

    await waitFor(() => {
      expect(screen.getByText('Praveen Kumar')).toBeTruthy();
      expect(screen.getByText('Coorg Coffee Ride')).toBeTruthy();
    });

    // Click "Direct" category pill
    const directBtn = screen.getByRole('button', { name: /^direct$/i });
    fireEvent.click(directBtn);

    expect(screen.getByText('Praveen Kumar')).toBeTruthy();
    expect(screen.queryByText('Coorg Coffee Ride')).toBeNull();

    // Click "Trips" category pill
    const tripBtn = screen.getByRole('button', { name: /^trips$/i });
    fireEvent.click(tripBtn);

    expect(screen.getByText('Coorg Coffee Ride')).toBeTruthy();
    expect(screen.queryByText('Praveen Kumar')).toBeNull();
  });

  it('renders ActiveConversationView with header, date separators, and message bubbles', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (path: string) => {
      if (path.startsWith('/chat/conversations/conv_direct_1/messages')) {
        return mockMessages;
      }
      return [];
    });

    vi.spyOn(api, 'post').mockResolvedValue({ status: 'ok' });

    render(
      <ActiveConversationView
        conversationId="conv_direct_1"
        friendName="Praveen Kumar"
        friendUsername="praveen_k"
        showBackButton={true}
        onBack={vi.fn()}
      />
    );

    // Verify conversation header
    await waitFor(() => {
      expect(screen.getByText('Praveen Kumar')).toBeTruthy();
      expect(screen.getByText('@praveen_k')).toBeTruthy();
    });

    // Verify messages
    expect(screen.getByText('Hey Niranjan, is the route finalized?')).toBeTruthy();
    expect(screen.getByText('Yes! Let us ride via Charmadi Ghat tomorrow!')).toBeTruthy();

    // Verify date separator
    expect(screen.getByText(/Today|Yesterday/i)).toBeTruthy();
  });

  it('sends a new message optimistically, calls backend API, and plays sound', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (path: string) => {
      if (path.startsWith('/chat/conversations/conv_direct_1/messages')) {
        return mockMessages;
      }
      return [];
    });

    const postSpy = vi.spyOn(api, 'post').mockImplementation(async (path: string, body?: any) => {
      if (path === '/chat/conversations/conv_direct_1/messages') {
        return {
          id: 'msg_3',
          conversation_id: 'conv_direct_1',
          sender_id: 'usr_me_123',
          sender: {
            id: 'usr_me_123',
            display_name: 'Niranjan Mardi',
            avatar_url: null,
          },
          message_type: 'TEXT',
          content: body?.content || '',
          created_at: new Date().toISOString(),
        };
      }
      return { status: 'ok' };
    });

    render(
      <ActiveConversationView
        conversationId="conv_direct_1"
        friendName="Praveen Kumar"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Praveen Kumar')).toBeTruthy();
    });

    // Type message
    const input = screen.getByPlaceholderText(/message praveen kumar/i);
    fireEvent.change(input, { target: { value: 'Meet at 6 AM at Nelamangala toll gate' } });

    // Click Send
    const sendBtn = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendBtn);

    // Verify API called and message rendered
    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith('/chat/conversations/conv_direct_1/messages', {
        content: 'Meet at 6 AM at Nelamangala toll gate',
      });
      expect(screen.getByText('Meet at 6 AM at Nelamangala toll gate')).toBeTruthy();
      expect(soundModule.playSound).toHaveBeenCalledWith('click');
    });

    // Input should be cleared
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('handles send failure gracefully by retaining input text and showing retry banner', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (path: string) => {
      if (path.startsWith('/chat/conversations/conv_direct_1/messages')) {
        return mockMessages;
      }
      return [];
    });

    vi.spyOn(api, 'post').mockImplementation(async (path: string) => {
      if (path === '/chat/conversations/conv_direct_1/messages') {
        throw new Error('Network error delivering message');
      }
      return { status: 'ok' };
    });

    render(
      <ActiveConversationView
        conversationId="conv_direct_1"
        friendName="Praveen Kumar"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Praveen Kumar')).toBeTruthy();
    });

    const input = screen.getByPlaceholderText(/message praveen kumar/i);
    fireEvent.change(input, { target: { value: 'Test failing message' } });

    const sendBtn = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendBtn);

    // Verify retry banner appears and typed text is preserved in input
    await waitFor(() => {
      expect(screen.getByText(/failed to send message/i)).toBeTruthy();
      expect((input as HTMLInputElement).value).toBe('Test failing message');
    });
  });
});

