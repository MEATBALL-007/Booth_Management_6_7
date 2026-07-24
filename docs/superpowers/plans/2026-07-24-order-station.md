# Order Station Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Order Station screen end-to-end: pick products from a static per-booth catalog → cart → total → pay (cash or PromptPay QR) → issue a station-prefixed queue number → persist the paid order to Firestore, plus a live queue panel to advance the queue (call next / done / cancel-with-reason).

**Architecture:** All business logic is pure and unit-tested (`src/domain/`, `src/order/`): catalog, cart math, queue-number generation, PromptPay payload, order construction. Firestore is a thin edge (`src/order/ordersRepo.ts`) used only for persistence + realtime subscription, tested with a mocked SDK. React screens compose these. Products are a fixed in-code catalog (offline-trivial, no seeding); temporary price changes come later via the Happy-Hour Firestore override (a P2 extra), not by editing base prices at runtime.

**Tech Stack:** React 19, Vite, TypeScript, Tailwind (PHANTOM CREW), Firebase Firestore (getDb() lazy accessor from Foundation), `promptpay-qr` + `qrcode` for the payment QR, Vitest + @testing-library/react.

## Global Constraints

- **Builds on Foundation (already on `main`):** import `BoothId`/`Mode`/`Station`/`Order`/`Product`/`OrderItem`/`PaymentMethod` etc. from `src/domain/types.ts`; `getDb()` from `src/lib/firebase.ts`; `L`/`BiLabel` from `src/i18n/`; device config from `src/device/deviceConfig.ts`. Do NOT reimplement these.
- **Deps are current majors** (React 19 / Firebase 12 / TS 7 / Vite 8 / Vitest 4) — not React 18. Firestore modular API (`collection`/`addDoc`/`onSnapshot`/`query`/`where`/`orderBy`/`doc`/`updateDoc`) is stable.
- **Firestore stays at the edges.** Only `src/order/ordersRepo.ts` imports `firebase/firestore`. Everything else is pure and testable without Firebase.
- **Queue numbers are station-prefixed and offline-safe:** each Order Station (station A/B/C) counts its own numbers from a per-device localStorage counter keyed by `booth+station` — never a central Firestore counter. Format is `${station}${n}` (e.g. `A7`). This must not require a network round-trip.
- **Prices/costs (spec §7, verbatim):** photo set 35฿ (cost 7.86); caricature 25฿ (cost 3); Yakult-Pipo blended 30฿ (cost 12); soda blended 25฿ (cost 9).
- **PromptPay ID:** `REDACTED-PROMPTPAY-ID`. **Dashboard PIN:** `REDACTED-PIN`.
- **Payment:** cash → confirm "รับเงินแล้ว"; QR → show PromptPay QR for the exact total → confirm "ยืนยันชำระ". Both set `paymentStatus: 'paid'`, `status: 'waiting'` on the created order. QR is generated client-side (works offline).
- **Bilingual:** user-facing labels show Thai + English (follow the Foundation `L`/`BiLabel` pattern — do not regress to Thai-only).
- **Theme:** PHANTOM CREW (orange #FA4616 / yellow #FFC72C / bg #1A1A1A). Queue numbers big + `font-mono`.
- **No undefined fields written to Firestore:** omit optional fields (e.g. `staffName`) when absent rather than writing `undefined`.
- **Testing:** Vitest. Pure logic → plain unit tests. Firestore repo → tests with a mocked `firebase/firestore` + mocked `../lib/firebase`. Components → @testing-library/react with the repo mocked (never hit real Firestore in tests). Commit after each task.

---

### Task 1: App config constants

**Files:**
- Create: `src/domain/appConfig.ts`
- Test: `src/domain/appConfig.test.ts`

**Interfaces:**
- Produces: `APP_CONFIG` with `promptpayId: string` and `dashboardPin: string`.

- [ ] **Step 1: Write the failing test `src/domain/appConfig.test.ts`**

```ts
import { APP_CONFIG } from './appConfig'

test('app config holds the exact PromptPay id and dashboard PIN', () => {
  expect(APP_CONFIG.promptpayId).toBe('REDACTED-PROMPTPAY-ID')
  expect(APP_CONFIG.dashboardPin).toBe('REDACTED-PIN')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/appConfig.test.ts`
Expected: FAIL — `src/domain/appConfig.ts` does not exist.

- [ ] **Step 3: Create `src/domain/appConfig.ts`**

```ts
export const APP_CONFIG = {
  promptpayId: 'REDACTED-PROMPTPAY-ID',
  dashboardPin: 'REDACTED-PIN',
} as const
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/appConfig.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add app config constants (promptpay id, dashboard pin)"
```

---

### Task 2: Static product catalog

**Files:**
- Create: `src/domain/catalog.ts`
- Test: `src/domain/catalog.test.ts`

**Interfaces:**
- Consumes: `Product`, `BoothId` from `src/domain/types.ts`.
- Produces: `CATALOG: Record<BoothId, Product[]>`; `productsForBooth(boothId: BoothId): Product[]` (active only).

- [ ] **Step 1: Write the failing test `src/domain/catalog.test.ts`**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/catalog.test.ts`
Expected: FAIL — `src/domain/catalog.ts` does not exist.

- [ ] **Step 3: Create `src/domain/catalog.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/catalog.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add static per-booth product catalog"
```

---

### Task 3: Cart logic (pure)

**Files:**
- Create: `src/order/cart.ts`
- Test: `src/order/cart.test.ts`

**Interfaces:**
- Consumes: `Product`, `OrderItem` from `src/domain/types.ts`.
- Produces: `type Cart = { sku: string; qty: number }[]`; `addToCart(cart, sku): Cart`; `setQty(cart, sku, qty): Cart` (qty≤0 removes); `removeFromCart(cart, sku): Cart`; `cartTotal(cart, products): number`; `cartToOrderItems(cart, products): OrderItem[]`. Unknown skus are ignored in total/items.

- [ ] **Step 1: Write the failing test `src/order/cart.test.ts`**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/order/cart.test.ts`
Expected: FAIL — `src/order/cart.ts` does not exist.

- [ ] **Step 3: Create `src/order/cart.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/order/cart.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add pure cart logic (add/qty/remove/total/items)"
```

---

### Task 4: Queue-number store (station-prefix, offline)

**Files:**
- Create: `src/order/queueNumber.ts`
- Test: `src/order/queueNumber.test.ts`

**Interfaces:**
- Consumes: `BoothId`, `Station` from types.
- Produces: `formatQueueNumber(station, n): string`; `peekLastQueueNumber(booth, station): number` (0 if none, no mutation); `nextQueueNumber(booth, station): string` (increments the per-device counter and returns the formatted number).

- [ ] **Step 1: Write the failing test `src/order/queueNumber.test.ts`**

```ts
import { formatQueueNumber, peekLastQueueNumber, nextQueueNumber } from './queueNumber'

beforeEach(() => localStorage.clear())

test('formatQueueNumber prefixes the station letter', () => {
  expect(formatQueueNumber('A', 7)).toBe('A7')
  expect(formatQueueNumber('B', 3)).toBe('B3')
})

test('nextQueueNumber increments from 0 and persists', () => {
  expect(nextQueueNumber('photo', 'A')).toBe('A1')
  expect(nextQueueNumber('photo', 'A')).toBe('A2')
  expect(peekLastQueueNumber('photo', 'A')).toBe(2)
})

test('counters are independent per booth and per station', () => {
  expect(nextQueueNumber('photo', 'A')).toBe('A1')
  expect(nextQueueNumber('photo', 'B')).toBe('B1')
  expect(nextQueueNumber('drinks', 'A')).toBe('A1')
})

test('peekLastQueueNumber does not mutate the counter', () => {
  nextQueueNumber('photo', 'A') // A1
  expect(peekLastQueueNumber('photo', 'A')).toBe(1)
  expect(peekLastQueueNumber('photo', 'A')).toBe(1)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/order/queueNumber.test.ts`
Expected: FAIL — `src/order/queueNumber.ts` does not exist.

- [ ] **Step 3: Create `src/order/queueNumber.ts`**

```ts
import type { BoothId, Station } from '../domain/types'

const key = (booth: BoothId, station: Station) => `phantom.queue.${booth}.${station}`

export function formatQueueNumber(station: Station, n: number): string {
  return `${station}${n}`
}

export function peekLastQueueNumber(booth: BoothId, station: Station): number {
  const raw = localStorage.getItem(key(booth, station))
  const n = raw ? parseInt(raw, 10) : 0
  return Number.isFinite(n) ? n : 0
}

export function nextQueueNumber(booth: BoothId, station: Station): string {
  const n = peekLastQueueNumber(booth, station) + 1
  localStorage.setItem(key(booth, station), String(n))
  return formatQueueNumber(station, n)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/order/queueNumber.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add offline station-prefix queue number store"
```

---

### Task 5: PromptPay payload builder

**Files:**
- Create: `src/order/promptpay.ts`
- Test: `src/order/promptpay.test.ts`
- Maybe create: `src/types/promptpay-qr.d.ts` (only if the package ships no types)

**Interfaces:**
- Produces: `buildPromptPayPayload(promptpayId: string, amount: number): string` — an EMVCo QR payload string.

- [ ] **Step 1: Install deps**

Run: `npm install promptpay-qr qrcode` and `npm install -D @types/qrcode`

- [ ] **Step 2: Write the failing test `src/order/promptpay.test.ts`**

```ts
import { buildPromptPayPayload } from './promptpay'

test('produces an EMVCo payload string for an amount', () => {
  const payload = buildPromptPayPayload('REDACTED-PROMPTPAY-ID', 35)
  expect(typeof payload).toBe('string')
  expect(payload.length).toBeGreaterThan(0)
  expect(payload.startsWith('00020101')).toBe(true) // EMVCo header
})

test('different amounts produce different payloads', () => {
  expect(buildPromptPayPayload('REDACTED-PROMPTPAY-ID', 35)).not.toBe(
    buildPromptPayPayload('REDACTED-PROMPTPAY-ID', 60),
  )
})

test('same input is deterministic', () => {
  expect(buildPromptPayPayload('REDACTED-PROMPTPAY-ID', 35)).toBe(
    buildPromptPayPayload('REDACTED-PROMPTPAY-ID', 35),
  )
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/order/promptpay.test.ts`
Expected: FAIL — `src/order/promptpay.ts` does not exist.

- [ ] **Step 4: Create `src/order/promptpay.ts`**

```ts
import generatePayload from 'promptpay-qr'

export function buildPromptPayPayload(promptpayId: string, amount: number): string {
  return generatePayload(promptpayId, { amount })
}
```

If TypeScript reports `promptpay-qr` has no type declarations, create `src/types/promptpay-qr.d.ts`:

```ts
declare module 'promptpay-qr' {
  export default function generatePayload(
    target: string,
    options?: { amount?: number },
  ): string
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/order/promptpay.test.ts`
Expected: PASS. If `startsWith('00020101')` fails, inspect the actual payload prefix printed by the lib and correct the assertion to the real EMVCo header the library emits (it is standard `000201`), keeping the "non-empty + deterministic + amount-sensitive" checks.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add PromptPay QR payload builder"
```

---

### Task 6: Build order (pure)

**Files:**
- Create: `src/order/buildOrder.ts`
- Test: `src/order/buildOrder.test.ts`

**Interfaces:**
- Consumes: `Order`, `OrderItem`, `BoothId`, `Station`, `PaymentMethod` from types.
- Produces: `interface BuildOrderInput { boothId; station; queueNumber; items: OrderItem[]; paymentMethod; staffName?; now: number }`; `buildOrder(input): Omit<Order, 'id'>` — computes `total` from items, sets `paymentStatus:'paid'`, `status:'waiting'`, `createdAt`/`paidAt` = `now`, omits `staffName` when absent.

- [ ] **Step 1: Write the failing test `src/order/buildOrder.test.ts`**

```ts
import { buildOrder } from './buildOrder'
import type { OrderItem } from '../domain/types'

const ITEMS: OrderItem[] = [
  { sku: 'a', name: 'A', qty: 2, unitPrice: 30, subtotal: 60 },
  { sku: 'b', name: 'B', qty: 1, unitPrice: 25, subtotal: 25 },
]

test('builds a paid, waiting order with computed total and timestamps', () => {
  const order = buildOrder({
    boothId: 'drinks', station: 'A', queueNumber: 'A1',
    items: ITEMS, paymentMethod: 'qr', now: 1000,
  })
  expect(order.total).toBe(85)
  expect(order.paymentStatus).toBe('paid')
  expect(order.status).toBe('waiting')
  expect(order.paymentMethod).toBe('qr')
  expect(order.queueNumber).toBe('A1')
  expect(order.createdAt).toBe(1000)
  expect(order.paidAt).toBe(1000)
})

test('omits staffName when not provided (no undefined for Firestore)', () => {
  const order = buildOrder({
    boothId: 'photo', station: 'B', queueNumber: 'B1',
    items: ITEMS, paymentMethod: 'cash', now: 5,
  })
  expect('staffName' in order).toBe(false)
})

test('includes staffName when provided', () => {
  const order = buildOrder({
    boothId: 'photo', station: 'B', queueNumber: 'B2',
    items: ITEMS, paymentMethod: 'cash', staffName: 'Meatball', now: 5,
  })
  expect(order.staffName).toBe('Meatball')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/order/buildOrder.test.ts`
Expected: FAIL — `src/order/buildOrder.ts` does not exist.

- [ ] **Step 3: Create `src/order/buildOrder.ts`**

```ts
import type { Order, OrderItem, BoothId, Station, PaymentMethod } from '../domain/types'

export interface BuildOrderInput {
  boothId: BoothId
  station: Station
  queueNumber: string
  items: OrderItem[]
  paymentMethod: PaymentMethod
  staffName?: string
  now: number
}

export function buildOrder(input: BuildOrderInput): Omit<Order, 'id'> {
  const total = input.items.reduce((s, it) => s + it.subtotal, 0)
  const base: Omit<Order, 'id'> = {
    boothId: input.boothId,
    queueNumber: input.queueNumber,
    station: input.station,
    items: input.items,
    total,
    paymentMethod: input.paymentMethod,
    paymentStatus: 'paid',
    status: 'waiting',
    createdAt: input.now,
    paidAt: input.now,
  }
  return input.staffName ? { ...base, staffName: input.staffName } : base
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/order/buildOrder.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add pure buildOrder constructor"
```

---

### Task 7: Orders repository (Firestore edges, mock-tested)

**Files:**
- Create: `src/order/ordersRepo.ts`
- Test: `src/order/ordersRepo.test.ts`

**Interfaces:**
- Consumes: `getDb()` from `src/lib/firebase.ts`; `Order`, `BoothId` from types.
- Produces: `createOrder(order: Omit<Order,'id'>): Promise<string>`; `subscribeBoothOrders(boothId, cb: (orders: Order[]) => void): () => void` (returns unsubscribe); `updateOrderStatus(id: string, patch: Partial<Order>): Promise<void>`.

- [ ] **Step 1: Write the failing test `src/order/ordersRepo.test.ts`**

```ts
import { vi, beforeEach, test, expect } from 'vitest'

const addDoc = vi.fn()
const onSnapshot = vi.fn()
const updateDoc = vi.fn()
const collection = vi.fn((_db, path) => ({ __collection: path }))
const query = vi.fn((...args) => ({ __query: args }))
const where = vi.fn((f, op, v) => ({ __where: [f, op, v] }))
const orderBy = vi.fn((f, dir) => ({ __orderBy: [f, dir] }))
const doc = vi.fn((_db, path, id) => ({ __doc: [path, id] }))

vi.mock('firebase/firestore', () => ({
  collection, addDoc, onSnapshot, query, where, orderBy, doc, updateDoc,
}))
vi.mock('../lib/firebase', () => ({ getDb: () => ({ __db: true }) }))

import { createOrder, subscribeBoothOrders, updateOrderStatus } from './ordersRepo'

beforeEach(() => vi.clearAllMocks())

test('createOrder writes to the orders collection and returns the new id', async () => {
  addDoc.mockResolvedValue({ id: 'order123' })
  const id = await createOrder({ boothId: 'photo' } as never)
  expect(collection).toHaveBeenCalledWith({ __db: true }, 'orders')
  expect(addDoc).toHaveBeenCalledWith({ __collection: 'orders' }, { boothId: 'photo' })
  expect(id).toBe('order123')
})

test('subscribeBoothOrders queries orders for the booth ordered by createdAt and maps docs', () => {
  let handler: (snap: unknown) => void = () => {}
  onSnapshot.mockImplementation((_q, cb) => { handler = cb; return () => {} })
  const received: unknown[] = []
  const unsub = subscribeBoothOrders('drinks', (orders) => received.push(orders))

  expect(where).toHaveBeenCalledWith('boothId', '==', 'drinks')
  expect(orderBy).toHaveBeenCalledWith('createdAt', 'asc')

  handler({ docs: [{ id: 'o1', data: () => ({ boothId: 'drinks', total: 30 }) }] })
  expect(received[0]).toEqual([{ id: 'o1', boothId: 'drinks', total: 30 }])
  expect(typeof unsub).toBe('function')
})

test('updateOrderStatus updates the order doc with the patch', async () => {
  updateDoc.mockResolvedValue(undefined)
  await updateOrderStatus('o1', { status: 'serving', servingAt: 42 })
  expect(doc).toHaveBeenCalledWith({ __db: true }, 'orders', 'o1')
  expect(updateDoc).toHaveBeenCalledWith({ __doc: ['orders', 'o1'] }, { status: 'serving', servingAt: 42 })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/order/ordersRepo.test.ts`
Expected: FAIL — `src/order/ordersRepo.ts` does not exist.

- [ ] **Step 3: Create `src/order/ordersRepo.ts`**

```ts
import { collection, addDoc, onSnapshot, query, where, orderBy, doc, updateDoc } from 'firebase/firestore'
import { getDb } from '../lib/firebase'
import type { Order, BoothId } from '../domain/types'

export async function createOrder(order: Omit<Order, 'id'>): Promise<string> {
  const ref = await addDoc(collection(getDb(), 'orders'), order)
  return ref.id
}

export function subscribeBoothOrders(boothId: BoothId, cb: (orders: Order[]) => void): () => void {
  const q = query(collection(getDb(), 'orders'), where('boothId', '==', boothId), orderBy('createdAt', 'asc'))
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Order, 'id'>) })))
  })
}

