# Round summary — 2026-08-18 (branch `auto/Booth_Management_6_7/2026-08-18_0036`)

Task: verify the **ประกาศซ้ำ / re-announce** acceptance criterion from
`docs/superpowers/specs/2026-08-04-queue-pro-upgrade-design.md`:

> กดบน serving → Display เล่นเสียง+ไฟสำหรับเลขนั้นอีกครั้ง (announcedAt เด้ง)

**Result: the criterion passes. No production code needed changing.** The gap was in the
tests, and it is now closed with 12 new tests in 2 new files.

## What I did

- **Synced `AUTOPILOT.md` forward from branch `..._0026`.** The copy on this branch was the
  pre-0009 version — it still showed Undo and No-show unticked and named Undo as the next
  task, work that two unmerged sibling branches had already finished. Without this the round
  would have redone Undo.
- **Added `src/screens/QueuePanelReannounce.test.tsx` (5 tests)** — closes the exact gap the
  plan named. The existing `QueuePanel.test.tsx:98` asserts the re-announce patch with
  `objectContaining`, which passes regardless of how many extra fields ride along. The new
  file pins it with `toStrictEqual` on `updateOrderStatus.mock.calls`: the patch must be
  `{ announcedAt: <number> }` and nothing else. Also covers targeting the right order among
  several serving, repeat presses, and the button being absent on waiting/parked cards.
- **Added `src/screens/DisplayReannounce.test.tsx` (7 tests)** — proves the criterion's actual
  subject at the screen level: an order that was *already* serving and *stays* serving
  announces again (chime **and** flash) when `announcedAt` bumps. Plus repeat announces,
  other serving numbers staying silent, no-bump and backwards-bump silence, and the flash
  clearing itself after the alert window.
- **Ticked the ประกาศซ้ำ criterion** in `AUTOPILOT.md` and rewrote `## Next task` for the
  **เรียกเจาะจง / call-specific** criterion, with the survey I already did recorded there so
  the next round does not repeat it.

## Why

**Why no production change.** `Q.reannounce` already returns `{ announcedAt: now }` guarded on
`status === 'serving'`, and `newlyAnnounced` already fires on a forward bump. Every clause of
the criterion held. The honest outcome for this criterion is "proven, was already correct" —
the plan's goal is that no criterion is left in the "don't know" state, not that every round
changes code.

**Why new files rather than extending the existing tests.** Branches `..._0009` and `..._0026`
are unmerged and both rewrite `QueuePanel.test.tsx` / `DisplayScreen.test.tsx`. Sibling files
collide with nobody.

**Why one of my own tests got rewritten mid-round.** See Verification — the mutation check
caught a weak test of mine, and the reason it was weak is worth knowing.

## Verification

**Verify command — both halves run, both pass:**

```
npm test      ->  Test Files  41 passed (41)
                  Tests      145 passed (145)
npm run build ->  ✓ built in 1.17s;  PWA v1.3.0 precache 5 entries;  dist/sw.js generated
```

**Mutation check.** All 12 tests were green on the first run, so each was checked against a
deliberate break of the code it claims to cover. Every mutation was reverted with
`git checkout --`; `git status` was confirmed clean afterwards.

| # | Mutation | Result |
|---|---|---|
| 1 | `reannounce` also returns `status` + `servingAt` | **3 of my panel tests fail** — and the pre-existing `QueuePanel.test.tsx` passes clean |
| 2 | `newlyAnnounced`: `announcedAt > was` → `>= was` | 1 display test fails (after the fix below) |
| 3 | `useServingAlert`: drop the flash-clearing `setTimeout` | 1 display test fails |
| 4 | `newlyAnnounced` always returns `[]` | 4 display tests fail |
| 5 | re-announce button also rendered on waiting cards | 1 panel test fails |

Mutation 1 is the important one: it reproduces the precise bug the plan warned about, my new
file goes red, and the existing test file stays **entirely green**. That is direct evidence
the `objectContaining` gap was real and is now closed.

**Mutation 2 did not fail on the first attempt, and that mattered.** My test "a snapshot that
does not bump announcedAt is silent" added a new *waiting* order to force the alert effect to
re-run — but `useServingAlert` keys its effect on the **serving** set only, so a waiting order
never reaches it and the comparison was never exercised. The test was passing on the key memo,
not on the logic it named, and its comment asserted something false. I replaced it with a case
that changes the serving set (one of two orders finishes), which does re-run the effect and
re-compare an unchanged `announcedAt`; that case fails under the mutation. Committed
separately as `test(display): make the "no re-announce" case actually exercise the comparison`.
The `>` vs `>=` distinction is also covered by the pre-existing `queueView.test.ts` unit test.

## What I did NOT do

- **No production code touched.** `git diff main..HEAD --stat` is 2 new test files plus
  `AUTOPILOT.md`. Nothing in `src/` outside `*.test.tsx` changed.
- **Did not merge or rebase onto `..._0009` / `..._0026`.** They are still unmerged; this
  branch was cut from `main`. I only copied the plan file across, which is why the test count
  here (145) does not match what a merged tree would show.
- **Did not touch the `## Portfolio` block's "129 automated tests".** It is stale on every
  branch and the count differs per branch; correcting it is a separate call, not this task.
- **Did not start the เรียกเจาะจง criterion**, though the survey for it is written into
  `## Next task` — one task per round.

## Risk

- **Low overall: this round adds tests only**, so it cannot change runtime behaviour. The
  worst case is a test that proves less than its name claims.
- **The reviewer should look hardest at `DisplayReannounce.test.tsx`.** One test in it
  (`a new waiting order arriving does not re-announce...`) is held up by the alert hook's key
  memo rather than by `newlyAnnounced`'s comparison — I found this via mutation 2 and said so
  in a comment on the test instead of deleting it, because the behaviour it asserts is still
  worth locking down. It is defence-in-depth, not a proof of the comparison. The test directly
  below it is the one that proves the comparison.
- **Merge conflict surface:** `AUTOPILOT.md` will conflict with `..._0009` and `..._0026` when
  these branches land, since all three edit the criteria list and the `## Next task` block.
  This branch's copy is the newest (0026's content plus the ประกาศซ้ำ tick), so on conflict
  **take this branch's version of `AUTOPILOT.md`**. The test files themselves are new
  filenames and should not conflict with anything.
- **`Date.now()` in two panel tests.** `the re-announced time is newer...` asserts
  `announcedAt >= <time captured before render>`, using real wall-clock. It is not
  flaky-by-clock in a normal run, but it would fail if the system clock jumped backwards
  mid-test.
