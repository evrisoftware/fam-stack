import {isUuidv7, uuidv7, uuidv7Time} from 'fam-stack/core';

describe('uuidv7', () => {
  it('is a well-formed version 7 UUID', () => {
    const id = uuidv7();
    expect(isUuidv7(id)).toBe(true);
    expect(id[14]).toBe('7');
  });

  it('carries the time it was minted at', () => {
    const before = Date.now();
    const time = uuidv7Time(uuidv7());
    expect(time).not.toBeNull();
    expect(time!).toBeGreaterThanOrEqual(before);
    expect(time!).toBeLessThanOrEqual(Date.now() + 1);
  });

  it('sorts in the order the ids were made, even within one millisecond', () => {
    const ids = Array.from({length: 2000}, () => uuidv7());
    expect([...ids].sort()).toEqual(ids);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('reads no time out of anything that is not a v7 UUID', () => {
    expect(uuidv7Time('not-a-uuid')).toBeNull();
    expect(uuidv7Time('123e4567-e89b-42d3-a456-426614174000')).toBeNull();
    expect(uuidv7Time(42)).toBeNull();
  });
});
