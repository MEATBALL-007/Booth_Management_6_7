import { vi, test, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { act } from 'react'
import type { Order } from '../domain/types'

const { playChimeSpy } = vi.hoisted(() => ({ playChimeSpy: vi.fn() }))
vi.mock('../display/chime', () => ({ playChime: playChimeSpy }))

beforeEach(() => { playChimeSpy.mockClear() })

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

test('renders serving numbers big and up-next sorted by createdAt', () => {
  render(<DisplayScreen booth="drinks" />)
  act(() => emit([
    o({ id: 's1', queueNumber: 'A1', status: 'serving' }),
    o({ id: 'w1', queueNumber: 'A2', status: 'waiting', createdAt: 2 }),
    o({ id: 'w2', queueNumber: 'B1', status: 'waiting', createdAt: 1 }),
  ]))
  expect(screen.getAllByTestId('serving').map((e) => e.textContent)).toEqual(['A1'])
  // NOTE: the earliest waiting (B1) is now spotlighted separately as `next-up` (Task 5);
  // only the remaining up-next ones (A2) still carry the `upnext` testid.
  expect(screen.getAllByTestId('upnext').map((e) => e.textContent)).toEqual(['A2'])
  expect(screen.getByTestId('next-up')).toHaveTextContent('B1')
})

test('spotlights the first up-next number as the "get ready" next', () => {
  render(<DisplayScreen booth="drinks" />)
  act(() => emit([
    o({ id: 's', queueNumber: 'A1', status: 'serving' }),
    o({ id: 'w1', queueNumber: 'A2', status: 'waiting', createdAt: 2 }),
    o({ id: 'w2', queueNumber: 'B1', status: 'waiting', createdAt: 1 }),
  ]))
  // the very next (earliest waiting) is B1, shown in the get-ready spotlight
  expect(screen.getByTestId('next-up')).toHaveTextContent('B1')
  expect(screen.getByText(/เตรียมตัว/)).toBeInTheDocument()
})

test('does not chime for the first snapshot, but chimes when a new order starts serving after', () => {
  render(<DisplayScreen booth="drinks" />)
  act(() => emit([o({ id: 's1', queueNumber: 'A1', status: 'serving' })])) // first snapshot = baseline
  expect(playChimeSpy).not.toHaveBeenCalled()
  act(() => emit([
    o({ id: 's1', queueNumber: 'A1', status: 'serving' }),
    o({ id: 's2', queueNumber: 'A2', status: 'serving' }),
  ])) // A2 newly serving
  expect(playChimeSpy).toHaveBeenCalledTimes(1)
})

test('shows the no-queue placeholder when nothing is serving', () => {
  render(<DisplayScreen booth="drinks" />)
  expect(screen.getByText(/ยังไม่มีคิว/)).toBeInTheDocument()
})

// --- No-show (skip / recall) acceptance ---------------------------------
// spec: 2026-08-04-queue-pro-upgrade-design.md
//   "ข้าม serving → skipped (หายจากจอลูกค้า...); เรียกซ้ำ → serving + Display ประกาศ (chime+flash)"
// The queueActions half (skip/recall) is covered in queueActions.test.ts; these
// pin down the Display half, which was never asserted anywhere.

const flashing = () => screen.getByTestId('display-root').className.includes('animate-pulse')

test('a skipped order vanishes from the customer display entirely', () => {
  render(<DisplayScreen booth="drinks" />)
  act(() => emit([
    o({ id: 's1', queueNumber: 'A1', status: 'serving' }),
    o({ id: 'w1', queueNumber: 'A2', status: 'waiting', createdAt: 2 }),
    o({ id: 'k1', queueNumber: 'A3', status: 'skipped', createdAt: 1 }),
  ]))
  // not serving, not the get-ready spotlight, not in the up-next strip...
  expect(screen.getAllByTestId('serving').map((e) => e.textContent)).toEqual(['A1'])
  expect(screen.getByTestId('next-up')).toHaveTextContent('A2')
  expect(screen.queryAllByTestId('upnext')).toEqual([])
  // ...and nowhere else on the screen either
  expect(screen.queryByText('A3')).not.toBeInTheDocument()
})

test('a skipped order does not steal the get-ready spotlight from a later waiting one', () => {
  render(<DisplayScreen booth="drinks" />)
  act(() => emit([
    o({ id: 'k1', queueNumber: 'A3', status: 'skipped', createdAt: 1 }), // older than the waiting one
    o({ id: 'w1', queueNumber: 'A4', status: 'waiting', createdAt: 2 }),
  ]))
  expect(screen.getByTestId('next-up')).toHaveTextContent('A4')
})

test('recalling a skipped order announces it again: back on screen, chime + flash', () => {
  render(<DisplayScreen booth="drinks" />)
  act(() => emit([
    o({ id: 's1', queueNumber: 'A1', status: 'serving', announcedAt: 100 }),
    o({ id: 'k1', queueNumber: 'A3', status: 'skipped', createdAt: 1 }),
  ])) // first snapshot = baseline, no chime
  expect(playChimeSpy).not.toHaveBeenCalled()
  expect(flashing()).toBe(false)

  // recall(A3, 200) => { status: 'serving', servingAt: 200, announcedAt: 200 }
  act(() => emit([
    o({ id: 's1', queueNumber: 'A1', status: 'serving', announcedAt: 100 }),
    o({ id: 'k1', queueNumber: 'A3', status: 'serving', createdAt: 1, servingAt: 200, announcedAt: 200 }),
  ]))
  expect(screen.getAllByTestId('serving').map((e) => e.textContent)).toEqual(['A1', 'A3'])
  expect(playChimeSpy).toHaveBeenCalledTimes(1) // chime only for A3, not for the unchanged A1
  expect(flashing()).toBe(true)
})

test('the recall flash stops on its own so the screen is not left pulsing', () => {
  vi.useFakeTimers()
  try {
    render(<DisplayScreen booth="drinks" />)
    act(() => emit([o({ id: 'k1', queueNumber: 'A3', status: 'skipped', createdAt: 1 })]))
    act(() => emit([
      o({ id: 'k1', queueNumber: 'A3', status: 'serving', createdAt: 1, servingAt: 200, announcedAt: 200 }),
    ]))
    expect(flashing()).toBe(true)
    act(() => { vi.advanceTimersByTime(2500) })
    expect(flashing()).toBe(false)
  } finally {
    vi.useRealTimers()
  }
})
