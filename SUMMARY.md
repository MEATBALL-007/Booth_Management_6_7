# Round summary — Idempotency

Branch: `auto/Booth_Management_6_7/2026-08-30_0004`

## What I did

- **Carried the four already-proven criteria onto this branch first.** The runner cut
  this branch fresh from `main` (735de75), so it started with 0 of 4 — exactly the
  failure the plan warned about, now three rounds running. Carried by explicit path,
  never a blanket `checkout -- src/`. 131 → 208 tests. (`848b08a`)
- **Found and fixed a real production bug** for the Idempotency criterion. Unlike the
  previous four criteria (where the code was already right and only tests were
  missing), this one was genuinely broken: pressing a queue button twice before a
  Firestore snapshot arrived wrote **twice**.
- **Confirmed the bug across all five transition buttons** — `เรียก`, `เรียกคิวถัดไป`,
  `เสร็จ`, `ข้าม`, `เรียกซ้ำ` — by writing the tests first and watching exactly those
  five go red. The plan predicted this but told me to verify rather than assume.
- **Wrote `src/idempotency.audit.test.tsx`** (14 tests) and mutation-checked it with
  8 mutations, predicting the red set before each run: **8 of 8 correct**.
- **Recorded the audit** in `docs/autopilot/2026-08-30-idempotency-audit.md`, including
  a "ขอบเขตของหลักฐาน" section listing what is *not* proven.

## Why

**The bug.** The guards in `queueActions.ts` (`if (order.status !== 'waiting') return null`)
test the order object they are *handed*. `QueuePanel` hands them an order from its render
closure, which only changes when a snapshot arrives. Two presses in one render generation
therefore both see the old status and both write. It is a **snapshot-state guard, not a
write-once guard** — it cannot debounce a press it has not been told about yet.

**Where I fixed it.** In `QueuePanel.tsx`, not `queueActions.ts`. A pure function handed one
order has no memory and cannot refuse a repeat; only the panel knows a write is in flight.

**Three judgement calls worth reviewing:**

1. **Only patches carrying `status` are held.** `ประกาศซ้ำ` changes no status — the spec's
   own action table calls it `serving (ไม่เปลี่ยนสถานะ)` — and pressing it repeatedly *is*
   the feature. Mutation M3 confirms this is load-bearing: guarding everything reddens C1,
   C2 and the existing `reannounce.audit` B2.
2. **A snapshot clears the whole set**, not just ids observed to change. Deliberate: precise
   clearing would leave a button dead forever if a write never echoed back, and a dead
   button at a live school booth is worse than one extra write in a race already lost.
3. **Undo bypasses the hold and also releases it.** Mutation M8 confirms this: routing undo
   through the guard reddens D2, D3 **and 8 existing Undo tests**.

**Two-device case: recorded as an open gap, not faked.** It is a different mechanism
(Firestore last-write-wins across clients, not a stale React closure) and this change does
not address it. The plan explicitly permits recording a gap rather than pretending to close
one, so `E1` pins the current two-panel behaviour honestly and the audit note says what
closing it would take.

## Verification

Verify command, run unmodified:

```
npm test && npm run build
```

```
Test Files  45 passed (45)
     Tests  222 passed (222)

dist/assets/index-Bw7t4m74.js   852.00 kB │ gzip: 257.64 kB
✓ built in 2.86s
PWA v1.3.0  precache 5 entries (846.57 KiB)  files generated dist/sw.js
```

RED phase before the fix — exactly the 5 transition buttons plus 2 structural tests:

```
× B1 เรียก  × B2 เรียกคิวถัดไป  × B3 เสร็จ  × B4 ข้าม  × B5 เรียกซ้ำ  × B6  × D1
Tests  7 failed | 7 passed (14)
```

Mutation check — predicted the red set before each run, **8 of 8 correct**:

| # | Mutation | Predicted | Actual |
|---|---|---|---|
| M1 | drop `moved.current.clear()` on snapshot | D1 | D1 + 1 existing |
| M2 | drop the `has(id)` early return | B1–B6, D1 | exactly those 7 |
| M3 | guard every patch (incl. reannounce) | C1, C2, reannounce B2 | exactly those 3 |
| M4 | drop `delete(undo.id)` in `runUndo` | D3 | D3 only |
| M5 | key the set on a constant | B6, D3 | exactly those 2 |
| M6 | remove `markDone`'s status guard | A2 + others | A2 + 1 |
| M7 | `markDone` omits `doneAt` | A1 + others | A1, B3, B6, D2, D3 + 3 |
| M8 | make `runUndo` respect the guard | D2, D3 | D2, D3 + 8 Undo tests |

Union of red sets covers every test in the file **except E1** — see Risk.

## What I did NOT do

- **Did not close the two-device race.** Not provable with a stale-closure fix; it needs
  `runTransaction` or a conditional update, which touches the repo layer and
  `firestore.rules` — the latter is explicitly out of scope. Recorded as a gap instead.
- **Did not touch `queueActions.ts` behaviour.** Its guards are correct as the spec
  specifies them; they are just not sufficient alone. Left as-is.
- **Did not modify any existing test file.** All new work is in one new file, per the
  standing rule that unmerged sibling branches own the existing files.
- **Did not touch** `firestore.rules`, `firestore.indexes.json`, `.env*`, `.firebaserc`,
  `docs/superpowers/specs/`, or accounting/menu/comms logic. No new dependencies.
- **Did not start the next criterion** (Display centering), though it is now queued.

## Risk

**Look closely at these:**

1. **`E1` has no killer among the 8 mutations.** I checked rather than glossed over it: it
   is *intentional*. E1 does not prove code correct — it pins an open gap (two panels still
   produce two writes). Its killer is the future fix. If E1 ever goes red, someone has
   closed the cross-client race and should read the audit note, not "fix" the test. A
   reviewer who disagrees with encoding a gap as an assertion should say so — it is the one
   test here that asserts a deficiency.
2. **The release is driven by "a snapshot arrived", not "our write came back."** A snapshot
   that does not yet carry our write re-opens the window early. This is a deliberate
   trade against permanent button lockout, but it means the guard is best-effort, not a
   hard invariant. D1/D3 prove nothing can latch shut; nothing proves the window is minimal.
3. **`apply()` is used by every queue button**, so a mistake here would break undo, no-show
   and re-announce simultaneously. All 208 pre-existing tests pass, and M3/M8 show the
   existing suite genuinely does catch over-guarding — but this is the highest-blast-radius
   line in the round.
4. **`moved` is a `useRef`, so blocked presses are silent** — no visual feedback that a
   second tap was swallowed. Behaviourally correct per the spec ("guard คืน no-op") but a
   booth operator gets no signal. A disabled-button state would be friendlier; that is a
   UI change beyond this criterion and I left it.
5. **Nothing here reached real Firestore.** `ordersRepo` is mocked whole; "no second write"
   means `updateOrderStatus` was not called again, not that Firestore would reject it.
