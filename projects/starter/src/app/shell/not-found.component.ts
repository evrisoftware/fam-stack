import {ChangeDetectionStrategy, Component} from '@angular/core';
import {RouterLink} from '@angular/router';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {HOME_URL, SCREENS} from '@app/screens';

@Component({
  selector: 'app-not-found',
  imports: [MatButtonModule, MatIconModule, RouterLink],
  template: `
    <main class="not-found fam-appear">
      <mat-icon aria-hidden="true" class="not-found__icon">explore_off</mat-icon>
      <h1 class="fam-heading not-found__title">Page not found</h1>
      <p class="not-found__hint">There is nothing at this address. {{ homeLabel }} is a tap away.</p>
      <a [routerLink]="homeUrl" class="fam-action" mat-flat-button>Go to {{ homeLabel }}</a>
    </main>
  `,
  styles: `
    .not-found {
      display: grid;
      gap: var(--fam-space-2);
      min-height: 100dvh;
      padding: var(--fam-space-4);
      box-sizing: border-box;
      place-content: center;
      justify-items: center;
      text-align: center;
      view-transition-name: fam-page;
    }

    .not-found__icon {
      width: auto;
      height: auto;
      font-size: 4rem;
      color: var(--mat-sys-primary);
    }

    .not-found__hint {
      margin: 0 0 var(--fam-space-4);
      max-width: 34ch;
      color: var(--fam-ink-soft);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotFoundComponent {
  protected readonly homeUrl = HOME_URL;
  protected readonly homeLabel = SCREENS.name(SCREENS.home);
}
