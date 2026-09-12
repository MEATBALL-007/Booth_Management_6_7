# SUMMARY — round `auto/Booth_Management_6_7/2026-09-13_0011`

## What I did

- **Carried the twenty proven criteria onto this branch.** The branch was checked out at bare
  `main` (`735de75`), so its PR would otherwise have proposed **deleting every audit test and
  document** the previous rounds proved. Whole-tree carry from `39a2cf3`
  (`auto/.../2026-09-12_0036`) — 49 paths: 21 audit docs, 20 audit test files, 5 production
  files, `tailwind.config.js`, `AUTOPILOT.md`, `SUMMARY.md`.
- **Ran the Verify command and matched every recorded invariant** — test count, file count,
  module count, css size, precache size, and all three vite content hashes.
- **Established that this round inherited no stranded mutation, even though the carry source
  died before writing its docs.** `_0036` has exactly **one** commit past `main` and it is a
  genuine carry commit, not a runner `autopilot: rescued work` commit. `git diff --stat 39a2cf3
  4f0286f` is **empty**, so its tree is byte-identical to `_0026`'s docs tip — a dead round's
  live experiment would have shown up here.
- **Did not touch `src/` — not one line.** The plan's `## Next task` states explicitly that no
  agent-doable work remains and instructs: carry → verify → update the line → stop.
- Updated `## Next task` in `AUTOPILOT.md` and wrote this file.

## Why

The prompt's `## Next task` arrived **empty** — for the 37th time. Hard rule 5 says an empty or
wrong task means correct the plan and stop, not invent a substitute. But stopping *immediately*
would be wrong: the branch was bare `main`, and a bare-main branch's PR reads as a mass deletion
of 14,000+ lines of proven work. So the carry happens first, then the stop. That ordering is the
entire content of the round.

**Why the one-command whole-tree carry was safe here.** `git checkout <tip> -- .` overwrites
paths present in `<tip>` but never removes paths that exist only locally — normally that strands
files and the suite goes green at a *lower* count, which is exactly the failure that looks like
success. It is only safe when the source is a strict descendant. I checked three layers:

1. `git merge-base HEAD 39a2cf3` returned **HEAD** — this branch's tip is an ancestor of the source.
2. `git diff --name-status --diff-filter=D 735de75 39a2cf3` was **empty** — no deletions to miss.
3. After the carry, `git diff --cached --stat 39a2cf3` was **empty** — tree byte-identical to source.

**Why the hash comparison is the load-bearing check, not the test count.** A stranded mutation
inside an already-covered file keeps the tally at 453 but *always* moves vite's content hash,
because vite names bundles by a hash of their contents. Test count and hash are two independent
witnesses and I checked both.

**How this round's verification differs from the last one — it is weaker by one hop, and here is
why that is still sound.** `_0026` could check its hashes against hashes its own source had
recorded (single-hop). My source `_0036` **died before writing any docs**, so it recorded
nothing to check against. I therefore bridged the gap structurally instead of trusting a number:
`_0036`'s tree is provably identical to `_0026`'s docs-tip tree, and `_0026` recorded all three
hashes. So the three hashes I measured confirm, across two hops, that what `_0026` wrote down is
what `_0036` actually passed along. This is the same shape `_0016` used, and the chain back to
`_2026-09-07_0046` remains unbroken.

**Why I checked for untracked files before running anything.** The `frozenZones` and
`uiOverhaulDiffScope` sweeps enumerate `git ls-files --others`, so any scratch file left at the
repo root reddens them and contaminates the result. `git status --untracked-files=all` was empty,
and I deliberately kept every scratch path out of the repo.

## Verification

Ran the Verify command in full: `npm test && npm run build`.

```
Test Files  59 passed (59)
     Tests  453 passed (453)
  Duration  41.29s

> tsc -b && vite build
✓ 116 modules transformed.
dist/assets/index-bTUIGpdg.css   16.31 kB │ gzip:   4.22 kB
dist/assets/index-CyVIMiFT.js   852.15 kB │ gzip: 257.63 kB
✓ built in 2.89s

PWA v1.3.0 · mode generateSW · precache 5 entries (849.13 KiB)
  dist/sw.js
  dist/workbox-9c191d2f.js
```

**All three content hashes match the recorded baseline** — `index-bTUIGpdg.css`,
`index-CyVIMiFT.js`, `workbox-9c191d2f.js`. Module count, css size and precache size match too.
**16 consecutive rounds with stable hashes; 453 tests / 59 files stable for 19.**