export async function updateOrderStatus(id: string, patch: Partial<Order>): Promise<void> {
  await updateDoc(doc(getDb(), 'orders', id), patch)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/order/ordersRepo.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add orders Firestore repository (create/subscribe/update)"
```

---

### Task 8: QR code component

**Files:**
- Create: `src/order/QrCode.tsx`
- Test: `src/order/QrCode.test.tsx`

**Interfaces:**
- Produces: `<QrCode payload={string} />` — renders the payload as a QR image (via `qrcode`'s `toDataURL`); shows a placeholder while generating.

- [ ] **Step 1: Write the failing test `src/order/QrCode.test.tsx`**

```tsx
import { vi, test, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,FAKE') },
}))

import { QrCode } from './QrCode'

test('renders a QR image for the payload', async () => {
  render(<QrCode payload="00020101TEST" />)
  await waitFor(() => {
    const img = screen.getByAltText('PromptPay QR') as HTMLImageElement
    expect(img.src).toBe('data:image/png;base64,FAKE')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/order/QrCode.test.tsx`
Expected: FAIL — `src/order/QrCode.tsx` does not exist.

- [ ] **Step 3: Create `src/order/QrCode.tsx`**

```tsx
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export function QrCode({ payload }: { payload: string }) {
  const [src, setSrc] = useState('')

  useEffect(() => {
    let alive = true
    QRCode.toDataURL(payload, { width: 240, margin: 1 })
      .then((url) => { if (alive) setSrc(url) })
      .catch(() => { if (alive) setSrc('') })
    return () => { alive = false }
  }, [payload])

  if (!src) return <div className="text-sm opacity-70">กำลังสร้าง QR… / Generating…</div>
  return <img src={src} alt="PromptPay QR" width={240} height={240} className="rounded-lg bg-white p-2" />
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/order/QrCode.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add QrCode component (renders payload to QR image)"
```

---

### Task 9: Order Station — ordering & payment UI

**Files:**
- Create: `src/screens/OrderStation.tsx`
- Test: `src/screens/OrderStation.test.tsx`

**Interfaces:**
- Consumes: `productsForBooth` (catalog); `Cart`/`addToCart`/`setQty`/`cartTotal`/`cartToOrderItems` (cart); `nextQueueNumber` (queueNumber); `buildOrder`; `createOrder` (ordersRepo); `buildPromptPayPayload` (promptpay); `QrCode`; `APP_CONFIG`; `QueuePanel` (Task 10 — imported but tests here mock it or it renders below; see note); `L`/`BiLabel`.
- Produces: `<OrderStation booth={BoothId} station={Station} />`. For THIS task, render the ordering half: product grid → cart with qty controls + total → choose Cash or QR → on Cash confirm OR QR confirm, issue `nextQueueNumber(booth, station)`, `buildOrder(...)`, `await createOrder(...)`, then show the issued queue number big and clear the cart. Render `<QueuePanel booth station />` at the bottom (built in Task 10).

**Note on mocking in this task's test:** mock `../order/ordersRepo` (so no real Firestore) and mock `./QueuePanel` to a stub (`vi.mock('./QueuePanel', () => ({ QueuePanel: () => null }))`) so this test focuses on the ordering flow. Task 10 tests QueuePanel directly.

- [ ] **Step 1: Write the failing test `src/screens/OrderStation.test.tsx`**

```tsx
import { vi, beforeEach, test, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const createOrder = vi.fn().mockResolvedValue('order-1')
vi.mock('../order/ordersRepo', () => ({
  createOrder,
  subscribeBoothOrders: () => () => {},
  updateOrderStatus: vi.fn(),
}))
vi.mock('./QueuePanel', () => ({ QueuePanel: () => null }))

import { OrderStation } from './OrderStation'

beforeEach(() => {
  localStorage.clear()
  createOrder.mockClear()
})

test('cash order: add product, pay cash, issues queue number and persists a paid waiting order', async () => {
  const user = userEvent.setup()
  render(<OrderStation booth="drinks" station="A" />)

  // add one Yakult-Pipo (30)
  await user.click(screen.getByRole('button', { name: /ยาคูลท์ปีโป้ปั่น/ }))
  expect(screen.getByTestId('cart-total')).toHaveTextContent('30')

  await user.click(screen.getByRole('button', { name: /เงินสด/ }))
  await user.click(screen.getByRole('button', { name: /รับเงินแล้ว/ }))

  await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1))
  const persisted = createOrder.mock.calls[0][0]
  expect(persisted.total).toBe(30)
  expect(persisted.paymentMethod).toBe('cash')
  expect(persisted.paymentStatus).toBe('paid')
  expect(persisted.status).toBe('waiting')
  expect(persisted.queueNumber).toBe('A1')

  // queue number shown to staff/customer
  expect(screen.getByTestId('issued-queue')).toHaveTextContent('A1')
})

test('QR order: choosing QR shows a QR image, then confirm persists a qr order', async () => {
  const user = userEvent.setup()
  render(<OrderStation booth="photo" station="B" />)

  await user.click(screen.getByRole('button', { name: /ถ่าย 3 ช็อต/ })) // 35
  await user.click(screen.getByRole('button', { name: /^QR/ }))
  expect(await screen.findByAltText('PromptPay QR')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /ยืนยันชำระ/ }))
  await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1))
  expect(createOrder.mock.calls[0][0].paymentMethod).toBe('qr')
  expect(createOrder.mock.calls[0][0].queueNumber).toBe('B1')
})
```

(Note: mock `qrcode` at the top of this file too, same as Task 8, so the QR image resolves in jsdom: `vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,FAKE') } }))`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/screens/OrderStation.test.tsx`
Expected: FAIL — `src/screens/OrderStation.tsx` does not exist.

