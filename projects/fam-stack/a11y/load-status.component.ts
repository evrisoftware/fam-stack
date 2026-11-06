import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  signal
} from '@angular/core';
import {LiveRegionDirective} from './live-region.directive';

/**
 * A live region that says `loading` while `busy`, then `ready` once it clears.
 *
 * - Starts empty and arms one task after its first render.
 * - Says `ready` only after it said `loading`, and never when `failed`.
 * - Place it outside the `aria-busy` element and outside the `@if` that swaps.
 */
@Component({
  selector: 'fam-load-status',
  hostDirectives: [LiveRegionDirective],
  template: `{{ text() }}`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoadStatusComponent {
  readonly busy = input.required<boolean>();
  /** While loading, e.g. "Loading tasks…". */
  readonly loading = input.required<string>();
  /** Once loaded, e.g. "Tasks ready."; empty for nothing. */
  readonly ready = input<string>('');
  /** Whether the finished read failed. */
  readonly failed = input<boolean>(false);

  private readonly rendered = signal(false);
  private readonly wasBusy = signal(false);

  protected readonly text = computed<string>(() => {
    if (!this.rendered()) return '';
    if (this.busy()) return this.loading();
    if (!this.wasBusy()) return '';
    return this.failed() ? '' : this.ready();
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const armed = setTimeout(() => this.rendered.set(true));
      destroyRef.onDestroy(() => clearTimeout(armed));
    });
    effect(() => {
      if (this.rendered() && this.busy()) this.wasBusy.set(true);
    });
  }
}
