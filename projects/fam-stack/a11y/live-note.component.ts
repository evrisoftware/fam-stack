import {ChangeDetectionStrategy, Component, input} from '@angular/core';
import {LiveRegionDirective} from './live-region.directive';

/**
 * Announces `text` whenever it changes. Mark the drawn copy of the sentence
 * `aria-hidden` (the words only, not a block holding a button).
 */
@Component({
  selector: 'fam-live-note',
  hostDirectives: [LiveRegionDirective],
  template: `{{ text() }}`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LiveNoteComponent {
  /** The sentence, or `''` for none. */
  readonly text = input.required<string>();
}
