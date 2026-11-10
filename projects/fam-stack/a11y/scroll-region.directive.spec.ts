import {Component, signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {ScrollRegionDirective} from 'fam-stack/a11y';

@Component({
  imports: [ScrollRegionDirective],
  template: `
    <div id="plain" famScrollRegion scrollRegionLabel="Weekly totals"></div>
    <div id="chart" famScrollRegion scrollRegionLabel="Sales chart" scrollRegionRole="img"></div>
    <div id="switched" [famScrollRegion]="enabled()" scrollRegionLabel="Log"></div>`
})
class Host {
  readonly enabled = signal(false);
}

const REGION = ['aria-label', 'role', 'tabindex'] as const;

const setup = async () => {
  const fixture = TestBed.createComponent(Host);
  await fixture.whenStable();
  const pane = (id: string): HTMLElement =>
    (fixture.nativeElement as HTMLElement).querySelector(`#${id}`) as HTMLElement;
  const attributes = (id: string) => REGION.map(name => pane(id).getAttribute(name));
  return {fixture, pane, attributes};
};

describe('famScrollRegion', () => {
  it('makes its host a labelled group that the keyboard reaches', async () => {
    const {pane, attributes} = await setup();
    expect(attributes('plain')).toEqual(['Weekly totals', 'group', '0']);
    expect(pane('plain').classList).toContain('fam-scroll-region');
  });

  it('takes the role img', async () => {
    const {attributes} = await setup();
    expect(attributes('chart')).toEqual(['Sales chart', 'img', '0']);
  });

  it('adds nothing while false, and all four once true', async () => {
    const {fixture, pane, attributes} = await setup();
    expect(attributes('switched')).toEqual([null, null, null]);
    expect(pane('switched').classList).not.toContain('fam-scroll-region');
    fixture.componentInstance.enabled.set(true);
    await fixture.whenStable();
    expect(attributes('switched')).toEqual(['Log', 'group', '0']);
    expect(pane('switched').classList).toContain('fam-scroll-region');
  });
});
