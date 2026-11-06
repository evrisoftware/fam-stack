import {InjectionToken} from '@angular/core';

/**
 * Every sentence the library itself puts on a screen. Apps pick a locale with
 * `provideFamStack({text: FAM_TEXT_ES})`, or spread one and override what they need.
 * Words passed in by the caller (a load status, a dialog title) never come from here.
 */
export interface FamText {
  /** Snackbar raised by `GlobalErrorHandler` for an error nothing else caught. */
  readonly unexpectedError: string;
  /** `AuthService.logout` could not revoke the session: the device is still signed in. */
  readonly signOutFailed: string;
  /** Accessible name of the bottom navigation. */
  readonly navigation: string;
  readonly link: {
    /** The banner shown while the screens may not be current. */
    readonly stale: string;
    readonly reconnect: string;
    readonly reconnecting: string;
    /** Tooltip of the reconnect controls. */
    readonly reconnectHint: string;
    readonly reconnected: string;
    readonly reconnectFailed: string;
  };
  readonly textScale: {
    readonly group: string;
    readonly grow: string;
    readonly shrink: string;
    /** Names of the three sizes, smallest first. */
    readonly steps: readonly [string, string, string];
    /** What a screen reader hears after a change, given the step's name. */
    readonly announce: (step: string) => string;
  };
  readonly dialog: {
    readonly confirm: string;
    readonly cancel: string;
    readonly delete: string;
  };
}

export const FAM_TEXT_EN: FamText = {
  unexpectedError: 'Something went wrong. Please try again.',
  signOutFailed: 'Could not sign out: this device is still signed in.',
  navigation: 'Main navigation',
  link: {
    stale: 'No connection to the server: what you see may be out of date',
    reconnect: 'Reconnect',
    reconnecting: 'Connecting…',
    reconnectHint: 'Reconnect to the server',
    reconnected: 'Connection to the server restored.',
    reconnectFailed: 'Could not reconnect to the server.'
  },
  textScale: {
    group: 'Text size',
    grow: 'Larger text',
    shrink: 'Smaller text',
    steps: ['Small', 'Normal', 'Large'],
    announce: step => `Text size: ${step}`
  },
  dialog: {
    confirm: 'Yes',
    cancel: 'No',
    delete: 'Yes, delete'
  }
};

export const FAM_TEXT_ES: FamText = {
  unexpectedError: 'Ocurrió un error inesperado. Intenta de nuevo.',
  signOutFailed: 'No se pudo cerrar la sesión: este dispositivo sigue conectado.',
  navigation: 'Navegación principal',
  link: {
    stale: 'Sin conexión con el servidor: lo que ves puede no estar al día',
    reconnect: 'Volver a conectar',
    reconnecting: 'Conectando…',
    reconnectHint: 'Volver a conectar con el servidor',
    reconnected: 'Conexión con el servidor restablecida.',
    reconnectFailed: 'No se pudo volver a conectar con el servidor.'
  },
  textScale: {
    group: 'Tamaño del texto',
    grow: 'Agrandar el texto',
    shrink: 'Reducir el texto',
    steps: ['Pequeño', 'Normal', 'Grande'],
    announce: step => `Tamaño del texto: ${step}`
  },
  dialog: {
    confirm: 'Sí',
    cancel: 'No',
    delete: 'Sí, eliminar'
  }
};

/** The active locale. Root-provided with English until `provideFamStack` says otherwise. */
export const FAM_TEXT = new InjectionToken<FamText>('FAM_TEXT', {
  providedIn: 'root',
  factory: () => FAM_TEXT_EN
});
