# SUMMARY — round `auto/Booth_Management_6_7/2026-08-31_0009`

Criterion done: **"Display glanceable: มองแวบเดียวเข้าใจได้โดยไม่ต้องอ่านอังกฤษ
(สี+ไอคอน+ขนาด; ไทยเด่น อังกฤษรอง)"** — the 7th of 20.

## What I did

- **Carried the six already-proven criteria onto this branch.** The runner cut it
  fresh from `main` (735de75, 131 tests), so it held none of them. Copied by
  explicit path from `6507414` — never `git checkout <sha> -- src/`, which would
  silently delete files that commit never had. → 237 tests green.
- **Measured the gap before changing anything.** Wrote all 15 tests first and ran
  them against the untouched screen: **8 of 15 failed.** `S1` printed the offenders
  as `DisplayScreen.tsx:37/41/47/51/79/94`.
- **Fixed two real defects in `src/screens/DisplayScreen.tsx`** (the only production
  file touched):
  1. Three sites (`now-serving`, `ยังไม่มีคิว`, `คิวถัดไป`) rendered Thai and English
     in the *same element* at identical size, weight and colour — peers, not a lead
     and a subordinate. The header differed only in weight/colour, not size.
  2. The LIVE badge rendered `.en` **alone**, though `display.live` has carried
     `th: 'สด'` all along. Now `สด · LIVE`.
  Both closed by routing every `.en` through one `<En>` wrapper.
- **Ran a 16-mutation check with the red set predicted before each run: 15 of 16
  exact.** The one miss found a genuinely weak assertion (below), which I fixed.
- Wrote `docs/autopilot/2026-08-31-display-glanceable-audit.md`, ticked the
  criterion in `AUTOPILOT.md`, and set the next task.

## Why

**Why `text-[0.7em]` and not a named step like `text-sm md:text-base`.** The Thai
headings this hangs off change size at `md:`. A named subordinate step has to
restate itself at every breakpoint, and one forgotten `md:` override inverts
"ไทยเด่น อังกฤษรอง" **at one width only** — which no single-viewport test would ever
see. An `em` factor is strictly smaller than whatever it sits in, at every width,
by construction. That is what makes this **one sweepable rule** instead of six
hand-tuned exceptions. `0.7` is not invented: it is the ratio the `เตรียมตัว`
callout already used (`text-sm` inside `text-xl`), generalised.

**Why I judged the English-only LIVE badge a bug rather than acceptable.** The
plan allowed either reading, on the grounds that the green pulsing dot may already
carry the meaning. The dot does say "this screen is alive" — but the word `LIVE`
sitting beside it is not "English secondary", it is **English only**, which is the
thing the criterion names. The Thai half already existed in `labels.ts`, so closing
it cost one label lookup and no new string.

**Why the sweep finds English by *script* (`/[A-Za-z]{2,}/`) rather than by a list
of label keys.** A list has to be maintained; a script test catches a label nobody
remembered to register. The cost is that fixtures must contain no Latin words —
see Risk.

**Two small extras that were necessary for the rule to be a rule:** the `ยังไม่มีคิว`
paragraph declared no font weight at all (so "Thai is bolder" was false there), and
the LIVE badge was bumped `text-sm md:text-base` → `text-base md:text-lg` because
`สด` at 14px leaves `LIVE` at 9.8px.

## Verification

Verify command, run in full at the end:

```
npm test      → Test Files 47 passed (47) · Tests 252 passed (252)
npm run build → tsc -b + vite build OK · PWA v1.3.0 generateSW · precache 5 entries
```

Before/after on the new file alone: **8 failed / 7 passed → 15 passed.** No existing
test changed or broke (237 → 252 is exactly the 15 added).

The `em` class was verified end-to-end, not just in jsdom — the emitted stylesheet
contains `.text-\[0\.7em\]{font-size:.7em}`.

Mutation check, **prediction written before each run**:

