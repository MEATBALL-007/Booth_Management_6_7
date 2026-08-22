# Round summary — 2026-08-23 (0009)

Criterion closed: **"Display เลขคิวสเกลใหญ่ตามจอด้วย clamp"** — the last open item of
spec `2026-08-03-ui-overhaul-design.md`. **That spec is now 5/5 on this branch.**

## What I did

- **Synced the stale plan first.** The working copy's `AUTOPILOT.md` was 533 lines behind
  the newest branch (`_0054`, tip `29526d3`) — it still carried the old 0-of-20 ledger.
  Adopted it before touching anything (`4dbff0e`).
- **Added `src/queueClamp.audit.test.tsx`** — 12 new tests, a brand-new file that collides
  with no other branch and stands alone (it cites no test file from an unmerged branch).
  Commit `89d997a`.
- **Decided the open question the plan flagged, on the spec's own authority.** `DisplayScreen`
  has three queue-number sizes; the criterion covers the serving number
  (`clamp(96px,22vw,320px)`) and the "เตรียมตัว" callout (`clamp(56px,10vw,140px)`), and
  **excludes the up-next pills** — spec `:59` says "UP NEXT pills **สะอาด**" and `:26` ties
  emphasis to "เลขคิว**ที่กำลังทำ**". The exclusion is locked by its *reason*, not by its
  current markup (see Risk).
- **Wrote `docs/autopilot/2026-08-23-display-clamp-audit.md`** (`942d8da`) — the decision, the
  mutation table, and an explicit statement of what the evidence does *not* cover.
- **Ticked the criterion and rewrote `## Next task`**, and corrected a false claim carried in
  the plan (see "What I did NOT do").

## Why

- **No production change was needed, and I made none.** Both clamps were already correct and
  already matched the spec's own worked example at `:50`. The gap was entirely in the tests.
- **`grep "clamp"` is not evidence, so the tests don't do that.** `clamp(96px,220px,320px)` is
  valid CSS containing the word `clamp` and never responds to screen width;
  `clamp(320px,22vw,96px)` is pinned shut because `min ≥ max`. The tests parse the expression
  and check the middle term's *unit* and that `min < max` — the two ways this criterion can be
  satisfied on paper and violated in fact.
- **Deliberately did not assert `96/22/320` literally.** Design is allowed to retune those; a
  literal assertion becomes an obstacle. The tests pin the *shape* and the *ordering*.
- **`C3` compares all three clamp parameters**, not just the `vw` term: winning on `vw` alone
  still loses on a narrow screen where the floor is what wins. All three is what makes
  "the serving number is biggest" true at *every* viewport width.

## Verification

Ran the Verify command myself, unmodified:

```
npm test        → Test Files 40 passed (40) · Tests 145 passed (145)
                  (was 39 files / 133 tests before this round)
npm run build   → ✓ built in 1.46s · tsc -b clean
                  PWA v1.3.0 / generateSW / precache 5 entries → dist/sw.js, workbox-*.js
```

The `chunk > 500 kB` warning is real and left alone — a warning, not an error (same call as
rounds 0020 / 0031 / 0036).

**Mutation check — 8 breaks, outcome predicted in advance for each, all 8 matched.**
Every one of the 12 tests is killed by at least one break.

| # | break | red |
|---|---|---|
| M1 | display clamp → `text-8xl` | B1 C1 C3 |
| M2 | `22vw` → `22px` | B1 C1 C3 |
| M3 | `clamp(320px,22vw,96px)` (pinned) | B1 C1 C3 |
| M4 | clamp copied onto `size="card"` | B2 B3 |
| M5 | callout clamp → `text-7xl` | C2 C3 D2 E1 E2 |
| M6 | pills → `md:text-8xl` | D2 |
| M7 | scanner blinded (`clamp`→`clampZZZ`) | A1 A2 B1 C1 C2 C3 D2 E1 E2 |
| M8 | size reader returns 0 instead of throwing | D1 |

**Size of the gap (M1, full suite):** `Test Files 1 failed | 39 passed (40)`,
`Tests 3 failed | 142 passed (145)` — replacing the criterion's clamp with a fixed size left
**all 39 pre-existing test files green**. Nothing in the repo noticed before today.

`git status --short` was clean after every revert and before each commit.

## What I did NOT do

- **No production code changed this round.** `QueueNumber.tsx` and `DisplayScreen.tsx` are
  byte-identical to where they started; every edit to them was a mutation that I reverted.
- **Did not touch the Neon Clarity bugs still present here.** This branch's `DisplayScreen.tsx`
  still has `shadow-[0_0_40px_rgba(...)]` (`:75`) and `glow-y` on the next-up number (`:84`),
  which round 0051 judged real bugs and fixed — **on branch `_0051`, which never merged**.
  That criterion is already ticked; fixing it here would be a second task. Recorded in the
  audit §8 so nobody reads this round as "checked and found nothing".
- **Named the audit doc `2026-08-23-…`, not the `2026-08-22-…` the plan asked for.** The plan
  was written a day earlier; every other audit doc is named for the date of its own round.
- **Corrected the plan's ledger claim instead of repeating it.** The plan states "spec
  `queue-pro-upgrade` ครบทั้ง 7 ข้อแล้ว". **That is false on this branch**: queue-pro has 8
  boxes, 5 ticked, and **Undo (`:17`), No-show (`:22`), ประกาศซ้ำ (`:23`) are still open** —
  their ticks live on branches that never merged. Whole-file tally is now **10 ticked / 10
  open / 20 total**, which matches the project goal's "20 ข้อ". Written into the handoff.
- **Did not start the Donation thermometer.** One task per round.

## Risk — what a reviewer should look at closely

1. **The evidence is structural, not physical.** jsdom runs no cascade and lays nothing out.
   No test here measures a pixel, a viewport, or a computed font-size. "เห็นสุดห้อง" is
   **not** proven — what is proven is that the declared value has a shape that scales and that
   the size ordering is right. Closing this at pixel level needs a real browser at
   360/768/1024/1920. I did not open one.
2. **The clamp in use stops scaling at 1455px.** `clamp(96px,22vw,320px)` pins at its 320px
   ceiling above ~1455px viewport width, so a 4K TV renders the number the same size as a
   1455px screen. I judged this **not** a violation — the spec offers this exact triple as its
   own example at `:50`, and a ceiling is what `clamp` is for. If a reviewer disagrees, that
   is the one place this tick could be argued down, so it's stated plainly rather than buried.
3. **`D2` encodes a judgement call, not a fact from the spec's criterion line.** The criterion
   text never mentions the pills. I excluded them on `:59` ("UP NEXT pills **สะอาด**") and
   `:26`. If someone reads the criterion as covering every number on the Display, then the
   pills (`text-xl md:text-2xl`, no clamp) are a **real production gap** and this tick is
   premature. My reasoning is in the audit §3; the counter-reading is not hidden.
4. **`B2`/`B3`/`D1` are the `toEqual([])`-shaped tests** that M7 proved go green when the
   scanner is blind. They are backed by M4 and M8 respectively, but they are the ones to
   re-check if this file is ever refactored.
5. **`E1`/`E2` read source text**, so a class assembled at runtime is invisible to them.
   `C1`/`C2`/`D2` are stronger — they read the rendered DOM.
