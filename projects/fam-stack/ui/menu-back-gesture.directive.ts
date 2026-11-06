import {DestroyRef, Directive, inject} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {MatMenuTrigger} from '@angular/material/menu';
import {DialogHistoryService} from './dialog-history.service';

/**
 * Joins every `[matMenuTriggerFor]` menu of the importing component to
 * `DialogHistoryService`, so the back gesture closes it. Released on `menuClosed` and
 * on destroy. A menu item that opens a dialog calls `trigger.closeMenu()` first.
 */
@Directive({selector: '[matMenuTriggerFor]'})
export class MenuBackGestureDirective {
  constructor() {
    const trigger = inject(MatMenuTrigger);
    const dialogHistory = inject(DialogHistoryService);
    let release: (() => void) | undefined;
    const settle = (): void => {
      release?.();
      release = undefined;
    };
    trigger.menuOpened.pipe(takeUntilDestroyed()).subscribe(() => {
      settle();
      release = dialogHistory.trackMenu(() => trigger.closeMenu());
    });
    trigger.menuClosed.pipe(takeUntilDestroyed()).subscribe(settle);
    inject(DestroyRef).onDestroy(settle);
  }
}
