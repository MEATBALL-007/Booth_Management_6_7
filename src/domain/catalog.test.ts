import { CATALOG, productsForBooth } from './catalog'

test('CATALOG is keyed by the three booths', () => {
  expect(Object.keys(CATALOG).sort()).toEqual(['drinks', 'photo', 'portrait'])
})

test('catalog has the spec prices and costs per booth', () => {
  expect(productsForBooth('photo')).toEqual([
    { sku: 'photo-set', boothId: 'photo', name: 'ถ่าย 3 ช็อต (2 ใบ)', nameEn: 'Photo set (2 prints)', price: 35, cost: 7.86, active: true },
  ])
  expect(productsForBooth('portrait')[0].price).toBe(25)
  expect(productsForBooth('portrait')[0].cost).toBe(3)
})

test('drinks menu is the strawberry line-up with option groups', () => {
  const drinks = productsForBooth('drinks')
  expect(drinks.map((d) => d.sku)).toEqual(['drink-strawberry-yogurt', 'drink-strawberry-milk'])
  expect(drinks.map((d) => d.price)).toEqual([35, 25])
  expect(drinks.map((d) => d.cost)).toEqual([14, 10])
  // both drinks carry sweetness + topping groups
  for (const d of drinks) {
    expect(d.optionGroups?.map((g) => g.id)).toEqual(['sweet', 'topping'])
  }
  // topping deltas
  const topping = drinks[0].optionGroups!.find((g) => g.id === 'topping')!
  expect(topping.choices.map((c) => c.priceDelta)).toEqual([0, 10, 10])
})

test('productsForBooth returns only active products', () => {
  for (const boothId of ['photo', 'portrait', 'drinks'] as const) {
    expect(productsForBooth(boothId).every((p) => p.active)).toBe(true)
  }
})
