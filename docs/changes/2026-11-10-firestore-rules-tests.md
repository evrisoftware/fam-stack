---
title: Test firestore.rules case by case against the emulator
date: 2026-11-10
kind: tooling
principles: [12]
touches:
  - scripts/firestore-rules.test.mjs
  - package.json
  - .github/workflows/verify.yml
---

## What failed

Nothing checked the rules on their own. The smoke test only sends the writes the starter's
screens send, all of them valid, so a rule loosened by mistake (a size limit, a stamp
left unchecked, a `delete` left open) passed every check and would have reached production with
`npm run rules:deploy`.

## What changed

`npm run rules:test` runs `scripts/firestore-rules.test.mjs` with `node --test` and
`@firebase/rules-unit-testing` (a new devDependency) against the Firestore emulator. For
`tasks`, `loginHistory` and a path no block names, it states what each of read, create,
update and delete accepts and each thing it refuses: signed out, another account, a missing
or extra key, each type and size limit, the writer stamps, the clock bounds, the immutable
fields and the list that may not shrink.

The tests use the project id `demo-fam-stack-rules`, so they neither read nor clear the data
of a running `npm run emulators`. CI runs them in a second job, inside
`firebase emulators:exec`.

## Adopt

1. `npm install --save-dev @firebase/rules-unit-testing`, in the major whose peer range
   matches your `firebase` version. Version 6 needs Node 24.12 or later: drop Node 22 from
   `engines` in `package.json` and from the README if they still list it.
2. Add the script `"rules:test": "node --test scripts/firestore-rules.test.mjs"`.
3. Copy `scripts/firestore-rules.test.mjs`. Keep its head (environment, `as`, `anonymous`,
   `seed`) and the `any other path` block; rename `PROJECT_ID` after your emulator project
   with a `-rules` suffix.
4. Replace the `tasks` and `loginHistory` blocks with one `describe` per collection in your
   `firestore.rules`. Per operation, write one accepted case and one refusal for every
   condition of its `allow`. Within a test, assert the refusals before the accepted write: a
   second write to the same id is an update, and would be refused for another reason.
5. Loosen one condition of each `allow` by hand, see its test fail, and restore it. A
   condition whose loosening fails no test has no case yet, unless another condition of the
   same `allow` already refuses the same writes.
6. In CI, add a job with Java 21 or later that runs
   `npx firebase-tools emulators:exec --project <your demo id> --only firestore "npm run rules:test"`.
7. If you have `storage.rules`, the same environment takes a `storage` entry; give it a
   test file of its own.

## Check

With `npm run emulators` running, `npm run rules:test` passes. After changing
`task.title.size() <= 200` to `<= 300` in `firestore.rules`, the test
`the title is 1 to 200 characters of text` fails; restore the rule.
