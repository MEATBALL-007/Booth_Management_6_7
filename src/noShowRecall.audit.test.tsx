/**
 * Acceptance criterion — queue-pro-upgrade `:22` (No-show):
 *
 *   "ข้าม serving → skipped (หายจากจอลูกค้า, ขึ้นโซนพักไว้);
 *    เรียกซ้ำ → serving + Display ประกาศ (chime+flash)"
 *
 * Four halves, proved in four sections:
 *   A. ข้าม on a serving card writes exactly a `skipped` patch (and nothing else)
 *   B. a skipped order is nowhere on the customer screen — not just absent from
 *      the testids we happen to know about
 *   C. it turns up in the พักไว้ (parked) zone of the QueuePanel instead
 *   D. เรียกซ้ำ puts it back into serving AND the Display announces (chime + flash)
 *
 * ── SCOPE OF THE EVIDENCE (read before trusting any of it) ───────────────────
 * `ordersRepo` and `display/chime` are mocked whole. Nothing here ever touches
 * Firestore and no sound is ever produced: "chime" is proved as *`playChime` was
 * called*, not as audio. jsdom runs no CSS cascade and performs no layout, so
 * "flash" is proved as *the root element declares `animate-pulse`*, not as pixels
 * that changed. "หายจากจอลูกค้า" is proved by sweeping `document.body.textContent`
 * for the number, which is a real DOM fact — but still a DOM fact, not a photo of
 * a screen in a school hall.
 *
 * ── ONE THING THAT LOOKS PROVED AND IS NOT ───────────────────────────────────
 * The Display announces on recall because the number RE-ENTERS serving
 * (`newlyAnnounced` in `display/queueView.ts` treats a number missing from the
 * previous snapshot as fresh), NOT because `recall()` bumps `announcedAt`.
 * Deleting `announcedAt` from `recall()` would leave section D's Display tests
 * green. That is why D1 pins the patch shape at the panel as well — the two
 * levels catch different breakages and neither alone covers this criterion.
 */
