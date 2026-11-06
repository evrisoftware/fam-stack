/*
 * Readers for stored data, whose declared types are only a cast. Each returns a safe
 * value of the declared type and never throws.
 */

/** The value if it is an array, otherwise an empty one. */
export const asList = <T>(value: readonly T[] | null | undefined): readonly T[] =>
  Array.isArray(value) ? value : [];

/** A whole, non-negative count no larger than `max` (fractions are floored). */
export const asCount = (value: unknown, max: number = Number.MAX_SAFE_INTEGER): number =>
  Math.min(Math.max(0, Math.floor(Number(value) || 0)), max);

/** A finite amount rounded to cents, otherwise 0. */
export const asAmount = (value: unknown): number => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  const rounded = Number(amount.toFixed(2));
  return rounded === 0 ? 0 : rounded;
};

/** A string trimmed to at most `max` code points, otherwise `''`. */
export const asText = (value: unknown, max: number = Number.POSITIVE_INFINITY): string => {
  if (typeof value !== 'string') return '';
  const text = value.trim();
  if (text.length <= max) return text;
  const points = Array.from(text);
  return points.length <= max ? text : points.slice(0, max).join('').trimEnd();
};

/** The value if it is a boolean, otherwise `fallback`. */
export const asFlag = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback;
