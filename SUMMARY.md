# Round summary — 2026-08-21 (0020)

Criterion under test: **Display glanceable — มองแวบเดียวเข้าใจได้โดยไม่ต้องอ่านอังกฤษ
(สี + ไอคอน + ขนาด; ไทยเด่น อังกฤษรอง)**, from `2026-08-04-queue-pro-upgrade-design.md`.

## What I did

- **Synced `AUTOPILOT.md`** from the newest branch (`_0007`) before touching anything — the
  working copy still carried the stale Undo task (commit `b2faba8`).
- **Found and fixed a real production bug** (sub-claim 5, "ไทยเด่น อังกฤษรอง"). The spec requires
  every label to read Thai-first with English as a small, dim secondary line. Two labels already
  did this; **three did not** — they rendered `ไทย · English` as one flat text run at one size,
  one weight and one colour:
  - `DisplayScreen.tsx:47` — `🔔 กำลังทำ · Now Serving`
  - `DisplayScreen.tsx:51` — placeholder `ยังไม่มีคิว · No orders yet`
  - `DisplayScreen.tsx:94` — `คิวถัดไป · Up Next`
- **Added 15 tests** in a new file `src/screens/DisplayScreen.glanceable.test.tsx`, covering all
  five sub-claims the spec breaks the criterion into (colour / icon / size / pulse / Thai-first).
- **Broke the code 10 different ways** and confirmed **every one of the 15 tests dies to at least
  one break**. Reverted all breaks; worktree verified clean before the final run.
- **Ticked the criterion** in `AUTOPILOT.md` and handed off the next one (the last criterion of
  the queue-pro-upgrade spec) with a concrete audit method rather than a vague instruction.

## Why

**Why this counts as a bug, not a matter of taste.** I did not decide the flat labels were ugly.
The same file already implements the Thai-first pattern **twice** — the booth name (`:37`) and the
get-ready callout (`:78`) both wrap the English half in a `<span>` with `font-normal` plus a
smaller or dimmer treatment. So the three offenders are an *internal inconsistency* against a
pattern the codebase itself established, and the spec names the rule explicitly
(`label ไทยเด่น อังกฤษเป็นตัวรองเล็ก`). The plan predicted this and asked me to confirm it rather
than assume; writing the tests first confirmed it in the strongest available way — see below.

**Why the fix is safe for the six pre-existing display tests.** Testing Library's `getByText`
matches on `getNodeText`, which reads only an element's **direct text-node children**, not its
full `textContent`. Moving the English into a child `<span>` therefore moves *which element*
matches `/Now Serving/`, but the string is still findable. Nothing was reworded, added or removed
— it is a pure DOM restructure. `DisplayScreen.test.tsx:70,76` still pass untouched.

**Why the tests are shaped the way they are.**
- `hue()` returns a **joined list** of every status colour an element declares, not the first
  match. If someone paints the next-up zone orange as well, it returns `'orange+yellow'` and
  fails, instead of silently passing on the first hit.
- The size ladder asserts **all three clamp parameters** (`min`, `vw`, `max`) dominate, which is
  what actually guarantees serving > next-up at *every* viewport width — checking one number
  would let the hierarchy invert at some screen size.
- The last test is a **sweep over every element in the tree**, not an enumeration of three known
  labels, so a bilingual label added flat in future fails on day one.
- The pulse test asserts on the **root element specifically**. The LIVE badge dot at `:40` carries
  a permanent `animate-pulse`, so a test phrased as "something on screen pulses" would be
  vacuously green forever.

**Why I left the LIVE badge alone** — see "What I did NOT do".

## Verification

**The gap was real — proven before the fix.** Running the new tests against unmodified production
code gave **4 failures**, and the sweep test named the offenders itself rather than me asserting
them:

```
FAIL … > the now-serving heading demotes its English half
FAIL … > the up-next heading demotes its English half
FAIL … > the empty-board placeholder demotes its English half
FAIL … > no bilingual label anywhere on the screen is left as one flat text run
AssertionError: expected [ '🔔 กำลังทำ · Now Serving', …(1) ] to deeply equal []
+   "🔔 กำลังทำ · Now Serving",
+   "คิวถัดไป · Up Next",
      Tests  4 failed | 11 passed (15)
```

The other 11 passed unchanged, confirming the plan's read that sub-claims 1–4 were already
correct in production and only needed locking down.

**Break-testing — 10 breaks, every test killed at least once.** Each break was applied alone and
reverted before the next:

