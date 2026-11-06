import {DestroyRef, Directive, ElementRef, inject, input} from '@angular/core';

/**
 * Shapes typed text as a number: digits, one decimal point (a comma counts as one), at
 * most `places` decimals, no redundant leading zeros, nothing above `max` (trailing
 * characters are dropped until it fits). Never adds a character; `''` stays `''`.
 */
export const shapeNumberText = (typed: string, places: number, max: number): string => {
  const decimals = Math.max(0, Math.floor(Number(places) || 0));
  let text = typed.replace(/,/g, '.').replace(decimals > 0 ? /[^0-9.]/g : /[^0-9]/g, '');
  const point = text.indexOf('.');
  if (point !== -1) {
    text = (text.slice(0, point + 1) + text.slice(point + 1).replace(/\./g, '')).slice(0, point + 1 + decimals);
  }
  text = text.replace(/^0+(?=[0-9])/, '');
  while (max > 0 && Number(text) > max) text = text.slice(0, -1);
  return text;
};

/**
 * Applies `shapeNumberText` on `input` in the capture phase, before `ngModel` reads the
 * value. Use with one-way `[ngModel]` and an `(ngModelChange)` that keeps the text and
 * parses it with `parseNumberField`.
 */
@Directive({selector: 'input[famNumberFormat]'})
export class NumberFormatDirective {
  /** The ceiling. */
  readonly famNumberMax = input.required<number>();
  /** Decimal places allowed; 0 for whole numbers. */
  readonly famNumberDecimals = input<number>(2);

  private readonly field = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;

  constructor() {
    const shape = (): void => {
      const typed = this.field.value;
      const shaped = shapeNumberText(typed, this.famNumberDecimals(), this.famNumberMax());
      /* Assigned only when changed: assigning moves the caret to the end. */
      if (shaped !== typed) this.field.value = shaped;
    };
    this.field.addEventListener('input', shape, true);
    inject(DestroyRef).onDestroy(() => this.field.removeEventListener('input', shape, true));
  }
}

/** The field's text as a number clamped to `[0, max]`, or `null` when empty or not a number. */
export const parseNumberField = (text: string | number | null | undefined, max: number): number | null => {
  if (text === null || text === undefined || `${text}`.trim() === '') return null;
  const value = Number(`${text}`.replace(',', '.'));
  if (!Number.isFinite(value)) return null;
  return Math.min(Math.max(0, value), max);
};
