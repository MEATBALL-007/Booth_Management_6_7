import type { Order, Station } from '../domain/types'

export function callNext(orders: Order[], station: Station, now: number): { id: string; patch: Partial<Order> } | null {
  const next = orders
    .filter((o) => o.station === station && o.status === 'waiting')
    .sort((a, b) => a.createdAt - b.createdAt)[0]
  if (!next) return null
  return { id: next.id, patch: { status: 'serving', servingAt: now, announcedAt: now } }
}

export function callSpecific(order: Order, now: number): Partial<Order> | null {
  if (order.status !== 'waiting') return null
  return { status: 'serving', servingAt: now, announcedAt: now }
}

export function markDone(order: Order, now: number): Partial<Order> | null {
  if (order.status !== 'serving') return null
  return { status: 'done', doneAt: now }
}

export function skip(order: Order): Partial<Order> | null {
  if (order.status !== 'serving') return null
  return { status: 'skipped' }
}

export function recall(order: Order, now: number): Partial<Order> | null {
  if (order.status !== 'skipped') return null
  return { status: 'serving', servingAt: now, announcedAt: now }
}

export function reannounce(order: Order, now: number): Partial<Order> | null {
  if (order.status !== 'serving') return null
  return { announcedAt: now }
}

export function cancel(reason: string): Partial<Order> | null {
  const cancelReason = reason.trim()
  if (!cancelReason) return null
  return { status: 'cancelled', cancelReason }
}

/**
 * Everything an action is allowed to touch, so undo can put all of it back.
 * A key holding `undefined` means "this field was absent — remove it again";
 * updateOrderStatus turns that into Firestore's deleteField() sentinel.
 * Listing every key is load-bearing: updateDoc merges, so a field omitted here
 * would survive the undo instead of being reverted.
 */
export interface OrderSnapshot {
  status: Order['status']
  servingAt: number | undefined
  doneAt: number | undefined
  announcedAt: number | undefined
  cancelReason: string | undefined
}

export function orderSnapshot(order: Order): OrderSnapshot {
  return {
    status: order.status,
    servingAt: order.servingAt,
    doneAt: order.doneAt,
    announcedAt: order.announcedAt,
    cancelReason: order.cancelReason,
  }
}
