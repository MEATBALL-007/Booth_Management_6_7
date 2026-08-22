/**
 * Audit for the ui-overhaul criterion:
 *
 *   "Display เลขคิวสเกลใหญ่ตามจอด้วย clamp"
 *
 * The spec line that defines it (`docs/superpowers/specs/2026-08-03-ui-overhaul-design.md:50`):
 *   **จอใหญ่/TV (Display):** เลขคิวสเกลด้วย `clamp()` ให้ใหญ่ตามจอ
 *   (เช่น `clamp(96px, 22vw, 320px)`) เห็นสุดห้อง
 *
 * SCOPE OF THE EVIDENCE IN THIS FILE — read before trusting it:
 * jsdom does not run the cascade and does not lay anything out. Nothing here measures a
 * pixel, a viewport or a computed font-size. Every assertion is about the *declared token*
 * (the clamp expression that was written) and about DOM structure. That is enough to catch
 * "someone replaced the clamp with a fixed size" or "someone made the clamp viewport-blind",
 * which is what the criterion is about; it is NOT proof that the number is legible from the
 * back of a room. Only a real browser at a real width can prove that.
 *
 * Numbers like 96/22/320 are deliberately NOT asserted — design is allowed to retune them.
 * What is asserted is the *shape*: a clamp whose preferred term is viewport-relative, and
 * whose floor is below its ceiling (a clamp with min >= max can never scale — it is dead).
 */
