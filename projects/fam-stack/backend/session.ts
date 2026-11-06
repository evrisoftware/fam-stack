import {Observable} from 'rxjs';

/** The signed-in account, as the app holds it. */
export interface FamUser {
  readonly uid: string;
  readonly email: string;
}

/** This device's sign-in session. `provideFirebase` provides it over Firebase Auth. */
export abstract class FamSession {
  /** Nothing until the session is restored, then the user or `null` on every change. Cold. */
  abstract user(): Observable<FamUser | null>;

  /** The signed-in user right now, or `null`. */
  abstract currentUser(): FamUser | null;

  /** The signed-in user's last sign-in, in Unix ms, or `null` when unknown. */
  abstract lastSignInTime(): number | null;

  /** Signs in with email and password; rejects with the backend's error. */
  abstract signIn(email: string, password: string): Promise<FamUser>;

  /** Ends the session; rejects when the backend refuses. */
  abstract signOut(): Promise<void>;
}
