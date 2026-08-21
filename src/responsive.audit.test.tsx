/**
 * Responsive audit — spec `2026-08-03-ui-overhaul-design.md` §4 / success criterion 2:
 *
 *   "อ่านง่ายบน iPad ตั้ง+นอน, แล็ปท็อป HQ, จอใหญ่, มือถือ
 *    — ไม่มี horizontal scroll, touch target ≥44px"
 *
 * ══════════════════════════════════════════════════════════════════════════════
 * SCOPE OF THE EVIDENCE — read this before trusting a green run.
 *
 * jsdom does not run the CSS cascade and does not lay anything out. There is no
 * viewport, no `scrollWidth`, no media-query evaluation. **Not one assertion in
 * this file measures a pixel.** "No horizontal scroll" therefore CANNOT be proven
 * here, and nothing below pretends to prove it.
 *
 * What IS proven is the set of *structural preconditions* whose violation would
 * make an overflow certain, plus the touch-target floor, which is a declared
 * length rather than a measured one:
 *
 *   A. every interactive element declares a ≥44px minimum height
 *   B. no hard pixel width exceeds the smallest supported screen unguarded,
 *      and every image is capped at `max-width:100%` (spec §4, literally)
 *   C. every grid starts single/dual column and only widens behind a breakpoint
 *   D. the big-screen numbers scale with `clamp()` on a viewport unit
 *   E. `index.html` ships the viewport meta — without it EVERY page scrolls
 *      horizontally on a phone regardless of how good the CSS is
 *
 * Closing the criterion at pixel level needs a real browser at 360 / 768 / 1024 /
 * 1920 px. That is recorded as an open gap in
 * `docs/autopilot/2026-08-21-responsive-audit.md`, not silently implied to be done.
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Why a source sweep rather than rendering each screen: the criterion says "ทุกหน้า"
 * — every page, including pages that do not exist yet. A sweep fails with the
 * offending `file:line` printed, so a short button added next month is caught on
 * its first day. Rendered assertions are used where the question is "does the class
 * actually reach the DOM", which a source sweep cannot answer.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { render, screen } from '@testing-library/react'
import { vi, test, expect } from 'vitest'

vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,FAKE') },
}))
vi.mock('./order/ordersRepo', () => ({
  createOrder: vi.fn().mockResolvedValue('order-1'),
  subscribeBoothOrders: () => () => {},
  subscribeAllOrders: () => () => {},
  updateOrderStatus: vi.fn(),
}))
vi.mock('./comms/commsRepo', () => ({
  sendMessage: vi.fn().mockResolvedValue('m1'),
  subscribeMessages: () => () => {},
  ackMessage: vi.fn(),
  upsertPresence: vi.fn().mockResolvedValue(undefined),
  subscribePresence: () => () => {},
}))

import { Button } from './ui/Button'
import { QueueNumber } from './ui/QueueNumber'
import { SetupScreen } from './screens/SetupScreen'
import { OrderStation } from './screens/OrderStation'
import { DisplayScreen } from './screens/DisplayScreen'

/** The smallest screen the spec asks the app to survive (spec §4: mobile `<640`). */
const SMALLEST_SCREEN_PX = 360
/** Apple HIG / WCAG 2.5.5 floor, restated by the spec as "touch target ≥ 44px". */
const TOUCH_FLOOR_PX = 44

const ROOT = process.cwd()

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  )
}

/** repo-relative, forward-slashed — so failure messages stay clickable on Windows too */
const rel = (abs: string) => relative(ROOT, abs).split('\\').join('/')

/** Every hand-written source file the UI is built from. Tests cannot style a screen. */
const SOURCE_FILES = walk(join(ROOT, 'src'))
  .map(rel)
  .filter((f) => /\.(ts|tsx|css)$/.test(f))
  .filter((f) => !/\.test\.tsx?$/.test(f))