import { vi, test, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { act } from 'react'
import userEvent from '@testing-library/user-event'
import type { Order } from './domain/types'

const { updateOrderStatus, playChimeSpy, subs } = vi.hoisted(() => ({
  updateOrderStatus: vi.fn(),
  playChimeSpy: vi.fn(),
  // A live-subscriber registry rather than a single `emit` slot: this file drives
  // two different screens, and a screen that has unmounted must stop receiving
  // snapshots or "it disappeared" could never be told from "it never arrived".
  subs: [] as { cb: (o: Order[]) => void; alive: boolean }[],
}))

vi.mock('./display/chime', () => ({ playChime: playChimeSpy }))
vi.mock('./order/ordersRepo', () => ({
  subscribeBoothOrders: (_booth: string, cb: (o: Order[]) => void) => {
    const s = { cb, alive: true }
    subs.push(s)
    return () => { s.alive = false }
  },
  subscribeAllOrders: vi.fn(() => () => {}),
  updateOrderStatus,
  createOrder: vi.fn(),
}))

import { QueuePanel } from './screens/QueuePanel'
import { DisplayScreen } from './screens/DisplayScreen'
import { skip, recall } from './queue/queueActions'

const o = (over: Partial<Order>): Order => ({
  id: 'x', boothId: 'drinks', queueNumber: 'A1', station: 'A', items: [], total: 30,
  paymentMethod: 'cash', paymentStatus: 'paid', status: 'waiting', createdAt: 1, ...over,
})

function emit(orders: Order[]) {
  act(() => { subs.filter((s) => s.alive).forEach((s) => s.cb(orders)) })
}

/** The Display's flash lives on the root element. See D4 for why that matters. */
const displayRoot = (container: HTMLElement) => container.firstElementChild as HTMLElement

beforeEach(() => {
  subs.length = 0
  updateOrderStatus.mockClear()
  playChimeSpy.mockClear()
})
afterEach(() => { vi.restoreAllMocks() })

// ─────────────────────────────────────────────────────────────────────────────
// A. ข้าม serving → skipped
// ─────────────────────────────────────────────────────────────────────────────

test('A1: ข้าม on a serving card writes exactly one skipped patch, with no other field', async () => {
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  emit([o({ id: 'o1', queueNumber: 'A1', status: 'serving', servingAt: 50, announcedAt: 50 })])

  await user.click(screen.getByRole('button', { name: /^ข้าม$/ }))

  // toStrictEqual on the whole call list, not objectContaining: a stray doneAt or
  // a second write would both slip past a looser matcher, and both are bugs here.
  expect(updateOrderStatus.mock.calls).toStrictEqual([['o1', { status: 'skipped' }]])
})

test('A2: ข้าม is reachable only from a serving card — a waiting card does not offer it', () => {
  render(<QueuePanel booth="drinks" station="A" />)
  emit([
    o({ id: 'w1', queueNumber: 'A1', status: 'waiting', createdAt: 1 }),
    o({ id: 'w2', queueNumber: 'A2', status: 'waiting', createdAt: 2 }),
  ])
  expect(screen.queryByRole('button', { name: /^ข้าม$/ })).toBeNull()

  // spine: the same panel does render the button once something is serving, so
  // the assertion above is about placement, not about a button that never exists.
  emit([o({ id: 's1', queueNumber: 'A3', status: 'serving' })])
  expect(screen.getAllByRole('button', { name: /^ข้าม$/ })).toHaveLength(1)
})

test('A3: the guards make a double-tap a no-op — ข้าม only from serving, เรียกซ้ำ only from skipped', () => {
  expect(skip(o({ status: 'serving' }))).toStrictEqual({ status: 'skipped' })
  expect(skip(o({ status: 'skipped' }))).toBeNull()
  expect(skip(o({ status: 'waiting' }))).toBeNull()

  expect(recall(o({ status: 'skipped' }), 100)).toStrictEqual({ status: 'serving', servingAt: 100, announcedAt: 100 })
  expect(recall(o({ status: 'serving' }), 100)).toBeNull()
  expect(recall(o({ status: 'waiting' }), 100)).toBeNull()
})

// ─────────────────────────────────────────────────────────────────────────────
// B. หายจากจอลูกค้า
// ─────────────────────────────────────────────────────────────────────────────

test('B1: a skipped number appears nowhere in the customer screen, while the others still do', () => {
  render(<DisplayScreen booth="drinks" />)
  emit([
    o({ id: 's1', queueNumber: 'A1', status: 'serving' }),
    o({ id: 'k1', queueNumber: 'A2', status: 'skipped', servingAt: 10, announcedAt: 10 }),
    o({ id: 'w1', queueNumber: 'A3', status: 'waiting', createdAt: 5 }),
  ])

  // Sweep the whole rendered document, not the testids we know about: a skipped
  // number leaking into some new zone would still be a customer-visible bug.
  const all = document.body.textContent ?? ''
  expect(all).not.toContain('A2')
  // spine — the sweep can still see numbers, so the line above means something
  expect(all).toContain('A1')
  expect(all).toContain('A3')
})

test('B2: a booth whose only order is skipped shows the no-queue placeholder, not a stray number', () => {
  render(<DisplayScreen booth="drinks" />)
  emit([o({ id: 'k1', queueNumber: 'A2', status: 'skipped' })])

  expect(screen.getByText(/ยังไม่มีคิว/)).toBeInTheDocument()
  expect(screen.queryAllByTestId('serving')).toHaveLength(0)
  expect(screen.queryByTestId('next-up')).toBeNull()
  expect(screen.queryAllByTestId('upnext')).toHaveLength(0)
  expect(document.body.textContent ?? '').not.toContain('A2')
})

test('B3: the oldest order being skipped does not make it the "เตรียมตัว" next-up', () => {
  render(<DisplayScreen booth="drinks" />)
  emit([
    o({ id: 'k1', queueNumber: 'A2', status: 'skipped', createdAt: 1 }), // oldest
    o({ id: 'w1', queueNumber: 'A3', status: 'waiting', createdAt: 9 }),
  ])
  // Sorting by createdAt would put the skipped one first if the status filter slipped.
  expect(screen.getByTestId('next-up')).toHaveTextContent('A3')
  expect(document.body.textContent ?? '').not.toContain('A2')
})

test('B4: recall puts the number back on the customer screen (the filter is a filter, not a blacklist)', () => {
  render(<DisplayScreen booth="drinks" />)
  emit([o({ id: 'k1', queueNumber: 'A2', status: 'skipped' })])
  expect(document.body.textContent ?? '').not.toContain('A2')

  emit([o({ id: 'k1', queueNumber: 'A2', status: 'serving', servingAt: 200, announcedAt: 200 })])
  expect(screen.getAllByTestId('serving').map((e) => e.textContent)).toStrictEqual(['A2'])
})

// ─────────────────────────────────────────────────────────────────────────────
// C. ขึ้นโซนพักไว้
// ─────────────────────────────────────────────────────────────────────────────

test('C1: with nothing parked there is no พักไว้ zone at all', () => {
  render(<QueuePanel booth="drinks" station="A" />)
  emit([
    o({ id: 's1', queueNumber: 'A1', status: 'serving' }),
    o({ id: 'w1', queueNumber: 'A2', status: 'waiting' }),
  ])
  expect(screen.queryByText(/พักไว้/)).toBeNull()
  expect(screen.queryByRole('button', { name: /^เรียกซ้ำ$/ })).toBeNull()
})

test('C2: a skipped order shows up inside the พักไว้ zone, with its number and a เรียกซ้ำ button', () => {
  render(<QueuePanel booth="drinks" station="A" />)
  emit([
    o({ id: 's1', queueNumber: 'A1', status: 'serving' }),
    o({ id: 'k1', queueNumber: 'A2', status: 'skipped' }),
  ])

  const label = screen.getByText(/พักไว้/)
  expect(label).toHaveTextContent('(1)')
  // Scope to the zone: a เรียกซ้ำ button floating somewhere else on the panel
  // would satisfy "a recall button exists" while failing "ขึ้นโซนพักไว้".
  const zone = label.parentElement as HTMLElement
  expect(within(zone).getByText('A2')).toBeInTheDocument()
  expect(within(zone).getByRole('button', { name: /^เรียกซ้ำ$/ })).toBeInTheDocument()
})

test('C3: a parked card carries none of the serving-card actions', () => {
  render(<QueuePanel booth="drinks" station="A" />)
  emit([
    o({ id: 's1', queueNumber: 'A1', status: 'serving' }),
    o({ id: 'k1', queueNumber: 'A2', status: 'skipped' }),
  ])
  const zone = screen.getByText(/พักไว้/).parentElement as HTMLElement

  expect(within(zone).queryByRole('button', { name: /^เสร็จ$/ })).toBeNull()
  expect(within(zone).queryByRole('button', { name: /^ข้าม$/ })).toBeNull()
  expect(within(zone).queryByRole('button', { name: /ประกาศซ้ำ/ })).toBeNull()

  // spine: those three buttons do exist on this panel — on the serving card.
  expect(screen.getByRole('button', { name: /^เสร็จ$/ })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /^ข้าม$/ })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /ประกาศซ้ำ/ })).toBeInTheDocument()
})

