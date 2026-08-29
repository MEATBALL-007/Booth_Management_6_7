# Round summary — `auto/Booth_Management_6_7/2026-08-30_0039`

Criterion closed: **"Display: จัดกึ่งกลางทุกจอ (responsive), 'เตรียมตัว' callout เด่น, skipped ไม่โชว์"**
(6 of 20 acceptance criteria now ticked)

## What I did

- **Carried the five already-proven criteria onto this branch** (`e41c252`). The branch was cut
  fresh from `main` (735de75) and held **0** of them, exactly as the previous handoff predicted.
  Carried by explicit path from `auto/…/2026-08-30_0004`, 17 files named one by one.
- **Wrote `src/displayCentering.audit.test.tsx` — 15 tests** covering two of the criterion's
  three parts: centring on both axes across the whole flex ancestor chain, and the
  "เตรียมตัว" callout being structurally distinct from the up-next pills.
- **Cited rather than duplicated the third part.** "skipped ไม่โชว์" is already proved by
  `noShowRecall.audit.test.tsx` **B1–B4**; B4 in particular proves the filter is a whitelist,
  not a blacklist. Re-testing it here would have added green tests and no evidence.
- **Ran a 13-mutation check, predicting each red set before running.** 10 of 13 exact.
- **Wrote `docs/autopilot/2026-08-30-display-centering-audit.md`** with a "ขอบเขตของหลักฐาน"
  section, the full mutation table, the three misses and why, and the no-killer analysis.
- **Changed no production code.** `DisplayScreen.tsx` was already correct on all three parts.

## Why

**The axis rule is the whole point.** A root-only class check proves nothing, because `flex-col`
and row invert the meaning of `items-center`: on a column it centres horizontally, on a row it
centres *vertically*. So the tests walk every flex box from the content up to the root and encode
the direction rule explicitly. The serving-number chain is four levels deep and **changes
direction in the middle** (`col, row, col, col`), so both branches of the rule are genuinely
exercised — M5 confirms it, killing A2 by breaking a mid-chain box while the root stays perfect.

**`min-h-screen` is load-bearing and easy to miss.** `justify-center` inside a box that hugs its
own content centres nothing, so A1 pins it separately. M3 confirms A1 catches its removal.

**A0 tests the checker, not the product.** The sweeps use `expect(offenders).toStrictEqual([])`,
which stays green if the helper goes blind — `[].filter(anything)` is also empty. A0 pins the
axis rule against hand-built fixtures, including the inversion case. No production mutation can
kill it; that is deliberate and stated in the record.

**B3's first version was wrong and I narrowed it rather than exempting the failure.** "Every flex
row must declare `flex-wrap`" went red on the LIVE badge — a fixed two-part atom that declares
`shrink-0` on purpose. The real hazard is a row whose child count grows with the order list, so
B3 now sweeps exactly those rows (found by walking up from the repeated queue numbers) and pins
the LIVE badge separately as exempt *by its own declaration*, rather than quietly skipping it.

## Verification

`npm test && npm run build` — run at the end, on the committed tree:

```
Test Files  46 passed (46)
     Tests  237 passed (237)
✓ built in 3.65s
PWA v1.3.0  precache 5 entries (846.66 KiB)
```

Baseline after the carry was 222; this round adds 15.

**Mutation check — 13 mutations, red set predicted before each run:**

