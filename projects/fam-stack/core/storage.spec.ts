import {readLocal, readLocalJson, removeLocal, writeLocal} from 'fam-stack/core';

describe('storage that never throws', () => {
  afterEach(() => localStorage.clear());

  it('round-trips values', () => {
    expect(writeLocal('k', 'v')).toBe(true);
    expect(readLocal('k')).toBe('v');
    removeLocal('k');
    expect(readLocal('k')).toBeNull();
  });

  it('reads unparsable JSON as nothing', () => {
    writeLocal('j', '{oops');
    expect(readLocalJson('j')).toBeNull();
    writeLocal('j', '{"a":1}');
    expect(readLocalJson<{a: number}>('j')).toEqual({a: 1});
  });

  it('answers "nothing stored" where storage itself throws', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get: () => {
        throw new DOMException('blocked', 'SecurityError');
      }
    });
    try {
      expect(readLocal('k')).toBeNull();
      expect(writeLocal('k', 'v')).toBe(false);
      expect(() => removeLocal('k')).not.toThrow();
    } finally {
      Object.defineProperty(globalThis, 'localStorage', original!);
    }
  });
});
