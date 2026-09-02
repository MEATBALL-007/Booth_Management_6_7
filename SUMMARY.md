# Round summary — 2026-09-03, branch `auto/Booth_Management_6_7/2026-09-03_0012`

Task: close the `ui-overhaul` criterion
**"ทุกหน้าเป็นสไตล์ Neon Clarity สม่ำเสมอ (glow เฉพาะ 3 จุด, base +20%)"**.

Round `_2026-09-02_0041` started this criterion and **died mid-mutation-run**.
It left behind everything except the finish: the test file, the production fix,
and — crucially — its 18 mutation predictions committed *before* running any of
them. This round finished it.

## What I did

- **Carried the twelve criteria forward.** The runner cut this branch from
  `main` again (`735de75`, 131 tests, 0 ticks) — the ninth round in a row.
  Proved `_0041` was a strict superset first (`git merge-base HEAD <tip>`
  returns `HEAD`; `--name-status` has no `D` rows), then checked out by path.
- **Found and reverted a live mutation that the runner had committed.**
  `_0041` timed out mid-run and the harness's "rescue uncommitted work" step
  (`941539e`) froze an un-reverted mutation into history: `sourceFiles()` was
  still skipping `src/screens`. That is **M15 of its own prediction table**, and
  it was reddening exactly the predicted G2/G3/T2. The branch was inheriting a
  3-test failure that looked like a broken audit but was a stranded experiment.
  The same commit also contained real work (the G4 `perTarget` canary), so this
  was fixed one line at a time rather than reverted wholesale.
- **Ran all 18 mutations against the pre-committed predictions. 17 of 18
  matched.** Each was applied through a harness that *throws* if its anchor
  does not match, so a mutation cannot be silently scored as "no killer" without
  ever having been applied — which nearly happened, because the tree is CRLF and
  four anchors were multi-line.
- **Re-measured the one miss instead of relaying it.** `_0041` recorded that M6
  left G4 green and that it strengthened G4 in response. I reproduced that state
  (`M6orig` — M6 applied with the canary stripped) and confirmed it: **all 18
  green** while two of three `queue-number` census entries are relabelled.
- Filled in §5 of `docs/autopilot/2026-09-02-neon-clarity-audit.md` with the
  results, ticked the criterion (`ui-overhaul` now 4/5, overall **12/20**), and
  rewrote the handoff.

**No `src/` production file was changed this round.** The one production change
this criterion required (`DisplayScreen.tsx:98`) was made by `_0041` and is
already declared in `frozenZones`' `PRODUCTION_CHANGES` with its reason.

## Why

- **The stranded mutation is the interesting failure, and it is a new one.**
  Every previous round's hazard was *losing* uncommitted work. This is the
  inverse: an unattended round died mid-experiment and the rescue step preserved
  the experiment as if it were work. The tell was that the three red tests
  matched a table row exactly. Had I "fixed" the audit to accommodate it, I
  would have written a permanently blind scanner — one that never reads a single
  screen — into the guarantees, and it would have looked green forever. The new
  handoff leads with this as a procedure.
- **A prediction table committed before the run is worth more than the run.**
  It survived the round that wrote it. Because `219eabe` predates every
  mutation, I could execute someone else's experiment and the result still
  cannot have been written backwards. That is the whole value of the convention.
- **M6 is scored as a MISS even though M6 kills G4 today.** It kills it only
  because G4 was strengthened after seeing it survive. Scoring it as a hit would
  be scoring the fix, not the prediction. 17/18 is the honest number.
- **I did not take `_0041`'s account of M6 on trust.** A prior agent's report of
  a result I am about to publish is a claim, not a measurement. Re-running it
  cost one command.

## Verification

Verify command, run with the tree clean (`git status --short` empty) after every
mutation had been reverted:

```
$ npm test
 Test Files  52 passed (52)
      Tests  318 passed (318)
   Duration  30.77s

$ npm run build
> tsc -b && vite build
✓ 116 modules transformed.
✓ built in 938ms
PWA v1.3.0
mode      generateSW
precache  5 entries (848.73 KiB)
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js
```

