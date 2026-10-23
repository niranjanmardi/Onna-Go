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

const STORAGE_KEY = 'onnago_sounds_enabled';

// Global AudioContext singleton (lazily created upon first user interaction)
let audioCtx: AudioContext | null = null;
let lastSoundTime = 0;
let lastSoundType: SoundType | null = null;

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
 * Check if sound effects are enabled in user preferences (defaults to true)
 */
export function areSoundsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) return true; // Sensible default: enabled
  return stored === 'true';
}

/**
 * Toggle or set sound preference in localStorage
 */
export function setSoundsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
  // Dispatch custom storage event so other tabs and components update immediately
  window.dispatchEvent(new Event('onnago_sound_preference_changed'));
}

/**
 * Play a synthesized sound effect using Web Audio API
 */
export function playSound(type: SoundType): void {
  if (!areSoundsEnabled()) return;

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
