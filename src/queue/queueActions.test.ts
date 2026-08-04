import { callNext, callSpecific, markDone, skip, recall, reannounce, orderSnapshot } from './queueActions'
import type { Order } from '../domain/types'

const o = (over: Partial<Order>): Order => ({
  id: 'x', boothId: 'drinks', queueNumber: 'A1', station: 'A', items: [], total: 0,
  paymentMethod: 'cash', paymentStatus: 'paid', status: 'waiting', createdAt: 1, ...over,
})

test('callNext picks the first waiting of the station and serves it (with timestamps)', () => {
  const r = callNext([
    o({ id: 'a', station: 'A', status: 'waiting', createdAt: 2 }),
    o({ id: 'b', station: 'A', status: 'waiting', createdAt: 1 }),
    o({ id: 'c', station: 'B', status: 'waiting', createdAt: 0 }),
  ], 'A', 100)
  expect(r).toEqual({ id: 'b', patch: { status: 'serving', servingAt: 100, announcedAt: 100 } })
})

test('callNext returns null when no waiting for the station (no-op guard)', () => {
  expect(callNext([o({ station: 'A', status: 'serving' })], 'A', 100)).toBeNull()
})

test('callSpecific serves a waiting order, null otherwise (idempotency guard)', () => {
  expect(callSpecific(o({ status: 'waiting' }), 100)).toEqual({ status: 'serving', servingAt: 100, announcedAt: 100 })
  expect(callSpecific(o({ status: 'serving' }), 100)).toBeNull()
})

test('markDone only from serving', () => {
  expect(markDone(o({ status: 'serving' }), 100)).toEqual({ status: 'done', doneAt: 100 })
  expect(markDone(o({ status: 'waiting' }), 100)).toBeNull()
})

test('skip: serving -> skipped', () => {
  expect(skip(o({ status: 'serving' }))).toEqual({ status: 'skipped' })
  expect(skip(o({ status: 'waiting' }))).toBeNull()
})

test('recall: skipped -> serving (re-announces)', () => {
  expect(recall(o({ status: 'skipped' }), 100)).toEqual({ status: 'serving', servingAt: 100, announcedAt: 100 })
  expect(recall(o({ status: 'serving' }), 100)).toBeNull()
})

test('reannounce bumps announcedAt on a serving order only', () => {
  expect(reannounce(o({ status: 'serving' }), 100)).toEqual({ announcedAt: 100 })
  expect(reannounce(o({ status: 'skipped' }), 100)).toBeNull()
})

test('orderSnapshot captures only defined mutable fields (for undo)', () => {
  expect(orderSnapshot(o({ status: 'serving', servingAt: 5 }))).toEqual({ status: 'serving', servingAt: 5 })
  expect(orderSnapshot(o({ status: 'done', servingAt: 5, doneAt: 9, announcedAt: 5, cancelReason: 'x' })))
    .toEqual({ status: 'done', servingAt: 5, doneAt: 9, announcedAt: 5, cancelReason: 'x' })
})
