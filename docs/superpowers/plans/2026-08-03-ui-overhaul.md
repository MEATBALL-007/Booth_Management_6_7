# UI Overhaul — "Neon Clarity" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved "Neon Clarity" design system across every screen — premium, glow-accented, highly readable, fully responsive on iPad / HQ laptops / large displays / phones — **without changing any logic** and keeping all 106 existing tests green.

**Architecture:** Extend the Tailwind config as the single source of design tokens; bump the global scale +20% via a root `font-size`; add a small presentational primitives layer (`src/ui/`); then restyle each screen by composing primitives + utilities. Firestore, metrics, cart/comms logic are untouched — the diff is presentation only.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v3 (existing), Vitest + @testing-library/react.

## Global Constraints

- **Design language "Neon Clarity"** (from `docs/superpowers/specs/2026-08-03-ui-overhaul-design.md`): glow ONLY on the live queue number, money figures, and the primary action button; everything else clean, high-contrast, spacious.
- **Tokens (exact):** brand `#FA4616` / `#FFC72C`; neutrals `bg #0a0a0c`, `surface #151517`, `surface-2 #1c1c20`, `line rgba(255,255,255,.09)`, `text #f4f4f6`, `muted #9a9aa2`, `success #3ad35a`. Fonts unchanged (Kanit / Sarabun / JetBrains Mono).
- **+20% base scale:** implemented once via `html { font-size: 120%; }` — every rem-based Tailwind utility (text-*, p-*, gap-*, rounded-*) scales proportionally. Borders stay in px (correct).
- **🔒 Keep the 106 tests green — HARD CONSTRAINT.** Tests query visible **text** (Thai/English labels), button **accessible names**, and **`data-testid`** — never className/layout. So:
  - ✅ Free to change: className, layout, wrappers, colors, spacing, radius, motion.
  - 🚫 Do NOT change: displayed label text (th/en), button accessible names (`รับเงินแล้ว`, `เพิ่มลงตะกร้า`, `เรียกคิวถัดไป`, `เสร็จ`, `ยกเลิก`, `ยืนยัน`, `ปลดล็อก`, `ขอคนช่วย`, `รับทราบ`, `← ตั้งค่า`, …), or existing `data-testid`s (`cart-total`, `issued-queue`, `net-donation`, `total-sales`, `expected-cash`, `cash-total`, `qr-total`, `total-cost`, `paid-orders`, `done-count`, `serving`, `upnext`, `presence-row`).
  - Don't split label text across nested elements in a way that breaks `getByText` substring matching.
- **Firestore/logic untouched:** diffs live only in `tailwind.config.js`, `src/index.css`, `src/theme.ts`, `src/ui/**`, and per-screen JSX styling. No repo/metrics/cart/comms logic changes.
- **Responsive:** no horizontal scroll on any width; touch targets ≥ 44px; iPad-portrait stacks to one column; Display queue number scales with `clamp()` for large screens.
- **Testing:** Vitest. Primitives get focused unit tests (render + prop pass-through). Restyle tasks add NO new tests — the existing screen tests are the regression guard; each restyle task must keep `npm test` fully green. Run `npm run build` (`tsc -b`) each task. Commit after each task.

---

### Task 1: Design tokens (Tailwind config + global scale + glow)

**Files:**
- Modify: `tailwind.config.js`, `src/index.css`, `src/theme.ts`
- Test: `src/theme.test.ts` (extend)

**Interfaces:**
- Produces: Tailwind colors `phantom-bg/surface/surface2/line/text/muted/success`, boxShadow `glow-o`/`glow-y`; global +20% scale; `THEME` extended with the neutral palette.

- [ ] **Step 1: Extend the failing test in `src/theme.test.ts`**

Append (keep the existing PHANTOM CREW palette test):

```ts
test('THEME includes the Neon Clarity neutral palette', () => {
  expect(THEME.bg).toBe('#0a0a0c')
  expect(THEME.surface).toBe('#151517')
  expect(THEME.surface2).toBe('#1c1c20')
  expect(THEME.muted).toBe('#9a9aa2')
  expect(THEME.success).toBe('#3ad35a')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/theme.test.ts`
Expected: FAIL — `THEME` lacks the new keys.

- [ ] **Step 3: Extend `src/theme.ts`**

