# Round 2026-08-21_0007 — criterion "Display: จัดกึ่งกลางทุกจอ"

## What I did

- **Synced the plan first.** The working copy's `AUTOPILOT.md` was still main's (stale, Undo
  as next task). Adopted `AUTOPILOT.md` from the newest branch tip `f9d2e1a`
  (`auto/…/2026-08-20_0042`) — commit `27e8cf0`. Same convention as rounds `_0031`/`_0042`.
- **Added 16 tests in a new file** `src/screens/DisplayScreen.centering.test.tsx`
  (commit `b81a1da`), proving the criterion's three sub-claims separately:
  centering+responsive, the "เตรียมตัว" callout, and skipped-not-shown.
- **Ran a 9-way mutation check.** Every one of the 16 tests is killed by at least one break.
  Reverted all breaks; working tree is clean.
- **Ticked the criterion in `AUTOPILOT.md`** with the evidence *and* its limits, and handed
  the next criterion ("Display glanceable") on with a 5-point sub-claim breakdown taken from
  `…queue-pro-upgrade-design.md:57-63`, plus a pointer at what looks like a real defect there.
- **No production code changed this round.** The gap was purely in the tests.

## Why

**Why no production change.** All three sub-claims already hold in `DisplayScreen.tsx`. I
looked for a real defect and did not find one I could prove; I did not invent a change to
justify the round. (One candidate I considered and rejected: the callout's `px-10` +
un-wrapped `<h2>` could overflow a ~320px phone. That is the *ui-overhaul* spec's
"no horizontal scroll" criterion, not this one, and jsdom cannot measure it — see Risk.)

**Why structural centering rather than "check the root has `items-center`".** jsdom parses
class attributes but never runs the cascade and never lays anything out. A root-only class
check is nearly worthless — the root can be perfectly centered while a section three levels
down is `items-start`. So the tests walk the ancestor chain from each rendered number
(`serving`, `next-up`, `upnext`, and the placeholder) up to the root and enforce the actual
CSS rule: a `flex-col` box centers horizontally with `items-center`, a flex *row* with
`justify-center`. Confusing those two is exactly how a "centered" layout silently drifts
left, and the test now fails if any box in the chain gets it wrong.

**Why `root.textContent` for the skipped claim.** Asserting "A2 is not under testid X" passes
even if the number leaks into some new section. Asserting the number is absent from the whole
subtree is the claim the spec actually makes (`…design.md:54`, "skipped ไม่โชว์บนจอลูกค้า").

**Why "เด่น" became a size-hierarchy assertion.** "Prominent" is not directly testable. The
falsifiable form is: the callout's clamp *floor* (56px) exceeds the small pills' *ceiling*
(`text-2xl` = 24px), so the hierarchy holds at every viewport width — plus the pills carry no
`vw` unit at all while the callout does.

**The plan's guess about sub-claim 3 was wrong.** It said skipped-not-shown "น่าจะมีเทสต์อยู่แล้ว"
in `DisplayScreen.test.tsx`. That test exists only on the never-merged `_0018`/`_0019_0039`
branches. On this branch (identical to `main`, verified `git diff main..HEAD` empty) there was
no such test. I wrote it. I recorded this as a new trap in the plan.

## Verification

Verify command, run unmodified:

```
npm test   →  Test Files  40 passed (40)
              Tests      149 passed (149)      [133 on main + 16 new]
npm run build → ✓ built in 1.50s
                PWA v1.3.0  precache 5 entries (846.38 KiB)  dist/sw.js generated
```

Mutation check — 9 breaks, each applied alone, then reverted:

| # | Break | Tests killed |
|---|-------|--------------|
| A | root `items-center justify-center` → `items-start` | 5 (root + all 4 chain tests) |
| B | serving row loses `flex-wrap justify-center` | 2 |
| C | pill row loses `justify-center`; drop `md:p-12`; drop `max-w-[90vw] break-words` | 3 |
| D+E | strip callout `border-2`/yellow bg/shadow; clamp floor 56px → 20px | 2 |
| F | `const [next, ...rest]` → `rest = upNext` (spotlight leaks into pills) | 4 |
| G | callout renders even when nobody is waiting | 2 |
| H | `upNextOrders` also admits `skipped` | 4 |
| I | `servingOrders` drops the recalled id (post-echo only) | 1 |

**Every one of the 16 tests died in at least one break.** Break I was run specifically against
the vacuity trap recorded last round: it changes behaviour *only after* the second snapshot,
and it killed the recall test alone — so that test's post-echo half is load-bearing, not decoration.

## What I did NOT do

- **Did not prove centering in pixels.** Nothing here measures layout. The file's header
  comment says so in the file itself, and the tick in `AUTOPILOT.md` says so too. Closing this
  criterion at pixel level needs a real browser (Playwright/chrome-devtools are available in
  the harness but that is a different, larger task and was not this round's scope).
- **Did not touch** `firestore.rules`, `firestore.indexes.json`, `docs/superpowers/specs/`,
  `.env*`, accounting/menu/comms logic, or any existing test file. No new dependencies.
- **Did not start the next criterion** ("Display glanceable"), though I scouted it while
  reading the spec and wrote what I found into the handoff — including a likely real defect
  (see Risk).
- **Did not tick any checkbox in `docs/`** (per the project convention: `AUTOPILOT.md` only).

## Risk

Things a reviewer should look at closely:

1. **These are class-name tests, not layout tests.** They will pass against markup that is
   visually broken in a way Tailwind classes don't capture (e.g. a parent with a fixed width,
   an `absolute` position, or a CSS override in `index.css`). They are a regression fence
   around the *intent*, not proof of the rendered result. Do not read the ticked box as
   "verified on an iPad".
2. **Test 7 (`md:p-12`, `md:gap-14`) is the weakest of the 16.** It pins two specific
   breakpoint utilities; a redesign that is still responsive but uses different classes would
   fail it. It is a change-detector more than a behaviour test. I kept it because "responsive"
   is in the criterion text and this is the only class-level evidence of it, but it is the
   first thing to relax if it gets noisy.
3. **`PILL_MAX_PX = 24` is a hardcoded Tailwind fact** (`text-2xl` = 1.5rem). If the theme
   overrides the `text-2xl` scale in `tailwind.config`, that constant goes stale silently.
   It is commented at the call site.
4. **Possible real defect, NOT fixed this round (out of scope, handed to the next):**
   `DisplayScreen.tsx:46-48`, `:50-52`, `:93-95` render Thai and English at *identical* size
   inside one element (`{nowServing.th} · {nowServing.en}`). The spec's glanceable requirement
   (`…design.md:61`) says "label ไทยเด่น อังกฤษเป็นตัวรองเล็ก", and `:37` / `:78` already do
   demote English. If that reading is right this is a genuine production bug against the
   *next* criterion. I deliberately did not fix it — that is scope creep into a criterion I
   was not asked to close, and fixing it here would have merged two rounds' evidence. It is
   written up as item 5 of the next task, including the two existing tests
   (`DisplayScreen.test.tsx:70,76`) a fix must not break.
5. **Branch isolation, as always.** This branch is `main` + this round's 3 commits. The
   `callSpecific`, `idempotency`, undo, no-show and re-announce test files from earlier rounds
   are on unmerged sibling branches. Merge order will decide whether they ever coexist; none
   of them touch `DisplayScreen.centering.test.tsx`, so this file should merge cleanly, but
   `AUTOPILOT.md` will conflict with every sibling branch (it always does).
