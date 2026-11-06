import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialog, MatDialogModule} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {firstValueFrom} from 'rxjs';
import {FAM_TEXT} from 'fam-stack/core';
import {DIALOG_RESULT} from './dialog-result';

/** One run of a description: a string is plain text, `{bold}` is emphasis. Rendered as text, never HTML. */
export type TextPart = string | {readonly bold: string};

export interface ConfirmDialogData {
  readonly title: string;
  readonly description: string | readonly TextPart[];
  /** The confirming button's words. Defaults to `FAM_TEXT.dialog.delete` for `danger`, else `.confirm`. */
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  /** `danger` (default) for an irreversible act, `primary` for anything else. */
  readonly tone?: 'danger' | 'primary';
  /** A classic Material Icons ligature beside the title. Defaults to `warning` for `danger`. */
  readonly icon?: string;
}

interface Run {
  readonly text: string;
  readonly bold: boolean;
}

/** A short yes/no question. Closes with `DIALOG_RESULT.confirm`, or nothing. See `askConfirmation()`. */
@Component({
  selector: 'fam-confirm-dialog',
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <h2 class="confirm-title" mat-dialog-title>
      @if (icon) {
        <mat-icon [class.confirm-title__icon--danger]="danger" aria-hidden="true" class="confirm-title__icon">{{ icon }}</mat-icon>
      }
      {{ data.title }}
    </h2>
    <mat-dialog-content class="fam-dialog-body">
      <p class="confirm-description">@for (run of runs; track $index) {<span
        [class.confirm-description__strong]="run.bold">{{ run.text }}</span>}</p>
    </mat-dialog-content>
    <mat-dialog-actions class="confirm-actions">
      <button mat-button mat-dialog-close type="button">{{ cancelLabel }}</button>
      <button [class.confirm-button--danger]="danger" [mat-dialog-close]="result" mat-flat-button type="button">
        {{ confirmLabel }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    @use '@angular/material' as mat;

    .confirm-title {
      display: flex;
      gap: var(--fam-space-2);
      align-items: center;
    }

    .confirm-title__icon--danger {
      color: var(--fam-color-danger);
    }

    .confirm-description {
      margin: 0;
    }

    .confirm-description__strong {
      font-weight: 700;
    }

    .confirm-actions {
      gap: var(--fam-space-2);
    }

    .confirm-button--danger {
      @include mat.button-overrides((
        filled-container-color: var(--fam-color-danger),
        filled-label-text-color: var(--fam-on-danger),
      ));
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmDialogComponent {
  protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  private readonly text = inject(FAM_TEXT);
  protected readonly danger = (this.data.tone ?? 'danger') === 'danger';
  protected readonly icon = this.data.icon ?? (this.danger ? 'warning' : '');
  protected readonly result = DIALOG_RESULT.confirm;
  protected readonly confirmLabel = this.data.confirmLabel
    ?? (this.danger ? this.text.dialog.delete : this.text.dialog.confirm);
  protected readonly cancelLabel = this.data.cancelLabel ?? this.text.dialog.cancel;
  protected readonly runs: readonly Run[] = (typeof this.data.description === 'string'
    ? [this.data.description]
    : this.data.description)
    .map(part => typeof part === 'string' ? {text: part, bold: false} : {text: part.bold, bold: true});
}

/** Asks, and answers whether the person confirmed. Escape, the backdrop and back all answer `false`. */
export const askConfirmation = async (dialog: MatDialog, data: ConfirmDialogData): Promise<boolean> =>
  await firstValueFrom(dialog.open(ConfirmDialogComponent, {data, maxWidth: '28rem'}).afterClosed())
  === DIALOG_RESULT.confirm;
