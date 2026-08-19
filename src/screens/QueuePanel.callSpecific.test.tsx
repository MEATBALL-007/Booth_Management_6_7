// Criterion: เรียกเจาะจง — กด "เรียก" บน waiting เลขใดก็ได้ → serving (ข้ามลำดับได้)
//
// QueuePanel.test.tsx already proves the second waiting order can be called. What it does NOT
// prove is (a) that the patch written is exactly the callSpecific patch — it asserts with
// `objectContaining`, which ignores extra fields, and updateOrderStatus is a merge, so an extra
// field would silently land on the real document — and (b) that skipping ahead leaves the orders
// it jumped over untouched and still in line. Those two gaps are what this file covers.
import { vi, beforeEach, afterEach, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
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

const NOW = 1_700_000_000_000

const order = (over: Partial<Order>): Order => ({
  id: 'x', boothId: 'drinks', queueNumber: 'A1', station: 'A', items: [], total: 30,
  paymentMethod: 'cash', paymentStatus: 'paid', status: 'waiting', createdAt: 1, ...over,
})

// three waiting orders on this station, oldest first
const threeWaiting = () => [
  order({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'waiting', createdAt: 1 }),
  order({ id: 'o2', queueNumber: 'A2', station: 'A', status: 'waiting', createdAt: 2 }),
  order({ id: 'o3', queueNumber: 'A3', station: 'A', status: 'waiting', createdAt: 3 }),
]

// the three "เรียก*" buttons share a prefix — only the anchored regex hits callSpecific
const callButtons = () => screen.getAllByRole('button', { name: /^เรียก$/ })

beforeEach(() => {
  updateOrderStatus.mockClear()
  vi.spyOn(Date, 'now').mockReturnValue(NOW)
})
afterEach(() => vi.restoreAllMocks())

test('calling a specific number writes exactly the callSpecific patch and nothing else', async () => {
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit(threeWaiting()))

  await user.click(callButtons()[1]) // the middle one — out of order on purpose

  // toStrictEqual, not objectContaining: pins the id, both timestamps, AND the absence of
  // any extra field, since updateOrderStatus merges whatever it is handed.
  expect(updateOrderStatus.mock.calls).toStrictEqual([
    ['o2', { status: 'serving', servingAt: NOW, announcedAt: NOW }],
  ])
})

test('calling the last number in line leaves the ones it skipped still waiting', async () => {
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit(threeWaiting()))
  expect(callButtons()).toHaveLength(3)

  await user.click(callButtons()[2]) // jump straight to the back of the queue
  expect(updateOrderStatus).toHaveBeenCalledTimes(1)
  expect(updateOrderStatus).toHaveBeenCalledWith('o3', expect.objectContaining({ status: 'serving' }))

  act(() => emit([
    order({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'waiting', createdAt: 1 }),
    order({ id: 'o2', queueNumber: 'A2', station: 'A', status: 'waiting', createdAt: 2 }),
    order({ id: 'o3', queueNumber: 'A3', station: 'A', status: 'serving', createdAt: 3, servingAt: NOW }),
  ]))

  // the two it jumped over are still offered as waiting; the called one is now a serving card
  expect(callButtons()).toHaveLength(2)
  expect(screen.getByRole('button', { name: /เสร็จ/ })).toBeInTheDocument()
  expect(screen.getByText('A1')).toBeInTheDocument()
  expect(screen.getByText('A2')).toBeInTheDocument()
})

test('after skipping ahead, เรียกคิวถัดไป still takes the oldest one left', async () => {
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit(threeWaiting()))

  await user.click(callButtons()[2]) // A3 called out of order
  act(() => emit([
    order({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'waiting', createdAt: 1 }),
    order({ id: 'o2', queueNumber: 'A2', station: 'A', status: 'waiting', createdAt: 2 }),
    order({ id: 'o3', queueNumber: 'A3', station: 'A', status: 'serving', createdAt: 3, servingAt: NOW }),
  ]))
  updateOrderStatus.mockClear()

  await user.click(screen.getByRole('button', { name: /เรียกคิวถัดไป/ }))

  // o1, not o2 — jumping the queue must not reorder what is left behind
  expect(updateOrderStatus.mock.calls).toStrictEqual([
    ['o1', { status: 'serving', servingAt: NOW, announcedAt: NOW }],
  ])
})

test('เรียก is offered on waiting orders only, so the callSpecific guard is never reachable', () => {
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([
    order({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'serving' }),
    order({ id: 'o2', queueNumber: 'A2', station: 'A', status: 'skipped' }),
    order({ id: 'o3', queueNumber: 'A3', station: 'A', status: 'done' }),
    order({ id: 'o4', queueNumber: 'A4', station: 'A', status: 'cancelled' }),
  ]))

  // serving offers เสร็จ, skipped offers เรียกซ้ำ, done/cancelled offer nothing —
  // none of them offers the plain เรียก, so callSpecific's `status !== 'waiting'` guard is
  // a second line of defence rather than the one that keeps the UI honest.
  expect(screen.queryAllByRole('button', { name: /^เรียก$/ })).toHaveLength(0)
  expect(screen.getByRole('button', { name: /เรียกซ้ำ/ })).toBeInTheDocument()
})
