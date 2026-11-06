---
name: lift-from-app
description: Bring a piece of an existing Angular + Firebase + Material app into the fam-stack library — choosing what generalises, stripping the domain, keeping the hard-won behaviour, rewriting comments to current behaviour, and proving it with the build, specs and the smoke test. Use when asked to port, extract, upstream or "take from" another app (for example a sibling folder such as ../my-app).
---

# Lift a piece of an app into the library

Never copy anything that identifies the source app (project ids, emails, business names,
Firebase configs) into this repository.

## 1. Decide whether it belongs

All must hold:
- Two different apps would use it unchanged or with a parameter.
- It encodes behaviour that is easy to get wrong.
- It can be written without the source's domain words or types.

Otherwise: an example in the starter, a pattern in `docs/principles.md`, or nothing.

## 2. Read the whole source

List every invariant its comments state and keep each behaviour in the port.

## 3. Generalise

- Domain types → generic parameters or the caller's types.
- Domain words → `FAM_TEXT` (`FamText`, `FAM_TEXT_EN`, `FAM_TEXT_ES`) or inputs.
- Hard-coded names → options with defaults, or an injection token with a factory default
  (`FAM_AUTH_CONFIG`, `TEXT_SCALE_STORAGE_KEY`).
- App tokens → `--fam-*` / `--mat-sys-*`; brand colours → the Material theme.
- Selectors → `fam-*` / `[fam*]`; classes → `.fam-*`.
- Entry point by its dependencies (see CLAUDE.md); a new entry only for a separate concern.

## 4. Comments

Current behaviour only, one or two lines each. Rationale worth keeping goes to
`docs/principles.md` (rule, why, held by).

## 5. Prove it

- A spec for pure logic, beside the file, importing by package name.
- Use it from the starter if user-visible; extend `scripts/smoke.mjs` for a main flow.
- `npm run verify`; `npm run smoke`.
- Export from the entry's `public-api.ts`; add it to the README's entry-point table and
  CLAUDE.md's map.

## 6. Report back

What was lifted, what stayed in the source app and why, and every behaviour that differs
from the source.
