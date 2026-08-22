# Round summary — 2026-08-23_0032

Task: close the `hq-comms-crosssell` criterion
*"Donation thermometer ตรงกับ (ยอด paid − expenses) และอัปเดตเมื่อมีออเดอร์ใหม่"*.

## What I did

- **Decided how far the criterion reaches, and recorded why.** It reaches all
  three sub-claims of §4.4 (`:129-133`) — read `donationTarget`, show a % bar +
  number on every Display (bottom corner, not blocking the queue) and on HQ
  (large), update live — not only the arithmetic the one-line criterion spells
  out. The decisive evidence is in the spec itself: §4.4's first bullet labels
  the formula as inherited ("สูตรเดิมจากสเปค §6"), and §6 files Dashboard and
  accounting under **P1** while listing Donation thermometer under **P2**. A P2
  criterion cannot be satisfied purely by the half the spec calls inherited.
- **Wrote production — this was not a test-only gap.** Two sub-claims had no
  implementation at all: `donationTarget` was declared at `src/domain/types.ts:91`
  and read by nobody (the whole `GlobalConfig` interface was dead), and no % bar
  existed anywhere. New: `src/donation/donationProgress.ts`,
  `src/donation/DonationThermometer.tsx`, `src/domain/configRepo.ts`. Wired into
  `DisplayScreen.tsx` (corner card) and `DashboardScreen.tsx` (large).
- **Added 18 tests** in `src/donationThermometer.audit.test.tsx` (new file)
  covering the figure, the percentage, the rendered bar, both screens, the
  realtime half, and one `GAP:` test.
- **Ran 15 mutations**, predicting each red set in advance. All matched; three
  produced additional correct kills. **Every one of the 18 tests was killed by
  at least one mutation.**
- Full write-up in `docs/autopilot/2026-08-23-donation-thermometer-audit.md`;
  ticked the criterion and handed off the 🆘 inter-booth alert in `AUTOPILOT.md`.

## Why (the non-obvious choices)

- **The goal is read from Firestore `/config/global`, not from an env var.** The
  spec names that location itself at `:88-89`. An env var had a real precedent
  (`17e8c2e` moved `promptpayId`/`dashboardPin` — `donationTarget`'s two sibling
  fields — into `.env`), but `.env*` is out of scope so it could not have been
  documented, and offline is a non-issue because `src/lib/firebase.ts` already
  configures `persistentLocalCache`.
- **`metrics.ts` is untouched.** It is accounting logic and out of scope. The
  percentage maths lives in a separate presentation module, and **both screens
  call the same `computeDashboardMetrics`** — which makes "ตรงกับ" structural
  rather than coincidental.
- **`pct` and `barPct` are two fields, not one.** Beating the goal must fill the
  bar without overflowing its track while the text still reads 150%.
- **The percentage is floored, not rounded.** At 99.6% a rounded label says
  "100%", which on a fundraiser board claims the goal was reached.
- **The card sits bottom-LEFT.** `src/App.tsx:32` already parks the
  back-to-Setup button at `fixed bottom-3 right-3`. `fixed` is what makes
  "ไม่บังคิว" true — it removes the card from the centred column, so the queue
  lays out exactly as before. The queue's own subscription is untouched.

## Verification

`npm test && npm run build`, run as one command, both halves passing:

```
Test Files  40 passed (40)
     Tests  151 passed (151)

tsc -b && vite build → ✓ built in 1.14s
PWA v1.3.0 / mode generateSW / precache 5 entries
files generated  dist/sw.js  dist/workbox-9c191d2f.js
```

Baseline before this round was **133 tests / 39 files** (matching round 0036, not
the "144" some branches report). 133 → 151 = +18, all from the new file.

The "chunk > 500 kB" warning is present and deliberately unaddressed — it is a
warning, not an error, and rounds 0020/0036/0031 all judged it the same way.

**Proof the gap was real (M10):** removing the thermometer from both screens and
running the full suite gives `1 failed | 39 passed (40 files)` and
`5 failed | 146 passed (151)` — **all 133 pre-existing tests stay green with the
feature entirely absent.** The existing suite was blind to it.

**Proof the realtime tests are not vacuous (M3a):** freezing the Display after
its first snapshot kills **F1 and nothing else** in the whole repo. Same for HQ
via M3b. That is the round-0042 trap closed.

Mutation table (15 runs) is in the audit doc §7.

## What I did NOT do

- **No goal-editing UI.** §4.4 only says to *read* `donationTarget`, and §3 lists
  `config` as a pre-existing collection. Building an editor is a different task.
  Locked by a `GAP:` test that goes red the day one is added.
- **Did not touch `firestore.rules` / `firestore.indexes.json` / `.env*`** (out
  of scope). Rules were read only, to confirm a Display can read `expenses` — it
  can; access is open until 2026-09-30.
- **Did not change `metrics.ts`, menu, or comms logic.**
- **Did not open a browser.** No pixel, colour, offline run, or real Firestore
  document was observed.

## Risk — read these closely

1. **I edited two test files owned by other branches**, which is a merge-conflict
   surface. This was unavoidable, not a choice: `vi.mock(path, factory)` replaces
   the whole module, so the moment `DisplayScreen` imported `subscribeAllOrders`,
   **6 existing tests in `DisplayScreen.test.tsx` failed** before I had written a
   single new test. I added the missing exports to that factory plus factories
   for `expensesRepo` and `configRepo`. Separately, `DashboardScreen.test.tsx`
   began making **real Firestore network calls** while still passing green — I
   introduced that and fixed it by mocking `configRepo` there too. Both edits are
   additive (new mock entries only); no existing assertion was changed.
2. **"ไม่บังคิว" is argued structurally, not observed.** The card is `fixed`,
   therefore out of flow, therefore the queue's layout is unchanged. Whether it
   *visually overlaps* the smallest queue pills on a short screen is **not
   proven** — jsdom does no layout. A real browser at 360/768/1024/1920 is the
   only way to close that, and I did not run one.
3. **The Display now opens three Firestore listeners instead of one**, two of
   them collection-wide (`orders`, `expenses`) rather than booth-scoped, because
   the thermometer total is event-wide by definition. Fine at school-event scale;
   a reviewer should confirm they are comfortable with that on the customer-
   facing screens.
4. **In the real event the bar will not appear unless someone creates
   `/config/global` by hand** in the Firebase console. The degradation is
   deliberate and tested (amount shows, no bar, no `NaN%`), but it means the
   feature is inert out of the box. This is G1 in the audit doc.
5. **I nearly shipped a wrong justification.** My first argument for the scope
   decision was that `netDonation` predates the spec — false: it landed
   2026-07-25, one day *after* (`1bf0d67`, 07-24). I checked the dates, dropped
   that argument, and used §4.4's own "สูตรเดิม" wording instead. The conclusion
   is unchanged but the reasoning in the audit doc is the corrected one.
6. **Ledger note:** this file now reads 11 ticked / 9 remaining / 20 total. The
   3 unticked `queue-pro` criteria (Undo, No-show, ประกาศซ้ำ) were completed on
   branches that were never merged, so they remain untrue on this branch.
