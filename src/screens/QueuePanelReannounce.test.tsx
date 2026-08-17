// Re-announce criterion (2026-08-04-queue-pro-upgrade-design.md), panel half:
//   "ประกาศซ้ำ: กดบน serving → ... (announcedAt เด้ง)"
//
// The Display half lives in DisplayReannounce.test.tsx. Kept in its own file so it does not
// collide with QueuePanel.test.tsx on other branches.
//
// QueuePanel.test.tsx already checks this button with `objectContaining({ announcedAt })`,
// which passes no matter how many EXTRA fields ride along. Extra fields are exactly the
// failure mode that matters here: re-announce must not restate `status`/`servingAt`, or the
// undo snapshot and the idempotency guards start disagreeing with the document. So these
// assertions use toStrictEqual on mock.calls — never objectContaining, never
// toHaveBeenCalledWith.
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

test('the re-announce button writes announcedAt and nothing else', async () => {
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([
    order({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'serving', servingAt: 5, announcedAt: 5 }),
  ]))

  await user.click(screen.getByRole('button', { name: /ประกาศซ้ำ/ }))

  // exactly one write, exactly one field — no status, no servingAt tagging along
  expect(updateOrderStatus.mock.calls).toStrictEqual([['o1', { announcedAt: expect.any(Number) }]])
})

test('the re-announced time is newer than the one already on the order', async () => {
  const user = userEvent.setup()
  const before = Date.now()
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([
    order({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'serving', servingAt: 5, announcedAt: 5 }),
  ]))

  await user.click(screen.getByRole('button', { name: /ประกาศซ้ำ/ }))

  const [, patch] = updateOrderStatus.mock.calls[0] as [string, Partial<Order>]
  expect(patch.announcedAt).toBeGreaterThan(5)
  expect(patch.announcedAt).toBeGreaterThanOrEqual(before)
})

test('pressing re-announce twice writes a fresh announcedAt each time', async () => {
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([
    order({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'serving', announcedAt: 5 }),
  ]))

  await user.click(screen.getByRole('button', { name: /ประกาศซ้ำ/ }))
  await user.click(screen.getByRole('button', { name: /ประกาศซ้ำ/ }))

  expect(updateOrderStatus.mock.calls).toStrictEqual([
    ['o1', { announcedAt: expect.any(Number) }],
    ['o1', { announcedAt: expect.any(Number) }],
  ])
})

test('re-announce targets only the order whose button was pressed', async () => {
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([
    order({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'serving' }),
    order({ id: 'o2', queueNumber: 'A2', station: 'A', status: 'serving' }),
  ]))

  const buttons = screen.getAllByRole('button', { name: /ประกาศซ้ำ/ })
  expect(buttons).toHaveLength(2)
  await user.click(buttons[1])

  expect(updateOrderStatus.mock.calls).toStrictEqual([['o2', { announcedAt: expect.any(Number) }]])
})

test('only serving orders offer re-announce — waiting and parked ones do not', () => {
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([
    order({ id: 'w', queueNumber: 'A1', station: 'A', status: 'waiting' }),
    order({ id: 'k', queueNumber: 'A2', station: 'A', status: 'skipped' }),
  ]))

  // Q.reannounce returns null for these, so the button must not be reachable at all
  expect(screen.queryAllByRole('button', { name: /ประกาศซ้ำ/ })).toHaveLength(0)
})
