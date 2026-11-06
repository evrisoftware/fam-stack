import {doc, DocumentSnapshot, Firestore, getDoc, runTransaction} from 'firebase/firestore';
import {asList} from 'fam-stack/core';
import {LoginHistoryStore} from 'fam-stack/backend';

/* The stored list as written, unshaped, so a rewrite keeps every entry. */
const storedLogins = (snapshot: DocumentSnapshot): readonly unknown[] =>
  snapshot.exists() ? asList((snapshot.data() as {logins?: unknown[]}).logins) : [];

/**
 * `LoginHistoryStore` over Firestore: the document `{history}/{uid}` as `{uid, logins}`,
 * prepended in a transaction. `provideFirebase` provides it.
 */
export const firestoreLoginHistory = (firestore: Firestore): LoginHistoryStore => ({
  prepend: (history, uid, entry, limit) => runTransaction(firestore, async transaction => {
    const reference = doc(firestore, history, uid);
    const previous = storedLogins(await transaction.get(reference));
    transaction.set(reference, {uid, logins: [entry, ...previous].slice(0, limit)});
  }),
  read: async (history, uid) => {
    const snapshot = await getDoc(doc(firestore, history, uid));
    return snapshot.exists() ? (snapshot.data() as {logins?: unknown}).logins : [];
  }
});
