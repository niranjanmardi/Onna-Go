// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  areSoundsEnabled,
  setSoundsEnabled,
  getSoundPreferences,
  setSoundPreferences,
  getSoundCategory,
  playSound,
  STORAGE_KEY_MASTER,
  STORAGE_KEY_PREFS,
  LEGACY_STORAGE_KEY,
  _resetAudioContextForTesting,
  SoundType,
} from '../lib/sounds';

describe('ONNA-GO Sound Engine & Preferences', () => {
  beforeEach(() => {
    localStorage.clear();
    _resetAudioContextForTesting();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    _resetAudioContextForTesting();
  });

  describe('Storage Keys & Legacy Migration', () => {
    it('defaults all sound preferences to enabled (true) when storage is empty', () => {
      const prefs = getSoundPreferences();
      expect(prefs.master).toBe(true);
      expect(prefs.expense).toBe(true);
      expect(prefs.trip).toBe(true);
      expect(prefs.notification).toBe(true);
      expect(prefs.interaction).toBe(true);
      expect(areSoundsEnabled()).toBe(true);
    });

    it('safely migrates legacy rupaii_sounds_enabled=false to onnago_sounds_enabled', () => {
      localStorage.setItem(LEGACY_STORAGE_KEY, 'false');

      const prefs = getSoundPreferences();
      expect(prefs.master).toBe(false);
      expect(areSoundsEnabled()).toBe(false);
      // Canonical key should now be set in localStorage
      expect(localStorage.getItem(STORAGE_KEY_MASTER)).toBe('false');
    });

    it('safely migrates legacy rupaii_sounds_enabled=true to onnago_sounds_enabled', () => {
      localStorage.setItem(LEGACY_STORAGE_KEY, 'true');

      const prefs = getSoundPreferences();
      expect(prefs.master).toBe(true);
      expect(areSoundsEnabled()).toBe(true);
      expect(localStorage.getItem(STORAGE_KEY_MASTER)).toBe('true');
    });

    it('prioritizes canonical onnago_sounds_enabled when both exist', () => {
      localStorage.setItem(STORAGE_KEY_MASTER, 'false');
      localStorage.setItem(LEGACY_STORAGE_KEY, 'true');

      const prefs = getSoundPreferences();
      expect(prefs.master).toBe(false);
      expect(areSoundsEnabled()).toBe(false);
    });
  });

  describe('Granular Sound Preferences', () => {
    it('updates master toggle and persists to localStorage', () => {
      setSoundsEnabled(false);
      expect(localStorage.getItem(STORAGE_KEY_MASTER)).toBe('false');
      expect(areSoundsEnabled()).toBe(false);
      expect(getSoundPreferences().master).toBe(false);

      setSoundsEnabled(true);
      expect(localStorage.getItem(STORAGE_KEY_MASTER)).toBe('true');
      expect(areSoundsEnabled()).toBe(true);
      expect(getSoundPreferences().master).toBe(true);
    });

    it('allows toggling individual categories independently', () => {
      setSoundPreferences({
        expense: false,
        trip: true,
        notification: false,
        interaction: true,
      });

      const prefs = getSoundPreferences();
      expect(prefs.master).toBe(true);
      expect(prefs.expense).toBe(false);
      expect(prefs.trip).toBe(true);
      expect(prefs.notification).toBe(false);
      expect(prefs.interaction).toBe(true);

      const storedPrefs = JSON.parse(localStorage.getItem(STORAGE_KEY_PREFS) || '{}');
      expect(storedPrefs.expense).toBe(false);
      expect(storedPrefs.notification).toBe(false);
      expect(storedPrefs.trip).toBe(true);
    });

    it('dispatches onnago_sound_preference_changed event when preferences update', () => {
      const listener = vi.fn();
      window.addEventListener('onnago_sound_preference_changed', listener);

      setSoundPreferences({ expense: false });
      expect(listener).toHaveBeenCalledTimes(1);

      setSoundsEnabled(false);
      expect(listener).toHaveBeenCalledTimes(2);

      window.removeEventListener('onnago_sound_preference_changed', listener);
    });
  });

  describe('Sound Category Mapping', () => {
    it('maps all SoundTypes to their correct category', () => {
      expect(getSoundCategory('expense_success')).toBe('expense');
      expect(getSoundCategory('settlement_success')).toBe('expense');
      expect(getSoundCategory('trip_success')).toBe('trip');
      expect(getSoundCategory('notification')).toBe('notification');
      expect(getSoundCategory('click')).toBe('interaction');
      expect(getSoundCategory('error')).toBe('interaction');
    });
  });

  describe('Audio Playback Gating', () => {
    let mockOscillator: any;
    let mockGain: any;
    let mockAudioCtx: any;

    beforeEach(() => {
      _resetAudioContextForTesting();

      mockOscillator = {
        type: 'sine',
        frequency: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };

      mockGain = {
        gain: {
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      };

      mockAudioCtx = {
        state: 'running',
        currentTime: 0,
        destination: {},
        createOscillator: vi.fn(() => mockOscillator),
        createGain: vi.fn(() => mockGain),
        resume: vi.fn().mockResolvedValue(undefined),
      };

      function MockAudioContext(this: any) {
        return mockAudioCtx;
      }
      (window as any).AudioContext = MockAudioContext;
      (window as any).webkitAudioContext = MockAudioContext;
    });

    it('does not synthesize sound when master audio is disabled', () => {
      setSoundsEnabled(false);

      playSound('expense_success');
      playSound('trip_success');
      playSound('click');

      expect(mockAudioCtx.createOscillator).not.toHaveBeenCalled();
    });

    it('does not synthesize sound when specific category is disabled', () => {
      setSoundPreferences({ master: true, expense: false, trip: true });

      playSound('expense_success');
      expect(mockAudioCtx.createOscillator).not.toHaveBeenCalled();

      // Trip sounds should still play because category is enabled
      playSound('trip_success');
      expect(mockAudioCtx.createOscillator).toHaveBeenCalled();
    });

    it('synthesizes sound when both master and category are enabled', () => {
      setSoundPreferences({ master: true, notification: true });

      playSound('notification');
      expect(mockAudioCtx.createOscillator).toHaveBeenCalled();
      expect(mockOscillator.start).toHaveBeenCalled();
    });

    it('deduplicates rapid consecutive sound triggers within 120ms', () => {
      setSoundsEnabled(true);

      playSound('click');
      const firstCallCount = mockAudioCtx.createOscillator.mock.calls.length;
      expect(firstCallCount).toBeGreaterThan(0);

      // Rapid immediate second call of same sound type
      playSound('click');
      expect(mockAudioCtx.createOscillator.mock.calls.length).toBe(firstCallCount);
    });
  });
});
