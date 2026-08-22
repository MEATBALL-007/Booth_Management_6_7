# Donation thermometer — audit (round 2026-08-23_0032)

Criterion, from `docs/superpowers/specs/2026-07-24-hq-comms-crosssell-design.md:179`:

> Donation thermometer ตรงกับ (ยอด paid − expenses) และอัปเดตเมื่อมีออเดอร์ใหม่

**Result: criterion met, and it required real production code — this was NOT a
test-only gap.** Two of the three sub-claims had no implementation at all.

Tests: `src/donationThermometer.audit.test.tsx` (new file, 18 tests).
Production: `src/donation/donationProgress.ts`, `src/donation/DonationThermometer.tsx`,
`src/domain/configRepo.ts` (all new); `src/screens/DisplayScreen.tsx`,
`src/screens/DashboardScreen.tsx`, `src/i18n/labels.ts` (edited).

---

## 1. How far the criterion reaches — decided, with the reasoning

The criterion is one line and mentions only the arithmetic. §4.4 (`:129-133`),
which is the *only* place the spec defines the thing the criterion names, lists
three sub-claims:

1. read `donationTarget`, compare against Σ orders(paid).total − Σ expenses.amount
2. **แถบ % + ตัวเลข → บน Display ทุกจอ (มุมล่าง ไม่บังคิว) + HQ (ใหญ่)**
3. อัปเดต realtime ตามยอดที่เข้า

**Decision: the criterion reaches all three.** Reasoning, in the order the
evidence actually forced it:

- **The criterion names an artifact, not a number.** "Donation thermometer" is
  a proper noun in this spec — §4.4 is titled exactly that. A criterion whose
  subject is an artifact presupposes the artifact exists; the spec defines it in
  exactly one place, so that definition is what "thermometer" means here. A
  thermometer shows a level *against a scale*. A bare figure with no goal is a
  readout, not a thermometer.
- **§4.4's own first bullet marks the formula as inherited**, not new: it says
  the figure is "(สูตรเดิมจากสเปค §6)" — the formula from the *original* spec.
  §6 of this document lists P1 as "Core MVP ตามสเปคเดิม (… Dashboard …
  accounting …)" and Donation thermometer as **P2**. So the arithmetic is
  explicitly labelled by the spec as the part that came from P1. A P2 success
  criterion cannot be satisfied purely by the half the spec itself flags as
  already inherited — that reading leaves P2 with nothing to deliver.
- **A dead field corroborates it.** `donationTarget` was declared at
  `src/domain/types.ts:91` and `grep -rn "donationTarget" src/` returned that
  one line and nothing else. The whole `GlobalConfig` interface was dead —
  `grep -rn "GlobalConfig" src/` also returned only its own declaration. A field
  that exists solely to be read by a feature nobody built.

⚠️ **A check that corrected me mid-round.** I first intended to argue that the
figure "predates the spec" and so cannot be what the criterion grades. That is
false: `git log -1 --format=%ad --date=short a892c7f` → **2026-07-25**, one day
*after* the spec (`1bf0d67`, 2026-07-24). The inherited-formula argument above
is the one that actually holds, and it is stronger because §4.4 states it
outright rather than relying on dates.

## 2. What was already there, and what was missing

| Sub-claim | Before this round |
|---|---|
| figure = paid − expenses | ✅ `src/dashboard/metrics.ts:69`, on HQ at `DashboardScreen.tsx:68` |
| read `donationTarget` | ❌ declared at `types.ts:91`, **read by nobody** |
| % bar | ❌ did not exist anywhere |
| on Display | ❌ `DisplayScreen.tsx` had no donation content at all |
| on HQ, ใหญ่ | ⚠️ a number tile among seven others, no goal, no bar |
| realtime | ⚠️ true of HQ's figure, but **no test acted across two snapshots** |

## 3. Where the goal is read from — decided

The spec names the location itself, at `:88-89` of the data model:

```
/config/global (เพิ่ม field)
    donationTarget: number         // เป้าบริจาค (สำหรับ thermometer)
```

So: Firestore, via a new `subscribeGlobalConfig` in `src/domain/configRepo.ts`.

The alternative considered and rejected was an env var
(`APP_CONFIG.donationTarget`), on the precedent of commit `17e8c2e`, which moved
`promptpayId` and `dashboardPin` — the two sibling fields of `donationTarget` in
the same `GlobalConfig` interface — out of source into `.env`. Rejected because:

