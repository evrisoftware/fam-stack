import {Component, signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {LiveNoteComponent} from 'fam-stack/a11y';

@Component({
  imports: [LiveNoteComponent],
  template: `<fam-live-note [text]="text()"/>`
})
class Host {
  readonly text = signal('');
}

describe('LiveNoteComponent', () => {
  it('is a live region holding the sentence, which follows its input', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const note = (fixture.nativeElement as HTMLElement).querySelector('fam-live-note') as HTMLElement;
    expect(note.getAttribute('role')).toBe('status');
    expect(note.getAttribute('aria-live')).toBe('polite');
    expect(note.textContent).toBe('');
    fixture.componentInstance.text.set('3 tasks left.');
    await fixture.whenStable();
    expect(note.textContent).toBe('3 tasks left.');
  });
});