| # | Break applied | Tests killed |
|---|---|---|
| 1 | `QueueNumber` recoloured yellow (`glow-y`, yellow gradient) | colour: 3-distinct-tokens; glow-o vs glow-y |
| 2 | Callout card de-yellowed (`border-phantom-line`, `bg-phantom-surface2`) | callout is a yellow *card* |
| 3 | Serving heading icon changed 🔔 → 👉 | icons differ; photo-booth keeps 🔔; (+ now-serving Thai-first) |
| 4 | Serving clamp shrunk to `clamp(50px,8vw,120px)` | size ladder |
| 5 | Pills given `text-[clamp(20px,4vw,60px)]` | pills must not scale |
| 6 | Callout floor dropped to `clamp(20px,…)` | size ladder — `expected 20 to be greater than 24` |
| 7 | Root forced always-pulsing | baseline snapshot is calm |
| 8 | `min-h-screen` removed from root | pulse is on the full-screen root |
| 9 | Root forced never-pulsing | new serving number pulses (+ full-screen root) |
| 10 | Booth-name English span flattened | booth/callout already comply; DOM-wide flat-label sweep |
| — | *unmodified production code* | the 4 Thai-first tests listed above |

Breaks 4 and 6 are deliberately separate: 4 kills the serving > next-up rung, 6 kills the
next-up > pills rung (`expected 20 to be greater than 24`). Neither assertion is dead weight.
Break 8 kills the full-screen-root test *alone*, proving it is not a duplicate of break 9's test.

**Verify command — run in full, as specified:**

```
$ npm test
 Test Files  40 passed (40)
      Tests  148 passed (148)
   Duration  24.95s

$ npm run build
 ✓ built in 2.07s
 PWA v1.3.0  mode generateSW  precache 5 entries (847.14 KiB)
 files generated: dist/sw.js, dist/workbox-9c191d2f.js
```

Both pass. (148 = 133 pre-existing + 15 new.) The build emits a pre-existing
"chunk larger than 500 kB" **warning**, not an error; it is unrelated to this change and I did
not touch it.

## What I did NOT do

- **Did not fix the LIVE badge** (`DisplayScreen.tsx:41`), which renders only English (`LIVE`)
  with no Thai counterpart. I judged this **not a violation**: the criterion is about bilingual
  label *pairs* being mis-weighted, and the badge's meaning is carried by the pulsing green dot
  next to it — which is exactly the "understand it without reading" mechanism the spec asks for.
  Recording the judgement here so it is a decision, not an unknown. A reviewer who disagrees has
  a one-line fix available (`L('display.live').th` = `สด` already exists in `labels.ts:43`).
- **Did not carry over `DisplayScreen.centering.test.tsx`** from branch `_0007`. Branches here
  never merge, so I kept this branch's diff to this round's criterion only.
- **Did not touch** `firestore.rules`, `firestore.indexes.json`, `docs/superpowers/specs/`,
  `.env*`, `.firebaserc`, or any accounting/menu/comms logic. No dependencies added.
  The whole production diff is 3 labels in one presentation component.

## Risk

**The honest limit of this evidence: jsdom runs no cascade and performs no layout. Not one
assertion in this file measures a pixel, a computed colour, or a rendered glyph.** Everything is
proven at the level of *declared design tokens* (which Tailwind class sits on which element) plus
DOM structure. This is stated in the test file header as well as here.

Concretely, what that means per sub-claim:
- **Colour** — proves the three zones declare three different tokens. Does **not** prove those
  tokens resolve to visually distinguishable colours, or that they pass any contrast threshold.
- **Size** — proves the declared `clamp()` ladder cannot invert. Does **not** prove the numbers
  are legible from 5 metres; `22vw` was never measured on a real panel.
- **Pulse** — proves the class toggles between the two states. Does **not** prove the animation
  is perceptible, or that it stops after `FLASH_MS`.
- **Thai-first** — this one is the strongest, because "English lives in its own element carrying
  de-emphasis classes" is genuinely a structural fact. But whether `text-base` next to
  `text-2xl` reads as *subordinate enough* at a distance is still a visual judgement I could not
  make here.

**The spec's own acceptance test — "ทดสอบ 5-เมตร/3-วินาที" — therefore remains unproven.** Closing
it needs a real browser at real viewport sizes, which is out of reach in this environment. I have
ticked the criterion because every sub-claim is now either locked by a test or explicitly
recorded as a gap, which is the standard this project set; a reviewer who wants the pixel-level
claim should treat the tick as "structurally verified" and not "visually verified".

**Second thing to look at closely:** the size-ladder test hard-codes a small Tailwind
`text-*` → px table (`TW_PX`). I checked: `tailwind.config` has **no `fontSize` override**, so the
table matches the defaults actually in effect today. But if someone adds one later, the table
silently goes stale and the test would compare the wrong numbers against a real stylesheet. It
throws rather than skipping when it meets a size it doesn't know, which limits the blast radius,
but it is the most brittle thing I added.
