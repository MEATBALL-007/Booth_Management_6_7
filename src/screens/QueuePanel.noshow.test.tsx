// Acceptance criterion "No-show" — the staff-panel half.
//   ข้าม serving -> skipped (... ขึ้นโซนพักไว้); เรียกซ้ำ -> serving
// The customer-display half lives in DisplayScreen.noshow.test.tsx.
import { vi, beforeEach, test, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Order } from '../domain/types'

const { updateOrderStatus } = vi.hoisted(() => ({
  updateOrderStatus: vi.fn().mockResolvedValue(undefined),
}))
let emit: (orders: Order[]) => void = () => {}
vi.mock('../order/ordersRepo', () => ({
  subscribeBoothOrders: (_booth: string, cb: (o: Order[]) => void) => { emit = cb; return () => {} },
  updateOrderStatus,
  createOrder: vi.fn(),
}))

import { QueuePanel } from './QueuePanel'
import { act } from 'react'

const order = (over: Partial<Order>): Order => ({
  id: 'x', boothId: 'drinks', queueNumber: 'A1', station: 'A', items: [], total: 30,
  paymentMethod: 'cash', paymentStatus: 'paid', status: 'waiting', createdAt: 1, ...over,
})

beforeEach(() => updateOrderStatus.mockClear())

// The parked zone is the block introduced by the "พักไว้ · Parked (n)" label.
// Anchoring on the label (rather than on the recall button) is what makes these
// assertions about *placement* — a parked card rendered among the serving cards
// would still expose a recall button, but would not be inside this element.
const parkedZone = () => screen.getByText(/พักไว้/).parentElement as HTMLElement

const SKIPPED = 'A7'
const SERVING = 'B2'
const WAITING = 'C3'

const threeOrders = () => [
  order({ id: 'sk', queueNumber: SKIPPED, station: 'A', status: 'skipped' }),
  order({ id: 'sv', queueNumber: SERVING, station: 'A', status: 'serving' }),
  order({ id: 'wt', queueNumber: WAITING, station: 'A', status: 'waiting', createdAt: 2 }),
]

test('a skipped order shows up in the parked zone, and only it', () => {
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit(threeOrders()))

  const zone = parkedZone()
  expect(zone.textContent).toContain(SKIPPED)
  // the still-active numbers are on the panel but must not be inside the parked zone
  expect(zone.textContent).not.toContain(SERVING)
  expect(zone.textContent).not.toContain(WAITING)
  expect(screen.getByText(SERVING)).toBeInTheDocument()
  expect(screen.getByText(WAITING)).toBeInTheDocument()
})

test('the parked zone counts the skipped orders and carries their recall button', () => {
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit(threeOrders()))

  const zone = parkedZone()
  expect(zone.textContent).toContain('(1)')
  expect(within(zone).getByRole('button', { name: /เรียกซ้ำ/ })).toBeInTheDocument()
})

test('no parked zone at all while nothing is skipped', () => {
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([
    order({ id: 'sv', queueNumber: SERVING, station: 'A', status: 'serving' }),
    order({ id: 'wt', queueNumber: WAITING, station: 'A', status: 'waiting', createdAt: 2 }),
  ]))
  expect(screen.queryByText(/พักไว้/)).toBeNull()
  expect(screen.queryByRole('button', { name: /เรียกซ้ำ/ })).toBeNull()
})

test('recall from the parked zone sends serving plus a fresh announcement, and nothing else', async () => {
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit(threeOrders()))

  await user.click(within(parkedZone()).getByRole('button', { name: /เรียกซ้ำ/ }))

  expect(updateOrderStatus).toHaveBeenCalledTimes(1)
  const [id, patch] = updateOrderStatus.mock.calls[0] as [string, Partial<Order>]
  expect(id).toBe('sk')
  // exact key set — objectContaining would not notice a stray extra field
  expect(Object.keys(patch).sort()).toEqual(['announcedAt', 'servingAt', 'status'])
  expect(patch.status).toBe('serving')
  // the announcement timestamp is what makes the Display chime + flash again
  expect(patch.announcedAt).toBe(patch.servingAt)
  expect(typeof patch.announcedAt).toBe('number')
})

test('a parked order offers recall only — it is not treated as still serving', () => {
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([order({ id: 'sk', queueNumber: SKIPPED, station: 'A', status: 'skipped' })]))

  const zone = parkedZone()
  // the serving-card actions (เสร็จ / ข้าม / ประกาศซ้ำ) must not follow an order into the park
  expect(within(zone).queryByRole('button', { name: /เสร็จ/ })).toBeNull()
  expect(within(zone).queryByRole('button', { name: /^ข้าม/ })).toBeNull()
  expect(within(zone).queryByRole('button', { name: /ประกาศซ้ำ/ })).toBeNull()
})
