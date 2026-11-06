---
name: add-screen
description: Add a top-level screen to an app built on fam-stack (the starter or a fork) — the screen entry, its component, its route, its heading and nav item, all from one declaration. Use when asked for a new page, tab or section in the signed-in shell.
---

# Add a screen

1. **Declare it** in `SCREENS` (`projects/starter/src/app/screens.ts`), in nav order:
   `{path: 'reports', label: 'Reports', icon: 'insights'}`.
   - `label` is the tab title, nav label and heading.
   - `showsName: true` draws the `<h1>`; otherwise it is visually hidden.
   - `centersContent: true` uses the shell's centred column.
   - `icon`: a classic Material Icons ligature.
   - At most five screens in the bottom nav.
2. **Component** in `src/app/features/<name>/` (`npx ng g c features/<name> --project starter`):
   root element `class="fam-page"`, headings from `h2`.
3. **Route** in `src/app/shell/shell.routes.ts`: add `<path>: <Component>` to `SCREENS.routes(...)`.
4. **Data** from a service in `LayoutComponent.providers`. New collection: the `add-collection` skill.
5. **Loading and empty:** skeleton in `aria-hidden`, `<fam-load-status>` outside `aria-busy`,
   `.fam-empty` with the next action.
6. **Links:** `SCREENS.url('<path>')`.
7. **Verify:** `npm run verify`; check the largest text size, dark mode and Tab order.
