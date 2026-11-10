#!/usr/bin/env node
// Checks `firestore.rules` against the local Firestore emulator (`npm run emulators` first),
// under its own project id so the starter's emulator data is left alone.
//
//   node --test scripts/firestore-rules.test.mjs

import {readFileSync} from 'node:fs';
import {after, before, beforeEach, describe, test} from 'node:test';
import {assertFails, assertSucceeds, initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {setLogLevel} from 'firebase/firestore';

const PROJECT_ID = 'demo-fam-stack-rules';
const RULES_FILE = new URL('../firestore.rules', import.meta.url);
const ADDRESS = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
const host = ADDRESS.slice(0, ADDRESS.lastIndexOf(':'));
const port = ADDRESS.slice(ADDRESS.lastIndexOf(':') + 1);

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

const ANA = {uid: 'ana', email: 'ana@example.com'};
const BEN = {uid: 'ben', email: 'ben@example.com'};

const TASK_ID = '0192f3a1-7c4e-7b2a-9d3f-1a2b3c4d5e6f';
const OTHER_TASK_ID = '0192f3a1-7c4e-7b2a-9d3f-1a2b3c4d5e70';
const UUID_V4 = '0192f3a1-7c4e-4b2a-9d3f-1a2b3c4d5e6f';

let env;

before(async () => {
  setLogLevel('error');
  try {
    env = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {rules: readFileSync(RULES_FILE, 'utf8'), host, port: Number(port)}
    });
  } catch (error) {
    console.error(`firestore.rules did not load into the Firestore emulator at ${host}:${port}.`);
    console.error('Either it is not running (`npm run emulators`) or it refused the rules.');
    throw error;
  }
});

beforeEach(() => env.clearFirestore());

after(() => env?.cleanup());

const as = user => env.authenticatedContext(user.uid, {email: user.email}).firestore();
const anonymous = () => env.unauthenticatedContext().firestore();

/** Stores documents with the rules off, as `{path: data}`. */
const seed = documents => env.withSecurityRulesDisabled(async context => {
  const db = context.firestore();
  await Promise.all(Object.entries(documents).map(([path, data]) => db.doc(path).set(data)));
});

/** A task `user` could create now, with `changes` laid over it. */
const task = (user, changes = {}) => {
  const now = Date.now();
  return {
    title: 'Buy bread',
    notes: '',
    estimate: null,
    done: false,
    createdAt: now,
    createdBy: {...user},
    updatedAt: now,
    updatedBy: {...user},
    ...changes
  };
};

/** `task` without one of its keys. */
const taskWithout = (user, key) => {
  const {[key]: _, ...rest} = task(user);
  return rest;
};

