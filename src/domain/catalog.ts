import type { Product, BoothId, OptionGroup } from './types'

const SWEET: OptionGroup = {
  id: 'sweet', name: 'ความหวาน', nameEn: 'Sweetness', required: true,
  choices: [
    { id: 'sweet-normal', name: 'หวานปกติ', nameEn: 'Normal', priceDelta: 0 },
    { id: 'sweet-low', name: 'หวานน้อย', nameEn: 'Less sweet', priceDelta: 0 },
    { id: 'sweet-high', name: 'หวานมาก', nameEn: 'Extra sweet', priceDelta: 0 },
  ],
}

const TOPPING: OptionGroup = {
  id: 'topping', name: 'ท็อปปิ้ง', nameEn: 'Topping', required: false,
  choices: [
    { id: 'topping-none', name: 'ไม่ใส่', nameEn: 'None', priceDelta: 0 },
    { id: 'topping-boba', name: 'ไข่มุกป็อป', nameEn: 'Popping boba', priceDelta: 10 },
    { id: 'topping-whip', name: 'วิปครีม', nameEn: 'Whipped cream', priceDelta: 10 },
  ],
}

export const CATALOG: Record<BoothId, Product[]> = {
  photo: [
    { sku: 'photo-set', boothId: 'photo', name: 'ถ่าย 3 ช็อต (2 ใบ)', nameEn: 'Photo set (2 prints)', price: 35, cost: 7.86, active: true },
  ],
  portrait: [
    { sku: 'portrait-caricature', boothId: 'portrait', name: 'วาดล้อเลียน', nameEn: 'Caricature', price: 25, cost: 3, active: true },
  ],
  drinks: [
    { sku: 'drink-strawberry-yogurt', boothId: 'drinks', name: 'สตรอเบอร์รี่โยเกิร์ตปั่น', nameEn: 'Strawberry yogurt smoothie', price: 35, cost: 14, active: true, optionGroups: [SWEET, TOPPING] },
    { sku: 'drink-strawberry-milk', boothId: 'drinks', name: 'สตรอเบอร์รี่นมสดปั่น', nameEn: 'Strawberry milk smoothie', price: 25, cost: 10, active: true, optionGroups: [SWEET, TOPPING] },
  ],
}

export function productsForBooth(boothId: BoothId): Product[] {
  return CATALOG[boothId].filter((p) => p.active)
}
