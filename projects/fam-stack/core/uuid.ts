/*
 * UUID version 7 (RFC 9562): Unix milliseconds then randomness, so ids sort by creation
 * time. A 12-bit counter keeps ids from one device in order within a millisecond and
 * when the clock steps back.
 */

let lastMs = 0;
let counter = 0;

const randomCounter = (): number => crypto.getRandomValues(new Uint16Array(1))[0] & 0x07ff;

/** A new time-ordered id, e.g. `0192f5b4-8a3e-7c1d-9f2a-4b6c8d0e1f23`. */
export const uuidv7 = (): string => {
  const now = Date.now();
  if (now > lastMs) {
    lastMs = now;
    counter = randomCounter();
  } else if (++counter > 0x0fff) {
    lastMs++;
    counter = randomCounter();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let ms = lastMs;
  for (let i = 5; i >= 0; i--) {
    bytes[i] = ms % 256;
    ms = Math.floor(ms / 256);
  }
  bytes[6] = 0x70 | (counter >> 8);
  bytes[7] = counter & 0xff;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Whether the value is a well-formed version 7 UUID. */
export const isUuidv7 = (value: unknown): value is string =>
  typeof value === 'string' && UUID_V7.test(value);

/** The Unix milliseconds a version 7 UUID was minted at, or `null` for anything else. */
export const uuidv7Time = (value: unknown): number | null =>
  isUuidv7(value) ? parseInt(value.slice(0, 8) + value.slice(9, 13), 16) : null;
