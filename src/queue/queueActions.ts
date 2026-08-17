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

/** Every field a queue action can touch, so undo can restore all of them. */
export interface OrderSnapshot {
  status: OrderStatus
  servingAt: number | undefined
  doneAt: number | undefined
  announcedAt: number | undefined
  cancelReason: string | undefined
}

/**
 * The undo patch for an order: its state *before* an action runs.
 * Every undoable field is present, and `undefined` means "this field was
 * absent — remove it again". Listing only the fields that happen to have a
 * value is not enough: updateDoc merges, so any field the action introduced
 * would survive the undo (an undone "เรียกคิวถัดไป" left servingAt behind).
 * ordersRepo.updateOrderStatus turns those `undefined`s into deleteField().
 */
export function orderSnapshot(order: Order): OrderSnapshot {
  return {
    status: order.status,
    servingAt: order.servingAt,
    doneAt: order.doneAt,
    announcedAt: order.announcedAt,
    cancelReason: order.cancelReason,
  }
}
