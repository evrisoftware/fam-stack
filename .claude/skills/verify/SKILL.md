---
name: verify
description: Run fam-stack's verification — library build, starter build, unit tests, and (when the change reaches a user flow) the end-to-end smoke against the Firebase emulators. Use before a commit, before saying a change is done, or when asked to verify, test or check the workspace.
---

# Verify

## Always

```bash
npm run verify     # entry check + library build + starter dev build + vitest
```

All four must pass. Report failures with their output.

## When the change reaches a flow

Auth, shell, Firebase layer, rules, dialogs, notifications or anything a starter screen uses.
Needs Java for the Firestore emulator.

```bash
npm run emulators          # background; wait for "All emulators ready"
npm start                  # background; wait for the Local: URL
npm run smoke              # or: npm run smoke -- light   (or dark)
```

- Prints PASS/FAIL per step and console errors; screenshots in `tmp/smoke/`.
- The `auth/wrong-password` console error is an expected step.
- `BASE_URL` for another dev port, `CHROME_PATH` if Chrome is not found.
- Afterwards stop both processes and check ports 8080, 9099, 4400 and the dev port are free.

## Line endings

`git ls-files --eol` shows `i/lf w/lf` for changed files.
