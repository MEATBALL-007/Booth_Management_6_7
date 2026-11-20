# SUMMARY — round `_2026-11-21_0015`

## What I did
- Found the prompt's `## Next task` ("redo the **Undo** criterion from `docs/autopilot/2026-08-13-undo-audit-findings.md`") was **stale**. It is `main`'s August plan text, and the runner cut this branch from bare `main` (`735de75`). The plan on the newest sibling branch already records Undo as done, has all 20 criteria ticked, and warns about this exact case (seen first in `_2026-09-22_0133`).
- Carried the whole tree from the newest sibling, `auto/Booth_Management_6_7/2026-11-20_0040` (`85251d6`). Carry commit: `e65e9ef` `chore(autopilot): carry tree from _2026-11-20_0040 (85251d6)`.
- Checked the three parts of the Undo spec in the carried code directly (see Verification).
- Ran Verify (`npm test`, then `npm run build`, both unpiped). Both passed on the first run.
- Added this round's entry under `## Next task` in `AUTOPILOT.md`. The standing instruction is unchanged: carry, verify, record, stop, and wait for a person to pick the next job. I made no `src/` edits and added no `docs/autopilot/` file.

## Why
- Rule 5 covers this: the assigned task is already done, so I record that and stop. I did not invent a substitute, and I did not re-implement Undo on top of the existing fix, which would only add churn or conflicts.
- The carry is still required. Without it this branch equals `main`, and its PR would propose deleting all 453 tests' worth of audit work.
- The whole-tree checkout was safe for these reasons:
  1. `main` has not moved (still `735de75`).
  2. `merge-base HEAD 85251d6` returns HEAD.
  3. `--diff-filter=D` from `5f13fb2` and from `41880bb` to `85251d6` both list nothing.
  4. `git diff --stat 5f13fb2 85251d6` touches only `AUTOPILOT.md` and `SUMMARY.md`.
  5. `:src` is `6ebef4b` on both tips (`main:src` = `5b6b233` as the control).

## Verification
- `git diff --stat 85251d6` was empty after the carry commit.

  | Hash | Value | Note |
  |---|---|---|
  | `HEAD:` = `85251d6:` | `7a9027f` | whole tree identical to the source tip |
  | `HEAD:src` | `6ebef4b` | same as the last several verified rounds |
  | `HEAD:docs` | `ab2c756` | unchanged |

- Ticked criteria (anchored `^- \[x\]`): **20**, with 0 open.
- Undo spec, checked in the carried code (not taken from the checkboxes):
  - `src/order/ordersRepo.ts:36` `withDeletions()` maps `undefined` to `deleteField()`.
  - `src/queue/queueActions.ts:58` `orderSnapshot()` returns every undoable field, including `cancelReason`.
  - `src/queue/queueActions.ts:36` has `cancel(reason)`.
- `npm test`: **59 files, 453 tests passed** (`TEST_OK`).
- `npm run build`: **`BUILD_OK`**. `tsc -b` passed, vite transformed 116 modules, and PWA generateSW wrote 5 precache entries. The bundle hashes match the recorded ones: `index-bTUIGpdg.css`, `index-CyVIMiFT.js`, `workbox-9c191d2f.js`.
- Post-docs Verify re-run after `1a95bc6`, both commands unpiped: **59 files, 453 tests** (`TEST_OK`) and `BUILD_OK`, with the same three bundle hashes.

## What I did NOT do
- Did not re-implement Undo. It is already on the carried tree with 36 dedicated tests, and the earlier mutation check is recorded in `docs/autopilot/2026-08-29-undo-carry-and-mutation-check.md`.
- Did not change `## Next task` to "No-show" as the prompt asked. No-show is also already ticked, so pointing the next round at it would repeat this stale-task loop.
- Started no new work. Every remaining item needs a person to decide: export, PWA icons, telling presence rows apart, Happy-Hour pricing, cash close-out, passport, the cross-device write race, and the `rounded-xl`/`2xl` inversion.
- Did not touch `firestore.rules` (out of scope).

## Risk
- 🚨 `firestore.rules:18` still reads `allow read, write: if request.time < timestamp.date(2026, 9, 30);` (re-read this round). That date has passed, so production denies every read and write. A person has to fix this; the agent is not allowed to.
- 🔁 The runner keeps cutting branches from `main` and reading the plan from `main`'s `AUTOPILOT.md`. Until a person merges one carried branch into `main` (or updates `main`'s plan), every round will keep getting a stale or empty task.
- Matching hashes prove the source is unchanged since the last verified round. They do not prove it is correct.
- The vite build still warns that the main JS chunk is 852 kB, over the 500 kB limit. It is only a warning and has not changed.
