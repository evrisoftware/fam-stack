---
paths:
  - "projects/fam-stack/ui/**"
  - "projects/fam-stack/a11y/**"
  - "projects/fam-stack/shell/**"
  - "projects/starter/src/app/**/*.html"
  - "projects/starter/src/app/**/*.component.ts"
---

# UI

## Templates

- `input()`/`output()`/`model()` for component APIs.
- No method call in a template that builds an array per pass.
- No `[innerHTML]` for typed text; confirmation descriptions are `string | {bold}` parts.

## Feedback

- Every Firestore mutation ends in a `NotificationService` voice: `success`, `deleted`,
  `error`, `warn`; `arrival` only for another device's action. A no-op write says nothing.
- Never inject `MatSnackBar`.
- Loading: `.fam-skeleton*` inside `aria-hidden`, plus `<fam-load-status>` outside the
  `aria-busy` element and outside the swapping `@if`; pass `[failed]` when the read can fail.
- Empty states use `.fam-empty*` and name the next action.

## Dialogs and menus

- Sheets: `SHEET_DIALOG_CONFIG`. Page-like tasks: `FULL_SCREEN_DIALOG_CONFIG`. Never
  `closeOnNavigation: true`.
- A component with a `mat-menu` imports `MenuBackGestureDirective`; an item that opens a dialog
  calls `trigger.closeMenu()` first.
- Inside a menu, controls are `mat-menu-item`; one that keeps the menu open calls
  `$event.stopPropagation()`.
- A dialog with pages implements `BackGestureHandler` and calls `enterStep`/`leaveStep`.

## Forms

- Outline fields (the default).
- Number fields: `famNumberFormat` + `[famNumberMax]`, one-way `[ngModel]` + one
  `(ngModelChange)` keeping the text, `parseNumberField` on save.

## Shell

- New screen: entry in `defineScreens(...)`, component in `shell.routes.ts`.
- URLs from `SCREENS.url(...)` / `HOME_URL`; never `'/app/...'` literals.
- The shell renders the one `<h1>` (`injectCurrentScreen`); pages start at `h2`.
- `fam-link-banner` stays in the header; reconnect is also in the account menu.

## Before calling a UI change done

- Keyboard: every control reachable, visible focus.
- Screen reader: heading names the screen; loads and changes announced once; icon-only buttons
  have `aria-label`; decorative icons `aria-hidden`.
- Largest text step (account menu) still lays out.
- Nothing loops under `prefers-reduced-motion`.
