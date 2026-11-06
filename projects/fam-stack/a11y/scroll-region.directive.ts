import {booleanAttribute, Directive, input} from '@angular/core';

/**
 * A keyboard-reachable scroll container: `tabindex="0"`, `role` (`group` or `img`),
 * `aria-label` and the `.fam-scroll-region` focus ring. `[famScrollRegion]="false"`
 * removes all four.
 */
@Directive({
  selector: '[famScrollRegion]',
  host: {
    '[attr.aria-label]': 'enabled() ? label() : null',
    '[attr.role]': 'enabled() ? role() : null',
    '[attr.tabindex]': 'enabled() ? 0 : null',
    '[class.fam-scroll-region]': 'enabled()'
  }
})
export class ScrollRegionDirective {
  readonly enabled = input(true, {alias: 'famScrollRegion', transform: booleanAttribute});
  readonly label = input.required<string>({alias: 'scrollRegionLabel'});
  readonly role = input<'group' | 'img'>('group', {alias: 'scrollRegionRole'});
}
