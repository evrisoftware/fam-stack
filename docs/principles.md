# Principles

fam-stack is extracted from a point-of-sale app that runs a small family business
every day: tablets at the counter, phones at the tables, a café's Wi-Fi in between.
Each rule below was paid for by a real failure there. The
rule is what you follow; the *why* is the failure, so you can recognise the next one;
*held by* is where the stack enforces it, so you know what is checked for you and what
is left to review.

The one idea under all of them: **Firebase is offline-first and fails quietly.** A
dropped stream is not an error, a cached answer looks like a real one, and a screen can
freeze while every flag reads healthy. Most of the stack exists to make those failures
loud.

---

## Firebase

### 1. Open the SDK once, whole and early — never `getAuth()` or `getFirestore()`

**Why.** Both are the first line of every Firebase snippet, and either one, run at
module level before the provider, opens the SDK with *other* arguments. The provider
then throws on every boot — or, if it handed the instance back quietly, Firestore would
run without the settings below. A factory per token also left a window in which a stray
opener in a lazy screen broke only the devices that cold-started there.

**Held by.** `provideFirebase` (opens app → auth → Firestore in one factory, in an
environment initializer); the starter's `firebase-openers.d.ts`, which makes both calls a
compile error, and the `@ts-expect-error` canaries in `app.config.ts` that fail the build
if TypeScript ever stops honouring that file.

### 2. Auth persistence is `getAuth`'s own list — never drop IndexedDB

**Why.** Every signed-in device stored its session in IndexedDB. A list without it
cannot read those sessions and signs every device out at the next deploy. (`initializeAuth`
is used instead of `getAuth` only to leave the popup/redirect stack out of the bundle.)

**Held by.** `AUTH_PERSISTENCE` in `provide-firebase.ts`. Review only.

### 3. Force long polling

**Why.** Safari (iOS above all, behind iCloud Private Relay or a content blocker), proxies
and antivirus software can buffer a streamed response: requests arrived seconds late or
not until a reload, with every flag healthy. Auto-detection times only the first reply.
The flag is `experimental` — re-check it on every SDK major.

**Held by.** `DEFAULT_FIRESTORE_SETTINGS`.

### 4. A snapshot the cache answered decides nothing

**Why.** Offline-first means an absence from the cache is "not heard yet", not "it does
not exist" — read as an absence, it told a guest their live table had closed and locked
them out of it. And content from the cache is "what we last heard", not "the listener is
live" — every resubscribe replays the cache first, and read as a delivery it erased the
"disconnected" banner over a frozen screen.

**Held by.** `docData` / `collectionData` hand `fromCache` beside the data; `retryLiveStream`
requires it by type. The rest is the caller's: don't conclude "empty" from a cached empty
answer (see `TasksService.load`), and withdraw a break only on `fromCache: false`.

### 5. A live stream must never end

**Why.** An errored listener is as final as a completed one, and screens load once. A
single rejection left a board on its last snapshot for the rest of the shift.
`disableNetwork`/`enableNetwork` rebuilds the client but cannot resubscribe a closed
Observable.

**Held by.** `retryLiveStream`: retries forever, backoff by *consecutive* failures, reset
only by a server snapshot (RxJS's `resetOnSuccess` would be reset by every cache replay
and hot-loop against the rules), counted per subscription.

### 6. A dropped connection is not an error — watch for liveness

**Why.** After a screen lock the channel can be dead while the SDK believes it healthy. No
error fires, writes through transactions still succeed, and the screen is pixel-identical
to a live one. A staleness clock is wrong too: a quiet hour changes nothing.

**Held by.** `LinkService` — a probe listener's `fromCache` (`linkProbe`, with a grace
period), per-stream break reports withdrawn only by the same stream, and an unconditional
rebuild (`disableNetwork` + `enableNetwork`) on return from 30 s hidden. Covered by specs.
`ReconnectService` for the hand-asked reconnect, which SAYS
what happened (a working reconnect has nothing to show for itself). Offer it from a menu
reachable everywhere, not only from the banner — the wedge leaves `isStale` false.

### 7. Close listeners before you revoke the token

**Why.** Listeners still open when `signOut` revokes the token are rejected with "Missing
or insufficient permissions" over the login screen. Wiring "close" to the auth stream's
`null` was both too late (it loses the race) and far too wide: one null from a refresh
token that failed after a long sleep ended every listener in the app for good, silently.