Add to the `THEME` object (keep `orange`/`yellow`/`bg`/`text`; note `bg` changes to the deeper neutral):

```ts
export const THEME = {
  orange: '#FA4616',
  yellow: '#FFC72C',
  bg: '#0a0a0c',
  surface: '#151517',
  surface2: '#1c1c20',
  line: 'rgba(255,255,255,0.09)',
  text: '#f4f4f6',
  muted: '#9a9aa2',
  success: '#3ad35a',
} as const
```

(The original test asserted `THEME.bg === '#1A1A1A'` — update that assertion to `#0a0a0c` in the same file, since the background token is intentionally deepened for Neon Clarity.)

- [ ] **Step 4: Extend `tailwind.config.js`**

In `theme.extend`, add colors + shadows (keep the existing `phantom-orange/yellow/bg` and font families):

```js
colors: {
  'phantom-orange': '#FA4616',
  'phantom-yellow': '#FFC72C',
  'phantom-bg': '#0a0a0c',
  'phantom-surface': '#151517',
  'phantom-surface2': '#1c1c20',
  'phantom-line': 'rgba(255,255,255,0.09)',
  'phantom-text': '#f4f4f6',
  'phantom-muted': '#9a9aa2',
  'phantom-success': '#3ad35a',
},
boxShadow: {
  'glow-o': '0 6px 20px rgba(250,70,22,0.35)',
  'glow-y': '0 0 18px rgba(255,199,44,0.35)',
},
```

- [ ] **Step 5: Update `src/index.css`**

Set the +20% scale and base surface (keep the `@tailwind` directives and font imports):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html { font-size: 120%; }   /* +20% base scale — rem utilities scale automatically */
body { @apply bg-phantom-bg text-phantom-text font-sarabun antialiased; }

/* glow helper for numbers (queue / money) */
.glow-o { filter: drop-shadow(0 0 18px rgba(250,70,22,0.5)); }
.glow-y { text-shadow: 0 0 18px rgba(255,199,44,0.4); }
```

- [ ] **Step 6: Run tests + build**

Run: `npm test` then `npm run build`
Expected: all 106 tests PASS (they query text/role/testid, unaffected by the scale/token change); build completes.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(ui): Neon Clarity design tokens + global +20% scale"
```

---

### Task 2: Button primitive

**Files:**
- Create: `src/ui/Button.tsx`
- Test: `src/ui/Button.test.tsx`

**Interfaces:**
- Produces: `<Button variant?='primary'|'ghost'|'danger' ...buttonProps>` — forwards all native button props (`onClick`, `disabled`, `type`, `aria-label`, `data-testid`, `children`); `primary` = orange→yellow gradient with `shadow-glow-o`, `ghost` = outline, `danger` = orange solid.

- [ ] **Step 1: Write the failing test `src/ui/Button.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, test, expect } from 'vitest'
import { Button } from './Button'

test('renders children and forwards click + testid + aria-label', async () => {
  const user = userEvent.setup()
  const onClick = vi.fn()
  render(<Button data-testid="pay" aria-label="รับเงินแล้ว" onClick={onClick}>รับเงินแล้ว</Button>)
  const btn = screen.getByTestId('pay')
  expect(btn).toHaveTextContent('รับเงินแล้ว')
  expect(btn).toHaveAttribute('aria-label', 'รับเงินแล้ว')
  await user.click(btn)
  expect(onClick).toHaveBeenCalled()
})

test('disabled is forwarded', () => {
  render(<Button disabled>x</Button>)
  expect(screen.getByRole('button')).toBeDisabled()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/Button.test.tsx`
Expected: FAIL — `src/ui/Button.tsx` does not exist.

- [ ] **Step 3: Create `src/ui/Button.tsx`**

```tsx
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'ghost' | 'danger'

const VARIANT: Record<Variant, string> = {
  primary: 'bg-gradient-to-b from-phantom-yellow to-phantom-orange text-phantom-bg shadow-glow-o',
  ghost: 'bg-phantom-surface2 text-phantom-text border border-phantom-line',
  danger: 'bg-phantom-orange text-phantom-bg',
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`rounded-xl px-5 py-3 font-kanit font-bold disabled:opacity-40 ${VARIANT[variant]} ${className}`}
      {...props}
    />
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ui/Button.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ui): add Button primitive"
```

---

### Task 3: Surface primitives — Panel, Chip, StatTile, QueueNumber

