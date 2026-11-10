import {TestBed} from '@angular/core/testing';
import {FAM_TEXT_EN} from 'fam-stack/core';
import {GlobalErrorHandler, NotificationService} from 'fam-stack/ui';

const setup = () => {
  const notification = {error: vi.fn()};
  TestBed.configureTestingModule({
    providers: [GlobalErrorHandler, {provide: NotificationService, useValue: notification}]
  });
  return {handler: TestBed.inject(GlobalErrorHandler), notification};
};

describe('GlobalErrorHandler', () => {
  let logged: ReturnType<typeof vi.spyOn>;
  let debugged: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    debugged = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('logs the error and says the unexpected-error sentence', () => {
    const {handler, notification} = setup();
    const error = new Error('boom');
    handler.handleError(error);
    expect(logged).toHaveBeenCalledWith(error);
    expect(notification.error).toHaveBeenCalledWith(FAM_TEXT_EN.unexpectedError);
  });

  it('resolves NotificationService only when it first has something to say', () => {
    const notification = {error: vi.fn()};
    const resolve = vi.fn(() => notification);
    TestBed.configureTestingModule({
      providers: [GlobalErrorHandler, {provide: NotificationService, useFactory: resolve}]
    });
    const handler = TestBed.inject(GlobalErrorHandler);
    expect(resolve).not.toHaveBeenCalled();
    handler.handleError(new Error('boom'));
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(notification.error).toHaveBeenCalledTimes(1);
  });

  it('logs every error but says the sentence at most once per 4 s', () => {
    const {handler, notification} = setup();
    handler.handleError(new Error('one'));
    vi.advanceTimersByTime(3999);
    handler.handleError(new Error('two'));
    expect(logged).toHaveBeenCalledTimes(2);
    expect(notification.error).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    handler.handleError('three');
    expect(notification.error).toHaveBeenCalledTimes(2);
  });

  it('logs a ResizeObserver notice at debug and says nothing', () => {
    const {handler, notification} = setup();
    handler.handleError(new Error('ResizeObserver loop completed with undelivered notifications.'));
    expect(debugged).toHaveBeenCalledTimes(1);
    expect(logged).not.toHaveBeenCalled();
    expect(notification.error).not.toHaveBeenCalled();
  });
});
