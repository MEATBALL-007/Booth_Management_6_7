# Round summary — 2026-08-20

Task: close out the **No-show** acceptance criterion
(`ข้าม serving → skipped (หายจากจอลูกค้า, ขึ้นโซนพักไว้); เรียกซ้ำ → serving + Display ประกาศ (chime+flash)`).

## What I did

- **Synced `AUTOPILOT.md` from the sibling branch `auto/.../2026-08-19_0039`** (commit `0cf55ab`).
  The copy on this branch was still the pre-Undo version — it had Undo unticked and named Undo as
  the next task. This branch is cut from `main`, and the Undo round's work has not merged yet.
- **Added `src/screens/DisplayScreen.noshow.test.tsx` (5 tests, commit `38cb57c`)** — proves a
  `skipped` order is absent from the *entire* customer display (not just the serving slot), that
  skipping the number currently being served clears it off the screen, and that a recall
  (bumped `announcedAt`) brings the number back with both chime and flash.
- **Added `src/screens/QueuePanel.noshow.test.tsx` (5 tests, commit `f2e050c`)** — proves the
  skipped number lands *inside* the `พักไว้ / Parked` zone and the active numbers do not, that the
  zone is absent entirely when nothing is skipped, and that recall writes exactly
  `{status, servingAt, announcedAt}` and nothing else.
- **Ticked the No-show box** in `AUTOPILOT.md` and set `## Next task` to the ประกาศซ้ำ criterion,
  with the gap analysis I did this round written into it so the next round need not re-survey.

**No production code changed this round.** The four sub-claims were all already implemented
correctly; three of them simply had no test. `git diff main --stat -- src/` outside the two new
test files is empty.

## Why

- **The criterion has four halves and only one was covered.** `skip: serving → skipped` had tests
  (`queueActions.test.ts:32`, `QueuePanel.test.tsx:85`). "Disappears from the customer display",
  "appears in the parked zone" and "recall re-announces with chime+flash" had none at the screen level.
- **"Disappears from the display" is an emergent property, not a rule.** `queueView.ts` filters
  orders *in* by status (`=== 'serving'`, `=== 'waiting'`), so `skipped` never renders — but nothing
  in the codebase says so, and nothing would notice if someone loosened it to `!== 'done'`. That is
  the specific regression the new test pins.
- **I scoped the flash assertion to the root element.** `DisplayScreen`'s header live-dot carries
  `animate-pulse` permanently, so a document-wide `.animate-pulse` query would pass even with the
  flash wiring removed. One of the five Display tests exists purely to prove that scoping is what
  discriminates.
- **I anchored the parked-zone assertions on the `พักไว้` label rather than on the recall button.**
  `getByRole('button', {name:/เรียกซ้ำ/})` would pass even if the parked card were rendered among the
  serving cards, which would not satisfy "ขึ้นโซนพักไว้".
- **I did not touch `QueuePanel.tsx` to add a `data-testid`** for the zone, even though it would have
  been cleaner. Unmerged sibling branches own that file; a one-line attribute is not worth a merge
  conflict. DOM traversal from the label is fully non-invasive.

## Verification

`npm test && npm run build` — both pass.

```
Test Files  41 passed (41)
     Tests  143 passed (143)

dist/assets/index-DBOv4y8J.js   851.78 kB │ gzip: 257.58 kB
✓ built in 1.63s
PWA v1.3.0  precache 5 entries (846.33 KiB)  →  dist/sw.js, dist/workbox-9c191d2f.js
```

133 → 143 tests; the 10 new ones are the two files above.

**Non-vacuity: all 10 tests were proven to fail against deliberately broken code.** Six mutations,
each applied alone and reverted (`git checkout --` between each; tree is clean, verified with
`git status`):

| # | Mutation | Tests it killed |
|---|---|---|
| A | `servingOrders` → `filter(o => o.status !== 'done')` | the 2 "skipped disappears" tests |
| B | drop `animate-pulse` from the flashing branch of `DisplayScreen` | the 2 flash tests |
| C | remove the `playChime()` call in `useServingAlert` | the recall chime+flash test |
| D | parked zone renders `mine` instead of `skipped` | 3 parked-zone tests |
| E | add a `เสร็จ` button to the parked card | the "recall only" test |
| F | `Q.recall` returns `{status, servingAt}` (no `announcedAt`) | the recall-patch test |

Each mutation killed exactly the tests that claim the behaviour it broke, and no others.

## What I did NOT do

- **No production code was fixed, because nothing was broken.** Unlike the Undo round, this criterion
  audited clean. If a reviewer expected a bug fix here, the honest answer is that there was no bug —
  only missing proof.
- **I did not touch the ประกาศซ้ำ criterion**, even though it is adjacent and my recall test brushes
  against the same hook. It is a separate box and a separate round. What I learned about it while
  reading the code is written into `## Next task` instead.
- **I did not add a `data-testid` to the parked zone** (reason above).
- **I did not tick any checkbox in `docs/`** — per the Out-of-scope rule, only `AUTOPILOT.md`.

## Risk

- **The recall→announce chain is proven in two links, not one.** The QueuePanel test proves the
  button writes `announcedAt === servingAt`; the Display test proves that an order arriving with a
  bumped `announcedAt` chimes and flashes. Nothing drives Firestore end-to-end, so the join is only
  as good as the patch shape both sides agree on. I pinned that shape exactly (`Object.keys(patch)`
  compared to a literal, not `objectContaining`), which is the tightest seam available without a
  real backend. A reviewer should sanity-check that this is the seam they want.
- **The recall test exercises the `was === undefined` branch of `newlyAnnounced`, not `announcedAt > was`.**
  A recalled number was absent from the serving list, so it re-enters as "new". The same-number-bump
  branch is what ประกาศซ้ำ needs and is *not* covered at screen level yet — that is exactly the gap I
  recorded as the next task. It is covered at the hook level (`useServingAlert.test.ts:28`), chime only.
- **`parkedZone()` depends on `getByText(/พักไว้/).parentElement`.** This works because Testing
  Library matches only an element's direct child text nodes, so the label `<span>` matches and its
  wrapper `<div>` does not. If someone wraps the label in another element, these tests break with a
  confusing error rather than a clear one. That is the cost of not adding a `data-testid`.
- **`AUTOPILOT.md` on this branch was rewritten wholesale from the 0039 branch.** If the runner
  merges both branches, that file will conflict. The conflict is in prose only, and the 0039 text is
  the ancestor of mine, so taking mine resolves it.
- **The suite count now differs per branch** (main 133 with the photo-booth commits, 0039 has its own
  Undo tests, this branch 143). Nobody should read a single number as the project total until these
  merge.
