/**
 * ONNA-GO Subtle Audio Engine
 * Lightweight, original synthesized Web Audio sound feedback.
 * No external audio files or proprietary assets.
 * Respects browser autoplay restrictions and user preferences.
 */

export type SoundType =
  | 'click'
  | 'trip_success'
  | 'expense_success'
  | 'settlement_success'
  | 'notification'
  | 'error';

export interface SoundPreferences {
  master: boolean;
  expense: boolean;
  trip: boolean;
  notification: boolean;
  interaction: boolean;
}

export const STORAGE_KEY_MASTER = 'onnago_sounds_enabled';
export const STORAGE_KEY_PREFS = 'onnago_sound_preferences';
export const LEGACY_STORAGE_KEY = 'rupaii_sounds_enabled';

const DEFAULT_PREFERENCES: SoundPreferences = {
  master: true,
  expense: true,
  trip: true,
  notification: true,
  interaction: true,
};

// Global AudioContext singleton (lazily created upon first user interaction)
let audioCtx: AudioContext | null = null;
let lastSoundTime = 0;
let lastSoundType: SoundType | null = null;

export function _resetAudioContextForTesting(): void {
  audioCtx = null;
  lastSoundTime = 0;
  lastSoundType = null;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }

  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {
      // AudioContext will resume on subsequent user interaction
    });
  }

  return audioCtx;
}

/**
 * Maps a SoundType to its corresponding SoundPreferences category
 */
export function getSoundCategory(type: SoundType): keyof Omit<SoundPreferences, 'master'> {
  switch (type) {
    case 'expense_success':
    case 'settlement_success':
      return 'expense';
    case 'trip_success':
      return 'trip';
    case 'notification':
      return 'notification';
    case 'click':
    case 'error':
    default:
      return 'interaction';
  }
}

/**
 * Retrieve current sound preferences from localStorage.
 * Automatically migrates legacy 'rupaii_sounds_enabled' key if present.
 */
export function getSoundPreferences(): SoundPreferences {
  if (typeof window === 'undefined') return { ...DEFAULT_PREFERENCES };

  try {
    let masterVal = DEFAULT_PREFERENCES.master;
    const storedMaster = localStorage.getItem(STORAGE_KEY_MASTER);
    const legacyStored = localStorage.getItem(LEGACY_STORAGE_KEY);

    if (storedMaster !== null) {
      masterVal = storedMaster === 'true';
    } else if (legacyStored !== null) {
      // Safely migrate existing legacy preference
      masterVal = legacyStored === 'true';
      localStorage.setItem(STORAGE_KEY_MASTER, masterVal ? 'true' : 'false');
    }

    const storedPrefsJson = localStorage.getItem(STORAGE_KEY_PREFS);
    let granular: Partial<SoundPreferences> = {};
    if (storedPrefsJson) {
      try {
        granular = JSON.parse(storedPrefsJson);
      } catch {
        // Fallback to defaults if JSON was malformed
      }
    }

    return {
      master: masterVal,
      expense: typeof granular.expense === 'boolean' ? granular.expense : DEFAULT_PREFERENCES.expense,
      trip: typeof granular.trip === 'boolean' ? granular.trip : DEFAULT_PREFERENCES.trip,
      notification: typeof granular.notification === 'boolean' ? granular.notification : DEFAULT_PREFERENCES.notification,
      interaction: typeof granular.interaction === 'boolean' ? granular.interaction : DEFAULT_PREFERENCES.interaction,
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

/**
 * Update sound preferences in localStorage and notify listeners.
 */
export function setSoundPreferences(prefs: Partial<SoundPreferences>): SoundPreferences {
  if (typeof window === 'undefined') return { ...DEFAULT_PREFERENCES, ...prefs };

  try {
    const current = getSoundPreferences();
    const updated: SoundPreferences = {
      ...current,
      ...prefs,
    };

    if (prefs.master !== undefined) {
      localStorage.setItem(STORAGE_KEY_MASTER, updated.master ? 'true' : 'false');
    }

    localStorage.setItem(
      STORAGE_KEY_PREFS,
      JSON.stringify({
        expense: updated.expense,
        trip: updated.trip,
        notification: updated.notification,
        interaction: updated.interaction,
      })
    );

    // Notify other components and tabs
    window.dispatchEvent(new Event('onnago_sound_preference_changed'));
    return updated;
  } catch {
    return { ...DEFAULT_PREFERENCES, ...prefs };
  }
}

/**
 * Check if sound effects are enabled in user preferences (defaults to true)
 */
export function areSoundsEnabled(): boolean {
  return getSoundPreferences().master;
}

/**
 * Toggle or set master sound preference in localStorage
 */
export function setSoundsEnabled(enabled: boolean): void {
  setSoundPreferences({ master: enabled });
}

/**
 * Play a synthesized sound effect using Web Audio API
 */
export function playSound(type: SoundType): void {
  const prefs = getSoundPreferences();
  if (!prefs.master) return;

  const category = getSoundCategory(type);
  if (!prefs[category]) return;

  const now = Date.now();
  // Prevent duplicate sounds triggered within 120ms
  if (lastSoundType === type && now - lastSoundTime < 120) {
    return;
  }
  lastSoundTime = now;
  lastSoundType = type;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => synthesizeSound(ctx, type)).catch(() => {});
    } else {
      synthesizeSound(ctx, type);
    }
  } catch {
    // Fail gracefully if audio playback is blocked
  }
}

