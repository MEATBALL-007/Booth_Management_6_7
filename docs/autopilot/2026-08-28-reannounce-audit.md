# ประกาศซ้ำ / re-announce — what is proved, and what is not

Round of 2026-08-28, branch `auto/Booth_Management_6_7/2026-08-28_0044`.

Criterion (`2026-08-04-queue-pro-upgrade-design.md`):

> ประกาศซ้ำ: กดบน serving → Display เล่นเสียง+ไฟสำหรับเลขนั้นอีกครั้ง (announcedAt เด้ง)

Evidence: `src/reannounce.audit.test.tsx`, 15 tests in four sections.
No production code was changed this round — the criterion was already
implemented; what was missing was any test that it holds.

## The path a press travels

```
QueuePanel.tsx:74   🔔 button  ─→ Q.reannounce(o, Date.now())
queueActions.ts:31  reannounce ─→ { announcedAt: now }   (serving only, else null)
                    updateOrderStatus → Firestore (merge)
DisplayScreen.tsx:26 serving.map → { n, announcedAt }
queueView.ts:18     newlyAnnounced(prev, next)  — announcedAt > was
useServingAlert.ts  playChime() + setFlashing(true), cleared after 2500ms
```

The Display is **not** told to re-announce. It re-derives "something is newly
announced" by diffing the previous serving signature against the current one.
That is why the criterion is expressible at all without a delivery guarantee:
any device that *observes* the `announcedAt` bump announces.

## Provenance

The test file was lifted verbatim from commit `68eb1c4` on branch
`auto/Booth_Management_6_7/2026-08-25_0030`. That branch forked from `735de75`,
the same commit this branch sits on, so it applied with no production-code
changes underneath it and no conflict. Confirmed with
`git diff --stat 735de75 6ceb377`: that branch touches only tests, docs and the
ledger.

**It was not taken on trust.** Every test in it was mutation-checked here, from
predictions written before the runs. See the matrix below.

## The trap this file exists to avoid

Spec §4 says the Display announces when EITHER (ก) a number newly enters
`serving`, OR (ข) a serving order's `announcedAt` rises. `newlyAnnounced` treats
a number missing from the previous snapshot as new (`was === undefined`), so
path (ก) will make a screen-level test pass **without proving anything about
`announcedAt`**. This criterion is path (ข) only.

Every screen-level test therefore keeps the same order id and the same queue
number inside `serving` across both snapshots, and asserts the number never
left. C3 pins path (ก) explicitly as documented behaviour rather than leaving it
as an accident that a future reader might "fix".

## Mutation matrix

Nine mutations, each applied alone to production code and reverted after.
The predicted red set was written down *before* each run; all nine matched
exactly.

| # | Mutation | Predicted red | Actual red |
|---|---|---|---|
| M1 | `reannounce()` returns `{}` (drops `announcedAt`) | A1, B1, B2, B4 | A1, B1, B2, B4 ✅ |
| M2 | `newlyAnnounced`: `>` → `>=` | C1, C3 | C1, C3 ✅ |
| M3 | `newlyAnnounced`: `>` → `!==` | C2, D3 | C2, D3 ✅ |
| M4 | flash never (`setFlashing(true)` → `false`) | D1, D3, D5, D6 | D1, D3, D5, D6 ✅ |
| M5 | flash always (`return flashing` → `return true`) | D2, D3, D6 | D2, D3, D6 ✅ |
| M6 | `reannounce` loses its `status !== 'serving'` guard | A2 | A2 ✅ |
| M7 | `playChime()` never called | D1, D3, D4, D5, D6 | D1, D3, D4, D5, D6 ✅ |
| M8 | panel re-announces *every* serving order | B4 | B4 ✅ |
| M9 | the 🔔 button leaks onto waiting cards | B3 | B3 ✅ |

Per-test kill coverage — **no test is green for free**:

| Test | Killed by |
|---|---|
| A1 | M1 |
| A2 | M6 |
| B1 | M1 |
| B2 | M1 |
| B3 | M9 |
| B4 | M1, M8 |
| C1 | M2 |
| C2 | M3 |
| C3 | M2 |
| D1 | M4, M7 |
| D2 | M5 |
| D3 | M3, M4, M5, M7 |
| D4 | M7 |
| D5 | M4, M7 |
| D6 | M4, M5, M7 |

### Two mutations that had to be repaired before they meant anything

**M6 silently did not apply on the first run.** The pattern ended in `return
null\n`, but the file is CRLF, so the literal `\n` never matched after `null`.
The harness printed `DID NOT MATCH … proves nothing` rather than an empty red
set — without that guard the honest reading would have been "A2 is worthless",
which is the exact opposite of the truth. A mutation harness needs a match
assertion for the same reason these tests need spine assertions.

M6 also had to be **anchored** on `export function reannounce`: the identical
line `if (order.status !== 'serving') return null` appears in `markDone` and
`skip`, so an unanchored replace mutates a different function and produces a red
set that says nothing about this criterion.

**M9 did not exist at first.** B3 survived M1–M8 — it was the one test with no
mutation aimed at it. M9 was added specifically to attack it. This is worth
recording: running a mutation set and finding it green is not the end of the
check; the union of the red sets has to cover *every* test, and B3 was the gap.

## Scope of the evidence — read before trusting a green run

- `ordersRepo` and `display/chime` are **mocked whole**. Nothing here writes
  Firestore and no sound leaves a speaker. "chime" means `playChime` was called;
  "the panel announced" means the patch handed to `updateOrderStatus` had the
  right shape. A broken audio file, a muted tab, or an autoplay policy would all
  still be green here.
- jsdom runs **no cascade and no layout**. "ไฟ" (flash) means the root element
  *declared* `animate-pulse` / `bg-phantom-orange/30` — not a measured pixel, not
  a colour, not a visible change.
- **"สำหรับเลขนั้น" (for that number)** is provable at the selector and the
  panel: `newlyAnnounced` returns exactly the bumped number (C1), and the panel
  writes only the pressed card's order (B4). It is **not** provable of the flash:
  the flash is a class on the root of the whole screen, so it is per-screen by
  construction (D5 says this out loud rather than pretending otherwise). If the
  spec truly wants a per-number flash, that is unbuilt, and no test here hides it.
- The whole-screen pulse is asserted on the **render container's** root, not
  `document.body.firstElementChild` (Testing Library's wrapper, which carries no
  classes — every `not.toContain(...)` would pass against `""`). The green LIVE
  dot at `DisplayScreen.tsx:40` carries `animate-pulse` permanently, so
  "is anything pulsing?" is green even on a dead screen. D2 pins that trap.
- D6 fakes **only** `setTimeout`/`clearTimeout` via `toFake`. A bare
  `vi.useFakeTimers()` also replaces `Date.now`, which would silently defeat the
  hand-held clocks in B1/B2/B4.
- Firestore's merge semantics are not exercised. A1 uses `toStrictEqual` so a
  smuggled `status: undefined` key cannot hide, but the real write path is
  the Undo criterion's territory, not this one's.

## Status

Criterion **ประกาศซ้ำ ticked**. Suite 147 → 162 tests, `npm run build` passes.
