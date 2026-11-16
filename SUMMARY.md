# SUMMARY — round `_2026-11-17_0012`

## What I did
- Copied the whole tree from `_2026-11-17_0002` (`c9f7024`) onto this branch in one commit: `chore(autopilot): carry tree from _2026-11-17_0002 (c9f7024)`. The runner cut this branch from bare `main` (`735de75`). Without the carry, the PR would propose deleting all of the audit work.
- Ran Verify as two separate calls (`npm test`, then `npm run build`), with no pipe and no redirect. Both passed on the first run.
- Added this round's entry to `AUTOPILOT.md` under `## Next task`. I left the "stop and wait for a person" instruction unchanged.

## Why
- The prompt's `## Next task` was **empty**. The plan says that means carry, verify, record, then stop, and must not invent work (prompt rule 5). All 20 criteria are ticked, with 0 open (anchored count after the carry).
- Copying the whole tree in one command was safe. `git merge-base HEAD c9f7024` returned HEAD. `git diff --diff-filter=D` from HEAD, `6c095f9` (`_2026-11-16_0027`), `0c7c37b` (`_0017`) and `8deccaa` (`_0007`) to `c9f7024` printed nothing. So the source tip lacks no file that HEAD or the last three tips had.
- I picked `c9f7024` as the source because it is the newest tip and differs from `6c095f9` only in `AUTOPILOT.md`/`SUMMARY.md`.

## Verification
- Tree identity: after the carry commit, `HEAD:` = `c9f7024:` = `5354c92`. `HEAD:src` = `6ebef4b` and `HEAD:docs` = `ab2c756`, the same as earlier rounds. `main:src` = `5b6b233` is the control, which shows the hash really tells trees apart. The staged diff against `c9f7024` was empty before the commit.
- `npm test`: **59 files, 453 tests passed**, printed `TEST_OK`.
- `npm run build`: `tsc -b` passed, vite transformed 116 modules, PWA generateSW produced 5 precache entries, printed `BUILD_OK`.
- All three bundle hashes match previous rounds: `index-bTUIGpdg.css`, `index-CyVIMiFT.js`, `workbox-9c191d2f.js`.
- Verify re-run after the docs commit (`8fb6526`): **59 files, 453 tests**, `TEST_OK`, `BUILD_OK`, same three bundle hashes.

## What I did NOT do
- I did not start any new work. The plan says a person must choose the next step. The known open gaps are:
  - there is no export path;
  - Happy-Hour pricing, cash reconciliation and the passport feature were never built;
  - the PWA has no icons;
  - two devices can still both write the same order (`idempotency E1`);
  - `rounded-xl` renders rounder than `rounded-2xl`.
- I did not touch `src/`, add any file under `docs/autopilot/`, or tick or untick anything. `AUTOPILOT.md` and this file are the only files that differ from `c9f7024`.

## Risk
- 🚨 **`firestore.rules:18` still says `allow read, write: if request.time < timestamp.date(2026, 9, 30)`** (re-read this round). That date has passed, so the live database denies every read and write until a person writes proper rules. Fixing it is out of scope for the agent.
- The runner keeps cutting rounds from bare `main`, and nothing ever merges. 453 tests now sit only on unmerged `auto/*` branches. A person should merge the latest `auto/*` branch into `main`.
- Matching bundle hashes prove the production code is unchanged, not that it is correct. Test files never go into the bundle; the 453 passing tests cover that half.
