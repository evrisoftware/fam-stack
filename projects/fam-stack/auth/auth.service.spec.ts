import {TestBed} from '@angular/core/testing';
import {provideRouter, Router} from '@angular/router';
import {NEVER, of, throwError} from 'rxjs';
import {FAM_TEXT_EN} from 'fam-stack/core';
import {FamSession, FamUser} from 'fam-stack/backend';
import {NotificationService} from 'fam-stack/ui';
import {AuthService, LoginHistoryService} from 'fam-stack/auth';

const USER: FamUser = {uid: 'u1', email: 'a@example.com'};

const fakeSession = (overrides: Partial<FamSession>): FamSession => ({
  user: () => of(USER),
  currentUser: () => USER,
  lastSignInTime: () => null,
  signIn: () => Promise.resolve(USER),
  signOut: () => Promise.resolve(),
  ...overrides
});

const setup = (session: Partial<FamSession> = {}) => {
  const notification = {error: vi.fn()};
  const history = {recordLogin: vi.fn(() => Promise.resolve()), clearDeviceSession: vi.fn()};
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{path: 'login', children: []}]),
      {provide: FamSession, useValue: fakeSession(session)},
      {provide: NotificationService, useValue: notification},
      {provide: LoginHistoryService, useValue: history}
    ]
  });
  return {auth: TestBed.inject(AuthService), router: TestBed.inject(Router), notification, history};
};

describe('AuthService', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => undefined));
  afterEach(() => vi.restoreAllMocks());

  it('restores the session into currentUser, and rejects when the session stream fails', async () => {
    const {auth} = setup();
    expect(auth.currentUser()).toBeUndefined();
    expect(await auth.loadUser()).toEqual(USER);
    expect(auth.currentUser()).toEqual(USER);

    TestBed.resetTestingModule();
    const failing = setup({user: () => throwError(() => new Error('storage'))}).auth;
    await expect(failing.loadUser()).rejects.toThrow('storage');
    expect(failing.currentUser()).toBeUndefined();
  });

  it('signs in, sets the user at once and records the sign-in without waiting for it', async () => {
    const {auth, history} = setup();
    history.recordLogin.mockReturnValue(new Promise<void>(() => undefined));
    expect(await auth.login('a@example.com', 'secret')).toEqual(USER);
    expect(auth.currentUser()).toEqual(USER);
    expect(history.recordLogin).toHaveBeenCalledWith(USER);
  });

  it('raises signingOut$ before the session is revoked, then lands on the login', async () => {
    const order: string[] = [];
    const {auth, router, history} = setup({
      user: () => NEVER,
      signOut: () => {
        order.push('signOut');
        return Promise.resolve();
      }
    });
    auth.signingOut$.subscribe(() => order.push('signingOut$'));
    await auth.logout();
    expect(order).toEqual(['signingOut$', 'signOut']);
    expect(auth.currentUser()).toBeNull();
    expect(history.clearDeviceSession).toHaveBeenCalled();
    expect(router.url).toBe('/login');
  });

  it('says a refused sign-out on screen and still leaves for the login', async () => {
    const {auth, router, notification} = setup({signOut: () => Promise.reject(new Error('network'))});
    await auth.logout();
    expect(notification.error).toHaveBeenCalledWith(FAM_TEXT_EN.signOutFailed);
    expect(router.url).toBe('/login');
  });
});
