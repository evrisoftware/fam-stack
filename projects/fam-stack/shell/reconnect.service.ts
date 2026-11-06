import {computed, inject, Injectable} from '@angular/core';
import {FAM_TEXT} from 'fam-stack/core';
import {LinkService} from 'fam-stack/backend';
import {NotificationService} from 'fam-stack/ui';

/**
 * A manual reconnect (`LinkService.revive()`) that notifies its outcome:
 * success or failure; nothing when busy or abandoned. Offer it on every screen.
 */
@Injectable({providedIn: 'root'})
export class ReconnectService {
  private readonly link = inject(LinkService);
  private readonly notification = inject(NotificationService);
  private readonly text = inject(FAM_TEXT).link;
  /** "Reconnect", or "Connecting…" while one is in flight. */
  readonly label = computed(() => this.link.isReviving() ? this.text.reconnecting : this.text.reconnect);
  readonly busy = this.link.isReviving;

  async reconnect(): Promise<void> {
    const outcome = await this.link.revive();
    if (outcome === 'revived') this.notification.success(this.text.reconnected);
    else if (outcome === 'failed') this.notification.error(this.text.reconnectFailed);
  }
}
