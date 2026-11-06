import {Directive} from '@angular/core';

/**
 * A visually hidden polite live region (`role="status"`, `aria-live="polite"`,
 * `.fam-visually-hidden`). Announces changes of its content; place it outside the `@if`
 * whose change it reports.
 */
@Directive({
  selector: '[famLiveRegion]',
  host: {'aria-live': 'polite', 'class': 'fam-visually-hidden', 'role': 'status'}
})
export class LiveRegionDirective {
}