**Held by.** `AuthService.signingOut$` — raised synchronously by `logout()` and by nothing
else, before the session is revoked (covered by a spec). Every service with a listener pipes
`takeUntil(auth.signingOut$)`.

### 8. A refused sign-out is said on the screen

**Why.** Past the point of no return the listeners are gone; if `signOut` itself fails, the
device is handed over still signed in, and the login's guard sends it straight back into
a shell the router reuses rather than rebuilds.

**Held by.** `AuthService.logout` (snackbar from `FAM_TEXT.signOutFailed`; covered by a
spec), and every `localStorage` access on that path goes through the non-throwing helpers.

### 9. Guards fail closed

**Why.** `user !== null` waves an `undefined` through as signed in; an auth stream that
errors or completes empty cancels the navigation and strands a cold start on a blank page.

**Held by.** `redirectUnauthorizedTo` / `redirectLoggedInTo` on `FamSession.user()`: `!!user`,
`catchError → null`, `defaultIfEmpty(null)`, and never `currentUser()`. Covered by specs.

### 10. Every shared-document change is a transaction against the live document

**Why.** A read-modify-write from the copy on screen silently drops whoever landed second.
And a write made from a stale copy of a record overwrites an edit nobody saw.

**Held by.** `mutateDocument` — `change` runs on what is stored now; return the same object
for "nothing to do"; `withoutUndefined` before the write; an optional growth ceiling so a
document can never reach Firestore's 1 MiB limit and become unwritable. The starter's
`TasksService.update` shows the stale-copy refusal (`updatedAt` must match).

### 11. Say what the person meant, not "flip it"

**Why.** "Toggle done" from two devices undoes itself. "Set done = true" from two devices
is one change and a no-op.

**Held by.** Convention; `TasksService.setDone` is the pattern.

---

## Data and rules

### 12. The rules are the backend

All business logic runs on the client, so `firestore.rules` is the only authority.

- **Name every collection; no catch-all.** Firestore denies what no rule allows.
- **Check shape, not only identity:** `hasOnly` / `hasAll`, types, sizes.
- **Bound client clocks by server time**, ceiling *and* floor. A slow clock minted
  records that had already expired; a fast one wrote the future.
- **Mirror the app's limits, looser**, so the app refuses in words first. Rules cannot
  import the app's constants: change both together.
- **Grant `delete` on purpose.** An audit trail can be emptied without a delete (`setDoc`
  with `[]`), so "may not shrink" is a rule of its own. One gap remains: past the cap, an
  owner can roll the list over with entries of their own; closing it needs the append in a
  Cloud Function, not a rule.

**Held by.** The starter's `firestore.rules` (tasks, loginHistory) and
`scripts/firestore-rules.test.mjs` (`npm run rules:test`), which states against the emulator
what each allow accepts and refuses. The rules are not part of the build, so CI runs those
tests beside it.

### 13. Nothing a client wrote is believed

**Why.** A document's type is a cast. A throw inside a `computed()` rethrows on every read
and blanks the screen for as long as the document exists. `Number(x) || 0` lets `Infinity`
and `1e9` through — one hung the tab in a loop, the other printed `S/ ∞` on a receipt.

**Held by.** `asList`, `asCount`, `asAmount`, `asText`, `asFlag` in `fam-stack/core`, and a
shaping function per document type (`shapeTask` in the starter, `shapeLoginRecord` in the
layer) that runs before anything renders. A list rewritten whole under an append-only rule is
written back as stored and shaped only on read: dropping an entry it cannot read would break
the rule.

### 14. A template does not read a stored document

Build rows in a `computed()` — names shaped, counts bounded, amounts through `asAmount`,
empty groups gated — and render only that. Defensive helpers cannot save a template that
never reaches them.

### 15. Data flows one way

A list is set only from its listener; writes go to Firestore and return through the local
echo. Derived values are `computed()`, never copies kept in sync by hand. (An editable
draft over a stored document is the one exception, and needs its own care.)

### 16. Ids are UUID v7

Time-ordered, so a list sorts by creation as plain strings and "waiting 12 min" needs no
second field that could disagree. **Held by** `uuidv7()` / `uuidv7Time()`.

### 17. A user is never printed as their address

