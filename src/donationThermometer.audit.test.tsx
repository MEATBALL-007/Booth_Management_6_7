// Donation thermometer — audit for the hq-comms-crosssell criterion:
//
//   "Donation thermometer ตรงกับ (ยอด paid − expenses) และอัปเดตเมื่อมีออเดอร์ใหม่"
//
// The criterion names an artifact the spec defines exactly once, at §4.4 of
// `docs/superpowers/specs/2026-07-24-hq-comms-crosssell-design.md`:
//   1. read `donationTarget`, compare against Σ orders(paid).total − Σ expenses
//   2. bar % + number, on Display ทุกจอ (มุมล่าง ไม่บังคิว) + HQ (ใหญ่)
//   3. update realtime as money comes in
// so all three are graded here, not just the arithmetic.
//
// ⚠️ SCOPE OF THE EVIDENCE. jsdom runs no cascade and does no layout. Nothing
// here measures a pixel or a rendered colour. The bar's *width* is the one
// visual quantity that is genuinely checked, and only because it has to be an
// inline style (a runtime number has no Tailwind class) — inline styles are
// real values in jsdom, unlike class names. Everything else about appearance
// is a declared token, not an observed one. "Does not block the queue" is
// argued structurally (the card is `fixed`, so it is out of flow) and is NOT
// proof that nothing overlaps on a real screen.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { vi, test, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { act } from 'react'
import type { Expense, GlobalConfig, Order } from './domain/types'
import { computeDashboardMetrics } from './dashboard/metrics'
import { donationProgress } from './donation/donationProgress'
import { DonationThermometer } from './donation/DonationThermometer'

// ---------------------------------------------------------------------------
// Wiring for the two screens. Each subscription is captured so a test can push
// a second snapshot through it — the criterion's "updates when a new order
// arrives" half is only provable by acting across two snapshots.
// ---------------------------------------------------------------------------

let emitBoothOrders: (o: Order[]) => void = () => {}
let emitAllOrders: (o: Order[]) => void = () => {}
let emitExpenses: (e: Expense[]) => void = () => {}
let emitConfig: (c: Partial<GlobalConfig> | null) => void = () => {}

vi.mock('./order/ordersRepo', () => ({
  subscribeBoothOrders: (_b: string, cb: (o: Order[]) => void) => { emitBoothOrders = cb; return () => {} },
  subscribeAllOrders: (cb: (o: Order[]) => void) => { emitAllOrders = cb; return () => {} },
  createOrder: vi.fn(),
  updateOrderStatus: vi.fn(),
}))
vi.mock('./expense/expensesRepo', () => ({
  subscribeAllExpenses: (cb: (e: Expense[]) => void) => { emitExpenses = cb; return () => {} },
  addExpense: vi.fn(),
}))
vi.mock('./domain/configRepo', () => ({
  subscribeGlobalConfig: (cb: (c: Partial<GlobalConfig> | null) => void) => { emitConfig = cb; return () => {} },
}))
vi.mock('./display/chime', () => ({ playChime: vi.fn() }))
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

import { DisplayScreen } from './screens/DisplayScreen'
import { DashboardScreen } from './screens/DashboardScreen'

const o = (over: Partial<Order>): Order => ({
  id: 'x', boothId: 'drinks', queueNumber: 'A1', station: 'A',
  items: [{ sku: 'a', name: 'A', qty: 1, unitPrice: 30, subtotal: 30 }],
  total: 30, paymentMethod: 'cash', paymentStatus: 'paid', status: 'done', createdAt: 1, ...over,
})

const e = (over: Partial<Expense>): Expense =>
  ({ id: 'e', boothId: 'photo', description: 'ฟิล์ม', amount: 10, createdAt: 1, ...over })

beforeEach(() => {
  localStorage.clear()
  emitBoothOrders = () => {}
  emitAllOrders = () => {}
  emitExpenses = () => {}
  emitConfig = () => {}
})

const openHq = () => {
  localStorage.setItem('phantom.dashboardPin', 'unlocked')
  render(<DashboardScreen />)
}

// ===========================================================================
// A. "ตรงกับ (ยอด paid − expenses)" — the amount the thermometer reports
// ===========================================================================
// `src/dashboard/metrics.test.ts` already covers netDonation for one paid
// order against two expenses, and covers paid/cancelled filtering via
// totalSales. What it does NOT do is tie those two facts together: that the
// DONATION figure specifically ignores unpaid and cancelled money. A1 does.