**Files:**
- Create: `src/ui/Panel.tsx`, `src/ui/Chip.tsx`, `src/ui/StatTile.tsx`, `src/ui/QueueNumber.tsx`
- Test: `src/ui/primitives.test.tsx`

**Interfaces:**
- `<Panel className? ...div>` — card surface (`bg-phantom-surface border border-phantom-line rounded-2xl p-5`), forwards props/children.
- `<Chip tone?='paid'|'cash'|'qr'|'neutral'>` — status pill.
- `<StatTile testid label value accent?>` — renders `data-testid={testid}` on the value; `accent` glows it yellow.
- `<QueueNumber value size?='display'|'card'>` — gradient glow number, `display` uses `clamp()` for large screens.

- [ ] **Step 1: Write the failing test `src/ui/primitives.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react'
import { test, expect } from 'vitest'
import { Panel } from './Panel'
import { Chip } from './Chip'
import { StatTile } from './StatTile'
import { QueueNumber } from './QueueNumber'

test('Panel renders children and forwards data-testid', () => {
  render(<Panel data-testid="p">hi</Panel>)
  expect(screen.getByTestId('p')).toHaveTextContent('hi')
})

test('StatTile puts the testid on the value and shows label + value', () => {
  render(<StatTile testid="net-donation" label="ยอดบริจาคสุทธิ" value="1,240฿" accent />)
  expect(screen.getByTestId('net-donation')).toHaveTextContent('1,240฿')
  expect(screen.getByText('ยอดบริจาคสุทธิ')).toBeInTheDocument()
})

test('Chip renders its content', () => {
  render(<Chip tone="paid">✓ จ่ายแล้ว</Chip>)
  expect(screen.getByText('✓ จ่ายแล้ว')).toBeInTheDocument()
})

test('QueueNumber renders the value', () => {
  render(<QueueNumber value="A7" />)
  expect(screen.getByText('A7')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/primitives.test.tsx`
Expected: FAIL — the primitive files do not exist.

- [ ] **Step 3: Create the four primitives**

`src/ui/Panel.tsx`:
```tsx
import type { HTMLAttributes } from 'react'
export function Panel({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`bg-phantom-surface border border-phantom-line rounded-2xl p-5 ${className}`} {...props} />
}
```

`src/ui/Chip.tsx`:
```tsx
import type { HTMLAttributes } from 'react'
type Tone = 'paid' | 'cash' | 'qr' | 'neutral'
const TONE: Record<Tone, string> = {
  paid: 'text-phantom-success border-phantom-success/40 bg-phantom-success/10',
  cash: 'text-phantom-yellow border-phantom-yellow/35',
  qr: 'text-phantom-text border-phantom-line',
  neutral: 'text-phantom-muted border-phantom-line',
}
export function Chip({ tone = 'neutral', className = '', ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={`inline-block rounded-full border px-3 py-1 font-kanit text-sm font-semibold ${TONE[tone]} ${className}`} {...props} />
}
```

`src/ui/StatTile.tsx`:
```tsx
export function StatTile({ testid, label, value, accent = false }: { testid: string; label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-phantom-surface2 border border-phantom-line rounded-2xl p-4">
      <div className="font-kanit text-sm text-phantom-muted">{label}</div>
      <div data-testid={testid} className={`font-mono font-extrabold text-3xl mt-1 ${accent ? 'text-phantom-yellow glow-y' : 'text-phantom-text'}`}>{value}</div>
    </div>
  )
}
```

`src/ui/QueueNumber.tsx`:
```tsx
export function QueueNumber({ value, size = 'card' }: { value: string; size?: 'display' | 'card' }) {
  const cls = size === 'display'
    ? 'text-[clamp(96px,22vw,320px)] leading-none glow-o'
    : 'text-5xl glow-o'
  return (
    <span className={`font-mono font-extrabold bg-gradient-to-b from-[#FFD65a] to-phantom-orange bg-clip-text text-transparent ${cls}`}>
      {value}
    </span>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ui/primitives.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ui): add Panel, Chip, StatTile, QueueNumber primitives"
