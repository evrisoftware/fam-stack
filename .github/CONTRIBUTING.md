# Contributing

This file is about changing the original fam-stack. In your own copy of the template the code
is yours: change it there as you like, no permission needed.

## Before you write code

- **A bug:** open an issue with the bug form, and say whether it also happens on an
  unmodified clone of this repository. Copies drift on purpose; a bug that lives only in one
  is fixed in that copy.
- **A security problem:** never in an issue. See [SECURITY.md](SECURITY.md).
- **A larger change** (a new entry point, another Firebase service, a new runtime dependency,
  a changed principle): open a proposal first, so the design is agreed before the code.

Welcome: fixes and hardening in the layer, the rules, the hosting headers, the scripts and the
skills; accessibility; the wording in `FAM_TEXT`; documentation.

Out of scope: features of one app, `@angular/fire` or `rxfire`, server-side rendering, a UI
kit other than Angular Material, and backends other than Firebase
([`docs/own-backend.md`](../docs/own-backend.md) describes stepping off the stack, not a
second one).

## Set up

Node from `.nvmrc`, the [Firebase CLI](https://firebase.google.com/docs/cli) and Java 21 or
later for the Firestore emulator.

```bash
npm ci
npm run emulators   # terminal 1, keeps running
npm run seed        # terminal 2: creates demo@example.com / demo-password
npm start           # http://localhost:4200
```

## Write it the way the repository does

[`CLAUDE.md`](../CLAUDE.md) holds the rules that bind everywhere, and
[`.claude/rules/`](../.claude/rules) the ones for the library, Firebase, the UI and styling.
They are written for an AI agent and bind people just the same. The ones most often missed:

- Entry points depend downward only, and only `fam-stack/firebase` and the primary entry
  import the Firebase SDK. `npm run check:entries` enforces both.
- A sentence the library shows comes from `FAM_TEXT`, added to both `FAM_TEXT_EN` and
  `FAM_TEXT_ES`.
- Comments say what the code does now, in one or two lines. The reason goes in
  [`docs/principles.md`](../docs/principles.md), as a rule with its *why* and *held by*.
- 2-space indent, single quotes, LF line endings.

## A change copies would want comes with a recipe

Copies share no git history with this repository, so a fix reaches them as a recipe in
[`docs/changes/`](../docs/changes/README.md), never as a merge. When your change fixes or
changes behaviour that another copy would want (the layer, the rules, `firebase.json`, the
scripts), add its recipe in the same pull request, in the
[recipe format](../docs/changes/README.md#writing-a-recipe-in-the-original). Changes that
concern only the original, such as its README or these community files, need none.

## Check it

```bash
npm run verify   # entry check, library build, starter build and specs: what CI runs
npm run smoke    # with the emulators and npm start running; clears the emulator's data
```

Run the smoke test after touching auth, the shell, the Firebase layer, the rules or a starter
flow. The rules are not part of the build; the smoke test exercises them against the emulator
for the starter's flows.

In Claude Code, the `verify` skill runs the gate, and the smoke test when a change reaches a
flow; the `fam-review` agent reviews a diff against what the build cannot check.

## Pull requests

One change per pull request. Say what failed or was missing, and how you checked the change;
the template lists the rest.

Contributions are licensed under the project's [MIT License](../LICENSE). Everyone taking
part follows the [Code of Conduct](CODE_OF_CONDUCT.md).