Round counter, using the subject-anchored formula (a body-matching `--grep` over-counts, because
a docs commit quoting the recipe matches itself):

```
git log --all --format='%s' | grep -c '^test: carry the twenty proven criteria'
→ 22   (21 before this round's commit)
```

By the offset `carry #16 ↔ round 31` that `_0031` established and `_0006`/`_0016`/`_0026`
confirmed, **#22 is round 37**. No round went missing: `_0026` is #20 exactly as it recorded, and
`_0036` is #21. **`_0036` left no `docs:` commit**, so it is invisible in the plan's narrative
and visible only in the counter — the third instance of the rule `_0018` wrote down: *count from
the carry commits, never from the prose in `AUTOPILOT.md`.*

## What I did NOT do

- **No `src/` change, no new test, no new audit.** All 20 criteria are already ticked and the
  plan states no agent-doable work remains. Inventing a 21st audit would be exactly the scope
  creep hard rule 1 forbids.
- **Did not tick or untick any checkbox.** All 20 were already ticked by the rounds that earned
  them; this round earned nothing new.
- **Did not re-run the mutation tables.** They are recorded per-criterion in `docs/autopilot/`
  and nothing in `src/` moved, so re-running them would consume the round to reproduce a known
  result — and the hash match already proves `src/` is the tree those tables were measured against.
- **Did not act on any of the open items in the Risk section below.** Each needs a human
  decision (PWA icons, the two-device write race, the thermometer bar, the radius inversion),
  and several sit squarely inside the "no accounting/menu/comms logic" out-of-scope rule.

## Risk

**Nothing here is verified beyond "the tree is identical and the build is reproducible."**
In descending order of how much a reviewer should care:

- **This round proves no new behaviour.** It is a carry plus a verification. Its entire value is
  that the PR shows +14,000 lines of proven tests instead of a mass deletion. If you are looking
  for new coverage, there is none, deliberately.
- **The 20 ticked criteria include several ticked *as documented gaps*, not as working
  features.** Happy-Hour pricing, cash reconciliation and Passport are ticked because the gap is
  *pinned by a test*, not because the feature exists. Likewise `idempotency E1` (two-device
  race), `pwa I1` (**no icons — the app cannot be installed to a home screen**), `alert C5` (no
  toast sound), `donation T1–T3` (no thermometer bar), `hqTwoDevices G0` (no export path).
  **A reader skimming "20/20" will badly overestimate what ships.** Each of those tests asserts a
  *currently-broken* state — if one turns red, someone built the feature; that is a fix, not a
  regression, and the test must be promoted rather than deleted.
- **A large share of the carried suite measures declared source text, not rendered output.**
  jsdom runs no layout and Tailwind never executes, so the centering, clamp, neon-clarity, radius
  and touch-target audits prove *what the source declares*, not what a screen shows. **Someone
  should still open the Display screen on real hardware before the event.** The audit docs say
  this too; it should not vanish behind a green tick.
- **My carry source left no record of its own run.** `_0036` carried correctly but died before
  writing docs, so its hashes are attested only by this round's two-hop reconstruction described
  above. A reviewer who wants a single-hop chain should read `_0026`'s `SUMMARY.md`, which is
  carried in this tree.
- **The round counter is load-bearing and fragile.** It keys on the exact commit subject
  `test: carry the twenty proven criteria onto this branch`. Any reword silently resets the
  chain. I kept the subject verbatim and kept the recipe out of my commit body.
- **Known unresolved design decision, unchanged this round:** `rounded-xl` (20px) now exceeds
  `rounded-2xl` (19.2px), so 8 cards asking for rounder corners render squarer. `roundedScale G0`
  pins it; resolving it needs a human design call, not an audit.
- **This branch will not merge itself.** Like the 20 rounds before it, it sits alongside its
  siblings rather than on top of them. The carry is what keeps that survivable, but the real fix
  is a human merging one of these PRs. **Twenty-one consecutive rounds have now produced nothing
  but a re-carry** — the loop is stable, not productive, and only a human can change that.

**Recommended next step: a human picks the next goal.** Ranked by real-world impact on a school
booth that actually runs: **PWA icons** (today the app cannot be installed to a home screen,
which is the entire point of the PWA work), then the **two-device write race**, then the
**donation thermometer bar**.
