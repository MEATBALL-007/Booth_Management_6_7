// No-show criterion (2026-08-04-queue-pro-upgrade-design.md), Display half:
//   "ข้าม serving -> skipped (หายจากจอลูกค้า ...); เรียกซ้ำ -> serving + Display ประกาศ (chime+flash)"
//
// Kept in its own file so it does not collide with DisplayScreen.test.tsx on other branches.
// The clauses proven here are the two the existing suite never touched: a `skipped` order is
// invisible on the customer display, and a recall actually drives the chime AND the flash.
import { vi, test, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { act } from 'react'
import type { Order } from '../domain/types'

const { playChimeSpy } = vi.hoisted(() => ({ playChimeSpy: vi.fn() }))
vi.mock('../display/chime', () => ({ playChime: playChimeSpy }))

let emit: (orders: Order[]) => void = () => {}
vi.mock('../order/ordersRepo', () => ({
  subscribeBoothOrders: (_booth: string, cb: (o: Order[]) => void) => { emit = cb; return () => {} },
  createOrder: vi.fn(),
  updateOrderStatus: vi.fn(),
}))

import { DisplayScreen } from './DisplayScreen'

beforeEach(() => { playChimeSpy.mockClear() })

const o = (over: Partial<Order>): Order => ({
  id: 'x', boothId: 'drinks', queueNumber: 'A1', station: 'A', items: [], total: 30,
  paymentMethod: 'cash', paymentStatus: 'paid', status: 'waiting', createdAt: 1, ...over,
})

// the flash is the root container's alert background; see DisplayScreen's `flashing` branch
const isFlashing = (container: HTMLElement) =>
  (container.firstChild as HTMLElement).className.includes('animate-pulse')

// --- clause: skipped หายจากจอลูกค้า ---------------------------------------

test('a skipped order is shown nowhere on the customer display', () => {
  render(<DisplayScreen booth="drinks" />)
  act(() => emit([
    o({ id: 'k', queueNumber: 'A1', status: 'skipped' }),
    o({ id: 'w', queueNumber: 'A2', status: 'waiting', createdAt: 2 }),
  ]))
  // not serving, and not in either up-next zone
  expect(screen.queryAllByTestId('serving')).toHaveLength(0)
  expect(screen.queryByText('A1')).not.toBeInTheDocument()
  // the waiting one is unaffected
  expect(screen.getByTestId('next-up')).toHaveTextContent('A2')
})

test('skipping the only serving order clears the display back to the no-queue placeholder', () => {
  render(<DisplayScreen booth="drinks" />)
  act(() => emit([o({ id: 'k', queueNumber: 'A1', status: 'serving', announcedAt: 100 })]))
  expect(screen.getAllByTestId('serving').map((e) => e.textContent)).toEqual(['A1'])

  act(() => emit([o({ id: 'k', queueNumber: 'A1', status: 'skipped', announcedAt: 100 })]))
  expect(screen.queryAllByTestId('serving')).toHaveLength(0)
  expect(screen.getByText(/ยังไม่มีคิว/)).toBeInTheDocument()
})

test('going skipped is silent — no chime for an order leaving the serving zone', () => {
  render(<DisplayScreen booth="drinks" />)
  act(() => emit([o({ id: 'k', queueNumber: 'A1', status: 'serving', announcedAt: 100 })]))
  playChimeSpy.mockClear()
  act(() => emit([o({ id: 'k', queueNumber: 'A1', status: 'skipped', announcedAt: 100 })]))
  expect(playChimeSpy).not.toHaveBeenCalled()
})

// --- clause: เรียกซ้ำ -> serving + Display ประกาศ (chime + flash) -----------

test('recalling a skipped order announces it again: chime AND flash', () => {
  const { container } = render(<DisplayScreen booth="drinks" />)
  // baseline snapshot, then the skip
  act(() => emit([o({ id: 'k', queueNumber: 'A1', status: 'serving', announcedAt: 100 })]))
  act(() => emit([o({ id: 'k', queueNumber: 'A1', status: 'skipped', announcedAt: 100 })]))
  expect(isFlashing(container)).toBe(false)
  playChimeSpy.mockClear()

  // recall: back to serving with a fresh announcedAt (what Q.recall produces)
  act(() => emit([o({ id: 'k', queueNumber: 'A1', status: 'serving', announcedAt: 200 })]))

  expect(playChimeSpy).toHaveBeenCalledTimes(1)
  expect(isFlashing(container)).toBe(true)
  expect(screen.getAllByTestId('serving').map((e) => e.textContent)).toEqual(['A1'])
})

test('recall still announces when skip and recall collapse into one snapshot', () => {
  // Firestore may deliver the skip and the recall coalesced, so the display never observes
  // the intermediate empty serving list. The bumped announcedAt must carry the announcement.
  const { container } = render(<DisplayScreen booth="drinks" />)
  act(() => emit([o({ id: 'k', queueNumber: 'A1', status: 'serving', announcedAt: 100 })]))
  playChimeSpy.mockClear()

  act(() => emit([o({ id: 'k', queueNumber: 'A1', status: 'serving', announcedAt: 200 })]))

  expect(playChimeSpy).toHaveBeenCalledTimes(1)
  expect(isFlashing(container)).toBe(true)
})

test('a recall does not announce the other numbers already serving', () => {
  render(<DisplayScreen booth="drinks" />)
  act(() => emit([
    o({ id: 'a', queueNumber: 'A1', status: 'serving', announcedAt: 100 }),
    o({ id: 'b', queueNumber: 'A2', status: 'skipped', announcedAt: 50 }),
  ]))
  playChimeSpy.mockClear()

  act(() => emit([
    o({ id: 'a', queueNumber: 'A1', status: 'serving', announcedAt: 100 }), // untouched
    o({ id: 'b', queueNumber: 'A2', status: 'serving', announcedAt: 200 }), // recalled
  ]))

  expect(playChimeSpy).toHaveBeenCalledTimes(1)
  expect(screen.getAllByTestId('serving').map((e) => e.textContent)).toEqual(['A1', 'A2'])
})