**Mutation check — 18 run, 17 predicted correctly.** Full table in
`docs/autopilot/2026-09-02-neon-clarity-audit.md` §5.

Killer counts were computed from the 18 recorded red sets rather than
eyeballed — I had drafted a wrong "corrections" paragraph and the computation
overturned it. Measured single-killer set is **G0 G5 G8 B0 B1 B2 B4 T0**, which
is *exactly* what `_0041` predicted, and **no test has zero killers**.

## What I did NOT do

- **Did not start the next criterion** (responsive / touch-target ≥44px). It is
  written up in detail in the handoff, including the trap that `scrollWidth >
  clientWidth` is green-for-free in jsdom.
- **Did not fix the radius tokens.** §2 specifies `sm 10 · md 14 · lg 16 ·
  xl 20` and `tailwind.config.js` extends no `borderRadius` at all. The §8
  criterion's parenthetical names glow and base scale only, so widening this
  into a token-system rewrite would be a second task. Recorded as a real gap in
  §7 of the note and repeated in the handoff.
- **Did not touch the spec files, `firestore.rules`, `firestore.indexes.json`,
  `.env*`, or any accounting / menu / comms logic.** Added no dependency.
- Did not re-run `_0041`'s pre-fix measurement of the criterion itself (it
  recorded 4 of 18 red against the original code). I verified its *conclusion*
  is consistent with the current tree, but that specific "before" number is
  inherited, not re-measured. See Risk 4.

## Risk — read these closely

1. **🚨 No pixel is measured and Tailwind never runs.** This file computes on
   values *declared* in the source. The step from "the root is 120% and every
   size is relative" to "the page is 20% bigger" assumes Tailwind emits its
   documented rem-based scale. Assumed, not proved — same limitation every
   jsdom round in this project has carried.
2. **🚨 "สวย" is not tested and is not claimed.** The proven statements are the
   glow *ration* and the *scale*. A human should open the Display screen and
   look at it: the production change removed a yellow glow from the "เตรียมตัว"
   card, and while `displayCentering` C4 still pins that the callout is
   structurally prominent (border + fill + size), nothing here can tell you it
   still looks right.
3. **🚨 `G1` is green when the scanner is blind.** M3 proves it: the test that
   reads like the heart of the file (`every glow lands on an allowed target`) is
   `[].filter(pred)`, which passes identically on clean code and on a scanner
   that sees nothing. Only G0 and G2 separate the two. **If a future round
   deletes G2 as redundant** — it has five killers, so it will not appear on any
   single-killer list — the file keeps passing while proving nothing.
4. **The "4 of 18 red before the fix" figure is inherited from `_0041`, not
   re-measured by me.** It is consistent with what I see (the census, the
   production diff, and `frozenZones`' declared reason all line up), but I did
   not check out the pre-fix tree and re-run it. A reviewer wanting that number
   independently confirmed should do so.
5. **The prediction table's "elsewhere" column was systematically incomplete,**
   and I corrected the record rather than the table. Every production/config
   mutation also reddens `frozenZones C1` + `uiOverhaulDiffScope S2`; the table
   named that once (M18). Related and re-confirmed this round: **`P1` tracks
   *which* file changed, not *what* changed in it** — M1/M2/M16 left it green
   because their files are already declared. Do not read a green P1 as "this
   change was safe".
6. **I deleted my mutation harness (`mutate.mjs`) rather than committing it.**
   It is reconstructable from §5, but the next round re-running these mutations
   will rebuild it. If it does, the CRLF anchor guard is the part worth
   re-copying — without it, four of the eighteen silently do nothing.
7. **Audit test files are inside Tailwind's content glob** (`./src/**/*.{ts,tsx}`),
   so fixture strings emit dead utility classes into the production CSS. The
   stylesheet is now 15.91 kB (was 14.67). Still harmless, but the next
   criterion touches layout and someone may start measuring this.
