# Round `auto/Booth_Management_6_7/2026-09-10_0029`

## What I did

- **Carried the twenty proven criteria onto this branch.** It was cut from bare
  `main` (`735de75`) and held none of the audit work — 49 files, ~14.4k lines,
  **41 added / 8 modified / 0 deleted**, including all 24 `*.audit.test.*` files
  and the 20 `docs/autopilot/` records.
- **Proved the carry was safe *before* running it.** `git merge-base HEAD ffc8971`
  returned HEAD exactly, so the newest sibling (`_0018`) strictly descends from this
  commit and its tree is a superset — a one-command whole-tree carry cannot drop a
  file. Confirmed byte-complete afterwards: `git diff ffc8971` printed **0 lines**,
  checked *before* the commit.
- **Ran the Verify command and matched the recorded baseline on both witnesses** —
  the 453-test tally and all three vite content hashes.
- **Counted the round with grep first, branch order second**, the order `_0018`
  prescribed. Both return 11 prior carries and agree with no gaps.
- **Touched no `src/` line.** No production code, no test, and no spec was authored,
  edited, or deleted this round.

## Why

The prompt's `## Next task` arrived **empty**. The carried plan's `## Next task` is a
standing order for exactly that case: all 20 acceptance criteria are ticked (17 proven
by tests, 3 closed as *documented gaps*), it states plainly that no agent-doable work
remains, and it instructs — carry → verify → correct the line → stop, don't invent
work. Hard rule 5 makes a round that only corrects the plan a successful round; hard
rule 1 forbids substituting a task I picked myself.

**The working copy's `AUTOPILOT.md` lied on arrival.** Bare `main` carries an old
revision of the plan whose `## Next task` said *"do the Undo criterion, use the
2026-08-13 findings doc as the spec"* — work finished on 2026-08-28 and ticked in the
carried plan. Following the working copy would have rebuilt a solved criterion from
scratch. The plan has to be read off the newest `auto/*` branch before it is obeyed.

Carrying is not optional busywork. An uncarried branch **is** bare `main`, so the PR
the runner opens from it would propose **deleting every audit file**. It is the one
thing that must happen even in a round with no feature work.

I used the blanket `checkout <tip> -- .` rather than a path-by-path carry only because
the `merge-base` check licensed it. **That check is what makes it safe, not the
command:** against a *diverged* sibling the identical command silently removes files
that branch never had, and the suite then goes green at a lower test count — which
looks exactly like success.

I verified against the bundle hashes and not just the test count, because the two
witnesses answer different questions. 453 green proves no behavioural regression, but
a mutation stranded in `src/` can stay green — this repo has been bitten by that twice
(`_0041` leaked M15, `_0006` leaked M5, both committed by the runner as "rescued
work"). Vite names chunks by content hash, so three matching hashes prove the
compiled source is identical byte for byte, which no test tally can.

## Verification

Ran the Verify command in full: `npm test && npm run build`. Both passed.

```
Test Files  59 passed (59)
     Tests  453 passed (453)

tsc -b                          passed (no output)
vite v8.1.5                     116 modules transformed
dist/assets/index-bTUIGpdg.css  16.31 kB │ gzip:   4.22 kB
dist/assets/index-CyVIMiFT.js  852.15 kB │ gzip: 257.63 kB
PWA v1.3.0  generateSW  precache 5 entries (849.13 KiB)
dist/sw.js · dist/workbox-9c191d2f.js
```

Every number matches the baseline recorded by `_0018` / `_0008` / `_0037` / `_0026` /
`_0016` / `_0006` / `_0031` / `_0021` / `_0011` / `_0046`, and **all three content
hashes** (`index-bTUIGpdg.css`, `index-CyVIMiFT.js`, `workbox-9c191d2f.js`) are
unchanged — the carry is complete and nothing is stranded in `src/`.

The 852 kB chunk-size warning and the jsdom `Falling back to memory cache` notice are
both pre-existing and present in every recorded round.

## What I did NOT do

- **Did not start any of the recorded gaps** — Happy-Hour pricing, passports, cash
  reconciliation, HQ export, PWA icons, the donation thermometer, the `rounded-xl`
  vs `2xl` inversion. Each is pinned by a test that asserts the *absence* and is
  documented; each also needs a human decision (design values, order schema, or
  writing logic that Out of scope forbids). Hard rule 1 allows one task, and the
  standing order says stop rather than pick one.
- **Did not re-run any mutation check.** The tables are committed in
  `docs/autopilot/`; re-running them changes nothing and risks leaving a live
  mutation behind if the round dies mid-run — which is how `_0041` and `_0006`
  ended up with mutations committed as rescued work.
- **Did not touch `src/`, the specs, `firestore.rules`, or `.env*`.**

## Risk

**Low — but the reviewer should check one thing specifically.**

- **The one claim worth auditing is the carry's completeness.** It rests on
  `merge-base HEAD ffc8971 == HEAD` plus a zero-line `git diff` against the sibling.
  Re-run `git diff ffc8971` on this branch; anything other than empty means I am
  wrong. The 0-deletion count in the staged diff is the corroborating witness.
- **`git status` was clean on arrival**, so unlike `_0041` / `_0006` / `_0047` this
  branch inherited no stranded mutation. The three matching bundle hashes are the
  positive evidence for that, not merely the absence of a red test.
- **Nothing here was proven this round that was not already proven.** This round adds
  no test and no coverage; it only makes the branch equal to the newest sibling and
  re-confirms the baseline. Its value is entirely that the PR does not delete 14.4k
  lines of audit work.
- **The plan is now 27 empty-plan rounds deep.** The verifiable chain reaches back to
  `_0046` (round 16); rounds 1–15 are inherited from prose in `AUTOPILOT.md` and were
  not re-checked. **The project needs a human to choose the next criterion or to stop
  the runner** — the agent has no remaining in-scope work, and each round costs a full
  test-and-build cycle to restate the same result.
