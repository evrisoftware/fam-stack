import {firebaseErrorCode, isPermissionDenied} from 'fam-stack/firebase';

describe('firebaseErrorCode', () => {
  it('reads the code of an error object', () => {
    expect(firebaseErrorCode({code: 'permission-denied'})).toBe('permission-denied');
    expect(firebaseErrorCode(Object.assign(new Error('offline'), {code: 'unavailable'}))).toBe('unavailable');
  });

  it('is null for anything without a text code', () => {
    expect(firebaseErrorCode(new Error('plain'))).toBeNull();
    expect(firebaseErrorCode({code: 7})).toBeNull();
    expect(firebaseErrorCode('permission-denied')).toBeNull();
    expect(firebaseErrorCode(null)).toBeNull();
    expect(firebaseErrorCode(undefined)).toBeNull();
  });
});

describe('isPermissionDenied', () => {
  it('is true only for the rules refusing the operation', () => {
    expect(isPermissionDenied({code: 'permission-denied'})).toBe(true);
    expect(isPermissionDenied({code: 'unavailable'})).toBe(false);
    expect(isPermissionDenied(new Error('permission-denied'))).toBe(false);
  });
});
