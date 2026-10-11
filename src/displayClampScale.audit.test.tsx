/**
 * Acceptance criterion — ui-overhaul:
 *
 *   "Display เลขคิวสเกลใหญ่ตามจอด้วย clamp"
 *
 * The spec (`docs/superpowers/specs/2026-08-03-ui-overhaul-design.md`, line 50)
 * words it as: *จอใหญ่/TV (Display): เลขคิวสเกลด้วย `clamp()` ให้ใหญ่ตามจอ
 * (เช่น `clamp(96px, 22vw, 320px)`) เห็นสุดห้อง*.
 *
 * ── สิ่งที่ถูกพิสูจน์ไปแล้ว ไม่เขียนซ้ำ ──────────────────────────────────────
 * Three tests on this branch already cover the *declaration* half:
 *   displayCentering.audit  B1 — both headline numbers declare a clamp() whose
 *                                vw is > 0, floor ≥ 48px, ceiling > floor
 *   displayGlanceable.audit Z1 — the serving number beats the เตรียมตัว callout
 *                                on all three clamp parameters at once
 *   displayGlanceable.audit Z2 — the serving number's FLOOR already beats the
 *                                largest fixed heading on the screen
 * None of them is repeated here.
 *
 * ── ช่องว่างที่ไฟล์นี้ปิด: clamp ที่ "ประกาศไว้" ≠ clamp ที่ "ทำงาน" ────────
 * `vw > 0` is a weaker fence than it looks. `clamp(96px, 1vw, 320px)` passes it
 * — and never scales on any screen a human owns: the 1vw term does not overtake
 * the 96px floor until the viewport is 9600px wide. The number would sit frozen
 * at its floor on a phone, on an iPad, and on the hall TV alike, while every
 * declared-value check stayed green.
 *
 * So this file does not ask *what is declared*, it asks **what the declaration
 * evaluates to**: it re-implements the CSS definition of `clamp()` and `vw` and
 * computes the resulting type size at the widths this system actually runs on
 * (the spec's own device list — phone, iPad ตั้ง/นอน, laptop, TV). "ใหญ่ตามจอ"
 * then becomes four checkable facts — at the floor on a phone, strictly larger
 * when the iPad rotates, at the ceiling on a TV, and at least twice the phone
 * size when it gets there.
 *
 * ── ขอบเขตของหลักฐาน / SCOPE OF THE EVIDENCE ────────────────────────────────
 * **NO PIXEL IS MEASURED ANYWHERE IN THIS FILE, AND NO VIEWPORT IS EVER SET.**
 * jsdom loads no stylesheet, resolves no Tailwind class and computes no layout;
 * `getBoundingClientRect()` returns zeroes here. Nothing below renders at 1920px.
 *
 * `sizeAt()` is *arithmetic over the declared string*, not a measurement. The
 * step from "the triple evaluates to 320 at 1920" to "the number is 320px on the
 * hall TV" rests on two assumptions that are assumed, NOT proved:
 *   (1) Tailwind emits `text-[clamp(a,b,c)]` as the `font-size` it documents —
 *       an arbitrary-value class is passed through verbatim, but no test here
 *       parses generated CSS;
 *   (2) `vw` is 1% of the layout viewport, and clamp() is min/max as specified.
 * What this file therefore is, honestly stated: a fence that catches the clamp
 * being *removed*, *flattened to a non-scaling vw*, *given a ceiling no screen
 * reaches*, or *swapped for the fixed card size* — the four realistic ways this
 * criterion regresses. It is not evidence about how anything looks in a hall.
 */
import { vi, test, expect, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { act } from 'react'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import type { Order } from './domain/types'

const { subs } = vi.hoisted(() => ({ subs: [] as ((o: Order[]) => void)[] }))

vi.mock('./display/chime', () => ({ playChime: vi.fn() }))
vi.mock('./order/ordersRepo', () => ({
  subscribeBoothOrders: (_booth: string, cb: (o: Order[]) => void) => {
    subs.push(cb)
    return () => {}
  },
  subscribeAllOrders: vi.fn(() => () => {}),
  updateOrderStatus: vi.fn(),
  createOrder: vi.fn(),
}))

import { DisplayScreen } from './screens/DisplayScreen'
import { QueueNumber } from './ui/QueueNumber'

const o = (over: Partial<Order>): Order => ({
  id: 'x', boothId: 'drinks', queueNumber: 'A1', station: 'A', items: [], total: 30,
  paymentMethod: 'cash', paymentStatus: 'paid', status: 'waiting', createdAt: 1, ...over,
})

const emit = (orders: Order[]) => act(() => { subs.forEach((cb) => cb(orders)) })

/** One serving number and one waiting number — the shape both clamps need. */
const HOUSE: Order[] = [
  o({ id: 's1', queueNumber: 'A1', status: 'serving', servingAt: 10 }),
  o({ id: 'w1', queueNumber: 'A2', status: 'waiting', createdAt: 2 }),
]

beforeEach(() => { subs.length = 0 })
afterEach(() => { vi.restoreAllMocks() })

// ─────────────────────────────────────────────────────────────────────────────
// The reader, and the clamp arithmetic it feeds.
// ─────────────────────────────────────────────────────────────────────────────

const cls = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)

