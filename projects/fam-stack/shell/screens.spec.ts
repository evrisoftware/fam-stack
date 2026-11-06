import {Component} from '@angular/core';
import {defineScreens} from 'fam-stack/shell';

@Component({template: ''})
class Home {
}

@Component({template: ''})
class Tasks {
}

const SCREENS = defineScreens({
  root: 'app',
  home: 'tasks',
  screens: [
    {path: 'home', label: 'Home', icon: 'dashboard'},
    {path: 'tasks', label: 'Tasks', icon: 'checklist', centersContent: true}
  ]
});

describe('defineScreens', () => {
  it('builds URLs and names from one declaration', () => {
    expect(SCREENS.url('tasks')).toBe('/app/tasks');
    expect(SCREENS.name('home')).toBe('Home');
    expect(SCREENS.links.map(link => link.url)).toEqual(['/app/home', '/app/tasks']);
  });

  it('finds the screen from the segment after the root, whatever qualifies it', () => {
    expect(SCREENS.at('/app/tasks')?.path).toBe('tasks');
    expect(SCREENS.at('/app/tasks/123')?.path).toBe('tasks');
    expect(SCREENS.at('/app/tasks;filter=open?x=1#top')?.path).toBe('tasks');
    expect(SCREENS.at('/app/(tasks//popup:x)')?.path).toBe('tasks');
    expect(SCREENS.at('/app;a=1/home')?.path).toBe('home');
    expect(SCREENS.at('/elsewhere/tasks')).toBeUndefined();
    expect(SCREENS.at('/app/nothing')).toBeUndefined();
  });

  it('routes every screen, redirects home, and keeps stray URLs inside the shell', () => {
    const routes = SCREENS.routes({home: Home, tasks: Tasks}, name => `${name} · Test`);
    expect(routes.map(route => route.path)).toEqual(['home', 'tasks', '', '**']);
    expect(routes[0].title).toBe('Home · Test');
    expect(routes[2].redirectTo).toBe('tasks');
    expect(routes[3].redirectTo).toBe('/app/tasks');
  });
});
