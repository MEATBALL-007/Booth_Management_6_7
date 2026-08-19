# Round 2026-08-20_0020 — criterion "ประกาศซ้ำ" (re-announce)

> กดบน serving → Display เล่นเสียง+ไฟสำหรับเลขนั้นอีกครั้ง (announcedAt เด้ง)

**Result: criterion met. No production code changed — the gap was entirely in the tests.**

## What I did

- **Synced the stale plan first** (`fbeb6e8`). This branch forked from `735de75` and carried an
  `AUTOPILOT.md` three rounds out of date — 0 boxes ticked, "Next task: Undo". Took the current
  ledger from `54d43b8` (the `2026-08-20_0009` branch) before editing anything.
- **Added 12 tests** (`219d80d`) in two new files:
  - `src/screens/DisplayScreen.reannounce.test.tsx` (7) — an order already serving, *staying*
    serving, announces again when `announcedAt` bumps; stays silent when it does not; a backwards
    `announcedAt` never announces; the flash clears itself after the alert window.
  - `src/screens/QueuePanel.reannounce.test.tsx` (5) — the 🔔 button writes `announcedAt` **and
    nothing else**, targets only the pressed card, and does not exist on waiting or parked cards.
- **Ran 5 mutations** to prove the tests are not vacuous — every one reddened the matching tests.
- **Ticked the criterion and wrote the next handoff** (`7c1a68e`), correcting a wrong claim the
  2026-08-18 round left about the next criterion.

## Why

**Why no production change.** `Q.reannounce` already returns `{ announcedAt: now }` only when the
order is serving, and `newlyAnnounced` already compares `s.announcedAt > was`. I looked for a bug
and did not find one. The criterion was unproven, not broken.

**Why these tests and not the obvious ones.** The pre-existing coverage tested the two easy halves —
`Q.reannounce` as a pure function, and a *new* number starting to serve — and missed the clause the
criterion is actually about: the same number, still serving, announcing a second time. That is
`newlyAnnounced`'s `s.announcedAt > was` branch, and no screen-level test reached it.

**Why `toStrictEqual` instead of `objectContaining`.** `updateOrderStatus` wraps Firestore's
`updateDoc`, which *merges* — any extra field in the patch silently lands on the real document. So
"the patch contains `announcedAt`" is the wrong assertion; "the patch is exactly `{ announcedAt }`"
is the right one. This is the same failure class the Undo round found in August.

**Why I reused the 2026-08-18 branch's work.** `git log --all` showed criterion had already been
proven on `auto/.../2026-08-18_0036` (`0f14c87`, `1f986c0`) — a branch never merged to main, so its
work is invisible to this branch's tree. That round had already hit and fixed a subtle trap I was
walking into (below). Writing a fresh, weaker duplicate would have been worse work. I carried the
two files over under the filenames this round's plan specified, added the explicit `Object.keys`
assertion the plan asked for, and then re-verified everything myself rather than trusting it.

**The trap worth recording:** `useServingAlert` keys its effect on the **serving set only**. A
waiting order arriving never re-runs the effect, so a "does not re-announce" test built on a new
waiting order passes without ever reaching the comparison — green, and vacuous. The case that
genuinely exercises it changes the serving set (one of two serving orders finishes). Mutation 5
below confirms this: it is the *only* test that catches `>` → `>=`.

## Verification

`npm test && npm run build` — run in full, both green:

```
Test Files  41 passed (41)
     Tests  145 passed (145)          (133 before this round + 12 new)

✓ built in 1.18s
PWA v1.3.0  precache 5 entries (846.31 KiB)  →  dist/sw.js generated
```

Mutation checks — each applied to production source, tests run, then reverted (`git status` clean
afterwards, confirmed):

| # | Mutation | Result |
|---|---|---|
| 1 | `reannounce` returns `{}` | **4 panel tests red** |
| 2 | `reannounce` returns `{ status:'serving', announcedAt }` | **3 panel tests red** |
| 3 | `animate-pulse` removed from DisplayScreen root | **2 display tests red** |
| 4 | `playChime()` removed from `useServingAlert` | **3 display tests red** |
| 5 | `newlyAnnounced` `>` loosened to `>=` | **1 display test red** |

**Mutation 2 is the one that matters.** With a bogus `status` leaking into the patch, the three new
strict tests fail — while the pre-existing `QueuePanel.test.tsx` reports **8 passed, 0 failed**. The
old suite was completely blind to it. That is the gap this round closed, demonstrated rather than
asserted.

## What I did NOT do

- **Did not touch production code.** Nothing needed fixing; the mutations above were applied and
  reverted, and the tree is clean.
- **Did not merge the sibling branches' work** (the Undo fix `2791ffe`, the No-show tests
  `38cb57c`/`f2e050c`). Out of scope for a one-task round. This branch therefore still carries the
  **unfixed** `orderSnapshot`, and its Undo/No-show ticks are ledger entries pointing at commits on
  other branches, not proof about this tree.
- **Did not fix the branch fragmentation itself** — it needs a merge to `main`, and I cannot push.
  Recorded in `AUTOPILOT.md` instead.
- **Did not touch** `firestore.rules`, `firestore.indexes.json`, `docs/superpowers/specs/`, `.env*`,
  or accounting/menu/comms logic. No dependencies added.

## Risk

*Reviewer: read these three closely.*

1. **The ticked boxes are a cross-branch ledger, not a statement about this tree.** Undo and
   No-show are ticked in `AUTOPILOT.md` but their code lives on `2026-08-19_0039` and
   `2026-08-20_0009`. On *this* branch `orderSnapshot` is still the pre-fix version and the No-show
   tests are absent. The ticks cite commit hashes so this is traceable, but if these branches are
   merged in the wrong order or dropped, the ledger will overstate what main actually proves.
   **Only the ประกาศซ้ำ tick is backed by code in this branch.**

2. **Two of the three test files are carried from another agent's round.** I re-ran and
   independently mutation-tested them here, and I read them line by line — but I did not write them
   from scratch, and I'm flagging that rather than passing them off as fresh work. The one thing I
   changed beyond the header comments is the added `Object.keys` assertion.

3. **The `reannounce` criterion is proven at the seams, not end to end.** The panel tests assert
   what patch is *sent*; the display tests assert what happens when a bumped `announcedAt` *arrives*.
   Nothing exercises Firestore in between — `ordersRepo` is mocked in both. If `updateOrderStatus`
   itself mangled the patch, this suite would not notice. That's consistent with how the rest of
   this codebase is tested, but it is a real limit on the word "proven".

Minor: the mutation runs edited tracked source files and reverted them with `git checkout -- <path>`.
All work was committed before each mutation, so nothing was at risk, and `git status` was verified
clean afterwards.
