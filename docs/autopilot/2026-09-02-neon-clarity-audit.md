# Neon Clarity — audit (round `_2026-09-02_0041`)

Criterion (`docs/superpowers/specs/2026-08-03-ui-overhaul-design.md` §8, first of
the `ui-overhaul` group):

> ทุกหน้าเป็นสไตล์ Neon Clarity สม่ำเสมอ (glow เฉพาะ 3 จุด, base +20%)

Proof: `src/neonClarity.audit.test.ts` — 18 tests.
Production changed: **one line**, `src/screens/DisplayScreen.tsx:98`.

---

## 1. What was actually there (measured, not assumed)

The audit file was written and run **before** any production edit. Against the
code as carried onto this branch:

```
Tests  18  ·  14 passed  ·  4 failed
  × G1  every glow in the source lands on one of the three targets
  × G2  the census is spine, not decoration
  × G5  no card, surface or body text glows
  × T1  no page invents a colour
```

All four named the same line, and it is the line the previous round's handoff
had already flagged as "ต้องตัดสิน":

```
src/screens/DisplayScreen.tsx:98
<section className="… rounded-3xl border-2 border-phantom-yellow/50
   bg-phantom-yellow/10 px-10 py-6 md:px-16 md:py-8
   shadow-[0_0_40px_rgba(255,199,44,0.25)]">
```

### The complete glow census, after the fix

| `file:line` | glow | target | verdict |
|---|---|---|---|
| `src/index.css:9` | `.glow-o { filter: drop-shadow(…) }` | definition | – |
| `src/index.css:10` | `.glow-y { text-shadow: … }` | definition | – |
| `src/screens/DisplayScreen.tsx:105` | `glow-y` | เลขคิว "เตรียมตัว" | ✅ จุดที่ 1 |
| `src/screens/OrderStation.tsx:160` | `glow-y` | `cart-total` ยอดรวม | ✅ จุดที่ 2 |
| `src/ui/Button.tsx:6` | `shadow-glow-o` (variant `primary`) | ปุ่มหลัก | ✅ จุดที่ 3 |
| `src/ui/QueueNumber.tsx:3` | `glow-o` (display) | เลขคิว | ✅ จุดที่ 1 |
| `src/ui/QueueNumber.tsx:4` | `glow-o` (card) | เลขคิว | ✅ จุดที่ 1 |
| `src/ui/StatTile.tsx:5` | `glow-y` (when `accent`) | ยอดบริจาค | ✅ จุดที่ 2 |

Neutral elevation, judged **not** a glow and pinned by G7 so the judgement is on
the record: `src/App.tsx:32`, `src/App.tsx:42`, `src/comms/CommsToast.tsx:35`.
These are Tailwind's named black-and-offset `shadow-lg`, not the orange-yellow
blur §2 rations. A named step takes no colour argument, so it cannot *be* a
glow; the arbitrary form that can is caught by `GLOW_SHAPE`.

## 2. The decision: bug, not declared exception

The card glow is a **conflict between two ticked criteria**, which is why the
handoff refused to pre-decide it:

- **Neon Clarity §2** forbids it by name — *"ห้าม glow พื้น/การ์ด/ข้อความทั่วไป"*.
  A 40px zero-offset yellow blur on a `<section>` is a glow on a card on any
  reading.
- **Display (ticked `_0039`)** requires the "เตรียมตัว" callout to be **เด่น**,
  and `displayCentering.audit.test.tsx` C4 had pinned `shadow-*` as one of three
  structural markers of that prominence.

**Judged a bug. Removed.** Three reasons:

1. An exception for the one and only violation makes the census a tautology.
   The criterion *is* "glow เฉพาะ 3 จุด"; excusing the sole breach proves nothing.
2. **เด่น does not depend on it.** The callout keeps `border-2
   border-phantom-yellow/50`, `bg-phantom-yellow/10`, `rounded-3xl`,
   `px-10 py-6 md:px-16 md:py-8`, and a `clamp(56px,10vw,140px)` number — which
   **still carries `glow-y`**, legally, because it is a queue number. The zone
   still glows. The card no longer does.
