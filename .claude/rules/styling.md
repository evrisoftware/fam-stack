---
paths:
  - "**/*.scss"
---

# Styling

## Where things live

- Theme: `mat.theme(...)` in the app's `styles.scss`, `color-scheme` on `html`. Never set
  `--mat-sys-*` by hand.
- `projects/fam-stack/styles/`: `_tokens`, `_base`, `_material`, `_utilities`, `_mixins` (emits
  nothing), `_fonts`; `_index` composes `global()`.
- Mixins: `@use 'fam-stack/styles' as fam` (starter), `@use '../styles/mixins'` (library).

## Rules

- No hex colours, no keyword font sizes, no inline `style=""`; per-item custom properties via
  `[style.--x]`.
- Dark-mode colours come from `--mat-sys-*` or a `--fam-*` token using `light-dark()`. Raised
  surfaces use the `--fam-page` / `--fam-card` pair.
- Spacing and tap sizes in px (`--fam-space-*`, `--fam-tap-min`, `--fam-action-h`); type in rem
  (`--fam-text-*`).
- `.fam-action` uses `min-height`, never a fixed height.
- To beat a Material rule, out-specify it (example: `.mat-mdc-dialog-content.task-form__body`).
- Snackbars stay at the top and pointer-transparent. A new voice sets its text colour, and its
  container or ring has 3:1 contrast against what it covers.
- View transitions animate opacity and translate only; chrome uses its own group
  (`fam-header`, `fam-nav`, `fam-floating`).
- Infinite animations end at rest under `prefers-reduced-motion`.
- Icons: classic Material Icons ligatures.
- A replaced font file takes a new name, updated in `_fonts.scss`: Hosting serves `/fonts/**`
  as `immutable` for a year. No `.js` or `.css` in `public/` for the same reason.
- `anyComponentStyle` budget is 8 kB; group repetition before raising it.
