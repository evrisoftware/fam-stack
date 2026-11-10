# fam-stack

Firebase + Angular + Material as one stack, shipped as a template: a copy is cloned once and
then owned and changed freely. Nothing is published to npm. An Angular workspace with two projects:

- `projects/fam-stack`: the stack layer, eight entry points imported as `fam-stack/*`. Edited
  in place like any other source; `build:lib` (ng-packagr) is kept as the check on entry-point
  boundaries.
- `projects/starter`: the app (sign-in, shell with bottom nav, live task list, security sheet),
  where a copy builds its product. It compiles the layer from source through tsconfig `paths`.

Code, comments and docs are English. The library's user-facing words come from `FAM_TEXT`
(English default, Spanish shipped).

## Commands

Node 26 (`.nvmrc`).

- `npm start`: the starter at http://localhost:4200 against the local emulators (`demo-fam-stack`).
- `npm run emulators`: Auth + Firestore emulators (`firebase` CLI; Firestore needs Java).
  `npm run seed` then creates `demo@example.com` / `demo-password`.
- `npm run build:lib`: the library to `dist/fam-stack`.
- `npm run build`: the starter's production build to `dist/starter`.
- `npm test`: vitest on `projects/fam-stack/**/*.spec.ts` (jsdom).
- `npm run check:entries`: the layer's import direction and Firebase SDK boundary.
- `npm run lint`: ESLint with angular-eslint on `projects/` (TypeScript, templates, specs).
- `npm run smoke`: headless Chrome end-to-end against the emulators. Needs `npm run emulators`
  and `npm start`; clears the emulator's data. `BASE_URL`/`CHROME_PATH` override.
- `npm run rules:test`: `firestore.rules` against the Firestore emulator (`node:test`), under
  its own project id. Needs `npm run emulators`, or runs alone as
  `firebase emulators:exec --project demo-fam-stack --only firestore "npm run rules:test"`.
- `npm run deploy` / `npm run rules:deploy`: production. **Never run either unasked.**

## Verification gate

- `npm run verify` (entry check + lint + library build + starter dev build + tests) must pass
  before a commit.
- `npx tsc -p projects/starter/tsconfig.app.json --noEmit --rootDir projects` is faster but skips templates.
- Run `npm run smoke` after touching auth, the shell, the Firebase layer, the rules or a
  starter flow.
- Run `npm run rules:test` after touching `firestore.rules`; a rule change comes with its
  case in `scripts/firestore-rules.test.mjs`.
- `npm run lint` (`eslint.config.mjs`) holds selector prefixes, signal APIs, `inject()`,
  control flow, no `style=""`, template accessibility, public Angular API, the ban on
  `@angular/fire`/`rxfire` and Firebase's openers kept to `provideFirebase`. An exception is an override there naming its file, never a disable comment.

## Always

- Peer ranges open-ended; public Angular API only; no new runtime dependency without asking.
- Entry points depend downward only: `core`, `a11y` → nothing of ours; `backend`, `ui` →
  `core`; `firebase` → `core`, `backend`; `auth` → `core`, `backend`, `ui`; `shell` → `core`,
  `a11y`, `backend`, `ui`, `auth`; primary → anything. Only `firebase` and the primary entry
  import the Firebase SDK; `auth` and `shell` reach it through `backend`'s contracts. Import
  across entries by package name; a secondary entry never imports the primary one.
  `npm run check:entries` holds all of it; a new entry goes into its map.
- No app-specific words in the library. A shown sentence comes from `FAM_TEXT`, added to both
  `FAM_TEXT_EN` and `FAM_TEXT_ES`.
- Plain Firebase SDK, never `@angular/fire` or `rxfire`. Inject `Firestore` and
  `FIREBASE_AUTH`; never call `getAuth()`/`getFirestore()`.
- Streams: `docData`/`collectionData` → `retryLiveStream(report)` → `link.reportBroken`,
  `reportAlive` on `fromCache: false`, `takeUntil(auth.signingOut$)`. Open only after
  `AuthService.loadUser()`.
- Writes to a document several devices edit go through `mutateDocument`.
- Read stored data with `asList`/`asCount`/`asAmount`/`asText`/`asFlag`, shaped once per
  document type; templates render `computed()` rows, never documents.
- Components: standalone, OnPush, `inject()`, signal APIs, `@if`/`@for`, SCSS, zoneless.
  Material modules in a file-local `MATERIAL_MODULES`. Selectors `fam-*` / `[fam*]` (library),
  `app-*` (starter).
- Styles read `--fam-*` / `--mat-sys-*` tokens: no hard-coded colours, keyword font sizes or
  inline `style=""`. Component SCSS may `@use 'fam-stack/styles'`.
- Comments say only what the code does now, in one or two lines; the why goes in
  `docs/principles.md`.
- A fix or behaviour change another copy of the template would want (layer, rules,
  `firebase.json`, scripts) gets a `docs/changes/` entry in the same commit.
- 2-space indent, single quotes, LF line endings.

## Map

```
projects/fam-stack/
  src/        provideFamStack()
  core/       FAM_TEXT (EN/ES), asList/asCount/asAmount/asText/asFlag, uuidv7,
              readLocal/writeLocal, clockSignal, isStandalone
  backend/    FamSession, LinkTransport, LoginHistoryStore (what auth and shell read),
              FamUser, LiveSnapshot, retryLiveStream, redirectUnauthorizedTo/
              redirectLoggedInTo, LinkService
  firebase/   provideFirebase + FIREBASE_AUTH (and backend's contracts over Firebase),
              docData/collectionData, linkProbe, authUser, mutateDocument,
              withoutUndefined, isPermissionDenied
  auth/       AuthService (signingOut$), LoginHistoryService, shapeLoginRecord, describeDevice,
              FAM_AUTH_CONFIG
  ui/         NotificationService + NoticeComponent, DialogHistoryService,
              MenuBackGestureDirective, dialog presets, ConfirmDialog/askConfirmation,
              GlobalErrorHandler, TextScaleService/Component, famNumberFormat, emailName
  a11y/       famLiveRegion, fam-live-note, fam-load-status, famScrollRegion
  shell/      defineScreens, injectCurrentScreen, fam-bottom-nav, fam-link-banner,
              ReconnectService, famViewTransitions + QUIET_NAVIGATION
  styles/     _index, _tokens, _base, _material, _utilities, _mixins, _fonts
projects/starter/src/app/
  app.config.ts  app.routes.ts  screens.ts  login-route.ts
  shell/      layout, login, not-found, security-dialog, shell.routes
  features/   tasks/ (live-collection example), home/ (derived summary)
firestore.rules   firebase.json   scripts/
docs/         principles.md, own-backend.md, changes/ (recipes other copies adopt)
```

`docs/principles.md` holds each rule's rationale. `.claude/agents/fam-review.md` reviews a
diff against the invariants the build cannot check. Skills `make-it-yours` (first setup of a
copy) and `adopt-upstream-change` (apply a `docs/changes/` recipe from the original) cover a
copy's life cycle.
