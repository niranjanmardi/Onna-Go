// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { UserAvatar, getInitials, getDeterministicGradient } from '../components/common/UserAvatar';

describe('UserAvatar Component & Helpers', () => {
  afterEach(() => {
    cleanup();
  });

  describe('getInitials helper', () => {
    it('returns 2-letter uppercase for single-word names', () => {
      expect(getInitials('John')).toBe('JO');
      expect(getInitials('alice')).toBe('AL');
    });

    it('returns first and last initials for multi-word names', () => {
      expect(getInitials('John Doe')).toBe('JD');
      expect(getInitials('John Middle Doe')).toBe('JD');
      expect(getInitials('Mohan Das Gandhi')).toBe('MG');
    });

    it('returns fallback U for empty, whitespace, or null names', () => {
      expect(getInitials('')).toBe('U');
      expect(getInitials('   ')).toBe('U');
      expect(getInitials(null)).toBe('U');
      expect(getInitials(undefined)).toBe('U');
    });
  });

  describe('getDeterministicGradient helper', () => {
    it('returns consistent gradient for the same seed', () => {
      const grad1 = getDeterministicGradient('Mardi');
      const grad2 = getDeterministicGradient('Mardi');
      expect(grad1).toBe(grad2);
      expect(typeof grad1).toBe('string');
      expect(grad1).toContain('from-');
    });

    it('returns default gradient when seed is empty or null', () => {
      expect(getDeterministicGradient(null)).toBe('from-emerald-500 to-teal-700');
    });
  });

  describe('UserAvatar rendering', () => {
    it('renders initials fallback when avatarUrl is null', () => {
      render(<UserAvatar name="Sarah Connor" avatarUrl={null} size="md" />);
      expect(screen.getByText('SC')).toBeTruthy();
      expect(screen.queryByRole('img')).toBeNull();
    });

    it('renders image when avatarUrl is provided', () => {
      render(
        <UserAvatar
          name="John Doe"
          avatarUrl="/uploads/avatars/john.jpg"
          size="lg"
          alt="John profile"
        />
      );
      const img = screen.getByRole('img');
      expect(img).toBeTruthy();
      expect(img.getAttribute('alt')).toBe('John profile');
    });

    it('falls back to initials when the image fails to load (onError)', () => {
      render(
        <UserAvatar
          name="Broken Image User"
          avatarUrl="/uploads/avatars/404.jpg"
          size="md"
        />
      );

      const img = screen.getByRole('img');
      expect(img).toBeTruthy();

      // Trigger image error
      fireEvent.error(img);

      // After error, image is replaced with initials
      expect(screen.getByText('BU')).toBeTruthy();
      expect(screen.queryByRole('img')).toBeNull();
    });

    it('applies custom shape and size classes properly', () => {
      const { container } = render(
        <UserAvatar
          name="Test User"
          avatarUrl={null}
          size="xl"
          shape="rounded-2xl"
          className="custom-border"
        />
      );

      const avatarBox = container.firstChild as HTMLElement;
      expect(avatarBox.className).toContain('rounded-2xl');
      expect(avatarBox.className).toContain('w-16 h-16');
      expect(avatarBox.className).toContain('custom-border');
    });
  });
});
