import {ChangeDetectionStrategy, Component, inject, OnInit, signal} from '@angular/core';
import {DatePipe} from '@angular/common';
import {MatButtonModule} from '@angular/material/button';
import {MatDialogModule} from '@angular/material/dialog';
import {MatIconModule} from '@angular/material/icon';
import {AuthService, deviceIcon, LoginHistoryService, LoginRecord} from 'fam-stack/auth';
import {LoadStatusComponent} from 'fam-stack/a11y';
import {EmailNamePipe, NotificationService} from 'fam-stack/ui';

const MATERIAL_MODULES = [MatButtonModule, MatDialogModule, MatIconModule];

/* One sign-in as the list renders it. */
interface LoginRow {
  readonly uuid: string;
  readonly time: number;
  readonly device: string;
  readonly icon: string;
  readonly isThisDevice: boolean;
}

/** This device's session and the account's recent sign-ins. */
@Component({
  selector: 'app-security-dialog',
  imports: [MATERIAL_MODULES, DatePipe, EmailNamePipe, LoadStatusComponent],
  templateUrl: './security-dialog.component.html',
  styleUrl: './security-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SecurityDialogComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly history = inject(LoginHistoryService);
  private readonly notification = inject(NotificationService);
  protected readonly user = this.auth.currentUser();
  protected readonly session = this.history.getCurrentSession();
  protected readonly sessionIcon = deviceIcon(this.session.userAgent);
  protected readonly isLoading = signal(true);
  protected readonly loadFailed = signal(false);
  protected readonly logins = signal<readonly LoginRow[]>([]);

  ngOnInit(): void {
    if (!this.user) {
      this.isLoading.set(false);
      return;
    }
    this.history.getLoginHistory(this.user.uid)
      .then(logins => this.logins.set(logins.map(login => this.row(login))))
      .catch((error: unknown) => {
        console.error(error);
        this.loadFailed.set(true);
        this.notification.error('Could not load the sign-in history.');
      })
      .finally(() => this.isLoading.set(false));
  }

  /* `login` arrives shaped by `LoginHistoryService`. */
  private row(login: LoginRecord): LoginRow {
    return {
      uuid: login.uuid,
      time: login.time,
      device: login.device,
      icon: deviceIcon(login.userAgent),
      isThisDevice: this.session.uuid !== undefined && login.uuid === this.session.uuid
    };
  }
}