test('A1: the donation figure counts only paid, non-cancelled orders, minus every expense', () => {
  const m = computeDashboardMetrics(
    [
      o({ id: '1', total: 300 }),                                          // paid    → counts
      o({ id: '2', total: 500, paymentStatus: 'pending', status: 'waiting' }), // unpaid  → must not count
      o({ id: '3', total: 900, status: 'cancelled' }),                     // refunded → must not count
    ],
    [e({ id: 'e1', amount: 200 }), e({ id: 'e2', amount: 50 })],
  )
  // 300 paid − 250 expenses. If unpaid leaked in this is 800; if cancelled
  // leaked in, 1700; if expenses were dropped, 300.
  expect(m.netDonation).toBe(50)
})

test('A2: the donation figure goes negative when expenses outrun income', () => {
  // Real early-event state: film and cups are bought before anything is sold.
  // The figure must be honestly negative rather than floored at zero, because
  // it is the accounting truth HQ reconciles against.
  const m = computeDashboardMetrics([], [e({ amount: 400 })])
  expect(m.netDonation).toBe(-400)
})

// ===========================================================================
// B. The percentage — the half of §4.4 that did not exist before this round
// ===========================================================================

test('B1: progress is the amount over the goal, and the bar cannot exceed its track', () => {
  expect(donationProgress(250, 1000)).toEqual({ amount: 250, target: 1000, pct: 25, barPct: 25 })

  // Goal beaten: the TEXT tells the truth (150%), the BAR stops at full.
  // Two separate fields precisely so one cannot silence the other.
  const over = donationProgress(1500, 1000)
  expect(over.pct).toBe(150)
  expect(over.barPct).toBe(100)
})

test('B2: a negative net draws an empty bar, never a negative width', () => {
  const under = donationProgress(-400, 1000)
  expect(under.pct).toBe(-40)
  expect(under.barPct).toBe(0)
})

test('B3: every unusable goal yields no percentage at all, rather than NaN or Infinity', () => {
  // `donationTarget` is optional and comes from a hand-edited Firestore doc,
  // so each of these is a shape that can genuinely arrive. A customer-facing
  // screen must never render "NaN%" or "Infinity%".
  const unusable: Array<number | null | undefined> = [undefined, null, 0, -500, NaN, Infinity]
  for (const target of unusable) {
    const p = donationProgress(250, target)
    expect(p, `target ${String(target)} must not produce a percentage`).toEqual({
      amount: 250, target: null, pct: null, barPct: null,
    })
  }
})

test('B4: the goal is reported reached only when it actually is', () => {
  // Floor, not round: at 99.6% a rounded label would read "100%", which on a
  // fundraiser board is a claim the goal has been met.
  render(<DonationThermometer amount={996} target={1000} variant="hq" />)
  expect(screen.getByTestId('donation-pct')).toHaveTextContent('99%')
})

// ===========================================================================
// C. The rendered thermometer — bar + number, and the no-goal fallback
// ===========================================================================

test('C1: the bar is drawn to the true width, as a real inline style', () => {
  render(<DonationThermometer amount={250} target={1000} variant="hq" />)
  // The one visual quantity jsdom can actually check: an inline style is a
  // value, not a class name, so this is the real width the browser would use.
  expect(screen.getByTestId('donation-fill')).toHaveStyle({ width: '25%' })
  expect(screen.getByTestId('donation-amount')).toHaveTextContent('250฿')
  expect(screen.getByTestId('donation-pct')).toHaveTextContent('25%')
  expect(screen.getByTestId('donation-target')).toHaveTextContent('1000฿')
})

test('C2: beating the goal fills the bar exactly, and never overflows the track', () => {
  render(<DonationThermometer amount={2500} target={1000} variant="hq" />)
  expect(screen.getByTestId('donation-fill')).toHaveStyle({ width: '100%' })
  expect(screen.getByTestId('donation-pct')).toHaveTextContent('250%')
  expect(screen.getByTestId('donation-amount')).toHaveTextContent('2500฿')
})

test('C3: with no goal set, the amount still shows and no percentage is invented', () => {
  // Nothing in the app writes /config/global, so "no goal" is the state a
  // real event starts in. It must degrade to a plain figure, not to a broken
  // bar and not to a blank card.
  const { container } = render(<DonationThermometer amount={250} target={undefined} variant="display" />)
  expect(screen.getByTestId('donation-amount')).toHaveTextContent('250฿')
  expect(screen.queryByTestId('donation-fill')).toBeNull()
  expect(screen.queryByTestId('donation-track')).toBeNull()
  expect(screen.queryByTestId('donation-pct')).toBeNull()
  // Strongest form: no stray '%', 'NaN' or 'Infinity' anywhere in the card.
  expect(container.textContent).not.toMatch(/%|NaN|Infinity/)
})