const read = (file: string) => readFileSync(join(ROOT, file), 'utf8')
const lineOf = (src: string, index: number) => src.slice(0, index).split('\n').length

type Site = { file: string; line: number; text: string }
/**
 * Truncation belongs HERE and nowhere else. Shortening a tag before testing it makes
 * every element whose className sits past the cut fail for a reason that has nothing
 * to do with the rule — four honest `<input>` elements read as violations that way.
 */
const show = (sites: Site[]) =>
  sites.map((s) => `${s.file}:${s.line}  ${s.text.replace(/\s+/g, ' ').slice(0, 160)}`).join('\n')

/**
 * Grab a JSX opening tag starting at `start`, spanning however many lines it takes.
 * A raw `<button` in this codebase routinely carries its className five lines below
 * the tag name, so a line-at-a-time scan would report every one of them as missing.
 * Brace depth is tracked because handler props (`onClick={() => …}`) contain `>`.
 */
function openingTag(src: string, start: number): string {
  let depth = 0
  for (let i = start; i < src.length; i++) {
    const c = src[i]
    if (c === '{') depth++
    else if (c === '}') depth--
    else if (c === '>' && depth === 0) return src.slice(start, i + 1)
  }
  return src.slice(start)
}

/**
 * Raw DOM tags a finger has to hit. `<Button>` (capital B) is deliberately absent:
 * it is a component, and its floor is asserted once, at the primitive, in test A2.
 */
const INTERACTIVE = /<(button|input|select|textarea|a)(?=[\s\n>])/g

function interactiveSites(): Site[] {
  return SOURCE_FILES.filter((f) => f.endsWith('.tsx')).flatMap((file) => {
    const src = read(file)
    const out: Site[] = []
    for (const m of src.matchAll(INTERACTIVE)) {
      const tag = openingTag(src, m.index)
      out.push({ file, line: lineOf(src, m.index), text: tag })
    }
    return out
  })
}

/** Largest `min-h-[Npx]` declared on this element, or 0 if it declares none. */
function declaredMinHeight(tag: string): number {
  const hits = [...tag.matchAll(/min-h-\[(\d+)px\]/g)].map((m) => Number(m[1]))
  return hits.length ? Math.max(...hits) : 0
}

// ─────────────────────────────────────────────────────────────────────────────
// 0. The sweep must actually sweep. A regex that matches nothing passes every
//    rule below in silence — the classic way an audit file becomes decoration.
// ─────────────────────────────────────────────────────────────────────────────

test('the source sweep reaches the real UI files (guards against a vacuous audit)', () => {
  expect(SOURCE_FILES).toContain('src/screens/OrderStation.tsx')
  expect(SOURCE_FILES).toContain('src/ui/Button.tsx')
  expect(SOURCE_FILES).toContain('src/index.css')
  expect(SOURCE_FILES.length).toBeGreaterThan(30)
  // Every screen has taps on it; if this collapses, the tag extractor broke.
  expect(interactiveSites().length).toBeGreaterThanOrEqual(10)
})

// ─────────────────────────────────────────────────────────────────────────────
// A. Touch target ≥ 44px  (spec §4: "iPad แนวตั้ง … touch target ≥ 44px")
// ─────────────────────────────────────────────────────────────────────────────

test('A1 · every raw interactive element in src/ declares a ≥44px minimum height', () => {
  const short = interactiveSites().filter((s) => declaredMinHeight(s.text) < TOUCH_FLOOR_PX)
  expect(short, `interactive elements with no ${TOUCH_FLOOR_PX}px floor:\n${show(short)}`).toEqual([])
})

test('A2 · the Button primitive carries the 44px floor itself, not by caller convention', () => {
  // This is the load-bearing one. With the floor only at call sites, a caller that
  // forgets ships a short button and no sweep of raw <button> tags can see it,
  // because the element in the source is <Button …>, not <button …>.
  const src = read('src/ui/Button.tsx')
  const base = src.slice(src.indexOf('className='), src.indexOf('{...props}'))
  expect(declaredMinHeight(base)).toBeGreaterThanOrEqual(TOUCH_FLOOR_PX)
})

