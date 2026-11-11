// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import {
  ChatConversationModal,
  ChatMessageItem,
} from '../features/chat/ChatConversationModal';
import { api } from '../lib/api-client';
import * as soundModule from '../lib/sounds';

// Mock useAuth
vi.mock('../features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'usr_me_123',
      email: 'me@onnago.com',
      full_name: 'Niranjan Mardi',
      avatar_url: null,
    },
    token: 'fake-test-token',
  }),
}));

describe('Trip Group Chat Integration & Lifecycle Tests', () => {
  const sampleTripId = 'trip_himalaya_99';
  const sampleTripName = 'Manali High Pass Ride';

  const mockExistingMessages: ChatMessageItem[] = [
    {
      id: 'msg_1',
      conversation_id: 'conv_trip_99',
      sender_id: 'usr_alice_456',
      sender: {
        id: 'usr_alice_456',
        display_name: 'Alice Sharma',
        avatar_url: null,
      },
      message_type: 'TEXT',
      content: 'Bikes fueled and ready for Rohtang Pass!',
      created_at: '2026-11-11T08:00:00Z',
    },
    {
      id: 'msg_2',
      conversation_id: 'conv_trip_99',
      sender_id: 'usr_me_123',
      sender: {
        id: 'usr_me_123',
        display_name: 'Niranjan Mardi',
        avatar_url: null,
      },
      message_type: 'TEXT',
      content: 'I have the first aid kit packed.',
      created_at: '2026-11-11T08:05:00Z',
    },
  ];

  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    soundModule._resetAudioContextForTesting();
    vi.spyOn(soundModule, 'playSound').mockImplementation(() => {});

    // Default API mocks
    vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
      if (url === `/chat/trips/${sampleTripId}/conversation`) {
        return {
          id: 'conv_trip_99',
          type: 'TRIP_GROUP',
          trip_id: sampleTripId,
          title: sampleTripName,
          unread_count: 1,
        };
      }
      if (url === '/chat/conversations/conv_trip_99/messages') {
        return mockExistingMessages;
      }
      return null;
    });

    vi.spyOn(api, 'post').mockImplementation(async (url: string, body?: any) => {
      if (url === '/chat/conversations/conv_trip_99/messages') {
        return {
          id: `msg_new_${Date.now()}`,
          conversation_id: 'conv_trip_99',
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
      if (url === '/chat/conversations/conv_trip_99/read') {
        return { status: 'ok' };
      }
      return {};
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders trip group chat header with trip name, member count, and active status', async () => {
    render(
      <ChatConversationModal
        isOpen={true}
        onClose={() => {}}
        tripId={sampleTripId}
        tripName={sampleTripName}
        memberCount={4}
      />
    );

    // Verify trip group header
    expect(screen.getByText('Manali High Pass Ride')).toBeTruthy();
    expect(screen.getByText(/4 trip members • Active/i)).toBeTruthy();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(`/chat/trips/${sampleTripId}/conversation`);
    });
  });

  it('fetches existing conversation messages and displays sender names for other members', async () => {
    render(
      <ChatConversationModal
        isOpen={true}
        onClose={() => {}}
        tripId={sampleTripId}
        tripName={sampleTripName}
        memberCount={4}
      />
    );

    await waitFor(() => {
      // Alice's message and sender name
      expect(screen.getByText('Alice Sharma')).toBeTruthy();
      expect(screen.getByText('Bikes fueled and ready for Rohtang Pass!')).toBeTruthy();

      // Current user's message
      expect(screen.getByText('I have the first aid kit packed.')).toBeTruthy();
    });
  });

  it('sends a new message successfully, renders it, and plays interaction sound', async () => {
    render(
      <ChatConversationModal
        isOpen={true}
        onClose={() => {}}
        tripId={sampleTripId}
        tripName={sampleTripName}
        memberCount={4}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Bikes fueled and ready for Rohtang Pass!')).toBeTruthy();
    });

    const input = screen.getByPlaceholderText(/Message trip members\.\.\./i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Leaving at 6 AM sharp!' } });
    expect(input.value).toBe('Leaving at 6 AM sharp!');

    const sendBtn = screen.getByRole('button', { name: /Send message/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/chat/conversations/conv_trip_99/messages',
        { content: 'Leaving at 6 AM sharp!' }
      );
      expect(soundModule.playSound).toHaveBeenCalledWith('click');
    });
  });

  it('prevents blank or whitespace-only message submission', async () => {
    render(
      <ChatConversationModal
        isOpen={true}
        onClose={() => {}}
        tripId={sampleTripId}
        tripName={sampleTripName}
      />
    );

    const sendBtn = screen.getByRole('button', { name: /Send message/i });
    expect(sendBtn.hasAttribute('disabled')).toBe(true);

    const input = screen.getByPlaceholderText(/Message trip members\.\.\./i);
    fireEvent.change(input, { target: { value: '    ' } });
    expect(sendBtn.hasAttribute('disabled')).toBe(true);

    fireEvent.submit(sendBtn.closest('form')!);
    expect(api.post).not.toHaveBeenCalledWith(
      '/chat/conversations/conv_trip_99/messages',
      expect.anything()
    );
  });

  it('handles message send network failure gracefully, restores input, and allows retry', async () => {
    vi.spyOn(api, 'post').mockImplementation(async (url: string) => {
      if (url.includes('/messages')) {
        throw new Error('Network timeout. Could not reach server.');
      }
      return {};
    });

    render(
      <ChatConversationModal
        isOpen={true}
        onClose={() => {}}
        tripId={sampleTripId}
        tripName={sampleTripName}
      />
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Message trip members\.\.\./i)).toBeTruthy();
    });

    const input = screen.getByPlaceholderText(/Message trip members\.\.\./i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Important ride update' } });

    const sendBtn = screen.getByRole('button', { name: /Send message/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByText(/Failed to deliver message\. Tap Send to retry\./i)).toBeTruthy();
      // Input text is preserved so user doesn't lose their typed message
      expect(input.value).toBe('Important ride update');
      expect(soundModule.playSound).toHaveBeenCalledWith('error');
    });
  });

  it('triggers notification sound when a new message from another member arrives via polling', async () => {
    render(
      <ChatConversationModal
        isOpen={true}
        onClose={() => {}}
        tripId={sampleTripId}
        tripName={sampleTripName}
        pollIntervalMs={80}
      />
    );

    // Initial load
    await waitFor(() => {
      expect(screen.getByText('Bikes fueled and ready for Rohtang Pass!')).toBeTruthy();
    });

    // Sound should NOT have been played for existing messages on initial load
    expect(soundModule.playSound).not.toHaveBeenCalledWith('notification');

    // Simulate new incoming message arriving on next poll cycle
    const incomingNewMsg: ChatMessageItem = {
      id: 'msg_3_incoming',
      conversation_id: 'conv_trip_99',
      sender_id: 'usr_bob_789',
      sender: {
        id: 'usr_bob_789',
        display_name: 'Bob Builder',
        avatar_url: null,
      },
      message_type: 'TEXT',
      content: 'Traffic clear at toll gate!',
      created_at: new Date().toISOString(),
    };

    vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
      if (url === '/chat/conversations/conv_trip_99/messages') {
        return [...mockExistingMessages, incomingNewMsg];
      }
      return null;
    });

    await waitFor(
      () => {
        expect(screen.getByText('Bob Builder')).toBeTruthy();
        expect(screen.getByText('Traffic clear at toll gate!')).toBeTruthy();
        expect(soundModule.playSound).toHaveBeenCalledWith('notification');
      },
      { timeout: 3000 }
    );
  });

  it('does NOT trigger notification sound when new message is from current user', async () => {
    render(
      <ChatConversationModal
        isOpen={true}
        onClose={() => {}}
        tripId={sampleTripId}
        tripName={sampleTripName}
        pollIntervalMs={80}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Bikes fueled and ready for Rohtang Pass!')).toBeTruthy();
    });

    const myNewMsg: ChatMessageItem = {
      id: 'msg_4_my_own',
      conversation_id: 'conv_trip_99',
      sender_id: 'usr_me_123',
      sender: {
        id: 'usr_me_123',
        display_name: 'Niranjan Mardi',
        avatar_url: null,
      },
      message_type: 'TEXT',
      content: 'I am on my way!',
      created_at: new Date().toISOString(),
    };

    vi.spyOn(api, 'get').mockImplementation(async (url: string) => {
      if (url === '/chat/conversations/conv_trip_99/messages') {
        return [...mockExistingMessages, myNewMsg];
      }
      return null;
    });

    await waitFor(
      () => {
        expect(screen.getByText('I am on my way!')).toBeTruthy();
        expect(soundModule.playSound).not.toHaveBeenCalledWith('notification');
      },
      { timeout: 3000 }
    );
  });
});
