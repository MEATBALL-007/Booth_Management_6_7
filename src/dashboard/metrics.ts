import type { Order, Expense, BoothId } from '../domain/types'
import { BOOTH_IDS } from '../domain/types'

export interface BestSeller {
  sku: string
  name: string
  qty: number
  sales: number
}

export interface DashboardMetrics {
  totalSales: number
  byBooth: Record<BoothId, number>
  cashTotal: number
  qrTotal: number
  paidOrderCount: number
  doneCount: number
  bestSellers: BestSeller[]
  totalCost: number
  netDonation: number
  expectedCash: number
}

function isRevenue(o: Order): boolean {
  return o.paymentStatus === 'paid' && o.status !== 'cancelled'
}

export function computeDashboardMetrics(orders: Order[], expenses: Expense[]): DashboardMetrics {
  const byBooth = Object.fromEntries(BOOTH_IDS.map((b) => [b, 0])) as Record<BoothId, number>
  const sellers = new Map<string, BestSeller>()
  let totalSales = 0
  let cashTotal = 0
  let qrTotal = 0
  let expectedCash = 0
  let paidOrderCount = 0

  for (const order of orders) {
    if (!isRevenue(order)) continue
    paidOrderCount += 1
    totalSales += order.total
    byBooth[order.boothId] += order.total
    if (order.paymentMethod === 'cash') {
      cashTotal += order.total
      expectedCash += order.total
    } else if (order.paymentMethod === 'qr') {
      qrTotal += order.total
    }
    for (const item of order.items) {
      const acc = sellers.get(item.sku) ?? { sku: item.sku, name: item.name, qty: 0, sales: 0 }
      acc.qty += item.qty
      acc.sales += item.subtotal
      sellers.set(item.sku, acc)
    }
  }

  const totalCost = expenses.reduce((sum, e) => sum + e.amount, 0)
  const bestSellers = [...sellers.values()].sort((a, b) => b.qty - a.qty)
  const doneCount = orders.filter((o) => o.status === 'done').length

  return {
    totalSales,
    byBooth,
    cashTotal,
    qrTotal,
    paidOrderCount,
    doneCount,
    bestSellers,
    totalCost,
    netDonation: totalSales - totalCost,
    expectedCash,
  }
}
