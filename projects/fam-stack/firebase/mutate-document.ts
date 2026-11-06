import {DocumentData, DocumentReference, Firestore, runTransaction} from 'firebase/firestore';

/** The document `mutateDocument` was asked to change does not exist. */
export class MissingDocumentError extends Error {
  constructor(readonly path: string) {
    super(`Document ${path} does not exist.`);
    this.name = 'MissingDocumentError';
  }
}

/** A write would have grown a document past the caller's `growthLimit`. */
export class DocumentTooLargeError extends Error {
  constructor(readonly path: string, readonly size: number) {
    super(`Document ${path} would grow to ${size} characters.`);
    this.name = 'DocumentTooLargeError';
  }
}

export interface MutateDocumentOptions {
  /**
   * Refuse a write that leaves the document larger than this many JSON characters AND
   * larger than it was. Shrinking writes always pass.
   */
  readonly growthLimit?: number;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

/**
 * The value without `undefined`: object keys holding it are dropped, array elements
 * become `null`. Class instances (`Timestamp`, `serverTimestamp()`…) pass untouched.
 */
export const withoutUndefined = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map(element => element === undefined ? null : withoutUndefined(element)) as T;
  }
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(value)) {
      if (field !== undefined) result[key] = withoutUndefined(field);
    }
    return result as T;
  }
  return value;
};

const jsonSize = (value: unknown): number => JSON.stringify(value)?.length ?? 0;

/**
 * In one transaction, reads the document, applies `change` to the stored copy and
 * writes the result. Answers whether it wrote. Use for any document more than one
 * device writes.
 *
 * - Return the same object from `change` for "nothing to do": no write.
 * - `change` may run more than once; keep it pure.
 * - Needs the server; fails offline.
 */
export const mutateDocument = <T extends DocumentData>(
  firestore: Firestore,
  reference: DocumentReference,
  change: (current: T) => T,
  options: MutateDocumentOptions = {}
): Promise<boolean> =>
  runTransaction(firestore, async transaction => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists()) throw new MissingDocumentError(reference.path);
    const current = snapshot.data() as T;
    const next = change(current);
    if (next === current) return false;
    const document = withoutUndefined(next);
    if (options.growthLimit !== undefined) {
      const size = jsonSize(document);
      if (size > options.growthLimit && size > jsonSize(current)) {
        throw new DocumentTooLargeError(reference.path, size);
      }
    }
    transaction.set(reference, document);
    return true;
  });
