import {inject} from '@angular/core';
import {ActivatedRouteSnapshot, CanActivateFn, Router, UrlTree} from '@angular/router';
import {catchError, defaultIfEmpty, map, Observable, of, take} from 'rxjs';
import {FamSession, FamUser} from './session';

/** Where a guard sends a device: an absolute URL, or router commands. */
export type GuardTarget = string | readonly unknown[];

/*
 * Decides on the first emission of `FamSession.user()`. A falsy user, an erroring
 * stream and a stream that completes empty all count as signed out.
 */
const guard = (verdict: (user: FamUser | null) => true | GuardTarget): Observable<true | UrlTree> => {
  const session = inject(FamSession);
  const router = inject(Router);
  return session.user().pipe(
    take(1),
    catchError((error: unknown) => {
      console.error('Could not read this device\'s session.', error);
      return of(null);
    }),
    defaultIfEmpty<FamUser | null, null>(null),
    map(user => {
      const answer = verdict(user);
      if (answer === true) return true;
      return typeof answer === 'string' ? router.parseUrl(answer) : router.createUrlTree([...answer]);
    }));
};

/** Lets a signed-in device through; sends a signed-out one to `to()`. */
export const redirectUnauthorizedTo = (to: () => GuardTarget): CanActivateFn =>
  () => guard(user => user ? true : to());

/** Lets a signed-out device through; sends a signed-in one to `to(next)`. */
export const redirectLoggedInTo = (to: (next: ActivatedRouteSnapshot) => GuardTarget): CanActivateFn =>
  next => guard(user => user ? to(next) : true);
