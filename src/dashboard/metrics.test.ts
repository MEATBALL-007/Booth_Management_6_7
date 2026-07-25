import { computeDashboardMetrics } from './metrics'
import type { Order, Expense } from '../domain/types'

const o = (over: Partial<Order>): Order => ({
  id: 'x', boothId: 'drinks', queueNumber: 'A1', station: 'A',
  items: [{ sku: 'a', name: 'A', qty: 1, unitPrice: 30, subtotal: 30 }],
  total: 30, paymentMethod: 'cash', paymentStatus: 'paid', status: 'done', createdAt: 1, ...over,
})

test('only paid, non-cancelled orders count as revenue', () => {
  const m = computeDashboardMetrics([
    o({ id: '1', total: 30, paymentStatus: 'paid', status: 'done' }),
    o({ id: '2', total: 25, paymentStatus: 'pending', status: 'waiting' }), // unpaid → excluded
    o({ id: '3', total: 99, paymentStatus: 'paid', status: 'cancelled' }),  // cancelled → excluded
  ], [])
  expect(m.totalSales).toBe(30)
  expect(m.paidOrderCount).toBe(1)
})

test('cash vs qr split and expected cash = cash subset', () => {
  const m = computeDashboardMetrics([
    o({ id: '1', total: 30, paymentMethod: 'cash' }),
    o({ id: '2', total: 25, paymentMethod: 'qr' }),
    o({ id: '3', total: 10, paymentMethod: 'cash' }),
  ], [])
  expect(m.cashTotal).toBe(40)
  expect(m.qrTotal).toBe(25)
  expect(m.expectedCash).toBe(40)
})

test('byBooth sums revenue per booth with all booths present', () => {
  const m = computeDashboardMetrics([
    o({ id: '1', boothId: 'photo', total: 35 }),
    o({ id: '2', boothId: 'drinks', total: 30 }),
    o({ id: '3', boothId: 'drinks', total: 25 }),
  ], [])
  expect(m.byBooth).toEqual({ photo: 35, portrait: 0, drinks: 55 })
})

test('doneCount counts done orders regardless of the revenue filter', () => {
  const m = computeDashboardMetrics([
    o({ id: '1', status: 'done' }),
    o({ id: '2', status: 'serving' }),
    o({ id: '3', status: 'done' }),
  ], [])
  expect(m.doneCount).toBe(2)
})

test('bestSellers aggregates items by sku, sorted by qty desc', () => {
  const m = computeDashboardMetrics([
    o({ id: '1', items: [{ sku: 'a', name: 'A', qty: 2, unitPrice: 30, subtotal: 60 }], total: 60 }),
    o({ id: '2', items: [
      { sku: 'a', name: 'A', qty: 1, unitPrice: 30, subtotal: 30 },
      { sku: 'b', name: 'B', qty: 5, unitPrice: 25, subtotal: 125 },
    ], total: 155 }),
  ], [])
  expect(m.bestSellers).toEqual([
    { sku: 'b', name: 'B', qty: 5, sales: 125 },
    { sku: 'a', name: 'A', qty: 3, sales: 90 },
  ])
})

test('totalCost, netDonation reflect expenses', () => {
  const expenses: Expense[] = [
    { id: 'e1', boothId: 'photo', description: 'ฟิล์ม', amount: 200, createdAt: 1 },
    { id: 'e2', boothId: 'drinks', description: 'ยาคูลท์', amount: 50, createdAt: 2 },
  ]
  const m = computeDashboardMetrics([o({ id: '1', total: 300 })], expenses)
  expect(m.totalCost).toBe(250)
  expect(m.netDonation).toBe(50)
})

test('empty input yields zeroed metrics', () => {
  const m = computeDashboardMetrics([], [])
  expect(m).toMatchObject({ totalSales: 0, cashTotal: 0, qrTotal: 0, paidOrderCount: 0, doneCount: 0, totalCost: 0, netDonation: 0, expectedCash: 0, bestSellers: [] })
  expect(m.byBooth).toEqual({ photo: 0, portrait: 0, drinks: 0 })
})
