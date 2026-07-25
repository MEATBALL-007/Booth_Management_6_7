# Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the PIN-gated Dashboard: a realtime view of the money across all 3 booths — total sales, per-booth, cash vs QR, order/queue-done counts, best-sellers, total cost, **net donation**, expected cash in drawer — plus a minimal expense-entry form (so net donation is real). Export is deferred to a later plan.

**Architecture:** Add an unfiltered `subscribeAllOrders` to the existing orders repo and a new expenses repo (Firestore edges, no composite index — client-sorted). All aggregation is a pure, exhaustively-unit-tested function (`src/dashboard/metrics.ts`). A PIN store mirrors the deviceConfig localStorage pattern; a PinGate component gates the DashboardScreen. App routes `dashboard` mode to it.

**Tech Stack:** React 19, TypeScript, Tailwind (PHANTOM CREW), Firebase Firestore (via repo edges), Vitest + @testing-library/react.

## Global Constraints

- **Builds on Foundation + Order Station + Display (all merged to `main`).** Reuse `getDb()` (`src/lib/firebase.ts`), `Order`/`Expense`/`BoothId`/`BOOTH_IDS` (`src/domain/types.ts`), `APP_CONFIG.dashboardPin` = `'REDACTED-PIN'` (`src/domain/appConfig.ts`), `L`/`BiLabel` (`src/i18n/`). Do NOT reimplement.
- **Firestore stays at the edges:** only `src/order/ordersRepo.ts` and `src/expense/expensesRepo.ts` import `firebase/firestore`. `metrics.ts`, `pinStore.ts`, and the screens import no Firestore.
- **No composite index:** all queries are single-collection `onSnapshot` (no `where`+`orderBy` combo); sort client-side by `createdAt`.
- **Optimistic writes:** `addExpense` is fire-and-don't-await for the UI (Firestore persistence queues offline).
- **Revenue rule (exact):** an order counts as revenue iff `paymentStatus === 'paid' && status !== 'cancelled'`. Cash/QR/expected-cash split those by `paymentMethod`. `netDonation = totalSales − Σ expenses.amount`.
- **PIN:** compared against `APP_CONFIG.dashboardPin`; on success remembered in `localStorage` key `phantom.dashboardPin` (spec §8: type once per device). Client-side gate only.
- **Bilingual** labels via `L` (Thai + English). **Theme** PHANTOM CREW; numbers big + `font-mono`.
- **Testing:** Vitest. Pure logic (`metrics`, `pinStore`) → plain unit tests (bulk of coverage). Repos → `vi.hoisted` + mocked `firebase/firestore` + mocked `../lib/firebase` (as in `ordersRepo.test.ts`). Components → mock the repo modules and drive via a captured `emit` callback. Run `npm run build` (`tsc -b`) as well as `npm test`. Commit after each task.

---

### Task 1: subscribeAllOrders (all booths)

**Files:**
- Modify: `src/order/ordersRepo.ts`
- Modify: `src/order/ordersRepo.test.ts`

**Interfaces:**
- Produces: `subscribeAllOrders(cb: (orders: Order[]) => void): () => void` — unfiltered `onSnapshot` over `orders`, mapped + client-sorted by `createdAt` asc, returns the unsubscribe.

- [ ] **Step 1: Add the failing test to `src/order/ordersRepo.test.ts`**

Append this test (the file already mocks `firebase/firestore` via `vi.hoisted` and `../lib/firebase`; `beforeEach(() => vi.clearAllMocks())` is present):

```ts
test('subscribeAllOrders subscribes to the whole orders collection (no filter) and sorts by createdAt', () => {
  let handler: (snap: unknown) => void = () => {}
  onSnapshot.mockImplementation((_ref, cb) => { handler = cb; return () => {} })
  const received: unknown[] = []
  const unsub = subscribeAllOrders((orders) => received.push(orders))

  expect(collection).toHaveBeenCalledWith({ __db: true }, 'orders')
  expect(where).not.toHaveBeenCalled()
  expect(query).not.toHaveBeenCalled()

  handler({ docs: [
    { id: 'o2', data: () => ({ boothId: 'drinks', createdAt: 2 }) },
    { id: 'o1', data: () => ({ boothId: 'photo', createdAt: 1 }) },
  ] })
  expect(received[0]).toEqual([
    { id: 'o1', boothId: 'photo', createdAt: 1 },
    { id: 'o2', boothId: 'drinks', createdAt: 2 },
  ])
  expect(typeof unsub).toBe('function')
})
```

