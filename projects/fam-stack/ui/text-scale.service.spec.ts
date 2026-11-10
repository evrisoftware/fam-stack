import {TestBed} from '@angular/core/testing';
import {TEXT_SCALE_STORAGE_KEY, TextScaleService} from 'fam-stack/ui';

const KEY = 'fam.text-scale';
const applied = (): string => document.documentElement.style.getPropertyValue('--fam-text-scale');

const start = (stored?: string): TextScaleService => {
  TestBed.resetTestingModule();
  localStorage.clear();
  if (stored !== undefined) localStorage.setItem(KEY, stored);
  return TestBed.inject(TextScaleService);
};

describe('TextScaleService', () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.style.removeProperty('--fam-text-scale');
  });

  it('starts at the middle size and applies it to <html>', () => {
    const scale = start();
    expect(scale.label()).toBe('Normal');
    expect(applied()).toBe('1');
    expect(scale.canGrow()).toBe(true);
    expect(scale.canShrink()).toBe(true);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('grows to the largest size, stores it and stops there', () => {
    const scale = start();
    scale.grow();
    expect(scale.label()).toBe('Large');
    expect(applied()).toBe('1.15');
    expect(localStorage.getItem(KEY)).toBe('2');
    expect(scale.canGrow()).toBe(false);
    scale.grow();
    expect(scale.label()).toBe('Large');
  });

  it('shrinks to the smallest size, stores it and stops there', () => {
    const scale = start();
    scale.shrink();
    expect(scale.label()).toBe('Small');
    expect(applied()).toBe('0.9');
    expect(localStorage.getItem(KEY)).toBe('0');
    expect(scale.canShrink()).toBe(false);
    scale.shrink();
    expect(scale.label()).toBe('Small');
  });

  it('restores the stored size', () => {
    expect(start('0').label()).toBe('Small');
    expect(applied()).toBe('0.9');
    expect(start('2').label()).toBe('Large');
  });

  it.each(['', 'abc', '7', '-1', '1.5'])('reads the stored value "%s" as the middle size', stored => {
    expect(start(stored).label()).toBe('Normal');
  });

  it('remembers the size under the key the app provides', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({providers: [{provide: TEXT_SCALE_STORAGE_KEY, useValue: 'mine.scale'}]});
    TestBed.inject(TextScaleService).grow();
    expect(localStorage.getItem('mine.scale')).toBe('2');
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});
