import {inject, Signal} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {NavigationEnd, Router} from '@angular/router';
import {filter, map} from 'rxjs';
import {ScreenLink, ScreenRegistry} from './screens';

/** The screen at `NavigationEnd.urlAfterRedirects`, as a signal. Call from an injection context. */
export const injectCurrentScreen = <P extends string>(registry: ScreenRegistry<P>): Signal<ScreenLink | undefined> => {
  const router = inject(Router);
  return toSignal(
    router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(event => registry.at(event.urlAfterRedirects))
    ),
    {initialValue: registry.at(router.url)}
  );
};
