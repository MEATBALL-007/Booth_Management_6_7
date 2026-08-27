# Round summary — 2026-08-28, branch `auto/Booth_Management_6_7/2026-08-28_0026`

Task: the **No-show** acceptance criterion — ข้าม serving → skipped (หายจากจอลูกค้า,
ขึ้นโซนพักไว้); เรียกซ้ำ → serving + Display ประกาศ (chime+flash).

## What I did

- **Synced the stale ledger.** The working copy's `AUTOPILOT.md` was two rounds
  behind (still naming Undo as the next task). Adopted the current version from
  branch `_2026-08-28_0009` verbatim — with one honesty fix, see Why.
- **Lifted `src/noShowRecall.audit.test.tsx` (14 tests) from `4fdcf2b`.** That
  commit's parent chain reaches `735de75`, which is exactly this branch's HEAD,
  so the file applied as a pure addition with no production-code dependency.
  Committed immediately, before touching anything else.
- **Mutation-checked all 14 tests myself — 8 mutations, predictions written
  before each run, 8/8 exact matches.** Every test is killed by at least one
  mutation; none is green-for-free. Full matrix in the audit note.
- **Wrote `docs/autopilot/2026-08-28-no-show-recall-audit.md`** recording the
  mutation matrix, the two non-obvious results, and — importantly — the limits
  of what the evidence actually covers.
- **Ticked No-show in `AUTOPILOT.md`** and handed off ประกาศซ้ำ with a verified
  procedure (see Risk — I caught and fixed a wrong claim in my own hand-off).

**No production code was changed this round.** The No-show feature was already
implemented correctly; what was missing was any test proving it.

## Why

- *Why adopt the plan file first:* the checked-out `AUTOPILOT.md` and the plan
  the runner handed me disagreed. Committing the sync separately keeps "which
  plan was I following" auditable rather than tangled into the test commit.
- *Why I edited the adopted Undo line:* it read "✅ ผ่านแล้วบน branch นี้". That
  is true of `_0009`, where Undo was done, and false here — `ca1179f` is not in
  this tree and `src/undoRoundTrip.audit.test.tsx` does not exist on this branch.
  Left the tick (the criterion *was* proved, on a branch) but named the branch
  and flagged that it is absent here and from `main`.
- *Why mutation-check code I could have just trusted:* a lifted test file is an
  untested assertion that it tests something. M3 is the payoff — it proved the
  file's own header comment is telling the truth, and identified D1 as the only
  test standing between this criterion and a silent regression.

## Verification

Verify command run in full, unmodified:

- `npm test` → **40 files, 147 tests passed** (131 before, +16 from the lifted
  file... see Risk: the file contains 14 tests, so the +16 is worth a glance).
- `npm run build` → **✓ built in 2.06s**, PWA `generateSW` produced `dist/sw.js`
  and precached 5 entries. No TypeScript errors — which matters, because vitest
  does not typecheck and `tsc -b` does typecheck `.tsx` test files.

Mutation matrix (each mutation applied alone, reverted after; predicted red set
written down before running):

| # | Mutation | Predicted | Actual |
|---|---|---|---|
| M1 | `servingOrders` filters `!== 'done'` | B1 B2 B3 B4 | ✅ match |
| M2 | `skip()` guard removed | A3 | ✅ match |
| M3 | `recall()` drops `announcedAt` | A3 D1 only | ✅ match |
| M4a | Display never flashes | D2 | ✅ match |
| M4b | Display always flashes | D3 D4 | ✅ match |
| M5 | parked zone reads `'done'` | C2 C3 D1 | ✅ match |
| M6 | parked zone renders unconditionally | C1 | ✅ match |
| M7 | ข้าม wired to `markDone` | A1 | ✅ match |
| M8 | ข้าม also on waiting cards | A2 | ✅ match |

Tree confirmed clean at HEAD after the last revert (`git diff HEAD` empty)
before the final verify run, so nothing was verified against a mutant.

## What I did NOT do

- **Did not bring Undo (`ca1179f`) or ประกาศซ้ำ (`68eb1c4`) onto this branch.**
  The plan explicitly wants them consolidated here eventually, and both looked
  quick — but that is a second and third task, and the round's rule is one.
  Recorded in `AUTOPILOT.md` as the next two steps, in order.
- **Did not touch production code.** The criterion passes as written; there was
  no bug to fix. Resisted "improving" anything I read while auditing.
- **Did not merge to `main`.** `main` still has none of the three proved
  criteria. Out of scope and I cannot push regardless.

## Risk — read these

1. ~~Test-count arithmetic~~ — **checked and clean.** 131 (the figure in the
   repo docs) + 14 (the lifted file) = 145, not the 147 now reported, so I
   measured the baseline instead of guessing: `npx vitest run --exclude
   "**/noShowRecall.audit.test.tsx"` → **39 files, 133 tests**. 133 + 14 = 147. ✅
   The 131 in the docs predates the photo-booth merge (`735de75`) this branch
   sits on. No test was skipped or deleted; `0 skipped` throughout.
2. **The evidence is jsdom evidence.** "Chime" means `playChime` was called, not
   that audio played. "Flash" means the root element's `className` contains
   `animate-pulse` / `bg-phantom-orange/30` — jsdom runs no CSS cascade and
   measures no pixels, so a renamed Tailwind class or an overriding later rule
   would sail through green. "หายจากจอลูกค้า" is a real DOM sweep of
   `document.body.textContent`, which is stronger than a testid check, but it is
   still not a photograph of the screen in the hall. This criterion is proved to
   the level automated tests can reach it, and no further.
3. **Do not delete test D1.** M3 showed that removing `announcedAt` from
   `recall()` leaves every Display test (D2–D4) *and* B4 green — the Display
   re-announces because the number re-enters the serving set, not because the
   timestamp moved. D1 is the only test that catches it. It looks redundant
   next to D2 and is not.
4. **A wrong claim in my own hand-off, caught and fixed — verify the fix.** I
   first wrote that `68eb1c4` descends from `4fdcf2b` and so a blanket
   `git checkout 68eb1c4 -- src/` would be safe next round. `git merge-base
   --is-ancestor` says otherwise: branch `_0030` does **not** contain
   `noShowRecall.audit.test.tsx`, so that blanket command would silently delete
   this round's work and still leave a green suite. `AUTOPILOT.md` now carries a
   🚨 warning to check out the single named path only. This is exactly the class
   of error that costs a round, so it is worth a reviewer's eye.
5. **`AUTOPILOT.md` now ticks two boxes whose code lives on different
   branches.** Undo is ticked but its implementation is on `_0009`, not here.
   The line says so explicitly, but anyone reading the tick alone will be
   misled about what this branch contains.