```

---

### Task 4: Restyle Setup screen

**Files:**
- Modify: `src/screens/SetupScreen.tsx`

**Interfaces:**
- Consumes: `Button`, `Panel` (ui). Guard: `src/screens/SetupScreen.test.tsx` (unchanged) must stay green.

**Restyle spec (keep ALL text/roles):** apply Neon Clarity — page centered on `phantom-bg`; the booth/mode/station choices become larger tappable chips (min-h 44px, `rounded-xl`, active = `border-phantom-orange bg-phantom-orange/15`, inactive = `border-phantom-line`); section labels use the muted uppercase style; the confirm button uses `<Button variant="primary">` (keeps the exact text `ยืนยัน · Confirm` and stays `disabled` until valid). Do not change the chip button accessible names (booth/mode Thai labels, station letters) or the confirm label — `SetupScreen.test` and `App.test` query them.

- [ ] **Step 1: Confirm the current guard tests pass before changes**

Run: `npx vitest run src/screens/SetupScreen.test.tsx src/App.test.tsx`
Expected: PASS (baseline).

- [ ] **Step 2: Restyle `src/screens/SetupScreen.tsx`**

Rework classes/layout per the restyle spec, composing `Panel`/`Button`. Keep every `L(...)` label call and the chip/confirm structure so accessible names and the `isConfigValid`-gated `disabled` are unchanged.

- [ ] **Step 3: Run guard tests + full suite + build**

Run: `npx vitest run src/screens/SetupScreen.test.tsx src/App.test.tsx` then `npm test` then `npm run build`
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): restyle Setup screen (Neon Clarity)"
```

---

### Task 5: Restyle Order Station (+ option picker)

**Files:**
- Modify: `src/screens/OrderStation.tsx`

**Interfaces:**
- Consumes: `Button`, `Panel`, `Chip`, `QueueNumber` (ui). Guard: `src/screens/OrderStation.test.tsx` (unchanged) must stay green — it queries product names, `เพิ่มลงตะกร้า`, `ไข่มุกป็อป`, `รับเงินแล้ว`, `เงินสด`, QR, `data-testid="cart-total"`, `data-testid="issued-queue"`, and the inter-booth alert buttons.

