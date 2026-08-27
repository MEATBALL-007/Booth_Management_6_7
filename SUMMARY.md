# Round summary — 2026-08-28, branch `auto/Booth_Management_6_7/2026-08-28_0044`

Task: the **ประกาศซ้ำ / re-announce** acceptance criterion —
*กดบน serving → Display เล่นเสียง+ไฟสำหรับเลขนั้นอีกครั้ง (announcedAt เด้ง)*.

**Criterion ticked.** No production code was changed: the feature was already
implemented correctly; what was missing was any test that it holds.

## What I did

- **Corrected the branch's starting state before doing anything else.** The plan
  I was handed claimed No-show was "ผ่านแล้วบน branch นี้", but this branch was
  bare at `735de75` — no audit files, and the working copy's `AUTOPILOT.md` was
  the *stale* one still handing off Undo with 0 boxes ticked. Adopted the ledger
  from `_0026` (`ca794eb`) **and** carried `src/noShowRecall.audit.test.tsx` +
  its audit note, so the No-show tick I inherited is actually true here
  (133 → 147 tests). Commit `c63df20`.
- **Carried `src/reannounce.audit.test.tsx` from `68eb1c4`** by exact path
  (15 tests; 147 → 162). Commit `2d3a9c6`.
- **Mutation-checked all 15 tests myself with 9 mutations**, each prediction
  written down before the run. All 9 matched exactly. Every test has at least
  one mutation that kills it — none is green for free.
- Wrote `docs/autopilot/2026-08-28-reannounce-audit.md` with the mutation matrix,
  the per-test kill table, and an explicit **scope of the evidence** section.
- Ticked the criterion in `AUTOPILOT.md` and rewrote **Next task** to carry Undo
  (`ca1179f`) onto this branch, with the specific hazards I verified this round.

## Why

**Why I touched No-show at all, when the rule is one task per round.** The ledger
I was told to adopt ticks No-show. Writing that ledger onto a branch with no such
test would have published a false tick — the one outcome the instructions call
worse than no summary. Carrying the file (a pure test file, zero production
change) was the minimum needed to make the inherited tick honest. The actual
round's work is ประกาศซ้ำ; No-show is a truthfulness fix to a ledger I did not
write, and it is in its own commit so a reviewer can separate them.

**Why `git checkout <commit> -- <exact path>` and never `-- src/`.** `68eb1c4`
branched from `735de75` and so does **not** contain `noShowRecall.audit.test.tsx`.
A blanket sweep would have deleted this round's earlier work silently, and the
suite would still have gone green at a lower count — which looks like success.
I checked the file was still present after the checkout rather than assuming.

**Why the mutation check found real problems.** Two of the nine mutations were
worthless as first written, and both would have produced *misleading* results:

- **M6 never matched the file.** The pattern ended `return null\n` but the source
  is CRLF, so the literal `\n` could not follow `null`. My harness printed
  `DID NOT MATCH … proves nothing` instead of an empty red set — without that
  guard, the honest-looking conclusion would have been "A2 proves nothing",
  the exact opposite of the truth. M6 also had to be **anchored** on
  `export function reannounce`, since the identical guard line appears in
  `markDone` and `skip`.
- **B3 survived M1–M8 entirely.** Running a mutation set and finding a test green
  is not the end of the check — the union of the red sets has to cover *every*
  test. I added M9 (leak the 🔔 button onto waiting cards) specifically to attack
  B3, and it killed it.

## Verification

Verify command, run unmodified:

```
npm test      → Test Files 41 passed (41),  Tests 162 passed (162)
npm run build → tsc -b && vite build → ✓ built in 2.67s, PWA precache 5 entries
```

`build` is `tsc -b && vite build`, so the new `.tsx` test file was typechecked,
not just executed — a green `vitest run` alone would not have shown that.

Mutation matrix (predicted **before** each run; all 9 matched):

| # | Mutation | Predicted red | Actual red |
|---|---|---|---|
| M1 | `reannounce()` returns `{}` | A1, B1, B2, B4 | A1, B1, B2, B4 ✅ |
| M2 | `newlyAnnounced`: `>` → `>=` | C1, C3 | C1, C3 ✅ |
| M3 | `newlyAnnounced`: `>` → `!==` | C2, D3 | C2, D3 ✅ |
| M4 | flash never | D1, D3, D5, D6 | D1, D3, D5, D6 ✅ |
| M5 | flash always | D2, D3, D6 | D2, D3, D6 ✅ |
| M6 | `reannounce` loses its status guard | A2 | A2 ✅ |
| M7 | `playChime()` never called | D1, D3, D4, D5, D6 | D1, D3, D4, D5, D6 ✅ |
| M8 | panel re-announces every serving order | B4 | B4 ✅ |
| M9 | 🔔 button leaks onto waiting cards | B3 | B3 ✅ |

The mutation harness was a temporary file (`mutate.tmp.mjs`); it is deleted, and
`git diff HEAD -- src/` is empty, so no mutation survived into the tree.

## What I did NOT do

- **Did not port Undo.** It is ticked on the ledger I adopted but is genuinely
  **not on this branch** — the ledger's own note says so, and I left that note
  standing rather than quietly ticking it. It touches real production code
  (`ordersRepo.ts`, `queueActions.ts`, `QueuePanel.tsx`), so it is a task, not a
  carry, and it is now the Next task with the hazards spelled out.
- **Did not change any production code**, and did not touch `firestore.rules`,
  `firestore.indexes.json`, `docs/superpowers/specs/`, `.env*`, or dependencies.
- **Did not build a per-number flash.** The spec says "ไฟสำหรับเลขนั้น" (light for
  *that number*); the flash is a class on the root of the whole screen, so it is
  per-screen by construction. I recorded this as an unmet part of the criterion
  in the audit note rather than writing a test that pretends otherwise.

## Risk — read this closely

1. **The tick is narrower than the criterion's wording.** "ไฟสำหรับเลขนั้น" is
   proved *for the chime and the write* (the right number, the right order, once)
   but **not for the flash**, which is whole-screen. If a reviewer reads the tick
   as "each number flashes individually", that is wrong. D5 and the audit note
   both say so explicitly.
2. **No sound is ever produced and no pixel is ever measured.** `display/chime`
   and `ordersRepo` are mocked whole. "chime" = `playChime` was called; "flash" =
   the root element *declared* `animate-pulse`. A muted tab, a broken audio asset,
   an autoplay policy, or a Tailwind class that no longer exists would all still
   be green.
3. **Nothing here touches Firestore.** The write path is asserted at the
   `updateOrderStatus` boundary. Merge semantics and offline sync are the Undo
   criterion's territory and remain unproven on this branch.
4. **This branch still does not reach main.** Like every `auto/*` branch before
   it, it forks from main and is never merged back — main has none of Undo,
   No-show, or ประกาศซ้ำ. Two of the three now sit here together; the value of
   this work is only realised if the branch is actually merged. I flagged that in
   the Next task, but I cannot push or open a PR.
5. **The No-show carry is work I did not originate this round.** I re-ran the
   suite with it and it is green, but I did **not** re-run its own 8-mutation
   matrix — I relied on the audit note from round `_0026`. The ประกาศซ้ำ matrix
   above is entirely my own.
