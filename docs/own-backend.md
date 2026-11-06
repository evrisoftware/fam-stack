# Using your own backend

fam-stack is a Firebase stack: Auth and Firestore are its backend, the security rules are
its server, and it is built and tested that way. If your data lives behind an API of your
own (PHP, Java, Go…), you can still take its Angular and Material half. This page lists what
to replace and what your server has to do so the layer's safeguards still hold.

You give up what Firebase brings: security rules and the emulators, offline persistence with
queued writes, the local echo of a write, and Firebase Hosting with `firebase.json`'s headers.

## What you keep

- `fam-stack/core`, `ui`, `a11y` and `styles`, which never touch a backend.
- `fam-stack/shell` and `fam-stack/auth`, which read the backend only through the contracts
  in `fam-stack/backend`.
- `fam-stack/backend` itself: `retryLiveStream`, the fail-closed guards, and `LinkService`
  behind the stale banner and the reconnect.
- The starter's screens, dialogs and shaping functions (`task.ts`), and every browser step
  of the smoke test.

## What you replace

### 1. The three contracts

`provideFirebase` provides them over Firebase. Yours provide them over your API:

| Contract | What it does |
| --- | --- |
| `FamSession` | `user()`: nothing until this device's session is known, then the user or `null`; an error or an empty completion reads as signed out. `currentUser()`, `lastSignInTime()` (or `null`), `signIn(email, password)`, `signOut()`. |
| `LinkTransport` | `rebuild()`: reopens every live stream; rejects when the server cannot be reached. |
| `LoginHistoryStore` | `prepend(history, uid, entry, limit)` and `read(history, uid)`. Or keep no history: `auth: {loginHistory: null}` in `provideFamStack`, and the store is never called, so a stub does. |

A session over a same-origin cookie, for example:

```ts
import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {catchError, firstValueFrom, map, Observable, of, throwError} from 'rxjs';
import {asText} from 'fam-stack/core';
import {FamSession, FamUser} from 'fam-stack/backend';

@Injectable()
export class ApiSession implements FamSession {
  private readonly http = inject(HttpClient);
  private signedIn: FamUser | null = null;

  user(): Observable<FamUser | null> {
    return this.http.get<unknown>('/api/session').pipe(
      map(body => this.remember(shapeUser(body))),
      catchError((error: unknown) => isStatus(error, 401) ? of(this.remember(null)) : throwError(() => error)));
  }

  currentUser(): FamUser | null {
    return this.signedIn;
  }

  lastSignInTime(): number | null {
    return null;
  }

  async signIn(email: string, password: string): Promise<FamUser> {
    const user = shapeUser(await firstValueFrom(this.http.post<unknown>('/api/auth/login', {email, password})));
    if (!user) throw new Error('The sign-in answer named no account.');
    return this.remember(user);
  }

  async signOut(): Promise<void> {
    try {
      await firstValueFrom(this.http.post('/api/auth/logout', null));
    } catch (error: unknown) {
      if (!isStatus(error, 401)) throw error;   // already signed out
    }
    this.remember(null);
  }

  private remember<U extends FamUser | null>(user: U): U {
    this.signedIn = user;
    return user;
  }
}

const isStatus = (error: unknown, status: number): boolean =>
  error instanceof HttpErrorResponse && error.status === status;

/* The account as the API sends it, read defensively; `null` without a uid. */
const shapeUser = (body: unknown): FamUser | null => {
  const raw = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
  const uid = asText(raw['uid']);
  return uid ? {uid, email: asText(raw['email'])} : null;
};
```

A failed `GET /api/session` is an error, so a device that cold-starts offline lands on the
sign-in screen; remember the last user on the device if yours must open offline.

Put the adapter in an entry of its own beside `firebase/` (`projects/fam-stack/api/`, with
`api: ['core', 'backend']` in `scripts/check-entries.mjs` and `'api'` in its `src` list), then
replace `provideFirebase(...)` in `src/provide-fam-stack.ts` with `provideHttpClient()` and
your three providers. Once nothing imports them,
`projects/fam-stack/firebase/` and the `firebase` dependency can go; `npm run check:entries`
and the build say when.

### 2. Live data

