---
paths:
  - "projects/fam-stack/**"
---

# Library

## Public API

- An entry exports only through its `public-api.ts`; anything not exported there is private.
- Changing an exported name, signature or behaviour: update every caller in the starter, and
  add a `docs/changes/` entry when another copy of the template would want the change.
- New entry point: a folder with `ng-package.json` (`{"lib": {"entryFile": "public-api.ts"}}`)
  and `public-api.ts`, plus its line in `scripts/check-entries.mjs` and CLAUDE.md's direction.
- Inside an entry, relative imports; across entries, the package name.
- Only `firebase/` and the primary entry import the Firebase SDK. `auth`, `shell` and anything
  else read the backend through `fam-stack/backend` (`FamSession`, `LinkTransport`,
  `LoginHistoryStore`), which `provideFirebase` provides.

## Compatibility

- Peers stay `>=22.0.0` (Angular, Material) and `>=12` (firebase), so the layer never holds
  back an `ng update` or a private publish of a copy.
- No API marked `ɵ`, `_private` or excluded from the release type.
- Firestore settings objects are module-level constants.

## Words and styles

- New sentence: add it to `FamText`, `FAM_TEXT_EN` and `FAM_TEXT_ES`. Console messages are
  English and never shown.
- Component styles may `@use '../styles/mixins'`.
- New token: `styles/_tokens.scss` with a one-line comment. New global class: `_utilities.scss`
  (Material overrides: `_material.scss`), prefixed `fam-`.
- `styles/` ships as an asset, exported as `fam-stack/styles` (`sass` condition).

## Tests

- Pure logic and guards: `*.spec.ts` beside the file (vitest globals, jsdom), importing by
  package name (`fam-stack/core`).
- A service over the backend contracts: a spec with fakes of them (`backend/link.service.spec.ts`,
  `auth/auth.service.spec.ts`).
- Anything needing a real Firestore: `npm run smoke`.
