import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection
} from '@angular/core';
import {provideRouter, withViewTransitions} from '@angular/router';
import type {getAuth} from 'firebase/auth';
import type {getFirestore} from 'firebase/firestore';
import {provideFamStack} from 'fam-stack';
import {famViewTransitions} from 'fam-stack/shell';
import {environment} from '@envs/environment';
import {routes} from '@app/app.routes';
import {LOGIN_URL} from '@app/login-route';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withViewTransitions(famViewTransitions())),
    provideFamStack({
      firebase: environment.firebase,
      firebaseOptions: {emulators: environment.emulators},
      auth: {loginUrl: LOGIN_URL}
    })
  ]
};

/* Fails the build (TS2578) if `firebase-openers.d.ts` stops making these uncallable. */
// @ts-expect-error `getAuth` has no call signature (firebase-openers.d.ts)
type GetAuthStaysBarred = ReturnType<typeof getAuth>;
// @ts-expect-error `getFirestore` has no call signature (firebase-openers.d.ts)
type GetFirestoreStaysBarred = ReturnType<typeof getFirestore>;
