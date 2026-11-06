import {inject, Injectable, signal} from '@angular/core';
import {Router} from '@angular/router';
import {firstValueFrom, Subject} from 'rxjs';
import {FAM_TEXT} from 'fam-stack/core';
import {FamSession} from 'fam-stack/backend';
import {NotificationService} from 'fam-stack/ui';
import {FAM_AUTH_CONFIG} from './auth-config';
import {LoginHistoryService} from './login-history.service';
import {FamUser} from './types';

/**
 * The signed-in account, sign-in and sign-out (email and password), through `FamSession`.
 *
 * `signingOut$` emits synchronously at the start of `logout()`, before the session is
 * revoked, and from nowhere else. Live listeners end on it: `takeUntil(auth.signingOut$)`.
 */
@Injectable({providedIn: 'root'})
export class AuthService {
  /** `undefined` until the first session emission, then the user or `null`. */
  readonly currentUser = signal<FamUser | null | undefined>(undefined);
  private readonly router = inject(Router);
  private readonly session = inject(FamSession);
  private readonly config = inject(FAM_AUTH_CONFIG);
  private readonly history = inject(LoginHistoryService);
  private readonly notification = inject(NotificationService);
  private readonly text = inject(FAM_TEXT);
  private readonly signingOut = new Subject<void>();
  /** Emits when this device starts signing out. */
  readonly signingOut$ = this.signingOut.asObservable();

  /**
   * Resolves with the restored session (or `null`) and sets `currentUser`. Await it
   * before opening any live listener. Rejects if the session stream errors or ends empty.
   */
  async loadUser(): Promise<FamUser | null> {
    const user = (await firstValueFrom(this.session.user())) ?? null;
    this.currentUser.set(user);
    return user;
  }

  /** Signs in, sets `currentUser` at once, and records the sign-in without awaiting it. */
  async login(email: string, password: string): Promise<FamUser> {
    const user = await this.session.signIn(email, password);
    this.currentUser.set(user);
    this.history.recordLogin(user)
      .catch((error: unknown) => console.error('Could not record the sign-in.', error));
    return user;
  }

  /**
   * Emits `signingOut$`, signs out (a refusal is shown to the user), clears the device
   * session and navigates to the login URL, retrying the navigation once.
   */
  async logout(): Promise<void> {
    this.signingOut.next();
    try {
      await this.session.signOut();
    } catch (error: unknown) {
      console.error('The backend refused to sign out:', error);
      this.notification.error(this.text.signOutFailed);
    }
    this.history.clearDeviceSession();
    this.currentUser.set(null);
    if (!(await this.router.navigateByUrl(this.config.loginUrl))) {
      await this.router.navigateByUrl(this.config.loginUrl);
    }
  }
}