import { test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { act } from 'react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Order } from './domain/types'
import { QueueNumber } from './ui/QueueNumber'

// ---------------------------------------------------------------------------
// The parser under test. Everything below leans on it, so group A feeds it
// fixtures first — a scanner that has gone blind makes every "no violations
// found" assertion pass for free.
// ---------------------------------------------------------------------------

type Clamp = { raw: string; min: number; pref: number; prefUnit: string; max: number }

const CLAMP_RE = /clamp\(\s*(\d+(?:\.\d+)?)px\s*,\s*(\d+(?:\.\d+)?)([a-z]+)\s*,\s*(\d+(?:\.\d+)?)px\s*\)/g

/** Every clamp(<px>, <number><unit>, <px>) written in `text`. */
function findClamps(text: string): Clamp[] {
  return [...text.matchAll(CLAMP_RE)].map((m) => ({
    raw: m[0],
    min: Number(m[1]),
    pref: Number(m[2]),
    prefUnit: m[3],
    max: Number(m[4]),
  }))
}

/** Viewport-relative units — the "…ตามจอ" half of the criterion. */
const VIEWPORT_UNITS = ['vw', 'vh', 'vmin', 'vmax', 'dvw', 'dvh', 'svw', 'lvw']

/** A clamp that actually scales with the screen AND is not pinned shut. */
function isLiveViewportClamp(c: Clamp): boolean {
  return VIEWPORT_UNITS.includes(c.prefUnit) && c.min < c.max && c.pref > 0
}

function soleClampIn(text: string, what: string): Clamp {
  const found = findClamps(text)
  // Not `toBeGreaterThan(0)`: if a refactor splits the number across two clamps we want to
  // be told, not to silently audit whichever one happened to be first.
  expect(found, `expected exactly one clamp on ${what}, got: ${JSON.stringify(found)}`).toHaveLength(1)
  return found[0]
}

// ---------------------------------------------------------------------------
// A. The parser has teeth today
// ---------------------------------------------------------------------------

test('A1: the clamp scanner reads a well-formed viewport clamp', () => {
  const [c] = findClamps('text-[clamp(96px,22vw,320px)] leading-none')
  expect(c).toBeDefined()
  expect([c.min, c.pref, c.prefUnit, c.max]).toEqual([96, 22, 'vw', 320])
  expect(isLiveViewportClamp(c)).toBe(true)
})

test('A2: the scanner rejects sizes that only look like they scale', () => {
  // A fixed size is not a clamp at all.
  expect(findClamps('text-8xl')).toEqual([])
  // A clamp whose preferred term is absolute never responds to the screen.
  const [px] = findClamps('text-[clamp(96px,220px,320px)]')
  expect(px.prefUnit).toBe('px')
  expect(isLiveViewportClamp(px)).toBe(false)
  // A clamp whose floor meets its ceiling is pinned shut — the vw term can never win.
  const [dead] = findClamps('text-[clamp(320px,22vw,320px)]')
  expect(isLiveViewportClamp(dead)).toBe(false)
  // rem scales with the root font-size, not with the screen. Still not "ตามจอ".
  const [rem] = findClamps('text-[clamp(96px,22rem,320px)]')
  expect(isLiveViewportClamp(rem)).toBe(false)
})

// ---------------------------------------------------------------------------
// B. The primitive: <QueueNumber size="display" />
//    Spec §3 lists `<QueueNumber size>` as the shared queue-number primitive,
//    so the display size is where the criterion has to live.
// ---------------------------------------------------------------------------

test('B1: the display-size queue number scales with the viewport', () => {
  const { container } = render(<QueueNumber value="A12" size="display" />)
  const span = container.querySelector('span')!
  const c = soleClampIn(span.className, 'QueueNumber size="display"')
  expect(VIEWPORT_UNITS, `"${c.raw}" does not scale with the screen`).toContain(c.prefUnit)
  expect(c.min, `"${c.raw}" is pinned shut`).toBeLessThan(c.max)
})

test('B2: the card-size queue number does NOT borrow the display scale', () => {
  // QueuePanel/OrderStation cards sit in a fixed-width column; a viewport-scaled number
  // there would blow the card open on a TV-sized HQ laptop. The criterion is about the
  // customer Display only, and this pins the boundary.
  const { container } = render(<QueueNumber value="A12" size="card" />)
  expect(findClamps(container.querySelector('span')!.className)).toEqual([])
})

test('B3: the default size is the card size, so the default does not scale either', () => {
  const { container } = render(<QueueNumber value="A12" />)
  expect(findClamps(container.querySelector('span')!.className)).toEqual([])
})

// ---------------------------------------------------------------------------
// C. The Display screen at runtime
// ---------------------------------------------------------------------------

let emit: (orders: Order[]) => void = () => {}
vi.mock('./order/ordersRepo', () => ({
  subscribeBoothOrders: (_booth: string, cb: (o: Order[]) => void) => { emit = cb; return () => {} },
  createOrder: vi.fn(),
  updateOrderStatus: vi.fn(),
}))
vi.mock('./display/chime', () => ({ playChime: vi.fn() }))

import { DisplayScreen } from './screens/DisplayScreen'

const o = (over: Partial<Order>): Order => ({
  id: 'x', boothId: 'drinks', queueNumber: 'A1', station: 'A', items: [], total: 30,
  paymentMethod: 'cash', paymentStatus: 'paid', status: 'waiting', createdAt: 1, ...over,
})

function renderBoard() {
  render(<DisplayScreen booth="drinks" />)
  act(() => emit([
    o({ id: 's1', queueNumber: 'A1', status: 'serving' }),
    o({ id: 'w1', queueNumber: 'A2', status: 'waiting', createdAt: 1 }),
    o({ id: 'w2', queueNumber: 'A3', status: 'waiting', createdAt: 2 }),
  ]))
}

/** The clamp actually on screen for the number being served. */
function servingClamp(): Clamp {
  const el = screen.getByTestId('serving').querySelector('span')!
  return soleClampIn(el.className, 'the serving number on screen')
}

/** The clamp on the "เตรียมตัว" callout number (its own, not routed through QueueNumber). */
function nextUpClamp(): Clamp {
  return soleClampIn(screen.getByTestId('next-up').className, 'the next-up callout number')
}

test('C1: the number being served reaches the screen with a live viewport clamp', () => {
  renderBoard()
  const c = servingClamp()
  expect(isLiveViewportClamp(c), `serving number is "${c.raw}"`).toBe(true)
})

test('C2: the "เตรียมตัว" callout number scales too, even though it bypasses QueueNumber', () => {
  // DisplayScreen.tsx writes this clamp inline instead of going through the primitive,
  // which makes it the easiest one to lose in a refactor — hence its own test.
  renderBoard()
  const c = nextUpClamp()
  expect(isLiveViewportClamp(c), `callout number is "${c.raw}"`).toBe(true)
})

test('C3: the served number out-scales the callout at every screen width', () => {
  // "เห็นสุดห้อง" is a hierarchy claim, not just a per-element one: whichever number is
  // being served now must be the biggest thing on the wall. Comparing all three clamp
  // parameters is what makes that true at *every* viewport width — beating on the vw term
  // alone still loses on a narrow screen where the floor wins.
  renderBoard()
  const serve = servingClamp()
  const next = nextUpClamp()
  expect(serve.min).toBeGreaterThan(next.min)
  expect(serve.pref).toBeGreaterThan(next.pref)
  expect(serve.max).toBeGreaterThan(next.max)
  expect(serve.prefUnit).toBe(next.prefUnit) // comparing vw against vh would be meaningless
})

// ---------------------------------------------------------------------------
// D. The pills — a recorded DECISION, not an unknown.
//
// The remaining up-next pills use `text-xl md:text-2xl` and do NOT clamp. That is
// deliberate and in scope of this criterion only as an exclusion:
//   spec §5.3 (:59) — "NOW SERVING เลขใหญ่ glow …, UP NEXT pills **สะอาด**"
//   spec §2  (:26) — glow/emphasis belongs to "เลขคิว**ที่กำลังทำ**"
// The criterion says the queue number must be readable from the back of the room; the spec
// itself assigns that job to the serving number (and the get-ready callout), and assigns the
// pills the opposite job. Clamping the pills would flatten the size hierarchy that round
// 0020 pinned as the glanceability evidence. So: excluded, on the spec's own instruction.
//
// What is locked instead is the *reason* — the pills must stay below the callout's floor.
// That survives a future redesign that gives the pills a small clamp, and goes red the day
// someone makes them compete with the numbers that matter.
// ---------------------------------------------------------------------------

/** Default Tailwind text scale in rem (no fontSize extend in tailwind.config.js). */
const TEXT_REM: Record<string, number> = {
  xs: 0.75, sm: 0.875, base: 1, lg: 1.125, xl: 1.25,
  '2xl': 1.5, '3xl': 1.875, '4xl': 2.25, '5xl': 3, '6xl': 3.75,
  '7xl': 4.5, '8xl': 6, '9xl': 8,
}
/** `html { font-size: 120% }` in src/index.css — every rem utility is 1.2× the CSS default. */
const ROOT_PX = 16 * 1.2

/** Largest declared font-size on an element, in px. Throws if it declares none. */
function largestDeclaredPx(className: string): number {
  const sizes = [...className.matchAll(/(?:^|\s|:)text-([a-z0-9]+)\b/g)]
    .map((m) => TEXT_REM[m[1]])
    .filter((rem): rem is number => rem !== undefined)
  // Loud, not silent: an element whose size we cannot read must fail the audit, otherwise
  // renaming the utility would quietly turn this whole section into a no-op.
  if (sizes.length === 0) throw new Error(`no known text size utility in "${className}"`)
  return Math.max(...sizes) * ROOT_PX
}

test('D1: the size reader finds real utilities and refuses to guess', () => {
  expect(largestDeclaredPx('font-mono text-xl md:text-2xl text-phantom-muted')).toBeCloseTo(1.5 * ROOT_PX)
  // `text-phantom-muted` matches the same shape but is a colour — it must not be read as a size,
  // and an element carrying only colours must blow up rather than report 0.
  expect(() => largestDeclaredPx('font-mono text-phantom-muted')).toThrow(/no known text size/)
})

test('D2: up-next pills stay clean — below the floor of the callout that outranks them', () => {
  renderBoard()
  const pill = screen.getAllByTestId('upnext')[0]
  const pillPx = largestDeclaredPx(pill.className)
  expect(findClamps(pill.className), 'pills are spec\'d "สะอาด" — see the note above').toEqual([])
  expect(pillPx).toBeLessThan(nextUpClamp().min)
})

// ---------------------------------------------------------------------------
// E. Source sweep — catches a clamp added somewhere this file does not render.
// ---------------------------------------------------------------------------

const DISPLAY_SRC = 'src/screens/DisplayScreen.tsx'
const displaySource = readFileSync(resolve(process.cwd(), DISPLAY_SRC), 'utf8')

test('E1: the sweep can still see the callout clamp in the source it reads', () => {
  // Spine test. Without this, E2 stays green forever if the regex, the path or the file
  // layout drifts — `expect(violations).toEqual([])` is free when the scanner is blind.
  const anchor = displaySource.indexOf('data-testid="next-up"')
  expect(anchor, `${DISPLAY_SRC} no longer contains the next-up testid`).toBeGreaterThan(-1)
  // The className sits on a later line of the same JSX opening tag, so read to the tag's end.
  const tag = displaySource.slice(anchor, displaySource.indexOf('>', anchor))
  expect(findClamps(tag), `no clamp found on the next-up tag: ${tag}`).toHaveLength(1)
})

test('E2: every clamp written in the Display screen scales and is not pinned shut', () => {
  const dead = findClamps(displaySource).filter((c) => !isLiveViewportClamp(c))
  expect(dead.map((c) => c.raw)).toEqual([])
  expect(findClamps(displaySource).length).toBeGreaterThan(0) // paired with E1's anchor
})
