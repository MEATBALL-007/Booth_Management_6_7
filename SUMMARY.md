# Round summary — 2026-08-21 (0051)

**Task:** spec `2026-08-03-ui-overhaul-design.md`, criterion 1 —
*ทุกหน้าเป็นสไตล์ Neon Clarity สม่ำเสมอ (glow เฉพาะ 3 จุด, base +20%)*
**Result:** criterion ticked · **two real production bugs found and fixed** · 19 new tests

## What I did

- **Fixed two glow violations on the customer Display** (`src/screens/DisplayScreen.tsx`, commit
  `b65eb97`). The spec allows a glow on exactly three things — the queue number *being served*,
  money, and the primary button — and bans it on backgrounds, cards and ordinary text. The
  get-ready callout broke that twice: a 40px yellow halo around the **card** (`:75`
  `shadow-[0_0_40px_rgba(255,199,44,0.25)]`) and `glow-y` on the **up-next number** (`:84`).
  Removed both. No text, testid or logic touched.
- **Added `src/neonClarity.audit.test.tsx`** (new file, 19 tests, commit `9d1d017`): a sweep that
  reads every source file under `src/` and fails with the offending `file:line` printed — the glow
  ledger, the "each glow line must carry its own justification" rule, the ban on coloured shadows,
  the +20% root scale, palette/token discipline across all five screens, and render-level checks
  that only the `primary` button and only the `accent` StatTile glow.
- **Answered the open question the plan left** about `tailwind.config.js` not extending a radius /
  fontSize scale: it is **not a gap**. At a 120% root, Tailwind's own `rounded-lg/xl/2xl` land at
  9.6 / 14.4 / 19.2px — within 0.8px of the spec ladder (sm 10 · md 14 · xl 20) — and scaling at
  the root also scales padding and gap, which a `fontSize`-only extension would not.
- **Wrote `docs/autopilot/2026-08-21-neon-clarity-audit.md`** — the full glow ledger, the evidence
  for each verdict, the three knowingly-accepted deviations, and the mutation table.
- **Updated `AUTOPILOT.md`**: adopted the plan from branch `_0036` (the working copy still held the
  stale Undo task), ticked this criterion, recorded six new traps, handed off criterion 2.

## Why

- **Why the up-next glow is a violation and not a judgement call.** Three passages, two specs:
  §2 says "เลขคิว**ที่กำลังทำ**" (the number *being served*, a deliberate qualifier); §5.3's own
  recipe for this screen says "NOW SERVING เลขใหญ่ glow … UP NEXT pills **สะอาด**"; and
  queue-pro §4 attaches the word "เรืองแสง" to กำลังทำ alone, giving ถัดไป a yellow card instead.
  Operationally it also breaks the *other* spec's glanceable rule: with two numbers glowing, a
  customer five metres away cannot tell which one is "now". The callout keeps its 2px border,
  tinted fill, `clamp()` size and 👉, so it is still the second-loudest thing on screen.
- **Why a source sweep instead of rendering each screen.** The criterion says "**ทุกหน้า**",
  which includes pages that don't exist yet. A test listing known files cannot see the sixth
  screen someone adds tomorrow; a sweep audits it on day one.
- **Why each glow line must prove itself.** A file-level allow-list is too loose — moving the glow
  from `primary:` to `ghost:` inside `Button.tsx` keeps the ledger green. Requiring the line to
  also contain `primary:` / `accent ?` / `data-testid="cart-total"` closes that, and break #3
  confirmed it catches exactly that move.

## Verification

- `npm test` → **152 tests / 40 files passed** (baseline on this branch was 133/39; +19 new).
- `npm run build` → exit 0, `built in 1.15s`, PWA `generateSW`, precache 5 entries. The
  "chunk > 500 kB" warning is still there — it is a warning, not an error, and out of scope.
- **Tests were written before the fix and went red on their own:** 7 of the 19 failed and named
  both offenders in `DisplayScreen.tsx` without being pointed at them.
- **Mutation check — 12 breaks, every one of the 19 tests killed at least once** (full table in
  the audit doc): glow back on next-up (kills 5 tests) · coloured card shadow back (2) · glow
  moved primary→ghost (2) · StatTile glowing on both branches (1) · QueueNumber card size losing
  its glow (2) · `font-size: 100%` (1) · `text-[14px]` + `text-gray-400` in Chip (2) ·
  `phantom-yellow` value drift (1) · a gradient in `PresenceBoard` (1) · `accent` on `total-sales`
  (1) · a new `src/screens/*.tsx` file (1) · a non-primitive file added to the screen list (1).
  All reverted; `git status` clean before committing.

## What I did NOT do

- **Did not touch the `from-[#FFD65a]` gradient stop** in `QueueNumber.tsx`, even though it is a
  colour outside the palette. Turning it into a token would move it, not put it inside the spec's
  palette. It is allow-listed **with its reason in the test**, so a *new* raw colour anywhere else
  still fails. Same for the QR code's `bg-white` (a QR must sit on white to scan) and the two
  `bg-black/60` modal scrims.
- **Did not extend `tailwind.config.js`** with a radius/fontSize scale — see Why above; it would
  change nothing visually and would add a second place for the scale to drift.
- **Did not touch the 500 kB chunk warning, PWA icons, or any logic/domain file.** The only
  production file changed this round is `src/screens/DisplayScreen.tsx`, two className edits.

## Risk

- **⚠️ This fix conflicts with an unmerged sibling branch.** Round 0007 (branch
  `auto/Booth_Management_6_7/2026-08-21_0007`) wrote `DisplayScreen.centering.test.tsx`, which
  asserts the yellow callout **has a shadow glow** — the exact thing removed here. That file is not
  on this branch (verified: it does not exist), so the suite is green, but **if both branches are
  ever merged that test goes red.** The right resolution is to fix that test, not restore the
  glow: the criterion it was written for (queue-pro §4 "callout เด่น") never asks for a glow,
  while ui-overhaul §2 bans it in as many words. Flagging it rather than letting a reviewer
  discover it during a merge.
- **The evidence is structural, not visual.** jsdom runs no cascade and lays nothing out; **no
  test here measures a pixel or a rendered colour.** What is proven is which token is declared
  where. That catches regressions ("who put a glow on a card?") but does **not** prove the screen
  looks right on an iPad. Only a real browser closes that.
- **The sweep reads source, not built output.** A class assembled at runtime (`` `glow-${tone}` ``)
  would slip past it. Nothing in the code does that today.
- **A reviewer should sanity-check the two className deletions visually** — removing a card's halo
  is a taste-visible change, and if the school actually prefers the halo, the honest fix is to
  amend the spec, not the code (specs are out of scope for me to edit).
