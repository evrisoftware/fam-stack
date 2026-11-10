import {Component} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {LiveRegionDirective} from 'fam-stack/a11y';

@Component({
  imports: [LiveRegionDirective],
  template: `<p famLiveRegion class="mine">Saved.</p>`
})
class Host {
}

describe('famLiveRegion', () => {
  it('makes its host a hidden polite live region and keeps the host\'s own classes', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const paragraph = (fixture.nativeElement as HTMLElement).querySelector('p') as HTMLElement;
    expect(paragraph.getAttribute('role')).toBe('status');
    expect(paragraph.getAttribute('aria-live')).toBe('polite');
    expect([...paragraph.classList].sort()).toEqual(['fam-visually-hidden', 'mine']);
  });
});