A live source is an Observable of `{data, fromCache}` that **errors** when it breaks: it never
goes quiet and never completes. The service around it stays as `TasksService` has it:

```ts
liveTasks().pipe(
  retryLiveStream(error => this.link.reportBroken('tasks', error)),
  takeUntil(this.auth.signingOut$),
  takeUntilDestroyed(this.destroyRef)
).subscribe(({data, fromCache}) => {
  if (!fromCache) this.link.reportAlive('tasks');
  if (fromCache && data.length === 0 && this.snapshot() === null) return;
  this.snapshot.set(shapeTasks(data));
});
```

A shape any server can serve: an event stream that only says *what* changed, and a `GET`
that always carries the data.

```ts
/* The list now and after every "changed" event naming `topic`; errors on a break or 40 s of silence. */
const liveList = (http: HttpClient, url: string, topic: string): Observable<LiveCollection<unknown>> =>
  new Observable<void>(subscriber => {
    const events = new EventSource('/api/stream');
    let silence: ReturnType<typeof setTimeout> | undefined;
    const heard = (): void => {
      clearTimeout(silence);
      silence = setTimeout(() => subscriber.error(new Error('The stream went silent.')), 40_000);
    };
    heard();
    events.addEventListener('open', () => {
      heard();
      subscriber.next();
    });
    events.addEventListener('ping', heard);
    events.addEventListener('changed', event => {
      heard();
      if (event.data === topic) subscriber.next();
    });
    events.addEventListener('error', () => subscriber.error(new Error('The stream broke.')));
    return () => {
      clearTimeout(silence);
      events.close();
    };
  }).pipe(
    switchMap(() => http.get<unknown[]>(url)),
    map(data => ({data: [...asList(data)], fromCache: false})));
```

- Every answer comes from the server, so it is `fromCache: false`. Send an `ETag` with
  `Cache-Control: no-cache`: the browser revalidates, and a `304` reaches the app as the
  body it already had.
- No event stream (PHP-FPM, see below)? Poll the same `GET`:
  `timer(0, 10_000).pipe(switchMap(() => http.get<unknown[]>(url)), …)`.
- `LinkTransport.rebuild()`: build every source over one `Subject` the transport fires
  (`reopen$.pipe(startWith(undefined), switchMap(() => liveList(…)))`), after a `GET` that
  proves the server answers.
- The shell's probe: `link.watch(…)` with one of these sources in place of `linkProbe(query)`.

### 3. Writes

- Create with the client's UUID v7: `PUT /api/tasks/{id}`, so a retried create never duplicates.
- Say the intent (`PATCH {done: true}`), never a toggle.
- An edit made from the copy on screen carries the version it started from (`If-Match`);
  a `412` becomes `TaskConflictError`. That is `mutateDocument`'s job on Firebase.
- Writes need the server: offline they fail, and the "needs a connection" sentence says so.
  The list changes when the server's `changed` event comes back.

### 4. The starter's Firebase files

| File | With your own backend |
| --- | --- |
| `environments/*.ts` | Your API's settings in place of the Firebase config and the emulators. |
| `firebase-openers.d.ts`, the `@ts-expect-error` lines in `app.config.ts` | Delete. |
| `features/tasks/tasks.service.ts` | `HttpClient` and your live source; the signals, the cached-empty rule and the stream pipeline stay. |
| `features/tasks/task-errors.ts`, `shell/login.component.ts` | The same sentences, chosen by status: `0` offline, `401` signed out or wrong password, `403` refused, `404` deleted, `412` changed meanwhile. |
| `shell/layout.component.ts` | `link.watch(…)` with your probe. |
| `firestore.rules`, `firestore.indexes.json`, `.firebaserc` | Your server's checks, below. |
| `firebase.json` | Its `headers` on whatever serves the app, its rewrite as the SPA fallback. |
| `scripts/seed-emulator.mjs`, the reset at the top of `scripts/smoke.mjs` | Your dev server's seed and reset. |
| `emulators`, `seed`, `rules:deploy`, `deploy` in `package.json` | Your own. |

## What your server does

On Firebase, `firestore.rules` does this; on your server, its code does.