- the spec names `/config/global` explicitly, and bending that to match the
  code's recent habit is exactly the move these rounds exist to avoid;
- `.env*` is out of scope this round, so an env var could not be documented in
  `.env.example` and would ship undiscoverable;
- offline is not a problem here: `src/lib/firebase.ts` already configures
  `persistentLocalCache`, and §5 of the spec relies on that for every new
  collection, so a once-read config doc survives the device going offline.

`firestore.rules` needs no change — it currently grants open read/write until
2026-09-30, so a Display device can read `config/global` and `expenses`. **Not
edited** (out of scope), only read.

## 4. Production changes, and why each is shaped that way

- **`src/donation/donationProgress.ts`** — pure percentage maths, deliberately
  *outside* `src/dashboard/metrics.ts`. That module is accounting logic, is out
  of scope to change, and is graded by ticked criteria on two other specs. The
  accounting formula is untouched; this file only turns an already-computed
  amount into something a bar can draw.
  - Returns `pct` (true, unclamped) **and** `barPct` (clamped 0..100) as two
    separate fields. Beating the goal must fill the bar without overflowing its
    track, while the *text* still says 150% — one value could not do both.
  - A negative net (expenses entered before anything sells) draws an empty bar
    but reports the true negative percentage.
  - Rejects every unusable goal shape — `undefined`, `null`, `0` (which divides
    to `Infinity`), negative, `NaN` — because the value comes from a hand-edited
    Firestore document. `NaN%` on a customer-facing screen is the failure mode.
- **`src/donation/DonationThermometer.tsx`** — one component, two variants, same
  elements and same testids in both, so the customer screen and HQ cannot drift
  into showing different things. Position-agnostic: the screen decides placement.
  - The percentage is **floored, not rounded**: at 99.6% of goal a rounded label
    reads "100%", which on a fundraiser board is a claim the goal was reached.
  - Thai leads each bilingual label with English subordinate (smaller, dimmer),
    following the rule established in round 0020.
  - No `glow-*` and no `shadow-[…rgba…]`, per round 0051's Neon Clarity finding.
- **`DisplayScreen.tsx`** — subscribes to all orders + all expenses + config, in
  a **separate** effect from the queue. The queue's booth-scoped subscription is
  untouched, so the already-ticked queue criteria cannot be disturbed. Both
  screens then call the same `computeDashboardMetrics`, which is what makes
  "ตรงกับ" structural rather than coincidental.
  - Card sits at `fixed bottom-3 left-3`. **Bottom-LEFT specifically**:
    `src/App.tsx:32` already parks the back-to-Setup button at `fixed bottom-3
    right-3`, so the right corner is taken and two fixed cards would overlap.
    `fixed` is the load-bearing word for "ไม่บังคิว" — it removes the card from
    the centred column, so the queue lays out exactly as before.
- **`DashboardScreen.tsx`** — the same component at `variant="hq"`, full width
  above the stat grid. The pre-existing `net-donation` tile is left in place.

## 5. Collateral the change forced (worth knowing)

Adding a dependency to a component is a **breaking change to its tests' mocks**.
`vi.mock(path, factory)` replaces the whole module, so the moment `DisplayScreen`
imported `subscribeAllOrders`, all 6 tests in `DisplayScreen.test.tsx` died with
`No "subscribeAllOrders" export is defined on the mock` — before a single new
test was written. Fixed by completing that file's mock factory (+ new factories
for `expensesRepo` and `configRepo`).

A quieter second-order effect: `DashboardScreen.test.tsx` mocks four modules but
not the new `configRepo`, so it began making **real Firestore network calls**
while still passing. A green test is not evidence that it stayed isolated. Fixed
by adding the mock; the Firestore error spew in that file's output is now gone.

Both edits touch files other branches own — see Risk in `SUMMARY.md`.

## 6. Proof the gap was real

**M10** — remove the thermometer from both screens, run the **full** suite:

```
Test Files  1 failed | 39 passed (40)
     Tests  5 failed | 146 passed (151)
```

Only the new file fails. **All 133 pre-existing tests stay green** with the
feature entirely absent from both screens. The existing suite was blind to it.

## 7. Mutation check — 13 mutations, every test killed at least once

Each red set was predicted before running. All 13 matched; two produced
*additional* correct kills, noted below.

