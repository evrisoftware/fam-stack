import {Auth, signInWithEmailAndPassword, signOut, User} from 'firebase/auth';
import {map} from 'rxjs';
import {FamSession, FamUser} from 'fam-stack/backend';
import {authUser} from './auth-state';

const toFamUser = (user: User): FamUser => ({uid: user.uid, email: user.email ?? ''});

/** `FamSession` over Firebase Auth, with email and password. `provideFirebase` provides it. */
export const firebaseSession = (auth: Auth): FamSession => ({
  user: () => authUser(auth).pipe(map(user => user ? toFamUser(user) : null)),
  currentUser: () => {
    const user = auth.currentUser;
    return user ? toFamUser(user) : null;
  },
  lastSignInTime: () => {
    const time = Date.parse(auth.currentUser?.metadata.lastSignInTime ?? '');
    return Number.isFinite(time) ? time : null;
  },
  signIn: async (email, password) => toFamUser((await signInWithEmailAndPassword(auth, email, password)).user),
  signOut: () => signOut(auth)
});
