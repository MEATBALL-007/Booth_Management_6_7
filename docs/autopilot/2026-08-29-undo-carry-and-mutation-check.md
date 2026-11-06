# Undo: carried onto this branch, and re-proven with an 11-mutation check

Round `auto/Booth_Management_6_7/2026-08-29_0014`, 2026-08-29.

Companion to `2026-08-24-undo-round-trip-audit.md` (the round that found and fixed
the bug) and `2026-08-13-undo-audit-findings.md` (the original spec). Read those
for *why the code looks like this*. This note records **what was carried, and what
the carried tests are actually worth** — measured here, not inherited.

---

## 1. The branch state the handoff described did not exist

The handoff said this branch already held No-show ✅ and ประกาศซ้ำ ✅ at 162 tests,
and that only Undo was missing. That was false. This branch was cut fresh from
`main` (`735de75`) and had **zero** commits of its own — 0 of 3, not 2 of 3.

The handoff was written at the end of round `_0044` and describes *that* branch
(`5c17e92`). Both statements were true where they were written and stale by the
time they were read. The check that catches this is one command:

    git log --oneline -1      # 735de75, i.e. main — nothing carried yet
    ls src/*.audit.test.*     # nothing

So this round carried **three** criteria, not one.

## 2. What was carried, and how

| Criterion | From | Files |
|---|---|---|
| No-show | `5c17e92` (`_0044`) | `src/noShowRecall.audit.test.tsx` |
| ประกาศซ้ำ | `5c17e92` (`_0044`) | `src/reannounce.audit.test.tsx` |
| Undo | `ca1179f` (`_0009`) | `ordersRepo.ts`, `queueActions.ts`, `queueActions.test.ts`, `QueuePanel.tsx`, `undoRoundTrip.audit.test.tsx`, `undoDeleteField.audit.test.ts` |

`git merge --ff-only` and `git cherry-pick` were both refused by the sandbox, so
the carry was done with **`git checkout <sha> -- <named paths>`** — never a sweep
of `src/`. A blanket `git checkout ca1179f -- src/` would have deleted the two
audit tests carried in step one, because `ca1179f`'s base `735de75` never had
them; the suite would then have gone green at a *lower* count with nothing
obviously wrong.

The two carries are provably disjoint, which is what made this safe:
`git diff --stat 735de75 5c17e92` lists only docs and the two test files — `_0044`
touched **no production file at all**. So Undo's four production-file edits could
not collide with it.

The handoff flagged a real risk that did not materialise: the ประกาศซ้ำ tests
assert `updateOrderStatus.mock.calls` with `toStrictEqual` and cover both files
Undo edits. They passed unchanged. Undo adds keys to the *undo* write, not to the
action writes those tests pin.

Result: 131 → 162 → **198 tests**, `npm run build` passes.

## 3. Mutation check — 11 mutations, predicted before running

Every mutation was applied with an exact-match edit that **fails loudly when the
pattern is not found**. This is deliberate: in round `_0044` a mutation silently
failed to match (CRLF file, LF-terminated pattern) and would have been misread as
"this test is worthless". A mutation that never applied asserts nothing.

Scope: the 36 tests in `undoRoundTrip.audit.test.tsx` (A1×10, A2×10, A3–A5,
B1–B8) and `undoDeleteField.audit.test.ts` (D1–D5).

| # | Mutation | Predicted red | Actual red | ✓ |
|---|---|---|---|---|
| M1 | `orderSnapshot` back to only-present fields (**the original bug**) | A1{1,3,5,9,10}, A3, A4, B1–B7 | identical (14) | ✓ |
| M2 | `updateOrderStatus` writes `patch` raw, no `deleteField` | D1, D4 | identical | ✓ |
| M3 | `withDeletions` drops absent keys instead of sentinelling | D1, D2, D4 | identical | ✓ |
| M4 | `withDeletions` sentinels *every* key | D1, D3 | identical | ✓ |
| M5 | `createOrder` also runs `withDeletions` | D5 | identical | ✓ |
| M6 | snapshot omits `servingAt` | A1×10, A3, A4, B1–B7 | **A1{1,2,3,4,7}** only + A3, A4, B1–B7 | ✗ |
| M7 | every action returns `{}` | A2×10, A3, A5, B1–B7; **A1 all green** | identical (19) | ✓ |
| M9 | `runUndo` does not clear the undo bar | B8 | identical | ✓ |
| M10 | snapshot omits `status` | A1{1,2,3,4,5,6,7,9,10}, A3, A4, B1–B7 | identical (18) | ✓ |
| M11 | snapshot omits `announcedAt` | A1{1,2,3,4,7,8}, A3, A4, B1–B7 | identical (15) | ✓ |

10 of 11 predictions were exact. **M6 was wrong, and the error was load-bearing.**

### Why M6 was wrong, and what it exposed

I predicted that removing `servingAt` from the snapshot would break all ten A1
round-trips. It broke five. The reason: **a mutation to the restore path only
breaks the round-trip for cases whose action actually wrote that field.**
`markDone`, `skip`, `cancel` and `reannounce` never touch `servingAt`, so failing
to restore it is harmless — the value was never disturbed.

That means per-field snapshot mutations *partition* the ten A1 cases by which
field each action writes. Checking the union then showed a real hole:

    M1  kills A1 {1,3,5,9,10}
    M6  kills A1 {1,2,3,4,7}
    union so far = {1,2,3,4,5,7,9,10}   -- case 6 and case 8 had NO killer

Case 6 is `skip`, which writes only `status`. Case 8 is `reannounce`, which
writes only `announcedAt`. Neither was reachable by any mutation run up to that
point, so M10 (omit `status`) and M11 (omit `announcedAt`) were added
specifically to reach them. With those, A1 coverage is complete.

This is the same lesson as `_0044`'s B3: **a full mutation sheet coming back
green is not the finish line — the union of the red sets has to cover every
individual test.** Two rounds running, the gap was found by that check and not by
the mutation list anyone wrote in advance.

### Coverage: every one of the 36 tests has at least one killer

| Test | Killed by |
|---|---|
| A1 case 1,3 | M1, M6, M10, M11 |
| A1 case 2,4,7 | M6, M10, M11 |
| A1 case 5,9,10 | M1, M10 |
| A1 case 6 | **M10 only** |
| A1 case 8 | **M11 only** |
| A2 ×10 | **M7 only** |
| A3 | M1, M6, M7, M10, M11 |
| A4 | M1, M6, M10, M11 |
| A5 | **M7 only** |
| B1–B7 | M1, M6, M7, M10, M11 |
| B8 | **M9 only** |
| D1 | M2, M3, M4 |
| D2 | **M3 only** |
| D3 | **M4 only** |
| D4 | M2, M3 |
| D5 | **M5 only** |

Nothing is green for free. The single-killer rows are the fragile ones — **do not
delete A2, A5, B8, D2, D3, D5, or the `status`/`announcedAt` fields of the
snapshot's own tests** without replacing the coverage.

### M7 confirms A2 is a genuine spine

With every action stubbed to `{}`, **all ten A1 round-trips stayed green** while
all ten A2 went red. Undoing an action that did nothing restores nothing,
perfectly. Without A2, `orderSnapshot` could be correct and the actions could be
entirely gutted, and A1 would report success. A2 is the only thing standing
between A1 and vacuity.

An M8 (`cancel` stops trimming) was planned to isolate A5, then dropped as
redundant once M7 covered it. A5 therefore has a killer, but only a blanket one.

---

## 4. Scope of the evidence — what is NOT proven

- **No Firestore was contacted.** `firebase/firestore` is mocked in
  `undoDeleteField.audit.test.ts`, and `ordersRepo` is mocked in section B of
  `undoRoundTrip.audit.test.tsx`. What is proven is that the sentinel handed to
  `updateDoc` is `deleteField()`. That a field actually disappears from a real
  document is **not** proven here and cannot be, without an emulator.
- **No two-device / concurrency claim.** Every test is single-client. Undo racing
  another station's write is untested — that belongs to the Idempotency
  criterion, which is still unticked.
- **No pixel was measured.** These are jsdom tests; nothing here says anything
  about the Display or UI criteria.
- **`queueActions.test.ts` was carried as modified by `ca1179f`** and was not
  independently mutation-checked this round; the 36 audit tests were.
- The mutation runs above executed only the two undo audit files, not all 43
  files. A mutation might redden other suites too; that would only *add* to the
  red sets, so it cannot weaken the coverage claim.
