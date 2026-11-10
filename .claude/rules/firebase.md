---
paths:
  - "projects/fam-stack/firebase/**"
  - "projects/fam-stack/backend/**"
  - "projects/fam-stack/auth/**"
  - "projects/starter/src/app/**/*.service.ts"
  - "projects/starter/src/app/features/**/*.ts"
  - "firestore.rules"
  - "firebase.json"
---

# Firebase

## SDK

- Never call `initializeApp`, `initializeAuth` or `initializeFirestore` outside `provideFirebase`.
- Keep IndexedDB in `AUTH_PERSISTENCE` and `experimentalForceLongPolling` in the defaults.
- Emulators connect inside `openFirebase`, once per instance.
- `provideFirebase` also provides `fam-stack/backend`'s `FamSession`, `LinkTransport` and
  `LoginHistoryStore`; `auth` and `shell` reach Firebase only through them.

## Live list or document

```ts
collectionData<unknown>(this.query, {idField: 'id'}).pipe(
  retryLiveStream(error => this.link.reportBroken(STREAM, error)),
  takeUntil(this.auth.signingOut$),
  takeUntilDestroyed(this.destroyRef)
).subscribe(({data, fromCache}) => {
  if (!fromCache) this.link.reportAlive(STREAM);
  if (fromCache && data.length === 0 && this.snapshot() === null) return;
  this.snapshot.set(shapeAll(data));
});
```

- The service is in `LayoutComponent.providers`; `load()` runs after `AuthService.loadUser()`
  resolves and only if the shell is not destroyed.
- `docData`/`collectionData` subscribe functions return `onSnapshot`'s unsubscribe as an
  expression body.
- Only a `fromCache: false` snapshot calls `reportAlive`.
- The shell's link probe is `linkProbe(query)` on a query the app already listens to and the
  rules always allow.

## Writes

- `mutateDocument`: return `current` for no change, keep `change` pure, throw a domain error
  (`TaskConflictError`) when the stored `updatedAt` moved.
- Name intent (`setDone(task, true)`), never toggle.
- New document with a client UUID v7: plain `setDoc`.
- No `undefined` in a write: `withoutUndefined`, or omit the key.
- Times: device Unix ms, bounded by the rules against `request.time`.

## Errors

One sentence per cause, as in `task-errors.ts`: conflict, deleted, `permission-denied`,
`unavailable`, anything else. Never show a raw code.

## `firestore.rules`

- One `match` block per collection, stating read, create, update and delete. No catch-all.
- Check shape (`keys().hasOnly`, `hasAll`), types and sizes; `stampedBySelf`; identity fields
  immutable on update.
- Limits looser than the app's.
- Grant delete explicitly; append-only lists refuse shrinking updates.
- Every allow has cases in `scripts/firestore-rules.test.mjs`: what it accepts and each thing
  it refuses, with the refusals asserted before the accepted write to the same id.
- `npm run rules:test` and `npm run smoke` pass before `npm run rules:deploy`.