// ─────────────────────────────────────────────────────────────────────────────
// D. เรียกซ้ำ → serving + Display ประกาศ (chime + flash)
// ─────────────────────────────────────────────────────────────────────────────

test('D1: เรียกซ้ำ writes exactly serving + servingAt + announcedAt', async () => {
  vi.spyOn(Date, 'now').mockReturnValue(777)
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  emit([o({ id: 'k1', queueNumber: 'A2', status: 'skipped', servingAt: 10, announcedAt: 10 })])

  await user.click(screen.getByRole('button', { name: /^เรียกซ้ำ$/ }))

  // announcedAt is pinned HERE because the Display cannot notice its absence:
  // a number re-entering serving already counts as fresh (see the header note).
  expect(updateOrderStatus.mock.calls).toStrictEqual([
    ['k1', { status: 'serving', servingAt: 777, announcedAt: 777 }],
  ])
})

test('D2: across the skip → recall boundary the Display chimes once and the root flashes', () => {
  const { container } = render(<DisplayScreen booth="drinks" />)

  // baseline snapshot — an already-serving order must not announce on arrival
  emit([o({ id: 'k1', queueNumber: 'A2', status: 'serving', servingAt: 100, announcedAt: 100 })])
  expect(playChimeSpy).not.toHaveBeenCalled()

  // ข้าม
  emit([o({ id: 'k1', queueNumber: 'A2', status: 'skipped', servingAt: 100, announcedAt: 100 })])

  // เรียกซ้ำ
  emit([o({ id: 'k1', queueNumber: 'A2', status: 'serving', servingAt: 200, announcedAt: 200 })])

  expect(playChimeSpy).toHaveBeenCalledTimes(1)
  expect(displayRoot(container).className).toContain('animate-pulse')
  expect(displayRoot(container).className).toContain('bg-phantom-orange/30')
  expect(screen.getAllByTestId('serving').map((e) => e.textContent)).toStrictEqual(['A2'])
})

