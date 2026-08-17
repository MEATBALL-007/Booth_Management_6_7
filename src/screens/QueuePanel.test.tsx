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

test('call next moves the first waiting order of this station to serving', async () => {
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([
    order({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'waiting', createdAt: 1 }),
    order({ id: 'o2', queueNumber: 'A2', station: 'A', status: 'waiting', createdAt: 2 }),
    order({ id: 'oB', queueNumber: 'B1', station: 'B', status: 'waiting', createdAt: 1 }),
  ]))

  await user.click(screen.getByRole('button', { name: /เรียกคิวถัดไป/ }))
  expect(updateOrderStatus).toHaveBeenCalledWith('o1', expect.objectContaining({ status: 'serving' }))
})

test('done moves a serving order to done', async () => {
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([order({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'serving' })]))

  await user.click(screen.getByRole('button', { name: /เสร็จ/ }))
  expect(updateOrderStatus).toHaveBeenCalledWith('o1', expect.objectContaining({ status: 'done' }))
})

test('cancel requires a reason and records it', async () => {
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([order({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'waiting' })]))

  await user.click(screen.getByRole('button', { name: /ยกเลิก/ }))
  // reason input appears; empty submit is blocked
  await user.click(screen.getByRole('button', { name: /ยืนยันยกเลิก/ }))
  expect(updateOrderStatus).not.toHaveBeenCalled()

  await user.type(screen.getByLabelText(/เหตุผล/), 'ลูกค้าเปลี่ยนใจ')
  await user.click(screen.getByRole('button', { name: /ยืนยันยกเลิก/ }))
  expect(updateOrderStatus).toHaveBeenCalledWith('o1', expect.objectContaining({ status: 'cancelled', cancelReason: 'ลูกค้าเปลี่ยนใจ' }))
})

test('serving card shows the item summary with options for the maker', () => {
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([order({
    id: 'o1', queueNumber: 'A1', station: 'A', status: 'serving',
    items: [{ sku: 'd', name: 'โยเกิร์ต', qty: 1, unitPrice: 45, subtotal: 45, options: [{ label: 'ไข่มุกป็อป', priceDelta: 10 }] }],
  })]))
  const card = screen.getByText(/โยเกิร์ต/)
  expect(card).toHaveTextContent('ไข่มุกป็อป')
})

test('call button on a waiting order serves that specific number', async () => {
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([
    order({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'waiting', createdAt: 1 }),
    order({ id: 'o2', queueNumber: 'A2', station: 'A', status: 'waiting', createdAt: 2 }),
  ]))
  // call the SECOND waiting specifically
  await user.click(screen.getAllByRole('button', { name: /^เรียก$/ })[1])
  expect(updateOrderStatus).toHaveBeenCalledWith('o2', expect.objectContaining({ status: 'serving' }))
})

test('skip moves a serving order to skipped; recall brings it back to serving', async () => {
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([order({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'serving' })]))
  await user.click(screen.getByRole('button', { name: /ข้าม/ }))
  expect(updateOrderStatus).toHaveBeenCalledWith('o1', expect.objectContaining({ status: 'skipped' }))

  updateOrderStatus.mockClear()
  act(() => emit([order({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'skipped' })]))
  await user.click(screen.getByRole('button', { name: /เรียกซ้ำ/ }))
  expect(updateOrderStatus).toHaveBeenCalledWith('o1', expect.objectContaining({ status: 'serving' }))
})

test('re-announce bumps announcedAt on a serving order', async () => {
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([order({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'serving' })]))
  await user.click(screen.getByRole('button', { name: /ประกาศซ้ำ/ }))
  expect(updateOrderStatus).toHaveBeenCalledWith('o1', expect.objectContaining({ announcedAt: expect.any(Number) }))
})

test('undo restores the prior state of the last action', async () => {
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([order({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'serving', servingAt: 5 })]))
  await user.click(screen.getByRole('button', { name: /เสร็จ/ }))          // serving -> done
  updateOrderStatus.mockClear()
  await user.click(screen.getByRole('button', { name: /ย้อนกลับ/ }))       // undo
  // toStrictEqual on the raw call, not objectContaining: a subset matcher cannot
  // see a field left behind by the undo (QueuePanelUndo.test.tsx covers the rest)
  expect(updateOrderStatus.mock.calls).toStrictEqual([['o1', {
    status: 'serving', servingAt: 5, doneAt: undefined, announcedAt: undefined, cancelReason: undefined,
  }]])
})