- [ ] **Step 3: Create `src/screens/OrderStation.tsx`**

```tsx
import { useState } from 'react'
import type { BoothId, Station } from '../domain/types'
import { productsForBooth } from '../domain/catalog'
import { addToCart, setQty, cartTotal, cartToOrderItems, type Cart } from '../order/cart'
import { nextQueueNumber } from '../order/queueNumber'
import { buildOrder } from '../order/buildOrder'
import { createOrder } from '../order/ordersRepo'
import { buildPromptPayPayload } from '../order/promptpay'
import { QrCode } from '../order/QrCode'
import { QueuePanel } from './QueuePanel'
import { APP_CONFIG } from '../domain/appConfig'
import { L } from '../i18n/labels'

type Pay = 'none' | 'cash' | 'qr'

export function OrderStation({ booth, station }: { booth: BoothId; station: Station }) {
  const products = productsForBooth(booth)
  const [cart, setCart] = useState<Cart>([])
  const [pay, setPay] = useState<Pay>('none')
  const [issued, setIssued] = useState<string | null>(null)

  const total = cartTotal(cart, products)

  const finalize = async (method: 'cash' | 'qr') => {
    const queueNumber = nextQueueNumber(booth, station)
    const order = buildOrder({
      boothId: booth, station, queueNumber,
      items: cartToOrderItems(cart, products), paymentMethod: method, now: Date.now(),
    })
    await createOrder(order)
    setIssued(queueNumber)
    setCart([])
    setPay('none')
  }

  return (
    <div className="min-h-screen p-4 flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <span className="font-kanit text-phantom-yellow">
          {L(`booth.${booth}`).th} · station {station}
        </span>
        {issued && (
          <span data-testid="issued-queue" className="font-mono text-4xl text-phantom-orange">
            {issued}
          </span>
        )}
      </header>

      <section className="grid grid-cols-2 gap-3">
        {products.map((p) => (
          <button
            key={p.sku}
            onClick={() => { setCart((c) => addToCart(c, p.sku)); setIssued(null) }}
            className="rounded-xl border-2 border-white/20 p-4 text-left font-kanit"
          >
            <div>{p.name}</div>
            <div className="text-xs opacity-70">{p.nameEn}</div>
            <div className="font-mono text-phantom-yellow">{p.price}฿</div>
          </button>
        ))}
      </section>

      <section className="flex flex-col gap-2">
        {cart.map((line) => {
          const p = products.find((x) => x.sku === line.sku)!
          return (
            <div key={line.sku} className="flex items-center gap-3">
              <span className="flex-1 font-kanit">{p.name}</span>
              <button onClick={() => setCart((c) => setQty(c, line.sku, line.qty - 1))} className="px-3 rounded bg-white/10">−</button>
              <span className="font-mono w-6 text-center">{line.qty}</span>
              <button onClick={() => setCart((c) => setQty(c, line.sku, line.qty + 1))} className="px-3 rounded bg-white/10">+</button>
              <span className="font-mono w-16 text-right">{p.price * line.qty}฿</span>
            </div>
          )
        })}
        <div className="flex justify-between border-t border-white/20 pt-2">
          <span className="font-kanit">{L('order.total').th} · {L('order.total').en}</span>
          <span data-testid="cart-total" className="font-mono text-2xl text-phantom-orange">{total}฿</span>
        </div>
      </section>

      {cart.length > 0 && pay === 'none' && (
        <div className="flex gap-3">
          <button onClick={() => setPay('cash')} className="flex-1 rounded-xl py-3 bg-white/10 font-kanit">
            {L('order.cash').th} · {L('order.cash').en}
          </button>
          <button onClick={() => setPay('qr')} className="flex-1 rounded-xl py-3 bg-white/10 font-kanit">
            QR · {L('order.qr').en}
          </button>
        </div>
      )}

      {pay === 'cash' && (
        <button onClick={() => finalize('cash')} className="rounded-xl py-4 bg-phantom-yellow text-phantom-bg font-kanit text-lg">
          {L('order.cashConfirm').th} · {L('order.cashConfirm').en}
        </button>
      )}

      {pay === 'qr' && (
        <div className="flex flex-col items-center gap-3">
          <QrCode payload={buildPromptPayPayload(APP_CONFIG.promptpayId, total)} />
          <button onClick={() => finalize('qr')} className="rounded-xl py-4 px-6 bg-phantom-yellow text-phantom-bg font-kanit text-lg">
            {L('order.qrConfirm').th} · {L('order.qrConfirm').en}
          </button>
        </div>
      )}

      <QueuePanel booth={booth} station={station} />
    </div>
  )
}
```