Add `subscribeAllOrders` to the existing import from `./ordersRepo` at the top of the test file.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/order/ordersRepo.test.ts`
Expected: FAIL — `subscribeAllOrders` is not exported.

- [ ] **Step 3: Add `subscribeAllOrders` to `src/order/ordersRepo.ts`**

```ts
export function subscribeAllOrders(cb: (orders: Order[]) => void): () => void {
  return onSnapshot(collection(getDb(), 'orders'), (snap) => {
    const orders = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Order, 'id'>) }))
    cb(orders.sort((a, b) => a.createdAt - b.createdAt))
  })
}
```

(No new imports needed — `collection`, `onSnapshot`, `getDb`, `Order` are already imported.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/order/ordersRepo.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add subscribeAllOrders (all-booths order subscription)"
```

---

### Task 2: Expenses repository

**Files:**
- Create: `src/expense/expensesRepo.ts`
- Test: `src/expense/expensesRepo.test.ts`

**Interfaces:**
- Consumes: `getDb()`; `Expense` type.
- Produces: `addExpense(expense: Omit<Expense,'id'>): Promise<string>`; `subscribeAllExpenses(cb: (expenses: Expense[]) => void): () => void` (client-sorted by createdAt).

- [ ] **Step 1: Write the failing test `src/expense/expensesRepo.test.ts`**

```ts
import { vi, beforeEach, test, expect } from 'vitest'

const { addDoc, onSnapshot, collection } = vi.hoisted(() => ({
  addDoc: vi.fn(),
  onSnapshot: vi.fn(),
  collection: vi.fn((_db, path) => ({ __collection: path })),
}))
vi.mock('firebase/firestore', () => ({ addDoc, onSnapshot, collection }))
vi.mock('../lib/firebase', () => ({ getDb: () => ({ __db: true }) }))

import { addExpense, subscribeAllExpenses } from './expensesRepo'

beforeEach(() => vi.clearAllMocks())

test('addExpense writes to the expenses collection and returns the id', async () => {
  addDoc.mockResolvedValue({ id: 'e1' })
  const id = await addExpense({ boothId: 'photo', description: 'ฟิล์ม', amount: 5500, createdAt: 1 })
  expect(collection).toHaveBeenCalledWith({ __db: true }, 'expenses')
  expect(addDoc).toHaveBeenCalledWith({ __collection: 'expenses' }, { boothId: 'photo', description: 'ฟิล์ม', amount: 5500, createdAt: 1 })
  expect(id).toBe('e1')
})

test('subscribeAllExpenses maps docs and sorts by createdAt ascending', () => {
  let handler: (snap: unknown) => void = () => {}
  onSnapshot.mockImplementation((_ref, cb) => { handler = cb; return () => {} })
  const received: unknown[] = []
  const unsub = subscribeAllExpenses((e) => received.push(e))
  expect(collection).toHaveBeenCalledWith({ __db: true }, 'expenses')
  handler({ docs: [
    { id: 'e2', data: () => ({ amount: 20, createdAt: 2 }) },
    { id: 'e1', data: () => ({ amount: 10, createdAt: 1 }) },
  ] })
  expect(received[0]).toEqual([
    { id: 'e1', amount: 10, createdAt: 1 },
    { id: 'e2', amount: 20, createdAt: 2 },
  ])
  expect(typeof unsub).toBe('function')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/expense/expensesRepo.test.ts`
Expected: FAIL — `src/expense/expensesRepo.ts` does not exist.

- [ ] **Step 3: Create `src/expense/expensesRepo.ts`**

```ts
import { collection, addDoc, onSnapshot } from 'firebase/firestore'
import { getDb } from '../lib/firebase'
import type { Expense } from '../domain/types'

export async function addExpense(expense: Omit<Expense, 'id'>): Promise<string> {
  const ref = await addDoc(collection(getDb(), 'expenses'), expense)
  return ref.id
}

export function subscribeAllExpenses(cb: (expenses: Expense[]) => void): () => void {
  return onSnapshot(collection(getDb(), 'expenses'), (snap) => {
    const expenses = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Expense, 'id'>) }))
    cb(expenses.sort((a, b) => a.createdAt - b.createdAt))
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/expense/expensesRepo.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add expenses repository (add + subscribe all)"
```

---

### Task 3: Pure dashboard metrics

**Files:**
- Create: `src/dashboard/metrics.ts`
- Test: `src/dashboard/metrics.test.ts`

**Interfaces:**
- Consumes: `Order`, `Expense`, `BoothId`, `BOOTH_IDS`.
- Produces: `interface BestSeller { sku; name; qty; sales }`; `interface DashboardMetrics { totalSales; byBooth: Record<BoothId,number>; cashTotal; qrTotal; paidOrderCount; doneCount; bestSellers: BestSeller[]; totalCost; netDonation; expectedCash }`; `computeDashboardMetrics(orders: Order[], expenses: Expense[]): DashboardMetrics`.

