// Acceptance criterion: "Display glanceable — เข้าใจได้โดยไม่ต้องอ่านอังกฤษ (สี + ไอคอน + ขนาด;
// ไทยเด่น อังกฤษรอง)", spec 2026-08-04-queue-pro-upgrade-design.md §4.
//
// ⚠️ SCOPE OF THE EVIDENCE IN THIS FILE — read before trusting it.
// jsdom parses class attributes but runs NO cascade and NO layout. Nothing here measures a
// pixel, a computed colour, or a rendered glyph. Every assertion below is about the *declared
// design tokens* (which Tailwind class sits on which element) and about DOM structure. That is
// enough to catch "someone made the next-up card orange too" or "someone flattened the size
// ladder" — the regressions that silently destroy glanceability — but it is NOT proof that the
// screen reads correctly from 5 metres. Closing that last gap needs a real browser.
//
// The four testable sub-claims are encoded as: distinct colour token per zone, distinct icon per
// zone, a strictly-decreasing size ladder, and a full-screen pulse only while flashing.
// The fifth (ไทยเด่น อังกฤษรอง) is encoded as a structural rule: the English half of a bilingual
// label must live in its own element carrying de-emphasis tokens.
import { vi, test, expect, describe } from 'vitest'
import { render, screen } from '@testing-library/react'
import { act } from 'react'
import type { Order } from '../domain/types'

vi.mock('../display/chime', () => ({ playChime: vi.fn() }))

let emit: (orders: Order[]) => void = () => {}
vi.mock('../order/ordersRepo', () => ({
  subscribeBoothOrders: (_booth: string, cb: (o: Order[]) => void) => { emit = cb; return () => {} },
  createOrder: vi.fn(),
  updateOrderStatus: vi.fn(),
}))

import { DisplayScreen } from './DisplayScreen'

const o = (over: Partial<Order>): Order => ({
  id: 'x', boothId: 'drinks', queueNumber: 'A1', station: 'A', items: [], total: 30,
  paymentMethod: 'cash', paymentStatus: 'paid', status: 'waiting', createdAt: 1, ...over,
})

/** A board with all three zones populated: 1 serving, 1 next-up callout, 2 remaining pills. */
const FULL_BOARD = [
  o({ id: 's1', queueNumber: 'A1', status: 'serving' }),
  o({ id: 'w1', queueNumber: 'A2', status: 'waiting', createdAt: 1 }),
  o({ id: 'w2', queueNumber: 'A3', status: 'waiting', createdAt: 2 }),
  o({ id: 'w3', queueNumber: 'A4', status: 'waiting', createdAt: 3 }),
]

function renderBoard(orders: Order[] = FULL_BOARD, booth: 'drinks' | 'photo' = 'drinks') {
  const { container } = render(<DisplayScreen booth={booth} />)
  act(() => emit(orders))
  return container.firstElementChild as HTMLElement
}

const cls = (el: Element) => (el as HTMLElement).className

/** The three zones' number elements — the things a customer actually looks at. */
const servingNumber = () => screen.getByTestId('serving').firstElementChild as HTMLElement
const nextUpNumber = () => screen.getByTestId('next-up')
const pillNumbers = () => screen.getAllByTestId('upnext')

// ── sub-claim 1: colour alone tells you the status ───────────────────────────────────────────
//
// Reduce an element's classes to the status hue(s) it declares. Returning a JOINED list (not a
// first match) is deliberate: if someone paints the next-up card orange as well, this returns
// 'orange+yellow' and the test fails, instead of silently passing on the first hit.
function hue(el: Element): string {
  const c = cls(el)
  const hits: string[] = []
  if (/glow-o|to-phantom-orange/.test(c)) hits.push('orange')
  if (/glow-y|text-phantom-yellow/.test(c)) hits.push('yellow')
  if (/text-phantom-muted/.test(c)) hits.push('muted')
  return hits.join('+') || 'none'
}

