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
import * as Q from '../queue/queueActions'
import { act } from 'react'

const order = (over: Partial<Order>): Order => ({
  id: 'x', boothId: 'drinks', queueNumber: 'A1', station: 'A', items: [], total: 30,
  paymentMethod: 'cash', paymentStatus: 'paid', status: 'waiting', createdAt: 1, ...over,
})

// Freeze the clock so a patch built from Date.now() is byte-comparable with
// toStrictEqual. Two presses a few ms apart would otherwise differ only in
// their timestamp, which would hide the thing we actually care about (which
// order was targeted).
const NOW = 1000
beforeEach(() => {
  updateOrderStatus.mockClear()
  vi.spyOn(Date, 'now').mockReturnValue(NOW)
})
afterEach(() => vi.restoreAllMocks())

const serve = { status: 'serving', servingAt: NOW, announcedAt: NOW }

// --- pressing the same button twice, before any new snapshot arrives --------
//
// updateOrderStatus is mocked, so nothing writes back into local state: the
// component still sees the pre-click snapshot. That is exactly the real-world
// window this criterion is about — the Firestore round trip has not landed yet.

test('pressing call-next twice re-targets the SAME order, it does not pull a second one', async () => {
  const user = userEvent.setup({ delay: null })
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([
    order({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'waiting', createdAt: 1 }),
    order({ id: 'o2', queueNumber: 'A2', station: 'A', status: 'waiting', createdAt: 2 }),
  ]))

  await user.click(screen.getByRole('button', { name: /เรียกคิวถัดไป/ }))
  await user.click(screen.getByRole('button', { name: /เรียกคิวถัดไป/ }))

  // Both presses land on o1. If the second press had advanced to o2, two
  // customers would be called at once off a single double-tap — the "ดึงซ้อน"
  // failure this criterion names.
  expect(updateOrderStatus.mock.calls).toStrictEqual([
    ['o1', serve],
    ['o1', serve],
  ])
})

test('pressing done twice keeps the undo snapshot pointing at the true prior state', async () => {
  const user = userEvent.setup({ delay: null })
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([order({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'serving', servingAt: 5 })]))

  await user.click(screen.getByRole('button', { name: /เสร็จ/ }))
  await user.click(screen.getByRole('button', { name: /เสร็จ/ }))
  await user.click(screen.getByRole('button', { name: /ย้อนกลับ/ }))

  // The second press must not overwrite the undo snapshot with the state the
  // first press was trying to create; undo still has to reach back to serving.
  expect(updateOrderStatus.mock.calls).toStrictEqual([
    ['o1', { status: 'done', doneAt: NOW }],
    ['o1', { status: 'done', doneAt: NOW }],
    ['o1', { status: 'serving', servingAt: 5 }],
  ])
})

// --- an action that is refused must leave no trace at all ------------------

test('a blocked cancel writes nothing AND does not raise an undo bar', async () => {
  const user = userEvent.setup({ delay: null })
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([order({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'waiting' })]))

  await user.click(screen.getByRole('button', { name: /ยกเลิก\/แก้ไข/ }))
  await user.click(screen.getByRole('button', { name: /ยืนยันยกเลิก/ }))   // reason still empty

  expect(updateOrderStatus.mock.calls).toStrictEqual([])
  // A no-op that still offers "ย้อนกลับ" is the dangerous shape: the operator
  // presses it and writes a stale snapshot over whatever is current.
  expect(screen.queryByRole('button', { name: /ย้อนกลับ/ })).toBeNull()
})

test('confirming cancel after the order left the snapshot writes nothing and raises no undo bar', async () => {
  const user = userEvent.setup({ delay: null })
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([order({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'waiting' })]))

  await user.click(screen.getByRole('button', { name: /ยกเลิก\/แก้ไข/ }))
  // cancelId outlives the card: another device moves the order off this
  // station while the reason panel is still open on this one.
  act(() => emit([]))
  await user.type(screen.getByLabelText(/เหตุผล/), 'ลูกค้าเปลี่ยนใจ')
  await user.click(screen.getByRole('button', { name: /ยืนยันยกเลิก/ }))

  expect(updateOrderStatus.mock.calls).toStrictEqual([])
  expect(screen.queryByRole('button', { name: /ย้อนกลับ/ })).toBeNull()
})

// --- why the UI cannot even offer a stale action ---------------------------

test('an order already done offers no action button at all', () => {
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([order({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'done', doneAt: 9 })]))

  // Render-gating is the first line of defence: the serving/waiting/parked
  // filters never emit a card for a terminal order, so no button exists to
  // press against it. This is what makes `if (!patch) return` in apply()
  // a second line rather than the first.
  expect(screen.queryByRole('button', { name: /เสร็จ/ })).toBeNull()
  expect(screen.queryByRole('button', { name: /^เรียก$/ })).toBeNull()
  expect(screen.queryByRole('button', { name: /ข้าม/ })).toBeNull()
  expect(screen.queryByRole('button', { name: /เรียกซ้ำ/ })).toBeNull()
})

// --- the two-device story, at the layer where it is decidable --------------

test('two devices reading the same snapshot pick the same order, never one each', () => {
  const snapshot = [
    order({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'waiting', createdAt: 1 }),
    order({ id: 'o2', queueNumber: 'A2', station: 'A', status: 'waiting', createdAt: 2 }),
  ]
  // callNext is a pure function of the snapshot and always takes the oldest
  // waiting order, so concurrent presses on two devices converge on one id.
  // They overwrite each other's servingAt/announcedAt (the customer hears the
  // announcement twice) but they cannot serve two different numbers.
  expect(Q.callNext(snapshot, 'A', 1000)).toStrictEqual({ id: 'o1', patch: serve })
  expect(Q.callNext(snapshot, 'A', 2000)).toStrictEqual({
    id: 'o1', patch: { status: 'serving', servingAt: 2000, announcedAt: 2000 },
  })

  // Once either write lands, the next read moves on rather than re-pulling o1.
  const after = [order({ id: 'o1', station: 'A', status: 'serving', createdAt: 1 }), snapshot[1]]
  expect(Q.callNext(after, 'A', 3000)?.id).toBe('o2')
})
