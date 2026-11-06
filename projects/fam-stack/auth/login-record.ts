import {asList, asText, isUuidv7, uuidv7Time} from 'fam-stack/core';
import {describeDevice} from './device';
import {LoginRecord} from './types';

const DEVICE_MAX = 80;
const USER_AGENT_MAX = 512;
const EMAIL_MAX = 254;

/**
 * A stored sign-in read defensively, or `null` when its `uuid` is not a UUID v7. A time
 * that is not a positive finite number falls back to the time inside the `uuid`.
 */
export const shapeLoginRecord = (raw: unknown): LoginRecord | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const record = raw as Partial<Record<keyof LoginRecord, unknown>>;
  if (!isUuidv7(record.uuid)) return null;
  const time = Number(record.time);
  const user = (typeof record.user === 'object' && record.user !== null ? record.user : {}) as
    Partial<Record<'uid' | 'email', unknown>>;
  const userAgent = asText(record.userAgent, USER_AGENT_MAX);
  return {
    uuid: record.uuid,
    time: Number.isFinite(time) && time > 0 ? time : uuidv7Time(record.uuid) ?? 0,
    user: {uid: asText(user.uid), email: asText(user.email, EMAIL_MAX)},
    device: asText(record.device, DEVICE_MAX) || describeDevice(userAgent),
    userAgent
  };
};

/** Every showable sign-in, in stored order, each `uuid` once. */
export const shapeLoginRecords = (raw: unknown): readonly LoginRecord[] => {
  const seen = new Set<string>();
  const records: LoginRecord[] = [];
  for (const entry of asList(raw as readonly unknown[])) {
    const record = shapeLoginRecord(entry);
    if (record === null || seen.has(record.uuid)) continue;
    seen.add(record.uuid);
    records.push(record);
  }
  return records;
};