describe('colour carries the status without any text', () => {
  test('serving is orange, next-up is yellow, the rest are muted — three different tokens', () => {
    renderBoard()
    expect(hue(servingNumber())).toBe('orange')
    expect(hue(nextUpNumber())).toBe('yellow')
    for (const pill of pillNumbers()) expect(hue(pill)).toBe('muted')
    // and the three are genuinely distinct, so no zone can be confused with another
    expect(new Set([hue(servingNumber()), hue(nextUpNumber()), hue(pillNumbers()[0])]).size).toBe(3)
  })

  test('only the serving number glows orange; the next-up glow is the yellow one', () => {
    renderBoard()
    expect(cls(servingNumber())).toMatch(/\bglow-o\b/)
    expect(cls(nextUpNumber())).toMatch(/\bglow-y\b/)
    expect(cls(nextUpNumber())).not.toMatch(/\bglow-o\b/)
    // the remaining pills are deliberately un-glowed — glow is reserved for the two hot zones
    for (const pill of pillNumbers()) expect(cls(pill)).not.toMatch(/\bglow-[oy]\b/)
  })

  test('the next-up callout is a yellow card, not just yellow text', () => {
    renderBoard()
    const card = nextUpNumber().closest('section') as HTMLElement
    expect(cls(card)).toMatch(/border-phantom-yellow/)
    expect(cls(card)).toMatch(/bg-phantom-yellow\//)
  })
})

// ── sub-claim 2: an icon per zone, and no two zones share one ────────────────────────────────
describe('icons mark the zones for people who read no text at all', () => {
  test('serving is marked 🔔 and next-up is marked 👉 — different icons', () => {
    renderBoard()
    const servingHeading = screen.getByText(/กำลังทำ/)
    const nextHeading = screen.getByText(/เตรียมตัว/)
    expect(servingHeading.textContent).toContain('🔔')
    expect(nextHeading.textContent).toContain('👉')
    // the two zones must not reuse the same glyph, or the icon stops distinguishing anything
    expect(servingHeading.textContent).not.toContain('👉')
    expect(nextHeading.textContent).not.toContain('🔔')
  })

  test('the photo booth keeps the 🔔 marker even though its wording changes', () => {
    renderBoard(FULL_BOARD, 'photo')
    expect(screen.getByText(/กำลังถ่าย/).textContent).toContain('🔔')
  })
})

// ── sub-claim 3: size encodes priority ───────────────────────────────────────────────────────
const TW_PX: Record<string, number> = {
  'text-xs': 12, 'text-sm': 14, 'text-base': 16, 'text-lg': 18,
  'text-xl': 20, 'text-2xl': 24, 'text-3xl': 30, 'text-4xl': 36, 'text-5xl': 48,
}

/** Parse `text-[clamp(96px,22vw,320px)]` into its three growth parameters. */
function clampOf(el: Element): { min: number; vw: number; max: number } {
  const m = /text-\[clamp\((\d+)px,(\d+)vw,(\d+)px\)\]/.exec(cls(el))
  if (!m) throw new Error(`expected a clamp() font size, got: ${cls(el)}`)
  return { min: Number(m[1]), vw: Number(m[2]), max: Number(m[3]) }
}

/** Largest static Tailwind text size declared on an element (i.e. its size at the md breakpoint). */
function maxStaticPx(el: Element): number {
  const sizes = cls(el)
    .split(/\s+/)
    .map((c) => TW_PX[c.replace(/^\w+:/, '')])
    .filter((n): n is number => n !== undefined)
  if (!sizes.length) throw new Error(`no Tailwind text size on: ${cls(el)}`)
  return Math.max(...sizes)
}

describe('size encodes priority: serving > next-up > the rest', () => {
  test('the three rungs of the ladder never cross, at any viewport width', () => {
    renderBoard()
    const s = clampOf(servingNumber()) // clamp(96px, 22vw, 320px)
    const n = clampOf(nextUpNumber())  // clamp(56px, 10vw, 140px)

    // rung 1 > rung 2. All three clamp parameters must dominate, otherwise the serving number
    // would shrink past the next-up number at some screen width and the hierarchy would invert.
    expect(s.min).toBeGreaterThan(n.min)
    expect(s.vw).toBeGreaterThan(n.vw)
    expect(s.max).toBeGreaterThan(n.max)

    // rung 2 > rung 3: the callout's SMALLEST size still beats the pills' LARGEST size.
    const pillCeiling = Math.max(...pillNumbers().map(maxStaticPx))
    expect(n.min).toBeGreaterThan(pillCeiling)
  })

  test('both hot numbers scale with the screen; the pills deliberately do not', () => {
    renderBoard()
    expect(clampOf(servingNumber()).vw).toBeGreaterThan(0)
    expect(clampOf(nextUpNumber()).vw).toBeGreaterThan(0)
    // a pill that grew with the viewport would compete with the callout for attention
    for (const pill of pillNumbers()) expect(cls(pill)).not.toMatch(/clamp\(/)
  })
})

// ── sub-claim 4: the pulse says "this one, right now" ────────────────────────────────────────
describe('the whole screen pulses when a number is called', () => {
  test('the first snapshot is a calm baseline — no pulse, normal background', () => {
    const root = renderBoard([o({ id: 's1', queueNumber: 'A1', status: 'serving' })])
    expect(cls(root)).toMatch(/\bbg-phantom-bg\b/)
    expect(cls(root)).not.toMatch(/\banimate-pulse\b/)
    expect(cls(root)).not.toMatch(/bg-phantom-orange\//)
  })

  test('a newly-serving number turns the whole background orange and pulses it', () => {
    const root = renderBoard([o({ id: 's1', queueNumber: 'A1', status: 'serving' })])
    act(() => emit([
      o({ id: 's1', queueNumber: 'A1', status: 'serving' }),
      o({ id: 's2', queueNumber: 'A2', status: 'serving' }),
    ]))
    expect(cls(root)).toMatch(/\banimate-pulse\b/)
    expect(cls(root)).toMatch(/bg-phantom-orange\//)
    expect(cls(root)).not.toMatch(/\bbg-phantom-bg\b/)
  })

  test('the pulse is on the full-screen root, not tucked inside a widget', () => {
    const root = renderBoard([o({ id: 's1', queueNumber: 'A1', status: 'serving' })])
    act(() => emit([
      o({ id: 's1', queueNumber: 'A1', status: 'serving' }),
      o({ id: 's2', queueNumber: 'A2', status: 'serving' }),
    ]))
    // NOTE: the "LIVE" badge dot carries a permanent animate-pulse of its own, so asserting
    // "something on screen pulses" would be vacuous. The claim is specifically about the root.
    expect(cls(root)).toMatch(/\bmin-h-screen\b/)
    expect(cls(root)).toMatch(/\banimate-pulse\b/)
  })
})

// ── sub-claim 5: ไทยเด่น, อังกฤษรอง ───────────────────────────────────────────────────────────
//
// The rule, as the codebase already implements it for the booth name and the callout: the two
// halves of a bilingual label must NOT be one flat text run at one size. The English half lives
// in its own element nested inside the Thai one, and that element declares de-emphasis —
// font-normal plus either a smaller size or a dimmer colour.
function expectEnglishSubordinate(thai: RegExp, english: RegExp) {
  const thEl = screen.getByText(thai)
  const enEl = screen.getByText(english)
  expect(enEl, 'English must not share one text run with the Thai').not.toBe(thEl)
  expect(thEl).toContainElement(enEl)
  expect(cls(enEl), 'English must drop to normal weight').toMatch(/\bfont-normal\b/)
  expect(
    cls(enEl),
    'English must also shrink or dim (smaller text-*, muted, or an alpha-faded colour)',
  ).toMatch(/\btext-(xs|sm|base)\b|text-phantom-muted|text-phantom-\w+\/\d+/)
}

describe('Thai leads, English is the subordinate line', () => {
  test('the now-serving heading demotes its English half', () => {
    renderBoard()
    expectEnglishSubordinate(/^🔔 กำลังทำ$/, /Now Serving/)
  })

  test('the up-next heading demotes its English half', () => {
    renderBoard()
    // NOTE: display.next.th is 'ถัดไป' and display.upNext.th is 'คิวถัดไป' — one is a suffix of
    // the other, so this MUST be anchored or it matches the callout heading too.
    expectEnglishSubordinate(/^คิวถัดไป$/, /Up Next/)
  })

  test('the empty-board placeholder demotes its English half', () => {
    renderBoard([])
    expectEnglishSubordinate(/^ยังไม่มีคิว$/, /No orders yet/)
  })

  test('the booth name and the get-ready callout already follow the rule', () => {
    renderBoard()
    expectEnglishSubordinate(/^น้ำปั่น$/, /Blended drinks/)
    expectEnglishSubordinate(/^👉 ถัดไป · เตรียมตัว$/, /Next · Get ready/)
  })

  test('no bilingual label anywhere on the screen is left as one flat text run', () => {
    const root = renderBoard()
    const THAI = /[฀-๿]/
    const LATIN_WORD = /[A-Za-z]{2,}/
    const flat = Array.from(root.querySelectorAll('*')).filter((el) => {
      // an element's OWN text = its direct text-node children only
      const own = Array.from(el.childNodes)
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent ?? '')
        .join('')
      return THAI.test(own) && LATIN_WORD.test(own)
    })
    expect(flat.map((el) => el.textContent)).toEqual([])
  })
})
