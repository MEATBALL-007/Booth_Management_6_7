# SUMMARY — round `_2026-11-18_0012`

## What I did
- Copied the whole tree from `_2026-11-18_0002` (`2ebe2ff`) onto this branch in one commit: `chore(autopilot): carry tree from _2026-11-18_0002 (2ebe2ff)`. The runner cut this branch from bare `main` (`735de75`). Without the carry, this round's PR would propose deleting all of the audit work.
- Ran Verify as two separate calls (`npm test`, then `npm run build`), with no pipe and no redirect. Both passed on the first run.
- Added this round's entry under `## Next task` in `AUTOPILOT.md`. The "stop and wait for a person" instruction is unchanged, because it is still correct.

## Why
- The prompt's `## Next task` was **empty**. The plan says that means carry, verify, record, then stop, and must not invent work (prompt rule 5). After the carry, the anchored count is 20 criteria ticked and 0 open.
- The one-command whole-tree carry was safe:
  - `git merge-base HEAD 2ebe2ff` returned HEAD, so nothing on `main` is lost.
  - `git diff --diff-filter=D` from both `_2026-11-17_0032` (`00d094c`) and `_2026-11-17_0022` (`1df2db7`) to `2ebe2ff` printed nothing, so the source is missing nothing those tips had.
  - `00d094c` → `2ebe2ff` differs only in `AUTOPILOT.md`/`SUMMARY.md`, so the tip's own commits left no stray changes in `src/`.

## Verification
- Tree identity: the staged diff against `2ebe2ff` was empty before the commit. After it, `HEAD:` = `2ebe2ff:` = `973b12f`. `HEAD:src` = `6ebef4b` and `HEAD:docs` = `ab2c756`, both the same as the recorded values. `main:src` = `5b6b233` is the control and shows the hash really tells trees apart.
- `npm test`: **59 files, 453 tests passed**, printed `TEST_OK`.
- `npm run build`: `tsc -b` passed, vite transformed 116 modules, PWA generateSW produced 5 precache entries, printed `BUILD_OK`.
- All three bundle hashes match earlier rounds: `index-bTUIGpdg.css`, `index-CyVIMiFT.js`, `workbox-9c191d2f.js`.
- Verify re-run after the docs commit: *pending — filled in after it runs.*

## What I did NOT do
- I did not start any new work, because the plan says a person must choose the next step. The known open gaps are still:
  - there is no export path;
  - Happy-Hour pricing, cash reconciliation and the passport feature were never built;
  - the PWA has no icons;
  - two devices can still both write the same order (`idempotency E1`);
  - `rounded-xl` renders rounder than `rounded-2xl`.
- I did not touch `src/`, add a file under `docs/autopilot/`, or tick or untick anything. `AUTOPILOT.md` and this file are the only files that differ from `2ebe2ff`.

## Risk
- 🚨 **`firestore.rules:18` still says `allow read, write: if request.time < timestamp.date(2026, 9, 30)`** (I re-read it this round). That date has passed, so the live database denies every read and write until a person writes proper rules. Fixing it is out of scope for the agent.
- The runner keeps cutting rounds from bare `main`, and nothing ever merges. The 453 tests exist only on unmerged `auto/*` branches. A person should merge the latest `auto/*` branch into `main` and fill in `## Next task`. Until then, every round repeats this carry.
- Matching bundle hashes prove the production code is unchanged, not that it is correct. Test files never go into the bundle; the 453 passing tests cover that half.
