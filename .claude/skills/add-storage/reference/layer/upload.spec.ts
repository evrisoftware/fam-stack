import {UploadTask, UploadTaskSnapshot} from 'firebase/storage';
import {isStorageUnauthorized, trackUpload, UploadProgress} from 'fam-stack/firebase';

/* An `UploadTask` whose callbacks a test drives, counting `cancel()` calls. */
const fakeTask = () => {
  let next: (snapshot: UploadTaskSnapshot) => void = () => undefined;
  let fail: (error: unknown) => void = () => undefined;
  let finish: () => void = () => undefined;
  let cancels = 0;
  const task = {
    on: (_event: string, n: typeof next, e: typeof fail, c: typeof finish) => {
      next = n;
      fail = e;
      finish = c;
    },
    cancel: () => ++cancels > 0
  } as unknown as UploadTask;
  return {
    task,
    progress: (bytesTransferred: number, totalBytes: number) =>
      next({bytesTransferred, totalBytes} as UploadTaskSnapshot),
    fail: (error: unknown) => fail(error),
    finish: () => finish(),
    cancels: () => cancels
  };
};

describe('trackUpload', () => {
  it('emits the fraction sent, then done, then completes', () => {
    const upload = fakeTask();
    const seen: UploadProgress[] = [];
    let completed = false;
    trackUpload(upload.task).subscribe({next: p => seen.push(p), complete: () => completed = true});

    upload.progress(0, 0);
    upload.progress(50, 200);
    upload.finish();
    expect(seen).toEqual([
      {fraction: 0, done: false},
      {fraction: 0.25, done: false},
      {fraction: 1, done: true}
    ]);
    expect(completed).toBe(true);
    expect(upload.cancels()).toBe(0);
  });

  it('cancels the upload when unsubscribed before it is stored', () => {
    const upload = fakeTask();
    trackUpload(upload.task).subscribe().unsubscribe();
    expect(upload.cancels()).toBe(1);
  });

  it('forwards the error and does not cancel a task that already failed', () => {
    const upload = fakeTask();
    const errors: unknown[] = [];
    const subscription = trackUpload(upload.task).subscribe({error: e => errors.push(e)});
    upload.fail({code: 'storage/unauthorized'});
    subscription.unsubscribe();
    expect(errors).toEqual([{code: 'storage/unauthorized'}]);
    expect(upload.cancels()).toBe(0);
  });
});

describe('isStorageUnauthorized', () => {
  it('recognises only a refusal by the Storage rules', () => {
    expect(isStorageUnauthorized({code: 'storage/unauthorized'})).toBe(true);
    expect(isStorageUnauthorized({code: 'permission-denied'})).toBe(false);
    expect(isStorageUnauthorized(new Error('storage/unauthorized'))).toBe(false);
    expect(isStorageUnauthorized(null)).toBe(false);
  });
});