**Restyle spec:** match the approved mockup — header with booth name + `STATION A` badge (yellow chip) + the existing `← ตั้งค่า` chrome; a 2-column layout (menu grid | cart) that stacks on iPad-portrait; product tiles as `Panel`-like cards with an "มีตัวเลือก" badge when `optionGroups`; cart rows show name + selected option labels (yellow) + qty steppers (≥44px targets) + line price; the total uses the yellow glow money style with `data-testid="cart-total"` preserved; pay buttons `<Button variant="primary">💵 รับเงินแล้ว</Button>` + `<Button variant="ghost">📷 QR</Button>` (keep accessible names `รับเงินแล้ว` / that the QR button matches its current name test — verify the current test's QR selector still matches); the issued queue uses `<QueueNumber value size="card"/>` inside a glowing panel with `data-testid="issued-queue"` preserved; the option picker becomes a clean inline/modal card with the same choice buttons + `เพิ่มลงตะกร้า`/`ยกเลิก`. Keep the `AlertButtons`/`CommsToast` mounts.

- [ ] **Step 1: Baseline guard**

Run: `npx vitest run src/screens/OrderStation.test.tsx`
Expected: PASS.

- [ ] **Step 2: Restyle `src/screens/OrderStation.tsx`** per the spec, preserving every queried text/name/testid.

- [ ] **Step 3: Guard + full suite + build**

Run: `npx vitest run src/screens/OrderStation.test.tsx` then `npm test` then `npm run build`
Expected: all PASS. (If the QR button's accessible name changed and its test selector no longer matches, that is a constraint violation — restore the name, do not edit the test.)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): restyle Order Station + option picker (Neon Clarity)"
```

---

### Task 6: Restyle Display screen (+ large-screen clamp)

**Files:**
- Modify: `src/screens/DisplayScreen.tsx`

**Interfaces:**
- Consumes: `QueueNumber` (ui, `size="display"`). Guard: `src/screens/DisplayScreen.test.tsx` (unchanged) — queries `กำลังทำ`, `ยังไม่มีคิว`, `data-testid="serving"`, `data-testid="upnext"`, and relies on the chime mock.

**Restyle spec:** customer-facing hero — header with booth + a pulsing LIVE dot; "กำลังทำ · NOW SERVING" section renders each serving order as `<QueueNumber size="display"/>` (the `clamp()` makes it huge on TVs / iPad landscape, readable across the room) with the item/option detail line under it; "คิวถัดไป · UP NEXT" as clean pills; keep the `flashing` background pulse. Preserve `data-testid="serving"` on each serving number and `data-testid="upnext"` on each up-next pill, and the `ยังไม่มีคิว` placeholder text. Do not touch `useServingAlert`.

- [ ] **Step 1: Baseline guard**

Run: `npx vitest run src/screens/DisplayScreen.test.tsx`
Expected: PASS.

- [ ] **Step 2: Restyle `src/screens/DisplayScreen.tsx`** per the spec, keeping testids/text and the flash class.

- [ ] **Step 3: Guard + full suite + build**

Run: `npx vitest run src/screens/DisplayScreen.test.tsx` then `npm test` then `npm run build`
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): restyle Display screen + large-screen queue clamp"
```

---

### Task 7: Restyle QueuePanel

**Files:**
- Modify: `src/screens/QueuePanel.tsx`

**Interfaces:**
- Consumes: `Button`, `Chip` (ui). Guard: `src/screens/QueuePanel.test.tsx` (unchanged) — queries `เรียกคิวถัดไป`, `เสร็จ`, `ยกเลิก`, `ยืนยันยกเลิก`, the reason input label `เหตุผล…`, and the item summary text incl. option labels.

**Restyle spec:** serving cards and waiting cards as clean surfaces with the mono queue number; the item/option summary line stays (`name ×qty · option`); the call-next button `<Button variant="primary">` and done/cancel as `ghost`/`danger`; the cancel-reason box restyled but keeping the input's accessible name and the `ยืนยันยกเลิก` button text. Preserve all queried names/text.

- [ ] **Step 1: Baseline guard**

Run: `npx vitest run src/screens/QueuePanel.test.tsx`
Expected: PASS.

- [ ] **Step 2: Restyle `src/screens/QueuePanel.tsx`** per the spec.

- [ ] **Step 3: Guard + full suite + build**

Run: `npx vitest run src/screens/QueuePanel.test.tsx` then `npm test` then `npm run build`
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): restyle QueuePanel (Neon Clarity)"
```

---

### Task 8: Restyle Dashboard + PIN gate

**Files:**
- Modify: `src/screens/DashboardScreen.tsx`, `src/dashboard/PinGate.tsx`

**Interfaces:**
- Consumes: `StatTile`, `Panel`, `Button`, `Chip` (ui). Guard: `src/screens/DashboardScreen.test.tsx` + `src/dashboard/PinGate.test.tsx` (unchanged) — query `data-testid`s (`net-donation`, `total-sales`, `expected-cash`, `cash-total`, `qr-total`, `total-cost`, `paid-orders`, `done-count`), the expense form labels (`รายการ`, `จำนวนเงิน`, `บันทึก`), `role="alert"`, presence text `อุปกรณ์ออนไลน์`, and PIN texts (`ใส่ PIN`, `ปลดล็อก`, wrong-PIN alert).

**Restyle spec:** metric cards become a responsive `StatTile` grid (2-col on iPad, 4-col on HQ), with `net-donation` using `accent` (yellow glow) — pass the SAME `data-testid`s into `StatTile testid=...`; by-booth + best-sellers in clean `Panel`s; expense form restyled with `Button` (keep labels + `role="alert"` error); presence board + broadcast bar (HQ) restyled; `PinGate` becomes a centered lock card with a large mono PIN input (keep `aria-label`/texts) and `<Button>ปลดล็อก</Button>`. Keep every testid/label.

- [ ] **Step 1: Baseline guard**

Run: `npx vitest run src/screens/DashboardScreen.test.tsx src/dashboard/PinGate.test.tsx`
Expected: PASS.

- [ ] **Step 2: Restyle `DashboardScreen.tsx` + `PinGate.tsx`** — swap metric cards to `StatTile` with preserved testids; restyle form/presence/broadcast/PIN.

- [ ] **Step 3: Guard + full suite + build**

Run: `npx vitest run src/screens/DashboardScreen.test.tsx src/dashboard/PinGate.test.tsx` then `npm test` then `npm run build`
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): restyle Dashboard + PIN gate (Neon Clarity)"
```

---

### Task 9: Restyle comms + App chrome

**Files:**
- Modify: `src/comms/CommsToast.tsx`, `src/comms/AlertButtons.tsx`, `src/comms/PresenceBoard.tsx`, `src/comms/BroadcastBar.tsx`, `src/App.tsx`

**Interfaces:**
- Consumes: `Button`, `Chip`, `Panel` (ui). Guard: `src/comms/*.test.tsx` + `src/App.test.tsx` (unchanged) — query `ขอคนช่วย`/`ของใกล้หมด`/`เคลียร์`, `รับทราบ`, `ประกาศถึงทุกซุ้ม`, `ส่ง`, `data-testid="presence-row"`, `อุปกรณ์ออนไลน์`, and the App chrome `← ตั้งค่า` / `ยืนยัน` / `ยกเลิก`.

**Restyle spec:** CommsToast becomes a polished top-center toast (surface + accent border) with `<Button variant="ghost">รับทราบ</Button>`; AlertButtons as consistent pill buttons; PresenceBoard rows keep `data-testid="presence-row"` with online/offline dots; BroadcastBar + send use `Button`; App's `← ตั้งค่า` button and confirm dialog restyled to match (keep the confirm/cancel labels and the button name). Keep all queried names/text/testids.

- [ ] **Step 1: Baseline guard**

Run: `npx vitest run src/comms/ src/App.test.tsx`
Expected: PASS.

- [ ] **Step 2: Restyle the comms components + `App.tsx` chrome** per the spec.

- [ ] **Step 3: Guard + full suite + build**

Run: `npx vitest run src/comms/ src/App.test.tsx` then `npm test` then `npm run build`
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): restyle comms components + app chrome (Neon Clarity)"
```

---

### Task 10: Responsive audit + final verification

**Files:**
- Modify: any screen needing breakpoint fixes discovered during the audit (targeted only).

**Interfaces:**
- No new behavior. Verification is visual across breakpoints + full suite + build.

**Audit checklist (fix only what fails):**
- No horizontal scroll at widths **375px (phone), 768px (iPad portrait), 1024px (iPad landscape), 1440px (HQ laptop)**.
- Every interactive control ≥ 44px touch target on tablet widths.
- iPad-portrait: Order Station + Dashboard columns stack to one column; nothing clipped.
- Display: the `clamp()` queue number scales up on a large/TV width and down on phone without overflow.
- Glow appears ONLY on queue numbers, money figures, and primary buttons (no stray glow).

- [ ] **Step 1: Build and serve the production app**

Run: `npm run build` (must pass). Optionally use the project's `/preview` or `npm run dev` to inspect at each width (browser devtools responsive mode).

- [ ] **Step 2: Fix any overflow / stacking / touch-size issues found** — targeted class/breakpoint edits only; keep all text/roles/testids.

- [ ] **Step 3: Final full suite + build**

Run: `npm test` then `npm run build`
Expected: 106 tests PASS; build completes; PWA generates.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): responsive audit + polish across all breakpoints"
```

