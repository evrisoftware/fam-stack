import {ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit} from '@angular/core';
import {RouterLink, RouterOutlet} from '@angular/router';
import {MatDialog} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatMenuModule} from '@angular/material/menu';
import {MatToolbarModule} from '@angular/material/toolbar';
import {FAM_TEXT} from 'fam-stack/core';
import {LinkService} from 'fam-stack/backend';
import {linkProbe} from 'fam-stack/firebase';
import {AuthService} from 'fam-stack/auth';
import {LiveNoteComponent} from 'fam-stack/a11y';
import {askConfirmation, EmailNamePipe, MenuBackGestureDirective, NotificationService, TextScaleService} from 'fam-stack/ui';
import {BottomNavComponent, injectCurrentScreen, LinkBannerComponent, ReconnectService} from 'fam-stack/shell';
import {APP_NAME, APP_VERSION} from '@app/app';
import {HOME_URL, SCREENS} from '@app/screens';
import {TasksService} from '@app/features/tasks/tasks.service';
import {SecurityDialogComponent} from '@app/shell/security-dialog.component';

const MATERIAL_MODULES = [MatButtonModule, MatIconModule, MatMenuModule, MatToolbarModule];

/**
 * The signed-in shell: toolbar and account menu, link banner, the screen's `<h1>`, the
 * routed page and the bottom nav. Provides `TasksService`, loads it after
 * `AuthService.loadUser()`, and starts and stops the link watchdog.
 */
@Component({
  selector: 'app-layout',
  imports: [
    MATERIAL_MODULES,
    MenuBackGestureDirective,
    RouterLink,
    RouterOutlet,
    BottomNavComponent,
    LinkBannerComponent,
    LiveNoteComponent,
    EmailNamePipe
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
  providers: [TasksService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LayoutComponent implements OnInit, OnDestroy {
  protected readonly appName = APP_NAME;
  protected readonly version = APP_VERSION;
  protected readonly homeUrl = HOME_URL;
  protected readonly links = SCREENS.links;
  protected readonly screen = injectCurrentScreen(SCREENS);
  protected readonly auth = inject(AuthService);
  protected readonly textScale = inject(TextScaleService);
  protected readonly reconnect = inject(ReconnectService);
  protected readonly text = inject(FAM_TEXT);
  /* Said when the account menu changes the text size. */
  protected readonly textScaleNote = computed(() => this.text.textScale.announce(this.textScale.label()));
  private readonly link = inject(LinkService);
  private readonly tasks = inject(TasksService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);
  private destroyed = false;

  ngOnInit(): void {
    /* The rejection handler covers only `loadUser()`; errors from `load()`/`watch()` reach `GlobalErrorHandler`. */
    this.auth.loadUser().then(() => {
      if (this.destroyed) return;
      this.tasks.load();
      this.link.watch(linkProbe(this.tasks.query));
    }, (error: unknown) => {
      console.error('Could not open the app.', error);
      if (this.destroyed) return;
      this.notification.error('Could not open the app. Reload the page.');
    });
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.link.stop();
  }

  protected openSecurity(): void {
    this.dialog.open(SecurityDialogComponent, {width: '100%', maxWidth: '28rem'});
  }

  protected async signOut(): Promise<void> {
    const confirmed = await askConfirmation(this.dialog, {
      title: 'Sign out',
      description: 'Sign out of this device?',
      confirmLabel: 'Yes, sign out',
      tone: 'primary',
      icon: 'logout'
    });
    if (!confirmed) return;
    this.auth.logout().catch((error: unknown) => {
      console.error('Could not sign out.', error);
      this.notification.error('Could not sign out. Try again.');
    });
  }
}