- [ ] **Step 1: Write the failing test `src/dashboard/metrics.test.ts`**

```ts
import { computeDashboardMetrics } from './metrics'
import type { Order, Expense } from '../domain/types'

const o = (over: Partial<Order>): Order => ({
  id: 'x', boothId: 'drinks', queueNumber: 'A1', station: 'A',
  items: [{ sku: 'a', name: 'A', qty: 1, unitPrice: 30, subtotal: 30 }],
  total: 30, paymentMethod: 'cash', paymentStatus: 'paid', status: 'done', createdAt: 1, ...over,
})

test('only paid, non-cancelled orders count as revenue', () => {
  const m = computeDashboardMetrics([
    o({ id: '1', total: 30, paymentStatus: 'paid', status: 'done' }),
    o({ id: '2', total: 25, paymentStatus: 'pending', status: 'waiting' }), // unpaid → excluded
    o({ id: '3', total: 99, paymentStatus: 'paid', status: 'cancelled' }),  // cancelled → excluded
  ], [])
  expect(m.totalSales).toBe(30)
  expect(m.paidOrderCount).toBe(1)
})

test('cash vs qr split and expected cash = cash subset', () => {
  const m = computeDashboardMetrics([
    o({ id: '1', total: 30, paymentMethod: 'cash' }),
    o({ id: '2', total: 25, paymentMethod: 'qr' }),
    o({ id: '3', total: 10, paymentMethod: 'cash' }),
  ], [])
  expect(m.cashTotal).toBe(40)
  expect(m.qrTotal).toBe(25)
  expect(m.expectedCash).toBe(40)
})

test('byBooth sums revenue per booth with all booths present', () => {
  const m = computeDashboardMetrics([
    o({ id: '1', boothId: 'photo', total: 35 }),
    o({ id: '2', boothId: 'drinks', total: 30 }),
    o({ id: '3', boothId: 'drinks', total: 25 }),
  ], [])
  expect(m.byBooth).toEqual({ photo: 35, portrait: 0, drinks: 55 })
})

test('doneCount counts done orders regardless of the revenue filter', () => {
  const m = computeDashboardMetrics([
    o({ id: '1', status: 'done' }),
    o({ id: '2', status: 'serving' }),
    o({ id: '3', status: 'done' }),
  ], [])
  expect(m.doneCount).toBe(2)
})

test('bestSellers aggregates items by sku, sorted by qty desc', () => {
  const m = computeDashboardMetrics([
    o({ id: '1', items: [{ sku: 'a', name: 'A', qty: 2, unitPrice: 30, subtotal: 60 }], total: 60 }),
    o({ id: '2', items: [
      { sku: 'a', name: 'A', qty: 1, unitPrice: 30, subtotal: 30 },
      { sku: 'b', name: 'B', qty: 5, unitPrice: 25, subtotal: 125 },
    ], total: 155 }),
  ], [])
  expect(m.bestSellers).toEqual([
    { sku: 'b', name: 'B', qty: 5, sales: 125 },
    { sku: 'a', name: 'A', qty: 3, sales: 90 },
  ])
})

test('totalCost, netDonation reflect expenses', () => {
  const expenses: Expense[] = [
    { id: 'e1', boothId: 'photo', description: 'ฟิล์ม', amount: 200, createdAt: 1 },
    { id: 'e2', boothId: 'drinks', description: 'ยาคูลท์', amount: 50, createdAt: 2 },
  ]
  const m = computeDashboardMetrics([o({ id: '1', total: 300 })], expenses)
  expect(m.totalCost).toBe(250)
  expect(m.netDonation).toBe(50)
})

test('empty input yields zeroed metrics', () => {
  const m = computeDashboardMetrics([], [])
  expect(m).toMatchObject({ totalSales: 0, cashTotal: 0, qrTotal: 0, paidOrderCount: 0, doneCount: 0, totalCost: 0, netDonation: 0, expectedCash: 0, bestSellers: [] })
  expect(m.byBooth).toEqual({ photo: 0, portrait: 0, drinks: 0 })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/dashboard/metrics.test.ts`
Expected: FAIL — `src/dashboard/metrics.ts` does not exist.

- [ ] **Step 3: Create `src/dashboard/metrics.ts`**

