# เรียกเจาะจง (call a specific number) — audit, 2026-08-29

Criterion (`docs/superpowers/specs/2026-08-04-queue-pro-upgrade-design.md`):

> เรียกเจาะจง: กด "เรียก" บน waiting เลขใดก็ได้ → serving (ข้ามลำดับได้)

**Verdict: met by the production code as it already stands. No production change
was needed or made.** `callSpecific` (`src/queue/queueActions.ts:11`) and the เรียก
button on the waiting card (`src/screens/QueuePanel.tsx:88`) were both correct;
what was missing was evidence. This round added `src/callSpecific.audit.test.tsx`
(10 tests) and mutation-checked it.

## What was already proven elsewhere, and what was not

| Claim | Where it already lived | Gap |
|---|---|---|
| waiting → serving patch shape | `queueActions.test.ts:23` | uses `toEqual` — blind to smuggled `undefined` keys (see M3) |
| non-waiting → null | `queueActions.test.ts:24` | only `serving` was covered, not done/skipped/cancelled |
| undo restores after a callSpecific | `undoRoundTrip.audit.test.tsx:73,78` | about undo, not about skipping the line |
| pressing เรียก on the 2nd card writes `o2` | `undoRoundTrip.audit.test.tsx` (B2) | one card deep; says nothing about a queue with several cards in between |

Nothing anywhere proved: the last of a long line can be called, that the other
waiting orders are left alone, that the button is confined to waiting cards, or
that the Display announces a number called out of turn.

## The selector trap this file exists to avoid

Three buttons in `QueuePanel` start with เรียก:

| Label rendered | Action | Card |
|---|---|---|
| `เรียกคิวถัดไป · Call next` | `callNext` | panel header |
| `เรียก` | `callSpecific` | waiting |
| `เรียกซ้ำ` | `recall` | skipped (พักไว้) |

`getByRole('button', { name: /เรียก/ })` matches all three. A test asserting
"the เรียก button is absent from parked cards" written with a regex finds the
`เรียกซ้ำ` button that lives on exactly those cards and passes for the wrong
reason. Every selector in the audit file passes the name as an exact **string**
(Testing Library does a full-string match after normalisation), and B3 pins the
trap itself so a future rewrite to a regex fails loudly.

## Mutation check — 10 mutations, predicted before running, 10/10 matched

Each row's red set was written down before the run. Reverted with a path-scoped
`git checkout -- <file>` after each; the audit file was committed first
(`4c16894`), because `git checkout -- src` would have taken it with it.

| # | Mutation | Predicted red | Actual red | ✓ |
|---|---|---|---|---|
| M1 | drop `callSpecific`'s `status !== 'waiting'` guard | A2, B4 | A2, B4 | ✓ |
| M2 | `callSpecific` omits `announcedAt` | A1, A3, B1, B2 | A1, A3, B1, B2 | ✓ |
| M3 | `callSpecific` returns an extra `doneAt: undefined` | A1, A3, B1, B2 | A1, A3, B1, B2 | ✓ |
| M4 | remove the เรียก button from waiting cards | B1, B2, B3 | B1, B2, B3 | ✓ |
| M5 | also render เรียก on serving cards | B3, B4 | B3, B4 | ✓ |
| M6 | เรียก always calls `waiting[0]` — the line cannot be skipped | B1, B2 | B1, B2 | ✓ |
| M7 | remove `if (!patch) return` from `apply` | **none** | **none** (208/208) | ✓ |
| M8 | Display renders only the first serving order | C3 | C3 | ✓ |
| M9 | `upNextOrders` sorts newest-first | C1, C2 | C1, C2 | ✓ |
| M10 | Display never chimes or flashes | C1, C3 | C1, C3 | ✓ |

Every one of the 10 tests has at least one killer — the union of the red sets
covers A1 A2 A3 B1 B2 B3 B4 C1 C2 C3 with nothing left over. Checked explicitly,
because a full-green mutation sweep is not the same as full coverage: a test with
no killer is a test asserting nothing, and previous rounds shipped two of those.

