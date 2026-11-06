import {withoutUndefined} from 'fam-stack/firebase';

class Stamp {
  constructor(readonly at: number, readonly note?: string) {
  }
}

describe('withoutUndefined', () => {
  it('drops undefined keys at every depth', () => {
    expect(withoutUndefined({a: 1, b: undefined, c: {d: undefined, e: 'x'}}))
      .toEqual({a: 1, c: {e: 'x'}});
  });

  it('turns undefined array elements into null, as JSON does', () => {
    expect(withoutUndefined([1, undefined, {a: undefined}])).toEqual([1, null, {}]);
  });

  it('passes class instances (Timestamps, sentinels) through untouched', () => {
    const stamp = new Stamp(1, undefined);
    const result = withoutUndefined({stamp});
    expect(result.stamp).toBe(stamp);
  });

  it('leaves primitives and null alone', () => {
    expect(withoutUndefined(null)).toBeNull();
    expect(withoutUndefined('a')).toBe('a');
    expect(withoutUndefined({a: null})).toEqual({a: null});
  });
});
