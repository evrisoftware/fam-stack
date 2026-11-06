import type {FamUser} from 'fam-stack/backend';

/* Defined in fam-stack/backend; re-exported for this entry's callers. */
export type {FamUser};

/** One sign-in, stored in the user's login-history document. */
export interface LoginRecord {
  /** UUID v7: time-ordered, and how this device recognises its own record. */
  readonly uuid: string;
  /** Unix milliseconds, on the signing-in device's clock. */
  readonly time: number;
  readonly user: FamUser;
  /** A human label from the user agent, e.g. "Chrome · Android". */
  readonly device: string;
  readonly userAgent: string;
}

/** The document `{loginHistory}/{uid}`: newest first, capped. */
export interface LoginHistory {
  readonly uid: string;
  readonly logins: readonly LoginRecord[];
}

/** The session alive on this device right now (derived, not stored). */
export interface CurrentSession {
  readonly device: string;
  readonly userAgent: string;
  /** Unix milliseconds the session started, or `null` when nothing records it. */
  readonly startTime: number | null;
  /** This device's own record, when its sign-in was recorded. */
  readonly uuid?: string;
}
