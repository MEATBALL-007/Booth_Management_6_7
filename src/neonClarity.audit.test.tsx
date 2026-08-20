/**
 * "Neon Clarity" consistency audit — spec `2026-08-03-ui-overhaul-design.md` §2–§3:
 *
 *   "glow เฉพาะ 3 จุดสำคัญ (เลขคิว · ยอดเงิน · ปุ่มหลัก) — ที่เหลือสะอาด
 *    ห้าม glow พื้น/การ์ด/ข้อความทั่วไป"  +  "Base scale +20%"
 *
 * SCOPE OF THE EVIDENCE — read before trusting a green run:
 *   These tests read the *source* and (for the primitives) the *rendered className*.
 *   jsdom runs no cascade and lays nothing out, so NOTHING here measures a pixel or a
 *   colour on a real screen. What is proven is: which token is declared where, and that
 *   no file outside the sanctioned list declares a glow. That is enough to catch a
 *   regression ("who put a glow on a card?") and NOT enough to prove the screen looks
 *   right on an iPad. Only a real browser can close that gap.
 *
 * Why a source sweep instead of rendering each screen: the criterion is about *every*
 * page at once, including pages that do not exist yet. A sweep fails with the offending
 * `file:line` printed, so a glow added in the future is caught on its first day.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { render, screen } from '@testing-library/react'
import { test, expect } from 'vitest'
import { THEME } from './theme'
import { Button } from './ui/Button'
import { StatTile } from './ui/StatTile'
import { QueueNumber } from './ui/QueueNumber'

const ROOT = process.cwd()

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  )
}

/** repo-relative, forward-slashed — so failure messages are clickable on any OS */
const rel = (abs: string) => relative(ROOT, abs).split('\\').join('/')

/** Every hand-written source file the UI is built from (tests excluded — a test cannot style a screen). */
const SOURCE_FILES = walk(join(ROOT, 'src'))
  .map(rel)
  .filter((f) => /\.(ts|tsx|css)$/.test(f))
  .filter((f) => !/\.test\.tsx?$/.test(f))

type Site = { file: string; line: number; text: string }

function scan(files: string[], re: RegExp): Site[] {
  return files.flatMap((file) =>
    readFileSync(join(ROOT, file), 'utf8')
      .split(/\r?\n/)
      .flatMap((text, i) => (re.test(text) ? [{ file, line: i + 1, text: text.trim() }] : [])),
  )
}

const show = (sites: Site[]) => sites.map((s) => `${s.file}:${s.line}  ${s.text}`).join('\n')

/**
 * Two mechanisms share the word "glow" and are easy to confuse:
 *   `.glow-o` / `.glow-y`      → src/index.css helpers (drop-shadow / text-shadow)
 *   `shadow-glow-o` / `-glow-y`→ tailwind.config.js boxShadow, used via the shadow- prefix
 * `\bglow-o\b` alone matches BOTH (the "-" before it is a word boundary), so the
 * helper pattern needs the lookbehind or the ledger silently double-counts.
 */
const HELPER_GLOW = /(?<!shadow-)\bglow-[oy]\b/
const SHADOW_GLOW = /\bshadow-glow-[oy]\b/
const ANY_GLOW = /\bglow-[oy]\b/

/** Where the glow tokens are *defined*. Everything else that mentions them is a *use*. */
const DEFINITION_FILES = ['src/index.css']

/**
 * The three sanctioned points, and the proof each glow line must carry on itself.
 * The proof matters: without it a glow could be moved onto the ghost button or a
 * non-money tile inside an already-allowed file and the ledger would stay green.
 */
const SANCTIONED: Record<string, { point: string; proof: RegExp }> = {
  'src/ui/QueueNumber.tsx': {
    point: 'queue number',
    proof: /text-\[clamp\(96px,22vw,320px\)\]|text-5xl/,
  },
  'src/ui/Button.tsx': { point: 'primary action button', proof: /primary:/ },
  'src/ui/StatTile.tsx': { point: 'money', proof: /accent \?/ },
  'src/screens/OrderStation.tsx': { point: 'money', proof: /data-testid="cart-total"/ },
}

const glowUses = scan(SOURCE_FILES, ANY_GLOW).filter((s) => !DEFINITION_FILES.includes(s.file))

// ── 1. the glow ledger ────────────────────────────────────────────────────────

test('every glow in src/ sits on one of the three sanctioned points', () => {
  const offenders = glowUses.filter((s) => !SANCTIONED[s.file])
  expect(
    offenders.map((s) => `${s.file}:${s.line}`),
    `glow used outside the three sanctioned points:\n${show(offenders)}`,
  ).toStrictEqual([])
})

test('each glow line carries the proof of which point it is', () => {
  const unproven = glowUses.filter((s) => SANCTIONED[s.file] && !SANCTIONED[s.file].proof.test(s.text))
  expect(
    unproven.map((s) => `${s.file}:${s.line}`),
    `glow moved off the element that justifies it:\n${show(unproven)}`,
  ).toStrictEqual([])
})

