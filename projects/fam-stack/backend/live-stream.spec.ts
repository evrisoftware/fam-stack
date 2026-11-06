import {defer, Observable, Subscriber} from 'rxjs';
import {LiveSnapshot, retryLiveStream} from 'fam-stack/backend';

/* A source whose every subscription is recorded, so a test can fail or feed each one. */
const controllableSource = () => {
  const attempts: Subscriber<LiveSnapshot>[] = [];
  const source = defer(() => new Observable<LiveSnapshot>(subscriber => {
    attempts.push(subscriber);
  }));
  return {source, attempts};
};

describe('retryLiveStream', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('retries a failed listener with a doubling, capped backoff, reporting each break', () => {
    const {source, attempts} = controllableSource();
    const reported: unknown[] = [];
    const subscription = source.pipe(retryLiveStream(error => reported.push(error), {baseMs: 100, capMs: 300}))
      .subscribe();

    attempts[0].error('first');
    expect(reported).toEqual(['first']);
    vi.advanceTimersByTime(99);
    expect(attempts.length).toBe(1);
    vi.advanceTimersByTime(1);
    expect(attempts.length).toBe(2);

    attempts[1].error('second');
    vi.advanceTimersByTime(199);
    expect(attempts.length).toBe(2);
    vi.advanceTimersByTime(1);
    expect(attempts.length).toBe(3);

    attempts[2].error('third');
    vi.advanceTimersByTime(300);
    expect(attempts.length).toBe(4);
    subscription.unsubscribe();
  });

  it('is reset by a SERVER snapshot, not by a replay from the cache', () => {
    const {source, attempts} = controllableSource();
    const subscription = source.pipe(retryLiveStream(() => undefined, {baseMs: 100, capMs: 10_000}))
      .subscribe();

    attempts[0].error('down');
    vi.advanceTimersByTime(100);
    /* The cache replays on every resubscribe; it proves nothing, so the next wait doubles. */
    attempts[1].next({fromCache: true});
    attempts[1].error('still down');
    vi.advanceTimersByTime(199);
    expect(attempts.length).toBe(2);
    vi.advanceTimersByTime(1);
    expect(attempts.length).toBe(3);

    /* The server answered: the next outage starts from the base wait again. */
    attempts[2].next({fromCache: false});
    attempts[2].error('blip');
    vi.advanceTimersByTime(100);
    expect(attempts.length).toBe(4);
    subscription.unsubscribe();
  });

  it('counts failures per subscription, not per operator', () => {
    const operator = retryLiveStream<LiveSnapshot>(() => undefined, {baseMs: 100});
    const first = controllableSource();
    const second = controllableSource();
    const a = first.source.pipe(operator).subscribe();
    const b = second.source.pipe(operator).subscribe();

    first.attempts[0].error('x');
    vi.advanceTimersByTime(100);
    first.attempts[1].error('x');
    second.attempts[0].error('y');
    vi.advanceTimersByTime(100);
    expect(second.attempts.length).toBe(2);
    expect(first.attempts.length).toBe(2);
    a.unsubscribe();
    b.unsubscribe();
  });
});
