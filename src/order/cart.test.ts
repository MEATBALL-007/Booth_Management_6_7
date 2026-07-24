import { addToCart, setQty, removeFromCart, cartTotal, cartToOrderItems, type Cart } from './cart'
import type { Product } from '../domain/types'

const PRODUCTS: Product[] = [
  { sku: 'a', boothId: 'drinks', name: 'A', nameEn: 'A', price: 30, cost: 12, active: true },
  { sku: 'b', boothId: 'drinks', name: 'B', nameEn: 'B', price: 25, cost: 9, active: true },
]

test('addToCart adds new sku at qty 1 then increments', () => {
  let cart: Cart = []
  cart = addToCart(cart, 'a')
  expect(cart).toEqual([{ sku: 'a', qty: 1 }])
  cart = addToCart(cart, 'a')
  expect(cart).toEqual([{ sku: 'a', qty: 2 }])
})

test('setQty updates qty and removes at qty <= 0', () => {
  let cart: Cart = [{ sku: 'a', qty: 3 }]
  cart = setQty(cart, 'a', 5)
  expect(cart).toEqual([{ sku: 'a', qty: 5 }])
  cart = setQty(cart, 'a', 0)
  expect(cart).toEqual([])
})

test('removeFromCart drops the sku', () => {
  expect(removeFromCart([{ sku: 'a', qty: 2 }, { sku: 'b', qty: 1 }], 'a')).toEqual([{ sku: 'b', qty: 1 }])
})

test('cartTotal sums qty * price, ignoring unknown skus', () => {
  const cart: Cart = [{ sku: 'a', qty: 2 }, { sku: 'b', qty: 1 }, { sku: 'zzz', qty: 9 }]
  expect(cartTotal(cart, PRODUCTS)).toBe(85) // 2*30 + 1*25
})

test('cartToOrderItems maps to snapshot line items with subtotal', () => {
  const cart: Cart = [{ sku: 'a', qty: 2 }]
  expect(cartToOrderItems(cart, PRODUCTS)).toEqual([
    { sku: 'a', name: 'A', qty: 2, unitPrice: 30, subtotal: 60 },
  ])
})
