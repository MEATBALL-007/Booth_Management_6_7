import { addToCart, setQty, removeFromCart, cartTotal, cartToOrderItems, lineKey, type Cart } from './cart'
import type { Product } from '../domain/types'

const DRINK: Product = {
  sku: 'd', boothId: 'drinks', name: 'โยเกิร์ต', nameEn: 'Yogurt', price: 35, cost: 14, active: true,
  optionGroups: [
    { id: 'topping', name: 'ท็อปปิ้ง', nameEn: 'Topping', required: false, choices: [
      { id: 'topping-none', name: 'ไม่ใส่', nameEn: 'None', priceDelta: 0 },
      { id: 'topping-boba', name: 'ไข่มุกป็อป', nameEn: 'Popping boba', priceDelta: 10 },
    ] },
  ],
}
const PLAIN: Product = { sku: 'p', boothId: 'photo', name: 'ภาพ', nameEn: 'Photo', price: 35, cost: 8, active: true }
const PRODUCTS = [DRINK, PLAIN]

test('same sku + same selections stacks into one line', () => {
  let cart: Cart = []
  cart = addToCart(cart, 'p', {})
  cart = addToCart(cart, 'p', {})
  expect(cart).toEqual([{ sku: 'p', qty: 2, selections: {} }])
})

test('same sku + different selections are separate lines', () => {
  let cart: Cart = []
  cart = addToCart(cart, 'd', { topping: 'topping-none' })
  cart = addToCart(cart, 'd', { topping: 'topping-boba' })
  expect(cart).toHaveLength(2)
})

test('cartTotal applies option price deltas', () => {
  const cart: Cart = [
    { sku: 'd', qty: 1, selections: { topping: 'topping-boba' } }, // 35 + 10
    { sku: 'p', qty: 2, selections: {} },                           // 35 * 2
  ]
  expect(cartTotal(cart, PRODUCTS)).toBe(45 + 70)
})

test('cartToOrderItems bakes option price into subtotal and records non-default options', () => {
  const cart: Cart = [{ sku: 'd', qty: 2, selections: { topping: 'topping-boba' } }]
  expect(cartToOrderItems(cart, PRODUCTS)).toEqual([
    { sku: 'd', name: 'โยเกิร์ต', qty: 2, unitPrice: 45, subtotal: 90, options: [{ label: 'ไข่มุกป็อป', priceDelta: 10 }] },
  ])
})

test('a default (no-option) line records no options field', () => {
  const cart: Cart = [{ sku: 'd', qty: 1, selections: { topping: 'topping-none' } }]
  const items = cartToOrderItems(cart, PRODUCTS)
  expect('options' in items[0]).toBe(false)
})

test('setQty and removeFromCart operate by line key', () => {
  const key = lineKey('d', { topping: 'topping-boba' })
  let cart: Cart = [{ sku: 'd', qty: 1, selections: { topping: 'topping-boba' } }]
  cart = setQty(cart, key, 4)
  expect(cart[0].qty).toBe(4)
  cart = removeFromCart(cart, key)
  expect(cart).toEqual([])
})