3. The two criteria never actually conflicted. C4's *purpose* ("เด่น is
   structural") is untouched; only its incidental **encoding** of the third
   marker moved.

### C4 was updated deliberately, and made stricter

Per the handoff's 🚫 — the test was **not** loosened to fit the decision. The
`shadow-*` presence check became an exact **absence** check plus a new presence
check inside the card, and the pill gained a matching negative:

```ts
expect(calloutCard().querySelector('.glow-y')).toBeTruthy()
expect(card.some((c) => c.startsWith('shadow-'))).toBe(false)
…
expect(screen.getAllByTestId('upnext')[0].querySelector('.glow-y')).toBeNull()
```

M1 below re-adds the card glow and confirms C4 now fails on it — the old C4
would have *passed*.

## 3. "base +20%" — the handoff's guess was wrong; measure first

The handoff predicted this half was probably **not** implemented, reasoning
that `tailwind.config.js` extends only `colors`/`fontFamily`/`boxShadow` with no
`fontSize` key. That reasoning is sound and the conclusion is wrong:

```
src/index.css:5   html { font-size: 120%; }   /* +20% base scale */
```

This is **more** complete than the `fontSize`-extend route §3 suggests, because
Tailwind's default `fontSize` *and* `spacing` scales are both in `rem`, so type,
padding, margin and gap all scale from one declaration — matching §2's wording
("ตัวหนังสือ/ปุ่ม/สเปซ/ตัวเลข ใหญ่ขึ้น 20% ทั้งระบบ"), which a `fontSize`
override alone would not.

📌 §3 (implementation suggestion) and §8 (the criterion) diverge here. §8 asks
for the outcome, and the outcome is present. **The spec was not edited.**

Per the `_0006` lesson, this is treated as a **formula to evaluate**, not a
string to find:

- **B0** pins the reader: `body{font-size:120%}` scales nothing (not the root),
  and `html{font-size:19.2px}` is a constant, not a scale — both return `null`.
- **B1** evaluates the ratio at browser defaults 16/14/12/20/24px; each equals
  `default × 1.2` exactly. A `font-size: 96%` contains all the same words.
- **B3** proves the mechanism *reaches* the pages: no text size anywhere is a
  pixel constant. Every one is a named rem step, an `em`, or viewport-scaled.
- **B4** does the arithmetic: root `19.2px` → `text-3xl` = 36px (was 30),
  `text-5xl` = 57.6px (was 48).

## 4. Mutation check — predictions (written and committed BEFORE running)

Roster: G0–G8, B0–B5, T0–T2 = 18 tests.

| # | mutation | predicted red (this file) | predicted red (elsewhere) |
|---|---|---|---|
| M1 | re-add `shadow-[0_0_40px_…]` to `DisplayScreen:98` | G1, G2, G5, T1 | displayCentering C4 |
| M2 | add `glow-y` to the callout `<h2>` (general text) | G1, G2 | — |
| M3 | `GLOW_SHAPE` matches nothing | G0, G2, G3 | — |
| M4 | `sourceFiles()` returns `[]` | G2, G3, G7, T1, T2 | — |
| M5 | delete the `Button.tsx` census entry | G1, G4 | — |
| M6 | retarget both `QueueNumber` entries to `glow-definition` | G4 | — |
| M7 | `html{font-size:120%}` → `100%` | B1, B4 | — |
| M8 | `.glow-y` colour → blue `rgba(44,199,255,0.4)` | G6 | — |
| M9 | `StatTile` `text-3xl` → `text-[30px]` | B3 | — |
| M10 | `textSizes()` returns `[]` | B5 | — |
| M11 | `classifySize` viewport test back to `\bvw\b` | B3, B5 | — |
| M12 | add a 4th `shadow-lg`, in `ui/Panel.tsx` | G7 | — |
| M13 | `THEME.yellow` → `#FFD700` | G6, T0 | theme.test.ts "palette is exact" |
| M14 | a second `accent` StatTile (`total-sales`) | G8 | — |
| M15 | `sourceFiles` skips `src/screens` | G2, G3, T2 | — |
| M16 | add `text-[#ff0000]` to `QueuePanel` | T1 | — |
| M17 | `rootScale()` always returns `1.2` | B0 | — |
| M18 | add `fontSize: {sm:'14px'}` to the Tailwind `extend` | B2 | frozenZones C1 |