---

## Self-Review

**Spec coverage (against `2026-08-03-ui-overhaul-design.md`):**
- Design tokens + +20% scale + glow rules → Task 1 ✓
- Primitives layer (`src/ui/`) → Tasks 2, 3 ✓
- Per-screen restyle (Setup/Order/Display/Queue/Dashboard/PIN/Comms/chrome) → Tasks 4–9 ✓
- Responsive across all devices + Display clamp → Tasks 3 (clamp), 6, 10 ✓
- Keep 106 tests green + logic untouched → HARD CONSTRAINT in every task; restyle tasks add no tests and run the full suite ✓

**Placeholder scan:** No TBD/TODO. Restyle tasks intentionally give a "restyle spec" + guard rather than full file dumps — the exact classes are visual judgment bounded by the design tokens (Task 1), the primitives (Tasks 2–3), the approved mockups, and the preserve-text/role/testid constraint; the existing screen tests are the objective regression guard.

**Type consistency:** `THEME` neutrals (Task 1) + Tailwind tokens feed all restyles. `Button`/`Panel`/`Chip`/`StatTile`/`QueueNumber` (Tasks 2–3) consumed by Tasks 4–9 with the prop shapes defined. `StatTile testid` forwards the exact `data-testid`s the Dashboard tests query. No drift.

---

*UI Overhaul · Neon Clarity · ต่อยอดจากระบบ 6 โมดูล (106 tests) · ม.6/7 · PHANTOM CREW*
