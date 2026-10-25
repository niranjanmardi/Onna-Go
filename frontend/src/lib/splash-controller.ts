/**
 * Splash Screen & Cold-Start Wake-Up Controller for ONNA-GO.
 *
 * Handles:
 * 1. Immediate dismissal if device is offline at startup.
 * 2. Instant network error (no connection) treated as offline mode -> mounts app immediately.
 * 3. Slow requests (>2s) or 502/503/504 Render cold starts -> shows "Waking things up...".
 * 4. Dismissal upon browser 'offline' event if currently waiting.
 * 5. Quiet background /health check when browser comes back 'online'.
 */

export interface SplashControllerOptions {
  isOnline?: () => boolean;
  fetchFn?: typeof fetch;
  slowThreshold?: number; // ms before "Waking things up" is triggered (default 2000)
  timeoutLimit?: number; // ms before timeout error (default 90000)
  onWakeUp?: () => void;
  onDismiss?: () => void;
  onTimeoutError?: () => void;
}

export class SplashController {
  public healthCheckComplete = false;
  public reactMounted = false;
  public wakeUpTriggered = false;
  public dismissed = false;
  public timeoutErrorShown = false;

  private isOnline: () => boolean;
  private fetchFn: typeof fetch;
  private slowThreshold: number;
  private timeoutLimit: number;
  private onWakeUp?: () => void;
  private onDismiss?: () => void;
  private onTimeoutError?: () => void;

  private slowTimer: any = null;
  private timeoutTimer: any = null;
  private retryTimeout: any = null;
  private startTime: number = Date.now();

  constructor(options: SplashControllerOptions = {}) {
    this.isOnline =
      options.isOnline ||
      (() => (typeof navigator !== 'undefined' ? navigator.onLine !== false : true));
    this.fetchFn = options.fetchFn || (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : (async () => ({} as any)));
    this.slowThreshold = options.slowThreshold ?? 2000;
    this.timeoutLimit = options.timeoutLimit ?? 90000;
    this.onWakeUp = options.onWakeUp;
    this.onDismiss = options.onDismiss;
    this.onTimeoutError = options.onTimeoutError;
  }

  public start() {
    this.startTime = Date.now();

    // 1. Startup Offline Check:
    // If device is offline at startup, complete health check and dismiss immediately.
    // Do NOT ping and do NOT start wake-up timers.
    if (!this.isOnline()) {
      this.healthCheckComplete = true;
      this.dismissSplash();
      return;
    }

    // Device is online at startup:
    // Start slow timer to detect delay (>2s)
    this.slowTimer = setTimeout(() => {
      this.showWakeUpState();
    }, this.slowThreshold);

    this.timeoutTimer = setTimeout(() => {
      this.showTimeoutError();
    }, this.timeoutLimit);

    this.ping();
  }

  public handleOfflineEvent() {
    this.healthCheckComplete = true;
    this.clearAllTimers();
    this.dismissSplash();
  }

  public onReactMounted() {
    this.reactMounted = true;
    if (this.healthCheckComplete) {
      this.dismissSplash();
    }
  }

  private checkReady() {
    if (this.healthCheckComplete && this.reactMounted) {
      this.dismissSplash();
    }
  }

  private showWakeUpState() {
    if (this.wakeUpTriggered || this.healthCheckComplete) return;
    this.wakeUpTriggered = true;
    if (this.onWakeUp) this.onWakeUp();
  }

  private showTimeoutError() {
    if (this.healthCheckComplete) return;
    this.timeoutErrorShown = true;
    if (this.onTimeoutError) this.onTimeoutError();
  }

  private dismissSplash() {
    if (this.dismissed) return;
    this.dismissed = true;
    this.clearAllTimers();
    if (this.onDismiss) this.onDismiss();
  }

  private clearAllTimers() {
    if (this.slowTimer) {
      clearTimeout(this.slowTimer);
      this.slowTimer = null;
    }
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }

  private async ping() {
    if (this.healthCheckComplete) return;

    if (!this.isOnline()) {
      this.healthCheckComplete = true;
      this.clearAllTimers();
      this.checkReady();
      return;
    }

    const pingStart = Date.now();
    try {
      const res = await this.fetchFn('/health', {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (res.ok) {
        this.healthCheckComplete = true;
        this.clearAllTimers();
        this.checkReady();
      } else if (res.status === 502 || res.status === 503 || res.status === 504) {
        // Cold start - instance spinning up
        this.showWakeUpState();
        this.scheduleRetry();
      } else {
        // Other HTTP status
        this.healthCheckComplete = true;
        this.clearAllTimers();
        this.checkReady();
      }
    } catch {
      const pingDuration = Date.now() - pingStart;

      // 2. Instant network error:
      // If error happened quickly (< slowThreshold) or device is offline,
      // treat as "no connection" and complete health check so offline mode mounts.
      if (pingDuration < this.slowThreshold || !this.isOnline()) {
        this.healthCheckComplete = true;
        this.clearAllTimers();
        this.dismissSplash();
        return;
      }

      // If request took longer than slowThreshold:
      this.showWakeUpState();
      if (Date.now() - this.startTime >= this.timeoutLimit) {
        this.showTimeoutError();
        return;
      }
      this.scheduleRetry();
    }
  }

  private scheduleRetry() {
    if (this.healthCheckComplete) return;
    this.retryTimeout = setTimeout(() => {
      this.ping();
    }, 1500);
  }
}
