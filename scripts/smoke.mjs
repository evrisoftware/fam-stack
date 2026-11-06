#!/usr/bin/env node
// End-to-end smoke of the starter in headless Chrome, over the DevTools protocol with
// plain Node (no Playwright). Needs the emulators and the dev server running:
//
//   npm run emulators          # terminal 1 (Java required by the Firestore emulator)
//   npm start                  # terminal 2
//   npm run smoke [-- light|dark]
//
// It CLEARS the emulator's Firestore data and seeds the demo user before it starts, so
// it is repeatable — it talks only to 127.0.0.1 and the demo- project. Screenshots land
// in tmp/smoke/. Env: CHROME_PATH (browser binary), BASE_URL (default
// http://localhost:4200). Exits non-zero when a check fails.
import {spawn} from 'node:child_process';
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const OUT = resolve('tmp/smoke');
mkdirSync(OUT, {recursive: true});
const CHROME = process.env.CHROME_PATH ?? [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium'
].find(path => existsSync(path));
if (!CHROME) {
  console.error('No Chrome found. Set CHROME_PATH.');
  process.exit(1);
}
const PORT = 9341;
const BASE = process.env.BASE_URL ?? 'http://localhost:4200';
const SCHEME = process.argv[2];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/* A clean, seeded emulator. */
await fetch('http://127.0.0.1:8080/emulator/v1/projects/demo-fam-stack/databases/(default)/documents', {method: 'DELETE'})
  .catch(() => {
    console.error('The Firestore emulator is not reachable on 127.0.0.1:8080. Run `npm run emulators` first.');
    process.exit(1);
  });
await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({email: 'demo@example.com', password: 'demo-password', returnSecureToken: true})
});

const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${OUT}/profile`, '--no-first-run', '--no-default-browser-check', 'about:blank'], {stdio: 'ignore'});
/* Chrome goes with this process, however it ends; a run that hangs fails after 3 min. */
process.on('exit', () => chrome.kill());
setTimeout(() => {
  console.error('The smoke test timed out.');
  process.exit(1);
}, 180_000).unref();

let version;
for (let i = 0; i < 80 && !version; i++) {
  await sleep(250);
  version = await fetch(`http://127.0.0.1:${PORT}/json/version`).then(r => r.json()).catch(() => undefined);
}
const target = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, {method: 'PUT'}).then(r => r.json());
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve => ws.addEventListener('open', resolve));

let nextId = 0;
const pending = new Map();
const logs = [];
ws.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.id) {
    pending.get(message.id)?.(message);
    pending.delete(message.id);
  } else if (message.method === 'Runtime.consoleAPICalled') {
    logs.push(`${message.params.type}: ${message.params.args.map(a => a.value ?? a.description ?? a.type).join(' ')}`);
  } else if (message.method === 'Runtime.exceptionThrown') {
    logs.push(`EXCEPTION: ${message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text}`);
  } else if (message.method === 'Log.entryAdded') {
    logs.push(`log.${message.params.entry.level}: ${message.params.entry.text}`);
  }
});
const send = (method, params = {}) => new Promise(resolve => {
  const id = ++nextId;
  pending.set(id, resolve);
  ws.send(JSON.stringify({id, method, params}));
});
const evaluate = async expression => {
  const reply = await send('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
  if (reply.result?.exceptionDetails) return `EVAL ERROR: ${reply.result.exceptionDetails.exception?.description}`;
  return reply.result?.result?.value;
};
const waitFor = async (expression, timeout = 15000) => {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await evaluate(`!!(${expression})`) === true) return true;
    await sleep(200);
  }
  return false;
};
const shot = async name => {
  const reply = await send('Page.captureScreenshot', {format: 'png'});
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(reply.result.data, 'base64'));
};
const type = async (selector, text) => {
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
  await send('Input.insertText', {text});
};
const results = [];
const check = (name, ok, detail = '') => {
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};

await send('Runtime.enable');
await send('Log.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', {width: 412, height: 860, deviceScaleFactor: 2, mobile: true});
if (SCHEME) await send('Emulation.setEmulatedMedia', {features: [{name: 'prefers-color-scheme', value: SCHEME}]});

// 1. A signed-out device asking for the root lands on the sign-in form.
await send('Page.navigate', {url: `${BASE}/`});
check('root redirects a signed-out device to /login',
  await waitFor(`location.pathname === '/login' && document.querySelector('input[name=email]')`));
check('login tab title', (await evaluate('document.title')) === 'Sign in · Starter', await evaluate('document.title'));
await sleep(600);
await shot('01-login');

// 2. Wrong password says so.
await type('input[name=email]', 'demo@example.com');
await type('input[name=password]', 'wrong-password');
await sleep(800);
await evaluate(`document.querySelector('app-login button[type=submit]').click()`);
check('wrong password is reported as such',
  await waitFor(`document.querySelector('.login__error')?.textContent.includes('Wrong email or password')`));

// 3. Sign in.
await evaluate(`(() => { const i = document.querySelector('input[name=password]'); i.select(); })()`);
await send('Input.insertText', {text: 'demo-password'});
await sleep(800);
await evaluate(`document.querySelector('app-login button[type=submit]').click()`);
check('sign-in lands on /app/home', await waitFor(`location.pathname === '/app/home'`));
check('home shows its <h1>', await waitFor(`document.querySelector('h1.shell__title')?.textContent.trim() === 'Home'`));
check('home stats rendered', await waitFor(`document.querySelectorAll('.stat').length === 3`));
await sleep(800);
await shot('02-home');