test('A2b · the floor reaches the DOM even when the caller passes no className', () => {
  render(<Button>ตกลง</Button>)
  expect(screen.getByRole('button').className).toMatch(/min-h-\[44px\]/)
})

test('A2c · a caller shrinking the padding cannot shrink the target below the floor', () => {
  render(<Button className="px-1 py-0 text-xs">เล็ก</Button>)
  const cls = screen.getByRole('button').className
  expect(cls).toMatch(/min-h-\[44px\]/)
  expect(cls).toMatch(/py-0/) // the caller's override is still applied — floor ≠ lockout
})

test('A3 · the Setup confirm button — the first target on every device — meets the floor', async () => {
  render(<SetupScreen onDone={() => {}} />)
  const confirm = screen.getByRole('button', { name: /ยืนยัน/ })
  expect(confirm.className).toMatch(/min-h-\[44px\]/)
})

test('A4 · icon-only targets are ≥44px on BOTH axes (a 44×20 strip still misses a thumb)', async () => {
  render(<OrderStation booth="drinks" station="A" />)
  // The ± quantity steppers are the only single-glyph controls in the app.
  const minus = screen.getAllByRole('button').filter((b) => b.textContent?.trim() === '−')
  const plus = screen.getAllByRole('button').filter((b) => b.textContent?.trim() === '+')
  // No cart yet, so render them via their source instead of the empty DOM.
  const src = read('src/screens/OrderStation.tsx')
  const steppers = [...src.matchAll(/<button(?=[\s\n>])/g)]
    .map((m) => openingTag(src, m.index))
    .filter((tag) => /setQty/.test(tag))
  expect(steppers.length, 'the ± steppers moved or were renamed').toBe(2)
  for (const tag of steppers) {
    expect(declaredMinHeight(tag)).toBeGreaterThanOrEqual(TOUCH_FLOOR_PX)
    expect(tag).toMatch(/min-w-\[44px\]/)
  }
  expect(minus.length + plus.length).toBe(0) // empty cart — nothing rendered, as expected
})

test('A5 · the Setup choice chips are ≥44px on both axes', () => {
  render(<SetupScreen onDone={() => {}} />)
  const chip = screen.getByRole('button', { name: /ซุ้มถ่ายรูป|Photo/ })
  expect(chip.className).toMatch(/min-h-\[44px\]/)
  expect(chip.className).toMatch(/min-w-\[44px\]/)
})

// ─────────────────────────────────────────────────────────────────────────────
// B. Nothing wider than the narrowest screen  (spec §4: "ไม่มี horizontal scroll",
//    "รูป/การ์ด max-width:100%")
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A width class, not a shadow. `shadow-[0_0_40px_rgba(…)]` contains the literal
 * substring `w-[0_0_40px_…]` — round 0051 hit the mirror image of this trap with
 * `\bglow-o\b` matching inside `shadow-glow-o`. The lookbehind rejects any
 * preceding `-` or word character, so only a real `w-[…]` / `min-w-[…]` class
 * at a token boundary is counted.
 */
const FIXED_WIDTH = /(?<![-\w])(?:(sm|md|lg|xl|2xl):)?(min-)?w-\[(\d+)px\]/g

test('B1 · no unguarded fixed width exceeds the narrowest supported screen', () => {
  const offenders: Site[] = []
  for (const file of SOURCE_FILES) {
    const src = read(file)
    for (const m of src.matchAll(FIXED_WIDTH)) {
      const [, breakpoint, , px] = m
      if (breakpoint) continue // only applies once the screen is already that wide
      if (Number(px) <= SMALLEST_SCREEN_PX) continue
      offenders.push({ file, line: lineOf(src, m.index), text: m[0] })
    }
  }
  expect(offenders, `fixed widths over ${SMALLEST_SCREEN_PX}px with no breakpoint guard:\n${show(offenders)}`).toEqual([])
})

