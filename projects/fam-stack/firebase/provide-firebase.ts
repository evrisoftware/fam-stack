import {
  EnvironmentProviders,
  inject,
  InjectionToken,
  makeEnvironmentProviders,
  provideEnvironmentInitializer
} from '@angular/core';
import {FirebaseOptions, initializeApp} from 'firebase/app';
import {
  Auth,
  browserLocalPersistence,
  browserSessionPersistence,
  connectAuthEmulator,
  indexedDBLocalPersistence,
  initializeAuth
} from 'firebase/auth';
import {connectFirestoreEmulator, Firestore, FirestoreSettings, initializeFirestore} from 'firebase/firestore';
import {FamSession, LinkTransport, LoginHistoryStore} from 'fam-stack/backend';
import {firebaseSession} from './firebase-session';
import {firestoreLinkTransport} from './firestore-link';
import {firestoreLoginHistory} from './firestore-login-history';

/** The Firebase `Auth` instance. `Firestore` is injected by its own class. */
export const FIREBASE_AUTH = new InjectionToken<Auth>('FIREBASE_AUTH');

interface OpenedFirebase {
  readonly auth: Auth;
  readonly firestore: Firestore;
}

const FIREBASE = new InjectionToken<OpenedFirebase>('FIREBASE');

/* `getAuth`'s persistence list. Must keep IndexedDB, where existing sessions are stored. */
const AUTH_PERSISTENCE = [
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence
];

/**
 * Default Firestore settings: long polling forced on every browser. Module-level:
 * `initializeFirestore` throws when called again with settings that differ.
 */
export const DEFAULT_FIRESTORE_SETTINGS: FirestoreSettings = {experimentalForceLongPolling: true};

/** Local emulators to connect before first use. Leave unset in production builds. */
export interface FirebaseEmulators {
  /** The Auth emulator's URL, e.g. `http://127.0.0.1:9099`. */
  readonly auth?: string;
  /** The Firestore emulator's address, e.g. `{host: '127.0.0.1', port: 8080}`. */
  readonly firestore?: {readonly host: string; readonly port: number};
}

export interface ProvideFirebaseOptions {
  /** Firestore settings; defaults to `DEFAULT_FIRESTORE_SETTINGS`. Keep it a module-level constant. */
  readonly firestore?: FirestoreSettings;
  readonly emulators?: FirebaseEmulators;
}

/* Instances already connected to an emulator. */
const emulated = new WeakSet<object>();

/* Opens the app, then auth, then Firestore, and connects emulators once per instance. */
const openFirebase = (config: FirebaseOptions, options: ProvideFirebaseOptions): OpenedFirebase => {
  const app = initializeApp(config);
  const auth = initializeAuth(app, {persistence: AUTH_PERSISTENCE});
  const firestore = initializeFirestore(app, options.firestore ?? DEFAULT_FIRESTORE_SETTINGS);
  const {emulators} = options;
  if (emulators?.auth && !emulated.has(auth)) {
    emulated.add(auth);
    connectAuthEmulator(auth, emulators.auth, {disableWarnings: true});
  }
  if (emulators?.firestore && !emulated.has(firestore)) {
    emulated.add(firestore);
    connectFirestoreEmulator(firestore, emulators.firestore.host, emulators.firestore.port);
  }
  return {auth, firestore};
};

/**
 * Opens Firebase in an environment initializer and provides `FIREBASE_AUTH`, `Firestore`
 * and, over them, `fam-stack/backend`'s contracts. The only opener: never call `getAuth()`
 * or `getFirestore()`.
 */
export const provideFirebase = (config: FirebaseOptions, options: ProvideFirebaseOptions = {}): EnvironmentProviders =>
  makeEnvironmentProviders([
    {provide: FIREBASE, useFactory: () => openFirebase(config, options)},
    provideEnvironmentInitializer(() => void inject(FIREBASE)),
    {provide: FIREBASE_AUTH, useFactory: () => inject(FIREBASE).auth},
    {provide: Firestore, useFactory: () => inject(FIREBASE).firestore},
    {provide: FamSession, useFactory: () => firebaseSession(inject(FIREBASE).auth)},
    {provide: LinkTransport, useFactory: () => firestoreLinkTransport(inject(FIREBASE).firestore)},
    {provide: LoginHistoryStore, useFactory: () => firestoreLoginHistory(inject(FIREBASE).firestore)}
  ]);
