import {asAmount, asCount, asFlag, asList, asText} from 'fam-stack/core';

describe('defensive readers', () => {
  it('asList keeps arrays and empties everything else', () => {
    expect(asList([1, 2])).toEqual([1, 2]);
    expect(asList(undefined)).toEqual([]);
    expect(asList(null)).toEqual([]);
    expect(asList('ab' as unknown as string[])).toEqual([]);
  });

  it('asCount is whole, non-negative and bounded — Infinity included', () => {
    expect(asCount(3)).toBe(3);
    expect(asCount(2.7)).toBe(2);
    expect(asCount(-4)).toBe(0);
    expect(asCount('5')).toBe(5);
    expect(asCount(NaN)).toBe(0);
    expect(asCount(Infinity, 99)).toBe(99);
    expect(asCount(1e9, 99)).toBe(99);
  });

  it('asAmount rounds to the cent and turns anything non-finite into zero', () => {
    expect(asAmount(12.345)).toBe(12.35);
    expect(asAmount('9.5')).toBe(9.5);
    expect(asAmount(Infinity)).toBe(0);
    expect(asAmount(-Infinity)).toBe(0);
    expect(asAmount('abc')).toBe(0);
    expect(Object.is(asAmount(-0.001), 0)).toBe(true);
  });

  it('asText trims, bounds by code point and refuses non-strings', () => {
    expect(asText('  hi  ')).toBe('hi');
    expect(asText(42)).toBe('');
    expect(asText('abcdef', 3)).toBe('abc');
    expect(asText('😀😀😀', 2)).toBe('😀😀');
  });

  it('asFlag only believes booleans', () => {
    expect(asFlag(true)).toBe(true);
    expect(asFlag('true')).toBe(false);
    expect(asFlag(undefined, true)).toBe(true);
  });
});
