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

export function orderSnapshot(order: Order): Partial<Order> {
  const snap: Partial<Order> = { status: order.status }
  if (order.servingAt !== undefined) snap.servingAt = order.servingAt
  if (order.doneAt !== undefined) snap.doneAt = order.doneAt
  if (order.announcedAt !== undefined) snap.announcedAt = order.announcedAt
  if (order.cancelReason !== undefined) snap.cancelReason = order.cancelReason
  return snap
}
