// Criterion (2026-08-04-queue-pro-upgrade-design.md:49-54, 85):
//   "Display: จัดกึ่งกลางทุกจอ (responsive), 'เตรียมตัว' callout เด่น, skipped ไม่โชว์"
//
// Three separate claims, proven separately below.
//
// LIMIT OF THIS FILE — read before trusting it: jsdom parses class attributes but never
// runs the cascade and never lays anything out. Nothing here measures a pixel. The
// centering claim is therefore proven STRUCTURALLY: every flex box on the path from the
// queue number up to the root centres its children on the inline axis, and the root fills
// the viewport and centres on the block axis too. That is the strongest form the claim can
// take without a real browser. Actual centring on a real iPad/TV is NOT proven here.
import { vi, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { act } from 'react'
import type { Order, OrderItem } from '../domain/types'

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

const item = (over: Partial<OrderItem>): OrderItem => ({
  sku: 'tea', name: 'ชาไทย', qty: 1, unitPrice: 30, subtotal: 30, ...over,
})

function mount(orders: Order[]) {
  const { container } = render(<DisplayScreen booth="drinks" />)
  act(() => emit(orders))
  const root = container.firstElementChild as HTMLElement
  return { root }
}

/** Every element from `el` up to and including `root`. */
function chainTo(el: Element, root: Element): HTMLElement[] {
  const chain: HTMLElement[] = []
  let cur: HTMLElement | null = el as HTMLElement
  while (cur) {
    chain.push(cur)
    if (cur === root) break
    cur = cur.parentElement
  }
  return chain
}

/**
 * A flex container centres its children on the INLINE (horizontal) axis with `items-center`
 * when it stacks vertically (`flex-col`), and with `justify-center` when it stacks
 * horizontally. Getting this backwards is exactly how a "centred" layout silently drifts
 * left, so the test encodes the rule rather than looking for either class.
 */
function centresInline(el: HTMLElement): boolean {
  const c = el.classList
  return c.contains('flex-col') ? c.contains('items-center') : c.contains('justify-center')
}

function offCentreAncestorsOf(testid: string, root: HTMLElement): string[] {
  return chainTo(screen.getByTestId(testid), root)
    .filter((e) => e.classList.contains('flex'))
    .filter((e) => !centresInline(e))
    .map((e) => `<${e.tagName.toLowerCase()} class="${e.className}">`)
}

// ---------------------------------------------------------------------------
// Claim 1 — จัดกึ่งกลางทุกจอ (responsive)
// ---------------------------------------------------------------------------

test('the root fills the viewport and centres its column on both axes', () => {
  const { root } = mount([o({ id: 's', queueNumber: 'A1', status: 'serving' })])
  const missing = ['min-h-screen', 'flex', 'flex-col', 'items-center', 'justify-center', 'text-center']
    .filter((c) => !root.classList.contains(c))
  expect(missing).toEqual([])
})

test('every flex box between the serving number and the root centres on the inline axis', () => {
  const { root } = mount([
    o({ id: 's', queueNumber: 'A1', status: 'serving', items: [item({})] }),
  ])
  expect(offCentreAncestorsOf('serving', root)).toEqual([])
})

test('every flex box between the get-ready number and the root centres on the inline axis', () => {
  const { root } = mount([
    o({ id: 's', queueNumber: 'A1', status: 'serving' }),
    o({ id: 'w', queueNumber: 'A2', status: 'waiting', createdAt: 2 }),
  ])
  expect(offCentreAncestorsOf('next-up', root)).toEqual([])
})

test('every flex box between a remaining up-next pill and the root centres on the inline axis', () => {
  const { root } = mount([
    o({ id: 'w1', queueNumber: 'A1', status: 'waiting', createdAt: 1 }),
    o({ id: 'w2', queueNumber: 'A2', status: 'waiting', createdAt: 2 }),
  ])
  expect(offCentreAncestorsOf('upnext', root)).toEqual([])
})

test('the no-queue placeholder sits inside the same centred column, not off on its own', () => {
  const { root } = mount([])
  const placeholder = screen.getByText(/ยังไม่มีคิว/)
  expect(root.contains(placeholder)).toBe(true)
  expect(
    chainTo(placeholder, root).filter((e) => e.classList.contains('flex')).filter((e) => !centresInline(e)),
  ).toEqual([])
})

test('several orders served at once wrap into a centred row instead of overflowing sideways', () => {
  const { root } = mount([
    o({ id: 's1', queueNumber: 'A1', status: 'serving' }),
    o({ id: 's2', queueNumber: 'A2', status: 'serving' }),
    o({ id: 's3', queueNumber: 'A3', status: 'serving' }),
  ])
  const cards = screen.getAllByTestId('serving')
  expect(cards).toHaveLength(3)
  // all three share one row container, and that container wraps + centres
  const rows = new Set(cards.map((c) => c.parentElement!.parentElement!))
  expect(rows.size).toBe(1)
  const row = [...rows][0]
  expect(root.contains(row)).toBe(true)
  expect(row.classList.contains('flex-wrap')).toBe(true)
  expect(row.classList.contains('justify-center')).toBe(true)
})

test('the display re-spaces itself at the md breakpoint rather than pinning one fixed size', () => {
  const { root } = mount([o({ id: 's', queueNumber: 'A1', status: 'serving' })])
  const responsive = [...root.classList].filter((c) => c.startsWith('md:'))
  // padding and gap both have a wider variant, so the same markup suits a phone and a TV
  expect(responsive).toEqual(expect.arrayContaining(['md:p-12', 'md:gap-14']))
})

test('a long item detail is bounded to the viewport and wraps, so it cannot force sideways scroll', () => {
  mount([
    o({
      id: 's', queueNumber: 'A1', status: 'serving',
      items: [item({ name: 'ชาไทยเย็นหวานน้อยพิเศษใส่ไข่มุกเพิ่มสองช้อน', qty: 2, options: [{ label: 'หวานน้อย', priceDelta: 0 }] })],
    }),
  ])
  const detail = screen.getByText(/ชาไทยเย็นหวานน้อยพิเศษ/)
  expect(detail.classList.contains('max-w-[90vw]')).toBe(true)
  expect(detail.classList.contains('break-words')).toBe(true)
})

// ---------------------------------------------------------------------------
// Claim 2 — "เตรียมตัว" callout เด่น
// ---------------------------------------------------------------------------

test('the next waiting number gets a bordered yellow callout carrying 👉 and both languages', () => {
  const { root } = mount([
    o({ id: 's', queueNumber: 'A1', status: 'serving' }),
    o({ id: 'w1', queueNumber: 'B1', status: 'waiting', createdAt: 1 }),
    o({ id: 'w2', queueNumber: 'A2', status: 'waiting', createdAt: 2 }),
  ])
  // the callout spotlights the EARLIEST waiting order, not just any waiting one
  expect(screen.getByTestId('next-up')).toHaveTextContent('B1')

  const callout = screen.getByTestId('next-up').closest('section')!
  expect(root.contains(callout)).toBe(true)
  const missing = ['border-2', 'border-phantom-yellow/50', 'bg-phantom-yellow/10']
    .filter((c) => !callout.classList.contains(c))
  expect(missing).toEqual([])
  // the glow that makes it read as the loud element on the screen
  expect([...callout.classList].some((c) => c.startsWith('shadow-['))).toBe(true)

  expect(callout).toHaveTextContent('👉')
  expect(callout).toHaveTextContent('เตรียมตัว')
  expect(callout).toHaveTextContent('Get ready')
})

test('the get-ready number scales with the screen and out-sizes the remaining pills', () => {
  mount([
    o({ id: 'w1', queueNumber: 'B1', status: 'waiting', createdAt: 1 }),
    o({ id: 'w2', queueNumber: 'A2', status: 'waiting', createdAt: 2 }),
  ])
  const next = screen.getByTestId('next-up')
  const clamp = [...next.classList]
    .map((c) => /^text-\[clamp\((\d+)px,(\d+)vw,(\d+)px\)\]$/.exec(c))
    .find(Boolean)
  expect(clamp, `next-up must size itself with a viewport clamp, got: ${next.className}`).toBeTruthy()
  const [, min, vw, max] = clamp!.map(Number)

  // Tailwind's largest step used by the remaining pills is text-2xl = 1.5rem = 24px.
  // The callout's FLOOR must beat the pills' CEILING, so the hierarchy holds on every screen.
  const PILL_MAX_PX = 24
  expect(min).toBeGreaterThan(PILL_MAX_PX)
  expect(max).toBeGreaterThan(min)
  expect(vw).toBeGreaterThan(0)

  const pill = screen.getByTestId('upnext')
  expect([...pill.classList].some((c) => c.includes('vw'))).toBe(false)
  expect(pill.classList.contains('text-xl')).toBe(true)
})

test('the callout is absent — not empty — when nobody is waiting', () => {
  mount([o({ id: 's', queueNumber: 'A1', status: 'serving' })])
  expect(screen.queryByTestId('next-up')).toBeNull()
  expect(screen.queryByText(/เตรียมตัว/)).toBeNull()
})

test('the spotlighted number is not repeated among the remaining pills', () => {
  mount([
    o({ id: 'w1', queueNumber: 'B1', status: 'waiting', createdAt: 1 }),
    o({ id: 'w2', queueNumber: 'A2', status: 'waiting', createdAt: 2 }),
    o({ id: 'w3', queueNumber: 'A3', status: 'waiting', createdAt: 3 }),
  ])
  expect(screen.getByTestId('next-up')).toHaveTextContent('B1')
  expect(screen.getAllByTestId('upnext').map((e) => e.textContent)).toEqual(['A2', 'A3'])
})

// ---------------------------------------------------------------------------
// Claim 3 — skipped ไม่โชว์บนจอลูกค้า
// ---------------------------------------------------------------------------

test('a skipped order appears nowhere on the customer display', () => {
  const { root } = mount([
    o({ id: 's', queueNumber: 'A1', status: 'serving' }),
    o({ id: 'k', queueNumber: 'A2', status: 'skipped', createdAt: 2 }),
    o({ id: 'w', queueNumber: 'A3', status: 'waiting', createdAt: 3 }),
  ])
  expect(screen.getAllByTestId('serving').map((e) => e.textContent)).toEqual(['A1'])
  expect(screen.getByTestId('next-up')).toHaveTextContent('A3')
  expect(screen.queryAllByTestId('upnext')).toEqual([])
  // the strong form: A2 is not in the DOM at all, not merely absent from the known slots
  expect(root.textContent).not.toContain('A2')
})

test('a display whose only order is skipped falls back to the no-queue placeholder', () => {
  const { root } = mount([o({ id: 'k', queueNumber: 'A9', status: 'skipped' })])
  expect(screen.getByText(/ยังไม่มีคิว/)).toBeInTheDocument()
  expect(screen.queryAllByTestId('serving')).toEqual([])
  expect(screen.queryByTestId('next-up')).toBeNull()
  expect(root.textContent).not.toContain('A9')
})

test('done and cancelled orders are just as invisible as skipped ones', () => {
  const { root } = mount([
    o({ id: 's', queueNumber: 'A1', status: 'serving' }),
    o({ id: 'd', queueNumber: 'A2', status: 'done', createdAt: 2 }),
    o({ id: 'c', queueNumber: 'A3', status: 'cancelled', createdAt: 3 }),
    o({ id: 'k', queueNumber: 'A4', status: 'skipped', createdAt: 4 }),
  ])
  expect(screen.getAllByTestId('serving').map((e) => e.textContent)).toEqual(['A1'])
  for (const gone of ['A2', 'A3', 'A4']) expect(root.textContent).not.toContain(gone)
})

test('recalling a skipped order brings it back onto the display', () => {
  const { root } = mount([o({ id: 'k', queueNumber: 'A9', status: 'skipped' })])
  expect(root.textContent).not.toContain('A9')
  act(() => emit([o({ id: 'k', queueNumber: 'A9', status: 'serving' })]))
  expect(screen.getAllByTestId('serving').map((e) => e.textContent)).toEqual(['A9'])
})
