import { defaultSelections, optionPriceDelta, lineUnitPrice, selectedOptionLabels } from './options'
import type { Product } from '../domain/types'

const drink: Product = {
  sku: 'd', boothId: 'drinks', name: 'โยเกิร์ต', nameEn: 'Yogurt', price: 35, cost: 14, active: true,
  optionGroups: [
    { id: 'sweet', name: 'ความหวาน', nameEn: 'Sweetness', required: true, choices: [
      { id: 'sweet-normal', name: 'หวานปกติ', nameEn: 'Normal', priceDelta: 0 },
      { id: 'sweet-low', name: 'หวานน้อย', nameEn: 'Less', priceDelta: 0 },
    ] },
    { id: 'topping', name: 'ท็อปปิ้ง', nameEn: 'Topping', required: false, choices: [
      { id: 'topping-none', name: 'ไม่ใส่', nameEn: 'None', priceDelta: 0 },
      { id: 'topping-boba', name: 'ไข่มุกป็อป', nameEn: 'Popping boba', priceDelta: 10 },
    ] },
  ],
}
const plain: Product = { sku: 'p', boothId: 'photo', name: 'x', nameEn: 'x', price: 35, cost: 8, active: true }

test('defaultSelections picks the first choice of each group', () => {
  expect(defaultSelections(drink)).toEqual({ sweet: 'sweet-normal', topping: 'topping-none' })
  expect(defaultSelections(plain)).toEqual({})
})

test('optionPriceDelta sums the chosen choices', () => {
  expect(optionPriceDelta(drink, { sweet: 'sweet-low', topping: 'topping-boba' })).toBe(10)
  expect(optionPriceDelta(drink, defaultSelections(drink))).toBe(0)
})

test('lineUnitPrice adds the delta to the base price', () => {
  expect(lineUnitPrice(drink, { sweet: 'sweet-normal', topping: 'topping-boba' })).toBe(45)
  expect(lineUnitPrice(plain, {})).toBe(35)
})

test('selectedOptionLabels records only non-default (non-first) choices', () => {
  expect(selectedOptionLabels(drink, { sweet: 'sweet-normal', topping: 'topping-none' })).toEqual([])
  expect(selectedOptionLabels(drink, { sweet: 'sweet-low', topping: 'topping-boba' })).toEqual([
    { label: 'หวานน้อย', priceDelta: 0 },
    { label: 'ไข่มุกป็อป', priceDelta: 10 },
  ])
})
