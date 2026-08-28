# Round summary — 2026-08-29_0037

Task: acceptance criterion **"เรียกเจาะจง"** — กด "เรียก" บน waiting เลขใดก็ได้ → serving (ข้ามลำดับได้)

## What I did

- **Checked the branch before trusting the plan, and the plan was wrong again.**
  `git log --oneline -3` returned `735de75` (bare `main`) and `ls src/*.audit.test.*`
  found nothing — the three ticked boxes in AUTOPILOT.md described a branch that no
  longer existed. Carried the 12 files from `9e1e4db` on
  `auto/Booth_Management_6_7/2026-08-29_0014` with a **path-scoped** checkout naming
  every file individually (commit `2965ccd`). 131 → 198 tests.
- **Wrote `src/callSpecific.audit.test.tsx` — 10 tests, no production change**
  (commit `4c16894`). `callSpecific` (`queueActions.ts:11`) and the เรียก button
  (`QueuePanel.tsx:88`) were already correct; only the evidence was missing.
  Covers all five gaps the plan named: the last of a five-deep queue, the whole
  `updateOrderStatus.mock.calls` list asserted with `toStrictEqual` so no other
  order is touched, the button's confinement to waiting cards, the status guard,
  and the Display announcing a number called out of turn.
- **Mutation-checked it: 10 mutations, red set predicted in writing before each
  run, 10/10 matched.** Verified the union of red sets covers all 10 tests, so no
  test asserts nothing.
- **Wrote `docs/autopilot/2026-08-29-call-specific-audit.md`** with the mutation
  table and a "ขอบเขตของหลักฐาน" section listing what is *not* proven.
- **Updated AUTOPILOT.md**: ticked เรียกเจาะจง, set Next task to Idempotency,
  refreshed the stale branch-check numbers (198→208, 4→5 audit files), and added
  three hard-won rules to the rules section.

## Why

- **`toStrictEqual` on the whole `mock.calls` list, never `toEqual`.** M3 proves
  this is not pedantry: it makes `callSpecific` return an extra `doneAt: undefined`,
  the new file goes 4-red, and the pre-existing `queueActions.test.ts` stays **8/8
  green** because `toEqual` ignores `undefined`-valued keys. Since the carried Undo
  fix, `updateOrderStatus` maps `undefined` → `deleteField()`, so that patch would
  silently delete a live Firestore field.
- **Exact-string selectors, never `/เรียก/`.** Three buttons start with เรียก
  (เรียกคิวถัดไป / เรียก / เรียกซ้ำ). A regex-based "no เรียก button on parked
  cards" test finds the เรียกซ้ำ button that lives on exactly those cards and
  passes for the wrong reason. B3 pins the trap so a rewrite to a regex fails.
- **Every `queryByRole(...) === null` is paired with a positive from the same
  container.** `QueueNumber` is a `<span>`, so `getByText(n).closest('div')` reaches
  the card — but if it ever shrink-wrapped to an inner div, every negative would
  pass vacuously.
- **"ข้ามลำดับได้" proven twice, non-overlappingly** — structurally (A3: the action
  takes one order and no list, so it has no ordering input it *could* obey) and
  behaviourally (B1/B2). M6 kills both; M2/M3 kill only the panel pair.

## Verification

Verify command run unmodified: `npm test && npm run build`

```
Test Files  44 passed (44)
     Tests  208 passed (208)
✓ built in 2.04s        (tsc -b clean; PWA generated, 5 precache entries)
```

`tsconfig.json` has `"include": ["src"]` with `strict` + `noUnusedLocals`, so the
new `.tsx` test file is genuinely typechecked by `tsc -b`, not just run by vitest.

Mutation check — predicted before running, all reverted afterwards (working tree
confirmed clean by `git status --short`):

