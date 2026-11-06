import {firebaseErrorCode, isPermissionDenied, isStorageUnauthorized} from 'fam-stack/firebase';

/** What to tell the person when an upload fails, or `null` when it was cancelled. */
export const uploadFailure = (error: unknown): string | null => {
  const code = firebaseErrorCode(error);
  if (code === 'storage/canceled') return null;
  if (isStorageUnauthorized(error)) return 'The server refused this file. Check its type and size, or sign in again.';
  if (isPermissionDenied(error)) return 'The server refused to save the file. Sign in again and retry.';
  if (code === 'storage/retry-limit-exceeded') return 'The connection dropped for too long. Try again once you are online.';
  if (code === 'storage/quota-exceeded') return 'There is no room left for files. Remove some and try again.';
  return 'Could not add the file. Try again.';
};

/** What to tell the person when a file cannot be shown or removed. */
export const fileFailure = (error: unknown): string => {
  const code = firebaseErrorCode(error);
  if (code === 'storage/object-not-found') return 'This file is missing from storage.';
  if (isStorageUnauthorized(error) || isPermissionDenied(error)) return 'The server refused. Sign in again and retry.';
  if (code === 'storage/retry-limit-exceeded' || code === 'unavailable') {
    return 'This needs a connection. Try again once you are online.';
  }
  return 'Something went wrong with this file. Try again.';
};
