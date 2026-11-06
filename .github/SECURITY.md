# Security policy

## Reporting a vulnerability

Report it privately, never in a public issue: on GitHub, open the repository's **Security**
tab and choose **Report a vulnerability**
([direct link](https://github.com/evrisoftware/fam-stack/security/advisories/new)). If you
cannot use GitHub's form, email evrisoftware@gmail.com.

Say what an attacker can do, how to reproduce it (against the emulators, if you can) and which
files are involved.

## What this policy covers

The latest `main` of this repository:

- the stack layer, `projects/fam-stack`;
- `firestore.rules` and the hosting headers in `firebase.json`;
- the starter, `scripts/`, and the reference code the skills in `.claude/skills/` apply.

## What it does not

- **Copies of the template.** Each copy belongs to whoever made it, and nothing here can patch
  it. A flaw in your copy that the original shares is in scope: report it here.
- **Firebase, Angular, Material and other dependencies.** Report those to their maintainers;
  using them unsafely here is in scope. `npm audit` also lists packages that only Firebase's
  Node.js build uses, such as `@grpc/grpc-js`: the app's browser bundle does not contain them.
- **Firebase web config.** An `apiKey` names a project and is not a secret; the security rules
  are what protect the data.
- **The emulator's demo values.** `demo@example.com` / `demo-password`, `demo-api-key` and the
  `demo-fam-stack` project exist only on the local emulators.

## After a fix

The fix lands on `main` with a recipe in [`docs/changes/`](../docs/changes/README.md)
(`kind: fix`): what failed, and how a copy adopts the fix, with the `adopt-upstream-change`
skill or by hand. It may also be announced as a GitHub security advisory.
