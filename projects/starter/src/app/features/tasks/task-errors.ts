import {firebaseErrorCode, isPermissionDenied, MissingDocumentError} from 'fam-stack/firebase';
import {TaskConflictError} from './task';

/** What to tell the person when a task write fails — one sentence per honest cause. */
export const taskWriteFailure = (error: unknown): string => {
  if (error instanceof TaskConflictError) return 'Someone changed this task meanwhile. Check it and try again.';
  if (error instanceof MissingDocumentError) return 'This task was deleted on another device.';
  if (isPermissionDenied(error)) {
    return 'The server refused the change. Check this device\'s date and time, or sign in again.';
  }
  if (firebaseErrorCode(error) === 'unavailable') return 'This change needs a connection. Try again once you are online.';
  return 'Could not save the change. Try again.';
};
