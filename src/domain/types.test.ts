import { BOOTH_IDS, MODES, STATIONS } from './types'
import type { OptionGroup, OptionChoice, Selections, Product, OrderItem } from './types'

test('domain enums match the spec', () => {
  expect(BOOTH_IDS).toEqual(['photo', 'portrait', 'drinks'])
  expect(MODES).toEqual(['order', 'display', 'dashboard'])
  expect(STATIONS).toEqual(['A', 'B', 'C'])
})

test('option types compose into a Product and OrderItem', () => {
  const choice: OptionChoice = { id: 'topping-boba', name: 'ไข่มุกป็อป', nameEn: 'Popping boba', priceDelta: 10 }
  const group: OptionGroup = { id: 'topping', name: 'ท็อปปิ้ง', nameEn: 'Topping', required: false, choices: [choice] }
  const product: Product = { sku: 's', boothId: 'drinks', name: 'x', nameEn: 'x', price: 35, cost: 14, active: true, optionGroups: [group] }
  const sel: Selections = { topping: 'topping-boba' }
  const item: OrderItem = { sku: 's', name: 'x', qty: 1, unitPrice: 45, subtotal: 45, options: [{ label: 'ไข่มุกป็อป', priceDelta: 10 }] }
  expect(product.optionGroups?.[0].choices[0].priceDelta).toBe(10)
  expect(sel.topping).toBe('topping-boba')
  expect(item.options?.[0].priceDelta).toBe(10)
})
