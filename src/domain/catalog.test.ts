import { CATALOG, productsForBooth } from './catalog'

test('catalog has the spec prices and costs per booth', () => {
  expect(productsForBooth('photo')).toEqual([
    { sku: 'photo-set', boothId: 'photo', name: 'ถ่าย 3 ช็อต (2 ใบ)', nameEn: 'Photo set (2 prints)', price: 35, cost: 7.86, active: true },
  ])
  expect(productsForBooth('portrait')[0].price).toBe(25)
  expect(productsForBooth('portrait')[0].cost).toBe(3)

  const drinks = productsForBooth('drinks')
  expect(drinks.map((d) => d.price)).toEqual([30, 25])
  expect(drinks.map((d) => d.cost)).toEqual([12, 9])
})

test('productsForBooth returns only active products', () => {
  for (const boothId of ['photo', 'portrait', 'drinks'] as const) {
    expect(productsForBooth(boothId).every((p) => p.active)).toBe(true)
  }
})