test('C4: both variants render the same elements, so the two screens cannot drift', () => {
  const ids = ['donation-amount', 'donation-track', 'donation-fill', 'donation-pct', 'donation-target']
  const { container: display } = render(<DonationThermometer amount={250} target={1000} variant="display" />)
  const { container: hq } = render(<DonationThermometer amount={250} target={1000} variant="hq" />)
  for (const id of ids) {
    expect(within(display).getByTestId(id), `display is missing ${id}`).toBeInTheDocument()
    expect(within(hq).getByTestId(id), `hq is missing ${id}`).toBeInTheDocument()
  }
  // Same numbers on both, not merely the same boxes.
  expect(within(display).getByTestId('donation-pct').textContent)
    .toBe(within(hq).getByTestId('donation-pct').textContent)
})

// ===========================================================================
// D. Display: on the screen, in a corner, not over the queue
// ===========================================================================

test('D1: the customer screen shows the thermometer, fed by event-wide totals', () => {
  render(<DisplayScreen booth="drinks" />)
  act(() => {
    emitBoothOrders([o({ id: 's1', queueNumber: 'A1', status: 'serving' })])
    // Deliberately from ANOTHER booth: the thermometer is one shared goal for
    // the whole event, so a drinks screen must count the photo booth's money.
    emitAllOrders([o({ id: '1', boothId: 'photo', total: 300 })])
    emitExpenses([e({ amount: 100 })])
    emitConfig({ donationTarget: 1000 })
  })
  expect(screen.getByTestId('donation-thermometer')).toBeInTheDocument()
  expect(screen.getByTestId('donation-amount')).toHaveTextContent('200฿')
  expect(screen.getByTestId('donation-fill')).toHaveStyle({ width: '20%' })
})

test('D2: the thermometer sits in a corner and is out of the queue\'s layout flow', () => {
  render(<DisplayScreen booth="drinks" />)
  act(() => emitBoothOrders([o({ id: 's1', queueNumber: 'A1', status: 'serving' })]))

  const corner = screen.getByTestId('donation-corner')
  // `fixed` is the load-bearing word: it removes the card from normal flow, so
  // the centred queue column is laid out exactly as it was. Without it the
  // card would join the column and push the queue off centre.
  expect(corner.className).toMatch(/\bfixed\b/)
  expect(corner.className).toMatch(/\bbottom-/)
  // Bottom-LEFT specifically: App.tsx already parks the back-to-Setup button at
  // `fixed bottom-3 right-3`, so the right corner is taken. Two `fixed` cards
  // in one corner would overlap on a real screen.
  expect(corner.className).toMatch(/\bleft-/)
  expect(corner.className).not.toMatch(/\bright-/)

  // And it really is a descendant of the Display, not floating loose.
  expect(screen.getByTestId('donation-thermometer')).toBeInTheDocument()
})

test('D3: the thermometer does not disturb the queue it sits next to', () => {
  render(<DisplayScreen booth="drinks" />)
  act(() => {
    emitBoothOrders([
      o({ id: 's1', queueNumber: 'A1', status: 'serving' }),
      o({ id: 'w1', queueNumber: 'A2', status: 'waiting', createdAt: 2 }),
      o({ id: 'w2', queueNumber: 'B1', status: 'waiting', createdAt: 3 }),
    ])
    emitAllOrders([o({ id: '1', total: 300 })])
    emitConfig({ donationTarget: 1000 })
  })
  // The queue still reads exactly as the pre-existing Display tests expect.
  expect(screen.getAllByTestId('serving').map((n) => n.textContent)).toEqual(['A1'])
  expect(screen.getByTestId('next-up')).toHaveTextContent('A2')
  expect(screen.getAllByTestId('upnext').map((n) => n.textContent)).toEqual(['B1'])
  // The queue numbers are not polluted by the donation figures.
  expect(screen.getByTestId('serving').textContent).not.toMatch(/฿|%/)
})

// ===========================================================================
// E. HQ: the same thermometer, larger
// ===========================================================================

test('E1: HQ shows the thermometer and it agrees with the net-donation tile', () => {
  openHq()
  act(() => {
    emitOrdersOnHq([o({ id: '1', total: 300 })], [e({ amount: 100 })])
    emitConfig({ donationTarget: 1000 })
  })
  expect(screen.getByTestId('donation-amount')).toHaveTextContent('200฿')
  // Same number as the tile that already existed — one formula, two readouts.
  expect(screen.getByTestId('net-donation')).toHaveTextContent('200')
  expect(screen.getByTestId('donation-fill')).toHaveStyle({ width: '20%' })
})

