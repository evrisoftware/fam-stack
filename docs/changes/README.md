# Changes

fam-stack is a template: every copy owns its code and drifts from the original on purpose.
Nothing reaches a copy by `npm update`. When the original fixes a failure or improves a
behaviour that other copies would want, it records the change here as a **recipe**: what
failed, what changed, and how to tell it worked. A copy's maintainer, or their agent, reads
the recipe and applies the change to their own code, however far that code has drifted.

Recipes describe intent and name the places to look. A diff only applies to code that still
matches the original, so a recipe never relies on one.

## Adopting a change in your copy

With Claude Code, run the `adopt-upstream-change` skill: it lists the recipes your copy has
not adopted yet, applies the one you choose, and verifies it.

By hand:

1. Read new recipes in the original's [`docs/changes/`](https://github.com/evrisoftware/fam-stack/tree/main/docs/changes).
2. Apply each one you want, following its **Adopt** steps against your own code.
3. Run its **Check**, then `npm run verify` (and `npm run smoke` if it touches a flow).
4. Copy the recipe file into your `docs/changes/` and add `adopted: <date>` to its front
   matter. A recipe you decide against gets `declined: <date>` and a one-line reason. Either
   way it no longer shows up as new.

## Writing a recipe (in the original)

One file per change, named `YYYY-MM-DD-short-slug.md`, added in the same commit as the change.
Changes that only concern the original (its README, its roadmap) need no recipe.

```markdown
---
title: Retry a live stream after a permission error once the token refreshes
date: 2026-11-05
kind: fix            # fix | behaviour | structure | rules | hosting | tooling
principles: [5, 7]   # numbers in docs/principles.md, or []
touches:             # where the change lands in an unmodified copy
  - projects/fam-stack/firebase/live-stream.ts
  - firestore.rules
commit: <hash in the original, for reference>
---

## What failed

The scenario and its symptom, as someone using the app sees it.

## What changed

The behaviour after the change, in one or two paragraphs. Name the functions, rules or
settings involved, not line numbers.

## Adopt

Numbered steps a copy can follow even if the files above were renamed or rewritten:
what to find (by behaviour or name), what to change it to, and any data or rules migration.

## Check

How to see that it works: a spec, a smoke step, or a manual scenario against the emulators.
```
