---
name: add-storage
description: Add Cloud Storage for Firebase to a fam-stack copy end to end — open it in the provider beside Auth and Firestore, uploads with progress that cancel on sign-out, one Firestore record per file, storage.rules, the emulator, the CSP, error sentences, a screen and its smoke step. Use when a feature needs to store files, images, photos, attachments or uploads.
---

# Add Storage

A tested reference implementation sits in `reference/` beside this file. Adapt it; never
copy it blind:

| File | Lands at |
| --- | --- |
| `layer/provide-firebase.diff` | `projects/fam-stack/firebase/provide-firebase.ts` (apply by hand) |
| `layer/errors.diff` | `projects/fam-stack/firebase/errors.ts` (apply by hand) |
| `layer/upload.ts`, `layer/upload.spec.ts` | `projects/fam-stack/firebase/` |
| `feature/*` | `projects/starter/src/app/features/<feature>/` |
| `storage.rules` | repository root |
| `firestore-files-block.rules` | inside `firestore.rules`, beside the other blocks |

The diffs apply with `git apply` to an unmodified copy; on a copy that has drifted, apply
them by hand.

## 0. Decide

Ask in one round only what the request leaves open:

- **Who reads a file:** every signed-in account (path `<feature>/{id}`) or its owner only
  (`users/{uid}/<feature>/{id}`). Both rules files carry both blocks; keep only the chosen
  one in each. The feature code is written for the shared path; for owner-only, see
  "Owner-only variant" under step 3.
- **What may be uploaded:** content types and the size limit.
- **Where it shows:** a new screen (`add-screen`) or an existing one.

Production Storage needs the Firebase project on the Blaze plan, with Storage enabled in the
console. The emulator needs neither, so the whole feature can be built first.

## 1. Open Storage in the layer

- Apply `layer/provide-firebase.diff`: `getStorage(app)` in `openFirebase` right after
  Firestore, `FIREBASE_STORAGE` provided from the same factory, `emulators.storage`
  connected once per instance, and `provideFirebase`'s comment naming the new token and
  `getStorage()`.
- `getStorage` is Storage's only opener, so the starter's `firebase-openers.d.ts` cannot bar it
  the way it bars `getAuth`/`getFirestore`: the layer's own call compiles in the same program.
  Add it to `fam-review`'s checklist item 4 instead ("no `getStorage` outside
  `provide-firebase.ts`").
- Apply `layer/errors.diff`: `isStorageUnauthorized` beside `isPermissionDenied`.
- Add `layer/upload.ts` (`trackUpload`) and its spec (which also covers
  `isStorageUnauthorized`), and export it from `firebase/public-api.ts`. `trackUpload` turns an `UploadTask` into an Observable whose
  unsubscribe cancels the upload, which is what lets `takeUntil(auth.signingOut$)` stop it.
- No new dependency: `firebase/storage` ships in the `firebase` package. The layer shows no
  sentence of its own, so `FAM_TEXT` is unchanged.

## 2. Project files

- `storage.rules` from the reference: one `match` per path, read/create/update/delete each
  stated, size and type checked, uploader stamped in `metadata.uid`, no catch-all. Limits
  looser than the app's.
- `firebase.json`:
  - `"storage": {"rules": "storage.rules"}`.
  - `"storage": {"port": 9199}` under `emulators`.
  - CSP `img-src`: add `https://firebasestorage.googleapis.com` for download URLs.
    `connect-src https://*.googleapis.com` already covers uploads.
- `package.json`: `emulators` gets `--only auth,firestore,storage`; `rules:deploy` gets
  `--only firestore,storage`.
- `environment.development.ts`: `storageBucket: 'demo-<id>.firebasestorage.app'` (without a
  bucket, `getStorage` succeeds but every `ref()` throws `storage/no-default-bucket`) and
  `storage: {host: '127.0.0.1', port: 9199}` in `emulators`. `environment.ts` already has a
  `storageBucket` line: fill it with the project's bucket.

## 3. The feature

Follow `add-collection` for the record. What is specific to files:

- **One Firestore record per object** (`feature/stored-file.ts`): name, type, size, creator,
  time. The screens list records, never bucket listings, so the list is live and shaped.
- **The record stores no URL and no path.** The object's path comes from the record's id
  (`filePath(id)`). A download URL carries a token that bypasses the rules for whoever holds
  it; it is requested at display time (`FilesService.url(id)`) and lives only in memory.
- **Upload bytes, then write the record** (`FilesService.upload`). A refused record deletes
  the bytes. The user, the id, the `ref()` and the task are all made inside `defer`: nothing
  uploads until subscription, and a missing user or bucket arrives as the stream's error,
  not as an exception out of the click handler.
- **Delete bytes, then the record** (`FilesService.remove`). `storage/object-not-found`
  counts as deleted. A failed byte deletion leaves the record, and the error is said.
- **Uploads end with the session:** `takeUntil(auth.signingOut$)` and `takeUntilDestroyed`.
  The component also unsubscribes when it is destroyed. Cancelling stops the bytes only:
  once every byte is sent, the record write runs to its end, so the screen stops offering
  Cancel at that point.
