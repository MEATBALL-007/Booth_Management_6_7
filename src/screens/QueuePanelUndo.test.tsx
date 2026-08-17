import { vi, beforeEach, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Order } from '../domain/types'

// The same acceptance criterion as undoRoundTrip.test.ts, one level up: what the
// panel actually hands to the repo when the operator presses ย้อนกลับ.
// Assertions are toStrictEqual on the raw call — objectContaining and
// toHaveBeenCalledWith both ignore surplus/undefined keys, which is precisely
// what let the leftover fields hide from the original undo test.

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

const absent = { servingAt: undefined, doneAt: undefined, announcedAt: undefined, cancelReason: undefined }

beforeEach(() => updateOrderStatus.mockClear())

const undoOf = async (
  user: ReturnType<typeof userEvent.setup>,
  orders: Order[],
  action: RegExp,
) => {
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit(orders))
  await user.click(screen.getByRole('button', { name: action }))
  updateOrderStatus.mockClear()
  await user.click(screen.getByRole('button', { name: /ย้อนกลับ/ }))
  return updateOrderStatus.mock.calls
}

test('undo of เรียกคิวถัดไป puts the order back to waiting with no serving timestamps left on it', async () => {
  const calls = await undoOf(userEvent.setup(), [order({ status: 'waiting' })], /เรียกคิวถัดไป/)
  expect(calls).toStrictEqual([['o1', { status: 'waiting', ...absent }]])
})

test('undo of เรียก (เจาะจง) puts that number back to waiting with no serving timestamps left on it', async () => {
  const calls = await undoOf(userEvent.setup(), [order({ status: 'waiting' })], /^เรียก$/)
  expect(calls).toStrictEqual([['o1', { status: 'waiting', ...absent }]])
})

test('undo of เสร็จ restores serving with its original times and clears doneAt', async () => {
  const calls = await undoOf(
    userEvent.setup(),
    [order({ status: 'serving', servingAt: 5, announcedAt: 7 })],
    /เสร็จ/,
  )
  expect(calls).toStrictEqual([['o1', { ...absent, status: 'serving', servingAt: 5, announcedAt: 7 }]])
})

test('undo of ข้าม brings the order back to serving unchanged', async () => {
  const calls = await undoOf(
    userEvent.setup(),
    [order({ status: 'serving', servingAt: 5, announcedAt: 7 })],
    /ข้าม/,
  )
  expect(calls).toStrictEqual([['o1', { ...absent, status: 'serving', servingAt: 5, announcedAt: 7 }]])
})

test('undo of ประกาศซ้ำ puts announcedAt back to what it was', async () => {
  const calls = await undoOf(
    userEvent.setup(),
    [order({ status: 'serving', servingAt: 5, announcedAt: 7 })],
    /ประกาศซ้ำ/,
  )
  expect(calls).toStrictEqual([['o1', { ...absent, status: 'serving', servingAt: 5, announcedAt: 7 }]])
})

test('undo of เรียกซ้ำ puts the order back in the พักไว้ zone', async () => {
  const calls = await undoOf(
    userEvent.setup(),
    [order({ status: 'skipped', servingAt: 5, announcedAt: 7 })],
    /เรียกซ้ำ/,
  )
  expect(calls).toStrictEqual([['o1', { ...absent, status: 'skipped', servingAt: 5, announcedAt: 7 }]])
})

test('undo of ยกเลิก un-cancels the order and removes the reason', async () => {
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([order({ status: 'waiting' })]))

  await user.click(screen.getByRole('button', { name: /ยกเลิก/ }))
  await user.type(screen.getByLabelText(/เหตุผล/), 'ลูกค้าเปลี่ยนใจ')
  await user.click(screen.getByRole('button', { name: /ยืนยันยกเลิก/ }))
  expect(updateOrderStatus.mock.calls).toStrictEqual([['o1', { status: 'cancelled', cancelReason: 'ลูกค้าเปลี่ยนใจ' }]])

  updateOrderStatus.mockClear()
  await user.click(screen.getByRole('button', { name: /ย้อนกลับ/ }))
  expect(updateOrderStatus.mock.calls).toStrictEqual([['o1', { status: 'waiting', ...absent }]])
})
