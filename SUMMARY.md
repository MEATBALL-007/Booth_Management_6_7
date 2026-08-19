# Round 2026-08-20 (0031) — criterion "เรียกเจาะจง" (call a specific number, out of order)

## What I did

- Added `src/screens/QueuePanel.callSpecific.test.tsx` (4 tests) — pins the **exact** patch the
  panel writes with `toStrictEqual` on the whole `updateOrderStatus.mock.calls` list, proves that
  calling the back of the queue leaves the orders it jumped over still waiting, that
  `เรียกคิวถัดไป` afterwards still takes the *oldest* one left, and that the `เรียก` button is
  rendered on waiting cards only.
- Added `src/screens/DisplayScreen.callSpecific.test.tsx` (5 tests) — the customer-facing half:
  the out-of-order number takes the serving spot, the skipped-over ones stay in the get-ready and
  up-next zones, and the display announces with chime + flash. First time the
  `was === undefined` branch of `newlyAnnounced` is exercised from the callSpecific direction.
- Ticked the `เรียกเจาะจง` acceptance criterion in `AUTOPILOT.md` with the evidence.
- Rewrote the stale `## Next task` block (it still described the Undo round, several rounds old)
  with a surveyed handoff for the **Idempotency** criterion.
- **No production code was changed.** The implementation was already correct; the gap was entirely
  in the tests.

## Why

The pre-existing `QueuePanel.test.tsx:73-83` already clicked the second waiting order, so the
criterion looked half-covered. It asserted with `expect.objectContaining({ status: 'serving' })`,
which ignores extra fields — and `updateOrderStatus` is a Firestore **merge**, so any extra field
in the patch lands on the real document. I asserted on the whole call list with `toStrictEqual`
instead, which pins the id, both timestamps, the absence of stray fields, *and* the number of
writes.

`Date.now` is frozen with `vi.spyOn`, not fake timers, because `userEvent` drives its own timers
and swapping them mid-click is a known way to hang the suite.

## Verification

Ran the Verify command myself:

- `npm test` → **41 files, 142 tests passed** (133 before, +9 new).
- `npm run build` → built in 1.18s, PWA `generateSW` emitted `dist/sw.js` (pre-existing
  >500 kB chunk-size warning, unchanged).

Non-vacuity: I broke the production code **10 different ways** and re-ran. Every one of the 9 new
tests is killed by at least one mutation; all mutations were reverted (`git status` clean).

| # | Mutation | Result |
|---|---|---|
| 1 | `callSpecific` drops `servingAt` | new test red (pure test also red) |
| 2 | **panel** leaks a bogus `doneAt` into the patch | **new test red; all 16 pre-existing tests green** |
| 3 | `เรียก` always calls the front of the line | 2 new tests red |
| 4 | `callNext` sorts newest-first | 1 new test red |
| 5 | `newlyAnnounced` drops the `was === undefined` branch | 2 new tests red |
| 6 | flash classes removed from the display root | 1 new test red |
| 7 | `upNextOrders` leaks the serving order | 1 new test red |
| 8 | `servingOrders` filters `waiting` | all 5 display tests red |
| 9 | chime guard `> 0` → `>= 0` | 1 new test red (only D5 catches it) |
| 10 | `เรียก` also rendered on skipped cards | 1 new test red |

Mutation 2 is the evidence the gap was real: the panel writes a `doneAt` onto an order that is
only just starting to be served — a field that would reach the live Firestore document through the
merge — and the entire pre-existing suite (`QueuePanel.test.tsx` + `queueActions.test.ts`, 16
tests) stays green. Only the new `toStrictEqual` assertion catches it.

## What I did NOT do

- **Did not touch production code.** Nothing was broken, so there was nothing to fix. The 10
  mutations were applied and reverted purely as evidence; the tree is clean.
- **Did not start the Idempotency criterion**, even though double-click behaviour surfaced while I
  was reading `apply()`. One task per round. It is written up as the next task with the specifics.
- **Did not delete or rewrite the pre-existing `QueuePanel.test.tsx:73-83` test**, even though its
  `objectContaining` assertion is the weak one. Other unmerged branches own that file (per
  `MEMORY.md`), so touching it would collide. The new file supersedes it in strength without
  conflicting.
- Did not add a test for `callSpecific`'s `status !== 'waiting'` guard being hit at the UI level —
  it cannot be, since the button only renders on waiting cards. I locked that fact down instead.

## Risk

Reviewers should look closely at:

1. **The `เรียก` regex.** All three of `เรียก`, `เรียกคิวถัดไป`, `เรียกซ้ำ` share a prefix. The new
   tests use the anchored `/^เรียก$/`; an unanchored query would silently match the wrong button
   and pass for the wrong reason. This is load-bearing, not cosmetic.
2. **Test D5 ("finishing … announces nothing") is the only test that catches mutation 9.** It works
   because it changes the *serving set* — `useServingAlert` keys off the serving set only, so a
   "should not announce" case that merely changes a waiting order would re-run nothing and pass
   vacuously. If someone rewrites that test, this property is easy to lose.
3. **Idempotency is genuinely unproven and may be a real bug, not just a test gap.** `apply()` in
   `QueuePanel.tsx:24-28` has no in-flight guard, so a double-click before Firestore echoes back
   appears to fire `updateOrderStatus` twice. I did not investigate further — out of scope this
   round — but the next round should treat it as a suspected defect rather than a documentation
   task.
4. **The criterion says "ข้ามลำดับได้" (can skip the queue order); it does not say anything about
   what should happen to the skipped-over orders.** I read that as "they stay waiting, untouched,
   and keep their place" — the reading the code already implements. If the school actually wants
   jumped-over orders flagged somehow, my tests now lock in the opposite behaviour.