- Every route checks the session and denies by default. No catch-all.
- Shape: reject unknown fields; check types and sizes. Limits equal to or looser than the
  app's (`TASK_*` in `task.ts`), so the app refuses in words first.
- Stamp `createdAt`, `updatedAt` and the author from the session and the server's clock;
  ignore the client's.
- Accept a client UUID v7 only with a time within minutes of the server's.
- Identity fields never change; `updatedAt` only moves forward; a stale `If-Match` gets `412`
  and a missing one on an edit `428`.
- Grant delete on purpose. The sign-in history is the owner's own, never shortened, capped
  at `loginHistoryLimit`, prepended in one atomic step.
- Errors as `application/problem+json` (RFC 9457) with an honest status.
- The event stream sends `event: changed` (data: the collection) after every write and
  `event: ping` every 15 s, with `Cache-Control: no-cache, no-transform` and
  `X-Accel-Buffering: no`.

The starter's features, as such an API:

```
POST   /api/auth/login        {email, password} → 200 {uid, email}, sets the session cookie
POST   /api/auth/logout       → 204
GET    /api/session           → 200 {uid, email} | 401
GET    /api/tasks             → 200 [task…], newest first, with ETag
PUT    /api/tasks/{uuidv7}    {title, notes, estimate} → 201, or 200 for the same create again
PATCH  /api/tasks/{id}        {done} → 200; {title, notes, estimate} + If-Match → 200 | 412
DELETE /api/tasks/{id}        → 204 | 404
GET    /api/stream            text/event-stream: "changed" (data: tasks), "ping" every 15 s
GET    /api/me/logins         → 200 [login…], newest first
POST   /api/me/logins         {uuid, time, device, userAgent} → 204, prepended and capped
```

## The principles, on your own backend

| # | |
| --- | --- |
| 1–2 | Firebase's own. |
| 3 | The same buffering hits an event stream: send `no-transform` and `X-Accel-Buffering: no`, and keep polling as the fallback. |
| 4 | A copy kept on the device is `fromCache: true` and decides nothing. |
| 5 | `retryLiveStream` as is. `EventSource` stops for good on an HTTP error and reconnects silently after a network error: close it on any error, so both reach `retryLiveStream`. |
| 6 | A `ping` event every 15 s; silence past 40 s is a break. A `:` comment keeps proxies open but never reaches the app. |
| 7–9 | As written: close streams before `POST /api/auth/logout`; a refused logout is said; a failed session check reads as signed out. |
| 10–11 | `If-Match` and `412`; an intent needs no version. |
| 12 | Your server's checks, above. |
| 13–14 | As written, and needed more: PHP sends decimals as strings (`"12.50"`), Go's `omitempty` drops `false` and `0`, a Java `long` past 2⁵³ loses digits in `JSON.parse`. |
| 15 | A write comes back through the stream, a round trip after Firebase's local echo would have shown it. |
| 16 | As written; client ids make a retried create harmless. |
| 17–26 | Unchanged. |
| 27 | The same headers from your server or proxy; an API under the app's origin keeps `connect-src 'self'`. |

## Notes per stack

- **Sessions.** A same-origin cookie session (`HttpOnly`, `Secure`, `SameSite=Lax`). With
  `provideHttpClient()`, Angular copies the `XSRF-TOKEN` cookie into an `X-XSRF-TOKEN` header
  on same-origin writes: the names Laravel and Spring Security's
  `CookieCsrfTokenRepository.withHttpOnlyFalse()` use. Serve the API under the app's origin
  (a reverse proxy, and `ng serve --proxy-config` in development). Bearer tokens only for an
  API on another origin: `EventSource` cannot send an `Authorization` header.
- **Expiry.** Server sessions expire (PHP's default after 24 idle minutes, Spring Boot's
  after 30); Firebase's do not. On a `401` mid-shift the streams retry and the stale banner
  shows; nothing signs the device out by itself. Decide what yours does.
- **PHP.** PHP-FPM holds a worker for every open event stream: poll, or push through Mercure
  or FrankenPHP.
- **Java / Spring.** `SseEmitter` for the stream, `ProblemDetail` for errors, a JPA `@Version`
  checked against `If-Match`.
- **Go.** `http.Flusher` for the stream, with a `ping` ticker per connection.