- **Bytes without a record can remain.** A tab closed between the upload and the record
  write, or a failed deletion after a refused record, leaves an object no record points to.
  Nothing lists or shows it, and its name never collides (UUID v7), but it takes space.
  Say so in the copy's `docs/principles.md`; clearing them needs a server-side sweep
  (objects older than a day with no record), which this skill does not add.
- **Refuse early:** `refuseFile` checks type and size before upload, with one sentence each.
  The rules check again, more loosely.
- **Error sentences** (`feature/file-errors.ts`): `storage/canceled` says nothing;
  `storage/unauthorized` (rules), `permission-denied` (record), `storage/retry-limit-exceeded`
  (uploads give up after about 10 minutes offline), `storage/quota-exceeded`,
  `storage/object-not-found`, then a general sentence. Never show a raw code.
- **Screen** (`feature/files.component.*`): a button opens a hidden file `<input>`; a
  determinate `mat-progress-bar` with an `aria-label` ("Uploading", then "Saving") and a
  cancel button until every byte is sent; `notification.success` once the record is written;
  deletion behind `askConfirmation`; `fam-load-status` for the list.
  `feature/file-preview.component.ts` loads each image's URL with `resource()` keyed by the
  file's id, so a new snapshot of the list does not reload every preview, and says why when
  it cannot.
- **Shell:** the service goes in `LayoutComponent.providers`, and its `load()` runs after
  `loadUser()`, inside the `destroyed` check, as `TasksService` does.

### Owner-only variant

The reference is written for the shared path. For files only their uploader sees:

- `stored-file.ts`: `filePath(uid, id)` returns `users/${uid}/files/${id}`.
- `FilesService`: the record collection is `collection(this.firestore, 'users', uid,
  FILES_COLLECTION)`. The uid is not known when the shell creates the service, so build the
  collection and the query in `load()` (after `loadUser()`), and pass the signed-in uid to
  every `filePath` and `doc()` call in `upload`, `url`, `remove` and `record`.
- `files.component.ts`: the confirmation reads "Delete <name>?", without "for everyone".
- Rules: keep only the `users/{uid}/files/{fileId}` block in `storage.rules` and in
  `firestore.rules`. Both check the uid in the path against `request.auth.uid` for every
  read, create and delete.

Images only? Keep `accept` and `FILE_TYPES` in step with the rules. Other files: link to the
download URL with `download` instead of an `<img>`. For files that must never leave the
rules, use `getBlob` and an object URL instead: `img-src blob:` is already allowed, but the
bucket then needs a CORS configuration (`gcloud storage buckets update gs://<bucket> --cors-file=cors.json`).

## 4. Rules and docs in the copy

- `firestore.rules`: `fileShapeOk` and the record block chosen in step 0 from
  `reference/firestore-files-block.rules`, its limits matching `storage.rules`.
- `CLAUDE.md`: "Inject `Firestore`, `FIREBASE_AUTH` and `FIREBASE_STORAGE`; never call
  `getAuth()`/`getFirestore()`/`getStorage()`." Add `storage.rules` beside `firestore.rules`
  in the Map, and `trackUpload` and `FIREBASE_STORAGE` to the `firebase/` line.
- `.claude/rules/firebase.md`: add `storage.rules` to `paths`, plus a short Storage section
  with the four rules above (record per object, no stored URL, upload order, delete order).
- `docs/principles.md`: add each new rule under Firebase with its **Why** and **Held by**: a
  download URL is a key, so store neither it nor the path; bytes first, record second;
  uploads end with the session; bytes without a record can remain, and how they would be
  cleared.
- The copy's README: the emulator line now includes Storage.

## 5. Smoke step

In `scripts/smoke.mjs`, after sign-in, on the files screen:

```js
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
writeFileSync(`${OUT}/upload.png`, Buffer.from(PNG, 'base64'));
const {root} = (await send('DOM.getDocument')).result;
const {nodeId} = (await send('DOM.querySelector', {nodeId: root.nodeId, selector: 'input[type=file]'})).result;
await send('DOM.setFileInputFiles', {nodeId, files: [resolve(`${OUT}/upload.png`)]});
check('uploaded file listed', await waitFor(`document.body.textContent.includes('upload.png')`));
check('preview loads', await waitFor(`document.querySelector('img.file-preview')?.naturalWidth > 0`));
```

(`writeFileSync`, `resolve` and `OUT` are already in the script.) Then delete it through the confirmation and check that the row
is gone. Object names are UUID v7, so objects left in the emulator never collide between runs.

## 6. Verify

- Run the `verify` skill, including the smoke test, with `npm run emulators` now starting
  Storage (it needs Java, like Firestore).
- In the emulator UI (http://127.0.0.1:4000/storage): one object per record, each with its
  `uid` metadata, and none left after a delete or a cancelled upload.
- Check a refusal by the rules: lower the size limit in `storage.rules` below the test file
  (the emulator reloads rules on save), upload, check that the refusal sentence shows and no
  record appears, then restore the limit. Renaming a file does not test this: the browser
  then sends the type its new extension implies.
- `npm run rules:deploy` and `npm run deploy` only when asked.
