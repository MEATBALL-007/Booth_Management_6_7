import { vi, beforeEach, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Order } from '../domain/types'

// Undo at the UI level. These assert with toStrictEqual on the raw call argument on
// purpose: toHaveBeenCalledWith / objectContaining both ignore surplus keys and keys
// whose value is undefined, which is precisely how the leftover-field bug stayed hidden.

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

const lastCall = () => updateOrderStatus.mock.calls[updateOrderStatus.mock.calls.length - 1]

beforeEach(() => updateOrderStatus.mockClear())

test('undo of "เสร็จ" restores serving and deletes the doneAt the action added', async () => {
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([order({ id: 'o1', status: 'serving', servingAt: 5, announcedAt: 5 })]))

  await user.click(screen.getByRole('button', { name: /เสร็จ/ }))
  await user.click(screen.getByRole('button', { name: /ย้อนกลับ/ }))

  expect(lastCall()).toStrictEqual(['o1', {
    status: 'serving', servingAt: 5, announcedAt: 5, doneAt: undefined, cancelReason: undefined,
  }])
})

test('undo of "เรียกคิวถัดไป" deletes the servingAt/announcedAt the call created', async () => {
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([order({ id: 'o1', status: 'waiting', createdAt: 1 })]))

  await user.click(screen.getByRole('button', { name: /เรียกคิวถัดไป/ }))
  await user.click(screen.getByRole('button', { name: /ย้อนกลับ/ }))

  expect(lastCall()).toStrictEqual(['o1', {
    status: 'waiting', servingAt: undefined, announcedAt: undefined, doneAt: undefined, cancelReason: undefined,
  }])
})

test('undo of "ยกเลิก" deletes the cancelReason the cancel wrote', async () => {
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([order({ id: 'o1', status: 'serving', servingAt: 5, announcedAt: 5 })]))

  await user.click(screen.getByRole('button', { name: /^ยกเลิก\/แก้ไข$/ }))
  await user.type(screen.getByLabelText(/เหตุผล/), 'ของหมด')
  await user.click(screen.getByRole('button', { name: /ยืนยันยกเลิก/ }))
  expect(lastCall()).toStrictEqual(['o1', { status: 'cancelled', cancelReason: 'ของหมด' }])

  await user.click(screen.getByRole('button', { name: /ย้อนกลับ/ }))
  expect(lastCall()).toStrictEqual(['o1', {
    status: 'serving', servingAt: 5, announcedAt: 5, doneAt: undefined, cancelReason: undefined,
  }])
})
