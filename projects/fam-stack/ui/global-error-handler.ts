import {ErrorHandler, inject, Injectable, Injector} from '@angular/core';
import {FAM_TEXT} from 'fam-stack/core';
import {NotificationService} from './notification.service';

/* The "ResizeObserver loop" browser notice, which is not an error. */
const isBenignBrowserNotice = (error: unknown): boolean =>
  error instanceof Error && error.message.includes('ResizeObserver loop');

/**
 * Logs every uncaught error and shows `FAM_TEXT.unexpectedError` at most once per 4 s.
 * ResizeObserver notices are logged at `debug` and nothing else. Needs
 * `provideBrowserGlobalErrorListeners()`. `NotificationService` is resolved lazily.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private static readonly THROTTLE_MS = 4000;
  private readonly injector = inject(Injector);
  private lastNotifiedAt = 0;

  handleError(error: unknown): void {
    if (isBenignBrowserNotice(error)) {
      console.debug(error);
      return;
    }
    console.error(error);
    const now = Date.now();
    if (now - this.lastNotifiedAt < GlobalErrorHandler.THROTTLE_MS) return;
    this.lastNotifiedAt = now;
    this.injector.get(NotificationService).error(this.injector.get(FAM_TEXT).unexpectedError);
  }
}
