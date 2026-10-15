import { callNext, callSpecific, markDone, skip, recall, reannounce, cancel, orderSnapshot } from './queueActions'
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

test('cancel needs a non-empty reason and trims it', () => {
  expect(cancel('ลูกค้าเปลี่ยนใจ')).toEqual({ status: 'cancelled', cancelReason: 'ลูกค้าเปลี่ยนใจ' })
  expect(cancel('  ของหมด  ')).toEqual({ status: 'cancelled', cancelReason: 'ของหมด' })
  expect(cancel('   ')).toBeNull()
  expect(cancel('')).toBeNull()
})

test('orderSnapshot captures every mutable field, undefined meaning "was absent"', () => {
  expect(orderSnapshot(o({ status: 'serving', servingAt: 5 }))).toStrictEqual({
    status: 'serving', servingAt: 5, doneAt: undefined, announcedAt: undefined, cancelReason: undefined,
  })
  expect(orderSnapshot(o({ status: 'done', servingAt: 5, doneAt: 9, announcedAt: 5, cancelReason: 'x' })))
    .toStrictEqual({ status: 'done', servingAt: 5, doneAt: 9, announcedAt: 5, cancelReason: 'x' })
})

/**
 * Undo round-trip: for every action, in every state it is reachable from,
 * applying the action's patch and then the snapshot taken beforehand must land
 * back on the byte-identical original order — no field the action introduced
 * may survive the undo.
 */

// Firestore updateDoc semantics: keys present overwrite, keys the repo layer
// maps to deleteField() (i.e. explicit undefined) are removed, everything else
// is left alone. Kept in step with ordersRepo.test.ts, which pins that mapping.
const write = (order: Order, patch: Partial<Order>): Order => {
  const next: Record<string, unknown> = { ...order }
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) delete next[key]
    else next[key] = value
  }
  return next as unknown as Order
}

const fresh = o({ id: 'o1', status: 'waiting', createdAt: 1 })
const servingOrder = o({ id: 'o1', status: 'serving', createdAt: 1, servingAt: 50, announcedAt: 50 })

const roundTrips: [string, Order, Partial<Order> | null][] = [
  ['callNext on a never-called waiting order', fresh, callNext([fresh], 'A', 100)?.patch ?? null],
  ['callSpecific on a never-called waiting order', fresh, callSpecific(fresh, 100)],
  // a waiting order that already carries timestamps (called, then undone, then called again)
  ['callSpecific on a waiting order with stale timestamps',
    o({ id: 'o1', status: 'waiting', servingAt: 20, announcedAt: 20 }),
    callSpecific(o({ id: 'o1', status: 'waiting', servingAt: 20, announcedAt: 20 }), 100)],
  ['markDone on a serving order', servingOrder, markDone(servingOrder, 100)],
  ['skip on a serving order', servingOrder, skip(servingOrder)],
  ['recall on a skipped order',
    o({ id: 'o1', status: 'skipped', servingAt: 50, announcedAt: 50 }),
    recall(o({ id: 'o1', status: 'skipped', servingAt: 50, announcedAt: 50 }), 100)],
  ['reannounce on a serving order', servingOrder, reannounce(servingOrder, 100)],
  ['cancel a waiting order', fresh, cancel('ลูกค้าเปลี่ยนใจ')],
  ['cancel a serving order', servingOrder, cancel('ของหมด')],
]

test.each(roundTrips)('undo restores the order exactly: %s', (_name, order, patch) => {
  expect(patch).not.toBeNull()
  const before = orderSnapshot(order)
  const after = write(order, patch!)
  expect(after).not.toStrictEqual(order)          // the action really changed something
  expect(write(after, before)).toStrictEqual(order)
})
