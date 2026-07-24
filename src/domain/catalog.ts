import type { Product, BoothId } from './types'

export const CATALOG: Record<BoothId, Product[]> = {
  photo: [
    { sku: 'photo-set', boothId: 'photo', name: 'ถ่าย 3 ช็อต (2 ใบ)', nameEn: 'Photo set (2 prints)', price: 35, cost: 7.86, active: true },
  ],
  portrait: [
    { sku: 'portrait-caricature', boothId: 'portrait', name: 'วาดล้อเลียน', nameEn: 'Caricature', price: 25, cost: 3, active: true },
  ],
  drinks: [
    { sku: 'drink-yakult-pipo', boothId: 'drinks', name: 'ยาคูลท์ปีโป้ปั่น', nameEn: 'Yakult-Pipo blended', price: 30, cost: 12, active: true },
    { sku: 'drink-soda', boothId: 'drinks', name: 'น้ำอัดลมปั่น', nameEn: 'Soda blended', price: 25, cost: 9, active: true },
  ],
}

export function productsForBooth(boothId: BoothId): Product[] {
  return CATALOG[boothId].filter((p) => p.active)
}
