import type { Product, OrderItem, Selections } from '../domain/types'
import { lineUnitPrice, selectedOptionLabels } from './options'

export interface CartLine {
  sku: string
  qty: number
  selections: Selections
}
export type Cart = CartLine[]

export function lineKey(sku: string, selections: Selections): string {
  const parts = Object.keys(selections).sort().map((k) => `${k}=${selections[k]}`)
  return `${sku}|${parts.join('&')}`
}

export function addToCart(cart: Cart, sku: string, selections: Selections = {}): Cart {
  const key = lineKey(sku, selections)
  const existing = cart.find((l) => lineKey(l.sku, l.selections) === key)
  if (existing) return cart.map((l) => (lineKey(l.sku, l.selections) === key ? { ...l, qty: l.qty + 1 } : l))
  return [...cart, { sku, qty: 1, selections }]
}

export function setQty(cart: Cart, key: string, qty: number): Cart {
  if (qty <= 0) return removeFromCart(cart, key)
  return cart.map((l) => (lineKey(l.sku, l.selections) === key ? { ...l, qty } : l))
}

export function removeFromCart(cart: Cart, key: string): Cart {
  return cart.filter((l) => lineKey(l.sku, l.selections) !== key)
}

export function cartToOrderItems(cart: Cart, products: Product[]): OrderItem[] {
  return cart
    .map((l) => {
      const p = products.find((x) => x.sku === l.sku)
      if (!p) return null
      const unitPrice = lineUnitPrice(p, l.selections)
      const options = selectedOptionLabels(p, l.selections)
      const item: OrderItem = { sku: p.sku, name: p.name, qty: l.qty, unitPrice, subtotal: unitPrice * l.qty }
      return options.length > 0 ? { ...item, options } : item
    })
    .filter((x): x is OrderItem => x !== null)
}

export function cartTotal(cart: Cart, products: Product[]): number {
  return cartToOrderItems(cart, products).reduce((s, it) => s + it.subtotal, 0)
}
