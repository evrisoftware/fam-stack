/**
 * Values a dialog closes with. Compare `afterClosed()` emissions against these rather
 * than re-typing literals. `undefined` (Escape, backdrop, the back gesture) always
 * means "nothing was decided".
 */
export const DIALOG_RESULT = {
  confirm: 'confirm',
  delete: 'delete'
} as const;

export type DialogResult = typeof DIALOG_RESULT[keyof typeof DIALOG_RESULT];
