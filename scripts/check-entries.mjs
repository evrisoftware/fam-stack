#!/usr/bin/env node
// Checks the layer's imports: each entry point imports only the entries below it (the map
// mirrors CLAUDE.md), and only fam-stack/firebase and the primary entry import the Firebase
// SDK. Exits non-zero on a violation or on an entry folder missing from the map.
import {readdirSync, readFileSync} from 'node:fs';
import {join, relative} from 'node:path';

const LAYER = 'projects/fam-stack';
/* Each entry folder and the entries it may import; `src` is the primary `fam-stack`. */
const ALLOWED = {
  core: [],
  a11y: [],
  backend: ['core'],
  ui: ['core'],
  firebase: ['core', 'backend'],
  auth: ['core', 'backend', 'ui'],
  shell: ['core', 'a11y', 'backend', 'ui', 'auth'],
  src: ['core', 'a11y', 'backend', 'ui', 'firebase', 'auth', 'shell']
};
/* Folders that hold no TypeScript entry. */
const NOT_ENTRIES = new Set(['styles']);
/* The entries that may import the Firebase SDK: the adapter, and the primary entry that opens it. */
const SDK_ENTRIES = new Set(['firebase', 'src']);
const FIREBASE_SDK = /^@?firebase(\/|$)/;
const SPECIFIER = /\bfrom\s*['"]([^'"]+)['"]|\bimport\s*\(?\s*['"]([^'"]+)['"]/g;

const tsFiles = dir => readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
  const path = join(dir, entry.name);
  if (entry.isDirectory()) return tsFiles(path);
  return entry.name.endsWith('.ts') ? [path] : [];
});

/* The source without comments, so example code in a comment is not read as an import. */
const withoutComments = source => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/* The entry a `fam-stack` specifier names, or null for anything else. */
const entryOf = specifier => {
  if (specifier === 'fam-stack') return 'src';
  return specifier.startsWith('fam-stack/') ? specifier.slice('fam-stack/'.length).split('/')[0] : null;
};

const problems = [];
const folders = readdirSync(LAYER, {withFileTypes: true})
  .filter(entry => entry.isDirectory() && !NOT_ENTRIES.has(entry.name))
  .map(entry => entry.name);

for (const folder of folders) {
  const allowed = ALLOWED[folder];
  if (!allowed) {
    problems.push(`${LAYER}/${folder}/ is not in the direction map: add it to scripts/check-entries.mjs and CLAUDE.md.`);
    continue;
  }
  for (const file of tsFiles(join(LAYER, folder))) {
    const isSpec = file.endsWith('.spec.ts');
    const where = relative('.', file).replaceAll('\\', '/');
    for (const match of withoutComments(readFileSync(file, 'utf8')).matchAll(SPECIFIER)) {
      const specifier = match[1] ?? match[2];
      if (FIREBASE_SDK.test(specifier) && !SDK_ENTRIES.has(folder)) {
        problems.push(`${where} imports ${specifier}: only fam-stack/firebase and fam-stack import the Firebase SDK.`);
        continue;
      }
      const target = entryOf(specifier);
      if (target === null) continue;
      /* A spec imports its own entry by package name, as the app does. */
      if (target === folder && isSpec) continue;
      if (target === folder) {
        problems.push(`${where} imports its own entry as ${specifier}: use a relative import.`);
      } else if (!allowed.includes(target)) {
        const may = allowed.length > 0 ? allowed.join(', ') : 'no other entry';
        problems.push(`${where} imports ${specifier}: ${folder === 'src' ? 'fam-stack' : folder} may import ${may}.`);
      }
    }
  }
}

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`Entry points: ${folders.length} entries, imports follow the direction.`);
