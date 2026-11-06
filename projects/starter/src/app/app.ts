import {Component} from '@angular/core';
import {RouterOutlet} from '@angular/router';
/* A named import, so the bundler keeps the version and drops the rest of package.json. */
import {version} from '../../../../package.json';

/** The product's name: the brand, the tab titles, the account menu. Rename it here. */
export const APP_NAME = 'Starter';
export const APP_VERSION = version;

/** How every tab title is spelled. */
export const setTitle = (title: string): string => `${title} · ${APP_NAME}`;

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: '<router-outlet/>'
})
export class App {
}
