# fam-stack

[![verify](https://github.com/evrisoftware/fam-stack/actions/workflows/verify.yml/badge.svg)](https://github.com/evrisoftware/fam-stack/actions/workflows/verify.yml)

**F**irebase + **A**ngular + **M**aterial, as one stack.

Firestore and Auth are the backend, security rules are the server, Material is the UI, and
Angular holds it together — a "full-stack" app with no server of your own. fam-stack is the
layer that makes that combination behave in production: a plain-SDK Firebase integration with
no wrapper to cap your Angular version, live data that never silently freezes, auth that
fails closed, and the Material UX pieces that every such app ends up writing.

It was extracted from a point-of-sale app that runs a small family business every day —
tablets at the counter, customers' phones at the tables, a café's Wi-Fi in between.
Everything here ran there first; [`docs/principles.md`](docs/principles.md) lists each rule
with the failure that taught it.

It ships as a **template, not a package**: you [start your app from it](#start-your-own-app)
and own every line from then on, ready to extend with more Firebase services or bend to your
own rules. It is laid out for an AI agent to work in, with the context and workflows for
Claude Code included.

## The problem it solves

A live list, as the plain SDK is usually written:

```ts
onSnapshot(query(collection(db, 'tasks')), snapshot => {
  tasks.set(snapshot.docs.map(d => ({id: d.id, ...d.data()})));
});
```

On a tablet over café Wi-Fi, that listener:

- **says "no tasks" before the server has answered**, because an empty cache looks the same
  as an empty collection;
- **stops for good on its first error.** One refused read and the screen keeps its last
  snapshot for the rest of the shift, with nothing on screen to say so;
- **freezes with no error at all** after a screen lock: the channel is dead, the SDK
  believes it is healthy, and the screen looks exactly like a live one;
- **is refused over the login screen** when sign-out revokes the token while it is still open;
- **renders whatever any client wrote**, unchecked.

The same list on fam-stack:

```ts
collectionData<unknown>(tasksQuery, {idField: 'id'}).pipe(
  retryLiveStream(error => link.reportBroken('tasks', error)), // retried forever, with backoff
  takeUntil(auth.signingOut$),                                 // closed before the token is revoked
  takeUntilDestroyed(destroyRef)
).subscribe(({data, fromCache}) => {
  if (!fromCache) link.reportAlive('tasks');                         // only the server proves it is live
  if (fromCache && data.length === 0 && snapshot() === null) return; // an empty cache is "not heard yet"
  snapshot.set(shapeTasks(data));                                    // stored data read defensively
});
```

`LinkService` raises the stale-connection banner when the channel dies without an
error. This is the starter's `TasksService` line for line, and each failure above is a
numbered principle (4, 5, 6, 7 and 13).

## Is it for you?

**A good fit** if you are building an Angular app with Firebase as the whole backend — no
server of your own — for a small team on shared devices or patchy networks (a shop
counter, a warehouse, a classroom, field work), and Material 3's look suits you.

**Have your own backend?** Only `fam-stack/firebase` talks to Firebase (`provideFamStack`
opens it). Notifications, accessibility, styles and the screen registry never touch it;
sign-in, the guards and the stale banner read three small contracts in `fam-stack/backend`,
which `fam-stack/firebase` provides. [`docs/own-backend.md`](docs/own-backend.md) lists what
to replace and what your server has to do. You keep the layer's safeguards and give up what
Firebase brings: security rules, emulators, offline writes.

**Not the right tool** if:

- **you render on the server.** The stack is built and tested for client-side rendering
  only; nothing in it guards server-side or prerendered runs.
- **you use `@angular/fire` or `rxfire`.** fam-stack replaces them and opens the SDK itself;
  the two cannot share an app.
- **your UI kit is not Angular Material.** The UI, shell and styles entry points are built on it.
- **you want a dependency someone else keeps current.** A copy is yours to maintain. The
  original publishes fixes as [recipes](docs/changes/README.md), not as versions.

## What you get

One Angular workspace: **the stack layer** (`projects/fam-stack`, imported as `fam-stack/*`)
and **the app** (`projects/starter`), which already uses every convention and is where you
build yours. Out of the box the layer covers Auth and Firestore; [grow it](#grow-it) with the
rest of Firebase.

| Entry point | What it gives you |
| --- | --- |
| `fam-stack` | `provideFamStack()` — Firebase, error handling, dialog/snackbar/form defaults, back gesture and text size, in one call. |
| `fam-stack/firebase` | `provideFirebase` (opened once, whole, early; long polling; IndexedDB sessions kept), `docData`/`collectionData` with `fromCache`, `mutateDocument` (transactions against the live document), `linkProbe`, and the session, reconnect and sign-in history over Auth and Firestore. |
| `fam-stack/backend` | What sign-in and the shell read from the backend (`FamSession`, `LinkTransport`, `LoginHistoryStore`, provided by `provideFirebase`), `retryLiveStream` (streams that never end), fail-closed `redirectUnauthorizedTo`/`redirectLoggedInTo`, `LinkService` (notices the frozen connection Firestore never reports). |
| `fam-stack/auth` | `AuthService` with `signingOut$` (listeners closed before the token is revoked), a refused sign-out said on screen, and an owner-only sign-in history. |
| `fam-stack/ui` | `NotificationService` (messages queue and never replace each other), back gesture closes dialogs and menus, sheet and full-screen dialog presets, a safe confirmation, `GlobalErrorHandler`, reader text size, number fields that never invent a value. |
| `fam-stack/a11y` | Live regions that are actually announced, load states a screen reader hears, keyboard-reachable scroll panes. |
| `fam-stack/shell` | Screens declared once (routes, nav, titles, headings), bottom nav, stale-connection banner, reconnect, view transitions. |
| `fam-stack/core` | `FAM_TEXT` (English and Spanish), defensive readers for stored data, UUID v7, storage that never throws. |
| `fam-stack/styles` | Tokens on top of Material's own theme (dark mode included), base, Material adjustments, utility classes. |

And around it: strict Firebase Hosting headers (CSP `script-src 'self'`, HSTS, COOP…),
Firestore rules that name every collection and their tests against the emulator,
emulator-first development, vitest specs, a headless-Chrome smoke test, a GitHub Actions
workflow running `npm run verify` and the rules tests, and context for
[Claude Code](https://code.claude.com).

## Try the starter (no Firebase project needed)

Requires Node `^24.15.0` or `>=26` (26 is what `.nvmrc` pins), the
[Firebase CLI](https://firebase.google.com/docs/cli) and Java 21 or later (for the Firestore
emulator).

```bash
# terminal 1 — keeps running
npm install
npm run emulators      # Auth + Firestore emulators under the offline demo-fam-stack project

# terminal 2 — once the emulators are up
npm run seed           # creates demo@example.com / demo-password
npm start              # http://localhost:4200
```

Sign in, add tasks, open a second browser window and watch them sync, lock the screen for a
minute, set the text size from the account menu, switch your OS to dark mode.

## Start your own app

fam-stack is a template, not a package. You copy it once and the copy is yours: the stack
layer, the rules, the hosting headers and the agent context all live in your repository as
source, for you to change, extend or strip out. Nobody upstream ships you updates, and nothing
in your app waits for one.

1. On GitHub, **Use this template → Create a new repository**, then clone it. Or
   `git clone https://github.com/evrisoftware/fam-stack.git my-app`, delete `.git` and run
   `git init`.
2. Run it as above: `npm install`, `npm run emulators`, `npm run seed`, `npm start`.
3. Make it yours: the product name, the `demo-` emulator id, your Firebase project, the theme,
   the language, whether the example `tasks` and `home` screens stay, and the original's
   community files in `.github/`. In Claude Code, ask for it; the `make-it-yours` skill knows
   every place. By hand, its [checklist](.claude/skills/make-it-yours/SKILL.md) is the list.
4. Build your screens in `projects/starter`. `features/tasks/` is the whole pattern for a live,
   shared collection: shaping, the stream, transactional writes, error sentences, rules. The
   `add-screen` and `add-collection` skills follow it for you.
5. Go live: put your project's web app config in `environment.ts` and its id in `.firebaserc`.
   In the Firebase console, enable the Email/Password provider, add your users under
   Authentication → Users, and turn off **Enable create (sign-up)** under Authentication →
   Settings → User actions: the starter's rules let every signed-in account read and write
   every task, and Firebase accepts sign-ups from anyone until you close them. Then run
   `npm run rules:deploy` and `npm run deploy`.

### How a copy is laid out

`projects/fam-stack` is the stack layer. Your app imports it as `fam-stack/core`,
`fam-stack/firebase` and so on, through tsconfig `paths`, so it compiles from source with
everything else. Edit it like any other file; its [README](projects/fam-stack/README.md) is the
API reference. It is still built as an Angular library (`npm run build:lib`, part of
`npm run verify`) because that build fails on a cycle between its entry points or a relative
import across them, which keeps the layers apart as you change them. `npm run check:entries`,
also part of `verify`, checks the direction itself: each entry imports only those below it,
and the Firebase SDK stays in `fam-stack/firebase` and `provideFamStack`.

Several apps sharing one layer? Publish your copy as a private package: `npm run build:lib`
already builds it in partial compilation mode, ready for your own registry. It is then your
package, not this one.

## Grow it

The layer covers Auth and Firestore. For Storage, ask Claude Code to add it: the
`add-storage` skill carries a tested implementation, from the provider and cancellable uploads
to `storage.rules`, the emulator, the CSP and a smoke step.

To add another Firebase service (Functions, Messaging, App Check…) or change how one behaves,
change your copy. Open the new service in `openFirebase`
(`projects/fam-stack/firebase/provide-firebase.ts`) right after Auth and Firestore, and provide
it through an injection token as `FIREBASE_AUTH` is. Where the SDK has a separate
`initialize*()`, bar its `get*()` in the starter's `firebase-openers.d.ts`; where `get*()` is
the only opener (Storage, Functions), add it to the `fam-review` checklist instead. Then hold
it to the same standard: failures said on screen, listeners and uploads closed on sign-out, a
rules block for every path.
[`docs/principles.md`](docs/principles.md) gives the reason for each rule, so you can tell
which ones your change must keep and which you are free to drop.

## Take fixes from the original

When the original fixes something other copies would want, it writes a recipe in
[`docs/changes/`](docs/changes/README.md): what failed, what changed, how to adopt it into code
that has drifted, and how to check it. A copy shares no git history with the original, so there
is no merge to fight. In Claude Code, ask to "check fam-stack for new changes" (the
`adopt-upstream-change` skill). By hand, read the new recipes and follow their steps.

## Commands

| Command | |
| --- | --- |
| `npm start` | Starter dev server against the emulators |
| `npm run emulators` / `npm run seed` | Local Auth + Firestore, and a demo user |
| `npm run build:lib` | The stack layer as an Angular library in `dist/fam-stack`: checks its entry-point boundaries |
| `npm run build` | The starter's production build |
| `npm test` | Library specs (vitest) |
| `npm run check:entries` | The layer's import direction, and the Firebase SDK kept to `fam-stack/firebase` and `provideFamStack` |
| `npm run lint` | ESLint with angular-eslint: selector prefixes, signal APIs, control flow, template accessibility |
| `npm run verify` | Entry check + lint + library build + starter build + specs |
| `npm run smoke` | End-to-end in headless Chrome against the emulators |
| `npm run rules:test` | `firestore.rules` against the Firestore emulator: what each collection accepts and refuses |
| `npm run deploy` | Production build, then deploy it to Firebase Hosting only — rules ship separately (set `.firebaserc` and `environment.ts` first) |
| `npm run rules:deploy` | `firestore.rules` and `firestore.indexes.json` together, to the project in `.firebaserc` |

## Principles, briefly

- **Firebase fails quietly; make it loud.** A cached answer decides nothing. A stream that
  errors is retried forever. A connection that dies without an error is noticed anyway.
- **The rules are the backend.** Every collection named, shapes checked, client clocks bounded
  by server time, delete granted on purpose.
- **Nothing a client wrote is believed.** Stored data is shaped through defensive readers
  before a screen sees it.
- **No wrapper may cap your Angular major.** The layer is your source, on public API only.
- **Accessibility is structural.** One heading per screen, loads announced, back closes the
  top layer, text size the reader chooses.

All 27, with the reasons: [`docs/principles.md`](docs/principles.md).

## Built to work with Claude Code

`CLAUDE.md` carries the commands, the gate and the rules that bind everywhere;
`.claude/rules/` load by path (library, Firebase, UI, styling); `.claude/skills/` hold the
workflows (`make-it-yours`, `add-screen`, `add-collection`, `add-storage`,
`adopt-upstream-change`, `lift-from-app`, `verify`); `.claude/agents/fam-review`
reviews a diff against what the build cannot see.

## Status

`0.1.0`, the fundamentals. Recipes in [`docs/changes/`](docs/changes/README.md) start from here.

On the original's roadmap:

- sharing and thermal-printer tickets (a `share` layer)
- an editable draft over a live document
- pick-list rotation and toggle styles
- retention purges
- skills for adding Functions, Messaging and App Check
- the smoke test in CI (today CI runs `npm run verify` and the rules tests)

## Maintenance

fam-stack is open source: copy it, change it and ship it under the license below. The
original is maintained by its author and does not take pull requests; what it fixes reaches
copies as recipes in [`docs/changes/`](docs/changes/README.md). A bug in the original can be
reported as an issue. Report a security problem privately, as
[SECURITY](.github/SECURITY.md) says, never in an issue.

## License

[MIT](LICENSE). The bundled fonts keep their own licenses, whose texts ship beside them
([`projects/starter/public/fonts/LICENSES.md`](projects/starter/public/fonts/LICENSES.md)).
