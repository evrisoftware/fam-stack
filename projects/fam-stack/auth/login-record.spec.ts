import {uuidv7, uuidv7Time} from 'fam-stack/core';
import {shapeLoginRecord, shapeLoginRecords} from 'fam-stack/auth';

const CHROME_ANDROID = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36';

describe('shapeLoginRecord', () => {
  it('keeps a well-formed record', () => {
    const uuid = uuidv7();
    const record = {uuid, time: 1_700_000_000_000, user: {uid: 'u1', email: 'ana@example.com'}, device: 'Chrome · Android', userAgent: CHROME_ANDROID};
    expect(shapeLoginRecord(record)).toEqual(record);
  });

  it('refuses anything without a UUID v7', () => {
    expect(shapeLoginRecord(null)).toBeNull();
    expect(shapeLoginRecord('x')).toBeNull();
    expect(shapeLoginRecord({time: 1})).toBeNull();
    expect(shapeLoginRecord({uuid: 'not-a-uuid'})).toBeNull();
  });

  it('reads a time no date can print from the uuid instead', () => {
    const uuid = uuidv7();
    for (const time of [Infinity, NaN, -5, 0, 'soon', null]) {
      expect(shapeLoginRecord({uuid, time})?.time).toBe(uuidv7Time(uuid));
    }
  });

  it('fills what is missing with safe values', () => {
    const shaped = shapeLoginRecord({uuid: uuidv7(), user: 'ana', device: 42, userAgent: CHROME_ANDROID});
    expect(shaped?.user).toEqual({uid: '', email: ''});
    expect(shaped?.device).toBe('Chrome · Android');
  });
});

describe('shapeLoginRecords', () => {
  it('drops unreadable entries and repeated uuids, keeping the stored order', () => {
    const first = uuidv7();
    const second = uuidv7();
    const shaped = shapeLoginRecords([{uuid: second}, 7, {uuid: first}, {uuid: second}]);
    expect(shaped.map(record => record.uuid)).toEqual([second, first]);
  });

  it('reads a list that is not a list as empty', () => {
    expect(shapeLoginRecords(undefined)).toEqual([]);
    expect(shapeLoginRecords({0: {uuid: uuidv7()}})).toEqual([]);
  });
});
