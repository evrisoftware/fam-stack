import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {FAM_TEXT} from 'fam-stack/core';
import {TextScaleService} from './text-scale.service';

/**
 * Grow and shrink buttons for `TextScaleService`, announcing the new step. Coloured by
 * `--fam-scale-ink|bg|line|hover`. Not for use inside a `mat-menu`; use menu items there.
 */
@Component({
  selector: 'fam-text-scale',
  imports: [MatIconModule],
  template: `
    <div [attr.aria-label]="text.group" class="text-scale" role="group">
      <button (click)="scale.grow()" [attr.aria-label]="text.grow" [disabled]="!scale.canGrow()"
              [title]="text.grow" class="text-scale__button" type="button">
        <mat-icon aria-hidden="true">text_increase</mat-icon>
      </button>
      <button (click)="scale.shrink()" [attr.aria-label]="text.shrink" [disabled]="!scale.canShrink()"
              [title]="text.shrink" class="text-scale__button" type="button">
        <mat-icon aria-hidden="true">text_decrease</mat-icon>
      </button>
    </div>
    <span aria-live="polite" class="fam-visually-hidden" role="status">{{ text.announce(scale.label()) }}</span>
  `,
  styleUrl: './text-scale.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TextScaleComponent {
  protected readonly scale = inject(TextScaleService);
  protected readonly text = inject(FAM_TEXT).textScale;
}
