import {Routes} from '@angular/router';
import {redirectLoggedInTo, redirectUnauthorizedTo} from 'fam-stack/backend';
import {setTitle} from '@app/app';
import {LOGIN_PATH, LOGIN_URL} from '@app/login-route';
import {HOME_URL, SCREENS} from '@app/screens';
import {LoginComponent} from '@app/shell/login.component';
import {NotFoundComponent} from '@app/shell/not-found.component';

const toLogin = redirectUnauthorizedTo(() => LOGIN_URL);
const toHome = redirectLoggedInTo(() => HOME_URL);

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: HOME_URL
  },
  {
    path: LOGIN_PATH,
    title: setTitle('Sign in'),
    component: LoginComponent,
    canActivate: [toHome]
  },
  {
    /* The signed-in shell, lazy and guarded. */
    path: SCREENS.root,
    loadChildren: () => import('@app/shell/shell.routes'),
    canActivate: [toLogin]
  },
  {
    path: '**',
    title: setTitle('Page not found'),
    component: NotFoundComponent,
    canActivate: [toLogin]
  }
];
