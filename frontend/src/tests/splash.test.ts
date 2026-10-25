// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SplashController } from '../lib/splash-controller';

describe('Splash Screen & Wake-Up Controller', () => {
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

  it('offline startup mounts the app immediately without wake-up messages', () => {
    let wakeUpCalled = false;
    let dismissed = false;

    const controller = new SplashController({
      isOnline: () => false, // Device is offline at startup
      fetchFn: vi.fn(),
      onWakeUp: () => {
        wakeUpCalled = true;
      },
      onDismiss: () => {
        dismissed = true;
      },
    });

    controller.start();

    // Health check must be marked complete and splash dismissed immediately
    expect(controller.healthCheckComplete).toBe(true);
    expect(wakeUpCalled).toBe(false);
    expect(dismissed).toBe(true);

    // When React mounts, it remains dismissed
    controller.onReactMounted();
    expect(dismissed).toBe(true);
    expect(wakeUpCalled).toBe(false);

    // Advancing timers should never trigger wake-up
    vi.advanceTimersByTime(5000);
    expect(wakeUpCalled).toBe(false);
  });

  it('slow online response shows the wake-up state after 2 seconds', async () => {
    let wakeUpCalled = false;

    // Simulate hanging or slow fetch
    const hangingFetch = () => new Promise<Response>(() => {});

    const controller = new SplashController({
      isOnline: () => true,
      fetchFn: hangingFetch as any,
      slowThreshold: 2000,
      onWakeUp: () => {
        wakeUpCalled = true;
      },
    });

    controller.start();
    expect(wakeUpCalled).toBe(false);

    // Advance 1.5 seconds -> still not slow enough
    vi.advanceTimersByTime(1500);
    expect(wakeUpCalled).toBe(false);

    // Advance to 2.1 seconds -> exceeds slowThreshold -> shows wake-up state!
    vi.advanceTimersByTime(600);
    expect(wakeUpCalled).toBe(true);
    expect(controller.wakeUpTriggered).toBe(true);
  });

  it('instant network error mounts the app without wake-up state', async () => {
    let wakeUpCalled = false;
    let dismissed = false;

    // Simulate instant network failure (e.g. connection refused, offline DNS drop)
    const instantFailFetch = () => Promise.reject(new TypeError('Failed to fetch'));

    const controller = new SplashController({
      isOnline: () => true,
      fetchFn: instantFailFetch as any,
      slowThreshold: 2000,
      onWakeUp: () => {
        wakeUpCalled = true;
      },
      onDismiss: () => {
        dismissed = true;
      },
    });

    controller.start();

    // Allow promise rejection microtask to execute and dismiss
    await vi.waitFor(() => {
      expect(controller.healthCheckComplete).toBe(true);
      expect(dismissed).toBe(true);
    });

    // Should treat instant failure as "no connection" and complete health check
    expect(wakeUpCalled).toBe(false);

    // When React mounts, it remains dismissed
    controller.onReactMounted();
    expect(dismissed).toBe(true);
    expect(wakeUpCalled).toBe(false);
  });

  it('cold start status (502/503/504) triggers wake-up state', async () => {
    let wakeUpCalled = false;

    // Simulate Render cold start 503 Service Unavailable
    const coldStartFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    });

    const controller = new SplashController({
      isOnline: () => true,
      fetchFn: coldStartFetch as any,
      onWakeUp: () => {
        wakeUpCalled = true;
      },
    });

    controller.start();
    await vi.waitFor(() => {
      expect(wakeUpCalled).toBe(true);
    });

    expect(controller.healthCheckComplete).toBe(false);
  });

  it('offline event dismisses waiting splash and mounts the app', () => {
    let dismissed = false;

    // Hanging fetch while device appears online
    const hangingFetch = () => new Promise<Response>(() => {});

    const controller = new SplashController({
      isOnline: () => true,
      fetchFn: hangingFetch as any,
      onDismiss: () => {
        dismissed = true;
      },
    });

    controller.start();
    controller.onReactMounted();
    expect(dismissed).toBe(false);

    // Browser fires offline event
    controller.handleOfflineEvent();

    expect(controller.healthCheckComplete).toBe(true);
    expect(dismissed).toBe(true);
  });
});
