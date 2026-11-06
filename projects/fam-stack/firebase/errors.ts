/** The `code` of a Firebase error (`'permission-denied'`, `'auth/network-request-failed'`…), or `null`. */
export const firebaseErrorCode = (error: unknown): string | null => {
  if (typeof error !== 'object' || error === null) return null;
  const code = (error as {code?: unknown}).code;
  return typeof code === 'string' ? code : null;
};

/** Whether Firestore's security rules refused the operation. */
export const isPermissionDenied = (error: unknown): boolean =>
  firebaseErrorCode(error) === 'permission-denied';
