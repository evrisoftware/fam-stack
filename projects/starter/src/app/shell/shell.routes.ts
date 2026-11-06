import {Routes} from '@angular/router';
import {setTitle} from '@app/app';
import {SCREENS} from '@app/screens';
import {LayoutComponent} from '@app/shell/layout.component';
import {HomeComponent} from '@app/features/home/home.component';
import {TasksComponent} from '@app/features/tasks/tasks.component';

/* One component per screen in `SCREENS`: a screen without one, or a key that is not a
 * screen, is a compile error. */
export default [
  {
    path: '',
    component: LayoutComponent,
    children: SCREENS.routes({
      home: HomeComponent,
      tasks: TasksComponent
    }, setTitle)
  }
] satisfies Routes;