| # | Mutation | Predicted red | Actual |
|---|---|---|---|
| M1 | `netDonation` stops subtracting expenses | A1 A2 D1 E1 F1 F2 | ✅ exact |
| M2 | unpaid orders count as revenue | A1 | ✅ exact |
| M3a | Display freezes after the first snapshot | F1 | ✅ exact |
| M3b | HQ computes metrics once at mount | E1 F2 | ✅ exact (+ old Dashboard test) |
| M4 | drop the bar clamp | B1 B2 C2 | ✅ exact |
| M5 | `Math.floor` → `Math.round` on the % | B4 | ✅ exact |
| M6 | remove the unusable-goal guard | B3 C3 | ✅ **+ F2** |
| M7 | move card to bottom-right, drop `fixed` | D2 | ✅ exact |
| M8 | Display feeds it booth-scoped orders | D1 F1 | ✅ exact |
| M9 | `big` always false | E2 | ✅ exact |
| M10 | remove thermometer from both screens | D1 D2 E1 F1 F2 | ✅ exact |
| M11 | bar width becomes a static class | C1 C2 D1 F1 F2 | ✅ **+ E1** |
| M12 | a goal-writer appears in `configRepo` | GAP | ✅ exact |
| M13 | blind the GAP test's own scanner regex | GAP (via spine) | ✅ exact |
| M14 | Display variant silently drops its bar | C4 D1 F1 | ✅ **+ E2** |
| M15 | card nested inside the serving number | D3 | ✅ + D1 D2 |

Notes on the informative ones:

- **M3a killed F1 and nothing else.** That is the round-0042 trap closed: the
  realtime test dies precisely when the screen stops re-rendering, and no other
  test in the repo notices. M3b does the same for HQ.
- **M6's extra kill of F2** was not predicted and is correct: F2's "the goal
  arrives on a later snapshot" step asserts there is *no* bar beforehand, so
  removing the guard (which makes an undefined goal render a `NaN`-width bar)
  kills it too.
- **M13 is the round-0054 lesson applied.** The GAP test asserts an empty list,
  which is vacuous by construction. Blinding its regex makes it find nothing —
  and it still goes red, because of the paired spine assertion
  (`expect(exported).toContain('subscribeGlobalConfig')`) proving the scanner
  can still see the file at all.
- The GAP test reads `configRepo.ts` **off disk with `fs`** rather than
  importing it. Importing would introspect the `vi.mock` stub declared in that
  same file and prove nothing about the shipped module. (First draft used
  `require()` and failed outright — ESM.)

## 8. Scope of the evidence — what this does NOT prove

- **jsdom runs no cascade and does no layout.** No test measures a pixel or a
  rendered colour. The bar's *width* is the one genuine visual quantity checked,
  and only because a runtime number must be an inline style — inline styles are
  real values in jsdom, unlike class names.
- **"มุมล่าง ไม่บังคิว" is argued structurally, not observed.** The card is
  `fixed`, therefore out of flow, therefore the queue is laid out unchanged.
  That it does not *visually overlap* the smallest queue pills on a short screen
  is **not proven** and would need a real browser at 360/768/1024/1920.
- **"ใหญ่" on HQ is graded as a comparison of declared Tailwind size steps**,
  not of rendered type size.
- No browser was opened, no real Firestore document was read, no device went
  offline. The offline claim in §3 rests on the persistence config already in
  `lib/firebase.ts`, not on an observed offline run.

## 9. Gaps left open deliberately — recorded, not left "unknown"

- **(G1) Nothing in the app writes `/config/global`.** §4.4 only says to *read*
  `donationTarget`, and §3 lists `config` as a pre-existing collection, so a
  goal-editing UI is a different task from this criterion (and arguably P3).
  **Consequence for the real event:** unless somebody creates `/config/global`
  in the Firebase console, every screen shows the amount with no bar. That
  degradation is deliberate and tested (C3), not accidental.
  Locked by the `GAP:` test — it goes **red** the day a goal editor is added,
  which is intended: delete it then and update the ledger.
- **(G2) The Display now opens three Firestore listeners instead of one.** The
  two new ones are collection-wide (`orders`, `expenses`) rather than
  booth-scoped, because the thermometer total is event-wide by definition. Fine
  at school-event scale; worth knowing before anyone reuses this at scale.
- **(G3) Two test files owned by other branches were edited** to complete their
  mock factories. Unavoidable — see §5 — but it is a merge-conflict surface.
