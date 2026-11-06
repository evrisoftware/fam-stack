import {Observable, Subscriber} from 'rxjs';
import {
  DocumentReference,
  DocumentSnapshot,
  FirestoreError,
  onSnapshot,
  Query,
  QuerySnapshot,
  SnapshotListenOptions
} from 'firebase/firestore';
import {LiveCollection, LiveDocument, LiveSnapshot} from 'fam-stack/backend';

/*
 * A document or a query as an Observable of `{data, fromCache}`.
 *
 * - Listens with `includeMetadataChanges: true`.
 * - The id is written after the data, over any stored field of that name.
 * - A missing document yields `data: undefined`.
 * - `error` and `complete` are forwarded; each subscribe function returns
 *   `onSnapshot`'s unsubscribe as its teardown.
 *
 * The type argument is a cast; read the data through `fam-stack/core`'s defensive readers.
 */

export interface LiveDataOptions {
  /** The field the document's id is written to. */
  idField?: string;
}

const LISTEN: SnapshotListenOptions = {includeMetadataChanges: true};

/* The data with the id added; non-object data and an empty `idField` are returned as they are. */
const snapToData = <T>(snapshot: DocumentSnapshot, idField: string | undefined): T | undefined => {
  const data = snapshot.data();
  if (data === null || typeof data !== 'object' || !idField) {
    return data as T | undefined;
  }
  return {...data, [idField]: snapshot.id} as T;
};

const forwardTo = <S, V>(subscriber: Subscriber<V>, shape: (snapshot: S) => V) => ({
  next: (snapshot: S) => subscriber.next(shape(snapshot)),
  error: (error: FirestoreError) => subscriber.error(error),
  complete: () => subscriber.complete()
});

/** A live document. Cold: each subscription opens its own listener. */
export const docData = <T>(reference: DocumentReference, options: LiveDataOptions = {}): Observable<LiveDocument<T>> =>
  new Observable<LiveDocument<T>>(subscriber => onSnapshot(reference, LISTEN,
    forwardTo(subscriber, (snapshot: DocumentSnapshot) => ({
      data: snapToData<T>(snapshot, options.idField),
      fromCache: snapshot.metadata.fromCache
    }))));

/** A live query. Cold: each subscription opens its own listener. */
export const collectionData = <T>(query: Query, options: LiveDataOptions = {}): Observable<LiveCollection<T>> =>
  new Observable<LiveCollection<T>>(subscriber => onSnapshot(query, LISTEN,
    forwardTo(subscriber, (snapshot: QuerySnapshot) => ({
      data: snapshot.docs.map(document => snapToData<T>(document, options.idField) as T),
      fromCache: snapshot.metadata.fromCache
    }))));

/** A target's `fromCache` on every snapshot, without its data: the probe for `LinkService.watch`. Cold. */
export const linkProbe = (target: Query | DocumentReference): Observable<LiveSnapshot> =>
  new Observable<LiveSnapshot>(subscriber => target.type === 'document'
    ? onSnapshot(target, LISTEN,
      forwardTo(subscriber, (snapshot: DocumentSnapshot) => ({fromCache: snapshot.metadata.fromCache})))
    : onSnapshot(target, LISTEN,
      forwardTo(subscriber, (snapshot: QuerySnapshot) => ({fromCache: snapshot.metadata.fromCache}))));