test('the glow ledger is exactly these sites — nothing added, nothing moved', () => {
  const ledger: Record<string, number> = {}
  for (const s of glowUses) ledger[s.file] = (ledger[s.file] ?? 0) + 1
  expect(ledger, `current glow sites:\n${show(glowUses)}`).toStrictEqual({
    'src/ui/QueueNumber.tsx': 2, // the display size and the card size
    'src/ui/Button.tsx': 1, // primary variant only
    'src/ui/StatTile.tsx': 1, // accent tile only
    'src/screens/OrderStation.tsx': 1, // cart total
  })
})

test('the glow points number exactly three, and are the three the spec names', () => {
  const points = new Set(glowUses.map((s) => SANCTIONED[s.file]?.point))
  expect([...points].sort()).toStrictEqual(['money', 'primary action button', 'queue number'])
})

// ── 2. "ที่เหลือสะอาด" — no glow on backgrounds, cards or ordinary text ────────

test('no screen or component outside the sanctioned files declares a glow', () => {
  const screensAndParts = SOURCE_FILES.filter(
    (f) => /\.tsx$/.test(f) && !Object.keys(SANCTIONED).includes(f),
  )
  const offenders = scan(screensAndParts, ANY_GLOW)
  expect(
    offenders.map((s) => `${s.file}:${s.line}`),
    `glow on a screen that is meant to stay clean:\n${show(offenders)}`,
  ).toStrictEqual([])
})

