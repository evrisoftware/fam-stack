import {computed, DestroyRef, inject, Injectable, signal} from '@angular/core';
import {Observable, Subscription} from 'rxjs';
import {LiveSnapshot} from './live';

/* How long the probe may answer only from cache before `isStale` turns true. */
const OFFLINE_GRACE_MS = 8_000;

/* A return after being hidden this long always revives. */
const REVIVE_AFTER_HIDDEN_MS = 30_000;

const PROBE_STREAM = 'liveness probe';

/** Rebuilds every live stream. `provideFirebase` provides it over Firestore. */
export abstract class LinkTransport {
  /** Resolves once every stream is rebuilt; rejects when the rebuild fails. */
  abstract rebuild(): Promise<void>;
}

/** What a call to `revive()` came to. */
export type ReviveOutcome =
  /** Every stream was rebuilt. */
  | 'revived'
  /** The rebuild failed; `isStale` is set. */
  | 'failed'
  /** Another revive was in flight; nothing was done. */
  | 'busy'
  /** `stop()` ran before this revive settled. */
  | 'abandoned';

/**
 * Whether the screens are still fed by the server.
 *
 * - `isStale`: the probe answered only from cache past a grace period, or a stream
 *   reported itself broken (`reportBroken`) and has not reported alive since.
 * - `revive()`: `LinkTransport.rebuild()`, rebuilding every stream.
 * - Revives automatically on `online`, and on a return from hidden after 30 s or while stale.
 *
 * Started by the signed-in shell (`watch()`), stopped on its destroy (`stop()`).
 */
@Injectable({providedIn: 'root'})
export class LinkService {
  /** A revive is in flight. */
  readonly isReviving = signal<boolean>(false);
  private readonly cachedOnly = signal<boolean>(false);
  private readonly brokenStreams = signal<readonly string[]>([]);
  /** The screens may not be current. */
  readonly isStale = computed<boolean>(() => this.cachedOnly() || this.brokenStreams().length > 0);
  /** Names of the streams currently reported broken. */
  readonly broken = this.brokenStreams.asReadonly();

  private readonly transport = inject(LinkTransport);
  private probe: Observable<LiveSnapshot> | null = null;
  private watching: Subscription | null = null;
  private offlineTimer: ReturnType<typeof setTimeout> | null = null;
  private hiddenSince: number | null = null;
  /* Whether the shell wants a watch; a revive reopens the probe only while true. */
  private wanted = false;
  /* Bumped by `stop()`; a revive from an older generation changes nothing. */
  private generation = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  /**
   * Subscribes to the probe and opens the window events. Idempotent. `probe` should be a
   * live source the app already listens to and the backend always allows (`linkProbe`).
   */
  watch(probe: Observable<LiveSnapshot>): void {
    this.wanted = true;
    this.probe = probe;
    if (this.watching) return;
    const watching = probe.subscribe({
      next: ({fromCache}) => this.report(fromCache),
      error: (error: unknown) => {
        this.watching = null;
        this.reportBroken(PROBE_STREAM, error);
      }
    });
    this.watching = watching.closed ? null : watching;
    if (this.hiddenSince === null && document.hidden) this.hiddenSince = Date.now();
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    window.addEventListener('online', this.onOnline);
  }

  /** Closes the probe and the window events, and clears every report. */
  stop(): void {
    this.wanted = false;
    this.generation++;
    this.clearOfflineTimer();
    this.watching?.unsubscribe();
    this.watching = null;
    this.hiddenSince = null;
    this.cachedOnly.set(false);
    this.brokenStreams.set([]);
    this.isReviving.set(false);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('online', this.onOnline);
  }

  /**
   * Rebuilds every stream through `LinkTransport`; live listeners re-deliver from the
   * server. One at a time.
   */
  async revive(): Promise<ReviveOutcome> {
    if (this.isReviving()) return 'busy';
    this.isReviving.set(true);
    const generation = this.generation;
    const current = (): boolean => generation === this.generation;
    console.info('Reconnecting to the server…');
    try {
      await this.transport.rebuild();
      console.info('Connection to the server restored.');
      if (!current()) return 'abandoned';
      this.hiddenSince = document.hidden ? Date.now() : null;
      return 'revived';
    } catch (error: unknown) {
      console.error('Could not reconnect to the server:', error);
      if (!current()) return 'abandoned';
      if (this.wanted) this.cachedOnly.set(true);
      return 'failed';
    } finally {
      /* The probe is reopened only here, never from its own error callback. */
      if (current()) {
        if (this.wanted && this.probe) this.watch(this.probe);
        this.isReviving.set(false);
      }
    }
  }

  /** Marks `stream` broken until `reportAlive(stream)`. Call from the stream's error path. */
  reportBroken(stream: string, error: unknown): void {
    console.error(`Stream "${stream}" broke:`, error);
    this.clearOfflineTimer();
    this.brokenStreams.update(streams => streams.includes(stream) ? streams : [...streams, stream]);
  }

  /** Withdraws `stream`'s break report. Call only for a snapshot with `fromCache: false`. */
  reportAlive(stream: string): void {
    this.brokenStreams.update(streams =>
      streams.includes(stream) ? streams.filter(other => other !== stream) : streams);
  }

  private report(fromCache: boolean): void {
    if (!fromCache) {
      this.clearOfflineTimer();
      this.cachedOnly.set(false);
      this.reportAlive(PROBE_STREAM);
      return;
    }
    if (this.cachedOnly() || this.offlineTimer) return;
    this.offlineTimer = setTimeout(() => {
      this.offlineTimer = null;
      this.cachedOnly.set(true);
    }, OFFLINE_GRACE_MS);
  }

  private readonly onVisibilityChange = (): void => {
    if (document.hidden) {
      this.hiddenSince = Date.now();
      return;
    }
    const hiddenFor = this.hiddenSince === null ? 0 : Date.now() - this.hiddenSince;
    this.hiddenSince = null;
    if (hiddenFor >= REVIVE_AFTER_HIDDEN_MS || this.isStale()) void this.revive();
  };

  private readonly onOnline = (): void => void this.revive();

  private clearOfflineTimer(): void {
    if (this.offlineTimer === null) return;
    clearTimeout(this.offlineTimer);
    this.offlineTimer = null;
  }
}
