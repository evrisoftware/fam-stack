import {Observable} from 'rxjs';
import {UploadTask} from 'firebase/storage';

/** How far an upload has gone: `fraction` from 0 to 1, `done` once the object is stored. */
export interface UploadProgress {
  readonly fraction: number;
  readonly done: boolean;
}

/**
 * The task's progress as an Observable that completes once the object is stored and
 * errors with the task's `StorageError`. Unsubscribing before that cancels the upload.
 */
export const trackUpload = (task: UploadTask): Observable<UploadProgress> =>
  new Observable<UploadProgress>(subscriber => {
    let settled = false;
    task.on(
      'state_changed',
      ({bytesTransferred, totalBytes}) =>
        subscriber.next({fraction: totalBytes > 0 ? bytesTransferred / totalBytes : 0, done: false}),
      error => {
        settled = true;
        subscriber.error(error);
      },
      () => {
        settled = true;
        subscriber.next({fraction: 1, done: true});
        subscriber.complete();
      }
    );
    return () => {
      if (!settled) task.cancel();
    };
  });
