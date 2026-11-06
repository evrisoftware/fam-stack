---
name: adopt-upstream-change
description: Bring a fix or behaviour change from the original fam-stack repository into this copy — list the docs/changes recipes the copy has not adopted, apply the chosen one to code that may have drifted, verify it, and record it. Use when asked to update from fam-stack, pull upstream fixes, check for new changes in the template, or adopt a specific recipe.
---

# Adopt an upstream change

A copy of the template does not share history with the original, so changes arrive as
recipes (`docs/changes/*.md`, format in `docs/changes/README.md`), never as merges.

## 1. List what is new

```bash
git remote -v                                   # a remote pointing at evrisoftware/fam-stack?
git remote add upstream https://github.com/evrisoftware/fam-stack.git   # only if none does
git fetch upstream main
git ls-tree --name-only upstream/main docs/changes/
```

If the copy already uses `upstream` for something else, name the remote `fam-stack`.
Without git access, `gh api repos/evrisoftware/fam-stack/contents/docs/changes` lists them too.

A recipe is **new** when no file with the same name exists in the local `docs/changes/`.
A copy made after a recipe was written already holds that file and that code.

Show the new ones (title, date, kind, `touches`) and let the user pick, unless they named one.

## 2. Read before changing

- `git show upstream/main:docs/changes/<file>` for the recipe.
- `git show <commit>` (after the fetch) for the original change, if the recipe names one.
  It shows intent, not a patch to apply: the copy's code may differ.
- Find the places in this copy. Start at `touches`. If a path is gone or rewritten, search by
  the function, rule or behaviour the recipe names.

If the copy already behaves as the recipe describes, or has replaced that part entirely,
say so and offer to record it as declined.

## 3. Apply

- Follow **Adopt** step by step, in this copy's style and names.
- Keep this copy's own changes. Where a step conflicts with one, stop and ask.
- Rules and data migrations: show the user the `firestore.rules` diff. Never deploy.

## 4. Verify

- Run the recipe's **Check**.
- Run the `verify` skill, plus the smoke test when the recipe touches auth, the shell, the
  Firebase layer, rules or a flow.

## 5. Record

Copy the recipe into the local `docs/changes/` under the same file name and add
`adopted: <today>` to its front matter. If declined, add `declined: <today>` and a one-line
reason. Commit only if the user asks.