test('B1b · the fixed-width sweep does not mistake a box-shadow for a width class', () => {
  // Proves B1 is reading class tokens, not substrings — the exact bug pattern that
  // let a 40px glow hide from a `glow` grep in round 0051.
  const decoy = 'className="shadow-[0_0_40px_rgba(255,199,44,0.25)] rounded-3xl"'
  expect([...decoy.matchAll(FIXED_WIDTH)]).toEqual([])
  const real = 'className="w-[900px]"'
  expect([...real.matchAll(FIXED_WIDTH)].map((m) => m[3])).toEqual(['900'])
})

test('B2 · every image is capped at max-width:100% (spec §4, in those words)', () => {
  const offenders: Site[] = []
  for (const file of SOURCE_FILES.filter((f) => f.endsWith('.tsx'))) {
    const src = read(file)
    for (const m of src.matchAll(/<img(?=[\s\n>])/g)) {
      const tag = openingTag(src, m.index)
      if (/max-w-full/.test(tag)) continue
      offenders.push({ file, line: lineOf(src, m.index), text: tag })
    }
  }
  expect(offenders, `images with no max-width cap:\n${show(offenders)}`).toEqual([])
})

test('B2b · the QR image keeps its aspect ratio while being capped', () => {
  // `max-w-full` alone on an element with a hard height={240} squashes the QR at
  // narrow widths — and a squashed PromptPay QR does not scan.
  const tag = openingTag(read('src/order/QrCode.tsx'), read('src/order/QrCode.tsx').indexOf('<img'))
  expect(tag).toMatch(/max-w-full/)
  expect(tag).toMatch(/h-auto/)
})

test('B3 · a fixed-pixel grid track only appears behind a breakpoint', () => {
  // `grid-cols-[1fr_380px]` at base width would demand 380px of a 360px screen.
  const offenders: Site[] = []
  for (const file of SOURCE_FILES) {
    const src = read(file)
    for (const m of src.matchAll(/(?<![-\w])((?:sm|md|lg|xl|2xl):)?grid-cols-\[([^\]]*)\]/g)) {
      if (m[1]) continue
      if (!/\d+px/.test(m[2])) continue
      offenders.push({ file, line: lineOf(src, m.index), text: m[0] })
    }
  }
  expect(offenders, `fixed grid tracks with no breakpoint guard:\n${show(offenders)}`).toEqual([])
})

test('B4 · no page opts into horizontal scrolling or viewport-width sizing', () => {
  // `overflow-x-auto/scroll` is the criterion's negation spelled out; `w-screen`
  // ignores the scrollbar gutter and is the classic 100vw overflow on Windows.
  const offenders: Site[] = []
  for (const file of SOURCE_FILES) {
    const src = read(file)
    for (const m of src.matchAll(/(?<![-\w])(overflow-x-(?:auto|scroll|visible)|w-screen)/g)) {
      offenders.push({ file, line: lineOf(src, m.index), text: m[0] })
    }
  }
  expect(offenders, `opt-ins to horizontal overflow:\n${show(offenders)}`).toEqual([])
})

test('B5 · unbounded free text on the customer display is wrapped, not stretched', () => {
  // Menu detail lines are user-authored-ish and arbitrarily long; without a cap
  // plus break-words they are the one string on the display that can push the page.
  const src = read('src/screens/DisplayScreen.tsx')
  const detail = src.split('\n').find((l) => /max-w-\[90vw\]/.test(l))
  expect(detail, 'the display detail line lost its viewport-relative cap').toBeTruthy()
  expect(detail!).toMatch(/break-words/)
})

