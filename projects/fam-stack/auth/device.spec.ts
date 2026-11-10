import {describeDevice, deviceIcon} from 'fam-stack/auth';

const BLINK = 'AppleWebKit/537.36 (KHTML, like Gecko)';
const WEBKIT = 'AppleWebKit/605.1.15 (KHTML, like Gecko)';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)';
const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';

const AGENTS = {
  chromeAndroid: `Mozilla/5.0 (Linux; Android 14; Pixel 8) ${BLINK} Chrome/126.0.0.0 Mobile Safari/537.36`,
  samsungAndroid: `Mozilla/5.0 (Linux; Android 14; SM-S918B) ${BLINK} SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36`,
  safariIphone: `${IPHONE} ${WEBKIT} Version/17.5 Mobile/15E148 Safari/604.1`,
  chromeIphone: `${IPHONE} ${WEBKIT} CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1`,
  firefoxIphone: `${IPHONE} ${WEBKIT} FxiOS/127.0 Mobile/15E148 Safari/605.1.15`,
  edgeIphone: `${IPHONE} ${WEBKIT} Version/17.0 EdgiOS/126.0.2592.56 Mobile/15E148 Safari/604.1`,
  edgeAndroid: `Mozilla/5.0 (Linux; Android 14; Pixel 8) ${BLINK} Chrome/126.0.0.0 Mobile Safari/537.36 EdgA/126.0.0.0`,
  safariIpad: `Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) ${WEBKIT} Version/17.5 Mobile/15E148 Safari/604.1`,
  safariMac: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ${WEBKIT} Version/17.5 Safari/605.1.15`,
  edgeWindows: `${WINDOWS} ${BLINK} Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0`,
  operaWindows: `${WINDOWS} ${BLINK} Chrome/125.0.0.0 Safari/537.36 OPR/111.0.0.0`,
  firefoxLinux: 'Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0',
  chromeChromeOs: `Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) ${BLINK} Chrome/126.0.0.0 Safari/537.36`
};

describe('describeDevice', () => {
  it('names the browser and the platform', () => {
    expect(describeDevice(AGENTS.chromeAndroid)).toBe('Chrome · Android');
    expect(describeDevice(AGENTS.safariMac)).toBe('Safari · macOS');
    expect(describeDevice(AGENTS.firefoxLinux)).toBe('Firefox · Linux');
    expect(describeDevice(AGENTS.chromeChromeOs)).toBe('Chrome · ChromeOS');
  });

  it('names a browser that also announces itself as Chrome or Safari by its own name', () => {
    expect(describeDevice(AGENTS.edgeWindows)).toBe('Edge · Windows');
    expect(describeDevice(AGENTS.operaWindows)).toBe('Opera · Windows');
    expect(describeDevice(AGENTS.samsungAndroid)).toBe('Samsung Internet · Android');
    expect(describeDevice(AGENTS.chromeIphone)).toBe('Chrome · iOS');
    expect(describeDevice(AGENTS.firefoxIphone)).toBe('Firefox · iOS');
    expect(describeDevice(AGENTS.edgeIphone)).toBe('Edge · iOS');
    expect(describeDevice(AGENTS.edgeAndroid)).toBe('Edge · Android');
  });

  it('reads an iPhone as iOS although its agent mentions Mac OS X', () => {
    expect(describeDevice(AGENTS.safariIphone)).toBe('Safari · iOS');
  });

  it('gives an unknown agent generic words', () => {
    expect(describeDevice('')).toBe('Browser · Device');
    expect(describeDevice('curl/8.7.1')).toBe('Browser · Device');
  });
});

describe('deviceIcon', () => {
  it('is a phone for Android and iOS, a computer for anything else', () => {
    expect(deviceIcon(AGENTS.chromeAndroid)).toBe('smartphone');
    expect(deviceIcon(AGENTS.safariIphone)).toBe('smartphone');
    expect(deviceIcon(AGENTS.safariIpad)).toBe('smartphone');
    expect(deviceIcon(AGENTS.edgeWindows)).toBe('computer');
    expect(deviceIcon('')).toBe('computer');
  });
});
