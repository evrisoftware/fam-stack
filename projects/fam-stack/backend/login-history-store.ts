/**
 * Sign-in histories: one list per user, newest first, under the name `history`
 * (`FAM_AUTH_CONFIG.loginHistory`). `provideFirebase` provides it over Firestore.
 */
export abstract class LoginHistoryStore {
  /** Puts `entry` first in `uid`'s list, keeping at most `limit`; the rest is written back as stored. */
  abstract prepend(history: string, uid: string, entry: unknown, limit: number): Promise<void>;

  /** `uid`'s stored list, unshaped; `[]` when there is none. */
  abstract read(history: string, uid: string): Promise<unknown>;
}
