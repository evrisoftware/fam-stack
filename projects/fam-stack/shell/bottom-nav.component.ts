import {ChangeDetectionStrategy, Component, inject, input} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {RouterLink, RouterLinkActive} from '@angular/router';
import {FAM_TEXT} from 'fam-stack/core';
import {ScreenLink} from './screens';

/** The bottom navigation. Bind `[links]` to a screen registry's `links`; the active tab comes from `routerLinkActive`. */
@Component({
  selector: 'fam-bottom-nav',
  imports: [MatIconModule, RouterLink, RouterLinkActive],
  template: `
    <nav [attr.aria-label]="label() || text.navigation" class="bottom-nav">
      @for (item of links(); track item.path) {
        <a #rla="routerLinkActive"
           [attr.aria-current]="rla.isActive ? 'page' : null"
           [routerLink]="item.url"
           class="bottom-nav__item"
           routerLinkActive="bottom-nav__item--active">
          <span class="bottom-nav__icon">
            <mat-icon aria-hidden="true">{{ item.icon }}</mat-icon>
          </span>
          <span class="bottom-nav__label">{{ item.label }}</span>
        </a>
      }
    </nav>
  `,
  styleUrl: './bottom-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BottomNavComponent {
  readonly links = input.required<readonly ScreenLink[]>();
  /** The nav's accessible name; defaults to `FAM_TEXT.navigation`. */
  readonly label = input<string>('');
  protected readonly text = inject(FAM_TEXT);
}
