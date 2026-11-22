import type { Order, OrderStatus, Station } from '../domain/types'

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
  const trimmed = reason.trim()
  if (!trimmed) return null
  return { status: 'cancelled', cancelReason: trimmed }
}

/**
 * Everything an action above is able to write. Undo replays this as a patch, so
 * it has to name every field — including the ones the order does not have.
 * `updateDoc` merges: a field left out of the patch keeps whatever the action
 * put there, which is how an undone "เสร็จ" used to leave `doneAt` behind. An
 * `undefined` here means "this order had no such field"; the repo layer turns
 * that into a `deleteField()` sentinel.
 */
export interface OrderSnapshot {
  status: OrderStatus
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
