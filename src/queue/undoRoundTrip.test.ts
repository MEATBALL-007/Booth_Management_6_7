import { test, expect } from 'vitest'
import * as Q from './queueActions'
import type { Order } from '../domain/types'

// Acceptance criterion (2026-08-04-queue-pro-upgrade-design.md):
//   "Undo: ทำ action ใดๆ แล้วกดย้อนกลับ → order คืนสถานะ+เวลาเดิม (ครบทุก action)"
// Proven here as a round trip: action -> apply patch -> apply undo snapshot ->
// the order must be deeply identical to what it was, with no field left behind.

const o = (over: Partial<Order>): Order => ({
  id: 'x', boothId: 'drinks', queueNumber: 'A1', station: 'A', items: [], total: 0,
  paymentMethod: 'cash', paymentStatus: 'paid', status: 'waiting', createdAt: 1, ...over,
})

const NOW = 1000

// Firestore write semantics, exactly as ordersRepo.updateOrderStatus performs them:
// a key with a value overwrites, a key holding `undefined` deletes the field
// (deleteField()), and a key that is absent is left alone — updateDoc merges.
// The `undefined -> deleteField()` half is pinned by ordersRepo.test.ts.
const write = (order: Order, patch: Partial<Order>): Order => {
  const next: Record<string, unknown> = { ...order }
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) delete next[k]
    else next[k] = v
  }
  return next as unknown as Order
}

const served = { servingAt: 300, announcedAt: 300 }

const cases: { name: string; action: string; before: Order; run: (order: Order) => Partial<Order> | null }[] = [
  { name: 'เรียกคิวถัดไป on a queue number that has never been called', action: 'callNext',
    before: o({ status: 'waiting' }),
    run: (order) => Q.callNext([order], order.station, NOW)?.patch ?? null },
  { name: 'เรียกคิวถัดไป on a waiting order still carrying timestamps from an earlier call', action: 'callNext',
    before: o({ status: 'waiting', ...served }),
    run: (order) => Q.callNext([order], order.station, NOW)?.patch ?? null },
  { name: 'เรียก (เจาะจง) on a queue number that has never been called', action: 'callSpecific',
    before: o({ status: 'waiting' }),
    run: (order) => Q.callSpecific(order, NOW) },
  { name: 'เสร็จ on a serving order', action: 'markDone',
    before: o({ status: 'serving', ...served }),
    run: (order) => Q.markDone(order, NOW) },
  { name: 'ข้าม on a serving order', action: 'skip',
    before: o({ status: 'serving', ...served }),
    run: (order) => Q.skip(order) },
  { name: 'เรียกซ้ำ on a skipped order', action: 'recall',
    before: o({ status: 'skipped', ...served }),
    run: (order) => Q.recall(order, NOW) },
  { name: 'ประกาศซ้ำ on a serving order', action: 'reannounce',
    before: o({ status: 'serving', ...served }),
    run: (order) => Q.reannounce(order, NOW) },
  { name: 'ยกเลิก on a waiting order', action: 'cancel',
    before: o({ status: 'waiting' }),
    run: () => Q.cancel('ลูกค้าเปลี่ยนใจ') },
  { name: 'ยกเลิก on a serving order', action: 'cancel',
    before: o({ status: 'serving', ...served }),
    run: () => Q.cancel('ของหมด') },
]

test.each(cases)('undo of $name restores the order exactly', ({ before, run }) => {
  const patch = run(before)
  expect(patch).not.toBeNull()

  // snapshot is taken before the write, the way QueuePanel.apply() does it
  const snapshot = Q.orderSnapshot(before)
  const after = write(before, patch!)
  expect(after).not.toStrictEqual(before)          // the action really did something

  expect(write(after, snapshot)).toStrictEqual(before)
})

test('every queue action has a round-trip case (ครบทุก action)', () => {
  const actions = Object.keys(Q).filter((name) => name !== 'orderSnapshot')
  expect([...new Set(cases.map((c) => c.action))].sort()).toEqual(actions.sort())
})