```ts
import type { Order, Expense, BoothId } from '../domain/types'
import { BOOTH_IDS } from '../domain/types'

export interface BestSeller {
  sku: string
  name: string
  qty: number
  sales: number
}

export interface DashboardMetrics {
  totalSales: number
  byBooth: Record<BoothId, number>
  cashTotal: number
  qrTotal: number
  paidOrderCount: number
  doneCount: number
  bestSellers: BestSeller[]
  totalCost: number
  netDonation: number
  expectedCash: number
}

function isRevenue(o: Order): boolean {
  return o.paymentStatus === 'paid' && o.status !== 'cancelled'
}

export function computeDashboardMetrics(orders: Order[], expenses: Expense[]): DashboardMetrics {
  const byBooth = Object.fromEntries(BOOTH_IDS.map((b) => [b, 0])) as Record<BoothId, number>
  const sellers = new Map<string, BestSeller>()
  let totalSales = 0
  let cashTotal = 0
  let qrTotal = 0
  let expectedCash = 0
  let paidOrderCount = 0

  for (const order of orders) {
    if (!isRevenue(order)) continue
    paidOrderCount += 1
    totalSales += order.total
    byBooth[order.boothId] += order.total
    if (order.paymentMethod === 'cash') {
      cashTotal += order.total
      expectedCash += order.total
    } else if (order.paymentMethod === 'qr') {
      qrTotal += order.total
    }
    for (const item of order.items) {
      const acc = sellers.get(item.sku) ?? { sku: item.sku, name: item.name, qty: 0, sales: 0 }
      acc.qty += item.qty
      acc.sales += item.subtotal
      sellers.set(item.sku, acc)
    }
  }

  const totalCost = expenses.reduce((sum, e) => sum + e.amount, 0)
  const bestSellers = [...sellers.values()].sort((a, b) => b.qty - a.qty)
  const doneCount = orders.filter((o) => o.status === 'done').length

  return {
    totalSales,
    byBooth,
    cashTotal,
    qrTotal,
    paidOrderCount,
    doneCount,
    bestSellers,
    totalCost,
    netDonation: totalSales - totalCost,
    expectedCash,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/dashboard/metrics.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add pure dashboard metrics aggregation"
```

---

### Task 4: Dashboard PIN store

**Files:**
- Create: `src/dashboard/pinStore.ts`
- Test: `src/dashboard/pinStore.test.ts`

**Interfaces:**
- Consumes: `APP_CONFIG.dashboardPin`.
- Produces: `isDashboardUnlocked(): boolean`; `unlockDashboard(pin: string): boolean` (writes `phantom.dashboardPin` on match); `lockDashboard(): void`.

- [ ] **Step 1: Write the failing test `src/dashboard/pinStore.test.ts`**

```ts
import { isDashboardUnlocked, unlockDashboard, lockDashboard } from './pinStore'

beforeEach(() => localStorage.clear())

test('starts locked', () => {
  expect(isDashboardUnlocked()).toBe(false)
})

test('wrong PIN does not unlock', () => {
  expect(unlockDashboard('0000')).toBe(false)
  expect(isDashboardUnlocked()).toBe(false)
})

test('correct PIN REDACTED-PIN unlocks and is remembered', () => {
  expect(unlockDashboard('REDACTED-PIN')).toBe(true)
  expect(isDashboardUnlocked()).toBe(true)
})

test('lockDashboard re-locks', () => {
  unlockDashboard('REDACTED-PIN')
  lockDashboard()
  expect(isDashboardUnlocked()).toBe(false)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/dashboard/pinStore.test.ts`
Expected: FAIL — `src/dashboard/pinStore.ts` does not exist.

- [ ] **Step 3: Create `src/dashboard/pinStore.ts`**

```ts
import { APP_CONFIG } from '../domain/appConfig'

const KEY = 'phantom.dashboardPin'

export function isDashboardUnlocked(): boolean {
  return localStorage.getItem(KEY) === 'unlocked'
}

export function unlockDashboard(pin: string): boolean {
  if (pin === APP_CONFIG.dashboardPin) {
    localStorage.setItem(KEY, 'unlocked')
    return true
  }
  return false
}

export function lockDashboard(): void {
  localStorage.removeItem(KEY)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/dashboard/pinStore.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add dashboard PIN store (localStorage remember)"
```

---

### Task 5: PinGate component

**Files:**
- Create: `src/dashboard/PinGate.tsx`
- Modify: `src/i18n/labels.ts` (add PIN labels)
- Test: `src/dashboard/PinGate.test.tsx`

**Interfaces:**
- Consumes: `unlockDashboard` (pinStore); `L`.
- Produces: `<PinGate onUnlock={() => void} />` — PIN input + submit; wrong PIN shows a `role="alert"` error and does not call `onUnlock`; correct PIN calls `unlockDashboard` then `onUnlock`.

