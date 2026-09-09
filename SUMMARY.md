# Round `auto/Booth_Management_6_7/2026-09-10_0018`

## What I did

- **Carried the twenty proven criteria onto this branch.** The branch was cut from
  bare `main` (`735de75`) and started with none of the audit work — 49 files,
  ~14.3k lines, 41 added / 8 modified / **0 deleted**, including all 24
  `*.audit.test.*` files and the 20 `docs/autopilot/` records.
- **Proved the carry was safe *before* running it.** `git merge-base HEAD d3ad981`
  returned HEAD exactly, so the newest sibling (`_0008`) strictly descends from this
  commit and its tree is a superset — a one-command whole-tree carry cannot drop a
  file. Confirmed byte-complete afterwards: `git diff d3ad981` printed **zero lines**.
- **Ran the Verify command and matched the recorded baseline on both witnesses** —
  the 453-test tally and all three vite content hashes.
- **Added a second, independent way to count the rounds** (`git log --all --grep` on
  the carry commits) and recorded it in `AUTOPILOT.md`. It returns 11, agreeing
  exactly with the branch-order walk.
- **Touched no `src/` line.** No production code, no test, no spec was authored,
  edited, or deleted this round.

## Why

The prompt's `## Next task` arrived **empty**. The carried plan's `## Next task` is a
standing order for exactly that case: all 20 acceptance criteria are ticked (17 proven
by tests, 3 closed as *documented gaps*), it states plainly that no agent-doable work
remains, and it instructs — carry → verify → correct the line → stop, don't invent
work. Hard rule 5 says a round that only corrects the plan is a successful round;
hard rule 1 forbids substituting a task I picked myself.

**The working copy's `AUTOPILOT.md` lied on arrival.** Bare `main` carries an old
revision of the plan whose `## Next task` said *"do the Undo criterion, use the
2026-08-13 findings doc as the spec"* — work that was finished weeks ago and is
ticked in the carried plan. Following the working copy would have redone a solved
criterion from scratch. The plan has to be read off the newest `auto/*` branch first.

Carrying is not optional busywork. An uncarried branch **is** bare `main`, so the PR
the runner opens from it would propose **deleting every audit file** — the carry is
the one thing that must happen even in a round with no feature work.

I used the blanket `checkout <tip> -- .` rather than a path-by-path carry only because
the `merge-base` check licensed it. **That check is what makes it safe, not the
command:** against a *diverged* sibling the same command silently removes files that
branch never had, and the suite then goes green at a lower test count — which looks
exactly like success.

The new counting method earns its place rather than restating the old one. The plan
warns that a round which carries but never records itself vanishes from the counter —
which is what happened to `_0041`. But `_0041` *did* leave its carry commit
(`7575c04`); only the `docs:` commit was missing. So grepping carry commits sees
precisely the round that the prose-based counter dropped.

## Verification

Ran the Verify command in full: `npm test && npm run build`. Both passed.

```
Test Files  59 passed (59)
     Tests  453 passed (453)

tsc -b            passed (no output)
vite              116 modules transformed
dist/assets/index-bTUIGpdg.css   16.31 kB │ gzip:   4.22 kB
dist/assets/index-CyVIMiFT.js   852.15 kB │ gzip: 257.63 kB
PWA v1.3.0  mode generateSW  precache 5 entries (849.13 KiB)
            dist/sw.js, dist/workbox-9c191d2f.js
```

All five numbers and all three content hashes match the baseline recorded by
`_0008` / `_0037` / `_0026` / `_0016` / `_0006` / `_0031` / `_0021` / `_0011` /
`_0046`. Eighth consecutive round with the hashes unmoved; tenth with the test tally
unmoved.

The two witnesses cover different holes, and I checked both deliberately:
- **Content hashes** catch a mutation stranded in `src/` — vite names bundles by
  content digest, so a surviving edit moves a hash even while all 453 tests pass.
- **The 453-test tally** catches one stranded in an `*.audit.test.*` file — test
  files never enter the bundle, so they move no hash at all.

Round tally taken from git twice, by two independent methods, not from the plan's
prose: **68** `auto/*` branches, the ten below this one (`_0008 _0037 _0026 _0016
_0006 _0041 _0031 _0021 _0011 _0046`) contiguous by commit date; and **11** carry
commits across all refs including this round's. The two agree.

## What I did NOT do

- **Did not start any of the three open feature gaps** (Happy-Hour pricing §4.3,
  booth-close reconciliation §4.5, passport stamps §5.4). Each is ticked as a
  *documented gap* with the missing pieces named; building any of them is new feature
  work that the plan reserves for a human to choose, and hard rule 1 forbids me
  picking one myself.
- **Did not touch `src/`, the specs, or any test.** A carry round that edits code is
  no longer a carry round, and it would move the very hashes I use as evidence.
- **Did not re-run the mutation checks** for the 20 criteria. They are recorded in
  `docs/autopilot/` with their red sets; re-running them costs hours and the unmoved
  hashes already prove the source they were measured against is byte-identical.
- **Did not merge or cherry-pick.** Both require an approval an unattended run cannot
  give; the carry is a path-scoped checkout for that reason.

## Risk

- **This round proves the carry is complete, not that the app is correct.** The
  evidence is that this tree is byte-identical to a tree whose criteria were proven in
  earlier rounds. Every caveat those rounds recorded still stands — most importantly
  that **no pixel is ever measured** (jsdom does no layout), so "centered",
  "readable", "glanceable" and "≥44px" are proven as *declared class values and
  arithmetic on them*, not as rendered output. Someone should still open the Display
  screen and look at it.
- **`main` has moved since these branches were cut and nothing here re-checks that.**
  All 68 `auto/*` branches fork from `735de75` and none has ever merged. The carried
  `frozenZones` audit compares against `git merge-base main HEAD`, so it stays honest,
  but a reviewer merging this PR is merging a tree that has never been integrated with
  any other branch's work. **If several of these PRs are merged in sequence, only the
  first is being reviewed against what it will actually land on.**
- **The three remaining gaps are real product holes, not paperwork.** PWA `icons: []`
  means the app cannot be installed to a home screen; there is no export path in HQ;
  two HQ screens on one booth render identically so an operator cannot tell which
  device just dropped. These are ticked because they are *documented*, which is what
  the goal defines as done — not because they work.
- **Low risk in the mechanical part.** The carry is a checkout of an ancestor-verified
  tree, `git diff` against the source tip is empty, and the Verify command passes with
  every number matching. If a reviewer wants one thing to spot-check, it is that
  `git diff d3ad981 HEAD` shows only `AUTOPILOT.md` and `SUMMARY.md`.