### The three predictions that are the point

- **M3 — G1 stays GREEN.** G1 is the test that *looks* like the heart of the
  file ("every glow lands on an allowed target"), and a scanner that sees
  nothing satisfies it perfectly: `[].filter(anything)` is `[]`. Only G0
  (checker vs. fixtures) and G2 (spine) can tell clean from blind. This is the
  same result `_0044` M6/M7 and `_0007` M11 reached, now pinned for a third
  sweep.
- **M15 — T1 stays GREEN while the sweep is half-blind.** Drop the screens and
  `found` collapses to exactly the one declared file, so the colour census
  reports "clean". T2 ("the census reads every page, not a sample") is the only
  guard, which is the entire reason T2 exists.
- **M17 — B1 stays GREEN.** A `rootScale` hard-wired to 1.2 satisfies every
  arithmetic assertion in B1 and B4. B0 is the only killer.

### Predicted single-killer tests (must not be deleted)

G0 (M3) · G5 (M1) · G8 (M14) · B0 (M17) · B1 (M7) · B2 (M18) · B4 (M7) · T0 (M13)

## 5. Results

*(filled in after running — see §6)*

## 6. ขอบเขตของหลักฐาน / Scope of the evidence

**Proved:**

- Every glow-shaped construct in every non-test source file is on a queue
  number, a money figure, or the primary button. Total over the source, reached
  by reading all of it — not by rendering a sample of screens.
- The declared root scale is exactly +20% at any browser default, and no page
  opts out of it with a fixed pixel text size.
- `theme.ts` and the Tailwind palette are the same palette, and exactly one
  literal colour exists outside them (declared, with a reason).

**NOT proved:**

- 🚨 **No pixel is measured and no stylesheet is evaluated.** Nothing renders;
  Tailwind never runs. This computes on values **declared** in the source. The
  step from "the root is 120% and every size is relative" to "the page is 20%
  bigger" assumes Tailwind emits its documented rem-based scale.
- 🚨 **"สวย" is not testable and is not claimed.** This proves the glow *ration*
  and the *scale* — what the criterion's parenthetical names. It says nothing
  about whether the result is beautiful, and a reviewer should look at the
  Display screen with their eyes before trusting that removing the card glow
  left it looking right.
- The `clamp()` bounds on the two Display numbers are pixel constants at their
  extremes; B3 counts them as viewport-scaled because a `vw` term governs the
  middle. Their actual scaling is `displayClampScale.audit.test.tsx`'s claim.
- The census keys on `file` + an **anchor substring**, not on line numbers, so
  it survives edits above a hit — but an anchor is only as specific as its text.
  G3 fails loudly on a stale anchor; it cannot detect an anchor that has become
  *ambiguous* beyond requiring exactly one claimant per hit (G1).

## 7. Noted, not fixed (deliberately out of this criterion)

- **Radius tokens.** §2 specifies `sm 10 · md 14 · lg 16 · xl 20`, and
  `tailwind.config.js` extends no `borderRadius` at all — the screens use
  Tailwind's defaults (`rounded-2xl` = 16px, `rounded-3xl` = 24px). The §8
  criterion's parenthetical names glow and base scale only, so this was left
  alone rather than silently widened into a token-system rewrite. **It is a real
  gap in §2's token list and should be its own task.**
- **`#FFD65a`** in `ui/QueueNumber.tsx:6` is the lighter stop of the queue-number
  gradient and is not in the palette. Declared in T1 with a reason rather than
  changed: `displayGlanceable` I2 pins the gradient pair as that zone's colour
  code, and re-toning it is a design decision, not an audit.
- **`phantom-danger`** exists in the Tailwind palette but not in `THEME`. T0
  pins this asymmetry explicitly so it is a known shape rather than a silence.