- [ ] **Step 1: Add PIN labels to `src/i18n/labels.ts`**

Add to the `LABELS` object (keep existing):

```ts
  'dashboard.pinPrompt': { th: 'ใส่ PIN', en: 'Enter PIN' },
  'dashboard.pinWrong': { th: 'PIN ไม่ถูกต้อง', en: 'Wrong PIN' },
  'dashboard.unlock': { th: 'ปลดล็อก', en: 'Unlock' },
```

- [ ] **Step 2: Write the failing test `src/dashboard/PinGate.test.tsx`**

```tsx
import { vi, beforeEach, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PinGate } from './PinGate'

beforeEach(() => localStorage.clear())

test('wrong PIN shows an error and does not unlock', async () => {
  const user = userEvent.setup()
  const onUnlock = vi.fn()
  render(<PinGate onUnlock={onUnlock} />)
  await user.type(screen.getByLabelText(/ใส่ PIN/), '0000')
  await user.click(screen.getByRole('button', { name: /ปลดล็อก/ }))
  expect(screen.getByRole('alert')).toBeInTheDocument()
  expect(onUnlock).not.toHaveBeenCalled()
})

test('correct PIN calls onUnlock', async () => {
  const user = userEvent.setup()
  const onUnlock = vi.fn()
  render(<PinGate onUnlock={onUnlock} />)
  await user.type(screen.getByLabelText(/ใส่ PIN/), 'REDACTED-PIN')
  await user.click(screen.getByRole('button', { name: /ปลดล็อก/ }))
  expect(onUnlock).toHaveBeenCalled()
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/dashboard/PinGate.test.tsx`
Expected: FAIL — `src/dashboard/PinGate.tsx` does not exist.

- [ ] **Step 4: Create `src/dashboard/PinGate.tsx`**

```tsx
import { useState } from 'react'
import { unlockDashboard } from './pinStore'
import { L } from '../i18n/labels'

export function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  const submit = () => {
    if (unlockDashboard(pin)) {
      onUnlock()
    } else {
      setError(true)
      setPin('')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
      <h1 className="font-kanit text-2xl text-phantom-yellow">
        {L('dashboard.pinPrompt').th} · {L('dashboard.pinPrompt').en}
      </h1>
      <input
        type="password"
        inputMode="numeric"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        aria-label={L('dashboard.pinPrompt').th}
        className="rounded-lg bg-black/40 px-4 py-3 text-center font-mono text-2xl text-white"
      />
      {error && (
        <p role="alert" className="text-red-400 font-kanit">
          {L('dashboard.pinWrong').th} · {L('dashboard.pinWrong').en}
        </p>
      )}
      <button onClick={submit} className="rounded-xl px-6 py-3 bg-phantom-yellow text-phantom-bg font-kanit">
        {L('dashboard.unlock').th} · {L('dashboard.unlock').en}
      </button>
    </div>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/dashboard/PinGate.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add dashboard PIN gate component"
```

---

### Task 6: Dashboard screen

**Files:**
- Create: `src/screens/DashboardScreen.tsx`
- Modify: `src/i18n/labels.ts` (add metric + expense labels)
- Test: `src/screens/DashboardScreen.test.tsx`

**Interfaces:**
- Consumes: `subscribeAllOrders` (ordersRepo); `subscribeAllExpenses`/`addExpense` (expensesRepo); `computeDashboardMetrics`; `isDashboardUnlocked`; `PinGate`; `BOOTH_IDS`; `L`.
- Produces: `<DashboardScreen />` — if locked, renders `<PinGate onUnlock=.../>`; once unlocked, subscribes to all orders + expenses (cleanup on unmount), computes metrics, renders metric cards (each key metric with a `data-testid`) + a minimal expense-entry form (booth select + description + amount → `addExpense`).

- [ ] **Step 1: Add dashboard labels to `src/i18n/labels.ts`**

Add to `LABELS` (keep existing, incl. the Task-5 PIN labels):

```ts
  'dashboard.title': { th: 'แดชบอร์ดรวม', en: 'Dashboard' },
  'dashboard.totalSales': { th: 'ยอดขายรวม', en: 'Total sales' },
  'dashboard.netDonation': { th: 'ยอดบริจาคสุทธิ', en: 'Net donation' },
  'dashboard.cash': { th: 'เงินสด', en: 'Cash' },
  'dashboard.qr': { th: 'โอน/QR', en: 'QR' },
  'dashboard.orders': { th: 'ออเดอร์ที่จ่ายแล้ว', en: 'Paid orders' },
  'dashboard.done': { th: 'คิวเสร็จ', en: 'Done' },
  'dashboard.bestSellers': { th: 'ขายดี', en: 'Best sellers' },
  'dashboard.totalCost': { th: 'ต้นทุนรวม', en: 'Total cost' },
  'dashboard.expectedCash': { th: 'เงินสดที่ควรมี', en: 'Expected cash' },
  'dashboard.byBooth': { th: 'แยกตามซุ้ม', en: 'By booth' },
  'dashboard.addExpense': { th: 'เพิ่มต้นทุน', en: 'Add expense' },
  'dashboard.expenseDesc': { th: 'รายการ', en: 'Description' },
  'dashboard.expenseAmount': { th: 'จำนวนเงิน', en: 'Amount' },
  'dashboard.save': { th: 'บันทึก', en: 'Save' },
```

