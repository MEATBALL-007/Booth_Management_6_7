import type { Order } from '../domain/types'

export function servingOrders(orders: Order[]): Order[] {
  return orders.filter((o) => o.status === 'serving')
}

export function upNextOrders(orders: Order[]): Order[] {
  return orders.filter((o) => o.status === 'waiting').sort((a, b) => a.createdAt - b.createdAt)
}

export function newlyServing(prev: string[], next: string[]): string[] {
  const seen = new Set(prev)
  return next.filter((n) => !seen.has(n))
}
