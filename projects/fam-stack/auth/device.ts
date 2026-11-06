/* Labels for a user agent; unknown agents get generic words. The checks run in order. */

const platformOf = (userAgent: string): string => {
  if (/Android/i.test(userAgent)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS';
  if (/Windows/i.test(userAgent)) return 'Windows';
  if (/Macintosh|Mac OS/i.test(userAgent)) return 'macOS';
  if (/CrOS/i.test(userAgent)) return 'ChromeOS';
  if (/Linux/i.test(userAgent)) return 'Linux';
  return 'Device';
};

const browserOf = (userAgent: string): string => {
  if (/Edg\w*\//i.test(userAgent)) return 'Edge';
  if (/OPR\/|Opera/i.test(userAgent)) return 'Opera';
  if (/SamsungBrowser/i.test(userAgent)) return 'Samsung Internet';
  if (/Firefox\/|FxiOS\//i.test(userAgent)) return 'Firefox';
  if (/Chrome\/|CriOS\//i.test(userAgent)) return 'Chrome';
  if (/Safari\//i.test(userAgent)) return 'Safari';
  return 'Browser';
};

/** "Chrome · Android", "Safari · iOS"… */
export const describeDevice = (userAgent: string): string =>
  `${browserOf(userAgent)} · ${platformOf(userAgent)}`;

/** A classic Material Icons ligature for the device class. */
export const deviceIcon = (userAgent: string): string =>
  /Android|iPhone|iPad|iPod/i.test(userAgent) ? 'smartphone' : 'computer';