test('E2: HQ renders the goal larger than the customer screen does', () => {
  // "ใหญ่" in §4.4 is a comparison, so it is graded as one: the HQ variant's
  // percentage must be on a bigger step than the Display variant's.
  const scale: Record<string, number> = { 'text-xs': 12, 'text-sm': 14, 'text-base': 16, 'text-xl': 20, 'text-3xl': 30 }
  const sizeOf = (el: HTMLElement): number => {
    const hit = el.className.split(/\s+/).find((c) => c in scale)
    // Must throw rather than default to 0: a reader that guesses 0 would make
    // every "bigger than" comparison below pass vacuously.
    if (!hit) throw new Error(`no known text-size class on: ${el.className}`)
    return scale[hit]
  }
  const { container: display } = render(<DonationThermometer amount={250} target={1000} variant="display" />)
  const { container: hq } = render(<DonationThermometer amount={250} target={1000} variant="hq" />)

  expect(sizeOf(within(hq).getByTestId('donation-pct')))
    .toBeGreaterThan(sizeOf(within(display).getByTestId('donation-pct')))
  expect(sizeOf(within(hq).getByTestId('donation-amount')))
    .toBeGreaterThan(sizeOf(within(display).getByTestId('donation-amount')))
})

// ===========================================================================
// F. "อัปเดตเมื่อมีออเดอร์ใหม่" — the realtime half
// ===========================================================================
// ⚠️ The round-0042 trap applies squarely here: a test that only checks the
// FIRST snapshot stays green even if the screen never re-renders again. Both
// tests below therefore act ACROSS two snapshots and assert the figure moved.

test('F1: a new paid order moves the customer screen while it is open', () => {
  render(<DisplayScreen booth="drinks" />)
  act(() => {
    emitAllOrders([o({ id: '1', total: 300 })])
    emitExpenses([e({ amount: 100 })])
    emitConfig({ donationTarget: 1000 })
  })
  expect(screen.getByTestId('donation-amount')).toHaveTextContent('200฿')
  expect(screen.getByTestId('donation-fill')).toHaveStyle({ width: '20%' })

  // Second snapshot: another customer pays. Nothing re-mounts.
  act(() => emitAllOrders([o({ id: '1', total: 300 }), o({ id: '2', total: 500 })]))

  expect(screen.getByTestId('donation-amount')).toHaveTextContent('700฿')
  expect(screen.getByTestId('donation-fill')).toHaveStyle({ width: '70%' })
})

test('F2: a new expense, and a goal that arrives late, both move HQ live', () => {
  openHq()
  act(() => emitOrdersOnHq([o({ id: '1', total: 300 })], []))
  // The goal doc has not loaded yet — the amount shows, with no bar.
  expect(screen.getByTestId('donation-amount')).toHaveTextContent('300฿')
  expect(screen.queryByTestId('donation-fill')).toBeNull()

  // The goal arrives on a later snapshot: the bar must appear without a reload.
  act(() => emitConfig({ donationTarget: 1000 }))
  expect(screen.getByTestId('donation-fill')).toHaveStyle({ width: '30%' })

  // And an expense entered at HQ pulls the same bar back down.
  act(() => emitOrdersOnHq([o({ id: '1', total: 300 })], [e({ amount: 100 })]))
  expect(screen.getByTestId('donation-amount')).toHaveTextContent('200฿')
  expect(screen.getByTestId('donation-fill')).toHaveStyle({ width: '20%' })
})

function emitOrdersOnHq(orders: Order[], expenses: Expense[]) {
  emitAllOrders(orders)
  emitExpenses(expenses)
}

// ===========================================================================
// G. Gaps deliberately left open — recorded so they are not "unknown"
// ===========================================================================

test('GAP: nothing in the app writes the donation goal; it must be set by hand', () => {
  // §4.4 says to READ `donationTarget` and never says who writes it, and §3
  // lists `/config/global` as a pre-existing document. So there is no admin UI
  // for the goal, and creating one is a different task from this criterion.
  //
  // Consequence for the real event: unless somebody creates /config/global in
  // the Firebase console, every screen shows the amount with no bar (C3).
  //
  // 👉 When a goal editor is built, this test goes RED. That is intended —
  //    delete it then, and update the criterion's notes in AUTOPILOT.md.
  //
  // Read from disk, not by importing: `./domain/configRepo` is vi.mock'ed in
  // this very file, so importing it would introspect the stub and prove
  // nothing about the shipped module.
  const src = readFileSync(resolve(process.cwd(), 'src/domain/configRepo.ts'), 'utf8')
  const exported = [...src.matchAll(/^export function (\w+)/gm)].map((m) => m[1])

  // Spine: the scanner must actually be seeing this file. Without this line the
  // assertion below would stay green even if `exported` were always empty —
  // a typo'd path or a broken regex would read as "no writers found".
  expect(exported).toContain('subscribeGlobalConfig')

  expect(exported.filter((n) => /^(set|save|update|write|add|upsert)/i.test(n))).toEqual([])
})