| # | Mutation | Predicted red | Actual | ✓ |
|---|---|---|---|---|
| M1 | drop `callSpecific`'s status guard | A2, B4 | A2, B4 | ✓ |
| M2 | omit `announcedAt` | A1, A3, B1, B2 | same | ✓ |
| M3 | add `doneAt: undefined` | A1, A3, B1, B2 | same | ✓ |
| M4 | remove the เรียก button | B1, B2, B3 | same | ✓ |
| M5 | render เรียก on serving cards too | B3, B4 | same | ✓ |
| M6 | เรียก always calls `waiting[0]` | B1, B2 | same | ✓ |
| M7 | remove `if (!patch) return` from `apply` | **none** | none (208/208) | ✓ |
| M8 | Display shows only the first serving order | C3 | C3 | ✓ |
| M9 | `upNextOrders` sorts newest-first | C1, C2 | same | ✓ |
| M10 | Display never chimes/flashes | C1, C3 | same | ✓ |

Killer coverage: A1←M2/M3 · A2←M1 · A3←M2/M3 · B1←M2/M3/M4/M6 · B2←M2/M3/M4/M6 ·
B3←M4/M5 · B4←M1/M5 · C1←M9/M10 · C2←M9 · C3←M8/M10. **No test is without a killer.**

Two results worth a reviewer's attention:
- **M6** (the criterion's own regression) kills only **4 of 208** tests suite-wide,
  two of them from this new file. Before this round the whole product had exactly
  two tests standing between it and a "cannot skip the line" regression.
- **M7 was predicted green and came back green.** `apply()`'s `if (!patch) return`
  is unreachable through the current UI — every call site either guards first or
  can only fire on a card whose status already satisfies the action's guard. That
  is a finding (defence-in-depth, untriggerable from today's screen), not a hole,
  and it is why B4 pins the two layers separately in prose instead of faking a
  press the real screen cannot produce.

## What I did NOT do

- **No production code changed.** `git diff main..HEAD -- src/` shows changes only
  in the three files carried from `_0014` (the Undo fix) plus new test files.
  Nothing in `firestore.rules`, `firestore.indexes.json`, `docs/superpowers/specs/`,
  `.env*`, `.firebaserc`; no dependency added; no accounting/menu/comms logic touched.
- **Did not fix the double-press write.** Verified this round with a throwaway probe
  (deleted, never committed): two presses of เรียก with no snapshot in between write
  **twice** — `servingAt: 1000` then `servingAt: 2000`, same order. The panel's
  `waiting` list only changes when a snapshot arrives, so the second click still
  closes over a `'waiting'` order and the guard passes again. That is the **next**
  criterion (Idempotency), so I left it alone and wrote the measured call list into
  both AUTOPILOT.md and the audit doc so the next round does not re-derive it.
- **Did not prove the two-device case.** Different mechanism entirely (Firestore
  last-write-wins, not a stale React closure). Out of scope for this criterion.
- **Did not touch the other three audit test files**, per the standing rule that
  unmerged sibling branches own them.

## Risk

- **The biggest risk this round is the carry, not the new tests.** I brought 12
  files onto a branch that had none of them. The carry is verified only by the
  suite going 131 → 198 (the exact number the plan predicted) and by
  `git diff --stat main..9e1e4db` listing precisely those 12 paths and no
  deletions. A reviewer should confirm `src/order/ordersRepo.ts`,
  `src/queue/queueActions.ts` and `src/screens/QueuePanel.tsx` are the versions
  they expect — those three are **production** files carried from another branch.
- **Everything is mocked.** `ordersRepo` and `display/chime` are replaced wholesale.
  No test here touches Firestore, and "announced" means `playChime` was called and
  a class string contained `animate-pulse`. jsdom runs no layout — no pixel, font
  size, or centring is measured anywhere in this file.
- **The status guard is never exercised through the UI** (M7 confirms `apply()`'s
  null branch is unreachable). If someone later adds a เรียก button to a
  non-waiting card, B4 and M5 will catch the button placement, but no test
  simulates a press that reaches `callSpecific` with a non-waiting order — because
  today's screen cannot produce one.
- **C1/C2/C3 hand-build the post-press snapshot** rather than driving the panel and
  the Display in one process. The join between them (the panel writes o5 → the
  Display receives o5 serving) is proven by B1's assertion on the exact patch plus
  C1's use of that same patch shape, not by a single end-to-end run.
