# No-show / เรียกซ้ำ — what is proved, and what is not

Round of 2026-08-28, branch `auto/Booth_Management_6_7/2026-08-28_0026`.

Criterion (`2026-08-04-queue-pro-upgrade-design.md`):

> ข้าม serving → skipped (หายจากจอลูกค้า, ขึ้นโซนพักไว้);
> เรียกซ้ำ → serving + Display ประกาศ (chime+flash)

Evidence: `src/noShowRecall.audit.test.tsx`, 14 tests in four sections.
No production code was changed this round — the criterion was already
implemented; what was missing was any test that it holds.

## Provenance

The test file was lifted verbatim from commit `4fdcf2b` on branch
`auto/Booth_Management_6_7/2026-08-25_0002`. That branch forked from `735de75`,
which is the same commit this branch sits on, so the file applied with no
production-code changes underneath it and no conflict.

**It was not taken on trust.** Every test in it was mutation-checked here, from
predictions written before the runs. See the matrix below.

## Mutation matrix

Eight mutations, each applied alone to production code, reverted after.
The predicted red set was written down *before* each run; all eight matched
exactly.

| # | Mutation | Predicted red | Actual red |
|---|----------|---------------|-----------|
| M1 | `queueView.servingOrders` filters `!== 'done'` (skipped leaks to the customer screen) | B1 B2 B3 B4 | B1 B2 B3 B4 ✅ |
| M2 | `queueActions.skip` guard removed | A3 | A3 ✅ |
| M3 | `queueActions.recall` drops `announcedAt` | A3 D1 **only** | A3 D1 ✅ |
| M4a | `DisplayScreen` never flashes (`flashing` → `false`) | D2 | D2 ✅ |
| M4b | `DisplayScreen` always flashes (`flashing` → `true`) | D3 D4 | D3 D4 ✅ |
| M5 | `QueuePanel` parked zone reads `status === 'done'` | C2 C3 D1 | C2 C3 D1 ✅ |
| M6 | parked zone renders unconditionally (`length >= 0`) | C1 | C1 ✅ |
| M7 | ข้าม button wired to `Q.markDone` | A1 | A1 ✅ |
| M8 | ข้าม button also rendered on waiting cards | A2 | A2 ✅ |

Every one of the 14 tests is killed by at least one mutation. None of them is
green-for-free.

Two results worth keeping:

- **M3 confirms the file header's own self-criticism.** Deleting `announcedAt`
  from `recall()` leaves *all four* Display tests (D2–D4) green, and B4 too.
  The Display re-announces because the number RE-ENTERS the serving set —
  `newlyAnnounced` in `display/queueView.ts` treats a number absent from the
  previous snapshot as fresh — not because `recall()` bumped the timestamp.
  Only D1, which pins the written patch with `toStrictEqual` at the panel,
  catches it. If someone deletes D1 as redundant, this criterion silently stops
  being covered while the suite stays green.
- **M4a and M4b are counterweights.** D2 alone would stay green on a screen
  that flashes permanently; D4 alone would stay green on a screen that never
  flashes. Both are needed, and D4's guard against the always-pulsing LIVE dot
  is doing real work — a "does anything on the page pulse?" assertion would be
  green in both mutant and healthy code.

## Scope of the evidence — read before trusting it

- `ordersRepo` and `display/chime` are mocked whole. Nothing here touches
  Firestore. **"chime" means `playChime` was called** — no audio is produced or
  measured.
- jsdom runs no CSS cascade and performs no layout. **"flash" means the root
  element's `className` contains `animate-pulse` / `bg-phantom-orange/30`** —
  no pixel changed, and nothing here would notice if the Tailwind class were
  renamed out from under it or overridden by a later rule.
- **"หายจากจอลูกค้า" is proved by sweeping `document.body.textContent`** for the
  number, which is stronger than checking known testids (a skipped number
  leaking into a new zone would still fail) — but it is a DOM fact, not a
  photograph of a screen in a school hall.
- Nothing here proves the *timing* of an announcement, only its occurrence and
  ordering across snapshots.
- Two-device concurrency is out of scope for this criterion; the Idempotency
  criterion covers it and is still unticked.

## Status of neighbouring criteria (project-level, easy to lose)

Each `auto/*` branch forks from `main` and none has ever merged back, so a
criterion proved on one branch is absent from every other:

- **Undo** — proved on `_2026-08-28_0009` (`ca1179f`). Not in this tree.
- **No-show** — proved here, and previously on `_2026-08-25_0002`.
- **ประกาศซ้ำ** — proved on `_2026-08-25_0030` (`68eb1c4`). Not in this tree.

`main` has none of the three.