interface Clamp { min: number; vw: number; max: number }

const CLAMP = /^text-\[clamp\((\d+)px,(\d+)vw,(\d+)px\)\]$/

/**
 * The clamp declared on `el` or anywhere below it.
 *
 * The subtree walk is not laziness: on the customer screen the `data-testid` is
 * on a wrapper `<span>` and the sized `<span>` is `QueueNumber`'s own, one level
 * down. Reading only the testid element would find nothing and every clamp
 * assertion here would have to be written as a negative — which passes for free.
 */
function clampIn(el: Element): Clamp | null {
  for (const node of [el, ...Array.from(el.querySelectorAll('*'))]) {
    for (const c of cls(node)) {
      const m = CLAMP.exec(c)
      if (m) return { min: +m[1], vw: +m[2], max: +m[3] }
    }
  }
  return null
}

/**
 * What `clamp(min, N vw, max)` resolves to at a viewport `px` wide.
 *
 * This is the CSS definition, transcribed: `vw` is 1% of the viewport width, and
 * clamp is the preferred value fenced by the floor and the ceiling. Fractional
 * results are kept — rounding here would blur exactly the "did it actually grow"
 * question W3 asks.
 */
const sizeAt = (c: Clamp, px: number) => Math.min(Math.max(c.min, (c.vw / 100) * px), c.max)

/** The screens the spec names, narrowest first. */
const PHONE = 390        // มือถือ
const IPAD_PORTRAIT = 768  // iPad ตั้ง
const IPAD_LANDSCAPE = 1024 // iPad นอน
const TV = 1920          // จอใหญ่ / TV — the one the criterion is written for

/** Both numbers the customer screen sizes off the viewport. */
const NUMBERS = ['serving', 'next-up'] as const

