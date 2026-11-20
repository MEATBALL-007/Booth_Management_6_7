# SUMMARY — round `_2026-11-20_0040`

## What I did
- Carried the whole tree from the newest sibling branch, `auto/Booth_Management_6_7/2026-11-20_0027` (`5f13fb2`), onto this branch. The runner had cut this branch from bare `main` (`735de75`). Carry commit: `45237f5` `chore(autopilot): carry tree from _2026-11-20_0027 (5f13fb2)`.
- Ran Verify as two unpiped commands, `npm test` then `npm run build`. Both passed on the first run.
- Added this round's entry to `AUTOPILOT.md` under `## Next task`. The instruction itself is unchanged: stop and wait for a person to choose the next job. I made no `src/` edits and added no `docs/autopilot/` file.

## Why
- `## Next task` arrived empty, and all 20 criteria are ticked (anchored `- [x]` count = 20, 0 open boxes). Rule 5 says to record that and stop, so I did not make up a different task.
- The carry is still required. Without it this branch equals `main`, and its PR would propose dropping every audit test and audit doc.
- The whole-tree checkout was safe for these reasons:
  1. `main` has not moved (still `735de75`).
  2. `merge-base HEAD 5f13fb2` returns HEAD.
  3. `git diff --diff-filter=D 41880bb 5f13fb2` lists nothing.
  4. `git diff --stat 41880bb 5f13fb2` touches only `AUTOPILOT.md` and `SUMMARY.md`.
  5. `:src` is `6ebef4b` on both tips (`main:src` = `5b6b233` as the control).

## Verification
- `git diff 5f13fb2` was empty after the carry commit.

  | Hash | Value | Note |
  |---|---|---|
  | `HEAD:` = `5f13fb2:` | `068b6c1` | whole tree identical to the source tip |
  | `HEAD:src` | `6ebef4b` | same as the last several verified rounds |
  | `HEAD:docs` | `ab2c756` | unchanged |

- `npm test`: **59 files, 453 tests passed** (`TEST_OK`).
- `npm run build`: **`BUILD_OK`**. `tsc -b` passed, vite transformed 116 modules, and PWA generateSW wrote 5 precache entries. The bundle hashes match the recorded ones: `index-bTUIGpdg.css`, `index-CyVIMiFT.js`, `workbox-9c191d2f.js`.
- Post-docs Verify re-run after `1f6a82d`, both commands unpiped: **59 files, 453 tests** (`TEST_OK`) and `BUILD_OK`, with the same three bundle hashes.

## What I did NOT do
- Started no new work. Every remaining item needs a person to decide: export (§98), PWA icons, telling presence rows apart, Happy-Hour pricing, cash close-out, passport, the cross-device write race, and the `rounded-xl`/`2xl` inversion.
- Did not touch `firestore.rules` (out of scope).

## Risk
- 🚨 `firestore.rules:18` still reads `allow read, write: if request.time < timestamp.date(2026, 9, 30);` (re-read this round). That date has passed, so production denies every read and write. A person has to fix this; the agent is not allowed to.
- Matching hashes prove the source is unchanged since the last verified round. They do not prove it is correct.
- The vite build still warns that the main JS chunk is 852 kB, over the 500 kB limit. It is only a warning and has not changed.
