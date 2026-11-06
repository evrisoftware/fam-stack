import {defineScreens} from 'fam-stack/shell';

/* The signed-in screens. A new entry needs its component in `shell.routes.ts`. */
export const SCREENS = defineScreens({
  root: 'app',
  home: 'home',
  screens: [
    {path: 'home', label: 'Home', icon: 'dashboard', showsName: true, centersContent: true},
    {path: 'tasks', label: 'Tasks', icon: 'checklist', centersContent: true}
  ]
});

/** The home screen's URL. */
export const HOME_URL = SCREENS.url(SCREENS.home);