- [ ] **Step 2: Write the failing test `src/screens/DashboardScreen.test.tsx`**

```tsx
import { vi, beforeEach, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { act } from 'react'
import userEvent from '@testing-library/user-event'
import type { Order } from '../domain/types'

let emitOrders: (o: Order[]) => void = () => {}
let emitExpenses: (e: unknown[]) => void = () => {}
const { addExpenseSpy } = vi.hoisted(() => ({ addExpenseSpy: vi.fn().mockResolvedValue('e1') }))
vi.mock('../order/ordersRepo', () => ({
  subscribeAllOrders: (cb: (o: Order[]) => void) => { emitOrders = cb; return () => {} },
}))
vi.mock('../expense/expensesRepo', () => ({
  subscribeAllExpenses: (cb: (e: unknown[]) => void) => { emitExpenses = cb; return () => {} },
  addExpense: addExpenseSpy,
}))

import { DashboardScreen } from './DashboardScreen'

const o = (over: Partial<Order>): Order => ({
  id: 'x', boothId: 'drinks', queueNumber: 'A1', station: 'A',
  items: [{ sku: 'a', name: 'A', qty: 1, unitPrice: 30, subtotal: 30 }],
  total: 30, paymentMethod: 'cash', paymentStatus: 'paid', status: 'done', createdAt: 1, ...over,
})

beforeEach(() => {
  localStorage.clear()
  addExpenseSpy.mockClear()
})

test('renders the PIN gate when locked', () => {
  render(<DashboardScreen />)
  expect(screen.getByText(/ใส่ PIN/)).toBeInTheDocument()
})

test('when unlocked, shows net donation computed from live orders and expenses', () => {
  localStorage.setItem('phantom.dashboardPin', 'unlocked')
  render(<DashboardScreen />)
  act(() => {
    emitOrders([o({ id: '1', total: 300, paymentMethod: 'cash' })])
    emitExpenses([{ id: 'e1', boothId: 'photo', description: 'ฟิล์ม', amount: 200, createdAt: 1 }])
  })
  expect(screen.getByTestId('net-donation')).toHaveTextContent('100')
  expect(screen.getByTestId('total-sales')).toHaveTextContent('300')
  expect(screen.getByTestId('expected-cash')).toHaveTextContent('300')
})

test('the expense form calls addExpense with the entered values', async () => {
  localStorage.setItem('phantom.dashboardPin', 'unlocked')
  const user = userEvent.setup()
  render(<DashboardScreen />)
  await user.type(screen.getByLabelText(/รายการ/), 'ยาคูลท์ 5 แพ็ค')
  await user.type(screen.getByLabelText(/จำนวนเงิน/), '250')
  await user.click(screen.getByRole('button', { name: /บันทึก/ }))
  expect(addExpenseSpy).toHaveBeenCalledWith(
    expect.objectContaining({ description: 'ยาคูลท์ 5 แพ็ค', amount: 250 }),
  )
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/screens/DashboardScreen.test.tsx`
Expected: FAIL — `src/screens/DashboardScreen.tsx` does not exist.

- [ ] **Step 4: Create `src/screens/DashboardScreen.tsx`**

