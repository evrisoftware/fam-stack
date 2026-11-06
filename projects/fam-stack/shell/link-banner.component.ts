import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {FAM_TEXT} from 'fam-stack/core';
import {LinkService} from 'fam-stack/backend';
import {LiveNoteComponent} from 'fam-stack/a11y';
import {ReconnectService} from './reconnect.service';

/**
 * The stale-data banner with a reconnect button, shown while
 * `LinkService.isStale()` and announced by a live note. Place it in the shell's header.
 */
@Component({
  selector: 'fam-link-banner',
  imports: [MatButtonModule, MatIconModule, LiveNoteComponent],
  template: `
    <fam-live-note [text]="link.isStale() ? text.stale : ''"/>
    @if (link.isStale()) {
      <div class="fam-note link-banner">
        <mat-icon aria-hidden="true">cloud_off</mat-icon>
        <span aria-hidden="true" class="link-banner__text">{{ text.stale }}</span>
        <button (click)="reconnect.reconnect()" [disabled]="reconnect.busy()" [title]="text.reconnectHint"
                mat-button type="button">
          {{ reconnect.label() }}
        </button>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .link-banner {
      display: flex;
      gap: var(--fam-space-2);
      align-items: center;
      margin: var(--fam-space-2);
    }

    .link-banner__text {
      flex: 1;
      min-width: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LinkBannerComponent {
  protected readonly link = inject(LinkService);
  protected readonly reconnect = inject(ReconnectService);
  protected readonly text = inject(FAM_TEXT).link;
}