// ─────────────────────────────────────────────────────────────────────────────
// C. One column first  (spec §4: mobile 1 column · iPad portrait stacked ·
//    iPad landscape 2 columns · HQ multi-column grid)
// ─────────────────────────────────────────────────────────────────────────────

test('C1 · an unprefixed grid is at most 2 columns; anything wider sits behind a breakpoint', () => {
  const offenders: Site[] = []
  for (const file of SOURCE_FILES) {
    const src = read(file)
    for (const m of src.matchAll(/(?<![-\w])((?:sm|md|lg|xl|2xl):)?grid-cols-(\d+)/g)) {
      if (m[1]) continue
      if (Number(m[2]) <= 2) continue
      offenders.push({ file, line: lineOf(src, m.index), text: m[0] })
    }
  }
  expect(offenders, `grids ≥3 columns at phone width:\n${show(offenders)}`).toEqual([])
})

test('C2 · every responsive grid also declares its base column count explicitly', () => {
  // Relying on the implicit single column makes "iPad ตั้ง = คอลัมน์เดียว" an
  // accident of the default. Each of the four grids states its base out loud.
  const offenders: Site[] = []
  for (const file of SOURCE_FILES.filter((f) => f.endsWith('.tsx'))) {
    const src = read(file)
    for (const m of src.matchAll(/className=[^\n]*grid-cols-/g)) {
      const line = src.slice(m.index).split('\n')[0]
      if (!/(?:sm|md|lg|xl|2xl):grid-cols-/.test(line)) continue
      if (/(?<![-\w:])grid-cols-/.test(line)) continue
      offenders.push({ file, line: lineOf(src, m.index), text: line.trim() })
    }
  }
  expect(offenders, `responsive grids with no base column count:\n${show(offenders)}`).toEqual([])
})

test('C3 · Order Station stacks menu over cart until a landscape-tablet width', () => {
  // iPad portrait is 768px and iPad landscape is 1024px. `lg:` is min-width:1024px,
  // so the two-column split turns on exactly at landscape and not before — which is
  // the spec's "iPad ตั้ง = คอลัมน์เดียว / iPad นอน = 2 คอลัมน์" verbatim.
  const src = read('src/screens/OrderStation.tsx')
  const split = src.split('\n').find((l) => /grid-cols-\[1fr_380px\]/.test(l))
  expect(split, 'the menu/cart split grid moved').toBeTruthy()
  expect(split!).toMatch(/(?<![-\w:])grid-cols-1\b/)
  expect(split!).toMatch(/lg:grid-cols-\[1fr_380px\]/)
})

test('C4 · the HQ dashboard does spread into a multi-column grid on a laptop', () => {
  // The mirror of C1: proving nothing is 3-wide on a phone must not quietly mean
  // nothing is ever multi-column, which would fail "HQ = grid หลายคอลัมน์".
  const src = read('src/screens/DashboardScreen.tsx')
  expect(src).toMatch(/md:grid-cols-4/)
  expect(src).toMatch(/md:grid-cols-2/)
})

// ─────────────────────────────────────────────────────────────────────────────
// D. Big screens scale, they do not just get emptier  (spec §4 + criterion 5)
// ─────────────────────────────────────────────────────────────────────────────

/** min · preferred · max out of a `clamp(a,b,c)` written in a Tailwind arbitrary value. */
function clampParts(cls: string): [string, string, string] | null {
  const m = /clamp\(([^,]+),([^,]+),([^)]+)\)/.exec(cls)
  return m ? [m[1].trim(), m[2].trim(), m[3].trim()] : null
}

