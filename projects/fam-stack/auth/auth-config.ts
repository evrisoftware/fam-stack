import {InjectionToken} from '@angular/core';

export interface FamAuthConfig {
  /** Absolute URL of the sign-in screen. `logout()` ends there, and so should your guards. */
  readonly loginUrl: string;
  /** Collection holding one login-history document per user (`{collection}/{uid}`), or `null` for none. */
  readonly loginHistory: string | null;
  /** How many sign-ins a history keeps, newest first. Mirror it in your rules. */
  readonly loginHistoryLimit: number;
  /** `localStorage` key marking which history record is this device's own. */
  readonly deviceKey: string;
}

export const DEFAULT_AUTH_CONFIG: FamAuthConfig = {
  loginUrl: '/login',
  loginHistory: 'loginHistory',
  loginHistoryLimit: 50,
  deviceKey: 'fam.session'
};

export const FAM_AUTH_CONFIG = new InjectionToken<FamAuthConfig>('FAM_AUTH_CONFIG', {
  providedIn: 'root',
  factory: () => DEFAULT_AUTH_CONFIG
});
