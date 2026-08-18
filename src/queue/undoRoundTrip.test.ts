import { describe, test, expect } from 'vitest'
import * as Q from './queueActions'
import type { Order } from '../domain/types'

// Applies a patch the way Firestore applies one through updateOrderStatus:
// a key with a value overwrites, a key whose value is undefined deletes the field
// (ordersRepo maps undefined -> deleteField(); ordersRepo.test.ts pins that mapping).
const write = (order: Order, patch: Partial<Order>): Order => {
  // goes through Record because a stored document is untyped: deleting a key that Order
  // declares as required is exactly what we are simulating, so the cast back is deliberate.
  const next: Record<string, unknown> = { ...order }
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) delete next[key]
    else next[key] = value
  }
  return next as unknown as Order
}

const base = (over: Partial<Order>): Order => ({
  id: 'o1', boothId: 'drinks', queueNumber: 'A1', station: 'A', items: [], total: 30,
  paymentMethod: 'cash', paymentStatus: 'paid', status: 'waiting', createdAt: 1, ...over,
})

const NOW = 9000

// Every action, in every state a staff member can actually reach it from.
const cases: { name: string; order: Order; act: (o: Order) => Partial<Order> | null }[] = [
  {
    name: 'callNext on a waiting order that has never been called',
    order: base({ status: 'waiting' }),
    act: (o) => Q.callNext([o], 'A', NOW)?.patch ?? null,
  },
  {
    name: 'callNext on a waiting order that still carries timestamps from an earlier call',
    order: base({ status: 'waiting', servingAt: 10, announcedAt: 20 }),
    act: (o) => Q.callNext([o], 'A', NOW)?.patch ?? null,
  },
  {
    name: 'callSpecific on a waiting order that has never been called',
    order: base({ status: 'waiting' }),
    act: (o) => Q.callSpecific(o, NOW),
  },
  {
    name: 'callSpecific on a waiting order that still carries timestamps from an earlier call',
    order: base({ status: 'waiting', servingAt: 10, announcedAt: 20 }),
    act: (o) => Q.callSpecific(o, NOW),
  },
  {
    name: 'markDone on a serving order',
    order: base({ status: 'serving', servingAt: 10, announcedAt: 20 }),
    act: (o) => Q.markDone(o, NOW),
  },
  {
    name: 'skip on a serving order',
    order: base({ status: 'serving', servingAt: 10, announcedAt: 20 }),
    act: (o) => Q.skip(o),
  },
  {
    name: 'recall on a skipped order',
    order: base({ status: 'skipped', servingAt: 10, announcedAt: 20 }),
    act: (o) => Q.recall(o, NOW),
  },
  {
    name: 'reannounce on a serving order',
    order: base({ status: 'serving', servingAt: 10, announcedAt: 20 }),
    act: (o) => Q.reannounce(o, NOW),
  },
  {
    name: 'cancel on a waiting order',
    order: base({ status: 'waiting' }),
    act: () => Q.cancel('ลูกค้าเปลี่ยนใจ'),
  },
  {
    name: 'cancel on a serving order',
    order: base({ status: 'serving', servingAt: 10, announcedAt: 20 }),
    act: () => Q.cancel('ของหมด'),
  },
]

describe('undo round-trip: action -> undo restores the order exactly', () => {
  for (const c of cases) {
    test(c.name, () => {
      const patch = c.act(c.order)
      expect(patch).not.toBeNull()

      // snapshot is taken before the write, exactly as QueuePanel.apply() does it
      const snapshot = Q.orderSnapshot(c.order)
      const after = write(c.order, patch as Partial<Order>)

      // the action must actually have changed something, or the round-trip proves nothing
      expect(after).not.toStrictEqual(c.order)

      expect(write(after, snapshot)).toStrictEqual(c.order)
    })
  }
})
