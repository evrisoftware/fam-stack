import {TestBed} from '@angular/core/testing';
import {ActivatedRouteSnapshot, provideRouter, RouterStateSnapshot, UrlTree} from '@angular/router';
import {firstValueFrom, isObservable, Observable} from 'rxjs';
import {FamSession, FamUser, redirectLoggedInTo, redirectUnauthorizedTo} from 'fam-stack/backend';

type Emission = (next: (user: unknown) => void, error: (e: unknown) => void, complete: () => void) => void;

/* A session whose user stream hands the guards whatever `emit` produces. */
const fakeSession = (emit: Emission): FamSession => ({
  user: () => new Observable<FamUser | null>(subscriber => emit(
    user => subscriber.next(user as FamUser | null),
    error => subscriber.error(error),
    () => subscriber.complete())),
  currentUser: () => null,
  lastSignInTime: () => null,
  signIn: () => Promise.reject(new Error('Not used by the guards.')),
  signOut: () => Promise.resolve()
});

const run = async (guard: ReturnType<typeof redirectUnauthorizedTo>, emit: Emission): Promise<true | string> => {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideRouter([]), {provide: FamSession, useValue: fakeSession(emit)}]
  });
  const result = TestBed.runInInjectionContext(() =>
    guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)) as Observable<true | UrlTree>;
  expect(isObservable(result)).toBe(true);
  const answer = await firstValueFrom(result);
  return answer === true ? true : answer.toString();
};

describe('auth guards fail closed', () => {
  const protectedRoute = redirectUnauthorizedTo(() => '/login');
  const loginRoute = redirectLoggedInTo(() => ['app', 'home']);

  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => undefined));
  afterEach(() => vi.restoreAllMocks());

  it('lets a signed-in user through and sends a signed-out one to the login', async () => {
    expect(await run(protectedRoute, next => next({uid: 'u1', email: 'a@example.com'}))).toBe(true);
    expect(await run(protectedRoute, next => next(null))).toBe('/login');
  });

  it('reads undefined as signed OUT, not as signed in', async () => {
    expect(await run(protectedRoute, next => next(undefined))).toBe('/login');
  });

  it('reads a session stream that errors as signed out', async () => {
    expect(await run(protectedRoute, (_next, error) => error(new Error('storage')))).toBe('/login');
  });

  it('reads a session stream that completes empty as signed out', async () => {
    expect(await run(protectedRoute, (_next, _error, complete) => complete())).toBe('/login');
  });

  it('decides on the first emission only', async () => {
    expect(await run(protectedRoute, next => {
      next(null);
      next({uid: 'u1', email: 'a@example.com'});
    })).toBe('/login');
  });

  it('sends a signed-in user away from the login, and lets a signed-out one stay', async () => {
    expect(await run(loginRoute, next => next({uid: 'u1', email: 'a@example.com'}))).toBe('/app/home');
    expect(await run(loginRoute, next => next(null))).toBe(true);
  });
});
