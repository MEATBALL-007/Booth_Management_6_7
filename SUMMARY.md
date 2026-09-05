# Round `auto/Booth_Management_6_7/2026-09-06_0050`

Criterion closed: **"ทุกฟีเจอร์ใหม่ทำงานตอน offline แล้ว sync กลับได้โดยไม่ข้อมูลชน"**
— the last `hq-comms` criterion that still had production code behind it.

**17 of 20 criteria are now ticked.** The three left are all "feature missing", not
"test missing".

## What I did

- **Carried the sixteen already-proven criteria onto this branch.** The runner cut it
  from `main` (`735de75`) with 131 tests and 0 ticked boxes, for the seventeenth round
  running. Path-scoped checkout from `_2026-09-06_0007` after proving that tip is a
  strict descendant with no deletions; `git diff <tip> --stat` afterwards is empty
  except `SUMMARY.md`, which this round overwrites anyway.
- **Wrote `src/offlineSync.audit.test.tsx` — 22 tests, no `src/` production change.**
  Four groups, because the criterion is four things and only two of them are provable:
  **C/D** the persistence config (`persistentLocalCache` + the *multiple*-tab manager)
  and a census that every Firestore handle in the app comes from that one `getDb()`;
  **W** the booth still works with every write left permanently unresolved;
  **G** six recorded gaps; **X** the last-write-wins conflict model, stated and cited.
- **Ran 19 mutations, predictions committed before the first run** — the table is
  `docs/autopilot/2026-09-06-offline-sync-audit.md` §6, results §7. **10 of 19 correct.**
- **Fixed a genuinely weak assertion that a mutation exposed** (details under Risk).
- Updated `AUTOPILOT.md`: ticked the box with the findings, and pointed "Next task" at
  a single round that closes the remaining three as *documented gaps*, with the rules
  this round measured about how to write such a file without it being vacuous.

## Why

**"Offline" here means every write returns a promise that never settles.** That is not
a contrivance — it is what the Firestore SDK does with no network: the local cache
takes the write, and the returned promise waits for a server ack that is not coming.
There is no `mockResolvedValue` anywhere in the file. Under that harness the booth
still issues queue number `A1` to the customer standing in front of it, 🆘 still fires
without reporting an error, and the queue panel still records its undo.

**Sync itself is not tested, and the file says so in its header.** Queueing and
flushing is SDK plus server behaviour; there is no network, no emulator, and jsdom
cannot even hold the cache (the suite prints `Falling back to memory cache` on every
run for exactly this reason). Mocking the SDK and then claiming "sync works" would be
testing the mock. Same call as `alert D3` (arrayUnion dedupe) and `donation U4`.

**The wording trap.** Read literally, "ทุกฟีเจอร์ **ใหม่**" points at Happy-Hour, cash
reconciliation and Passport — three features with zero production code. If that is the
only reading, the criterion is unanswerable. So the file proves what exists and pins
what does not, with grep as the evidence, rather than picking one and pretending.

## Verification

```
npm test    → 57 files, 417 tests, 0 failed     (395 → 417; +22, nothing else moved)
npm run build → tsc -b clean · vite 116 modules · PWA generateSW, 5 precache entries
```

Mutation harness lived **outside the repo** (`C:/PHANTOM-AUTOPILOT/mutate-0050.mjs`) —
an untracked file at the repo root reddens `fz C1` + `ds S2` on every row and poisons
its own collateral column. Every row re-ran the baseline (417 green) and every row's
tally came back 417, so no mutation broke a file at import time.

Headline results:

- **M10** blinded `filesMentioning` → **seven gap tests went green at once**
  (G1·G2·G3·G4·G5·X0·X1). Only **G0**, which feeds the same predicate a fixture it
  must find, noticed. Sixth time this project has measured that species.
- **M9 / M13** the same shape: blind the checker, the test whose *name* is the
  criterion stays green, only its control dies.
- **M18/M19** are the future rather than a regression: adding `pricingOverrides` to
  `domain/types.ts` (what the tree looks like once somebody builds Happy-Hour) turns
  **G1 red**, and `runTransaction` turns **X0 red**. That is how "no killer" was
  separated from "vacuous" by measurement instead of by assertion.
- Single-killer tests, measured: **C0 · C2 · W4a · W4c · G0 · G4 · X1** — do not delete.

## What I did NOT do

- **Changed no production code.** Six gaps were found and all six were recorded with
  coordinates instead of patched: three are missing features whose construction touches
  accounting/menu logic (out of scope), and three are judgement calls a human should
  make (should a heartbeat stop when offline, should the app show a pending-write
  indicator, should `QueuePanel`'s writes have an error path).
- **Did not test sync, reconnect, IndexedDB, quota, or real conflict resolution.**
- **Did not reopen `idempotency E1` or the Undo merge-vs-snapshot bug.** X0 states the
  model in the code and cites both; the plan explicitly said not to start that fight.
- Did not start the remaining three criteria.

## Risk

- 🚨 **A mutation caught a weak assertion, and I changed the test file after the first
  run.** M14 (harness switched back online) killed W1/W2/W3 but left **W0** green — and
  W0's only job is to prove the harness is offline. Cause: `stillPending` was
  `Promise.race([p, Promise.resolve(MARKER)])`, and an already-resolved marker beats
  anything needing one more microtask; `createOrder` is `async`, so it always needs
  one. Its own control clause passed only because `Promise.race` breaks a tie by array
  order. Rewritten to drain the microtask queue 20 times; re-run as **M14b → W0·W1·W2·W3
  all red, as predicted**, and M13b unchanged. **A reviewer should look hardest here** —
  it is the one place this round's evidence was wrong before it was right.
- 🚨 **Prediction accuracy was 10/19, the lowest this project has recorded.** Five of
  the nine misses share one root: I assumed `frozenZones`'s `FROZEN` list held three
  files when it holds **twelve**, so `fz F2` was missing from every prediction that
  touched `useHeartbeat.ts`, `expensesRepo.ts` or `domain/types.ts`. The corrected list
  is written into both the audit doc and `AUTOPILOT.md`. The misses are all in the
  *collateral* column; no predicted killer failed to kill.
- 🚨 **The strongest claims in this file are about declared configuration, not runtime
  behaviour.** No IndexedDB was opened. `C1`/`C2` read `src/lib/firebase.ts` as text.
  That the SDK honours `persistentLocalCache` as documented is an assumption.
- ⚠️ **`W3` is narrower than it looks.** Offline the queue cards repaint from the local
  cache, which is not modelled here; W3 asserts the affordance the panel owns outright
  (the undo bar), not that the card visibly changes.
- ⚠️ **G4 needs its whole note read before anyone "fixes" it.** §5.5 wants HQ to show a
  dead device as offline, and today it does — but because the queued beats never reach
  HQ, not because the code stops beating. On the offline device's own screen it still
  shows itself online.
- ⚠️ **G1/G2/G3/G5/X0 have no killer, by design.** They pin absences. If one goes red,
  somebody built the feature — that is the fix, not a regression. Read the audit doc
  before touching them.
