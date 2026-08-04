# Queue Pro-Upgrade + Display Centering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add pro-grade, error-proof queue controls (undo · no-show skip/recall · re-announce · call-specific · idempotency guards) and rebuild the customer Display as a centered, glanceable, language-independent screen that spotlights the next number ("เตรียมตัว / Get ready").

**Architecture:** All queue-action decisions are pure, guarded functions in `src/queue/queueActions.ts` (each returns a Firestore field-patch or `null` = safe no-op) — heavily unit-tested. QueuePanel composes them (subscribe → call helper → `updateOrderStatus`) and holds a one-step undo snapshot in local state. The Display's alert logic gains a pure "re-announce" rule (fire on a new serving number OR a bumped `announcedAt`), and the Display is restyled centered + glanceable. Firestore repo is unchanged.

**Tech Stack:** React 19, TypeScript, Tailwind (Neon Clarity tokens + `src/ui` primitives), Vitest + @testing-library/react.

## Global Constraints

- **Builds on the current app** (113 tests, Neon Clarity UI). Reuse `updateOrderStatus`/`subscribeBoothOrders` (`src/order/ordersRepo.ts`), `Order`/types, `L`, and `src/ui` primitives (Button/Panel/QueueNumber). Do NOT change the Firestore repo, accounting/metrics, cart, comms, or menu.
- **Data model (additive/backward-compatible):** `OrderStatus` gains `'skipped'`; `Order` gains `announcedAt?: number`. Existing orders + metrics stay valid (`skipped` is not `done` and not `cancelled`; a paid skipped order still counts as revenue, which is correct — money is in).
- **Idempotency:** every action is a *guarded* pure function — it returns a patch only if the order is in the expected source state, else `null`. Double-taps / two devices acting at once cannot double-grab or mis-advance.
- **Undo = one step:** QueuePanel snapshots the order's mutable fields *before* an action; Undo restores that snapshot. Restores only DEFINED prior fields (no `undefined` reaches Firestore); stale leftover timestamps are harmless because `status` is authoritative. No confirm-dialogs on normal actions (Undo replaces them); Cancel keeps its required reason.
- **Display glanceable (language-independent):** centered layout; color semantics (serving = orange glow, next = yellow "get ready", rest = dim); icons per zone (🔔 serving / 👉 next); size hierarchy (serving biggest → next medium → rest small); flash on new call; Thai labels prominent, English small. Understandable at a glance without reading English. `skipped` orders never appear on the customer Display.
- **This is a behavior change** (new statuses/buttons/re-announce/centered display) — updating the QueuePanel/Display/useServingAlert tests to match is CORRECT (unlike a pure restyle). Pure `queueActions` gets the heaviest coverage.
- **Optimistic writes** per convention (don't await for UI). `now` is injected into pure functions for testability; QueuePanel passes `Date.now()`.
- **Testing:** Vitest. Run `npm test` + `npm run build` each task. Commit after each task.

---

### Task 1: Domain model — `skipped` status + `announcedAt`

**Files:**
- Modify: `src/domain/types.ts`
- Test: `src/domain/types.test.ts` (extend)

**Interfaces:**
- Produces: `OrderStatus` includes `'skipped'`; `Order` has optional `announcedAt?: number`.

- [ ] **Step 1: Add the failing test to `src/domain/types.test.ts`**

```ts
import type { Order, OrderStatus } from './types'

test('OrderStatus includes skipped and Order has announcedAt', () => {
  const s: OrderStatus = 'skipped'
  const o: Order = {
    id: 'x', boothId: 'drinks', queueNumber: 'A1', station: 'A', items: [], total: 0,
    paymentMethod: 'cash', paymentStatus: 'paid', status: s, createdAt: 1, announcedAt: 5,
  }
  expect(o.status).toBe('skipped')
  expect(o.announcedAt).toBe(5)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/types.test.ts`
Expected: FAIL — `'skipped'` not assignable / `announcedAt` unknown.

- [ ] **Step 3: Edit `src/domain/types.ts`**

Change `OrderStatus` to `'waiting' | 'serving' | 'done' | 'cancelled' | 'skipped'`. Add `announcedAt?: number` to the `Order` interface (next to `servingAt?`/`doneAt?`).

- [ ] **Step 4: Run test + full suite**

Run: `npx vitest run src/domain/types.test.ts` then `npm test`
Expected: PASS (additive — nothing else breaks).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(queue): add skipped status + announcedAt to the order model"
```

---

### Task 2: Pure queue actions (guarded + idempotent) + undo snapshot

**Files:**
- Create: `src/queue/queueActions.ts`
- Test: `src/queue/queueActions.test.ts`

**Interfaces:**
- Consumes: `Order` type.
- Produces:
  - `callNext(orders: Order[], station: Station, now: number): { id: string; patch: Partial<Order> } | null`
  - `callSpecific(order: Order, now: number): Partial<Order> | null`
  - `markDone(order: Order, now: number): Partial<Order> | null`
  - `skip(order: Order): Partial<Order> | null`
  - `recall(order: Order, now: number): Partial<Order> | null`
  - `reannounce(order: Order, now: number): Partial<Order> | null`
  - `orderSnapshot(order: Order): Partial<Order>` — the DEFINED subset of `{status, servingAt, doneAt, announcedAt, cancelReason}` for undo.

- [ ] **Step 1: Write the failing test `src/queue/queueActions.test.ts`**

```ts
import { callNext, callSpecific, markDone, skip, recall, reannounce, orderSnapshot } from './queueActions'
import type { Order } from '../domain/types'

const o = (over: Partial<Order>): Order => ({
  id: 'x', boothId: 'drinks', queueNumber: 'A1', station: 'A', items: [], total: 0,
  paymentMethod: 'cash', paymentStatus: 'paid', status: 'waiting', createdAt: 1, ...over,
})

test('callNext picks the first waiting of the station and serves it (with timestamps)', () => {
  const r = callNext([
    o({ id: 'a', station: 'A', status: 'waiting', createdAt: 2 }),
    o({ id: 'b', station: 'A', status: 'waiting', createdAt: 1 }),
    o({ id: 'c', station: 'B', status: 'waiting', createdAt: 0 }),
  ], 'A', 100)
  expect(r).toEqual({ id: 'b', patch: { status: 'serving', servingAt: 100, announcedAt: 100 } })
})

test('callNext returns null when no waiting for the station (no-op guard)', () => {
  expect(callNext([o({ station: 'A', status: 'serving' })], 'A', 100)).toBeNull()
})

test('callSpecific serves a waiting order, null otherwise (idempotency guard)', () => {
  expect(callSpecific(o({ status: 'waiting' }), 100)).toEqual({ status: 'serving', servingAt: 100, announcedAt: 100 })
  expect(callSpecific(o({ status: 'serving' }), 100)).toBeNull()
})

test('markDone only from serving', () => {
  expect(markDone(o({ status: 'serving' }), 100)).toEqual({ status: 'done', doneAt: 100 })
  expect(markDone(o({ status: 'waiting' }), 100)).toBeNull()
})

test('skip: serving -> skipped', () => {
  expect(skip(o({ status: 'serving' }))).toEqual({ status: 'skipped' })
  expect(skip(o({ status: 'waiting' }))).toBeNull()
})

test('recall: skipped -> serving (re-announces)', () => {
  expect(recall(o({ status: 'skipped' }), 100)).toEqual({ status: 'serving', servingAt: 100, announcedAt: 100 })
  expect(recall(o({ status: 'serving' }), 100)).toBeNull()
})

test('reannounce bumps announcedAt on a serving order only', () => {
  expect(reannounce(o({ status: 'serving' }), 100)).toEqual({ announcedAt: 100 })
  expect(reannounce(o({ status: 'skipped' }), 100)).toBeNull()
})

test('orderSnapshot captures only defined mutable fields (for undo)', () => {
  expect(orderSnapshot(o({ status: 'serving', servingAt: 5 }))).toEqual({ status: 'serving', servingAt: 5 })
  expect(orderSnapshot(o({ status: 'done', servingAt: 5, doneAt: 9, announcedAt: 5, cancelReason: 'x' })))
    .toEqual({ status: 'done', servingAt: 5, doneAt: 9, announcedAt: 5, cancelReason: 'x' })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/queue/queueActions.test.ts`
Expected: FAIL — `src/queue/queueActions.ts` does not exist.

- [ ] **Step 3: Create `src/queue/queueActions.ts`**

```ts
import type { Order, Station } from '../domain/types'

export function callNext(orders: Order[], station: Station, now: number): { id: string; patch: Partial<Order> } | null {
  const next = orders
    .filter((o) => o.station === station && o.status === 'waiting')
    .sort((a, b) => a.createdAt - b.createdAt)[0]
  if (!next) return null
  return { id: next.id, patch: { status: 'serving', servingAt: now, announcedAt: now } }
}

export function callSpecific(order: Order, now: number): Partial<Order> | null {
  if (order.status !== 'waiting') return null
  return { status: 'serving', servingAt: now, announcedAt: now }
}

export function markDone(order: Order, now: number): Partial<Order> | null {
  if (order.status !== 'serving') return null
  return { status: 'done', doneAt: now }
}

export function skip(order: Order): Partial<Order> | null {
  if (order.status !== 'serving') return null
  return { status: 'skipped' }
}

export function recall(order: Order, now: number): Partial<Order> | null {
  if (order.status !== 'skipped') return null
  return { status: 'serving', servingAt: now, announcedAt: now }
}

export function reannounce(order: Order, now: number): Partial<Order> | null {
  if (order.status !== 'serving') return null
  return { announcedAt: now }
}

export function orderSnapshot(order: Order): Partial<Order> {
  const snap: Partial<Order> = { status: order.status }
  if (order.servingAt !== undefined) snap.servingAt = order.servingAt
  if (order.doneAt !== undefined) snap.doneAt = order.doneAt
  if (order.announcedAt !== undefined) snap.announcedAt = order.announcedAt
  if (order.cancelReason !== undefined) snap.cancelReason = order.cancelReason
  return snap
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/queue/queueActions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(queue): pure guarded queue actions + undo snapshot"
```

---

### Task 3: Re-announce alert rule + hook

**Files:**
- Modify: `src/display/queueView.ts` (add `newlyAnnounced`)
- Modify: `src/display/useServingAlert.ts`
- Test: `src/display/queueView.test.ts` (extend), `src/display/useServingAlert.test.ts` (update)

**Interfaces:**
- Produces: `type ServingSig = { n: string; announcedAt: number }`; `newlyAnnounced(prev: ServingSig[], next: ServingSig[]): ServingSig[]` (entries whose number is new OR whose announcedAt increased). `useServingAlert(serving: ServingSig[], primed?: boolean): boolean`.

- [ ] **Step 1: Add the failing test for `newlyAnnounced` to `src/display/queueView.test.ts`**

```ts
import { newlyAnnounced } from './queueView'

test('newlyAnnounced fires for a new number OR a bumped announcedAt', () => {
  const prev = [{ n: 'A1', announcedAt: 5 }]
  // new number A2
  expect(newlyAnnounced(prev, [{ n: 'A1', announcedAt: 5 }, { n: 'A2', announcedAt: 7 }]))
    .toEqual([{ n: 'A2', announcedAt: 7 }])
  // same number, bumped announcedAt -> re-announce
  expect(newlyAnnounced(prev, [{ n: 'A1', announcedAt: 9 }])).toEqual([{ n: 'A1', announcedAt: 9 }])
  // unchanged -> nothing
  expect(newlyAnnounced(prev, [{ n: 'A1', announcedAt: 5 }])).toEqual([])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/display/queueView.test.ts`
Expected: FAIL — `newlyAnnounced` not exported.

- [ ] **Step 3: Add `newlyAnnounced` + `ServingSig` to `src/display/queueView.ts`**

Keep the existing `servingOrders`/`upNextOrders`/`newlyServing`. Add:

```ts
export type ServingSig = { n: string; announcedAt: number }

export function newlyAnnounced(prev: ServingSig[], next: ServingSig[]): ServingSig[] {
  const prevMap = new Map(prev.map((s) => [s.n, s.announcedAt]))
  return next.filter((s) => {
    const was = prevMap.get(s.n)
    return was === undefined || s.announcedAt > was
  })
}
```

- [ ] **Step 4: Update `src/display/useServingAlert.test.ts`**

Change the hook input from `string[]` to `ServingSig[]`. Replace the existing tests' inputs accordingly and add a re-announce case (keep the mount-baseline + stuck-flash-fix behaviors):

```tsx
import { vi, test, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const { playChimeSpy } = vi.hoisted(() => ({ playChimeSpy: vi.fn() }))
vi.mock('./chime', () => ({ playChime: playChimeSpy }))
import { useServingAlert } from './useServingAlert'

beforeEach(() => { vi.useFakeTimers(); playChimeSpy.mockClear() })
afterEach(() => vi.useRealTimers())

const sig = (n: string, a = 0) => ({ n, announcedAt: a })

test('mount is baseline: no chime', () => {
  const { result } = renderHook(({ s }) => useServingAlert(s), { initialProps: { s: [sig('A1', 1)] } })
  expect(playChimeSpy).not.toHaveBeenCalled()
  expect(result.current).toBe(false)
})

test('a new serving number chimes + flashes then clears', () => {
  const { result, rerender } = renderHook(({ s }) => useServingAlert(s), { initialProps: { s: [sig('A1', 1)] } })
  rerender({ s: [sig('A1', 1), sig('A2', 2)] })
  expect(playChimeSpy).toHaveBeenCalledTimes(1)
  expect(result.current).toBe(true)
  act(() => vi.advanceTimersByTime(2500))
  expect(result.current).toBe(false)
})

test('a bumped announcedAt on the same number re-announces', () => {
  const { rerender } = renderHook(({ s }) => useServingAlert(s), { initialProps: { s: [sig('A1', 1)] } })
  rerender({ s: [sig('A1', 5)] })
  expect(playChimeSpy).toHaveBeenCalledTimes(1)
})

test('no change means no chime', () => {
  const { rerender } = renderHook(({ s }) => useServingAlert(s), { initialProps: { s: [sig('A1', 1)] } })
  rerender({ s: [sig('A1', 1)] })
  expect(playChimeSpy).not.toHaveBeenCalled()
})
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npx vitest run src/display/useServingAlert.test.ts`
Expected: FAIL — hook still takes `string[]`.

- [ ] **Step 6: Update `src/display/useServingAlert.ts`**

```ts
import { useEffect, useRef, useState } from 'react'
import { newlyAnnounced, type ServingSig } from './queueView'
import { playChime } from './chime'

const FLASH_MS = 2500

export function useServingAlert(serving: ServingSig[], primed = true): boolean {
  const prev = useRef<ServingSig[]>(serving)
  const first = useRef(true)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [flashing, setFlashing] = useState(false)
  const key = serving.map((s) => `${s.n}@${s.announcedAt}`).join('|')

  useEffect(() => {
    if (!primed) return
    if (first.current) {
      first.current = false
      prev.current = serving
      return
    }
    const fresh = newlyAnnounced(prev.current, serving)
    prev.current = serving
    if (fresh.length > 0) {
      playChime()
      setFlashing(true)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setFlashing(false), FLASH_MS)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, primed])

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  return flashing
}
```

- [ ] **Step 7: Run tests + full suite**

Run: `npx vitest run src/display/` then `npm test`
Expected: `queueView` + `useServingAlert` PASS. The full suite may show `DisplayScreen.test` failing because DisplayScreen still passes `string[]` — that is fixed in Task 5. If so, note it and proceed (Task 5 restores green). To keep this task green in isolation, ALSO make the minimal DisplayScreen edit now: change its call to `useServingAlert(serving.map((s) => ({ n: s.queueNumber, announcedAt: s.announcedAt ?? 0 })), ready)` (import nothing new). Then `npm test` is fully green here; Task 5 does the visual rebuild.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(display): re-announce alert rule (new number or bumped announcedAt)"
```

---

### Task 4: QueuePanel — new actions, skipped zone, undo

**Files:**
- Modify: `src/screens/QueuePanel.tsx`
- Modify: `src/i18n/labels.ts` (add queue labels)
- Modify: `src/screens/QueuePanel.test.tsx`

**Interfaces:**
- Consumes: `callNext`/`callSpecific`/`markDone`/`skip`/`recall`/`reannounce`/`orderSnapshot` (queueActions); `updateOrderStatus`; `L`; `Button`/`Panel`/`QueueNumber`.
- Produces: QueuePanel with per-waiting **เรียก**, per-serving **เสร็จ/ข้าม/ประกาศซ้ำ/ยกเลิก**, a **พักไว้ (skipped)** zone with **เรียกซ้ำ**, and a one-step **↩︎ ย้อนกลับ** bar. Every action goes through the guarded pure helpers + snapshots for undo.

- [ ] **Step 1: Add the labels to `src/i18n/labels.ts`**

Add to `LABELS`:
```ts
  'queue.callSpecific': { th: 'เรียก', en: 'Call' },
  'queue.skip': { th: 'ข้าม', en: 'Skip' },
  'queue.reannounce': { th: 'ประกาศซ้ำ', en: 'Re-announce' },
  'queue.recall': { th: 'เรียกซ้ำ', en: 'Recall' },
  'queue.undo': { th: 'ย้อนกลับ', en: 'Undo' },
  'queue.parked': { th: 'พักไว้', en: 'Parked' },
```

- [ ] **Step 2: Update `src/screens/QueuePanel.test.tsx`**

Keep the existing helpers/mocks (`emit`, `updateOrderStatus` spy, `order()` factory). Keep the call-next / done / cancel-with-reason / item-summary tests (they still hold — done/cancel go through the guarded helpers which produce the same patches). ADD tests for the new actions + undo:

```tsx
test('call button on a waiting order serves that specific number', async () => {
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([
    order({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'waiting', createdAt: 1 }),
    order({ id: 'o2', queueNumber: 'A2', station: 'A', status: 'waiting', createdAt: 2 }),
  ]))
  // call the SECOND waiting specifically
  await user.click(screen.getAllByRole('button', { name: /^เรียก$/ })[1])
  expect(updateOrderStatus).toHaveBeenCalledWith('o2', expect.objectContaining({ status: 'serving' }))
})

test('skip moves a serving order to skipped; recall brings it back to serving', async () => {
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([order({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'serving' })]))
  await user.click(screen.getByRole('button', { name: /ข้าม/ }))
  expect(updateOrderStatus).toHaveBeenCalledWith('o1', expect.objectContaining({ status: 'skipped' }))

  updateOrderStatus.mockClear()
  act(() => emit([order({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'skipped' })]))
  await user.click(screen.getByRole('button', { name: /เรียกซ้ำ/ }))
  expect(updateOrderStatus).toHaveBeenCalledWith('o1', expect.objectContaining({ status: 'serving' }))
})

test('re-announce bumps announcedAt on a serving order', async () => {
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([order({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'serving' })]))
  await user.click(screen.getByRole('button', { name: /ประกาศซ้ำ/ }))
  expect(updateOrderStatus).toHaveBeenCalledWith('o1', expect.objectContaining({ announcedAt: expect.any(Number) }))
})

test('undo restores the prior state of the last action', async () => {
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([order({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'serving', servingAt: 5 })]))
  await user.click(screen.getByRole('button', { name: /เสร็จ/ }))          // serving -> done
  updateOrderStatus.mockClear()
  await user.click(screen.getByRole('button', { name: /ย้อนกลับ/ }))       // undo
  expect(updateOrderStatus).toHaveBeenCalledWith('o1', expect.objectContaining({ status: 'serving', servingAt: 5 }))
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/screens/QueuePanel.test.tsx`
Expected: FAIL — new buttons/undo not implemented.

- [ ] **Step 4: Rewrite `src/screens/QueuePanel.tsx`**

Compose the pure helpers; add a `lastAction` snapshot for undo. Keep the existing cancel-with-reason panel + item summary. Sketch of the logic (styling with Neon Clarity primitives; keep touch ≥44px):

```tsx
import { useEffect, useState } from 'react'
import type { BoothId, Station, Order } from '../domain/types'
import { subscribeBoothOrders, updateOrderStatus } from '../order/ordersRepo'
import * as Q from '../queue/queueActions'
import { L } from '../i18n/labels'
import { Button } from '../ui/Button'
import { Panel } from '../ui/Panel'
import { QueueNumber } from '../ui/QueueNumber'

export function QueuePanel({ booth, station }: { booth: BoothId; station: Station }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [undo, setUndo] = useState<{ id: string; before: Partial<Order>; label: string } | null>(null)

  useEffect(() => subscribeBoothOrders(booth, setOrders), [booth])

  const mine = orders.filter((o) => o.station === station)
  const waiting = mine.filter((o) => o.status === 'waiting').sort((a, b) => a.createdAt - b.createdAt)
  const serving = mine.filter((o) => o.status === 'serving')
  const skipped = mine.filter((o) => o.status === 'skipped')

  // apply a patch to one order, recording an undo snapshot first
  const apply = (order: Order, patch: Partial<Order> | null, label: string) => {
    if (!patch) return
    setUndo({ id: order.id, before: Q.orderSnapshot(order), label })
    updateOrderStatus(order.id, patch)
  }

  const doCallNext = () => {
    const r = Q.callNext(mine, station, Date.now())
    if (!r) return
    const target = mine.find((o) => o.id === r.id)!
    apply(target, r.patch, L('queue.callNext').th)
  }
  const runUndo = () => { if (undo) { updateOrderStatus(undo.id, undo.before); setUndo(null) } }
  const confirmCancel = () => {
    if (!cancelId || !reason.trim()) return
    const order = mine.find((o) => o.id === cancelId)
    if (order) apply(order, { status: 'cancelled', cancelReason: reason.trim() }, L('queue.cancel').th)
    setCancelId(null); setReason('')
  }
  const itemSummary = (o: Order) => o.items.map((it) => `${it.name} ×${it.qty}${it.options?.length ? ` · ${it.options.map((op) => op.label).join(' · ')}` : ''}`).join(' , ')

  return (
    <section className="mt-6 flex flex-col gap-4 border-t border-phantom-line pt-6">
      {/* header + Call next */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-kanit text-sm text-phantom-muted">
          {L('queue.serving').th} ({serving.length}) · {L('queue.waiting').th} ({waiting.length})
        </span>
        <Button variant="primary" onClick={doCallNext} disabled={waiting.length === 0} className="min-h-[44px]">
          {L('queue.callNext').th} · {L('queue.callNext').en}
        </Button>
      </div>

      {/* undo bar */}
      {undo && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-phantom-line bg-phantom-surface2 px-4 py-2">
          <span className="font-kanit text-sm text-phantom-muted">↩︎ {undo.label}</span>
          <Button variant="ghost" onClick={runUndo} className="min-h-[44px]">{L('queue.undo').th} · {L('queue.undo').en}</Button>
        </div>
      )}

      {/* serving cards: เสร็จ / ข้าม / ประกาศซ้ำ / ยกเลิก */}
      <div className="flex flex-wrap gap-3">
        {serving.map((o) => (
          <div key={o.id} className="flex flex-col gap-2 rounded-2xl border border-phantom-yellow/30 bg-phantom-surface2 px-4 py-3">
            <QueueNumber value={o.queueNumber} size="card" />
            {o.items.length > 0 && <span className="font-kanit text-xs text-phantom-muted">{itemSummary(o)}</span>}
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={() => apply(o, Q.markDone(o, Date.now()), L('queue.done').th)} className="min-h-[44px]">{L('queue.done').th}</Button>
              <Button variant="ghost" onClick={() => apply(o, Q.skip(o), L('queue.skip').th)} className="min-h-[44px]">{L('queue.skip').th}</Button>
              <Button variant="ghost" onClick={() => apply(o, Q.reannounce(o, Date.now()), L('queue.reannounce').th)} className="min-h-[44px]">🔔 {L('queue.reannounce').th}</Button>
              <Button variant="danger" onClick={() => setCancelId(o.id)} className="min-h-[44px]">{L('queue.cancel').th}</Button>
            </div>
          </div>
        ))}
      </div>

      {/* waiting cards: เรียก (specific) + ยกเลิก */}
      <div className="flex flex-wrap gap-3">
        {waiting.map((o) => (
          <div key={o.id} className="flex flex-col gap-2 rounded-2xl border border-phantom-line bg-phantom-surface px-4 py-3">
            <span className="font-mono text-2xl font-bold text-phantom-text">{o.queueNumber}</span>
            {o.items.length > 0 && <span className="font-kanit text-xs text-phantom-muted">{itemSummary(o)}</span>}
            <div className="flex gap-2">
              <Button variant="primary" onClick={() => apply(o, Q.callSpecific(o, Date.now()), L('queue.callSpecific').th)} className="min-h-[44px]">{L('queue.callSpecific').th}</Button>
              <Button variant="danger" onClick={() => setCancelId(o.id)} className="min-h-[44px]">{L('queue.cancel').th}</Button>
            </div>
          </div>
        ))}
      </div>

      {/* skipped (พักไว้) zone: เรียกซ้ำ */}
      {skipped.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="font-kanit text-sm text-phantom-muted">{L('queue.parked').th} · {L('queue.parked').en} ({skipped.length})</span>
          <div className="flex flex-wrap gap-3">
            {skipped.map((o) => (
              <div key={o.id} className="flex items-center gap-3 rounded-2xl border border-dashed border-phantom-line bg-phantom-surface px-4 py-3">
                <span className="font-mono text-2xl font-bold text-phantom-muted">{o.queueNumber}</span>
                <Button variant="primary" onClick={() => apply(o, Q.recall(o, Date.now()), L('queue.recall').th)} className="min-h-[44px]">{L('queue.recall').th}</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* cancel-reason panel (unchanged text) */}
      {cancelId && (
        <Panel className="flex flex-col gap-3 border-phantom-orange/40">
          <label htmlFor="cancel-reason" className="font-kanit text-sm text-phantom-muted">{L('queue.reasonPrompt').th} · {L('queue.reasonPrompt').en}</label>
          <input id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-[44px] rounded-lg border border-phantom-line bg-phantom-bg px-3 py-2 font-kanit text-phantom-text" />
          <div className="flex gap-3">
            <Button variant="danger" onClick={confirmCancel} className="min-h-[44px] flex-1">ยืนยันยกเลิก · Confirm cancel</Button>
            <Button variant="ghost" onClick={() => { setCancelId(null); setReason('') }} className="min-h-[44px] flex-1">ปิด · Close</Button>
          </div>
        </Panel>
      )}
    </section>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/screens/QueuePanel.test.tsx` then `npm test`
Expected: PASS (existing + new).

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(queue): QueuePanel call-specific / skip+recall / re-announce / undo"
```

---

### Task 5: Display — centered, glanceable, next spotlight

**Files:**
- Modify: `src/screens/DisplayScreen.tsx`
- Modify: `src/i18n/labels.ts` (add display labels)
- Modify: `src/screens/DisplayScreen.test.tsx`

**Interfaces:**
- Consumes: `servingOrders`/`upNextOrders` (queueView); `useServingAlert` (ServingSig[]); `QueueNumber`; `L`.
- Produces: centered Display — 🔔 NOW SERVING (all serving, centered, biggest) → 👉 "ถัดไป เตรียมตัว" callout for the FIRST up-next (medium, yellow) → the rest as small pills. `skipped` never shown. Re-announce via `announcedAt`.

- [ ] **Step 1: Add display labels to `src/i18n/labels.ts`**

```ts
  'display.next': { th: 'ถัดไป', en: 'Next' },
  'display.getReady': { th: 'เตรียมตัว', en: 'Get ready' },
```

- [ ] **Step 2: Update `src/screens/DisplayScreen.test.tsx`**

Keep the existing tests: renders serving numbers (`getAllByTestId('serving')`), up-next (`getAllByTestId('upnext')`), no-queue placeholder, chime baseline. They still hold if we keep those testids. ADD a test for the next-spotlight:

```tsx
test('spotlights the first up-next number as the "get ready" next', () => {
  render(<DisplayScreen booth="drinks" />)
  act(() => emit([
    o({ id: 's', queueNumber: 'A1', status: 'serving' }),
    o({ id: 'w1', queueNumber: 'A2', status: 'waiting', createdAt: 2 }),
    o({ id: 'w2', queueNumber: 'B1', status: 'waiting', createdAt: 1 }),
  ]))
  // the very next (earliest waiting) is B1, shown in the get-ready spotlight
  expect(screen.getByTestId('next-up')).toHaveTextContent('B1')
  expect(screen.getByText(/เตรียมตัว/)).toBeInTheDocument()
})
```

Also confirm the existing `upnext` test still passes: after this change, the FIRST up-next goes into `next-up` (spotlight) and the REMAINING up-next carry `data-testid="upnext"`. If the existing test asserts a specific set of `upnext` values that included the first, update that test's expectation to the remaining ones (document the change). Keep at least one `upnext` element for the rest.

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/screens/DisplayScreen.test.tsx`
Expected: FAIL — no `next-up` spotlight yet.

- [ ] **Step 4: Rewrite `src/screens/DisplayScreen.tsx`** (centered + glanceable + spotlight)

Compose a centered column. NOW SERVING centered with a 🔔 icon header; the first up-next in a yellow "👉 ถัดไป · เตรียมตัว" callout carrying `data-testid="next-up"`; the remaining up-next as small pills each `data-testid="upnext"`. Preserve `data-testid="serving"` on each serving number's element (textContent = the number) and the `กำลังทำ`/`ยังไม่มีคิว` text. Wire the alert:

```tsx
const serving = servingOrders(orders)
const upNext = upNextOrders(orders)
const [next, ...rest] = upNext
const flashing = useServingAlert(serving.map((s) => ({ n: s.queueNumber, announcedAt: s.announcedAt ?? 0 })), ready)
```

Layout requirements (Neon Clarity, centered, glanceable):
- Root: `min-h-screen flex flex-col items-center justify-center text-center gap-…`, flash class kept.
- Header: booth + LIVE (kept).
- NOW SERVING: 🔔 + `L('display.nowServing')` label; serving numbers centered via `<QueueNumber size="display"/>` wrapped in `<span data-testid="serving">`; item detail under each (kept). `ยังไม่มีคิว` placeholder centered when none.
- NEXT spotlight (only if `next` exists): a centered yellow callout card — 👉 icon + `L('display.next').th` + `L('display.getReady').th` label + the number in `<span data-testid="next-up">{next.queueNumber}</span>` (medium size, yellow glow).
- REST: `rest.map` → small pills, each `data-testid="upnext"` with textContent = number.
- Everything centered; color/size/icon convey status without reading English.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/screens/DisplayScreen.test.tsx` then `npm test`
Expected: PASS.

- [ ] **Step 6: Build + visual check**

Run: `npm run build` (clean). Optionally `npm run dev` / `/preview` to eyeball centering + the "เตรียมตัว" spotlight + glanceability at phone/iPad/TV widths.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(display): centered, glanceable queue screen with next 'get ready' spotlight"
```

---

### Task 6: Final integration verification

**Files:** none (verification only; targeted fixes if something surfaces).

- [ ] **Step 1: Full suite + build**

Run: `npm test` then `npm run build`
Expected: all tests PASS; build completes; PWA generates.

- [ ] **Step 2: Reason-check integration (no code unless a gap is found)**

- Skipped orders never reach the customer Display (queueView filters `serving`/`waiting`; `skipped` excluded) ✓
- Re-announce: `reannounce`/`recall` bump `announcedAt` → Display `useServingAlert` fires chime+flash for that number ✓
- Undo restores prior status/timestamps for every action (markDone/skip/callNext/callSpecific/recall/reannounce/cancel go through `apply` which snapshots first) ✓
- Idempotency: guarded helpers return `null` on wrong source state → double-taps are no-ops ✓
- Metrics unaffected: `computeDashboardMetrics` keys on `status`/`subtotal`; `skipped` isn't `done` (doneCount unchanged) and a paid non-cancelled order still counts as revenue (correct) ✓

- [ ] **Step 3: Commit (if any targeted fix was needed)**

```bash
git add -A
git commit -m "test(queue): final integration verification"
```

---

## Self-Review

**Spec coverage (against `2026-08-04-queue-pro-upgrade-design.md`):**
- `skipped` status + `announcedAt` → Task 1 ✓
- Pure guarded actions (callNext/callSpecific/markDone/skip/recall/reannounce) + idempotency + undo snapshot → Task 2 ✓
- Re-announce rule (new number OR bumped announcedAt) → Task 3 ✓
- QueuePanel: call-specific, skip+recall zone, re-announce, undo, cancel-with-reason → Task 4 ✓
- Display: centered, glanceable (icon/color/size), next "เตรียมตัว" spotlight, re-chime, skipped hidden → Task 5 ✓
- Idempotency / metrics / integration → Tasks 2, 6 ✓
- Behavior change → tests updated (not frozen); pure logic heaviest coverage ✓

**Placeholder scan:** No TBD/TODO. Task 5's exact centered classes are visual judgment bounded by the Neon Clarity tokens + the preserve-testid list + the new-behavior tests; the tests pin the behavior objectively.

**Type consistency:** `OrderStatus 'skipped'` + `announcedAt` (Task 1) used by Tasks 2–5. `queueActions` signatures (Task 2) consumed by QueuePanel (Task 4). `ServingSig`/`newlyAnnounced` (Task 3) consumed by `useServingAlert` + DisplayScreen (Tasks 3, 5). `data-testid` set: `serving`/`upnext` kept, `next-up` added (Task 5). No drift.

---

*Queue Pro-Upgrade + Display Centering · ต่อยอดจาก Neon Clarity · ม.6/7 · PHANTOM CREW*
