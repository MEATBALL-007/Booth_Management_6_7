# SUMMARY — round `_2026-11-13_0006`

## What I did
- The prompt asked me to redo the **Undo** criterion. That text is stale: it is the August `## Next task` from `main`'s `AUTOPILOT.md`. This branch was cut from bare `main` (`735de75`). The newest audit branch, `_2026-11-12_0026` (`1a480ba`), already has all 20 criteria ticked, and its plan says to carry, verify, record, and stop in exactly this situation. Rule 5 of the prompt ("already done → record and stop") applies, so I followed it.
- I copied the whole tree from `1a480ba` in one commit: `chore(autopilot): carry tree from _2026-11-12_0026 (1a480ba)`.
- I checked that the four Undo spec items are actually in the carried code:
  - `ordersRepo.ts:36` has `withDeletions`, which turns `undefined` into `deleteField()`.
  - `queueActions.ts:58` has the full `orderSnapshot`.
  - `queueActions.ts:36` has `cancel(reason)`.
  - `QueuePanel.tsx:69` calls `Q.cancel`.
  - The two `undo*.audit.test.*` files assert with `toStrictEqual`.
- I added this round's entry under `## Next task` in `AUTOPILOT.md`. The stop instruction stays as it was.
- I didn't change `src/`, any tests, the specs, `firestore.rules`, or `docs/autopilot/`.

## Why
- Without the carry this branch is just `main`, so its PR would propose deleting all the audit work. Redoing Undo from the August spec would rewrite work that was finished and mutation-checked long ago.
- The whole-tree carry was safe:
  - `git merge-base HEAD 1a480ba` returned HEAD.
  - `git diff --name-status --diff-filter=DR HEAD 1a480ba` printed nothing, so no file goes missing.
  - `git diff --stat 6f24609 1a480ba` showed only `AUTOPILOT.md` and `SUMMARY.md`. That means last round left no mutation in `src/`.
- I didn't add a file to `docs/autopilot/` because this round found nothing new. `HEAD:docs` therefore stays at `ab2c756`.

## Verification
- **Carry:**
  - Before the commit, `git diff --stat --cached 1a480ba` printed nothing. After it, `git diff --stat HEAD 1a480ba` printed nothing.
  - `HEAD:` and `1a480ba:` are both `300ea14`.
  - `HEAD:src` is `6ebef4b` and `HEAD:docs` is `ab2c756`, the same values earlier rounds recorded. `main:src` is `5b6b233` (the control).
- **Tick count:** `git grep -c -- "- \[x\]" HEAD -- AUTOPILOT.md` printed **21**, not 20. I listed every match with Grep. There are 20 real checkboxes (lines 17–498). The 21st is a log line around line 1158 that quotes "ติ๊ก `- [x]` = 20". So all 20 criteria are ticked, and I noted the trap in `AUTOPILOT.md`.
- **Verify:** I ran test and build as two separate unpiped commands.
  - `npm test && echo TEST_OK || echo TEST_FAIL` printed `Test Files 59 passed (59)`, `Tests 453 passed (453)` and `TEST_OK`.
  - `npm run build && echo BUILD_OK || echo BUILD_FAIL` printed `BUILD_OK`. `tsc -b` passed, vite transformed 116 modules, and PWA generateSW precached 5 entries. The bundle files were `index-bTUIGpdg.css`, `index-CyVIMiFT.js` and `workbox-9c191d2f.js`, the same three hashes as last round.
  - I ran `npm test` twice by mistake. The first run's output was discarded and I didn't read it. The result above is from the second run.
- **Post-docs re-run:** pending; this line is filled in after the docs commit.

## What I did NOT do
- I didn't redo Undo. It was already done, and redoing it would be a substitute task.
- I didn't start any other criterion. All 20 are ticked, and what's left needs a person to decide (see Risk).
- I didn't touch `firestore.rules` because it is out of scope.

## Risk
- 🚨 `firestore.rules:18` still says `allow read, write: if request.time < timestamp.date(2026, 9, 30);` (I re-read it this round). If the deployed rules match this file, the live project has been denying every read and write since 30 Sep. Only a person can fix this.
- This PR carries the whole accumulated audit work. None of it is new this round, so review it as the full branch, not as this round's diff.
- `main`'s `AUTOPILOT.md` still holds the August plan, so the runner keeps sending the stale "redo Undo" task. Until `main` is updated or the audit branch is merged, every round has to start by carrying the work.
- Open gaps that need a person: there is no export, there are no PWA icons, the write race between two devices is still open, Happy-Hour pricing, cash reconciliation and passport aren't built yet, and the `rounded-xl`/`rounded-2xl` sizes are inverted.
