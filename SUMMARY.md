# SUMMARY — round `_2026-11-27_0002`

## What I did
- Did **not** re-do Undo. The prompt's "Next task" (re-implement Undo from
  `docs/autopilot/2026-08-13-undo-audit-findings.md`) is the stale text from `main`'s
  `AUTOPILOT.md`. The newest branch `_2026-11-25_0032` (`3478006`) already has Undo ticked,
  fixed and tested, and has all 20 criteria ticked. This is the case recorded as the lesson
  from `_2026-09-22_0133`.
- Copied the whole tree from `_2026-11-25_0032` (`3478006`) onto this branch, which was cut
  from bare `main` (`735de75`), in commit `chore(autopilot): carry tree from _2026-11-25_0032 (3478006)`.
- Added this round's entry under `## Next task` in `AUTOPILOT.md`. The Next task itself is
  unchanged: no work is left that an agent can pick on its own, so a person has to choose
  the next step.

## Why
- Hard rule 5: if the task is already done, record that and stop. Do not make up a
  substitute task.
- Not copying the tree would leave this branch as bare `main`, and its PR would propose
  deleting all the audit work (about 18,700 lines).
- I checked that Undo is really done on the copied tree:
  - `ordersRepo.ts` has `withDeletions()` (`undefined` → `deleteField()`).
  - `queueActions.ts` has a full `orderSnapshot()` and `cancel(reason)`.
  - Undo is proven by `undoRoundTrip.audit.test.tsx` and `undoDeleteField.audit.test.ts`.
  - The previous rounds' records show these use `toStrictEqual`.

## Verification
- `merge-base HEAD 3478006` = HEAD. `--diff-filter=D` HEAD→`3478006` is empty.
  `diff --stat --cached 3478006` is empty.
- Tree hashes: `HEAD:` = `3478006:` = `ada083d`. `HEAD:src` = `64301b9`. `HEAD:docs` = `ab2c756`.
- Ticks (anchored `^- \[x\]`): **20**. Unticked: **0**.
- `npm test` (no pipe): **59 files, 453 tests passed**, `TEST_OK`.
- `npm run build` (separate call): `tsc -b` passed, vite built 116 modules, PWA generateSW
  made 5 precache entries, `BUILD_OK`.
- Bundle hashes match the earlier rounds: `index-bTUIGpdg.css`, `index-CyVIMiFT.js`,
  `workbox-9c191d2f.js`.
- Re-run after the docs commit (`de6e54a`, no pipe, test and build run as separate calls):
  **59 files, 453 tests passed**, `TEST_OK`. Build `BUILD_OK`. All three bundle hashes match.

## What I did NOT do
- Did not touch `src/`, the tests or `docs/autopilot/`. Nothing was left to do. I added no
  new docs file, so `HEAD:docs` stays the signal for the next round.
- Did not edit `firestore.rules`. It is out of scope.

## Risk
- 🚨 `firestore.rules:18` still allows read/write only `if request.time < 2026-09-30`. That
  date has passed, so production Firestore now denies every read and write. A person has to
  fix this. It is out of scope for the agent.
- The runner keeps cutting branches from bare `main` and passing `main`'s stale Next task.
  Until someone merges an `auto/*` branch into `main`, every round will only copy the tree.
