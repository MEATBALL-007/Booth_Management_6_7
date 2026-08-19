# Round summary — 2026-08-20_0042 · criterion: **Idempotency**

> กดซ้ำ/สองเครื่องพร้อมกัน ไม่ดึงซ้อน/ข้ามผิด (guard คืน no-op)

## What I did

- **Found a real bug and fixed it** — this was not a test-only gap. `apply()` in
  `src/screens/QueuePanel.tsx` had no duplicate protection at all, so pressing
  **`เรียกคิวถัดไป` twice before Firestore echoed back pulled `o1` twice and never called
  `o2`**. Staff would believe two customers were called when only one was.
- Fix (`62a6222`): `const written = useRef(new Set<string>())` records every order id written
  since the last snapshot; `apply()` returns a no-op for ids in the set. **Every snapshot
  clears the set** (fail-open — a write that never lands cannot wedge a card), and the lock
  is **per order**, so two different numbers can still be called back to back.
- Added `src/screens/QueuePanel.idempotency.test.tsx` — 7 tests, new file so it collides with
  no sibling autopilot branch: double-tap on `เรียกคิวถัดไป` / `เรียก` / `เสร็จ` / `ประกาศซ้ำ`,
  the guard releasing on the next snapshot, per-order independence, and the documented gap.
- Strengthened the release test (`02af614`) after the mutation check caught it passing
  against a guard that never released — see Verification.
- Synced `AUTOPILOT.md` from branch `_0031` first (`f2eaabc`); the working copy still had the
  stale Undo task, exactly as the plan warned. Ticked Idempotency, handed off "Display:
  จัดกึ่งกลางทุกจอ" with a pointer scan of `DisplayScreen.tsx`.

## Why

The panel derives every decision from the last Firestore snapshot. Between a tap and the echo
it is looking at state it has **already acted on**, so `Q.callNext` re-selects the same order
and `callSpecific`'s `status !== 'waiting'` guard never sees the new status. Firestore's
latency compensation usually hides this, but that is a property of the transport, not a guard
— and the criterion asks for a guard.

I chose an in-flight id set over an optimistic UI overlay deliberately: the overlay would have
made the pure guards reachable, but it renders state the server may never reach. On a live
school-event system, a panel that shows a call that silently failed is worse than a duplicate
write. The id set changes nothing about what is rendered.

Clearing the whole set on **any** snapshot (rather than only when the expected status arrives)
is also deliberate. It slightly weakens the guard — an unrelated order's update reopens the
window for an instant — but it makes a stuck lock impossible. Fail-open was the right side to
err on here.

## Verification

- `npm test` → **40 files, 140 tests, all passing.** `npm run build` → built in 1.16s, PWA
  `generateSW` produced `dist/sw.js` (5 precache entries). Both run at their final state.
- **Mutation check — 4 breaks, all 7 tests killed by at least one:**

  | break | effect |
  |---|---|
  | remove the `written.current.has` guard (i.e. the code as it was before this round) | 4 red — the double-tap tests |
  | remove `written.current.clear()` on snapshot (guard latches forever) | 1 red — the release test |
  | `written.current.size > 0` (lock whole panel, not one order) | 2 red — release + per-order |
  | remove `status !== 'waiting'` from `callSpecific` | 1 red — the GAP test |

- Evidence the bug was real, from the first break:
  `expected [ [ 'o1', … ], [ 'o1', … ] ] to strictly equal [ [ 'o1', … ] ]` — `o1` written
  twice, `o2` never.
- **A test I wrote was wrong and the mutation check is the only thing that caught it.** My
  first "the guard releases" test pressed `เรียกคิวถัดไป` again after the echo and asserted it
  advanced to `o2`. That passes even when the guard never releases, because `o2` was never
  locked — a panel that permanently deadens every card it touches would have shipped green.
  Rewritten to act on the **same** order across the echo (call `o1` → echo → finish `o1`).

## What I did NOT do

- **Did not fix the two-devices-at-once case, on purpose.** Device B holding a stale snapshot
  sees `waiting`, so `callSpecific` returns a patch and B clobbers A's `servingAt`/
  `announcedAt`. Closing it needs a Firestore transaction or a compare-and-set rule, and
  `firestore.rules` is explicitly out of scope. Locked in as an executable record —
  `GAP: a device on a stale snapshot still writes — the guard is client-side only` — so adding
  a transaction later shows up there as a deliberate change rather than a silent one.
- Did not port branch `_0031`'s `*.callSpecific.test.tsx` files into this branch. The runner
  cuts every branch from `main` and never merges, and prior rounds only ever carried the
  ledger across. See Risk.
- Did not touch `firestore.rules`, `firestore.indexes.json`, `docs/superpowers/specs/`,
  `.env*`, or accounting/menu/comms logic. No new dependencies.

## Risk

- **The production change is in a live queue panel.** Reviewers should focus on one question:
  can `written` ever hold an id when no further snapshot will arrive? If so, that card's
  buttons go dead. I judged no — Firestore fires a local snapshot for its own local writes
  (offline included), and *any* order's update clears the set — but this is the failure mode
  worth a second opinion.
- Behaviour change worth naming: a deliberate second `ประกาศซ้ำ` within the echo window is now
  swallowed. Staff wanting to re-announce twice in quick succession get one chime. I think
  that is right (an accidental double-tap is far more likely than a deliberate double
  announce), but it is a judgement call, not a fact.
- **`AUTOPILOT.md` on this branch now claims the callSpecific criterion is ticked and cites
  commits `d2f47b2`/`aa260fc`, which do not exist on this branch** — they are on `_0031`,
  unmerged. The ledger tracks work across branches by convention; anyone reading this branch
  alone will not find those tests. Same will be true of this round's work for the next branch.
- The 7 new tests assert against a **mocked** `ordersRepo`. They prove the panel's write
  behaviour, not Firestore's. Nothing here was exercised against a real Firestore instance.
