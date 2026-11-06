import {Type} from '@angular/core';
import {Routes} from '@angular/router';

/** One top-level screen of the signed-in shell. */
export interface ScreenDef {
  /** The route segment under the shell's root. */
  readonly path: string;
  /** The tab title, the nav label and the screen's `<h1>`. */
  readonly label: string;
  /** A classic Material Icons ligature for the nav. */
  readonly icon: string;
  /** Draw the `<h1>` (otherwise it is visually hidden). */
  readonly showsName?: boolean;
  /** Center the page in the shell's column (`--fam-page-max-w`). */
  readonly centersContent?: boolean;
}

/** A screen with its absolute URL. */
export interface ScreenLink extends ScreenDef {
  readonly url: string;
}

export interface ScreenRegistryOptions<S extends readonly ScreenDef[]> {
  /** The segment every screen hangs under, e.g. `'app'`. */
  readonly root: string;
  /** In nav order. */
  readonly screens: S;
  /** The screen a signed-in device lands on. */
  readonly home: S[number]['path'];
}

export interface ScreenRegistry<P extends string> {
  readonly root: string;
  readonly home: P;
  readonly links: readonly ScreenLink[];
  /** A screen's absolute URL. */
  url(path: P): string;
  /** A screen's label. */
  name(path: P): string;
  /** The screen a URL is on, or `undefined`. */
  at(url: string): ScreenLink | undefined;
  /** The shell's child routes: one per screen, plus `''` and `**` redirecting home. */
  routes(components: Record<P, Type<unknown>>, title?: (name: string) => string): Routes;
}

/* A URL segment without matrix params or outlet parentheses. */
const bare = (segment: string): string =>
  segment.replace(/^\(+/, '').split(/[;(]/)[0].replace(/\)+$/, '');

/**
 * Declares the shell's screens once; routes, nav, titles, headings and redirects read
 * from it. `url()` and `routes()` accept only declared paths.
 *
 * ```ts
 * export const SCREENS = defineScreens({
 *   root: 'app',
 *   home: 'tasks',
 *   screens: [
 *     {path: 'home', label: 'Home', icon: 'dashboard'},
 *     {path: 'tasks', label: 'Tasks', icon: 'checklist', centersContent: true}
 *   ]
 * });
 * SCREENS.url('tasks'); // '/app/tasks'
 * ```
 */
export const defineScreens = <const S extends readonly ScreenDef[]>(
  options: ScreenRegistryOptions<S>
): ScreenRegistry<S[number]['path']> => {
  type P = S[number]['path'];
  const {root, home} = options;
  const url = (path: string): string => `/${root}/${path}`;
  const links: readonly ScreenLink[] = options.screens.map(screen => ({...screen, url: url(screen.path)}));
  const byPath = new Map<string, ScreenLink>(links.map(link => [link.path, link]));
  return {
    root,
    home,
    links,
    url: (path: P) => url(path),
    name: (path: P) => byPath.get(path)?.label ?? '',
    at: (address: string) => {
      const [first = '', segment = ''] = address.split('?')[0].split('#')[0].split('/').filter(Boolean);
      return bare(first) === root ? byPath.get(bare(segment)) : undefined;
    },
    routes: (components: Record<P, Type<unknown>>, title?: (name: string) => string): Routes => [
      ...links.map(link => ({
        path: link.path,
        title: title ? title(link.label) : link.label,
        component: components[link.path as P]
      })),
      {path: '', pathMatch: 'full', redirectTo: home},
      {path: '**', redirectTo: url(home)}
    ]
  };
};
