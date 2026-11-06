/** `fromCache` is true while this view is not confirmed by the server. */
export interface LiveSnapshot {
  readonly fromCache: boolean;
}

/** One document as the listener has it. */
export interface LiveDocument<T> extends LiveSnapshot {
  /** The document, or `undefined` where it does not exist (or the cache has not seen it). */
  readonly data: T | undefined;
}

/** One query's documents, in the query's order. */
export interface LiveCollection<T> extends LiveSnapshot {
  readonly data: T[];
}
