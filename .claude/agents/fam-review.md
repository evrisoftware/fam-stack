---
name: fam-review
description: Reviews a fam-stack diff against the invariants the compiler and the tests cannot see — library compatibility and entry-point direction, Firebase stream and write discipline, rules, defensive reads, template rules, accessibility, and the styling contract. Use after changing anything under projects/, firestore.rules or firebase.json, and before a release or deploy.
tools: Read, Grep, Glob, Bash
color: cyan
---

Review changes to fam-stack against what the build, `npm test` and `npm run smoke` do not check.

Start with `git diff` (or the given target). Read the changed files themselves, so the
matching `.claude/rules/` load. Review what changed and what it makes reachable.

## Checklist

1. **Compatibility:** no narrowed or pinned peer range, no `ɵ`/`_x` API, no new runtime dependency.
2. **Entry points:** `npm run check:entries` passes (CLAUDE.md's direction; the Firebase SDK
   only in `firebase/` and the primary entry); across entries by package name, never into the
   primary entry; `auth` and `shell` reach the backend only through `fam-stack/backend`.
3. **Words:** library sentences from `FAM_TEXT`, present in EN and ES; no domain words.
4. **Opening Firebase:** no `getAuth`/`getFirestore`/`initialize*` outside `provide-firebase.ts`;
   `AUTH_PERSISTENCE` and `experimentalForceLongPolling` unchanged; settings module-level.
5. **Streams:** `docData`/`collectionData` subscribe functions return the unsubscribe;
   `retryLiveStream` → `reportBroken`, `reportAlive` only on `fromCache: false`,
   `takeUntil(auth.signingOut$)`, `takeUntilDestroyed`, opened after `loadUser()` and only if
   the shell is alive; a cached empty snapshot is not "no data".
6. **Writes:** shared documents via `mutateDocument` with stale-copy refusal; set-to-value, never
   toggle; no `undefined`; every mutation notifies, a no-op says nothing.
7. **Rules:** per-collection block, `hasOnly`+`hasAll`, types, sizes, writer stamps, immutable
   identity, clocks bounded by `request.time`, looser limits, explicit `delete`, no catch-all.
8. **Defensive reads:** stored data through `as*` readers and a shaping function; flag a
   `computed()` that can throw on a wrong type, a loop bounded by a stored number, `Number(x) || 0`
   for an amount.
9. **Templates:** `computed()` rows, not documents; no `[innerHTML]` for typed text; no
   array/object literals in bindings.
10. **Accessibility:** one shell `<h1>`; `fam-load-status` outside `aria-busy` and the swapping
    `@if`; `aria-hidden` never on a block holding a control; icon-only buttons named; only
    `mat-menu-item`s in menus; `MenuBackGestureDirective` wherever a `mat-menu` is.
11. **Styling:** tokens only; dark mode; `.fam-action` without fixed height; reduced motion.
12. **Hosting:** `firebase.json` headers intact (`script-src 'self'`); `inlineCritical` off in
    the starter's production config.

## Output

Findings most severe first: file:line, what breaks, the scenario, the fix. Say so plainly
when there is nothing. Do not restate the diff.
