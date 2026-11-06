import {TestBed} from '@angular/core/testing';
import {defer, Observable, Subscriber} from 'rxjs';
import {LinkService, LinkTransport, LiveSnapshot} from 'fam-stack/backend';

/* A probe whose every subscription is recorded, so a test can feed or fail each one. */
const controllableProbe = () => {
  const attempts: Subscriber<LiveSnapshot>[] = [];
  const probe = defer(() => new Observable<LiveSnapshot>(subscriber => {
    attempts.push(subscriber);
  }));
  return {probe, attempts};
};

/* A `LinkService` whose rebuilds settle when the test settles them. */
const setup = () => {
  const rebuilds: {resolve: () => void; reject: (error: unknown) => void}[] = [];
  const transport: LinkTransport = {
    rebuild: () => new Promise<void>((resolve, reject) => rebuilds.push({resolve, reject}))
  };
  TestBed.configureTestingModule({providers: [{provide: LinkTransport, useValue: transport}]});
  return {link: TestBed.inject(LinkService), rebuilds};
};

describe('LinkService', () => {
  let hidden = false;
  const setHidden = (value: boolean): void => {
    hidden = value;
    document.dispatchEvent(new Event('visibilitychange'));
  };

  beforeEach(() => {
    vi.useFakeTimers({toFake: ['setTimeout', 'clearTimeout', 'Date']});
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    hidden = false;
    Object.defineProperty(document, 'hidden', {configurable: true, get: () => hidden});
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    Reflect.deleteProperty(document, 'hidden');
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('turns stale only after the probe has answered from cache for the grace period', () => {
    const {link} = setup();
    const {probe, attempts} = controllableProbe();
    link.watch(probe);

    attempts[0].next({fromCache: true});
    vi.advanceTimersByTime(7_999);
    expect(link.isStale()).toBe(false);
    vi.advanceTimersByTime(1);
    expect(link.isStale()).toBe(true);

    attempts[0].next({fromCache: false});
    expect(link.isStale()).toBe(false);
  });

  it('withdraws a break only when the same stream reports alive', () => {
    const {link} = setup();
    const {probe, attempts} = controllableProbe();
    link.watch(probe);

    link.reportBroken('tasks', new Error('refused'));
    attempts[0].next({fromCache: false});
    link.reportAlive('files');
    expect(link.broken()).toEqual(['tasks']);
    expect(link.isStale()).toBe(true);

    link.reportAlive('tasks');
    expect(link.isStale()).toBe(false);
  });

  it('reports a probe that fails and reopens it only on the next revive', async () => {
    const {link, rebuilds} = setup();
    const {probe, attempts} = controllableProbe();
    link.watch(probe);

    attempts[0].error(new Error('denied'));
    expect(link.broken()).toEqual(['liveness probe']);
    expect(attempts.length).toBe(1);

    const outcome = link.revive();
    rebuilds[0].resolve();
    expect(await outcome).toBe('revived');
    expect(attempts.length).toBe(2);

    attempts[1].next({fromCache: false});
    expect(link.isStale()).toBe(false);
  });

  it('runs one revive at a time, and a failed rebuild leaves the screens stale', async () => {
    const {link, rebuilds} = setup();
    link.watch(controllableProbe().probe);

    const first = link.revive();
    expect(link.isReviving()).toBe(true);
    expect(await link.revive()).toBe('busy');
    rebuilds[0].resolve();
    expect(await first).toBe('revived');
    expect(link.isReviving()).toBe(false);

    const second = link.revive();
    rebuilds[1].reject(new Error('offline'));
    expect(await second).toBe('failed');
    expect(link.isStale()).toBe(true);
  });

  it('abandons a revive that stop() overtakes, and clears every report', async () => {
    const {link, rebuilds} = setup();
    const {probe, attempts} = controllableProbe();
    link.watch(probe);
    link.reportBroken('tasks', new Error('refused'));

    const outcome = link.revive();
    link.stop();
    expect(link.isStale()).toBe(false);
    expect(link.isReviving()).toBe(false);
    expect(attempts[0].closed).toBe(true);

    rebuilds[0].resolve();
    expect(await outcome).toBe('abandoned');
    expect(link.isReviving()).toBe(false);
    expect(attempts.length).toBe(1);
  });

  it('revives on a return after 30 s hidden, not after a shorter absence', () => {
    const {link, rebuilds} = setup();
    link.watch(controllableProbe().probe);

    setHidden(true);
    vi.advanceTimersByTime(29_999);
    setHidden(false);
    expect(rebuilds.length).toBe(0);

    setHidden(true);
    vi.advanceTimersByTime(30_000);
    setHidden(false);
    expect(rebuilds.length).toBe(1);
  });

  it('revives on a return from hidden while stale, however short the absence', () => {
    const {link, rebuilds} = setup();
    link.watch(controllableProbe().probe);
    link.reportBroken('tasks', new Error('refused'));

    setHidden(true);
    vi.advanceTimersByTime(1_000);
    setHidden(false);
    expect(rebuilds.length).toBe(1);
  });

  it('revives when the browser comes back online', () => {
    const {link, rebuilds} = setup();
    link.watch(controllableProbe().probe);

    window.dispatchEvent(new Event('online'));
    expect(rebuilds.length).toBe(1);
  });
});
