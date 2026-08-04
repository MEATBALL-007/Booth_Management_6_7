export const BOOTH_IDS = ['photo', 'portrait', 'drinks'] as const
export const MODES = ['order', 'display', 'dashboard'] as const
export const STATIONS = ['A', 'B', 'C'] as const

export type BoothId = (typeof BOOTH_IDS)[number]
export type Mode = (typeof MODES)[number]
export type Station = (typeof STATIONS)[number]

export type PaymentMethod = 'cash' | 'qr'
export type PaymentStatus = 'pending' | 'paid'
export type OrderStatus = 'waiting' | 'serving' | 'done' | 'cancelled' | 'skipped'

export interface OptionChoice {
  id: string
  name: string
  nameEn: string
  priceDelta: number
}

export interface OptionGroup {
  id: string
  name: string
  nameEn: string
  required: boolean
  choices: OptionChoice[]
}

export type Selections = Record<string, string>

export interface OrderItem {
  sku: string
  name: string
  qty: number
  unitPrice: number
  subtotal: number
  options?: { label: string; priceDelta: number }[]
}

export interface Order {
  id: string
  boothId: BoothId
  queueNumber: string
  station: Station
  items: OrderItem[]
  total: number
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  status: OrderStatus
  staffName?: string
  servedBy?: string
  cancelReason?: string
  createdAt: number
  paidAt?: number
  announcedAt?: number
  servingAt?: number
  doneAt?: number
}

export interface Product {
  sku: string
  boothId: BoothId
  name: string
  nameEn: string
  price: number
  cost: number
  active: boolean
  optionGroups?: OptionGroup[]
}

export interface Expense {
  id: string
  boothId: BoothId
  description: string
  amount: number
  createdAt: number
}

export interface InventoryItem {
  id: string
  boothId: BoothId
  name: string
  unit: string
  stock: number
  lowThreshold: number
  linkedSku?: string
}

export interface GlobalConfig {
  promptpayId: string
  dashboardPin: string
  donationTarget?: number
}