```tsx
import { useEffect, useState } from 'react'
import type { Order, Expense, BoothId } from '../domain/types'
import { BOOTH_IDS } from '../domain/types'
import { subscribeAllOrders } from '../order/ordersRepo'
import { subscribeAllExpenses, addExpense } from '../expense/expensesRepo'
import { computeDashboardMetrics } from '../dashboard/metrics'
import { isDashboardUnlocked } from '../dashboard/pinStore'
import { PinGate } from '../dashboard/PinGate'
import { L } from '../i18n/labels'

function Card({ testid, labelTh, labelEn, value }: { testid: string; labelTh: string; labelEn: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/15 p-4 flex flex-col gap-1">
      <span className="font-kanit text-sm opacity-70">{labelTh} · {labelEn}</span>
      <span data-testid={testid} className="font-mono text-3xl text-phantom-orange">{value}</span>
    </div>
  )
}

export function DashboardScreen() {
  const [unlocked, setUnlocked] = useState(() => isDashboardUnlocked())
  const [orders, setOrders] = useState<Order[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [booth, setBooth] = useState<BoothId>('photo')
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')

  useEffect(() => {
    if (!unlocked) return
    const u1 = subscribeAllOrders(setOrders)
    const u2 = subscribeAllExpenses(setExpenses)
    return () => { u1(); u2() }
  }, [unlocked])

  if (!unlocked) return <PinGate onUnlock={() => setUnlocked(true)} />

  const m = computeDashboardMetrics(orders, expenses)

  const saveExpense = () => {
    const value = Number(amount)
    if (!desc.trim() || !Number.isFinite(value) || value <= 0) return
    addExpense({ boothId: booth, description: desc.trim(), amount: value, createdAt: Date.now() })
    setDesc('')
    setAmount('')
  }

  return (
    <div className="min-h-screen p-6 flex flex-col gap-6">
      <h1 className="font-kanit text-2xl text-phantom-yellow">
        {L('dashboard.title').th} · {L('dashboard.title').en}
      </h1>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card testid="total-sales" labelTh={L('dashboard.totalSales').th} labelEn={L('dashboard.totalSales').en} value={`${m.totalSales}฿`} />
        <Card testid="net-donation" labelTh={L('dashboard.netDonation').th} labelEn={L('dashboard.netDonation').en} value={`${m.netDonation}฿`} />
        <Card testid="cash-total" labelTh={L('dashboard.cash').th} labelEn={L('dashboard.cash').en} value={`${m.cashTotal}฿`} />
        <Card testid="qr-total" labelTh={L('dashboard.qr').th} labelEn={L('dashboard.qr').en} value={`${m.qrTotal}฿`} />
        <Card testid="total-cost" labelTh={L('dashboard.totalCost').th} labelEn={L('dashboard.totalCost').en} value={`${m.totalCost}฿`} />
        <Card testid="expected-cash" labelTh={L('dashboard.expectedCash').th} labelEn={L('dashboard.expectedCash').en} value={`${m.expectedCash}฿`} />
        <Card testid="paid-orders" labelTh={L('dashboard.orders').th} labelEn={L('dashboard.orders').en} value={`${m.paidOrderCount}`} />
        <Card testid="done-count" labelTh={L('dashboard.done').th} labelEn={L('dashboard.done').en} value={`${m.doneCount}`} />
      </section>

      <section>
        <h2 className="font-kanit opacity-80 mb-2">{L('dashboard.byBooth').th} · {L('dashboard.byBooth').en}</h2>
        <div className="flex flex-wrap gap-4">
          {BOOTH_IDS.map((b) => (
            <div key={b} className="font-mono">
              {L(`booth.${b}`).th}: <span className="text-phantom-yellow">{m.byBooth[b]}฿</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-kanit opacity-80 mb-2">{L('dashboard.bestSellers').th} · {L('dashboard.bestSellers').en}</h2>
        <ul className="flex flex-col gap-1">
          {m.bestSellers.map((s) => (
            <li key={s.sku} className="font-mono">{s.name} × {s.qty} = {s.sales}฿</li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl bg-white/5 p-4 flex flex-col gap-3 max-w-md">
        <h2 className="font-kanit">{L('dashboard.addExpense').th} · {L('dashboard.addExpense').en}</h2>
        <select value={booth} onChange={(e) => setBooth(e.target.value as BoothId)} aria-label={L('dashboard.byBooth').th}
          className="rounded bg-black/40 px-2 py-2 text-white font-kanit">
          {BOOTH_IDS.map((b) => <option key={b} value={b}>{L(`booth.${b}`).th}</option>)}
        </select>
        <input value={desc} onChange={(e) => setDesc(e.target.value)} aria-label={L('dashboard.expenseDesc').th}
          className="rounded bg-black/40 px-2 py-2 text-white" />
        <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" aria-label={L('dashboard.expenseAmount').th}
          className="rounded bg-black/40 px-2 py-2 text-white font-mono" />
        <button onClick={saveExpense} className="rounded-lg px-4 py-2 bg-phantom-yellow text-phantom-bg font-kanit">
          {L('dashboard.save').th} · {L('dashboard.save').en}
        </button>
      </section>
    </div>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/screens/DashboardScreen.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Dashboard screen (metrics + net donation + expense entry)"
```

---

### Task 7: Route dashboard mode into App

