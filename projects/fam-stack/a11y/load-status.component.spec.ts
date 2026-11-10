import {Component, signal} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {LoadStatusComponent} from 'fam-stack/a11y';

@Component({
  imports: [LoadStatusComponent],
  template: `<fam-load-status [busy]="busy()" [failed]="failed()" loading="Loading tasks…" ready="Tasks ready."/>`
})
class Host {
  readonly busy = signal(true);
  readonly failed = signal(false);
}

/* Lets the first render's task run and the view catch up. */
const settle = async (fixture: ComponentFixture<Host>): Promise<void> => {
  await fixture.whenStable();
  await new Promise(resolve => setTimeout(resolve));
  await fixture.whenStable();
};

const region = (fixture: ComponentFixture<Host>): HTMLElement =>
  (fixture.nativeElement as HTMLElement).querySelector('fam-load-status') as HTMLElement;

describe('LoadStatusComponent', () => {
  it('is a hidden polite live region', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    expect(region(fixture).getAttribute('role')).toBe('status');
    expect(region(fixture).getAttribute('aria-live')).toBe('polite');
    expect(region(fixture).classList).toContain('fam-visually-hidden');
  });

  it('starts empty, says the loading sentence one task later, then the ready one', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    expect(region(fixture).textContent).toBe('');
    await settle(fixture);
    expect(region(fixture).textContent).toBe('Loading tasks…');
    fixture.componentInstance.busy.set(false);
    await fixture.whenStable();
    expect(region(fixture).textContent).toBe('Tasks ready.');
  });

  it('says loading again when a second load starts', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    fixture.componentInstance.busy.set(false);
    await fixture.whenStable();
    fixture.componentInstance.busy.set(true);
    await fixture.whenStable();
    expect(region(fixture).textContent).toBe('Loading tasks…');
  });

  it('never says ready when it did not say loading, and says a later load', async () => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.busy.set(false);
    await settle(fixture);
    expect(region(fixture).textContent).toBe('');
    fixture.componentInstance.busy.set(true);
    await fixture.whenStable();
    expect(region(fixture).textContent).toBe('Loading tasks…');
  });

  it('says nothing for a load that finished before it could say loading', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    fixture.componentInstance.busy.set(false);
    await settle(fixture);
    expect(region(fixture).textContent).toBe('');
  });

  it('says nothing when the load failed', async () => {
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    expect(region(fixture).textContent).toBe('Loading tasks…');
    fixture.componentInstance.failed.set(true);
    fixture.componentInstance.busy.set(false);
    await fixture.whenStable();
    expect(region(fixture).textContent).toBe('');
  });
});