function synthesizeSound(ctx: AudioContext, type: SoundType): void {
  const t = ctx.currentTime;

  switch (type) {
    case 'click': {
      // Soft, subtle micro-click (25ms)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, t);
      osc.frequency.exponentialRampToValueAtTime(350, t + 0.025);

      gain.gain.setValueAtTime(0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.025);
      break;
    }

    case 'trip_success': {
      // Warm, ascending 4-note chime (Eb5 -> G5 -> Bb5 -> Eb6)
      const notes = [
        { freq: 622.25, time: 0.00, dur: 0.22, vol: 0.08 },
        { freq: 783.99, time: 0.07, dur: 0.25, vol: 0.09 },
        { freq: 932.33, time: 0.14, dur: 0.28, vol: 0.10 },
        { freq: 1244.5, time: 0.21, dur: 0.45, vol: 0.11 },
      ];

      notes.forEach(({ freq, time, dur, vol }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + time);

        gain.gain.setValueAtTime(0.0001, t + time);
        gain.gain.linearRampToValueAtTime(vol, t + time + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t + time);
        osc.stop(t + time + dur);
      });
      break;
    }

    case 'expense_success': {
      // Crisp dual-tone confirmation (C5 -> G5)
      const notes = [
        { freq: 523.25, time: 0.00, dur: 0.18, vol: 0.09 },
        { freq: 783.99, time: 0.08, dur: 0.28, vol: 0.11 },
      ];

      notes.forEach(({ freq, time, dur, vol }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + time);

        gain.gain.setValueAtTime(0.0001, t + time);
        gain.gain.linearRampToValueAtTime(vol, t + time + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t + time);
        osc.stop(t + time + dur);
      });
      break;
    }

    case 'settlement_success': {
      // Distinct, short harmonic resolution chime (F5 -> A5 -> C6)
      const notes = [
        { freq: 698.46, time: 0.00, dur: 0.20, vol: 0.08 },
        { freq: 880.00, time: 0.08, dur: 0.25, vol: 0.10 },
        { freq: 1046.5, time: 0.16, dur: 0.40, vol: 0.12 },
      ];

      notes.forEach(({ freq, time, dur, vol }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + time);

        gain.gain.setValueAtTime(0.0001, t + time);
        gain.gain.linearRampToValueAtTime(vol, t + time + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t + time);
        osc.stop(t + time + dur);
      });
      break;
    }

    case 'notification': {
      // Subtle, gentle double-ping (A5 -> C#6)
      const notes = [
        { freq: 880.00, time: 0.00, dur: 0.12, vol: 0.07 },
        { freq: 1108.73, time: 0.08, dur: 0.24, vol: 0.09 },
      ];

      notes.forEach(({ freq, time, dur, vol }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + time);

        gain.gain.setValueAtTime(0.0001, t + time);
        gain.gain.linearRampToValueAtTime(vol, t + time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t + time);
        osc.stop(t + time + dur);
      });
      break;
    }

    case 'error': {
      // Quiet, gentle downward tone (240Hz -> 160Hz)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(240, t);
      osc.frequency.exponentialRampToValueAtTime(160, t + 0.20);

      gain.gain.setValueAtTime(0.07, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.20);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.20);
      break;
    }
  }
}
