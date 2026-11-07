/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Donation thermometer — acceptance criterion
 * (`2026-07-24-hq-comms-crosssell-design.md`, criterion 4 of the hq-comms set):
 *
 *   "Donation thermometer ตรงกับ (ยอด paid − expenses) และอัปเดตเมื่อมีออเดอร์ใหม่"
 *
 * The spec's §4.4 states the mechanism this file audits:
 *
 *   > อ่าน `donationTarget` เทียบ **ยอดบริจาคสุทธิ = Σ orders(paid).total − Σ expenses.amount**
 *   > แถบ % + ตัวเลข → บน **Display ทุกจอ** (มุมล่าง ไม่บังคิว) + **HQ** (ใหญ่)
 *   > อัปเดต realtime ตามยอดที่เข้า
 *
 * The criterion has two clauses, and they land in very different places:
 *
 *   F. "ตรงกับ (ยอด paid − expenses)"  — pure arithmetic in `dashboard/metrics.ts`.
 *                                        Evaluated at hand-computed values, never
 *                                        grepped for and never compared against a
 *                                        second copy of the same formula.
 *   U. "อัปเดตเมื่อมีออเดอร์ใหม่"        — a SECOND snapshot through the live
 *                                        subscription must move the number HQ paints.
 *
 * And the word "thermometer" itself is a third thing, which is why group T exists.
 *
 * ── HOW THIS FILE IS WIRED ──────────────────────────────────────────────────
 * Group F calls `computeDashboardMetrics` directly — no render, no mocks. The
 * expected values are written as literals computed by hand in the comments, NOT
 * by a second reduction over the same fixture: an oracle that re-implements the
 * rule under test only proves the two copies agree with each other.
 *
 * Group U renders the real `DashboardScreen` with the two repos mocked at the
 * subscription boundary, so the callback the screen registers is the one the test
 * fires. Nothing about the number is stubbed: the screen calls the real
 * `computeDashboardMetrics` over whatever the snapshot carried.
 *
 * Group T reads `src/` off disk with `fs` from `process.cwd()`. It does NOT use
 * `import.meta.url` + `fileURLToPath` — under Vitest that URL is not a `file:`
 * URL, `fileURLToPath` throws at import time, and the file then reports ZERO
 * tests while the suite still says "passed". T0 asserts the read actually
 * returned files with content, so a scanner reading nothing cannot go green.
 *
 * ── ขอบเขตของหลักฐาน / SCOPE OF THE EVIDENCE ────────────────────────────────
 * WHAT IS PROVED:
 *   - `netDonation` equals Σ(paid, non-cancelled).total − Σ expenses.amount at
 *     hand-computed values, with BOTH halves of the subtraction pinned separately
 *     so a compensating error in each cannot cancel out (F1).
 *   - Unpaid orders contribute nothing, and flipping one to paid raises the net
 *     by exactly its total (F2).
 *   - Expenses from every booth are subtracted, not just the viewer's (F4).
 *   - The net is reported NEGATIVE when expenses exceed sales — not clamped (F5).
 *   - HQ's `net-donation` tile changes when a new order arrives in a later
 *     snapshot, and equals the formula's answer for each snapshot in turn (U1, U3).
 *   - The path is PUSH: the tile repaints inside the emitting `act()` with the
 *     fake clock never advanced, and advancing the clock ten minutes with no
 *     snapshot changes nothing (U4).
 *   - Both subscriptions are released on unmount (U5).
 *
 * WHAT IS **NOT** PROVED:
 *   - 🚨 "realtime" IS NOT MEASURED AND IS NOT CLAIMED. There is no network and
 *     no Firestore here. What U4 proves is the SHAPE that makes realtime possible
 *     — a push subscription with no poll standing between the snapshot and the
 *     paint. Real latency belongs to Firestore and the venue's wifi.
 *   - 🚨 NO PIXEL IS MEASURED. Group T asks whether a bar EXISTS in the DOM, not
 *     whether anything is legible, well-placed, or the right size.
 *   - Whether the numbers Firestore actually holds are correct. This file proves
 *     the function over the data it is handed; garbage in the collection is a
 *     property of the venue's day, not of this arithmetic.
 *
 * ── ช่องว่างที่พบ / GAPS FOUND (recorded, deliberately NOT fixed this round) ──
 *   GAP-1  🚨 **ไม่มี thermometer อยู่จริง** — `donationTarget` is declared in
 *          `src/domain/types.ts:91` and is read by NO production module (T1 pins
 *          the mention set as exactly that one declaration). With no target there
 *          is no denominator, so there is no "%" to draw. HQ shows a bare number
 *          in a `StatTile`; T2 pins that the rendered dashboard contains no
 *          `<progress>`, no `<meter>`, no `role="progressbar"` and no percentage
 *          width. **ห้ามแกล้งตีความว่า "ตัวเลขก็คือ thermometer"** — the spec asks
 *          for "แถบ % + ตัวเลข", and only the second half exists.
 *   GAP-2  🚨 **Display ไม่มียอดบริจาคเลย** — §4.4 asks for the figure on
 *          "Display ทุกจอ (มุมล่าง ไม่บังคิว)". `DisplayScreen` renders no donation
 *          value at all; T3 pins that absence with the queue number as a positive
 *          spine, so it cannot pass on an empty render.
 *   GAP-3  ⚠️ **การนับต่างจากสูตรตามตัวอักษรของสเปก** — the spec writes
 *          "Σ orders(paid).total"; production ALSO excludes `status:'cancelled'`.
 *          On F3's fixture that is a 80฿ difference (200฿ vs the literal 280฿).
 *          Excluding a cancelled order looks like the better rule, but it IS a
 *          deviation and it is pinned, not smoothed over. Deciding which one the
 *          school actually wants is a human's call.
 *
 *   T1, T2 and T3 are the same shape as Idempotency's E1, PWA's I1 and the alert
 *   audit's C5: **they assert a state that is still broken.** If one of them ever
 *   goes RED, that means somebody BUILT the thermometer — that is the fix, not a
 *   regression. Read this header before "repairing" it.
 *
 * 🚫 THIS ROUND CHANGES NO `src/` PRODUCTION CODE. `netDonation` is บัญชี logic,
 *    which the Out-of-scope list forbids changing, and `frozenZones` F2 freezes
 *    `src/dashboard/metrics.ts` byte-for-byte. Drawing a gauge would be UI design,
 *    not an audit. All three gaps are therefore recorded with coordinates.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { vi, test, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { act } from 'react'
import type { Order, Expense } from './domain/types'
import { computeDashboardMetrics } from './dashboard/metrics'

// ─────────────────────────────────────────────────────────────────────────────
// The subscription boundary. Both screens under test read through it.
// ─────────────────────────────────────────────────────────────────────────────

const { orderSubs, expenseSubs, boothSubs, orderUnsub, expenseUnsub } = vi.hoisted(() => ({
  orderSubs: [] as ((o: unknown[]) => void)[],
  expenseSubs: [] as ((e: unknown[]) => void)[],
  boothSubs: [] as ((o: unknown[]) => void)[],
  orderUnsub: vi.fn(),
  expenseUnsub: vi.fn(),
}))

vi.mock('./order/ordersRepo', () => ({
  subscribeAllOrders: vi.fn((cb: (o: unknown[]) => void) => { orderSubs.push(cb); return orderUnsub }),
  subscribeBoothOrders: (_b: string, cb: (o: unknown[]) => void) => { boothSubs.push(cb); return () => {} },
  updateOrderStatus: vi.fn(),
  createOrder: vi.fn(),
}))
vi.mock('./expense/expensesRepo', () => ({
  subscribeAllExpenses: vi.fn((cb: (e: unknown[]) => void) => { expenseSubs.push(cb); return expenseUnsub }),
  addExpense: vi.fn().mockResolvedValue('e1'),
}))
vi.mock('./comms/commsRepo', () => ({
  sendMessage: vi.fn().mockResolvedValue('m1'),
  subscribeMessages: () => () => {},
  ackMessage: vi.fn(),
  upsertPresence: vi.fn().mockResolvedValue(undefined),
  subscribePresence: () => () => {},
}))
vi.mock('./device/deviceConfig', () => ({
  loadDeviceConfig: () => ({ booth: 'photo', mode: 'dashboard' }),
}))
vi.mock('./display/chime', () => ({ playChime: vi.fn() }))

import { DashboardScreen } from './screens/DashboardScreen'
import { DisplayScreen } from './screens/DisplayScreen'

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures. F0 pins these, because a builder that quietly defaulted
// `paymentStatus` to 'pending' would make every "this is excluded" test below
// pass for the wrong reason.
// ─────────────────────────────────────────────────────────────────────────────

const o = (over: Partial<Order> = {}): Order => ({
  id: 'x', boothId: 'drinks', queueNumber: 'A1', station: 'A',
  items: [{ sku: 'a', name: 'ชาเย็น', qty: 1, unitPrice: 30, subtotal: 30 }],
  total: 30, paymentMethod: 'cash', paymentStatus: 'paid', status: 'done', createdAt: 1, ...over,
})

const e = (over: Partial<Expense> = {}): Expense => ({
  id: 'e', boothId: 'photo', description: 'ฟิล์ม', amount: 10, createdAt: 1, ...over,
})

/**
 * The mixed fixture used by F1/F3. Worked out by hand:
 *   paid + not cancelled →  300 (cash) + 120 (qr) + 40 (qr)          = 460
 *   excluded             →  500 (pending) · 80 (paid but cancelled)
 *   expenses             →  200 + 50 + 10                            = 260
 *   netDonation          →  460 − 260                                = 200
 */
const MIXED_ORDERS = [
  o({ id: '1', boothId: 'drinks', total: 300, paymentMethod: 'cash', paymentStatus: 'paid', status: 'done' }),
  o({ id: '2', boothId: 'photo', total: 120, paymentMethod: 'qr', paymentStatus: 'paid', status: 'serving' }),
  o({ id: '3', boothId: 'portrait', total: 500, paymentMethod: 'cash', paymentStatus: 'pending', status: 'waiting' }),
  o({ id: '4', boothId: 'photo', total: 80, paymentMethod: 'cash', paymentStatus: 'paid', status: 'cancelled' }),
  o({ id: '5', boothId: 'photo', total: 40, paymentMethod: 'qr', paymentStatus: 'paid', status: 'waiting' }),
]
const MIXED_EXPENSES = [
  e({ id: 'e1', boothId: 'photo', amount: 200 }),
  e({ id: 'e2', boothId: 'drinks', amount: 50, description: 'น้ำแข็ง' }),
  e({ id: 'e3', boothId: 'portrait', amount: 10, description: 'กระดาษ' }),
]

const net = (orders: Order[], expenses: Expense[]) => computeDashboardMetrics(orders, expenses).netDonation

// ─────────────────────────────────────────────────────────────────────────────
// F — "ตรงกับ (ยอด paid − expenses)"
// ─────────────────────────────────────────────────────────────────────────────

test('F0: the fixture builders, pinned field for field', () => {
  // `toStrictEqual`, not `objectContaining`: the whole point is that no field is
  // silently different from what the tests below assume.
  expect(o()).toStrictEqual({
    id: 'x', boothId: 'drinks', queueNumber: 'A1', station: 'A',
    items: [{ sku: 'a', name: 'ชาเย็น', qty: 1, unitPrice: 30, subtotal: 30 }],
    total: 30, paymentMethod: 'cash', paymentStatus: 'paid', status: 'done', createdAt: 1,
  })
  expect(e()).toStrictEqual({ id: 'e', boothId: 'photo', description: 'ฟิล์ม', amount: 10, createdAt: 1 })

  // and the overrides really override, so an "excluded" fixture is excluded for
  // the reason the test names rather than by accident
  expect(o({ paymentStatus: 'pending' }).paymentStatus).toBe('pending')
  expect(o({ status: 'cancelled' }).status).toBe('cancelled')
  expect(e({ amount: 200 }).amount).toBe(200)
})

test('F1: netDonation is Σ paid − Σ expenses, with both halves pinned', () => {
  const m = computeDashboardMetrics(MIXED_ORDERS, MIXED_EXPENSES)

  // both halves separately — two compensating errors would survive the difference alone
  expect(m.totalSales).toBe(460)
  expect(m.totalCost).toBe(260)
  expect(m.netDonation).toBe(200)
  expect(m.netDonation).toBe(m.totalSales - m.totalCost)
})

test('F2: an unpaid order contributes nothing until it is paid', () => {
  const pending = o({ id: 'p', total: 500, paymentStatus: 'pending', status: 'waiting' })
  const base = [o({ id: '1', total: 300 })]

  expect(net(base, [])).toBe(300)
  expect(net([...base, pending], [])).toBe(300)

  // and flipping that same order to paid raises the net by exactly its total
  expect(net([...base, { ...pending, paymentStatus: 'paid' as const }], [])).toBe(800)
})

test('F3: a paid-then-cancelled order is excluded — a deviation from the literal spec formula', () => {
  const withCancelled = net(MIXED_ORDERS, MIXED_EXPENSES)
  const withoutIt = net(MIXED_ORDERS.filter((x) => x.status !== 'cancelled'), MIXED_EXPENSES)
  expect(withCancelled).toBe(withoutIt)
  expect(withCancelled).toBe(200)

  // 🚨 GAP-3. §4.4 writes the formula as "Σ orders(paid).total", which on this
  // fixture would be 460 + 80 = 540, i.e. a net of 280. Production answers 200.
  // Pinned so the difference is a recorded decision, not a silent one.
  const literalSpecSales = MIXED_ORDERS
    .filter((x) => x.paymentStatus === 'paid')
    .reduce((s, x) => s + x.total, 0)
  expect(literalSpecSales).toBe(540)
  expect(literalSpecSales - 260).toBe(280)
  expect(withCancelled).not.toBe(280)
})

test('F4: expenses from every booth are subtracted, not only one', () => {
  const orders = [o({ id: '1', total: 1000 })]
  expect(net(orders, [])).toBe(1000)
  expect(net(orders, MIXED_EXPENSES)).toBe(740)

  // each booth's expense really lands — dropping any one of the three moves the net
  for (const dropped of MIXED_EXPENSES) {
    const rest = MIXED_EXPENSES.filter((x) => x.id !== dropped.id)
    expect(net(orders, rest)).toBe(740 + dropped.amount)
  }
})

test('F5: the net goes negative when the booth has spent more than it took', () => {
  // A thermometer that clamps at zero would hide exactly this day.
  expect(net([o({ id: '1', total: 30 })], [e({ id: 'e1', amount: 100 })])).toBe(-70)
  expect(net([], [e({ id: 'e1', amount: 100 })])).toBe(-100)
  expect(net([], [])).toBe(0)
})

// ─────────────────────────────────────────────────────────────────────────────
// U — "อัปเดตเมื่อมีออเดอร์ใหม่"
// ─────────────────────────────────────────────────────────────────────────────

const unlock = () => localStorage.setItem('phantom.dashboardPin', 'unlocked')
const emitOrders = (orders: Order[]) => act(() => { orderSubs.forEach((cb) => cb(orders)) })
const emitExpenses = (expenses: Expense[]) => act(() => { expenseSubs.forEach((cb) => cb(expenses)) })
const tile = () => screen.getByTestId('net-donation').textContent

beforeEach(() => {
  localStorage.clear()
  orderSubs.length = 0
  expenseSubs.length = 0
  boothSubs.length = 0
  orderUnsub.mockClear()
  expenseUnsub.mockClear()
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

test('U0: HQ paints the first snapshot, through exactly one subscription each', () => {
  unlock()
  render(<DashboardScreen />)

  expect(orderSubs).toHaveLength(1)
  expect(expenseSubs).toHaveLength(1)

  emitOrders(MIXED_ORDERS)
  emitExpenses(MIXED_EXPENSES)
  expect(tile()).toBe('200฿')
})

test('U1: a new order in a later snapshot moves the number HQ shows', () => {
  unlock()
  render(<DashboardScreen />)

  emitOrders([o({ id: '1', total: 300 })])
  emitExpenses([e({ id: 'e1', amount: 200 })])
  const before = tile()
  expect(before).toBe('100฿')

  // the new order arrives — this is the criterion, in one line
  emitOrders([o({ id: '1', total: 300 }), o({ id: '2', total: 250, paymentMethod: 'qr' })])

  expect(tile()).toBe('350฿')
  expect(tile()).not.toBe(before)
})

test('U2: a new expense moves it too — the subtrahend is live as well', () => {
  unlock()
  render(<DashboardScreen />)

  emitOrders([o({ id: '1', total: 300 })])
  emitExpenses([e({ id: 'e1', amount: 200 })])
  expect(tile()).toBe('100฿')

  emitExpenses([e({ id: 'e1', amount: 200 }), e({ id: 'e2', amount: 40 })])
  expect(tile()).toBe('60฿')
})

test('U3: every snapshot is the whole collection — the number follows it down as well as up', () => {
  unlock()
  render(<DashboardScreen />)
  emitExpenses([])

  // A Firestore snapshot carries the collection, not a delta. If the screen
  // accumulated instead of replacing, the third assertion below would read 570.
  emitOrders([o({ id: '1', total: 300 })])
  expect(tile()).toBe('300฿')

  emitOrders([o({ id: '1', total: 300 }), o({ id: '2', total: 270 })])
  expect(tile()).toBe('570฿')

  emitOrders([o({ id: '2', total: 270 })])
  expect(tile()).toBe('270฿')

  // and each paint agreed with the formula over exactly what was emitted
  expect(net([o({ id: '2', total: 270 })], [])).toBe(270)
})

test('U4: the update is pushed, not polled', () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  unlock()
  render(<DashboardScreen />)

  emitOrders([o({ id: '1', total: 300 })])
  emitExpenses([])
  expect(tile()).toBe('300฿')

  // ten minutes pass with no snapshot. Nothing polls anything into existence.
  act(() => { vi.advanceTimersByTime(600_000) })
  expect(tile()).toBe('300฿')

  // and the snapshot repaints with the clock never advanced a millisecond
  emitOrders([o({ id: '1', total: 300 }), o({ id: '2', total: 100 })])
  expect(tile()).toBe('400฿')

  // no re-subscription happened along the way — one listener for the whole life
  expect(orderSubs).toHaveLength(1)
})

test('U5: closing HQ releases both subscriptions', () => {
  unlock()
  const view = render(<DashboardScreen />)
  expect(orderUnsub).not.toHaveBeenCalled()

  view.unmount()
  expect(orderUnsub).toHaveBeenCalledTimes(1)
  expect(expenseUnsub).toHaveBeenCalledTimes(1)
})

// ─────────────────────────────────────────────────────────────────────────────
// T — the thermometer itself. These assert a state that is still MISSING.
// ─────────────────────────────────────────────────────────────────────────────

const REPO = process.cwd()

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(join(REPO, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`
    if (entry.isDirectory()) out.push(...walk(rel))
    else if (/\.tsx?$/.test(entry.name)) out.push(rel)
  }
  return out.sort()
}

interface SourceFile { path: string; text: string }

/** Every non-test module under `src/` — i.e. everything that COULD read the target. */
function productionSources(): SourceFile[] {
  return walk('src')
    .filter((p) => !/\.test\.tsx?$/.test(p))
    .filter((p) => !p.startsWith('src/test/'))
    .map((p) => ({ path: p, text: readFileSync(join(REPO, p), 'utf8') }))
}

const mentioning = (needle: string, files: SourceFile[] = productionSources()) =>
  files.filter((f) => f.text.includes(needle)).map((f) => f.path)

test('T0: the source scanner, pinned to fixtures and to what it DOES find', () => {
  // (a) the needle matcher, against hand-built files — a scanner that matched
  //     everything, or nothing, would make T1 pass either way.
  const fixture: SourceFile[] = [
    { path: 'a.ts', text: 'const x = 1' },
    { path: 'b.ts', text: 'cfg.donationTarget ?? 0' },
    { path: 'c.ts', text: '// donationTarget is not read here — but it is mentioned' },
  ]
  expect(mentioning('donationTarget', fixture)).toStrictEqual(['b.ts', 'c.ts'])
  expect(mentioning('ยังไม่มีคำนี้ที่ไหนเลย', fixture)).toStrictEqual([])

  // (b) the reader really read the repo. `import.meta.url` + `fileURLToPath` throws
  //     under Vitest and this file would then report ZERO tests while still
  //     "passing" — so the files, and their contents, are asserted.
  const files = productionSources()
  expect(files.length).toBeGreaterThan(20)
  expect(files.every((f) => f.text.length > 0)).toBe(true)
  expect(files.map((f) => f.path)).toContain('src/dashboard/metrics.ts')
  expect(files.map((f) => f.path)).not.toContain('src/dashboard/metrics.test.ts')

  // (c) the positive spine: the set the scanner finds for a needle that IS wired up
  expect(mentioning('netDonation')).toStrictEqual([
    'src/dashboard/metrics.ts',
    'src/i18n/labels.ts',
    'src/screens/DashboardScreen.tsx',
  ])
})

test('T1: 🚨 GAP-1 — donationTarget is declared and read by nobody', () => {
  // If this ever goes RED, somebody WIRED THE TARGET UP. That is the fix, not a
  // regression: promote this into a real assertion about the bar and update
  // docs/autopilot/2026-09-05-donation-thermometer-audit.md.
  expect(mentioning('donationTarget')).toStrictEqual(['src/domain/types.ts'])

  // and there it is only a type declaration — optional, with no default anywhere
  const types = readFileSync(join(REPO, 'src/domain/types.ts'), 'utf8')
  expect(types).toContain('donationTarget?: number')
  expect(mentioning('donationTarget = ')).toStrictEqual([])
})

/**
 * Is this element sized as a FRACTION of something — the one DOM signature a
 * thermometer's filled bar cannot avoid having?
 *
 * T2 pins this against hand-built elements before it is pointed at the real
 * dashboard, because `[].filter(anything)` is `[]`: a predicate that had
 * quietly stopped matching would leave T2 green while proving nothing at all.
 * This repo has been caught by that species four times (neonClarity G1,
 * pwaGenerate V1, frozenZones F2, responsiveTouchTargets T3).
 */
const isProportional = (el: Element) => {
  const style = el.getAttribute('style') ?? ''
  const cls = el.getAttribute('class') ?? ''
  return /\d\s*%/.test(style) || /\bw-\[\d+(\.\d+)?%\]/.test(cls)
}

test('T2: 🚨 GAP-1 — HQ shows a bare number: no bar, no meter, no percentage', () => {
  // (a) the predicate, against fixtures — it must SAY YES to a filled bar
  const yesStyle = document.createElement('div')
  yesStyle.setAttribute('style', 'width: 45%')
  const yesClass = document.createElement('div')
  yesClass.setAttribute('class', 'h-4 w-[45%] bg-phantom-yellow')
  const no = document.createElement('div')
  no.setAttribute('class', 'font-mono text-3xl')
  expect(isProportional(yesStyle)).toBe(true)
  expect(isProportional(yesClass)).toBe(true)
  expect(isProportional(no)).toBe(false)

  unlock()
  const { container } = render(<DashboardScreen />)
  emitOrders([o({ id: '1', total: 300 })])
  emitExpenses([e({ id: 'e1', amount: 200 })])

  // (b) the positive spine — this test must not pass on an empty render
  expect(tile()).toBe('100฿')

  expect(container.querySelector('progress')).toBeNull()
  expect(container.querySelector('meter')).toBeNull()
  expect(container.querySelector('[role="progressbar"]')).toBeNull()

  // (c) and nothing on the dashboard is sized as a fraction of a target
  const els = [...container.querySelectorAll('*')]
  expect(els.length).toBeGreaterThan(20)
  expect(els.filter(isProportional).map((el) => el.getAttribute('class'))).toStrictEqual([])
})

test('T3: 🚨 GAP-2 — Display carries no donation figure at all', () => {
  const { container } = render(<DisplayScreen booth="drinks" />)
  act(() => {
    boothSubs.forEach((cb) => cb([o({ id: '1', queueNumber: 'B7', total: 300, status: 'serving' })]))
  })

  // positive spine: the screen really rendered — the queue number is on it
  expect(container.textContent).toContain('B7')

  // §4.4 asks for the figure on "Display ทุกจอ (มุมล่าง ไม่บังคิว)". There is none.
  expect(container.textContent).not.toContain('บริจาค')
  expect(container.textContent).not.toContain('Donation')
  expect(container.querySelector('[data-testid="net-donation"]')).toBeNull()
  expect(container.querySelector('progress')).toBeNull()

  const display = readFileSync(join(REPO, 'src/screens/DisplayScreen.tsx'), 'utf8')
  expect(display.length).toBeGreaterThan(500)
  expect(display).not.toContain('netDonation')
  expect(display).not.toContain('computeDashboardMetrics')
})

test('T4: the metric itself carries no target and no percentage', () => {
  // Even the shape of the returned metrics has nowhere to put a "%": there is no
  // denominator in it. This is why GAP-1 is a missing FEATURE, not a missing view.
  const m = computeDashboardMetrics(MIXED_ORDERS, MIXED_EXPENSES)
  expect(Object.keys(m).sort()).toStrictEqual([
    'bestSellers', 'byBooth', 'cashTotal', 'doneCount', 'expectedCash',
    'netDonation', 'paidOrderCount', 'qrTotal', 'totalCost', 'totalSales',
  ])

  const metrics = readFileSync(join(REPO, 'src/dashboard/metrics.ts'), 'utf8')
  expect(metrics).toContain('netDonation: totalSales - totalCost')
  expect(metrics).not.toContain('donationTarget')
  expect(metrics.toLowerCase()).not.toContain('percent')
})