- [ ] **Step 4: Add the new labels to `src/i18n/labels.ts`**

Add these entries to the `LABELS` object (keep existing ones):

```ts
  'order.total': { th: 'ยอดรวม', en: 'Total' },
  'order.cash': { th: 'เงินสด', en: 'Cash' },
  'order.qr': { th: 'คิวอาร์', en: 'QR' },
  'order.cashConfirm': { th: 'รับเงินแล้ว', en: 'Cash received' },
  'order.qrConfirm': { th: 'ยืนยันชำระ', en: 'Confirm payment' },
  'queue.callNext': { th: 'เรียกคิวถัดไป', en: 'Call next' },
  'queue.done': { th: 'เสร็จ', en: 'Done' },
  'queue.cancel': { th: 'ยกเลิก/แก้ไข', en: 'Cancel/Edit' },
  'queue.waiting': { th: 'คิวรอ', en: 'Waiting' },
  'queue.serving': { th: 'กำลังทำ', en: 'Now serving' },
  'queue.reasonPrompt': { th: 'เหตุผลที่ยกเลิก', en: 'Cancel reason' },
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/screens/OrderStation.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Order Station ordering + payment UI (cash/QR, queue number)"
```

---

### Task 10: Queue management panel (call next / done / cancel-with-reason)

