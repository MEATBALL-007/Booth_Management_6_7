# Round `auto/Booth_Management_6_7/2026-09-06_0007`

Criterion closed: **"HQ เปิดบน MacBook + Windows พร้อมกัน เห็นข้อมูลตรงกัน realtime;
ปิดเครื่องนึง อีกเครื่องทำงานครบ"** — `hq-comms` **3/7**, overall **16 of 20**.

## What I did

- **Carried the previous round's work onto this branch.** The runner cut this
  branch fresh from `main` (`735de75`, 131 tests, 0 ticked), as it has for
  fifteen rounds. Path-scoped checkout from `e1af3f3`, with both preconditions
  proven first (`merge-base` == HEAD; no `D` lines in `--name-status`), then
  `git diff e1af3f3 --stat` **empty** — byte-identity, not just a green count.
- **Established that the "rescued work" commit was genuine work, not a stranded
  mutation.** `e1af3f3` renames an unused param `f` → `_path`; `tsconfig` sets
  `noUnusedParameters: true`, so that is a TS6133 fix that `npm run build`
  requires. It matches no row of the committed 20-mutation table. Kept.
- **Ran the 20-mutation table `_0047` predicted but died before executing.**
  Baseline 395 green before every row, tally checked per row. **16 of 20 exact.**
- **Found and closed a real hole the table could not see, with M21b.** Five of
  the eleven single-killer tests were killed only by M14, which works by making a
  helper *throw* — so nothing proved the D group detects two machines
  *disagreeing*. M21b (device identity captured at mount) killed **D3**, whose
  only route to failure is the cross-machine clause. Predicted exactly.
- **Wrote up §5–§11** of `docs/autopilot/2026-09-05-hq-two-devices-audit.md`,
  ticked the criterion, and rewrote `## Next task` for the offline/sync criterion.

**No `src/` production code changed this round.** `git diff main -- src/` shows
only the carried files; the four production files that differ from `main`
(`ordersRepo`, `queueActions`, `DisplayScreen`, `QueuePanel`, `ui/Button`) are
prior rounds' work, unchanged by me.

## Why

- **M21 is recorded as discarded, not as a finding.** It was declared as "the two
  machines disagree" and it did not do that: `getDeviceId()` reads `localStorage`
  live on every call, and both mounted instances share one jsdom, so a branch in
  the render body collapses to a single value for both after the first shared
  re-render. M21 made both machines report `0฿` **in agreement**, so D3 passed
  correctly. Recording "D3 survived" as evidence would have been recording a
  mutation that never happened — the standing rule (ช). Re-run as M21b.
- **That failure is the round's most useful output.** It also reinterprets M18:
  the §98 "both machines carry the same controls" result rests on P1's non-empty
  spine and pinned expected set, **not** on the mac-vs-win comparison it looks
  like it rests on. Written into the audit doc and the handoff.
- **The four prediction misses have one root cause, and it is not carelessness
  about which test sits near which line.** S2's *name* advertises "the survivor
  repaints"; its *body* also asserts a delivery count of exactly 1 and three tile
  values, which makes it a canary for all subscription bookkeeping and all tile
  arithmetic. Recorded as lesson (ด): read every assertion, never the name.
- **Harness kept outside the repo** (`C:/PHANTOM-AUTOPILOT/mutate-0007.mjs`).
  `frozenZones.changedPaths()` includes untracked files, so a script at the repo
  root would have reddened `fz C1` + `ds S2` on all 20 rows.

## Verification

Verify command run in full, unmodified:

```
$ npm test
 Test Files  56 passed (56)
      Tests  395 passed (395)

$ npm run build
 dist/assets/index-CROlE19B.js   852.15 kB │ gzip: 257.63 kB
 ✓ built in 1.27s
 PWA v1.3.0 · mode generateSW · precache 5 entries (849.10 KiB)
 files generated: dist/sw.js, dist/workbox-9c191d2f.js
```

Mutation runs: 21 counted rows, each `git checkout -- .` → anchor replace
(**throw unless exactly one match**) → `vitest --reporter=json` → parse →
`git checkout -- .`. Every row reported tally 395, so no row silently broke a
test file at import. Working tree verified clean after the last row.

Killer census, measured: **every one of the 22 tests has at least one killer.**
Seven have exactly one (W0 P0 P2 D0 H0 G0 G1) and are marked do-not-delete.

## What I did NOT do

- **Did not change any `src/` production code.** The screen already satisfied
  every clause; what was missing was evidence.
- **Did not fix either recorded gap.** **G0** — there is no export path anywhere
  in `src/`, though §98 lists export as one of four things both machines must do.
  **G1** — two HQ machines on one booth render indistinguishable presence rows,
  so nobody at HQ can tell which laptop died. Both are pinned as *absences*, the
  same shape as `idempotency E1` / `pwa I1` / `alert C5`: if they ever go red,
  someone built the thing — that is a fix, not a regression.
- **Did not touch the write side.** Two machines writing at once is `idempotency
  E1`'s open gap; this criterion is the read side.
- **Did not start the next criterion.** One task per round.

## Risk

- 🚨 **"realtime" is not measured, and the audit does not claim it is.** There is
  no network and no Firestore. What is proved is the *shape* that makes realtime
  possible: push delivery with no poll between the write and the paint. Real
  latency needs two machines in the hall.
- 🚨 **D4 does not prove Firestore replays state to a late listener** — the test
  supplies that snapshot. It proves HQ holds no start-up ordering dependence.
  This is stated in the test's own comment and in §11.
- ⚠️ **The cross-machine `toStrictEqual` clauses are weaker than they read.**
  Established by M21: they cannot catch divergence driven by device identity read
  during render, and device identity is what the criterion is about. D1's
  hand-computed absolute values are what carry that weight. **A reviewer should
  not "simplify" D1 into a mac-vs-win comparison** — M21 built exactly the screen
  (both machines showing `0฿`) that such a comparison calls equal.
- ⚠️ **No pixel was measured** — jsdom does no layout.
- ⚠️ `AUTOPILOT.md` in the working copy arrived **stale** (the round-1 version
  from `main`, 0/20 ticked) and was re-synced from the previous branch before
  editing. Anyone diffing `AUTOPILOT.md` against `main` will see a large change;
  most of it is the carry, not this round's edits.
- ⚠️ The mutation harness is at `C:/PHANTOM-AUTOPILOT/mutate-0007.mjs`, outside
  the repo and therefore **not committed**. §5 of the audit doc records the
  method precisely enough to rebuild it, which is the same trade the last four
  rounds made.
