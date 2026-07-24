import type { Product, OrderItem } from '../domain/types'

export type Cart = { sku: string; qty: number }[]

export function addToCart(cart: Cart, sku: string): Cart {
  const existing = cart.find((l) => l.sku === sku)
  if (existing) return cart.map((l) => (l.sku === sku ? { ...l, qty: l.qty + 1 } : l))
  return [...cart, { sku, qty: 1 }]
}

export function setQty(cart: Cart, sku: string, qty: number): Cart {
  if (qty <= 0) return removeFromCart(cart, sku)
  return cart.map((l) => (l.sku === sku ? { ...l, qty } : l))
}

export function removeFromCart(cart: Cart, sku: string): Cart {
  return cart.filter((l) => l.sku !== sku)
}

function priceOf(products: Product[], sku: string): Product | undefined {
  return products.find((p) => p.sku === sku)
}

export function cartToOrderItems(cart: Cart, products: Product[]): OrderItem[] {
  return cart
    .map((l) => {
      const p = priceOf(products, l.sku)
      if (!p) return null
      return { sku: p.sku, name: p.name, qty: l.qty, unitPrice: p.price, subtotal: p.price * l.qty }
    })
    .filter((x): x is OrderItem => x !== null)
}

export function cartTotal(cart: Cart, products: Product[]): number {
  return cartToOrderItems(cart, products).reduce((s, it) => s + it.subtotal, 0)
}
