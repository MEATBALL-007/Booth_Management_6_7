import type { Order, OrderItem, BoothId, Station, PaymentMethod } from '../domain/types'

export interface BuildOrderInput {
  boothId: BoothId
  station: Station
  queueNumber: string
  items: OrderItem[]
  paymentMethod: PaymentMethod
  staffName?: string
  now: number
}

export function buildOrder(input: BuildOrderInput): Omit<Order, 'id'> {
  const total = input.items.reduce((s, it) => s + it.subtotal, 0)
  const base: Omit<Order, 'id'> = {
    boothId: input.boothId,
    queueNumber: input.queueNumber,
    station: input.station,
    items: input.items,
    total,
    paymentMethod: input.paymentMethod,
    paymentStatus: 'paid',
    status: 'waiting',
    createdAt: input.now,
    paidAt: input.now,
  }
  return input.staffName ? { ...base, staffName: input.staffName } : base
}
