import {emailName, parseNumberField, shapeNumberText} from 'fam-stack/ui';

describe('shapeNumberText', () => {
  it('never invents a value: empty stays empty, a stray letter strips to nothing', () => {
    expect(shapeNumberText('', 2, 100)).toBe('');
    expect(shapeNumberText('a', 2, 100)).toBe('');
  });

  it('reads a comma as the decimal point', () => {
    expect(shapeNumberText('1,50', 2, 100)).toBe('1.50');
  });

  it('keeps one point and the allowed places', () => {
    expect(shapeNumberText('1.2.3', 2, 100)).toBe('1.23');
    expect(shapeNumberText('1.234', 2, 100)).toBe('1.23');
    expect(shapeNumberText('1.5', 0, 100)).toBe('15');
  });

  it('drops only redundant leading zeros', () => {
    expect(shapeNumberText('007', 0, 100)).toBe('7');
    expect(shapeNumberText('0.50', 2, 100)).toBe('0.50');
    expect(shapeNumberText('0', 0, 100)).toBe('0');
  });

  it('drops the keystroke that would cross the ceiling', () => {
    expect(shapeNumberText('1000', 0, 999)).toBe('100');
  });

  it('never leaves a pasted value above the ceiling', () => {
    expect(shapeNumberText('123456', 0, 999)).toBe('123');
    expect(shapeNumberText('9999.99', 2, 999)).toBe('999');
  });
});

describe('parseNumberField', () => {
  it('reads empty as empty, never as zero', () => {
    expect(parseNumberField('', 10)).toBeNull();
    expect(parseNumberField('  ', 10)).toBeNull();
    expect(parseNumberField(null, 10)).toBeNull();
  });

  it('clamps what it stores', () => {
    expect(parseNumberField('12', 10)).toBe(10);
    expect(parseNumberField('-3', 10)).toBe(0);
    expect(parseNumberField('2,5', 10)).toBe(2.5);
  });
});

describe('emailName', () => {
  it('keeps the name and drops the domain', () => {
    expect(emailName('ana@example.com')).toBe('ana');
    expect(emailName('no-at-sign')).toBe('no-at-sign');
    expect(emailName('@weird')).toBe('@weird');
    expect(emailName(undefined)).toBe('');
  });
});
