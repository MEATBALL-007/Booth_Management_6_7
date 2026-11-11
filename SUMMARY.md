# SUMMARY — round `_2026-11-12_0016`

## What I did
- The prompt asked me to redo the **Undo** criterion. That text is stale. It comes from `main`'s `AUTOPILOT.md`, which still reflects the August plan. The newest branch, `_2026-11-11_0041` (`464d65b`), has all 20 criteria ticked, and its `## Next task` says to carry, verify, record, and stop. I followed that instruction (prompt rule 5: the task is already done).
- I carried the whole tree from `_2026-11-11_0041` in one commit, `chore(autopilot): carry tree from _2026-11-11_0041 (464d65b)`.
- I checked the actual code against the four points of the Undo spec instead of relying on the checkbox, and all four are present (see Verification).
- In `AUTOPILOT.md` I replaced last round's entry under `## Next task` with this round's. The stop instruction is unchanged. I did not change it to "No-show" as the prompt asked, because No-show is also ticked and proven on this branch.
- I didn't touch `src/`, the tests, the specs, or `docs/autopilot/`.

## Why
- Without the carry, this branch is bare `main` (`735de75`), and its PR would propose deleting all the audit work.
- A whole-tree carry was safe. `git merge-base HEAD 464d65b` returned HEAD, and `git diff --name-status --diff-filter=DR HEAD 464d65b` printed nothing, so no file goes missing. `git diff --stat f8769af 464d65b` touched only `AUTOPILOT.md` and `SUMMARY.md`, so last round added only docs and left no mutation in `src/`.
- Redoing Undo from the August findings doc would have rewritten code that is already fixed and covered by 36 tests. That is the "substitute task" the rules forbid.

## Verification
- **Carry:** after the commit, `git diff --stat HEAD 464d65b` printed nothing. `HEAD:` and `464d65b:` are both `2febc58`. `HEAD:src` is `6ebef4b` and `HEAD:docs` is `ab2c756`, the same values earlier rounds recorded. `main:src` is `5b6b233`, a control. `main` is still at `735de75`.
- **Undo spec, checked in code:**
  - `src/order/ordersRepo.ts:36`: `withDeletions()` maps `undefined` to `deleteField()`.
  - `src/queue/queueActions.ts:58`: `orderSnapshot()` returns every undoable field, including `cancelReason`.
  - `src/queue/queueActions.ts:36`: `cancel(reason)` exists.
  - `src/screens/QueuePanel.tsx:69`: the panel calls `Q.cancel(reason)`.
  - Both undo test files use `toStrictEqual`.
- **Verify** ran as two separate unpiped steps:
  - `npm test > /dev/null 2>&1 && echo TEST_OK || echo TEST_FAIL` printed `TEST_OK`. A second, piped run showed `Test Files 59 passed (59)` and `Tests 453 passed (453)`.
  - `npm run build > /dev/null 2>&1 && echo BUILD_OK || echo BUILD_FAIL` printed `BUILD_OK`. The output was `index-bTUIGpdg.css`, `index-CyVIMiFT.js` and `workbox-9c191d2f.js`, plus `sw.js` and `manifest.webmanifest`. All three hashes match last round. `git status --porcelain` was clean after the build.
- **Post-docs re-run:** after committing `AUTOPILOT.md` and this file (`6d74b63`), I re-ran Verify on a clean tree. `npm test` printed `TEST_OK`, and `npm run build` printed `BUILD_OK`. The build emitted the same `index-bTUIGpdg.css`, `index-CyVIMiFT.js` and `workbox-9c191d2f.js`, and `git status --porcelain` stayed clean. I didn't re-read the tally on this run because the unpiped exit code was the check.

## What I did NOT do
- I didn't start any new work. All 20 criteria are ticked. What's left needs a person to decide: export, PWA icons, the two-device write race, and the open items recorded in `AUTOPILOT.md`.
- I didn't touch `firestore.rules` because it's out of scope.

## Risk
- 🚨 `firestore.rules:18` still reads `allow read, write: if request.time < timestamp.date(2026, 9, 30);`. I re-read it this round. If the deployed rules match this file, the live project now denies every read and write. Only a person can fix this.
- Last round's plan said the undo tests contain zero `toHaveBeenCalledWith`. That is slightly wrong. `src/undoDeleteField.audit.test.ts:46,78` use it, but on `doc()` path arguments and `addDoc`, not on the `updateOrderStatus` patch the spec warns about. The spec still holds. I corrected the wording in `AUTOPILOT.md`.
- This PR carries the whole audit body. Nothing in it is new this round, so review it as the accumulated branch, not as this round's diff.
- The runner keeps feeding the stale `main` plan as the prompt. `main`'s `AUTOPILOT.md` needs updating, or the branch needs merging, so that rounds stop starting from it.
