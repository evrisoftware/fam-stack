# fam-stack

Firebase + Angular + Material as one stack: the plain Firebase SDK provided to Angular, live
Firestore streams that never silently die, fail-closed auth guards, and the Material UX layer
that goes with them. Zoneless, signals, standalone.

This folder is part of your copy of the fam-stack template, not an installed package. The
app imports it as `fam-stack/*` through tsconfig `paths` and compiles it from source; change
it in place. `npm run build:lib` builds it as a library, which fails on a cycle between entry
points or a relative import across them; `npm run check:entries` checks the full direction
(`core`, `a11y` at the bottom, then `backend` and `ui`, `firebase`, `auth`, `shell`,
`fam-stack`) and keeps the Firebase SDK in `fam-stack/firebase` and the primary entry.
`auth` and `shell` read the backend through `fam-stack/backend`'s contracts, which
`provideFirebase` provides.

It needs Angular ≥ 22, Angular Material/CDK ≥ 22, Firebase ≥ 12 and RxJS 7.8, and uses
public API only, so `ng update` moves it along with the app.

## Setup

```ts
import {provideFamStack} from 'fam-stack';
import {famViewTransitions} from 'fam-stack/shell';
import {FAM_TEXT_ES} from 'fam-stack/core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withViewTransitions(famViewTransitions())),
    provideFamStack({
      firebase: environment.firebase,
      firebaseOptions: {emulators: environment.emulators},  // optional, development only
      auth: {loginUrl: '/login'},
      text: FAM_TEXT_ES                                     // optional, English by default
    })
  ]
};
```

```scss
@use '@angular/material' as mat;
@use 'fam-stack/styles' as fam;

html {
  color-scheme: light dark;
  @include mat.theme((color: (primary: mat.$cyan-palette), typography: Roboto, density: 0));
}
@include fam.fonts('/fonts');   // self-hosted roboto.woff2 + material-icons.woff2
@include fam.global();
```

Never call `getAuth()` or `getFirestore()`: inject `FIREBASE_AUTH` and `Firestore`. (The
starter shows a `.d.ts` that makes both a compile error.)

## A live collection

```ts
@Injectable()   // provided by your signed-in shell, not in root
export class ItemsService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);
  private readonly link = inject(LinkService);   // fam-stack/backend
  private readonly destroyRef = inject(DestroyRef);
  readonly query = query(collection(this.firestore, 'items'), orderBy('createdAt', 'desc'));
  private readonly snapshot = signal<readonly Item[] | null>(null);
  readonly items = computed(() => this.snapshot() ?? []);

  load(): void {   // after auth.loadUser()
    collectionData<unknown>(this.query, {idField: 'id'}).pipe(
      retryLiveStream(error => this.link.reportBroken('items', error)),
      takeUntil(this.auth.signingOut$),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(({data, fromCache}) => {
      if (!fromCache) this.link.reportAlive('items');
      if (fromCache && data.length === 0 && this.snapshot() === null) return;
      this.snapshot.set(shapeItems(data));   // through asText / asCount / asAmount…
    });
  }

  rename(item: Item, name: string): Promise<boolean> {
    return mutateDocument<ItemDocument>(this.firestore, doc(this.firestore, 'items', item.id), current =>
      current.name === name ? current : {...current, name, updatedAt: Date.now()});
  }
}
```

## Entry points

- **`fam-stack`** — `provideFamStack(options)`.
- **`fam-stack/core`** — `FAM_TEXT`, `FAM_TEXT_EN`, `FAM_TEXT_ES`; `asList`, `asCount`,
  `asAmount`, `asText`, `asFlag`; `uuidv7`, `uuidv7Time`, `isUuidv7`; `readLocal`,
  `writeLocal`, `removeLocal`, `readLocalJson`; `clockSignal`; `isStandalone`.
- **`fam-stack/backend`** — `FamSession`, `FamUser`, `LinkTransport`, `LoginHistoryStore`
  (what `auth` and `shell` read; `provideFirebase` provides them); `LiveSnapshot`,
  `LiveDocument`, `LiveCollection`; `retryLiveStream`, `STREAM_RETRY_CAP_MS`;
  `redirectUnauthorizedTo`, `redirectLoggedInTo`, `GuardTarget`; `LinkService`, `ReviveOutcome`.
- **`fam-stack/firebase`** — `provideFirebase`, `FIREBASE_AUTH`, `DEFAULT_FIRESTORE_SETTINGS`;
  `docData`, `collectionData`, `linkProbe`; `authUser`; `mutateDocument`, `withoutUndefined`,
  `MissingDocumentError`, `DocumentTooLargeError`; `firebaseErrorCode`, `isPermissionDenied`;
  `firebaseSession`, `firestoreLinkTransport`, `firestoreLoginHistory`.
- **`fam-stack/auth`** — `AuthService`, `LoginHistoryService`, `FAM_AUTH_CONFIG`,
  `shapeLoginRecord`, `shapeLoginRecords`, `describeDevice`, `deviceIcon`.
- **`fam-stack/ui`** — `NotificationService`, `DialogHistoryService`, `BackGestureHandler`,
  `MenuBackGestureDirective`, `SHEET_DIALOG_CONFIG`, `FULL_SCREEN_DIALOG_CONFIG`,
  `DIALOG_RESULT`, `ConfirmDialogComponent`, `askConfirmation`, `GlobalErrorHandler`,
  `TextScaleService`, `TextScaleComponent`, `NumberFormatDirective`, `shapeNumberText`,
  `parseNumberField`, `EmailNamePipe`, `emailName`.
- **`fam-stack/a11y`** — `LiveRegionDirective`, `LiveNoteComponent`, `LoadStatusComponent`,
  `ScrollRegionDirective`.
- **`fam-stack/shell`** — `defineScreens`, `injectCurrentScreen`, `BottomNavComponent`,
  `LinkBannerComponent`, `ReconnectService`, `famViewTransitions`, `QUIET_NAVIGATION`.
- **`fam-stack/styles`** (Sass) — `global()`, `fonts($base)`, `focus-ring`,
  `centred-column`, `visually-hidden`, `page-bar` / `page-body` / `page-actions`.

Every rule these encode, and the failure behind it: [docs/principles.md](../../docs/principles.md).

MIT licensed.
