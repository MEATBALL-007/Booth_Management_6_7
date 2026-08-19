// Acceptance criterion: "Idempotency: กดซ้ำ/สองเครื่องพร้อมกัน ไม่ดึงซ้อน/ข้ามผิด (guard คืน no-op)"
//
// The pure guards in queueActions already return null for a wrong status, and
// queueActions.test.ts covers them. What was never covered is the panel: between a tap and
// Firestore's echo the cards on screen still show the OLD status, so a second tap acts on a
// snapshot we have already acted on. These tests pin that window shut.
//
// Every assertion is toStrictEqual over the WHOLE updateOrderStatus.mock.calls list, not
// objectContaining — a duplicate write is an extra ENTRY in that list, which is exactly what
// this criterion is about, and objectContaining would also wave through stray patch fields.
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
import { callSpecific } from '../queue/queueActions'
import { act } from 'react'

const NOW = 1_000

const order = (over: Partial<Order>): Order => ({
  id: 'x', boothId: 'drinks', queueNumber: 'A1', station: 'A', items: [], total: 30,
  paymentMethod: 'cash', paymentStatus: 'paid', status: 'waiting', createdAt: 1, ...over,
})

beforeEach(() => {
  updateOrderStatus.mockClear()
  // real timers on purpose — userEvent runs its own, and swapping them hangs the suite
  vi.spyOn(Date, 'now').mockReturnValue(NOW)
})

test('เรียกคิวถัดไป pressed twice before the echo pulls one order once, not two', async () => {
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([
    order({ id: 'o1', queueNumber: 'A1', status: 'waiting', createdAt: 1 }),
    order({ id: 'o2', queueNumber: 'A2', status: 'waiting', createdAt: 2 }),
  ]))

  const btn = screen.getByRole('button', { name: /เรียกคิวถัดไป/ })
  await user.click(btn)
  await user.click(btn)   // no snapshot in between: the panel still sees o1 as waiting

  // the wrong outcomes this guards against: o1 written twice, or o1 then o2 both pulled
  expect(updateOrderStatus.mock.calls).toStrictEqual([
    ['o1', { status: 'serving', servingAt: NOW, announcedAt: NOW }],
  ])
})

// The guard must RELEASE on the next snapshot, not latch: a queue where calling a number
// permanently deadens its card would be far worse than the duplicate write it prevents.
// The order acted on twice has to be the SAME one (o1 called, then o1 finished) — asserting
// only that เรียกคิวถัดไป advances to o2 proves nothing, because o2 was never locked.
test('the guard releases on the next snapshot — the same order can be acted on again', async () => {
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([
    order({ id: 'o1', queueNumber: 'A1', status: 'waiting', createdAt: 1 }),
    order({ id: 'o2', queueNumber: 'A2', status: 'waiting', createdAt: 2 }),
  ]))
  await user.click(screen.getByRole('button', { name: /เรียกคิวถัดไป/ }))

  act(() => emit([
    order({ id: 'o1', queueNumber: 'A1', status: 'serving', servingAt: NOW, announcedAt: NOW, createdAt: 1 }),
    order({ id: 'o2', queueNumber: 'A2', status: 'waiting', createdAt: 2 }),
  ]))
  await user.click(screen.getByRole('button', { name: /เสร็จ/ }))            // o1 again, after the echo
  await user.click(screen.getByRole('button', { name: /เรียกคิวถัดไป/ }))   // and the queue moves on

  expect(updateOrderStatus.mock.calls).toStrictEqual([
    ['o1', { status: 'serving', servingAt: NOW, announcedAt: NOW }],
    ['o1', { status: 'done', doneAt: NOW }],
    ['o2', { status: 'serving', servingAt: NOW, announcedAt: NOW }],
  ])
})

test('เรียก pressed twice on the same waiting card writes once', async () => {
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([order({ id: 'o1', queueNumber: 'A1', status: 'waiting' })]))

  const btn = screen.getByRole('button', { name: /^เรียก$/ })
  await user.click(btn)
  await user.click(btn)

  expect(updateOrderStatus.mock.calls).toStrictEqual([
    ['o1', { status: 'serving', servingAt: NOW, announcedAt: NOW }],
  ])
})

test('เสร็จ pressed twice on the same serving card stamps doneAt once', async () => {
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([order({ id: 'o1', queueNumber: 'A1', status: 'serving', servingAt: 5 })]))

  const btn = screen.getByRole('button', { name: /เสร็จ/ })
  await user.click(btn)
  await user.click(btn)

  expect(updateOrderStatus.mock.calls).toStrictEqual([['o1', { status: 'done', doneAt: NOW }]])
})

test('ประกาศซ้ำ pressed twice announces once — one chime, not a double flash', async () => {
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([order({ id: 'o1', queueNumber: 'A1', status: 'serving', servingAt: 5, announcedAt: 5 })]))

  const btn = screen.getByRole('button', { name: /ประกาศซ้ำ/ })
  await user.click(btn)
  await user.click(btn)

  expect(updateOrderStatus.mock.calls).toStrictEqual([['o1', { announcedAt: NOW }]])
})

test('the guard is per order — two different numbers can be called in one snapshot', async () => {
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([
    order({ id: 'o1', queueNumber: 'A1', status: 'waiting', createdAt: 1 }),
    order({ id: 'o2', queueNumber: 'A2', status: 'waiting', createdAt: 2 }),
  ]))

  const calls = screen.getAllByRole('button', { name: /^เรียก$/ })
  await user.click(calls[0])
  await user.click(calls[1])

  expect(updateOrderStatus.mock.calls).toStrictEqual([
    ['o1', { status: 'serving', servingAt: NOW, announcedAt: NOW }],
    ['o2', { status: 'serving', servingAt: NOW, announcedAt: NOW }],
  ])
})

// ── documented gap ────────────────────────────────────────────────────────────────────
// Two devices at once is NOT covered, and cannot be from the client alone. Device B renders
// a snapshot in which o1 is still waiting; device A has already pulled it. B's callSpecific
// is handed B's stale order, so it sees 'waiting' and returns a patch — B overwrites A's
// servingAt/announcedAt. Closing this needs a Firestore transaction or a compare-and-set
// rule, and firestore.rules is out of scope for this plan. This test locks in the current
// behaviour so that adding a transaction later shows up here as a deliberate change.
test('GAP: a device on a stale snapshot still writes — the guard is client-side only', async () => {
  // what the server really holds: A pulled o1 at t=500
  const serverTruth = order({ id: 'o1', status: 'serving', servingAt: 500, announcedAt: 500 })
  expect(callSpecific(serverTruth, NOW)).toBeNull()   // the guard WOULD refuse, given the truth

  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)   // device B, lagging
  act(() => emit([order({ id: 'o1', queueNumber: 'A1', status: 'waiting' })]))

  await user.click(screen.getByRole('button', { name: /^เรียก$/ }))

  // B writes anyway, clobbering A's timestamps. No read-back, no compare-and-set.
  expect(updateOrderStatus.mock.calls).toStrictEqual([
    ['o1', { status: 'serving', servingAt: NOW, announcedAt: NOW }],
  ])
})
