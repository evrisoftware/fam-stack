import {TestBed} from '@angular/core/testing';
import {MatDialog} from '@angular/material/dialog';
import {Subject} from 'rxjs';
import {BackGestureHandler, DialogHistoryService} from 'fam-stack/ui';

/* A history traversal lands in a later task. */
const landed = (): Promise<void> => new Promise(resolve => setTimeout(resolve, 20));
const onMarker = (): boolean => Boolean((history.state as {famLayer?: boolean} | null)?.famLayer);
const depth = (): number | undefined => (history.state as {depth?: number} | null)?.depth;

let popStateListeners: EventListener[] = [];

const setup = () => {
  const opened = new Subject<unknown>();
  const added = vi.spyOn(window, 'addEventListener');
  TestBed.configureTestingModule({providers: [{provide: MatDialog, useValue: {afterOpened: opened}}]});
  const service = TestBed.inject(DialogHistoryService);
  popStateListeners = added.mock.calls
    .filter(([type]) => type === 'popstate')
    .map(([, listener]) => listener as EventListener);
  added.mockRestore();
  /* Opens a dialog the way MatDialog reports it; `closed()` is its `beforeClosed`. */
  const open = (instance: unknown = {}) => {
    const beforeClosed = new Subject<void>();
    const ref = {close: vi.fn(), componentInstance: instance, beforeClosed: () => beforeClosed};
    opened.next(ref);
    return {ref, closed: () => beforeClosed.next()};
  };
  return {service, open};
};