**Files:**
- Create: `src/screens/QueuePanel.tsx`
- Test: `src/screens/QueuePanel.test.tsx`

**Interfaces:**
- Consumes: `subscribeBoothOrders`, `updateOrderStatus` (ordersRepo); `Order` type; `L`.
- Produces: `<QueuePanel booth={BoothId} station={Station} />` — subscribes to the booth's orders, filters to THIS station, shows the `waiting` list and `serving` list. Buttons: **Call next** (first `waiting` for this station → `{status:'serving', servingAt: Date.now()}`); per serving order **Done** (`{status:'done', doneAt: Date.now()}`); **Cancel** on a waiting/serving order (prompts for a required reason, then `{status:'cancelled', cancelReason}`). Unsubscribes on unmount.

- [ ] **Step 1: Write the failing test `src/screens/QueuePanel.test.tsx`**

```tsx
import { vi, beforeEach, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Order } from '../domain/types'

const updateOrderStatus = vi.fn().mockResolvedValue(undefined)
let emit: (orders: Order[]) => void = () => {}
vi.mock('../order/ordersRepo', () => ({
  subscribeBoothOrders: (_booth: string, cb: (o: Order[]) => void) => { emit = cb; return () => {} },
  updateOrderStatus,
  createOrder: vi.fn(),
}))

import { QueuePanel } from './QueuePanel'
import { act } from 'react'

const order = (over: Partial<Order>): Order => ({
  id: 'x', boothId: 'drinks', queueNumber: 'A1', station: 'A', items: [], total: 30,
  paymentMethod: 'cash', paymentStatus: 'paid', status: 'waiting', createdAt: 1, ...over,
})

beforeEach(() => updateOrderStatus.mockClear())

test('call next moves the first waiting order of this station to serving', async () => {
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([
    order({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'waiting', createdAt: 1 }),
    order({ id: 'o2', queueNumber: 'A2', station: 'A', status: 'waiting', createdAt: 2 }),
    order({ id: 'oB', queueNumber: 'B1', station: 'B', status: 'waiting', createdAt: 1 }),
  ]))

  await user.click(screen.getByRole('button', { name: /เรียกคิวถัดไป/ }))
  expect(updateOrderStatus).toHaveBeenCalledWith('o1', expect.objectContaining({ status: 'serving' }))
})

test('done moves a serving order to done', async () => {
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([order({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'serving' })]))

  await user.click(screen.getByRole('button', { name: /เสร็จ/ }))
  expect(updateOrderStatus).toHaveBeenCalledWith('o1', expect.objectContaining({ status: 'done' }))
})

test('cancel requires a reason and records it', async () => {
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([order({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'waiting' })]))

  await user.click(screen.getByRole('button', { name: /ยกเลิก/ }))
  // reason input appears; empty submit is blocked
  await user.click(screen.getByRole('button', { name: /ยืนยันยกเลิก/ }))
  expect(updateOrderStatus).not.toHaveBeenCalled()

  await user.type(screen.getByLabelText(/เหตุผล/), 'ลูกค้าเปลี่ยนใจ')
  await user.click(screen.getByRole('button', { name: /ยืนยันยกเลิก/ }))
  expect(updateOrderStatus).toHaveBeenCalledWith('o1', expect.objectContaining({ status: 'cancelled', cancelReason: 'ลูกค้าเปลี่ยนใจ' }))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/screens/QueuePanel.test.tsx`
