# SUMMARY — round `_2026-11-23_0000`

## What I did
- The prompt's `## Next task` asked me to redo **Undo**. That text is stale: it comes from the `AUTOPILOT.md` on `main` (`735de75`), which this branch was cut from, and the plan still reads as it did in August. On the newest branch (`_2026-11-22_0025`, `ff24cbc`) Undo has been ticked and proven for months, and so have the other 19 criteria. I did not redo Undo and I did not touch `src/`.
- I carried the whole tree from `ff24cbc` in one commit: `chore(autopilot): carry tree from _2026-11-22_0025 (ff24cbc)`.
- I added this round's entry to the round log under `## Next task` in `AUTOPILOT.md`. The `🛑` line ("no work the agent can do on its own; wait for a person to choose") still holds, so I left it as it was.

## Why
- Without the carry this branch is byte-identical to `main`. Its PR would then propose deleting all 20 proven criteria, the 453 tests and the `docs/autopilot/` findings.
- Hard rule 5 covers "already done": record it, correct the plan, stop. Redoing Undo from the August spec would at best rewrite work that has been proven and mutation-checked. At worst it would overwrite the carried `queueActions.ts`, `ordersRepo.ts` and `QueuePanel.tsx` with a weaker version.
- I checked that the code is really there rather than trusting the checkbox. The carried `ordersRepo.ts` has `withDeletions()`, which maps `undefined` to `deleteField()`. `queueActions.ts` has a full `orderSnapshot()` and `cancel(reason)`. `undoRoundTrip.audit.test.tsx` and `undoDeleteField.audit.test.ts` are both in the passing suite. The plan's round `_2026-09-22_0133` entry documents this same stale-prompt case.
- A whole-tree checkout is only safe from a strict descendant. `git merge-base HEAD ff24cbc` returned HEAD (`735de75`), and `git diff --diff-filter=D --name-only HEAD ff24cbc` was empty. `ab2690e`→`ff24cbc` differs only in `AUTOPILOT.md` and `SUMMARY.md`.

## Verification
- After the checkout, `git diff --stat --cached ff24cbc` was empty. After the commit, `HEAD:` = `ff24cbc:` = `6d72095`. `HEAD:src` = `64301b9` (control: `main:src` = `5b6b233`) and `HEAD:docs` = `ab2c756`.
- Ticked criteria (`git grep -c -- "^- \[x\]"`): 20. Unticked (`^- \[ \]`): 0.
- `npm test` (unpiped): `Test Files 59 passed (59)`, `Tests 453 passed (453)`, then `TEST_OK`.
- `npm run build` (unpiped): `tsc -b` passed, vite transformed 116 modules, PWA generateSW produced 5 precache entries, ended with `BUILD_OK`. Asset hashes: `index-bTUIGpdg.css`, `index-CyVIMiFT.js`, `workbox-9c191d2f.js`, all three the same as recorded.
- Post-docs Verify re-run: pending (filled in after it runs).

## What I did NOT do
- I did not redo Undo. It is done, and the prompt's instruction is a leftover from `main`.
- I did not invent a substitute task. The remaining open items need a person to decide: Happy-Hour, cash close, passport, export, PWA icons, and the cross-device write race.
- I did not add a file under `docs/autopilot/`. A pure carry has no findings, and `HEAD:docs` (`ab2c756`) is what the next round checks against.
- I did not touch `firestore.rules`; it is out of scope.

## Risk
- 🚨 `firestore.rules:18` is still `allow read, write: if request.time < timestamp.date(2026, 9, 30);`. That date has passed, so this catch-all rule now denies every read and write it covers. A person has to fix this; the agent is not allowed to.
- The runner keeps building prompts from `main`'s stale `AUTOPILOT.md`. Until the carried plan reaches `main`, every round will be told to redo finished work. Merging one of these carry branches, or updating `main`'s `## Next task`, would stop that.
- The matching hashes prove the carried source is the same as last round's. They do not prove it is correct.