describe('DialogHistoryService', () => {
  afterEach(async () => {
    popStateListeners.forEach(listener => window.removeEventListener('popstate', listener));
    popStateListeners = [];
    await landed();
    while (onMarker()) {
      history.back();
      await landed();
    }
    vi.restoreAllMocks();
  });

  it('gives an open menu a history marker, and the back gesture closes the menu', async () => {
    const {service} = setup();
    const close = vi.fn();
    expect(onMarker()).toBe(false);
    service.trackMenu(close);
    expect(onMarker()).toBe(true);
    history.back();
    await landed();
    expect(close).toHaveBeenCalledTimes(1);
    expect(onMarker()).toBe(false);
  });

  it('steps off the marker of a menu closed another way, without closing it again', async () => {
    const {service} = setup();
    const close = vi.fn();
    const release = service.trackMenu(close);
    release();
    await landed();
    expect(onMarker()).toBe(false);
    expect(close).not.toHaveBeenCalled();
  });

  it('closes only the newest of two layers per back gesture', async () => {
    const {service, open} = setup();
    const dialog = open();
    const closeMenu = vi.fn();
    service.trackMenu(closeMenu);
    expect(depth()).toBe(2);
    history.back();
    await landed();
    expect(closeMenu).toHaveBeenCalledTimes(1);
    expect(dialog.ref.close).not.toHaveBeenCalled();
    expect(depth()).toBe(1);
    history.back();
    await landed();
    expect(dialog.ref.close).toHaveBeenCalledTimes(1);
    expect(onMarker()).toBe(false);
  });

  it('steps off the marker of a dialog that closed by itself', async () => {
    const {open} = setup();
    const dialog = open();
    expect(onMarker()).toBe(true);
    dialog.closed();
    await landed();
    expect(onMarker()).toBe(false);
    expect(dialog.ref.close).not.toHaveBeenCalled();
  });

  it('hands a layer\'s marker to the layer that replaces it in the same turn', async () => {
    const {service} = setup();
    const pushed = vi.spyOn(history, 'pushState');
    const traversed = vi.spyOn(history, 'go');
    const release = service.trackMenu(vi.fn());
    release();
    const closeNext = vi.fn();
    service.trackMenu(closeNext);
    await landed();
    expect(onMarker()).toBe(true);
    expect(pushed).toHaveBeenCalledTimes(1);
    expect(traversed).not.toHaveBeenCalled();
    history.back();
    await landed();
    expect(closeNext).toHaveBeenCalledTimes(1);
    expect(onMarker()).toBe(false);
  });

  it('leaves a dialog open, on a marker, while its onBackGesture answers true', async () => {
    const instance: BackGestureHandler = {onBackGesture: vi.fn(() => true)};
    const {open} = setup();
    const dialog = open(instance);
    history.back();
    await landed();
    expect(instance.onBackGesture).toHaveBeenCalledTimes(1);
    expect(dialog.ref.close).not.toHaveBeenCalled();
    expect(onMarker()).toBe(true);
    vi.mocked(instance.onBackGesture).mockReturnValue(false);
    history.back();
    await landed();
    expect(dialog.ref.close).toHaveBeenCalledTimes(1);
    expect(onMarker()).toBe(false);
  });

  it('gives a page entered inside a dialog its own marker, which the back gesture spends first', async () => {
    const instance: BackGestureHandler = {onBackGesture: vi.fn(() => true)};
    const {service, open} = setup();
    const dialog = open(instance);
    service.enterStep(instance);
    expect(depth()).toBe(2);
    history.back();
    await landed();
    expect(depth()).toBe(1);
    expect(dialog.ref.close).not.toHaveBeenCalled();
    vi.mocked(instance.onBackGesture).mockReturnValue(false);
    history.back();
    await landed();
    expect(dialog.ref.close).toHaveBeenCalledTimes(1);
    expect(onMarker()).toBe(false);
  });

  it('re-enters a page on the forward gesture, and closing the dialog frees the page\'s marker too', async () => {
    const instance = {onBackGesture: vi.fn(() => true), onForwardGesture: vi.fn(() => true)};
    const {service, open} = setup();
    const dialog = open(instance);
    service.enterStep(instance);
    history.back();
    await landed();
    expect(depth()).toBe(1);
    history.forward();
    await landed();
    expect(instance.onForwardGesture).toHaveBeenCalledTimes(1);
    expect(depth()).toBe(2);
    instance.onBackGesture.mockReturnValue(false);
    history.back();
    await landed();
    await landed();
    expect(dialog.ref.close).toHaveBeenCalledTimes(1);
    expect(onMarker()).toBe(false);
  });

  it('walks a forward gesture back when no dialog takes it', async () => {
    const {service} = setup();
    const closeFirst = vi.fn();
    const release = service.trackMenu(closeFirst);
    service.trackMenu(vi.fn());
    history.back();
    await landed();
    expect(depth()).toBe(1);
    history.forward();
    await landed();
    await landed();
    expect(depth()).toBe(1);
    expect(closeFirst).not.toHaveBeenCalled();
    release();
    await landed();
    expect(onMarker()).toBe(false);
  });

  it('gives a layer opened while a marker is being stepped off its own marker once that lands', async () => {
    const {service} = setup();
    const traversed = vi.spyOn(history, 'go');
    service.trackMenu(vi.fn())();
    await Promise.resolve();
    await Promise.resolve();
    expect(traversed).toHaveBeenCalledWith(-1);
    const close = vi.fn();
    service.trackMenu(close);
    await landed();
    expect(onMarker()).toBe(true);
    history.back();
    await landed();
    expect(close).toHaveBeenCalledTimes(1);
    expect(onMarker()).toBe(false);
  });

  it('releases a page\'s marker when the dialog leaves the page by its own arrow', async () => {
    const instance = {};
    const {service, open} = setup();
    const dialog = open(instance);
    service.enterStep(instance);
    service.leaveStep(instance);
    await landed();
    expect(depth()).toBe(1);
    service.leaveStep(instance);
    await landed();
    expect(depth()).toBe(1);
    dialog.closed();
    await landed();
    expect(onMarker()).toBe(false);
  });

  it('ignores a page of a component that is no open dialog\'s', () => {
    const {service} = setup();
    service.enterStep({});
    expect(onMarker()).toBe(false);
  });

  it('steps off a marker left behind when it starts', async () => {
    history.pushState({famLayer: true, depth: 1}, '');
    setup();
    await landed();
    expect(onMarker()).toBe(false);
  });
});
