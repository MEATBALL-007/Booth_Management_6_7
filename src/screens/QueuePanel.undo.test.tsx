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
  id: 'o1', boothId: 'drinks', queueNumber: 'A1', station: 'A', items: [], total: 30,
  paymentMethod: 'cash', paymentStatus: 'paid', status: 'waiting', createdAt: 1, ...over,
})

beforeEach(() => updateOrderStatus.mockClear())

// These assert on the raw mock.calls with toStrictEqual on purpose: objectContaining and
// toHaveBeenCalledWith both ignore surplus keys, which is exactly how a field the action
// introduced used to survive an undo unnoticed.

test('undo of "เสร็จ" restores serving and clears the doneAt the action introduced', async () => {
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([order({ id: 'o1', status: 'serving', servingAt: 5, announcedAt: 6 })]))

  await user.click(screen.getByRole('button', { name: /เสร็จ/ }))
  updateOrderStatus.mockClear()
  await user.click(screen.getByRole('button', { name: /ย้อนกลับ/ }))

  expect(updateOrderStatus.mock.calls).toStrictEqual([[
    'o1',
    { status: 'serving', servingAt: 5, doneAt: undefined, announcedAt: 6, cancelReason: undefined },
  ]])
})

test('undo of "เรียกคิวถัดไป" restores waiting and clears servingAt/announcedAt', async () => {
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([order({ id: 'o1', status: 'waiting', createdAt: 1 })]))

  await user.click(screen.getByRole('button', { name: /เรียกคิวถัดไป/ }))
  updateOrderStatus.mockClear()
  await user.click(screen.getByRole('button', { name: /ย้อนกลับ/ }))

  expect(updateOrderStatus.mock.calls).toStrictEqual([[
    'o1',
    { status: 'waiting', servingAt: undefined, doneAt: undefined, announcedAt: undefined, cancelReason: undefined },
  ]])
})

test('undo of "ยกเลิก" restores waiting and clears the cancelReason', async () => {
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([order({ id: 'o1', status: 'waiting' })]))

  await user.click(screen.getByRole('button', { name: /ยกเลิก/ }))
  await user.type(screen.getByLabelText(/เหตุผล/), 'ลูกค้าเปลี่ยนใจ')
  await user.click(screen.getByRole('button', { name: /ยืนยันยกเลิก/ }))
  updateOrderStatus.mockClear()
  await user.click(screen.getByRole('button', { name: /ย้อนกลับ/ }))

  expect(updateOrderStatus.mock.calls).toStrictEqual([[
    'o1',
    { status: 'waiting', servingAt: undefined, doneAt: undefined, announcedAt: undefined, cancelReason: undefined },
  ]])
})
