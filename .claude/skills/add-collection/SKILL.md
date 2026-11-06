---
name: add-collection
description: Add a Firestore collection end to end on fam-stack — its type and shaping function, its rules block, a shell-provided service with a live stream that never dies, transactional writes, error sentences, and the screens that read it. Use when a feature needs new stored data.
---

# Add a collection

Reference implementation: `projects/starter/src/app/features/tasks/`.

## 1. Type (`<feature>/<thing>.ts`)

- Collection name constant.
- `<Thing>Document` (stored) and `<Thing>` (with `id`).
- Limit constants (`TITLE_MAX`…).
- Times as Unix ms; ids from `uuidv7()`.
- `shape<Thing>(raw)` reads every field with `asText`/`asCount`/`asAmount`/`asFlag`/`asList`
  and returns `null` when unshowable; `shape<Things>(docs)` drops nulls and duplicate ids.
- Domain errors (`<Thing>ConflictError`).

## 2. Rules (`firestore.rules`)

- `match /<collection>/{id}` with `read`, `create`, `update`, `delete` each stated.
- `keys().hasOnly([...])` + `hasAll([...])`, types and sizes looser than the app.
- `stampedBySelf(...)`; identity fields immutable on update; times via `clockOk(...)`.
- `updatedAt` strictly increasing when stale copies are refused.
- `delete` only if the feature deletes; owner-only data uses `isOwner(uid)`.

## 3. Service (`<feature>/<things>.service.ts`)

- `@Injectable()` without `providedIn`, listed in `LayoutComponent.providers`.
- A `query` field; `load()` uses the pattern in `.claude/rules/firebase.md`. Call it from
  `LayoutComponent.ngOnInit` after `loadUser()`, inside the `destroyed` check.
- A private `snapshot` signal (`null` = loading) and `computed()` views.
- New document: `setDoc` with a client id. Change: `mutateDocument`.

## 4. Errors and feedback

- `<feature>-errors.ts`: one sentence per cause (see `taskWriteFailure`).
- Components call the service, then `notification.success/deleted/error`; nothing when
  `mutateDocument` returns `false`.

## 5. Screens

`computed()` rows; skeleton + `<fam-load-status>`; empty state; `askConfirmation` for
destructive actions; editing in a `SHEET_DIALOG_CONFIG` sheet that closes with a draft.

## 6. Verify

- `npm run verify`, then `npm run emulators` + `npm start` + `npm run smoke`.
- Exercise the screen against the emulator; add a step to `scripts/smoke.mjs` for a main flow.
- `npm run rules:deploy` only when asked.