Screens that say who did something are read over shoulders; the name answers "who?". Store
the full address; show `email | emailName`; don't put the raw one back in a tooltip.

---

## Angular

### 18. Zoneless, OnPush, signals

A view repaints through signals, template events and `markForCheck` — fix a missing repaint
by fixing the signal, never by bringing zone.js back. `provideZonelessChangeDetection()` is
stated explicitly (it arms the guard against an `ng update` re-adding zone.js), and
`provideBrowserGlobalErrorListeners()` carries unhandled rejections to `GlobalErrorHandler`.

### 19. No wrapper may cap your Angular major

**Why.** AngularFire's release train ran a version behind Angular's; it was the only thing
holding the app back, and everything the app took from it fit in one folder.

**Held by.** fam-stack is source in your repository, so `ng update` migrates it with the rest
of the app. Its own policy keeps that cheap: public Angular API only, open-ended peer ranges,
and a partial-compilation build for a team that publishes its copy as a private package. If a
new major breaks the layer, fix it in place.

### 20. Screens are declared once

The tab title, the nav label and the `<h1>` are one string; routes, nav, guards and the 404's
way back all build URLs from one list. Spelled by hand, a rename left a green build whose
sign-in landed on the 404. **Held by** `defineScreens` (a screen without a component is a
compile error) and `injectCurrentScreen`.

### 21. URLs change only through the router

`history.replaceState` behind the router's back makes the next popstate a real navigation.
Tidy an address with `navigateByUrl(…, {replaceUrl: true, info: QUIET_NAVIGATION})`.

---

## Material UX

### 22. One voice for feedback; messages queue and never replace

Opening a snackbar dismisses the last one, so a second message erased the first before it
was read. **Held by** `NotificationService` (queue, joining per voice, repeats per voice,
arrivals behind replies) and `NoticeComponent` (one snackbar for the whole queue). At the
top, pointer-transparent, no dismiss button.

### 23. Back closes the top dialog or menu

In an installed PWA a full-screen dialog reads as a page, and back minimised the app.
**Held by** `DialogHistoryService` (with `closeOnNavigation: false`) and
`MenuBackGestureDirective` — import it in every component that has a `mat-menu`.

### 24. Number fields never invent a value

Rewriting an emptied field as "0" made "cleared" and "zero" indistinguishable — and they
usually mean opposite things ("no limit" against "none"). **Held by** `famNumberFormat`
(capture phase, comma as decimal point) with one-way `[ngModel]` and `parseNumberField`.

### 25. Accessibility is structural

One `<h1>` per screen, from the screen list. Load states said through `fam-load-status`
(outlives the swap, arms after first render, says "ready" only where it said "loading",
quiet on failure). Sentences the page also draws through `fam-live-note`, with the drawn
copy `aria-hidden`. Scroll panes a keyboard can reach (`famScrollRegion`, for WebKit). Never
a control in a `mat-menu` that is not a `mat-menu-item`.

### 26. Theme through Material; extend through tokens

Colour is `mat.theme(...)` — dark mode included. fam adds only what Material lacks (voices,
tints, spacing, motion, tap sizes), as `--fam-*` tokens. Components read tokens: no
hard-coded colours, keyword sizes or inline `style=""`. Spacing in px, type in rem, so the
reader's text size fills the furniture instead of rebuilding it.

---

## Hosting

### 27. Strict headers, self-hosted assets

`script-src 'self'` with no inline handler anywhere — which is why critical-CSS inlining is
**off** (it emits `onload="this.media='all'"`). Fonts are self-hosted, so `font-src 'self'`;
hashed `js|css` and fonts are `immutable`, the shell `no-cache`. **Held by** `firebase.json`
and the starter's `angular.json`. The Hosting emulator does not apply headers.

`immutable` for a year is only safe for a file whose name changes when its content does: a
browser that has it never asks again.

- **`js|css` come from the production build**, which hashes their names (`outputHashing:
  all`), and the `no-cache` shell names the new ones. Never deploy a development build, and
  never put a `.js` or `.css` in `public/`: it would have a fixed name.
- **A font keeps its name, so a replaced font takes a new one** (`material-icons-v2.woff2`)
  and `styles/_fonts.scss` points at it. Overwritten in place, the old file stays up to a
  year in every browser that has it, and icons added since draw as their ligature text.