test('D3: ข้าม itself never announces — the customer screen stays quiet when a number is parked', () => {
  const { container } = render(<DisplayScreen booth="drinks" />)
  emit([
    o({ id: 's1', queueNumber: 'A1', status: 'serving', servingAt: 100, announcedAt: 100 }),
    o({ id: 'k1', queueNumber: 'A2', status: 'serving', servingAt: 100, announcedAt: 100 }),
  ])
  playChimeSpy.mockClear()

  // This snapshot is a real chance to misfire: the effect re-runs because the
  // serving key changed. Asserting "nothing happened" without emitting would be
  // green for free.
  emit([
    o({ id: 's1', queueNumber: 'A1', status: 'serving', servingAt: 100, announcedAt: 100 }),
    o({ id: 'k1', queueNumber: 'A2', status: 'skipped', servingAt: 100, announcedAt: 100 }),
  ])
  expect(playChimeSpy).not.toHaveBeenCalled()
  expect(displayRoot(container).className).not.toContain('animate-pulse')

  // spine: the very same harness does chime when a genuinely new number starts
  // serving, so the silence above is the code's doing, not the harness's.
  emit([
    o({ id: 's1', queueNumber: 'A1', status: 'serving', servingAt: 100, announcedAt: 100 }),
    o({ id: 'k1', queueNumber: 'A2', status: 'skipped', servingAt: 100, announcedAt: 100 }),
    o({ id: 'n1', queueNumber: 'A9', status: 'serving', servingAt: 300, announcedAt: 300 }),
  ])
  expect(playChimeSpy).toHaveBeenCalledTimes(1)
})

test('D4: the flash is read off the root — the always-pulsing LIVE dot must not be mistaken for it', () => {
  const { container } = render(<DisplayScreen booth="drinks" />)
  emit([o({ id: 's1', queueNumber: 'A1', status: 'serving', servingAt: 100, announcedAt: 100 })])

  // Not flashing: the root says so...
  expect(displayRoot(container).className).not.toContain('animate-pulse')
  expect(displayRoot(container).className).toContain('bg-phantom-bg')
  // ...even though something in the tree is pulsing anyway (the LIVE indicator).
  // A "does anything pulse?" test would be green here and green while flashing —
  // i.e. green always.
  expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
})