| # | mutation | predicted | actual (this file) | ✓ |
|---|---|---|---|---|
| M1 | root: drop `justify-center` | A1 | A1 | ✅ |
| M2 | root: drop `items-center` | A1,A2,A3 | A1,A2,A3,**A4** | ❌ |
| M3 | root: `min-h-screen`→`h-screen` | A1 | A1 | ✅ |
| M4 | serving row: drop `flex-wrap` | B3 | B3 | ✅ |
| M5 | serving row: `justify-center`→`justify-start` | A2 | A2,**A4** | ❌ |
| M6 | drop head/tail split (`rest = upNext`) | C1,C2,C6 | C1,C2,C6 | ✅ |
| M7 | callout: drop `shadow-[…]` glow | C4 | C4 | ✅ |
| M8 | callout number: clamp→`text-2xl` | B1,C5 | B1,C5 | ✅ |
| M9 | callout number: yellow→muted | C5 | C5 | ✅ |
| M10 | detail span: drop `break-words` | B3 | B3 | ✅ |
| M11 | `upNextOrders`: whitelist→`!== 'skipped'` | C1,C2,C6,C7 | C1,C2,C6,C7 | ✅ |
| M12 | root: drop `md:p-12` | B2 | B2 | ✅ |
| M13 | callout h2: `getReady`→`upNext` | C3 | C3,**C6** | ❌ |

**The three misses, honestly:** M2 and M5 both also killed **A4**, because A4 asserts the serving
chain is clean *before* splicing in a bad box — so anything that breaks the baseline kills it too.
A4 is a canary for the whole chain, not just a splice test. M13 also killed **C6** because I picked
`display.upNext` as the replacement label, which is exactly the string C6 negatively asserts on.

**I also got M11 wrong outside this file.** I predicted `noShowRecall` B1–B3 would go red. They
stayed green — **correctly**, because a `!== 'skipped'` blacklist still excludes skipped orders.
What it actually breaks is `serving`/`done` orders leaking into the up-next list. The lesson is in
the record: ask which *property* a mutation destroys, not which tests it sits near.

**Coverage:** 14 of 15 tests have at least one killer. Single-killer tests (do not delete):
**A3, B1, B2, C3, C4, C7**. M12 and M13 were added specifically because M1–M11 could not kill
B2 or C3 — a full green run was not treated as the end of the check.

## What I did NOT do

- **Did not re-test "skipped ไม่โชว์".** Already proved by `noShowRecall.audit.test.tsx` B1–B4,
  cited in the test file header, the audit doc, and `AUTOPILOT.md`.
- **Did not touch any production source.** No `src/` file changed this round beyond the carry;
  `DisplayScreen.tsx` was already correct. Every mutation was reverted (`git status` verified
  clean before the final Verify run).
- **Did not start the next criterion** (Display glanceable), per the one-task rule. `AUTOPILOT.md`
  now names it, with the specific gap I noticed while reading the source — see Risk.
- **Did not measure a single pixel**, and did not write anything pretending to.

## Risk

**Read this before trusting the tick.** jsdom loads no stylesheet, resolves no Tailwind class,
computes no layout, and has no viewport — every `getBoundingClientRect()` returns zeroes. What
these tests assert is **the class declared on each element of the ancestor chain**. The step from
there to "the screen looks centred in a school hall" assumes Tailwind emits the flexbox rules it
documents. That assumption is **stated, not proved**. Treated honestly this is a regression fence:
it catches centring being removed, or an uncentred box being introduced mid-chain. It cannot catch
a Tailwind config change, a CSS specificity conflict, or anything about how it actually renders.
The same caveat applies to "responsive" (proved as `clamp()`/`md:`/`flex-wrap` being *declared*)
and to "เด่น" (proved as a strictly larger declared type size and a different colour token).

**A reviewer should look hardest at A2/A3's `toStrictEqual(['col','row','col','col'])` assertions.**
They pin the exact DOM shape, so a legitimate refactor of `DisplayScreen.tsx` will break them.
That is intended for an audit fence, but it is the most likely source of future friction.

**One thing I noticed and did not act on:** the LIVE badge renders `L('display.live').en` only —
English with no Thai, even though the label defines `{th:'สด', en:'LIVE'}`
(`src/screens/DisplayScreen.tsx:41`). That is out of scope for *this* criterion but is squarely in
scope for the **next** one ("glanceable — เข้าใจได้โดยไม่ต้องอ่านอังกฤษ"). I have written it into
`AUTOPILOT.md` as the likely first real gap of that round, flagged as something to *judge* — the
pulsing green dot may already carry the meaning without the word — rather than assume is a bug.
