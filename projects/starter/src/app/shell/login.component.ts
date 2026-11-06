import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {NavigationCancel, NavigationCancellationCode, Router} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {firebaseErrorCode} from 'fam-stack/firebase';
import {AuthService} from 'fam-stack/auth';
import {APP_NAME, APP_VERSION} from '@app/app';
import {HOME_URL, SCREENS} from '@app/screens';

const MATERIAL_MODULES = [MatButtonModule, MatIconModule, MatInputModule];

const CANNOT_OPEN = 'You are signed in, but the app could not open. Reload the page.';

/* Navigation cancellations that are retried once. */
const RETRYABLE: ReadonlySet<NavigationCancellationCode> = new Set([
  NavigationCancellationCode.Redirect,
  NavigationCancellationCode.SupersededByNewNavigation
]);

/** Email and password sign-in. Credential errors and failures to open the app show different messages. */
@Component({
  selector: 'app-login',
  imports: [FormsModule, MATERIAL_MODULES],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  protected readonly appName = APP_NAME;
  protected readonly version = APP_VERSION;
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly hidePassword = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly isSigningIn = signal(false);

  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  /* The cancellation code of the last navigation to `navigatingTo`. */
  private cancellation: NavigationCancellationCode | null = null;
  private navigatingTo = '';

  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe(event => {
      if (event instanceof NavigationCancel && event.url === this.navigatingTo) {
        this.cancellation = event.code ?? null;
      }
    });
  }

  protected signIn(): void {
    this.errorMessage.set('');
    this.isSigningIn.set(true);
    this.auth.login(this.email().trim(), this.password())
      .then(() => this.openApp(), (error: unknown) => {
        this.isSigningIn.set(false);
        this.errorMessage.set(firebaseErrorCode(error) === 'auth/network-request-failed'
          ? 'No connection. Try again.'
          : 'Wrong email or password.');
        console.error(error);
      });
  }

  protected togglePassword(event: MouseEvent): void {
    this.hidePassword.update(hidden => !hidden);
    event.stopPropagation();
  }

  /*
   * Navigates home, retrying once for a `RETRYABLE` cancel, and checks arrival by the
   * router's URL. Never rejects; any failure shows `CANNOT_OPEN`.
   */
  private async openApp(): Promise<void> {
    try {
      await this.navigate(HOME_URL);
      if (!this.arrived() && this.cancellation !== null && RETRYABLE.has(this.cancellation)) {
        await this.navigate(HOME_URL);
      }
      if (this.arrived()) return;
    } catch (error: unknown) {
      console.error(error);
    }
    this.isSigningIn.set(false);
    this.errorMessage.set(CANNOT_OPEN);
  }

  private arrived(): boolean {
    return SCREENS.at(this.router.url) !== undefined;
  }

  private navigate(target: string): Promise<boolean> {
    this.cancellation = null;
    this.navigatingTo = target;
    return this.router.navigateByUrl(target);
  }
}