test('D1 · the serving number scales with the viewport, floored and capped', () => {
  render(<QueueNumber value="A1" size="display" />)
  const parts = clampParts(screen.getByText('A1').className)
  expect(parts, 'the display queue number is no longer a clamp()').toBeTruthy()
  const [min, preferred, max] = parts!
  // The middle term is what makes it scale; a fixed middle is a fixed size wearing
  // a clamp() costume and would fail "จอใหญ่ … เห็นสุดห้อง".
  expect(preferred).toMatch(/vw$/)
  expect(parseInt(min, 10)).toBeLessThan(parseInt(max, 10))
  // The floor has to still fit the narrowest screen: a 2–3 char mono queue number
  // at ~0.6em per glyph, inside p-8 (2rem × 1.2 root × 2 sides ≈ 77px) of padding.
  expect(parseInt(min, 10) * 0.6 * 3).toBeLessThan(SMALLEST_SCREEN_PX - 77)
})

test('D2 · the "get ready" number scales too, and stays below the serving number', () => {
  const src = read('src/screens/DisplayScreen.tsx')
  const line = src.split('\n').find((l) => /clamp\(56px/.test(l))
  expect(line, 'the next-up number is no longer a clamp()').toBeTruthy()
  const [min, preferred, max] = clampParts(line!)!
  expect(preferred).toMatch(/vw$/)
  render(<QueueNumber value="A1" size="display" />)
  const serving = clampParts(screen.getByText('A1').className)!
  // Every one of the three terms must lose, otherwise there is some screen width at
  // which "next" is drawn as big as "now serving".
  expect(parseInt(min, 10)).toBeLessThan(parseInt(serving[0], 10))
  expect(parseFloat(preferred)).toBeLessThan(parseFloat(serving[1]))
  expect(parseInt(max, 10)).toBeLessThan(parseInt(serving[2], 10))
})

test('D3 · text sizes are relative units — the only px font sizes are inside clamp()', () => {
  // rem utilities ride the +20% root scale (src/index.css); a bare px font size
  // does not, so it silently breaks the "relative units" rule for one element.
  const offenders: Site[] = []
  for (const file of SOURCE_FILES.filter((f) => f.endsWith('.tsx'))) {
    const src = read(file)
    for (const m of src.matchAll(/(?<![-\w])(?:(?:sm|md|lg|xl|2xl):)?text-\[([^\]]+)\]/g)) {
      if (/^clamp\(/.test(m[1])) continue
      if (!/\d+px/.test(m[1])) continue
      offenders.push({ file, line: lineOf(src, m.index), text: m[0] })
    }
  }
  expect(offenders, `absolute font sizes outside clamp():\n${show(offenders)}`).toEqual([])
})

test('D4 · the +20% root scale is declared once, in rem-compatible form', () => {
  expect(read('src/index.css')).toMatch(/html\s*\{\s*font-size:\s*120%/)
})

test('D5 · every screen root pads and gaps differently at tablet width', () => {
  // A single fixed padding is either wasteful on a phone or cramped on a TV.
  for (const file of [
    'src/screens/DisplayScreen.tsx',
    'src/screens/OrderStation.tsx',
    'src/screens/DashboardScreen.tsx',
  ]) {
    const src = read(file)
    expect(src, `${file} never steps its spacing at a breakpoint`).toMatch(/md:p-\d/)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// E. The precondition that outranks all the CSS
// ─────────────────────────────────────────────────────────────────────────────

test('E1 · index.html ships the viewport meta', () => {
  // Without this, mobile Safari and Chrome lay the page out at ~980px and then
  // scale it down: EVERY page scrolls horizontally no matter how correct the CSS
  // is. It is the cheapest possible way to fail this whole criterion.
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8')
  const meta = html.split('\n').find((l) => /name="viewport"/.test(l))
  expect(meta, 'no viewport meta — every phone will render this page at ~980px').toBeTruthy()
  expect(meta!).toMatch(/width=device-width/)
  expect(meta!).toMatch(/initial-scale=1/)
})

test('E2 · the display screen fills the height it is given', () => {
  render(<DisplayScreen booth="photo" />)
  const root = screen.getByText(/ยังไม่มีคิว/).closest('div.min-h-screen')
  expect(root, 'the display root lost min-h-screen').toBeTruthy()
})
