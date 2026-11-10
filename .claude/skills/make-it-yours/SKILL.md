---
name: make-it-yours
description: Turn a fresh copy of the fam-stack template into the user's own app — product name, Firebase project ids, theme, languages, which example features to keep, and the README — then verify it end to end. Use right after cloning or "Use this template", or when asked to rename, set up, personalise or start a new app from this repository.
---

# Make a copy of the template yours

Run once per copy. The stack layer (`projects/fam-stack`) stays where it is: it is now the
user's code, edited in place.

## 1. Ask, in one round

Use AskUserQuestion for whatever the request has not already said:

- **Product name** (full name, and a short name for the home screen icon).
- **Firebase project id** for production, or "later". The emulator id becomes `demo-<slug>`.
- **Primary and tertiary palette** (a Material palette such as `mat.$azure-palette`), or keep cyan/orange.
- **Language:** English, Spanish, or both (`FAM_TEXT_EN` / `FAM_TEXT_ES`).
- **Example features:** keep `tasks` and `home` as references, or remove them.

## 2. Rename

| What | Where |
| --- | --- |
| `APP_NAME` | `projects/starter/src/app/app.ts` |
| `<title>` | `projects/starter/src/index.html` |
| `name`, `short_name`, `description`, `theme_color`, `background_color` | `projects/starter/public/manifest.webmanifest` |
| `name` (slug), `version` back to `0.1.0`, `description` | root `package.json` |
| Tab titles `· Starter` | `scripts/smoke.mjs` (`login tab title`, `404 tab title`) |
| `demo-fam-stack` → `demo-<slug>` | `package.json` (`emulators`), `scripts/smoke.mjs`, `scripts/firestore-rules.test.mjs` (`PROJECT_ID`), `.github/workflows/verify.yml`, `projects/starter/src/environments/environment.development.ts` (`projectId`, `authDomain`), the `npm start` and `rules:test` lines in `CLAUDE.md`, `.claude/skills/verify/SKILL.md` |
| Production project | `.firebaserc` `default`; `environment.ts` gets the web app config from the Firebase console (Project settings → Your apps), or keeps its placeholders if "later" |

For production, tell the user what only the Firebase console can do: enable Email/Password,
add the accounts under Authentication → Users, and turn off **Enable create (sign-up)** under
Authentication → Settings → User actions. The rules trust every signed-in account, and Firebase
accepts sign-ups from anyone until that is off.

Keep the `demo-` prefix in development: it makes the emulators refuse to reach a real project.
`grep -rn "demo-fam-stack\|Starter" --exclude-dir=node_modules --exclude-dir=dist .` should
come back empty afterwards, except in `docs/` and the layer's own comments.

The project folder stays `projects/starter` and the Angular project stays `starter`, unless
the user asks. Renaming them touches `angular.json`, every npm script, the tsconfig `paths`,
the skills and `CLAUDE.md`.

## 3. Theme and language

- Palettes: `mat.theme(...)` in `projects/starter/src/styles.scss`. Match the manifest colours.
- Spanish only: pass `text: FAM_TEXT_ES` to `provideFamStack` in `app.config.ts`, set
  `lang` in `index.html` and the manifest, and translate the starter's own strings.

## 4. Example features

To remove `tasks` (and `home`, which summarises tasks):

- Delete `projects/starter/src/app/features/<name>/`, its entry in `screens.ts` (and `home:`
  there if it was the home screen), its component in `shell/shell.routes.ts`, and
  `TasksService` in `shell/layout.component.ts` (provided there and loaded after `loadUser()`).
- Delete its `match` block in `firestore.rules`. Any collection without a block stays denied.
- Delete its `describe` in `scripts/firestore-rules.test.mjs`.
- In `scripts/smoke.mjs`, remove the steps that use it, and point the post-login checks at
  the screen that is now first. Keep the sign-in, sign-out, 404 and stale-link steps.
- The shell needs at least one screen: removing both, create the first real one with
  `add-screen` before deleting them. `add-collection` rebuilds the tasks pattern for the
  user's own data.

## 5. Ownership

- `README.md`: replace it with the product's own. Keep one line saying it started from
  fam-stack, with a link to the original, and keep the Commands table.
- `LICENSE`: MIT requires keeping the original copyright notice. Add the user's own line
  above it; never delete it.
- `.github/`: `SECURITY.md` and `ISSUE_TEMPLATE/` are the original's, with its contacts and
  links. Delete them, or rewrite them for the product. Keep `workflows/verify.yml`.
- Keep `docs/principles.md`, `docs/changes/` (its files mark which upstream recipes this copy
  already contains), `.claude/` and `CLAUDE.md`. Update `CLAUDE.md` where it now says something
  untrue (names, removed features in the Map).

## 6. Verify

Run the `verify` skill, including the smoke test, since names, ids and screens changed.
Commit only if the user asks.
