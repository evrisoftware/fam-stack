import {MatDialogConfig} from '@angular/material/dialog';

/* Dialog presets. Spread one into `MatDialog.open()` and add `data` / `disableClose`. */

/** Bottom sheet (`.fam-sheet`): bottom edge, full width up to 30rem, focus on the sheet itself. */
export const SHEET_DIALOG_CONFIG: Pick<MatDialogConfig,
  'panelClass' | 'position' | 'width' | 'maxWidth' | 'autoFocus' | 'enterAnimationDuration' | 'exitAnimationDuration'> = {
  panelClass: 'fam-sheet',
  position: {bottom: '0'},
  width: '100%',
  maxWidth: '30rem',
  autoFocus: 'dialog',
  enterAnimationDuration: 320,
  exitAnimationDuration: 200
};

/** Full screen (`.fam-full-screen`): the whole viewport, focus on the dialog itself. */
export const FULL_SCREEN_DIALOG_CONFIG: Pick<MatDialogConfig,
  'panelClass' | 'width' | 'maxWidth' | 'height' | 'maxHeight' | 'autoFocus'> = {
  panelClass: 'fam-full-screen',
  width: '100%',
  maxWidth: '100vw',
  height: '100dvh',
  maxHeight: '100dvh',
  autoFocus: 'dialog'
};
