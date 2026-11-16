# SUMMARY — round `_2026-11-17_0002`

## What I did
- Copied the whole tree from `_2026-11-16_0027` (`6c095f9`) onto this branch in one commit, `chore(autopilot): carry tree from _2026-11-16_0027 (6c095f9)`. This branch was cut from bare `main` (`735de75`). Without the carry, its PR would propose deleting all of the audit work.
- Checked the task the prompt gave me ("redo **Undo** from `docs/autopilot/2026-08-13-undo-audit-findings.md`") against the carried code. **That work is already done**, so I did not redo it.
- Ran Verify as two separate calls (`npm test`, then `npm run build`), with no pipe and no redirect. Both passed on the first run.
- Added this round's entry to `AUTOPILOT.md` under `## Next task`. The existing "stop and wait for a person" instruction is unchanged.

## Why
- The prompt's `## Next task` was not empty, but it was out of date. The runner reads that section from the working copy, which on a fresh branch is `main`'s August-era `AUTOPILOT.md`. The plan already describes this case (round `_2026-09-22_0133`). After the carry, the anchored checkbox count is **20 ticked, 0 open**.
- I checked the code itself rather than relying on the checkboxes. All four points in the Undo spec are present:
  1. `ordersRepo.ts:36` has `withDeletions()`, which turns `undefined` into `deleteField()`.
  2. `queueActions.ts:58` `orderSnapshot()` returns every field, including `cancelReason`.
  3. `queueActions.ts:36` has `cancel(reason)`, and `QueuePanel.tsx:69` calls `Q.cancel`.
  4. The two undo test files use `toStrictEqual` 18 times. The only `toHaveBeenCalledWith` calls (2, in `undoDeleteField.audit.test.ts`) check the `doc()`/`addDoc` arguments, not the `updateOrderStatus` patch.
- Prompt rule 5 says an already-done task gets recorded and the round stops. Inventing a substitute task is not allowed.
- Copying the whole tree in one command was safe: `git merge-base HEAD 6c095f9` returned HEAD, and `git diff --diff-filter=D HEAD 6c095f9` was empty, so nothing could be deleted.

## Verification
- Tree identity: `HEAD:` = `6c095f9:` = `759c574`; `HEAD:src` = `6ebef4b`; `HEAD:docs` = `ab2c756`. Both subtree hashes match earlier rounds. The staged diff against `6c095f9` was empty before the commit.
- `npm test`: **59 files, 453 tests passed**, printed `TEST_OK`.
- `npm run build`: `tsc -b` passed, vite transformed 116 modules, PWA generateSW produced 5 precache entries, printed `BUILD_OK`.
- All three bundle hashes match previous rounds: `index-bTUIGpdg.css`, `index-CyVIMiFT.js`, `workbox-9c191d2f.js`.
- Verify re-run after the docs commit (`2d3ef2e`): **59 files, 453 tests**, `TEST_OK`, `BUILD_OK`, same three bundle hashes.

## What I did NOT do
- I did not redo Undo or start any other work. The plan says to wait for a person to choose the next step. The known open gaps are:
  - there is no export path;
  - Happy-Hour pricing, cash reconciliation and the passport feature were never built;
  - the PWA has no icons;
  - two devices can still both write the same order (`idempotency E1`);
  - `rounded-xl` renders rounder than `rounded-2xl`.
- I did not touch `src/`, add any file under `docs/autopilot/`, or tick or untick anything. `AUTOPILOT.md` and this file are the only files that differ from `6c095f9`.

## Risk
- 🚨 **`firestore.rules:18` still says `allow read, write: if request.time < timestamp.date(2026, 9, 30)`** (re-read this round). That date has passed, so the live database now denies every read and write, and the booths cannot work until a person writes proper rules. This is out of scope for the agent and has been flagged every round since the date passed.
- The runner keeps cutting rounds from bare `main` and sending `main`'s old "Next task" text. A future agent that trusts the prompt would redo Undo on top of an August tree. That would produce a duplicate or conflicting fix while 450+ tests sit on unmerged branches. The real fix is for a person to merge the latest `auto/*` branch into `main`.
- Matching bundle hashes prove the production code is unchanged, not that it is correct. Test files never go into the bundle; the 453 passing tests cover that half.
