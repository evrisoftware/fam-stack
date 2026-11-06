/* `localStorage` access that never throws; a failure reads as "nothing stored". */

/** The stored string, or `null` when there is none or storage cannot be read. */
export const readLocal = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

/** Stores the value; answers whether it was stored. */
export const writeLocal = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

/** Removes the value, if storage can be reached at all. */
export const removeLocal = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch {
    /* Unreachable storage already reads as empty. */
  }
};

/** The stored value parsed as JSON, or `null` when absent or unparsable. Not validated. */
export const readLocalJson = <T>(key: string): T | null => {
  const raw = readLocal(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};
