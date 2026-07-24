import { buildOrder } from './buildOrder'
import type { OrderItem } from '../domain/types'

const ITEMS: OrderItem[] = [
  { sku: 'a', name: 'A', qty: 2, unitPrice: 30, subtotal: 60 },
  { sku: 'b', name: 'B', qty: 1, unitPrice: 25, subtotal: 25 },
]

test('builds a paid, waiting order with computed total and timestamps', () => {
  const order = buildOrder({
    boothId: 'drinks', station: 'A', queueNumber: 'A1',
    items: ITEMS, paymentMethod: 'qr', now: 1000,
  })
  expect(order.total).toBe(85)
  expect(order.paymentStatus).toBe('paid')
  expect(order.status).toBe('waiting')
  expect(order.paymentMethod).toBe('qr')
  expect(order.queueNumber).toBe('A1')
  expect(order.createdAt).toBe(1000)
  expect(order.paidAt).toBe(1000)
})

test('omits staffName when not provided (no undefined for Firestore)', () => {
  const order = buildOrder({
    boothId: 'photo', station: 'B', queueNumber: 'B1',
    items: ITEMS, paymentMethod: 'cash', now: 5,
  })
  expect('staffName' in order).toBe(false)
})

test('includes staffName when provided', () => {
  const order = buildOrder({
    boothId: 'photo', station: 'B', queueNumber: 'B2',
    items: ITEMS, paymentMethod: 'cash', staffName: 'Meatball', now: 5,
  })
  expect(order.staffName).toBe('Meatball')
})
