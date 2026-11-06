/*
 * Redeclares `getAuth` and `getFirestore` without a call signature, so calling either
 * fails the build. Checked by the `@ts-expect-error` lines in `app.config.ts`.
 */
interface InjectFirebaseAuthInstead {}
interface InjectFirestoreInstead {}

declare module 'firebase/auth' {
  /** Not callable in this app: inject `FIREBASE_AUTH` from `fam-stack/firebase`. */
  export const getAuth: InjectFirebaseAuthInstead;
}

declare module 'firebase/firestore' {
  /** Not callable in this app: inject `Firestore`, which `provideFirebase` opens. */
  export const getFirestore: InjectFirestoreInstead;
}

export {};
