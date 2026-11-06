import {Observable} from 'rxjs';
import {Auth, onIdTokenChanged, User} from 'firebase/auth';

/**
 * The signed-in user as a stream: nothing until the SDK has restored its session, then
 * the `User` or `null`. Errors and completion are forwarded. Cold.
 */
export const authUser = (auth: Auth): Observable<User | null> =>
  new Observable<User | null>(subscriber => onIdTokenChanged(auth,
    user => subscriber.next(user),
    error => subscriber.error(error),
    () => subscriber.complete()));
