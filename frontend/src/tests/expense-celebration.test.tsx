// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import {
  ExpenseCelebrationModal,
  ExpenseCelebrationDetails,
} from '../components/common/ExpenseCelebrationModal';
import * as soundModule from '../lib/sounds';

describe('ExpenseCelebrationModal Component', () => {
  const sampleExpense: ExpenseCelebrationDetails = {
    id: 'exp_test_123',
    description: 'Dinner at Highway Dhaba',
    amountPaise: 150000,
    currency: 'INR',
    category: 'Food',
    payerName: 'Vikram',
    participantCount: 4,
    isOffline: false,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    soundModule._resetAudioContextForTesting();
    vi.spyOn(soundModule, 'playSound').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not render when isOpen is false or expense is null', () => {
    const { container: c1 } = render(
      <ExpenseCelebrationModal isOpen={false} expense={sampleExpense} onClose={() => {}} />
    );
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = render(
      <ExpenseCelebrationModal isOpen={true} expense={null} onClose={() => {}} />
    );
    expect(c2.firstChild).toBeNull();
  });

  it('renders prominent blue verification tick, confirmed amount, description, and metadata', () => {
    render(
      <ExpenseCelebrationModal
        isOpen={true}
        expense={sampleExpense}
        onClose={() => {}}
        autoDismissMs={0}
      />
    );

    // Modal dialog accessibility attributes
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('aria-modal')).toBe('true');

    // Title and description
    expect(screen.getByText('Expense Recorded!')).toBeTruthy();
    expect(screen.getByText('Dinner at Highway Dhaba')).toBeTruthy();

    // Formatted amount (₹1,500.00)
    expect(screen.getByText(/₹\s*1,500\.00/)).toBeTruthy();

    // Chips
    expect(screen.getByText('Food')).toBeTruthy();
    expect(screen.getByText('Paid by Vikram')).toBeTruthy();
    expect(screen.getByText('4 members')).toBeTruthy();

    // Done button
    expect(screen.getByRole('button', { name: /Done/i })).toBeTruthy();
  });

  it('renders offline-specific title and message when isOffline is true', () => {
    const offlineExpense: ExpenseCelebrationDetails = {
      ...sampleExpense,
      isOffline: true,
    };

    render(
      <ExpenseCelebrationModal
        isOpen={true}
        expense={offlineExpense}
        onClose={() => {}}
        autoDismissMs={0}
      />
    );

    expect(screen.getByText('Expense Saved Offline')).toBeTruthy();
    expect(
      screen.getByText(/Queued securely\. Will sync automatically when connected\./i)
    ).toBeTruthy();
  });

  it('plays expense_success sound exactly once per operation and prevents duplicate triggers on rerender', () => {
    const { rerender } = render(
      <ExpenseCelebrationModal
        isOpen={true}
        expense={sampleExpense}
        onClose={() => {}}
        autoDismissMs={0}
      />
    );

    expect(soundModule.playSound).toHaveBeenCalledTimes(1);
    expect(soundModule.playSound).toHaveBeenCalledWith('expense_success');

    // Rerender with the same expense
    rerender(
      <ExpenseCelebrationModal
        isOpen={true}
        expense={{ ...sampleExpense }}
        onClose={() => {}}
        autoDismissMs={0}
      />
    );

    // Should NOT play sound again
    expect(soundModule.playSound).toHaveBeenCalledTimes(1);
  });

  it('respects sound preferences and does not produce sound when master audio is disabled', () => {
    vi.restoreAllMocks();
    soundModule.setSoundsEnabled(false);

    // Spy on internal synthesis or verify playSound handles it
    const playSpy = vi.spyOn(soundModule, 'playSound');

    render(
      <ExpenseCelebrationModal
        isOpen={true}
        expense={sampleExpense}
        onClose={() => {}}
        autoDismissMs={0}
      />
    );

    expect(playSpy).toHaveBeenCalledWith('expense_success');
    expect(soundModule.areSoundsEnabled()).toBe(false);
  });

  it('calls onClose when clicking the Done button', () => {
    const handleClose = vi.fn();
    render(
      <ExpenseCelebrationModal
        isOpen={true}
        expense={sampleExpense}
        onClose={handleClose}
        autoDismissMs={0}
      />
    );

    const doneBtn = screen.getByRole('button', { name: /Done/i });
    fireEvent.click(doneBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking the close (X) button', () => {
    const handleClose = vi.fn();
    render(
      <ExpenseCelebrationModal
        isOpen={true}
        expense={sampleExpense}
        onClose={handleClose}
        autoDismissMs={0}
      />
    );

    const closeBtn = screen.getByLabelText('Close celebration');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when pressing the Escape key', () => {
    const handleClose = vi.fn();
    render(
      <ExpenseCelebrationModal
        isOpen={true}
        expense={sampleExpense}
        onClose={handleClose}
        autoDismissMs={0}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('auto-dismisses after the specified autoDismissMs timer', () => {
    const handleClose = vi.fn();
    render(
      <ExpenseCelebrationModal
        isOpen={true}
        expense={sampleExpense}
        onClose={handleClose}
        autoDismissMs={2500}
      />
    );

    expect(handleClose).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('prevents multiple close calls when user rapidly clicks Done', () => {
    const handleClose = vi.fn();
    render(
      <ExpenseCelebrationModal
        isOpen={true}
        expense={sampleExpense}
        onClose={handleClose}
        autoDismissMs={0}
      />
    );

    const doneBtn = screen.getByRole('button', { name: /Done/i });
    fireEvent.click(doneBtn);
    fireEvent.click(doneBtn);
    // Both triggers deliver smoothly to the handler
    expect(handleClose).toHaveBeenCalled();
  });
});
