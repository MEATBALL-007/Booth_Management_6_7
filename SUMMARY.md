# SUMMARY — round `auto/Booth_Management_6_7/2026-09-22_0133`

## What I did

- **Carried the full audit tree onto this branch.** The branch was cut from bare
  `main` (`HEAD == main == 735de75`) for the **76th** time, so it held none of the
  20-criteria work. Carried the whole tree from the newest sibling tip `_0023`
  (`bb57410`) in one checkout — **44 added / 7 modified / zero deleted**.
- **Found the round's named task already done, and proved it in the code** rather
  than trusting a checkbox. The prompt asked me to redo the **Undo** criterion from
  `docs/autopilot/2026-08-13-undo-audit-findings.md`; all three edits that spec calls
  for are already on the carried tree, and the tests it prescribes exist and pass.
- **Did not touch `src/` — not one line.** Per hard rule 5, a task that is already
  complete is recorded, not reinvented, and no substitute task was started.
- **Recorded the new lesson in `AUTOPILOT.md`**: a *non-empty* `## Next task` in the
  prompt is not evidence of new work. The branch is cut from bare `main`, so the
  working-copy `AUTOPILOT.md` the runner reads the task from is `main`'s August copy.
- **Updated `## Next task`** with this round's entry and the one-command test that
  separates "stale prompt" from "real work" in future rounds.

## Why

The prompt's task text and the real plan disagreed. The real plan lives on the newest
`auto/*` tip, not in the working copy: the branch is cut from bare `main`, whose
`AUTOPILOT.md` predates ~58 rounds of work. Reading the plan off `bb57410` showed the
standing instruction is *carry → verify → record → stop — do not invent work*, and that
every one of the 20 acceptance criteria is already ticked.

Carrying first was not optional and had to happen **before** reading the real plan: an
uncarried branch is bare `main`, so the PR the runner opens would propose deleting all
44 audit files. `git merge-base HEAD bb57410` returned `735de75` — HEAD itself — which
is what licenses the one-command whole-tree carry instead of a path-by-path one.

## Verification

Carry integrity (five independent checks, all before the Verify command):

| Check | Result |
|---|---|
| `git merge-base HEAD bb57410` | `735de75` = HEAD itself ✅ |
| `git diff --name-status HEAD bb57410` | 44 A / 7 M / **0 D** ✅ |
| `git diff bb57410` + `git diff --cached bb57410` after carry, before commit | both empty ✅ |
| `git rev-parse HEAD^{tree}` vs `bb57410^{tree}` | `4d6597b` == `4d6597b` ✅ |
| `HEAD:src` / `HEAD:docs` vs the cross-round constants | `665250c` / `ab2c756` ✅ |

Positive control: `main:src` = `5b6b233` ≠ `665250c`, so the carry really moved `src` —
this is not two already-equal values being compared.

Verify command — `npm test && npm run build`, run in full on the committed tree:

```
Test Files  59 passed (59)
     Tests  453 passed (453)

tsc -b && vite build → 116 modules transformed
dist/assets/index-bTUIGpdg.css   16.31 kB
dist/assets/index-CyVIMiFT.js   852.15 kB
PWA  precache 5 entries (849.13 KiB) · dist/workbox-9c191d2f.js
✓ built in 1.03s
```

All three content hashes (`index-bTUIGpdg.css`, `index-CyVIMiFT.js`,
`workbox-9c191d2f.js`) match the values the previous rounds recorded — 53rd round the
hashes have held. `git status --porcelain -uall` was empty before the tests and again
after the build.

Evidence the **Undo** task the prompt named is already complete:

- `src/order/ordersRepo.ts:36` — `withDeletions()` maps `undefined` → `deleteField()`,
  imported from the existing `firebase/firestore` import at line 1 (no new dependency).
- `src/queue/queueActions.ts:58` — `orderSnapshot()` returns every undoable field,
  including `cancelReason`, with `undefined` meaning "this order never had one".
- `src/queue/queueActions.ts:36` — `cancel(reason)` exists as `Q.cancel`, moved out of
  the panel as the spec requires.
- `npx vitest run src/undoRoundTrip.audit.test.tsx src/undoDeleteField.audit.test.ts`
  → **2 files, 36 tests passed**.
- The matcher rule holds: `undoRoundTrip.audit.test.tsx` has **15 `toStrictEqual`** and
  **zero** `objectContaining` / `toHaveBeenCalledWith` assertions. The single grep hit
  for those names is the comment at line 24 forbidding them, not an assertion.
- `git grep -c -- "- \[x\]" HEAD -- AUTOPILOT.md` → **20**; the `- [ ]` count is **0**.

## What I did NOT do

- **Did not redo the Undo work.** It is already on the tree and its tests pass. Rewriting
  it would have churned four production files for no behavioural change and risked the
  `frozenZones` / `uiOverhaulDiffScope` audits that pin those exact paths and reasons.
- **Did not start a second task.** No criterion is unticked, and the standing plan says
  the next move is a human decision.
- **Did not add a file under `docs/autopilot/`.** Nothing was discovered beyond the round
  log, and an unchanged `HEAD:docs` (`ab2c756`) is precisely the signal the next round
  uses to check its own carry. The new lesson went into `AUTOPILOT.md` instead.
- **Did not tick any box** — all 20 were already ticked before this round.

## Risk

- **The prompt and the repository disagree about what is left to do, and the prompt is
  wrong.** This is the first round where `## Next task` arrived non-empty *and* stale;
  earlier rounds only ever saw it empty. Until the runner reads the task from the newest
  `auto/*` tip instead of the working copy, every future round will be handed the same
  August instruction to redo work that shipped weeks ago. A reviewer should check that
  first — it is the one thing in this repo that is actually broken.
- **This round is a pure carry — it contains no new engineering.** The only substantive
  diff versus `bb57410` is `AUTOPILOT.md` and this file. That is the intended outcome,
  but it means the PR's value is "the branch is not bare `main`", nothing more.
- **The 20 ticks were verified by re-running the suite, not re-derived from scratch.**
  I confirmed the Undo criterion down to the assertions; the other 19 rest on the 453
  passing tests and the audit documents the earlier rounds wrote. No pixel was measured
  and no live Firestore was touched — the jsdom and source-sweep caveats those audits
  state for themselves still apply.
