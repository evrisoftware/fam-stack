#!/usr/bin/env node
// Creates the demo account in the local Auth emulator (`npm run emulators` first), so the
// starter has someone to sign in as. Talks only to 127.0.0.1; never to a real project.
//
//   node scripts/seed-emulator.mjs [email] [password]

const AUTH_EMULATOR = 'http://127.0.0.1:9099';
const API_KEY = 'demo-api-key';
const email = process.argv[2] ?? 'demo@example.com';
const password = process.argv[3] ?? 'demo-password';

const response = await fetch(
  `${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
  {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email, password, returnSecureToken: true})
  }
).catch(error => {
  console.error(`The Auth emulator is not reachable at ${AUTH_EMULATOR}. Run \`npm run emulators\` first.`);
  console.error(error.message);
  process.exit(1);
});

const body = await response.json();
if (response.ok) {
  console.log(`Created ${email} / ${password} in the Auth emulator.`);
} else if (body?.error?.message === 'EMAIL_EXISTS') {
  console.log(`${email} already exists in the Auth emulator.`);
} else {
  console.error('The Auth emulator refused the account:', body?.error?.message ?? response.status);
  process.exit(1);
}