describe('tasks', () => {
  const create = (user, data, id = TASK_ID) => as(user).doc(`tasks/${id}`).set(data);

  describe('read', () => {
    beforeEach(() => seed({[`tasks/${TASK_ID}`]: task(ANA)}));

    test('a signed-in account gets one and lists all', async () => {
      await assertSucceeds(as(BEN).doc(`tasks/${TASK_ID}`).get());
      await assertSucceeds(as(BEN).collection('tasks').get());
    });

    test('nobody signed out reads', async () => {
      await assertFails(anonymous().doc(`tasks/${TASK_ID}`).get());
      await assertFails(anonymous().collection('tasks').get());
    });
  });

  // Refusals come before the accepted write: after it, a write to the same id is an update.
  describe('create', () => {
    test('a complete task stamped by its writer is stored', async () => {
      await assertSucceeds(create(ANA, task(ANA)));
    });

    test('signed out is refused', async () => {
      await assertFails(anonymous().doc(`tasks/${TASK_ID}`).set(task(ANA)));
    });

    test('the id is a UUID v7', async () => {
      await assertFails(create(ANA, task(ANA), UUID_V4));
      await assertFails(create(ANA, task(ANA), 'buy-bread'));
      await assertFails(create(ANA, task(ANA), TASK_ID.toUpperCase()));
      await assertFails(create(ANA, task(ANA), TASK_ID.replace('-9d3f-', '-cd3f-')));
    });

    test('every field is present and no other', async () => {
      for (const key of Object.keys(task(ANA))) {
        await assertFails(create(ANA, taskWithout(ANA, key)));
      }
      await assertFails(create(ANA, task(ANA, {owner: 'ana'})));
    });

    test('the title is 1 to 200 characters of text', async () => {
      await assertFails(create(ANA, task(ANA, {title: 'x'.repeat(201)})));
      await assertFails(create(ANA, task(ANA, {title: ''})));
      await assertFails(create(ANA, task(ANA, {title: 7})));
      await assertSucceeds(create(ANA, task(ANA, {title: 'x'.repeat(200)})));
    });

    test('the notes are at most 1000 characters of text', async () => {
      await assertFails(create(ANA, task(ANA, {notes: 'x'.repeat(1001)})));
      await assertFails(create(ANA, task(ANA, {notes: null})));
      await assertSucceeds(create(ANA, task(ANA, {notes: 'x'.repeat(1000)})));
    });

    test('the estimate is null or a whole number from 0 to 9999', async () => {
      await assertFails(create(ANA, task(ANA, {estimate: 10000})));
      await assertFails(create(ANA, task(ANA, {estimate: -1})));
      await assertFails(create(ANA, task(ANA, {estimate: 1.5})));
      await assertFails(create(ANA, task(ANA, {estimate: '30'})));
      await assertSucceeds(create(ANA, task(ANA, {estimate: 0})));
      await assertSucceeds(create(ANA, task(ANA, {estimate: 9999}), OTHER_TASK_ID));
    });

    test('done is a boolean', async () => {
      await assertFails(create(ANA, task(ANA, {done: 'yes'})));
      await assertFails(create(ANA, task(ANA, {done: null})));
      await assertSucceeds(create(ANA, task(ANA, {done: true})));
    });

    test('both stamps name the writing account', async () => {
      await assertFails(create(ANA, task(ANA, {createdBy: {...BEN}})));
      await assertFails(create(ANA, task(ANA, {updatedBy: {...BEN}})));
      await assertFails(create(ANA, task(ANA, {createdBy: 'ana'})));
    });

    test('a stamp is exactly a uid and a text email', async () => {
      await assertFails(create(ANA, task(ANA, {createdBy: {...ANA, admin: true}})));
      await assertFails(create(ANA, task(ANA, {updatedBy: {uid: ANA.uid}})));
      await assertFails(create(ANA, task(ANA, {createdBy: {email: ANA.email}})));
      await assertFails(create(ANA, task(ANA, {updatedBy: {uid: ANA.uid, email: null}})));
    });

    test('createdAt is whole milliseconds within 5 minutes ahead and 7 days behind', async () => {
      const at = ms => task(ANA, {createdAt: ms, updatedAt: ms});
      const now = Date.now();
      await assertFails(create(ANA, at(now + 6 * MINUTE)));
      await assertFails(create(ANA, at(now - 7 * DAY - MINUTE)));
      await assertFails(create(ANA, at(now + 0.5)));
      await assertFails(create(ANA, at(new Date(now))));
      await assertSucceeds(create(ANA, at(now + 4 * MINUTE)));
      await assertSucceeds(create(ANA, at(now - 7 * DAY + MINUTE), OTHER_TASK_ID));
    });

    test('updatedAt equals createdAt', async () => {
      const now = Date.now();
      await assertFails(create(ANA, task(ANA, {createdAt: now, updatedAt: now + 1})));
    });
  });

  describe('update', () => {
    const createdAt = Date.now() - DAY;
    const stored = task(ANA, {createdAt, updatedAt: createdAt});
    const update = (user, changes) => as(user).doc(`tasks/${TASK_ID}`)
      .set({...stored, updatedAt: Date.now(), updatedBy: {...user}, ...changes});

    beforeEach(() => seed({[`tasks/${TASK_ID}`]: stored}));

    test('any signed-in account edits, stamping itself and a later time', async () => {
      await assertSucceeds(update(BEN, {title: 'Buy two loaves', done: true, estimate: 15}));
    });

    test('signed out is refused', async () => {
      await assertFails(anonymous().doc(`tasks/${TASK_ID}`)
        .set({...stored, updatedAt: Date.now(), updatedBy: {...BEN}}));
    });

    test('createdAt and createdBy never change', async () => {
      await assertFails(update(BEN, {createdAt: createdAt + 1}));
      await assertFails(update(BEN, {createdBy: {...BEN}}));
    });

    test('updatedBy names the writing account', async () => {
      await assertFails(update(BEN, {updatedBy: {...ANA}}));
    });

    test('updatedAt strictly increases', async () => {
      await assertFails(update(BEN, {updatedAt: createdAt}));
      await assertFails(update(BEN, {updatedAt: createdAt - 1}));
    });

    test('updatedAt is whole milliseconds at most 5 minutes ahead', async () => {
      await assertFails(update(BEN, {updatedAt: Date.now() + 6 * MINUTE}));
      await assertFails(update(BEN, {updatedAt: Date.now() + 0.5}));
      await assertSucceeds(update(BEN, {updatedAt: Date.now() + 4 * MINUTE}));
    });

    test('the shape still holds', async () => {
      await assertFails(update(BEN, {title: ''}));
      await assertFails(update(BEN, {estimate: 10000}));
      await assertFails(update(BEN, {owner: 'ben'}));
      await assertFails(as(BEN).doc(`tasks/${TASK_ID}`)
        .set({...taskWithout(BEN, 'notes'), createdAt, createdBy: {...ANA}}));
    });
  });

  describe('delete', () => {
    beforeEach(() => seed({[`tasks/${TASK_ID}`]: task(ANA)}));

    test('any signed-in account deletes', async () => {
      await assertSucceeds(as(BEN).doc(`tasks/${TASK_ID}`).delete());
    });

    test('signed out is refused', async () => {
      await assertFails(anonymous().doc(`tasks/${TASK_ID}`).delete());
    });
  });
});