### M3 is the one worth remembering

M3 makes `callSpecific` return `{ status, servingAt, announcedAt, doneAt: undefined }`.

- new `callSpecific.audit.test.tsx` → **4 red**
- pre-existing `queueActions.test.ts` → **8 passed, fully green**

The old file uses `toEqual`, which ignores keys whose value is `undefined`. This
is not a style quibble: since the carried Undo fix, `ordersRepo.updateOrderStatus`
translates `undefined` into a `deleteField()` sentinel, so that patch would have
silently deleted `doneAt` from a live document. `toStrictEqual` on the whole
`mock.calls` list is what catches it.

### M6 is the criterion itself

Under M6 (every เรียก press calls the head of the queue instead of the pressed
card) the **whole 208-test suite loses only 4 tests, two of them from this new
file**. Before this round the suite had exactly two tests standing between the
product and a "cannot skip the line" regression.

### M7 was predicted green, and that is a finding, not a hole

`apply()`'s `if (!patch) return` is unreachable through the current UI: every
call site either guards first (`doCallNext`, `confirmCancel`) or can only run on
a card whose status already satisfies the action's guard. Removing the line
leaves all 208 tests green. It is genuine defence-in-depth, not dead weight —
but no screen-level test can reach it, which is why B4 pins the two layers
separately and says so in prose instead of faking a press the real screen cannot
produce.

## ขอบเขตของหลักฐาน (scope of the evidence) — what is NOT proven

- **Nothing touches Firestore.** `ordersRepo` and `display/chime` are mocked
  whole. "the panel called it" means the patch handed to `updateOrderStatus` had
  the right shape and the right id. No sound leaves a speaker.
- **No pixel is measured.** jsdom runs no cascade and no layout. The flash is
  asserted as a declared class on the Display root, nothing more.
- **The status guard is not exercised through the UI.** The panel renders เรียก
  only inside the `waiting` list, so a press can never hand `callSpecific` a
  non-waiting order. B4 proves layer 1 (no button exists) and layer 2 (the action
  refuses) separately. Combined with M7, the honest statement is: this guard is
  correct and untriggerable from today's screen.
- **"ข้ามลำดับได้" is proven twice, non-overlappingly** — structurally at the
  action (A3: `callSpecific` takes one order and no list, so it has no ordering
  input it *could* obey) and behaviourally at the panel (B1/B2: the last and the
  middle card of a five-deep queue each write only themselves). Neither test
  subsumes the other; M6 kills both, M2/M3 kill only the panel pair.
- **Concurrency is out of scope here** — see below. This criterion is about one
  press on one device.

## Verified lead for the Idempotency round (do not re-derive this)

Two presses of เรียก on the same card, with **no new snapshot arriving between
them**, produce **two writes**. Measured this round with a throwaway probe (since
deleted, nothing committed):

```
[ 'o1', { status: 'serving', servingAt: 1000, announcedAt: 1000 } ]
[ 'o1', { status: 'serving', servingAt: 2000, announcedAt: 2000 } ]
```

The panel's `waiting` list only changes when a snapshot arrives, so the second
click still closes over an order whose `status` is `'waiting'` and
`callSpecific`'s guard passes again. The guard is a **snapshot-state** guard, not
a write-once guard — it cannot debounce a press it has not been told about yet.

Whether that is a defect is the *next* criterion's call, not this one's:
> Idempotency: กดซ้ำ/สองเครื่องพร้อมกัน ไม่ดึงซ้อน/ข้ามผิด (guard คืน no-op)

Note the same shape almost certainly applies to `markDone`, `skip`, `recall` and
`reannounce`, and that the two-device case is a different mechanism again
(Firestore last-write-wins, not a stale React closure). Deliberately left alone
this round — one task per round.