// 4. Tasks: empty state.
await evaluate(`[...document.querySelectorAll('.bottom-nav__item')].find(a => a.textContent.includes('Tasks')).click()`);
check('nav goes to /app/tasks', await waitFor(`location.pathname === '/app/tasks'`));
check('tasks heading is said (visually hidden)',
  await waitFor(`document.querySelector('h1.fam-visually-hidden')?.textContent.trim() === 'Tasks'`));
check('empty state shown', await waitFor(`document.querySelector('.fam-empty__title')?.textContent.includes('No tasks yet')`));
check('nav marks Tasks current', (await evaluate(`document.querySelector('.bottom-nav__item[aria-current=page]')?.textContent.trim()`)) === 'checklistTasks',
  await evaluate(`document.querySelector('.bottom-nav__item[aria-current=page]')?.textContent.trim()`));
await sleep(900);
await shot('03-tasks-empty');

// 5. Add a task through the sheet, typing a stray letter into the number field.
await evaluate(`document.querySelector('.fam-floating button').click()`);
check('editor sheet opens', await waitFor(`document.querySelector('app-task-dialog input[name=title]')`));
await sleep(500);
await type('app-task-dialog input[name=title]', 'Buy more syrup');
await type('app-task-dialog input[name=estimate]', '4a5');
await sleep(700);
check('number field shapes "4a5" to "45"',
  (await evaluate(`document.querySelector('app-task-dialog input[name=estimate]').value`)) === '45',
  await evaluate(`document.querySelector('app-task-dialog input[name=estimate]').value`));
await shot('04-editor');
await evaluate(`document.querySelector('app-task-dialog button[type=submit]').click()`);
check('the task appears in the list', await waitFor(`document.querySelectorAll('.task').length === 1`));
check('"Task added." notice', await waitFor(`document.querySelector('.notice-pill')?.textContent.includes('Task added.')`));
check('estimate chip reads 45 min', await waitFor(`document.querySelector('.task .fam-chip')?.textContent.includes('45 min')`));
await sleep(600);
await shot('05-task-added');

// 6. Mark it done (a transaction against the live document).
await evaluate(`document.querySelector('.task mat-checkbox input').click()`);
check('task moves to Done', await waitFor(`document.querySelector('.task--done')`));
check('"Marked as done." notice', await waitFor(`document.querySelector('.notice-pill')?.textContent.includes('Marked as done.')`));
await sleep(600);
await shot('06-task-done');

// 7. The back gesture closes a dialog instead of leaving the page.
await evaluate(`document.querySelector('.task .fam-tonal').click()`);
check('edit sheet opens', await waitFor(`document.querySelector('app-task-dialog')`));
await sleep(500);
await evaluate('history.back()');
check('back closes the dialog', await waitFor(`!document.querySelector('app-task-dialog')`));
await sleep(400);
check('…and stays on /app/tasks', (await evaluate('location.pathname')) === '/app/tasks', await evaluate('location.pathname'));

// 8. A stray URL under the shell stays inside it; one outside it is the 404.
await send('Page.navigate', {url: `${BASE}/app/no-such-screen`});
check('stray /app URL lands home', await waitFor(`location.pathname === '/app/home'`));
await send('Page.navigate', {url: `${BASE}/no-such-page`});
check('unknown URL shows the 404', await waitFor(`document.querySelector('app-not-found h1')?.textContent.includes('Page not found')`));
check('404 tab title', (await evaluate('document.title')) === 'Page not found · Starter', await evaluate('document.title'));

// 9. Security sheet lists this sign-in.
await send('Page.navigate', {url: `${BASE}/app/home`});
await waitFor(`location.pathname === '/app/home' && document.querySelector('.toolbar__button')`);
await sleep(600);
await evaluate(`document.querySelector('.toolbar__button').click()`);
await waitFor(`document.querySelector('.account-menu')`);
await sleep(300);
await evaluate(`[...document.querySelectorAll('.account-menu button')].find(b => b.textContent.includes('Session')).click()`);
check('security sheet lists a sign-in', await waitFor(`document.querySelectorAll('.security__login').length >= 1`));
check('this device is tagged', await waitFor(`[...document.querySelectorAll('.security__login .fam-chip')].some(c => c.textContent.includes('This device'))`));
await sleep(500);
await shot('07-security');
await evaluate('history.back()');
await waitFor(`!document.querySelector('app-security-dialog')`);

// 10. Sign out through the confirmation.
await sleep(400);
await evaluate(`document.querySelector('.toolbar__button').click()`);
await waitFor(`document.querySelector('.account-menu')`);
await sleep(300);
await evaluate(`[...document.querySelectorAll('.account-menu button')].find(b => b.textContent.includes('Sign out')).click()`);
check('sign-out asks first', await waitFor(`document.querySelector('fam-confirm-dialog')`));
await sleep(400);
await evaluate(`[...document.querySelectorAll('fam-confirm-dialog button')].find(b => b.textContent.includes('Yes, sign out')).click()`);
check('sign-out ends on /login', await waitFor(`location.pathname === '/login'`));
await sleep(1500);

const uncaught = logs.filter(line => line.startsWith('EXCEPTION'));
check('no uncaught exception in the page', uncaught.length === 0, `${uncaught.length} thrown`);

console.log(results.join('\n'));
console.log('\n--- console (errors and warnings) ---');
console.log(logs.filter(line => /error|warn|EXCEPTION/i.test(line)).join('\n') || '(none)');
ws.close();
process.exit(results.some(line => line.startsWith('FAIL')) ? 1 : 0);