describe('loginHistory', () => {
  const logins = (count, from = 0) => Array.from({length: count}, (_, index) => ({at: from + index, device: 'Chrome'}));
  const trail = (user, entries) => ({uid: user.uid, logins: entries});
  const write = (user, data, owner = user) => as(user).doc(`loginHistory/${owner.uid}`).set(data);

  describe('read', () => {
    beforeEach(() => seed({[`loginHistory/${ANA.uid}`]: trail(ANA, logins(2))}));

    test('the owner reads their trail', async () => {
      await assertSucceeds(as(ANA).doc(`loginHistory/${ANA.uid}`).get());
    });

    test('nobody else reads it or lists the collection', async () => {
      await assertFails(as(BEN).doc(`loginHistory/${ANA.uid}`).get());
      await assertFails(anonymous().doc(`loginHistory/${ANA.uid}`).get());
      await assertFails(as(ANA).collection('loginHistory').get());
    });
  });

  describe('create', () => {
    test('the owner starts their trail', async () => {
      await assertSucceeds(write(ANA, trail(ANA, logins(1))));
    });

    test('only under the writer\'s own uid', async () => {
      await assertFails(write(BEN, trail(ANA, logins(1)), ANA));
      await assertFails(write(BEN, trail(BEN, logins(1)), ANA));
      await assertFails(anonymous().doc(`loginHistory/${ANA.uid}`).set(trail(ANA, logins(1))));
    });

    test('the stored uid matches the document id', async () => {
      await assertFails(write(ANA, trail(BEN, logins(1))));
    });

    test('only uid and a logins list are stored', async () => {
      await assertFails(write(ANA, {...trail(ANA, logins(1)), role: 'admin'}));
      await assertFails(write(ANA, {uid: ANA.uid}));
      await assertFails(write(ANA, {uid: ANA.uid, logins: 'none'}));
    });

    test('the list holds at most 60 entries', async () => {
      await assertSucceeds(write(ANA, trail(ANA, logins(60))));
      await assertFails(write(BEN, trail(BEN, logins(61))));
    });
  });

  describe('update', () => {
    test('the owner appends', async () => {
      await seed({[`loginHistory/${ANA.uid}`]: trail(ANA, logins(3))});
      await assertSucceeds(write(ANA, trail(ANA, logins(4))));
    });

    test('nobody else writes it', async () => {
      await seed({[`loginHistory/${ANA.uid}`]: trail(ANA, logins(3))});
      await assertFails(write(BEN, trail(ANA, logins(4)), ANA));
    });

    test('the list never shrinks', async () => {
      await seed({[`loginHistory/${ANA.uid}`]: trail(ANA, logins(3))});
      await assertFails(write(ANA, trail(ANA, logins(2))));
      await assertFails(write(ANA, trail(ANA, [])));
    });

    test('under 50 entries every existing one is kept', async () => {
      await seed({[`loginHistory/${ANA.uid}`]: trail(ANA, logins(49))});
      await assertFails(write(ANA, trail(ANA, logins(49, 1))));
      await assertFails(write(ANA, trail(ANA, logins(50, 1))));
      await assertSucceeds(write(ANA, trail(ANA, logins(50))));
    });

    test('from 50 entries the oldest may be dropped for a new one', async () => {
      await seed({[`loginHistory/${ANA.uid}`]: trail(ANA, logins(50))});
      await assertFails(write(ANA, trail(ANA, logins(49, 1))));
      await assertSucceeds(write(ANA, trail(ANA, logins(50, 1))));
    });

    test('the shape still holds', async () => {
      await seed({[`loginHistory/${ANA.uid}`]: trail(ANA, logins(60))});
      await assertFails(write(ANA, trail(ANA, logins(61))));
      await assertFails(write(ANA, {...trail(ANA, logins(60)), role: 'admin'}));
      await assertFails(write(ANA, trail(BEN, logins(60))));
    });
  });

  test('nobody deletes a trail', async () => {
    await seed({[`loginHistory/${ANA.uid}`]: trail(ANA, logins(1))});
    await assertFails(as(ANA).doc(`loginHistory/${ANA.uid}`).delete());
  });
});

describe('any other path', () => {
  test('is closed to every account', async () => {
    await seed({'notes/one': {text: 'hello'}, [`tasks/${TASK_ID}/comments/one`]: {text: 'hello'}});
    await assertFails(as(ANA).doc('notes/one').get());
    await assertFails(as(ANA).collection('notes').get());
    await assertFails(as(ANA).doc('notes/two').set({text: 'hello'}));
    await assertFails(as(ANA).doc('notes/one').delete());
    await assertFails(as(ANA).doc(`tasks/${TASK_ID}/comments/one`).get());
    await assertFails(as(ANA).doc(`users/${ANA.uid}`).set({email: ANA.email}));
  });
});