Expected: FAIL — `src/screens/QueuePanel.tsx` does not exist.

- [ ] **Step 3: Create `src/screens/QueuePanel.tsx`**

```tsx
import { useEffect, useState } from 'react'
import type { BoothId, Station, Order } from '../domain/types'
import { subscribeBoothOrders, updateOrderStatus } from '../order/ordersRepo'
import { L } from '../i18n/labels'

export function QueuePanel({ booth, station }: { booth: BoothId; station: Station }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  useEffect(() => subscribeBoothOrders(booth, setOrders), [booth])

  const mine = orders.filter((o) => o.station === station)
  const waiting = mine.filter((o) => o.status === 'waiting').sort((a, b) => a.createdAt - b.createdAt)
  const serving = mine.filter((o) => o.status === 'serving')

  const callNext = () => {
    const next = waiting[0]
    if (next) updateOrderStatus(next.id, { status: 'serving', servingAt: Date.now() })
  }
  const markDone = (id: string) => updateOrderStatus(id, { status: 'done', doneAt: Date.now() })
  const confirmCancel = () => {
    if (!cancelId || !reason.trim()) return
    updateOrderStatus(cancelId, { status: 'cancelled', cancelReason: reason.trim() })
    setCancelId(null)
    setReason('')
  }

  return (
    <section className="mt-4 border-t border-white/20 pt-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-kanit">{L('queue.serving').th} ({serving.length}) · {L('queue.waiting').th} ({waiting.length})</span>
        <button onClick={callNext} disabled={waiting.length === 0}
          className="rounded-xl px-4 py-2 bg-phantom-orange font-kanit disabled:opacity-40">
          {L('queue.callNext').th} · {L('queue.callNext').en}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {serving.map((o) => (
          <div key={o.id} className="rounded-lg bg-white/10 px-3 py-2 flex items-center gap-2">
            <span className="font-mono text-xl text-phantom-yellow">{o.queueNumber}</span>
            <button onClick={() => markDone(o.id)} className="text-sm rounded bg-phantom-yellow text-phantom-bg px-2 py-1 font-kanit">{L('queue.done').th}</button>
            <button onClick={() => setCancelId(o.id)} className="text-sm rounded border border-white/30 px-2 py-1 font-kanit">{L('queue.cancel').th}</button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {waiting.map((o) => (
          <div key={o.id} className="rounded-lg border border-white/20 px-3 py-2 flex items-center gap-2">
            <span className="font-mono text-lg">{o.queueNumber}</span>
            <button onClick={() => setCancelId(o.id)} className="text-sm rounded border border-white/30 px-2 py-1 font-kanit">{L('queue.cancel').th}</button>
          </div>
        ))}
      </div>

      {cancelId && (
        <div className="rounded-lg bg-white/5 p-3 flex flex-col gap-2">
          <label htmlFor="cancel-reason" className="font-kanit text-sm">{L('queue.reasonPrompt').th} · {L('queue.reasonPrompt').en}</label>
          <input id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)}
            className="rounded bg-black/40 px-2 py-1 text-white" />
          <div className="flex gap-2">
            <button onClick={confirmCancel} className="rounded bg-phantom-orange px-3 py-1 font-kanit">ยืนยันยกเลิก · Confirm cancel</button>
            <button onClick={() => { setCancelId(null); setReason('') }} className="rounded border border-white/30 px-3 py-1 font-kanit">ปิด · Close</button>
          </div>
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/screens/QueuePanel.test.tsx`
Expected: PASS. (If an `act()` warning appears because `emit` updates state outside React's batch, the test already wraps `emit` in `act(...)` — keep it.)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add queue management panel (call next / done / cancel-with-reason)"
```

---

### Task 11: Wire Order Station into App routing

**Files:**
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx` (extend)

**Interfaces:**
- Consumes: `OrderStation`; existing `loadDeviceConfig`/`clearDeviceConfig`.
- Produces: `App` renders `<OrderStation booth={config.booth} station={config.station!} />` when `config.mode === 'order'`; display/dashboard keep their placeholders; the reset button remains available on all modes.

- [ ] **Step 1: Extend `src/App.test.tsx`**

Add this test (keep the existing two). Mock the repo so App's order branch doesn't hit Firestore:

```tsx
vi.mock('./order/ordersRepo', () => ({
  createOrder: vi.fn().mockResolvedValue('id'),
  subscribeBoothOrders: () => () => {},
  updateOrderStatus: vi.fn(),
}))

test('order mode renders the Order Station with the booth catalog', async () => {
  const user = userEvent.setup()
  render(<App />)
  await user.click(screen.getByRole('button', { name: /น้ำปั่น/ }))
  await user.click(screen.getByRole('button', { name: /รับออเดอร์/ }))
  await user.click(screen.getByRole('button', { name: /^A$/ }))
  await user.click(screen.getByRole('button', { name: /ยืนยัน/ }))

  // OrderStation shows the drinks catalog
  expect(screen.getByRole('button', { name: /ยาคูลท์ปีโป้ปั่น/ })).toBeInTheDocument()
})
```

(Add `import userEvent from '@testing-library/user-event'` and `vi` to the imports if not already present.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL — App still renders the generic placeholder for order mode.

- [ ] **Step 3: Update `src/App.tsx`**

Replace the placeholder block so order mode renders the real screen (keep Setup + reset logic):

```tsx
import { useState } from 'react'
import { SetupScreen } from './screens/SetupScreen'
import { OrderStation } from './screens/OrderStation'
import { loadDeviceConfig, clearDeviceConfig, type DeviceConfig } from './device/deviceConfig'

export default function App() {
  const [config, setConfig] = useState<DeviceConfig | null>(() => loadDeviceConfig())

  if (!config) {
    return <SetupScreen onDone={() => setConfig(loadDeviceConfig())} />
  }

  const reset = () => {
    clearDeviceConfig()
    setConfig(null)
  }

  const ResetButton = (
    <button onClick={reset} className="self-start rounded-lg px-4 py-2 border border-white/30 font-kanit">
      เปลี่ยนค่า / Change setup
    </button>
  )

  if (config.mode === 'order' && config.station) {
    return (
      <div className="min-h-screen flex flex-col">
        <OrderStation booth={config.booth} station={config.station} />
        <div className="p-4">{ResetButton}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 flex flex-col gap-4">
      <p className="font-mono">
        ซุ้ม: {config.booth} · โหมด: {config.mode}
        {config.station ? ` · station ${config.station}` : ''}
      </p>
      <p className="opacity-60">หน้าจริงของโหมดนี้จะถูกสร้างในแผนถัดไป</p>
      {ResetButton}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all suites green (existing display/dashboard placeholder tests unchanged; new order-mode test passes).

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: build completes, no type errors, PWA generates.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: route order mode to the Order Station screen"
```

---

## Self-Review

**Spec coverage (Order Station slice of the base + design spec):**
- Product selection from per-booth catalog → Tasks 2, 9 ✓ (static catalog per approved decision)
- Cart + total → Task 3, 9 ✓
- Payment cash ("รับเงินแล้ว") + QR PromptPay ("ยืนยันชำระ", exact amount, client-side) → Tasks 5, 8, 9 ✓
- Issue station-prefix queue number, offline-safe per device → Task 4, 9 ✓
- Order persisted paid + waiting → Tasks 6, 7, 9 ✓
- Queue advance: call next → serving, done, cancel-with-required-reason → Task 10 ✓
- Log every order permanently (base spec feature 7) → satisfied by persisting every order with timestamps + station + items → Task 7 ✓
- Firestore at the edges / offline → repo isolation Task 7; getDb lazy init from Foundation ✓
- Bilingual labels → labels added Task 9 step 4, used in Tasks 9/10 ✓
- Deferred by design (later plans): Display Now-Serving/Up-Next + sound/flash (Plan 3); Dashboard (Plan 4); inventory auto-decrement, max-queue close for portrait, HQ/comms, extras (later plans). Portrait's parallel-artist serving model is a Display/Plan-3 concern; Order Station advances per station here.

**Placeholder scan:** No TBD/TODO. Display/dashboard placeholders in App are intentional and replaced by later plans. Task 5's assertion note (verify EMVCo prefix against the real lib output) is a guardrail, not an unfinished step — the core assertions (non-empty, deterministic, amount-sensitive) are concrete.

**Type consistency:** `Cart` (Task 3) used in 9. `BuildOrderInput`/`buildOrder` (Task 6) consumed in 9. `createOrder`/`subscribeBoothOrders`/`updateOrderStatus` (Task 7) consumed in 9/10/11 with matching signatures. `nextQueueNumber(booth, station)` (Task 4) called in 9. `buildPromptPayPayload(id, amount)` (Task 5) → `QrCode payload` (Task 8) → used in 9. `APP_CONFIG.promptpayId` (Task 1) used in 9. `<OrderStation booth station />` (Task 9) consumed in 11. `<QueuePanel booth station />` (Task 10) consumed in 9. No signature drift.

---

*Plan 2 of 6 · Order Station · ต่อยอดจาก Foundation · ม.6/7 · PHANTOM CREW*