function clampsOnDisplay(): Record<string, Clamp> {
  render(<DisplayScreen booth="drinks" />)
  emit(HOUSE)
  const out: Record<string, Clamp> = {}
  for (const testid of NUMBERS) {
    const c = clampIn(screen.getByTestId(testid))
    expect(c, `${testid} declares no clamp() at all`).not.toBeNull()
    out[testid] = c!
  }
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// S. the checker itself
//
// No mutation of production code can fail S0 — that is the point of it. A sweep
// whose reader has gone blind returns the same empty/near-empty answer as a
// clean codebase, so the reader is pinned against hand-built fixtures instead.
// ─────────────────────────────────────────────────────────────────────────────

const span = (className: string) => {
  const s = document.createElement('span')
  s.className = className
  return s
}

test('S0: clampIn reads a real clamp, ignores a fixed step, and sizeAt is the CSS definition', () => {
  // reads the exact triple, including from a DESCENDANT — the real DOM shape
  expect(clampIn(span('text-[clamp(96px,22vw,320px)] leading-none'))).toStrictEqual({ min: 96, vw: 22, max: 320 })
  const wrapper = document.createElement('span')
  wrapper.appendChild(span('text-[clamp(56px,10vw,140px)]'))
  expect(clampIn(wrapper)).toStrictEqual({ min: 56, vw: 10, max: 140 })

  // a fixed named step is not a clamp, and neither is a malformed one
  expect(clampIn(span('text-5xl'))).toBeNull()
  expect(clampIn(span('text-[clamp(96px,22vw)]'))).toBeNull()
  expect(clampIn(span(''))).toBeNull()

  // the arithmetic, at all three branches of clamp()
  const c: Clamp = { min: 96, vw: 22, max: 320 }
  expect(sizeAt(c, 100)).toBe(96)    // below the floor  → floor
  expect(sizeAt(c, 1000)).toBe(220)  // inside the band  → the vw term
  expect(sizeAt(c, 5000)).toBe(320)  // above the ceiling → ceiling
})

test('S1: the customer screen declares these two clamps (canary — pins the values themselves)', () => {
  // A deliberate retune of the type scale is expected to fail this test and be
  // updated here; the W tests below then re-prove the new numbers still scale.
  // Because it pins exact values it dies alongside every clamp mutation, which
  // makes it the canary for this file rather than an independent claim.
  expect(clampsOnDisplay()).toStrictEqual({
    serving: { min: 96, vw: 22, max: 320 },   // ui/QueueNumber.tsx — matches the spec's own example
    'next-up': { min: 56, vw: 10, max: 140 }, // screens/DisplayScreen.tsx — the เตรียมตัว callout
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// W. the clamp actually scales — evaluated, not merely declared
// ─────────────────────────────────────────────────────────────────────────────

test('W1: on a phone both numbers sit on their floor, and the floor is legible', () => {
  const c = clampsOnDisplay()
  for (const id of NUMBERS) {
    expect(sizeAt(c[id], PHONE), `${id} is not at its floor on a ${PHONE}px screen`).toBe(c[id].min)
    expect(c[id].min).toBeGreaterThanOrEqual(48)
  }
})

test('W2: on the hall TV both numbers have grown all the way to their ceiling', () => {
  // This is the fact `vw > 0` cannot express. A vw term too small to overtake the
  // ceiling anywhere means the ceiling is decoration and the number never grew;
  // reaching it at 1920px is what makes the clamp band real.
  const c = clampsOnDisplay()
  for (const id of NUMBERS) {
    expect(sizeAt(c[id], TV), `${id} never reaches its ceiling — the vw term is too small to matter`)
      .toBe(c[id].max)
  }
})

test('W3: the numbers get bigger when the iPad is rotated to landscape', () => {
  // 768 → 1024 is a rotation, not a breakpoint jump: the whole point of vw over
  // `md:` steps is that the size moves continuously between the named widths.
  const c = clampsOnDisplay()
  for (const id of NUMBERS) {
    expect(sizeAt(c[id], IPAD_LANDSCAPE), `${id} does not grow between ${IPAD_PORTRAIT}px and ${IPAD_LANDSCAPE}px`)
      .toBeGreaterThan(sizeAt(c[id], IPAD_PORTRAIT))
  }
})

test('W4: เห็นสุดห้อง — the TV size is at least double the phone size', () => {
  const c = clampsOnDisplay()
  for (const id of NUMBERS) {
    expect(sizeAt(c[id], TV) / sizeAt(c[id], PHONE), `${id} barely grows between a phone and a TV`)
      .toBeGreaterThanOrEqual(2)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Q. the clamp is scoped to the Display, and only to the Display
//
// The criterion is written for จอใหญ่/TV. `QueueNumber` is shared with the two
// operator screens, where a 22vw number would not be an improvement — it would
// be one queue card filling an iPad. So the variant that clamps and the variant
// that does not are both load-bearing, and so is which one is the default.
// ─────────────────────────────────────────────────────────────────────────────

test('Q1: the display variant clamps, the card variant does not, and card is the default', () => {
  const display = render(<QueueNumber value="A7" size="display" />).container
  expect(clampIn(display), 'size="display" declares no clamp').not.toBeNull()

  const card = render(<QueueNumber value="A7" size="card" />).container
  expect(clampIn(card), 'the operator card variant scales off the viewport').toBeNull()
  expect(cls(card.firstElementChild!)).toContain('text-5xl')

  // the default matters: `primitives.test.tsx` and any future caller that omits
  // the prop must land on the card size, not on 22vw
  const dflt = render(<QueueNumber value="A7" />).container
  expect(clampIn(dflt)).toBeNull()
})

const SCREENS = ['DashboardScreen.tsx', 'DisplayScreen.tsx', 'OrderStation.tsx', 'QueuePanel.tsx', 'SetupScreen.tsx']

/** `size="display"` / `size={'display'}` on a QueueNumber, wherever it appears. */
const USES_DISPLAY = /size=(?:"display"|\{'display'\})/
const USES_CARD = /size=(?:"card"|\{'card'\})/

function sweepScreens(read: (f: string) => string) {
  const hits: { display: string[]; card: string[] } = { display: [], card: [] }
  for (const f of SCREENS) {
    read(f).split(/\r?\n/).forEach((line, i) => {
      if (USES_DISPLAY.test(line)) hits.display.push(`${f}:${i + 1}`)
      if (USES_CARD.test(line)) hits.card.push(`${f}:${i + 1}`)
    })
  }
  return hits
}

test('Q0: the usage scanner sees both spellings, and is not fooled by a mention', () => {
  // pinned against fixtures, for the same reason as S0 — a scanner that matched
  // nothing would report "no screen misuses the display size" just as loudly
  const fake: Record<string, string> = {
    'DashboardScreen.tsx': `<QueueNumber value={q} size={'display'} />`,
    'DisplayScreen.tsx': `<QueueNumber value={s.queueNumber} size="display" />`,
    'OrderStation.tsx': `<QueueNumber value={issued} size="card" />`,
    'QueuePanel.tsx': `// a comment about the display size proves nothing\n<QueueNumber size={'card'} />`,
    'SetupScreen.tsx': `const size = 'display'`, // a bare mention is not a prop
  }
  expect(sweepScreens((f) => fake[f])).toStrictEqual({
    display: ['DashboardScreen.tsx:1', 'DisplayScreen.tsx:1'],
    card: ['OrderStation.tsx:1', 'QueuePanel.tsx:2'],
  })
})

test('Q2: only the customer screen asks for the viewport-scaled number', () => {
  const REPO = process.cwd()
  // `import.meta.url` is not a file: URL under Vitest — fileURLToPath throws and
  // the file reports zero tests. Read from cwd, and prove the read really landed.
  const read = (f: string) => {
    const p = join(REPO, 'src', 'screens', f)
    expect(existsSync(p), `${p} does not exist — the sweep is watching nothing`).toBe(true)
    const src = readFileSync(p, 'utf8')
    expect(src.length, `${f} read as empty`).toBeGreaterThan(200)
    return src
  }

  // spine: the sweep finds the real call sites, not an empty list
  expect(sweepScreens(read)).toStrictEqual({
    display: ['DisplayScreen.tsx:83'],
    card: ['OrderStation.tsx:88', 'QueuePanel.tsx:98'],
  })
})
