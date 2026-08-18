import { test, expect } from 'vitest'
import { callNext, callSpecific, markDone, skip, recall, reannounce, cancel, orderSnapshot } from './queueActions'
import type { Order } from '../domain/types'

// Every queue action must be exactly undoable: apply the action's patch, then apply
// the snapshot taken beforehand, and the order must be byte-for-byte what it was.
// This is the acceptance criterion "ทำ action ใดๆ แล้วกดย้อนกลับ → order คืนสถานะ+เวลาเดิม".

const o = (over: Partial<Order>): Order => ({
  id: 'x', boothId: 'drinks', queueNumber: 'A1', station: 'A', items: [], total: 0,
  paymentMethod: 'cash', paymentStatus: 'paid', status: 'waiting', createdAt: 1, ...over,
})

// Firestore semantics as implemented by updateOrderStatus: a key with a value overwrites,
// a key whose value is undefined is a deleteField() and removes the field entirely.
// (ordersRepo.test.ts pins that undefined -> deleteField() mapping; read these two together.)
const write = (order: Order, patch: Partial<Order>): Order => {
  const next = { ...order } as Record<string, unknown>
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) delete next[k]
    else next[k] = v
  }
  return next as unknown as Order
}

const NOW = 500
const fresh = o({ status: 'waiting', createdAt: 1 })
const legacyWaiting = o({ status: 'waiting', createdAt: 1, servingAt: 10, announcedAt: 10 })
const serving = o({ status: 'serving', createdAt: 1, servingAt: 100, announcedAt: 100 })
const skipped = o({ status: 'skipped', createdAt: 1, servingAt: 100, announcedAt: 100 })

const cases: Array<[string, Order, Partial<Order> | null]> = [
  ['callNext on a fresh waiting order', fresh, callNext([fresh], 'A', NOW)?.patch ?? null],
  ['callNext on a waiting order carrying stale timestamps', legacyWaiting, callNext([legacyWaiting], 'A', NOW)?.patch ?? null],
  ['callSpecific on a fresh waiting order', fresh, callSpecific(fresh, NOW)],
  ['markDone on a serving order', serving, markDone(serving, NOW)],
  ['skip on a serving order', serving, skip(serving)],
  ['recall on a skipped order', skipped, recall(skipped, NOW)],
  ['reannounce on a serving order', serving, reannounce(serving, NOW)],
  ['cancel on a waiting order', fresh, cancel('ลูกค้าเปลี่ยนใจ')],
  ['cancel on a serving order', serving, cancel('ของหมด')],
]

test.each(cases)('undo round-trips %s', (_name, order, patch) => {
  expect(patch).not.toBeNull()
  const before = orderSnapshot(order)
  const after = write(order, patch as Partial<Order>)
  expect(after).not.toStrictEqual(order)          // the action really changed something
  expect(write(after, before)).toStrictEqual(order)
})
