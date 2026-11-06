import {EnvironmentProviders, ErrorHandler, inject, makeEnvironmentProviders, provideAppInitializer} from '@angular/core';
import {MAT_DIALOG_DEFAULT_OPTIONS, MatDialogConfig} from '@angular/material/dialog';
import {MAT_FORM_FIELD_DEFAULT_OPTIONS, MatFormFieldDefaultOptions} from '@angular/material/form-field';
import {MAT_SNACK_BAR_DEFAULT_OPTIONS, MatSnackBarConfig} from '@angular/material/snack-bar';
import {FirebaseOptions} from 'firebase/app';
import {FAM_TEXT, FAM_TEXT_EN, FamText} from 'fam-stack/core';
import {provideFirebase, ProvideFirebaseOptions} from 'fam-stack/firebase';
import {DEFAULT_AUTH_CONFIG, FAM_AUTH_CONFIG, FamAuthConfig} from 'fam-stack/auth';
import {DialogHistoryService, GlobalErrorHandler, TextScaleService} from 'fam-stack/ui';

export interface FamStackOptions {
  /** The Firebase web config of the project this build talks to. */
  readonly firebase: FirebaseOptions;
  /** Firestore settings and emulators (`fam-stack/firebase`). */
  readonly firebaseOptions?: ProvideFirebaseOptions;
  /** The library's own words. Default `FAM_TEXT_EN`; `FAM_TEXT_ES` ships too. */
  readonly text?: FamText;
  /** Where sign-in lives and how sign-ins are recorded. */
  readonly auth?: Partial<FamAuthConfig>;
}

/**
 * The stack in one call: Firebase, `FAM_TEXT`, the auth config, `GlobalErrorHandler`,
 * dialogs that never close on navigation, outline form fields, snackbars at the top,
 * and `DialogHistoryService` and `TextScaleService` started at bootstrap.
 *
 * The app adds `provideZonelessChangeDetection()`, `provideBrowserGlobalErrorListeners()`
 * and its router.
 */
export const provideFamStack = (options: FamStackOptions): EnvironmentProviders =>
  makeEnvironmentProviders([
    provideFirebase(options.firebase, options.firebaseOptions),
    {provide: FAM_TEXT, useValue: options.text ?? FAM_TEXT_EN},
    {provide: FAM_AUTH_CONFIG, useValue: {...DEFAULT_AUTH_CONFIG, ...options.auth} satisfies FamAuthConfig},
    {provide: ErrorHandler, useClass: GlobalErrorHandler},
    /* A full config: `MatDialog` uses this object instead of its defaults, not merged with them. */
    {provide: MAT_DIALOG_DEFAULT_OPTIONS, useValue: {...new MatDialogConfig(), closeOnNavigation: false}},
    {provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: {appearance: 'outline'} satisfies MatFormFieldDefaultOptions},
    {provide: MAT_SNACK_BAR_DEFAULT_OPTIONS, useValue: {...new MatSnackBarConfig(), verticalPosition: 'top'} satisfies MatSnackBarConfig},
    provideAppInitializer(() => void inject(DialogHistoryService)),
    provideAppInitializer(() => void inject(TextScaleService))
  ]);