**Files:**
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: `DashboardScreen`; existing routing.
- Produces: `App` renders `<DashboardScreen />` (with the shared corner reset button) when `config.mode === 'dashboard'`. order/display unchanged; the generic placeholder is replaced by a minimal safety fallback.

- [ ] **Step 1: Add the dashboard-mode test to `src/App.test.tsx`**

Add (keep the existing three tests). Also add an `../expense/expensesRepo` mock alongside the existing `./order/ordersRepo` mock at the top so nothing hits Firestore even if a future change subscribes:

```tsx
vi.mock('./expense/expensesRepo', () => ({
  subscribeAllExpenses: () => () => {},
  addExpense: vi.fn(),
}))

test('dashboard mode shows the PIN gate', async () => {
  const user = userEvent.setup()
  render(<App />)
  await user.click(screen.getByRole('button', { name: /โฟโต้บูธ/ }))
  await user.click(screen.getByRole('button', { name: /แดชบอร์ด/ }))
  await user.click(screen.getByRole('button', { name: /ยืนยัน/ }))
  expect(screen.getByText(/ใส่ PIN/)).toBeInTheDocument()
})
```

Also extend the existing `./order/ordersRepo` mock at the top of the file to include `subscribeAllOrders: () => () => {}` (so the mock stays complete).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL — dashboard mode still renders the placeholder (no PIN prompt).

- [ ] **Step 3: Update `src/App.tsx`**

Add the import and a dashboard branch before the fallback; replace the placeholder with a minimal safety fallback:

```tsx
import { useState } from 'react'
import { SetupScreen } from './screens/SetupScreen'
import { OrderStation } from './screens/OrderStation'
import { DisplayScreen } from './screens/DisplayScreen'
import { DashboardScreen } from './screens/DashboardScreen'
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

  if (config.mode === 'display') {
    return (
      <div className="min-h-screen">
        <DisplayScreen booth={config.booth} />
        <div className="fixed bottom-2 right-2 opacity-40 hover:opacity-100">{ResetButton}</div>
      </div>
    )
  }

  if (config.mode === 'dashboard') {
    return (
      <div className="min-h-screen">
        <DashboardScreen />
        <div className="fixed bottom-2 right-2 opacity-40 hover:opacity-100">{ResetButton}</div>
      </div>
    )
  }

  // Safety fallback (e.g. order mode with no station — prevented by isConfigValid).
  return (
    <div className="min-h-screen p-6 flex flex-col gap-4">
      <p className="font-mono">ซุ้ม: {config.booth} · โหมด: {config.mode}</p>
      {ResetButton}
    </div>
  )
}
```

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: PASS — all suites green (Setup, order, display, dashboard→PIN gate).

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: build completes, no type errors, PWA generates.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: route dashboard mode to the Dashboard screen"
```

---

## Self-Review

**Spec coverage (Dashboard, base spec §4 📊 + §6 feature 2/3/4 + §10 MVP item 6):**
- PIN-gated dashboard (`REDACTED-PIN`, remembered) → Tasks 4, 5, 6, 7 ✓
- Realtime totals across all 3 booths → Task 1 (`subscribeAllOrders`) + Task 6 ✓
- Total sales, per-booth, cash vs QR (group by paymentMethod), order/done counts, best-sellers, total cost, net donation, expected cash → Task 3 metrics + Task 6 cards ✓
- Net donation = Σ paid.total − Σ expenses (feature 4) → Task 3 + expense entry Tasks 2, 6 ✓
- Cash/QR split automatic (feature 3) → Task 3 ✓
- Firestore at edges / offline / no composite index → Tasks 1, 2 (unfiltered onSnapshot, client-sort) ✓
- Deferred by design: Export Excel/PDF (later plan); donation thermometer/target, Happy-Hour, cash reconciliation, passport (Plan 5/6); HQ + comms (Plan 5). Dashboard shows net donation as a number.

**Placeholder scan:** No TBD/TODO. The App safety fallback is an intentional guard for the `isConfigValid`-prevented order-without-station case, not an unfinished screen.

**Type consistency:** `subscribeAllOrders`/`subscribeAllExpenses`/`addExpense` (Tasks 1, 2) consumed by Task 6 with matching signatures. `computeDashboardMetrics(orders, expenses): DashboardMetrics` (Task 3) consumed by Task 6. `isDashboardUnlocked`/`unlockDashboard` (Task 4) consumed by Task 5 (`unlockDashboard`) and Task 6 (`isDashboardUnlocked`). `<PinGate onUnlock />` (Task 5) consumed by Task 6. `<DashboardScreen />` (Task 6) consumed by Task 7. No drift.

---

*Plan 4 of 6 · Dashboard · ต่อยอดจาก Display · ม.6/7 · PHANTOM CREW*
