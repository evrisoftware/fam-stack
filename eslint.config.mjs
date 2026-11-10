// Lints the layer and the starter: TypeScript, Angular classes, and templates (inline ones too).
import angular from 'angular-eslint';
import tseslint from 'typescript-eslint';

/* Selector prefixes: `fam` in the layer, `app` in the starter. */
const selectors = prefix => ({
  '@angular-eslint/component-selector': ['error', {type: 'element', prefix, style: 'kebab-case'}],
  '@angular-eslint/directive-selector': ['error', {type: 'attribute', prefix, style: 'camelCase'}]
});

/* Wrappers over the Firebase SDK, and Angular's private `ɵ` exports. */
const BARRED_PATTERNS = [
  {group: ['@angular/fire', '@angular/fire/*', 'rxfire', 'rxfire/*'], message: 'Use the plain Firebase SDK.'},
  {group: ['@angular/*', '@angular/*/*'], importNamePattern: '^ɵ', message: 'Public Angular API only.'}
];

/* The SDK's openers, which only `provideFirebase` calls. A type-only import passes. */
const OPENERS = 'Inject `Firestore` or `FIREBASE_AUTH`; only `provideFirebase` opens Firebase.';
const BARRED_OPENERS = [
  {name: 'firebase/app', importNames: ['initializeApp'], message: OPENERS, allowTypeImports: true},
  {name: 'firebase/auth', importNames: ['getAuth', 'initializeAuth'], message: OPENERS, allowTypeImports: true},
  {name: 'firebase/firestore', importNames: ['getFirestore', 'initializeFirestore'], message: OPENERS, allowTypeImports: true}
];

export default tseslint.config(
  {
    files: ['projects/**/*.ts'],
    extends: [...tseslint.configs.recommended, ...angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      '@angular-eslint/prefer-signals': 'error',
      '@angular-eslint/prefer-output-emitter-ref': 'error',
      '@angular-eslint/prefer-host-metadata-property': 'error',
      '@typescript-eslint/no-restricted-imports': ['error', {paths: BARRED_OPENERS, patterns: BARRED_PATTERNS}]
    }
  },
  {files: ['projects/fam-stack/**/*.ts'], rules: selectors('fam')},
  {files: ['projects/starter/**/*.ts'], rules: selectors('app')},
  {
    /* The one file that opens Firebase. */
    files: ['projects/fam-stack/firebase/provide-firebase.ts'],
    rules: {'@typescript-eslint/no-restricted-imports': ['error', {patterns: BARRED_PATTERNS}]}
  },
  {
    /* Its label and role inputs are aliased to read as one family in a template. */
    files: ['projects/fam-stack/a11y/scroll-region.directive.ts'],
    rules: {'@angular-eslint/no-input-rename': ['error', {allowedNames: ['scrollRegionLabel', 'scrollRegionRole']}]}
  },
  {
    /* Attaches to Material's own trigger attribute. */
    files: ['projects/fam-stack/ui/menu-back-gesture.directive.ts'],
    rules: {'@angular-eslint/directive-selector': 'off'}
  },
  {
    /* The `...StaysBarred` types exist only for their `@ts-expect-error`. */
    files: ['projects/starter/src/app/app.config.ts'],
    rules: {'@typescript-eslint/no-unused-vars': ['error', {varsIgnorePattern: 'StaysBarred$'}]}
  },
  {
    /* Its empty interfaces are types without a call signature. */
    files: ['projects/starter/src/firebase-openers.d.ts'],
    rules: {'@typescript-eslint/no-empty-object-type': ['error', {allowInterfaces: 'always'}]}
  },
  {
    files: ['projects/**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {
      '@angular-eslint/template/prefer-control-flow': 'error',
      '@angular-eslint/template/button-has-type': 'error',
      /* A literal `style=""` and `ngStyle` are refused; any `[style.x]` binding passes. */
      '@angular-eslint/template/no-inline-styles': ['error', {allowBindToStyle: true}]
    }
  }
);