test('no card or surface wears a hand-rolled coloured shadow', () => {
  // `shadow-lg` and friends are neutral elevation and stay allowed; what the spec bans
  // is a *coloured* halo — an arbitrary shadow carrying an rgb/hex value.
  const COLOURED_SHADOW = /(?:drop-)?shadow-\[[^\]]*(?:rgba?\(|#[0-9a-fA-F]{3})/
  const tsx = SOURCE_FILES.filter((f) => /\.tsx?$/.test(f))
  const offenders = scan(tsx, COLOURED_SHADOW)
  expect(
    offenders.map((s) => `${s.file}:${s.line}`),
    `coloured glow shadow outside the three sanctioned points:\n${show(offenders)}`,
  ).toStrictEqual([])
})

test('the customer Display glows on the number being served and nowhere else', () => {
  // The Display is the screen the rule exists for: glow means "this one, now".
  // Its serving number glows through the QueueNumber primitive; the get-ready callout
  // is made prominent by the yellow card + size instead, so the signal stays unique.
  const display = readFileSync(join(ROOT, 'src/screens/DisplayScreen.tsx'), 'utf8')
  expect(display).not.toMatch(ANY_GLOW)
  expect(display).toContain('<QueueNumber value={s.queueNumber} size="display" />')
  expect(display).toMatch(/data-testid="next-up"/)
  expect(display).toMatch(/border-2 border-phantom-yellow/) // callout still stands out
})

// ── 3. the glow points, proven at render time ────────────────────────────────

test('only the primary button variant carries the glow shadow', () => {
  render(
    <>
      <Button data-testid="p" variant="primary">ยืนยัน</Button>
      <Button data-testid="g" variant="ghost">ปิด</Button>
      <Button data-testid="d" variant="danger">ยกเลิก</Button>
    </>,
  )
  expect(screen.getByTestId('p').className).toMatch(SHADOW_GLOW)
  expect(screen.getByTestId('g').className).not.toMatch(ANY_GLOW)
  expect(screen.getByTestId('d').className).not.toMatch(ANY_GLOW)
})

test('only the accent (money) StatTile carries the glow', () => {
  render(
    <>
      <StatTile testid="net-donation" label="ยอดบริจาคสุทธิ" value="1,240฿" accent />
      <StatTile testid="paid-orders" label="ออเดอร์" value="12" />
    </>,
  )
  expect(screen.getByTestId('net-donation').className).toMatch(HELPER_GLOW)
  expect(screen.getByTestId('paid-orders').className).not.toMatch(ANY_GLOW)
})

test('the queue number glows at both sizes, through the primitive', () => {
  render(
    <>
      <QueueNumber value="A7" size="display" />
      <QueueNumber value="B3" size="card" />
    </>,
  )
  expect(screen.getByText('A7').className).toMatch(HELPER_GLOW)
  expect(screen.getByText('B3').className).toMatch(HELPER_GLOW)
})

test('the Dashboard accents exactly one tile — the donation total (money, not counts)', () => {
  const dash = readFileSync(join(ROOT, 'src/screens/DashboardScreen.tsx'), 'utf8')
  const accented = [...dash.matchAll(/<StatTile[^>]*?testid="([^"]+)"[^>]*?\baccent\b/g)].map((m) => m[1])
  expect(accented, `accented tiles found in DashboardScreen:\n${accented.join(', ')}`).toStrictEqual([
    'net-donation',
  ])
})

// ── 4. base +20% ─────────────────────────────────────────────────────────────

test('the +20% base scale is declared once, at the root', () => {
  const css = readFileSync(join(ROOT, 'src/index.css'), 'utf8')
  expect(css).toMatch(/html\s*\{[^}]*font-size:\s*120%/)

  // A second root font-size anywhere would silently cancel the scale.
  const roots = scan(
    SOURCE_FILES.filter((f) => f.endsWith('.css')),
    /(?:^|[^-\w])(?:html|:root)\s*\{[^}]*font-size/,
  )
  expect(roots.map((s) => `${s.file}:${s.line}`), `root font-size rules:\n${show(roots)}`).toStrictEqual([
    'src/index.css:5',
  ])
})

test('no fixed px text size opts a screen out of the +20% scale', () => {
  // rem utilities scale with the 120% root; a literal `text-[14px]` would not.
  // `clamp()` sizes are deliberate (the Display scales with the viewport, not the root).
  const offenders = scan(SOURCE_FILES, /text-\[\d+(?:\.\d+)?px\]/)
  expect(offenders.map((s) => `${s.file}:${s.line}`), `pinned px text:\n${show(offenders)}`).toStrictEqual(
    [],
  )
})

// ── 5. one palette, used by every screen ─────────────────────────────────────

test('the Tailwind palette and THEME agree on every colour', () => {
  const cfg = readFileSync(join(ROOT, 'tailwind.config.js'), 'utf8')
  for (const [name, value] of Object.entries(THEME)) {
    expect(cfg, `phantom-${name} missing or drifted in tailwind.config.js`).toContain(
      `'phantom-${name.replace(/([A-Z0-9])/g, (c) => c.toLowerCase())}': '${value}'`,
    )
  }
})

test('screens colour themselves from phantom-* tokens only', () => {
  const DEFAULT_PALETTE =
    /\b(?:bg|text|border|from|to|via|ring|shadow|fill|stroke|divide|outline)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)\b/
  const ALLOWED = new Set([
    'src/order/QrCode.tsx', // a QR must sit on white to stay scannable
    'src/screens/OrderStation.tsx', // bg-black/60 modal scrim
    'src/App.tsx', // bg-black/60 modal scrim
  ])
  const offenders = scan(SOURCE_FILES, DEFAULT_PALETTE).filter((s) => !ALLOWED.has(s.file))
  expect(
    offenders.map((s) => `${s.file}:${s.line}`),
    `off-palette colour outside the token system:\n${show(offenders)}`,
  ).toStrictEqual([])
})

test('raw hex/rgba stays out of the components', () => {
  const RAW_COLOUR = /#[0-9a-fA-F]{6}\b|rgba?\(/
  const ALLOWED = new Set([
    'src/theme.ts', // the palette itself
    'src/ui/QueueNumber.tsx', // gradient top stop `from-[#FFD65a]` — a knowingly kept deviation
  ])
  const offenders = scan(
    SOURCE_FILES.filter((f) => /\.tsx?$/.test(f)),
    RAW_COLOUR,
  ).filter((s) => !ALLOWED.has(s.file))
  expect(
    offenders.map((s) => `${s.file}:${s.line}`),
    `raw colour literal in a component:\n${show(offenders)}`,
  ).toStrictEqual([])
})

test('the gradient treatment lives in the primitives layer, not in screens', () => {
  const offenders = scan(SOURCE_FILES, /\bbg-gradient-to-/).filter((s) => !s.file.startsWith('src/ui/'))
  expect(
    offenders.map((s) => `${s.file}:${s.line}`),
    `a screen rolled its own gradient:\n${show(offenders)}`,
  ).toStrictEqual([])
})

test('every screen builds on the shared primitives', () => {
  const SCREENS = [
    'src/screens/SetupScreen.tsx',
    'src/screens/OrderStation.tsx',
    'src/screens/DisplayScreen.tsx',
    'src/screens/QueuePanel.tsx',
    'src/screens/DashboardScreen.tsx',
    'src/dashboard/PinGate.tsx',
    'src/App.tsx',
  ]
  for (const f of SCREENS) {
    expect(readFileSync(join(ROOT, f), 'utf8'), `${f} imports nothing from src/ui`).toMatch(
      /from '\.\.?\/(?:\.\.\/)?ui\//,
    )
  }
})

test('the screen inventory is the audited one — a new screen must be audited too', () => {
  const screens = readdirSync(join(ROOT, 'src/screens'))
    .filter((f) => f.endsWith('.tsx') && !f.includes('.test.'))
    .sort()
  expect(screens).toStrictEqual([
    'DashboardScreen.tsx',
    'DisplayScreen.tsx',
    'OrderStation.tsx',
    'QueuePanel.tsx',
    'SetupScreen.tsx',
  ])
})
