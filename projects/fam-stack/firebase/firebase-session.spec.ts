import {Auth} from 'firebase/auth';
import {firstValueFrom, take, toArray} from 'rxjs';
import {firebaseSession} from 'fam-stack/firebase';

type Emission = (next: (user: unknown) => void, error: (e: unknown) => void, complete: () => void) => void;

/* `onIdTokenChanged(auth, …)` calls `auth.onIdTokenChanged(…)`, so a fake instance can drive
 * the session through every shape the SDK could hand it. */
const fakeAuth = (emit: Emission, currentUser: unknown = null): Auth => ({
  currentUser,
  onIdTokenChanged: (next: (user: unknown) => void, error: (e: unknown) => void, complete: () => void) => {
    emit(next, error, complete);
    return () => undefined;
  }
}) as unknown as Auth;

const signedIn = (lastSignInTime: string) => ({uid: 'u1', email: 'a@example.com', metadata: {lastSignInTime}});

describe('firebaseSession', () => {
  it('maps a Firebase user to {uid, email}, and anything falsy to null', async () => {
    const session = firebaseSession(fakeAuth(next => {
      next({uid: 'u1', email: null});
      next(null);
      next(undefined);
    }));
    expect(await firstValueFrom(session.user().pipe(take(3), toArray())))
      .toEqual([{uid: 'u1', email: ''}, null, null]);
  });

  it('forwards an error and an empty completion, so the guards fail closed', async () => {
    await expect(firstValueFrom(firebaseSession(fakeAuth((_next, error) => error(new Error('storage')))).user()))
      .rejects.toThrow('storage');
    await expect(firstValueFrom(firebaseSession(fakeAuth((_next, _error, complete) => complete())).user()))
      .rejects.toThrow();
  });

  it('reads the current user and the last sign-in time, or null', () => {
    const time = 'Thu, 05 Nov 2026 10:00:00 GMT';
    const session = firebaseSession(fakeAuth(() => undefined, signedIn(time)));
    expect(session.currentUser()).toEqual({uid: 'u1', email: 'a@example.com'});
    expect(session.lastSignInTime()).toBe(Date.parse(time));

    expect(firebaseSession(fakeAuth(() => undefined, signedIn('soon'))).lastSignInTime()).toBeNull();
    const signedOut = firebaseSession(fakeAuth(() => undefined));
    expect(signedOut.currentUser()).toBeNull();
    expect(signedOut.lastSignInTime()).toBeNull();
  });
});
