// No-show criterion (2026-08-04-queue-pro-upgrade-design.md), QueuePanel half:
//   "ข้าม serving -> skipped (... ขึ้นโซนพักไว้); เรียกซ้ำ -> serving"
//
// QueuePanel.test.tsx already clicks เรียกซ้ำ, which only exists inside the parked zone, so the
// zone was covered by accident. Nothing asserted the zone's own label, that it stays hidden when
// nothing is parked, or that a parked order is kept out of the serving/waiting zones — which is
// what "ขึ้นโซนพักไว้" actually means for the operator. Separate file to avoid branch collisions.
import { vi, beforeEach, test, expect } from 'vitest'
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

const order = (over: Partial<Order>): Order => ({
  id: 'x', boothId: 'drinks', queueNumber: 'A1', station: 'A', items: [], total: 30,
  paymentMethod: 'cash', paymentStatus: 'paid', status: 'waiting', createdAt: 1, ...over,
})

beforeEach(() => updateOrderStatus.mockClear())

test('the parked zone stays hidden while nothing is skipped', () => {
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([order({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'serving' })]))
  expect(screen.queryByText(/พักไว้/)).not.toBeInTheDocument()
})

test('a skipped order shows up under the พักไว้ zone with its number and a recall button', () => {
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([order({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'skipped' })]))
  expect(screen.getByText(/พักไว้/)).toBeInTheDocument()
  expect(screen.getByText('A1')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /เรียกซ้ำ/ })).toBeInTheDocument()
})

test('a parked order is offered only recall — not the serving or waiting actions', () => {
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([order({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'skipped' })]))
  // serving-zone actions must not be reachable for a parked order
  expect(screen.queryByRole('button', { name: /เสร็จ/ })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /ข้าม/ })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /ประกาศซ้ำ/ })).not.toBeInTheDocument()
  // waiting-zone "เรียก" must not be reachable either (เรียกซ้ำ is a different button)
  expect(screen.queryByRole('button', { name: /^เรียก$/ })).not.toBeInTheDocument()
})

test('the parked zone only holds this station and counts what it holds', () => {
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([
    order({ id: 'a1', queueNumber: 'A1', station: 'A', status: 'skipped' }),
    order({ id: 'a2', queueNumber: 'A2', station: 'A', status: 'skipped' }),
    order({ id: 'b1', queueNumber: 'B1', station: 'B', status: 'skipped' }),
  ]))
  expect(screen.getByText(/พักไว้.*\(2\)/)).toBeInTheDocument()
  expect(screen.queryByText('B1')).not.toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: /เรียกซ้ำ/ })).toHaveLength(2)
})

test('recall from the parked zone sends exactly the serving patch, nothing extra', async () => {
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([order({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'skipped' })]))
  await user.click(screen.getByRole('button', { name: /เรียกซ้ำ/ }))

  // toStrictEqual, not objectContaining: a recall that quietly carried extra fields would be a bug
  expect(updateOrderStatus.mock.calls).toStrictEqual([
    ['o1', { status: 'serving', servingAt: expect.any(Number), announcedAt: expect.any(Number) }],
  ])
})
