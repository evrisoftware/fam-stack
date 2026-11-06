import {Signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {interval, map} from 'rxjs';

/** `Date.now()` as a signal, refreshed every `everyMs`. Call from an injection context. */
export const clockSignal = (everyMs: number): Signal<number> =>
  toSignal(interval(everyMs).pipe(map(() => Date.now())), {initialValue: Date.now()});
