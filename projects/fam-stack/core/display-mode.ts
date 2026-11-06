/**
 * Whether this document runs as an installed app: iOS `navigator.standalone`, or the
 * `standalone` / `fullscreen` display mode.
 */
export const isStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  if ((window.navigator as {standalone?: boolean}).standalone === true) return true;
  if (typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches;
};
