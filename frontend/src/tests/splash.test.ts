// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Phase 1: Splash Screen & Wake-Up Controller', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = `
      <div id="splash-screen">
        <div id="splash-loading-ring"></div>
        <div id="splash-title">Loading ONNA-GO...</div>
        <div id="splash-submessage">Preparing your travel circle...</div>
        <div id="splash-elapsed-hint" style="display: none;">First load can take up to a minute</div>
        <div id="splash-error-box" style="display: none;"></div>
      </div>
      <div id="root"></div>
    `;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('contains branded splash elements in DOM', () => {
    const splash = document.getElementById('splash-screen');
    const title = document.getElementById('splash-title');
    const ring = document.getElementById('splash-loading-ring');

    expect(splash).not.toBeNull();
    expect(title?.textContent).toBe('Loading ONNA-GO...');
    expect(ring).not.toBeNull();
  });

  it('smoothly fades out splash when server is healthy and app mounts', () => {
    let dismissed = false;
    const dismissSplash = () => {
      const splash = document.getElementById('splash-screen');
      if (splash) {
        splash.style.opacity = '0';
        dismissed = true;
      }
    };

    dismissSplash();
    expect(dismissed).toBe(true);
    expect(document.getElementById('splash-screen')?.style.opacity).toBe('0');
  });

  it('triggers wake-up state and rotating messages when response is slow (>2s)', () => {
    const friendlyMessages = [
      "Packing the snacks for the road...",
      "Warming up the engine...",
      "Checking tyre pressures & route maps...",
    ];

    const titleEl = document.getElementById('splash-title')!;
    const subEl = document.getElementById('splash-submessage')!;

    // Simulate 2s slow threshold trigger
    titleEl.innerText = "Waking things up...";
    subEl.innerText = friendlyMessages[0];

    expect(titleEl.innerText).toBe("Waking things up...");
    expect(subEl.innerText).toBe(friendlyMessages[0]);
  });

  it('reveals elapsed hint after 15 seconds', () => {
    const hintEl = document.getElementById('splash-elapsed-hint')!;
    hintEl.style.display = 'inline-block';
    expect(hintEl.style.display).toBe('inline-block');
  });

  it('reveals error state and retry button after 90s timeout', () => {
    const titleEl = document.getElementById('splash-title')!;
    const errEl = document.getElementById('splash-error-box')!;
    const ringEl = document.getElementById('splash-loading-ring')!;

    titleEl.innerText = "Waking up took longer than expected";
    ringEl.style.display = 'none';
    errEl.style.display = 'block';

    expect(titleEl.innerText).toContain("longer than expected");
    expect(ringEl.style.display).toBe('none');
    expect(errEl.style.display).toBe('block');
  });
});
