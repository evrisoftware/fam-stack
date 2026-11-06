import {defer, MonoTypeOperatorFunction, Observable, retry, tap, timer} from 'rxjs';
import {LiveSnapshot} from './live';

export interface RetryLiveStreamOptions {
  /** The first wait after a failure; doubles per consecutive failure. Default 2 s. */
  readonly baseMs?: number;
  /** The longest wait between attempts. Default 30 s. */
  readonly capMs?: number;
}

/** The default ceiling of `retryLiveStream`'s backoff. */
export const STREAM_RETRY_CAP_MS = 30_000;

/**
 * Resubscribes a live stream after every error, for as long as it is subscribed, with
 * a capped exponential backoff. `report` is called with each error.
 *
 * The failure count resets only on a snapshot with `fromCache: false`, and belongs to
 * each subscription.
 */
export function retryLiveStream<T extends LiveSnapshot>(
  report: (error: unknown) => void,
  options: RetryLiveStreamOptions = {}
): MonoTypeOperatorFunction<T> {
  const baseMs = options.baseMs ?? 2000;
  const capMs = options.capMs ?? STREAM_RETRY_CAP_MS;
  return (source: Observable<T>) => defer(() => {
    let failures = 0;
    return source.pipe(
      tap(({fromCache}) => {
        if (!fromCache) failures = 0;
      }),
      retry({
        delay: (error: unknown) => {
          report(error);
          return timer(Math.min(capMs, baseMs * 2 ** failures++));
        }
      })
    );
  });
}