| # | mutation | predicted | actual |
|---|---|---|---|
| M1 | drop `<En>` at the now-serving heading | S1 T1 T2 T3 T4 I3 Z3 | ✅ (8 after the T5 fix) |
| M2 | `text-[0.7em]` → `text-[1.2em]` | T1 T4 T5 I3 Z3 | ✅ |
| M3 | En `font-normal` → `font-semibold` | T1 T4 T5 I3 | ✅ |
| M4 | drop En `opacity-70` | T1 T4 T5 I3 | ✅ |
| M5 | LIVE back to English-only | S1 T1 T2 T3 T4 T5 I3 Z3 | ✅ (8) |
| M6 | English before Thai | T3 | ✅ |
| M7 | shrink the serving clamp below the callout | Z1 Z2 | ✅ |
| M8 | add an English-only heading | T1 T2 T3 T4 **T5** I3 Z3 | ❌ **T5 survived** |
| M9 | remove the 🔔 | I1 I3 | ✅ |
| M10 | pill turns yellow | I2 | ✅ |
| M11 | remove `glow-y` | I2 | ✅ |
| M12 | header `font-bold` → `font-normal` | T2 | ✅ |
| M13 | dim the heading with `/70` | T2 | ✅ |
| M14 | *helper:* `enRegions` swallows the file | S0 | ✅ |
| M15 | *helper:* `subordinate` = "has an em factor" | T0 T4 | ✅ |
| M16 | *helper:* `largestNamedSize` ignores `md:` | Z0 Z2 | ✅ |

**The miss is worth reading.** T5 asked `THAI.test(el.parentElement.textContent)` —
`textContent` is the whole **subtree**, and the screen is full of Thai, so the
question answered itself and an English-only heading dropped on the root passed.
T2 used `ownText` (direct text-node children) and caught it. I predicted T5 red
because its *title* matched the mutation, without re-reading which accessor it
used — the exact failure mode my own notes warn about. Fixed T5 to `ownText`
(stricter than T2: the Thai must be in the same element, immediately beside the
English), re-ran M8 → 7 red as predicted, and re-ran M1 → 8 red.

Every one of the 15 tests has at least one killer. Single-killer tests: `I1` (M9),
`Z1` (M7). `S0`/`T0`/`Z0` have **no production killer by design** — they pin the
checkers against hand-built fixtures, and M14/M15/M16 exist specifically to prove
that a degraded helper makes the sweeps blind but still green (M14: `S1` passes
with the fence entirely gone).

## What I did NOT do

- **Did not touch any other screen.** `OrderStation`, `QueuePanel` and
  `DashboardScreen` still pair Thai and English the old way. Generalising this rule
  app-wide is the separate, still-unticked criterion "ทุกหน้าเป็นสไตล์ Neon Clarity
  สม่ำเสมอ". `src/i18n/BiLabel.tsx` already has a similar pattern using a named
  step rather than `em` — noted in the audit as the starting point for that round.
- **Did not touch `labels.ts`, `QueueNumber.tsx`, or any logic.** No new strings;
  `สด` was already in the table.
- **Did not re-prove size facts that `displayCentering` B1/C5 already cover.** Z1/Z2
  add only what those do not: the serving number beating the callout on *all three*
  clamp parameters at once, and beating the largest fixed heading on the screen.
- Did not start the next criterion.

## Risk

**Read this before trusting the tick.**

- 🚨 **No pixel is measured and no font is loaded.** jsdom resolves no Tailwind
  class, computes no layout, has no viewport. The only checkable facts asserted are
  the **classes declared on elements**. Getting from there to "a person understands
  it at a glance" assumes (a) Tailwind emits the type scale it documents and (b)
  smaller + lighter + dimmer *reads* as secondary to a human. Assumed, not proved.
  What IS proved is the weaker, real property: **every meaning on the screen is
  carried by something other than an English word** — `I3` deletes every subordinate
  wrapper and asserts not one Latin word survives while every zone remains.
- 🚨 **English menu-item names are outside this file's evidence, by construction.**
  The sweep can treat "2+ Latin letters" as an English label only because every
  fixture is deliberately Latin-free (Thai item names; queue numbers like `A1` have
  one letter). A real menu item called "Thai Tea" would not be caught, and I do not
  claim it would.
- **`I2`'s four-distinct-colours check is a proxy.** It compares Tailwind *token
  names*, not rendered colours. Two tokens that resolve to similar hues would pass.
- **The `<En>` wrapper is a visual change to a screen used at a real event.** The
  English half of every label on the customer display is now ~30% smaller than
  before, and the header's English booth name changed from muted grey to the Thai's
  colour at 70% opacity. This is what the criterion asks for, but it is a look
  change a human should eyeball once on a real screen — no test here can.
- **A reviewer should check `S1`'s comment-blanking.** It strips `/* */` and `//`
  before scanning so that prose mentioning `` `.en` `` is not counted an offender.
  That regex does not understand strings, so a string literal containing `//` would
  be mangled. There is none in `DisplayScreen.tsx` today; `S0` pins the blanker's
  offset- and line-preserving behaviour, but not string-awareness.
- **`S1` reads the source from `process.cwd()`**, because `import.meta.url` is not a
  `file:` URL under Vitest. It asserts the file really was read
  (`toContain('export function DisplayScreen')`), so a wrong path fails loudly
  rather than passing on an empty string — but it is coupled to the run directory.
