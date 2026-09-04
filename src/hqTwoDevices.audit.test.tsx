/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HQ on two machines at once — acceptance criterion
 * (`2026-07-24-hq-comms-crosssell-design.md`, criterion 1 of the hq-comms set):
 *
 *   "HQ เปิดบน MacBook + Windows พร้อมกัน เห็นข้อมูลตรงกัน realtime;
 *    ปิดเครื่องนึง อีกเครื่องทำงานครบ"
 *
 * The spec states the mechanism this file audits in three places:
 *
 *   §22  > HQ = 2 เครื่อง (MacBook + Windows 11) **เหมือนกันทุกอย่าง** เป็น backup
 *        > ของกัน — เปิด Dashboard mode ผ่าน browser เฉยๆ **ไม่ต้องมี backup logic**
 *   §98  > **2 เครื่องเหมือนกันทุกปุ่ม** (ทั้งคู่ view + export + broadcast + control ได้ครบ)
 *   §157 > `presence` heartbeat หยุดตอน offline → HQ เห็นเป็น "หลุด" ถูกต้อง
 *
 * §22's "ไม่ต้องมี backup logic" is the load-bearing sentence: the design's answer
 * to redundancy is that HQ is a *stateless reader*, so a second browser tab IS the
 * backup. That makes the criterion provable by construction rather than by
 * failover machinery — but only if nothing in the screen branches on which
 * machine it is, and only if closing one really releases just that one.
 *
 * The criterion splits into four clauses that land in very different places:
 *
 *   P. "พร้อมกัน ... เหมือนกันทุกปุ่ม"  — two SIMULTANEOUS instances expose an
 *                                       identical control surface (§98).
 *   D. "เห็นข้อมูลตรงกัน realtime"      — one snapshot, both machines, every tile.
 *   S. "ปิดเครื่องนึง อีกเครื่องทำงานครบ" — the survivor still reads AND still writes.
 *   H. presence                        — each machine beats for itself; the closed
 *                                       one goes หลุด while the survivor stays เขียว.
 *
 * ── HOW THIS FILE IS WIRED ──────────────────────────────────────────────────
 * "Two machines" is TWO `render()` calls that are BOTH MOUNTED AT THE SAME TIME.
 * This differs from `alertToast.audit` (round `_0027`), which unmounts between
 * devices because it only ever needed one live screen; here simultaneity is the
 * criterion itself, so both containers stay in the document together.
 *
 * 🚨 Because both instances share one jsdom `document`, `screen.getByTestId`
 * would match BOTH machines and throw. Every assertion below is scoped with
 * `within(machine.container)`. Nothing reads `document.body.firstElementChild` —
 * that is Testing Library's own wrapper and belongs to neither machine.
 *
 * 🚨 THE CENTRAL TRAP, and the reason group W exists. The repos are mocked at the
 * SUBSCRIPTION boundary, and the mock's unsubscribe **splices the callback out of
 * the registry**, exactly as a real `onSnapshot` teardown stops delivery. If the
 * mock instead kept one array and emitted to all of it forever, then after a
 * machine closes the test would still be feeding the DEAD instance — and group S
 * would pass without ever showing that the SURVIVOR received anything. W0 pins
 * the removal by driving the mock directly, so a registry that never forgets
 * cannot go green here.
 *
 * Device identity is `localStorage['phantom.deviceId']`, read by `getDeviceId()`
 * in `DashboardScreen`'s render body. Each machine is mounted while that key
 * holds its own value, so each captures its own id at its own mount.
 *   ⚠️ jsdom has exactly ONE localStorage, so the two machines only stay distinct
 *   for values captured at mount time. No assertion below depends on a machine
 *   re-reading its id after a later re-render; H0 reads the heartbeat payload
 *   immediately after each mount, which is the point where the value is real.
 *
 * ⚠️ Fake timers are on for the whole file, with `vi.setSystemTime(T0)`. That is
 * deliberate, not incidental: `useHeartbeat` runs on `setInterval`, and
 * `PresenceBoard` reads `Date.now()` at render, so a controlled clock lets H0 pin
 * the heartbeat payload with `toStrictEqual` down to `lastSeen` instead of
 * `expect.any(Number)`. NOTE for future rounds: `vi.useFakeTimers()` also fakes
 * `Date`, which SILENTLY clobbers a hand-installed `Date.now` spy — this file
 * uses `setSystemTime` and never a spy, which is why the two do not collide here.
 *
 * ── ขอบเขตของหลักฐาน / SCOPE OF THE EVIDENCE ────────────────────────────────
 * WHAT IS PROVED:
 *   - Two simultaneously-mounted HQ screens carrying DIFFERENT device ids expose
 *     the identical sorted set of buttons and of form controls, and those sets are
 *     non-empty and pinned literally (P1, P2, P3).
 *   - One snapshot delivered to both machines leaves ALL EIGHT tiles equal across
 *     them and equal to hand-computed figures — not merely equal to each other,
 *     which two blank screens would also satisfy (D1, D2, D3).
 *   - A machine that opens LATE converges on the same figures (D4).
 *   - Closing a machine releases exactly its own two subscriptions and leaves the
 *     survivor's registered (S1).
 *   - After the close, a NEW snapshot repaints the survivor, and the closed
 *     machine's callback is no longer in the live set at all (S2).
 *   - The survivor keeps every control it had before the close (S3), can still
 *     WRITE an expense (S4), and can still broadcast (S5).
 *   - Each machine writes its own presence heartbeat, payload pinned field for
 *     field with `toStrictEqual` (H0); the closed machine stops beating while the
 *     survivor keeps beating (H1); HQ paints the closed machine หลุด and the
 *     survivor ออนไลน์ at real clock values (H2); a LOCKED machine beats not at
 *     all (H3).
 *
 * WHAT IS **NOT** PROVED:
 *   - 🚨 "realtime" IS NOT MEASURED AND IS NOT CLAIMED. There is no network and no
 *     Firestore here; timing a mock times the mock. What group D proves is the
 *     SHAPE that makes realtime possible — one push snapshot reaching both
 *     screens with no poll standing between it and the paint. Real latency is a
 *     property of Firestore and the venue's wifi, and needs a human holding two
 *     laptops at the event.
 *   - 🚨 NO SECOND BROWSER, NO SECOND MACHINE, NO SECOND localStorage EXISTS.
 *     Two React roots in one jsdom document is a MODEL of two laptops. It is a
 *     good model for this criterion specifically — because §22 says HQ holds no
 *     per-machine state, so there is nothing for a real second OS to diverge on —
 *     but it is a model, and a real Safari-versus-Edge difference is invisible here.
 *   - 🚨 The WRITE side of "พร้อมกัน" is NOT closed, and this file does not
 *     reopen it. Two machines pressing the same control at the same moment is
 *     what `idempotency.audit` E1 pins as still open (the guard is per-panel and
 *     cannot see another machine's press). This criterion says "เห็นข้อมูลตรงกัน",
 *     which is the READ side. Cross-machine write collisions remain E1's.
 *   - `isOnline`'s 90-second threshold arithmetic is NOT re-proved here;
 *     `alertToast.audit` C4 already evaluates it on both sides of the boundary.
 *     H2 proves the PAIRING — that two rows land on opposite sides of it at once.
 *
 * ── ช่องว่างที่พบ / GAPS FOUND (recorded, deliberately NOT fixed this round) ──
 *   GAP-1  🚨 **ไม่มี export เลยทั้ง `src/`** — §98's parity sentence names FOUR
 *          things both machines must do: "view + export + broadcast + control".
 *          view, broadcast and control all exist and are proved above. Export does
 *          not exist anywhere: no csv, no xlsx, no PDF, no Blob, no
 *          createObjectURL, no download attribute. §4.1 lists "Export (.xlsx/PDF)
 *          เดิม" as if inherited from the core dashboard, but it was never built.
 *          G0 pins the absence. **ห้ามตีความว่า "สองเครื่องไม่มี export เท่ากัน
 *          ก็คือเหมือนกันแล้ว"** — parity at zero satisfies §98's grammar and
 *          fails its intent.
 *   GAP-2  ⚠️ **presence row ไม่บอกว่าเป็นเครื่องไหน** — §102 asks for a grid of
 *          "ซุ้ม/โหมด/station". Two HQ machines configured to the same booth
 *          therefore render two rows with BYTE-IDENTICAL text, and a human at HQ
 *          cannot tell which row is the MacBook and which is the Windows box —
 *          nor, when one goes หลุด, WHICH machine died. The `deviceId` that would
 *          disambiguate is already carried in the document and simply is not
 *          rendered. G1 pins this with two same-booth machines. Whether a raw
 *          device id is the right thing to show a human is a design call, so it is
 *          recorded rather than fixed.
 *
 *   G0 and G1 are the same shape as Idempotency's E1, PWA's I1, the alert audit's
 *   C5 and the donation audit's T1–T3: **they assert a state that is still
 *   incomplete.** If one of them ever goes RED, somebody BUILT the missing half —
 *   that is the fix, not a regression. Read this header before "repairing" it.
 *
 * 🚫 THIS ROUND CHANGES NO `src/` PRODUCTION CODE. The screen already satisfies
 *    every clause the criterion actually states; what was missing was the
 *    evidence. Adding an export button would be a new feature (and `frozenZones`
 *    freezes the comms modules byte-for-byte), so GAP-1 is recorded with
 *    coordinates instead of quietly built.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { vi, test, expect, describe, beforeEach, afterEach } from 'vitest'
import { render, within, fireEvent, cleanup } from '@testing-library/react'
import { act } from 'react'
import type { Order, Expense, BoothId } from './domain/types'
import type { Presence } from './comms/types'

// ─────────────────────────────────────────────────────────────────────────────
// The subscription boundary.
//
// Each `subscribe*` PUSHES its callback onto a registry and returns an
// unsubscribe that SPLICES IT BACK OUT. The registry is therefore the set of
// LIVE subscribers, which is the whole basis of group S. W0 proves the removal
// really happens; without it every "the survivor still works" test could be
// feeding a machine that is already gone.
// ─────────────────────────────────────────────────────────────────────────────

const { orderSubs, expenseSubs, presenceSubs, upsertSpy, addExpenseSpy, sendMessageSpy } = vi.hoisted(() => ({
  orderSubs: [] as ((o: unknown[]) => void)[],
  expenseSubs: [] as ((e: unknown[]) => void)[],
  presenceSubs: [] as ((p: unknown[]) => void)[],
  upsertSpy: vi.fn().mockResolvedValue(undefined),
  addExpenseSpy: vi.fn().mockResolvedValue('e1'),
  sendMessageSpy: vi.fn().mockResolvedValue('m1'),
}))

/** Register `cb`, and hand back an unsubscribe that forgets it. */
function subscription<T>(registry: ((v: T[]) => void)[], cb: (v: T[]) => void): () => void {
  registry.push(cb)
  return () => {
    const i = registry.indexOf(cb)
    if (i >= 0) registry.splice(i, 1)
  }
}

vi.mock('./order/ordersRepo', () => ({
  subscribeAllOrders: (cb: (o: unknown[]) => void) => subscription(orderSubs, cb),
  subscribeBoothOrders: (_b: string, cb: (o: unknown[]) => void) => subscription(orderSubs, cb),
  updateOrderStatus: vi.fn(),
  createOrder: vi.fn(),
}))
vi.mock('./expense/expensesRepo', () => ({
  subscribeAllExpenses: (cb: (e: unknown[]) => void) => subscription(expenseSubs, cb),
  addExpense: addExpenseSpy,
}))
vi.mock('./comms/commsRepo', () => ({
  sendMessage: sendMessageSpy,
  subscribeMessages: () => () => {},
  ackMessage: vi.fn(),
  upsertPresence: upsertSpy,
  subscribePresence: (cb: (p: unknown[]) => void) => subscription(presenceSubs, cb),
}))
vi.mock('./device/deviceConfig', () => ({
  loadDeviceConfig: () => ({ booth: 'photo', mode: 'dashboard' }),
}))
vi.mock('./display/chime', () => ({ playChime: vi.fn() }))

import { subscribeAllOrders } from './order/ordersRepo'
import { DashboardScreen } from './screens/DashboardScreen'

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures and the two-machine harness.
// ─────────────────────────────────────────────────────────────────────────────

/** A fixed wall clock. Every heartbeat and presence comparison is relative to it. */
const T0 = 1_760_000_000_000

const DEVICE_KEY = 'phantom.deviceId'
const PIN_KEY = 'phantom.dashboardPin'

const o = (over: Partial<Order> = {}): Order => ({
  id: 'x', boothId: 'drinks', queueNumber: 'A1', station: 'A',
  items: [{ sku: 'a', name: 'ชาเย็น', qty: 1, unitPrice: 30, subtotal: 30 }],
  total: 30, paymentMethod: 'cash', paymentStatus: 'paid', status: 'done', createdAt: 1, ...over,
})

const e = (over: Partial<Expense> = {}): Expense => ({
  id: 'e', boothId: 'photo', description: 'ฟิล์ม', amount: 10, createdAt: 1, ...over,
})

/**
 * The morning's orders. Worked out by hand — NOT by a second reduction over the
 * same array, which would only prove two copies of the formula agree:
 *   totalSales   300 + 120 = 420      cashTotal 300      qrTotal 120
 *   paidOrders   2                    doneCount 1        expectedCash 300
 */
const SHIFT_ONE = [
  o({ id: '1', boothId: 'drinks', total: 300, paymentMethod: 'cash', paymentStatus: 'paid', status: 'done' }),
  o({ id: '2', boothId: 'photo', total: 120, paymentMethod: 'qr', paymentStatus: 'paid', status: 'serving' }),
]

/**
 * ...and one more order arrives. Again by hand:
 *   totalSales   300 + 120 + 250 = 670    cashTotal 550    qrTotal 120
 *   paidOrders   3                        doneCount 1      expectedCash 550
 */
const SHIFT_TWO = [
  ...SHIFT_ONE,
  o({ id: '3', boothId: 'portrait', total: 250, paymentMethod: 'cash', paymentStatus: 'paid', status: 'waiting' }),
]

const TILE_IDS = [
  'cash-total', 'done-count', 'expected-cash', 'net-donation',
  'paid-orders', 'qr-total', 'total-cost', 'total-sales',
] as const

/** Every tile on one machine, as `{ testid: rendered text }`. */
function tiles(machine: { container: HTMLElement }): Record<string, string> {
  const out: Record<string, string> = {}
  for (const id of TILE_IDS) out[id] = within(machine.container).getByTestId(id).textContent ?? ''
  return out
}

/** The sorted accessible names of every button on one machine. */
const buttonNames = (machine: { container: HTMLElement }): string[] =>
  within(machine.container).getAllByRole('button').map((b) => b.textContent ?? '').sort()

/** The sorted aria-labels of every text/select control on one machine. */
const fieldNames = (machine: { container: HTMLElement }): string[] =>
  [
    ...within(machine.container).queryAllByRole('textbox'),
    ...within(machine.container).queryAllByRole('combobox'),
  ].map((f) => f.getAttribute('aria-label') ?? '').sort()

/** Become a machine, then open HQ on it. Both stay mounted. */
function openHQ(deviceId: string) {
  localStorage.setItem(DEVICE_KEY, deviceId)
  return render(<DashboardScreen />)
}

const unlock = () => localStorage.setItem(PIN_KEY, 'unlocked')

/**
 * Deliver ONE snapshot to every LIVE subscriber, and RETURN HOW MANY received it.
 * The registry is copied first so a subscriber that unsubscribes mid-delivery
 * cannot shift the iteration.
 *
 * 🚨 The return value is not decoration. W0 pins that the registry forgets a
 * released callback, but nothing would stop THIS helper from keeping its own
 * shadow list and delivering to ghosts anyway — in which case group S would go
 * green while feeding a machine that is already closed. S2 asserts the delivery
 * count, so the emit path itself is pinned and not merely the registry.
 */
function deliver<T>(registry: ((v: T[]) => void)[], value: T[]): number {
  const live = [...registry]
  act(() => { live.forEach((cb) => cb(value)) })
  return live.length
}

const emitOrders = (orders: Order[]) => deliver(orderSubs, orders)
const emitExpenses = (expenses: Expense[]) => deliver(expenseSubs, expenses)
const emitPresence = (presence: Presence[]) => deliver(presenceSubs, presence)

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(T0)
  localStorage.clear()
  orderSubs.length = 0
  expenseSubs.length = 0
  presenceSubs.length = 0
  upsertSpy.mockClear()
  addExpenseSpy.mockClear()
  sendMessageSpy.mockClear()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

// ════════════════════════════════════════════════════════════════════════════
// W. The harness itself.
//
// Learned the hard way five times over (`neon G1`, `pwa V1`, `fz F2`, `rtt T3`,
// `donation T2`): a checker that has gone blind reports the same clean result as
// a codebase that is genuinely clean. Here the equivalent blindness is a registry
// that never forgets, so group W pins the registry before anything leans on it.
// ════════════════════════════════════════════════════════════════════════════
describe('W. the two-machine harness', () => {
  /**
   * W0 — unsubscribing REMOVES the callback. Driven against the mocked module
   * directly, with no React involved, so this cannot be explained away by
   * anything the screen does.
   */
  test('W0: the mocked subscription forgets a callback when it is released', () => {
    const cb = vi.fn()
    const other = vi.fn()
    const release = subscribeAllOrders(cb as never)
    subscribeAllOrders(other as never)

    expect(orderSubs).toContain(cb)
    expect(orderSubs).toHaveLength(2)

    release()

    // the released one is gone, and — the half that actually matters — the OTHER
    // one is untouched. A teardown that cleared the whole registry would also
    // pass the first assertion.
    expect(orderSubs).not.toContain(cb)
    expect(orderSubs).toContain(other)
    expect(orderSubs).toHaveLength(1)
  })

  /**
   * W1 — two machines really do produce two independent live subscriptions.
   * Without this, "both machines got the snapshot" could be one machine getting
   * it twice.
   */
  test('W1: two open dashboards register two distinct live subscribers each', () => {
    unlock()
    openHQ('hq-macbook')
    openHQ('hq-windows')

    expect(orderSubs).toHaveLength(2)
    expect(expenseSubs).toHaveLength(2)
    expect(presenceSubs).toHaveLength(2)
    expect(orderSubs[0]).not.toBe(orderSubs[1])
    expect(expenseSubs[0]).not.toBe(expenseSubs[1])
  })
})

// ════════════════════════════════════════════════════════════════════════════
// P. "2 เครื่องเหมือนกันทุกปุ่ม" (§98)
// ════════════════════════════════════════════════════════════════════════════
describe('P. both machines offer the same controls', () => {
  /**
   * P0 — THE CANARY for this whole group. A locked dashboard renders the PIN gate:
   * one button, zero tiles. If the parity tests below ever start comparing two
   * LOCKED machines they would be comparing two gates and would still pass, so
   * this pins what "unlocked" is worth before parity is claimed.
   */
  test('P0: a machine that is not unlocked shows the PIN gate, not the dashboard', () => {
    const locked = openHQ('hq-macbook') // no unlock() — deliberately

    expect(buttonNames(locked)).toStrictEqual(['ปลดล็อก · Unlock'])
    expect(within(locked.container).queryByTestId('total-sales')).toBeNull()
    expect(within(locked.container).queryAllByTestId('presence-row')).toHaveLength(0)

    // and it subscribes to NOTHING while locked — the effect is gated on `unlocked`
    expect(orderSubs).toHaveLength(0)
    expect(expenseSubs).toHaveLength(0)
  })

  /**
   * P1 — the buttons. Compared as a whole sorted SET with `toStrictEqual`, not
   * probed one at a time with `toContain`: a machine carrying an EXTRA control
   * the other lacks is exactly the asymmetry §98 forbids, and `toContain` cannot
   * see it. The literal names are the spine — two empty screens also "match".
   */
  test('P1: the MacBook and the Windows box expose an identical set of buttons', () => {
    unlock()
    const mac = openHQ('hq-macbook')
    const win = openHQ('hq-windows')

    const expected = ['บันทึก · Save', 'ส่ง']
    expect(buttonNames(mac)).toStrictEqual(expected)
    expect(buttonNames(win)).toStrictEqual(expected)
    expect(buttonNames(mac)).toStrictEqual(buttonNames(win))
    expect(buttonNames(mac).length).toBeGreaterThan(0) // spine
  })

  /**
   * P2 — buttons alone would miss the whole expense form and the broadcast box,
   * which is most of "control ได้ครบ". Same set comparison over the fields.
   */
  test('P2: ...and an identical set of input fields', () => {
    unlock()
    const mac = openHQ('hq-macbook')
    const win = openHQ('hq-windows')

    const expected = ['จำนวนเงิน', 'ประกาศถึงทุกซุ้ม', 'รายการ', 'แยกตามซุ้ม']
    expect(fieldNames(mac)).toStrictEqual(expected)
    expect(fieldNames(win)).toStrictEqual(expected)
    expect(fieldNames(mac).length).toBeGreaterThan(0) // spine
  })

  /**
   * P3 — the parity is not an artifact of the two screens being the same machine.
   * Each instance captured a DIFFERENT device id at mount (proved through the
   * heartbeat payloads, which is where the captured value is observable), and the
   * control surface is identical anyway. This is what "ไม่ต้องมี backup logic"
   * cashes out to: nothing in HQ branches on which box it is running on.
   */
  test('P3: the two machines hold different device ids and still match', () => {
    unlock()
    const mac = openHQ('hq-macbook')
    const win = openHQ('hq-windows')

    const beatingIds = upsertSpy.mock.calls.map((c) => (c[0] as Presence).deviceId).sort()
    expect(beatingIds).toStrictEqual(['hq-macbook', 'hq-windows'])

    expect(buttonNames(mac)).toStrictEqual(buttonNames(win))
    expect(fieldNames(mac)).toStrictEqual(fieldNames(win))
    expect(Object.keys(tiles(mac))).toStrictEqual(Object.keys(tiles(win)))
  })
})

// ════════════════════════════════════════════════════════════════════════════
// D. "เห็นข้อมูลตรงกัน"
// ════════════════════════════════════════════════════════════════════════════
describe('D. both machines see the same figures', () => {
  /**
   * D0 — the spine under "every tile". If HQ silently dropped a tile, the
   * comparisons below would compare a shorter list and still agree. This pins the
   * census, so "all eight" is a claim about the screen and not about the loop.
   */
  test('D0: HQ paints exactly the eight known tiles', () => {
    unlock()
    const mac = openHQ('hq-macbook')
    emitOrders(SHIFT_ONE)

    const painted = within(mac.container)
      .getAllByRole('generic')
      .map((el) => el.getAttribute('data-testid'))
      .filter((id): id is string => id !== null && id !== 'presence-row')
      .sort()

    expect(painted).toStrictEqual([...TILE_IDS])
  })

  /**
   * D1 — ONE snapshot object, delivered to both live subscribers, and every tile
   * agrees. The hand-computed values are asserted too: two machines showing "0฿"
   * everywhere would satisfy "equal to each other" perfectly.
   */
  test('D1: one snapshot leaves every tile identical on both machines', () => {
    unlock()
    const mac = openHQ('hq-macbook')
    const win = openHQ('hq-windows')

    emitOrders(SHIFT_ONE)

    const expected = {
      'cash-total': '300฿', 'done-count': '1', 'expected-cash': '300฿', 'net-donation': '420฿',
      'paid-orders': '2', 'qr-total': '120฿', 'total-cost': '0฿', 'total-sales': '420฿',
    }
    expect(tiles(mac)).toStrictEqual(expected)
    expect(tiles(win)).toStrictEqual(expected)
  })

  /**
   * D2 — "อัปเดตเมื่อมีออเดอร์ใหม่", on BOTH machines at once. The figures must
   * MOVE, so the before/after values are pinned separately; a screen frozen after
   * its first snapshot would keep the two machines in perfect agreement forever.
   *
   * The clock never advances inside the emit, which is the push/poll distinction:
   * nothing here waits for a timer to notice the change.
   */
  test('D2: a new order moves both machines together, in the same paint', () => {
    unlock()
    const mac = openHQ('hq-macbook')
    const win = openHQ('hq-windows')

    emitOrders(SHIFT_ONE)
    expect(tiles(mac)['total-sales']).toBe('420฿')
    expect(tiles(win)['total-sales']).toBe('420฿')

    emitOrders(SHIFT_TWO)

    expect(tiles(mac)['total-sales']).toBe('670฿')
    expect(tiles(win)['total-sales']).toBe('670฿')
    expect(tiles(mac)['cash-total']).toBe('550฿')
    expect(tiles(win)['cash-total']).toBe('550฿')
    expect(tiles(mac)['paid-orders']).toBe('3')
    expect(tiles(win)['paid-orders']).toBe('3')
    expect(tiles(mac)).toStrictEqual(tiles(win))
  })

  /**
   * D3 — the expense stream is a SECOND subscription, and it has to reach both
   * machines too. A screen that wired only the order stream to the second
   * instance would pass D1 and D2 and fail here.
   */
  test('D3: expenses reach both machines and move the net on both', () => {
    unlock()
    const mac = openHQ('hq-macbook')
    const win = openHQ('hq-windows')

    emitOrders(SHIFT_TWO)
    emitExpenses([e({ id: 'e1', amount: 200 })])

    expect(tiles(mac)['total-cost']).toBe('200฿')
    expect(tiles(win)['total-cost']).toBe('200฿')
    expect(tiles(mac)['net-donation']).toBe('470฿') // 670 − 200, by hand
    expect(tiles(win)['net-donation']).toBe('470฿')
    expect(tiles(mac)).toStrictEqual(tiles(win))
  })

  /**
   * D4 — the Windows box is opened LATE, after the MacBook has already been
   * running. It converges on the same figures once the snapshot reaches it.
   *
   * ⚠️ Honest about what this is: in production the late machine gets the current
   * snapshot from Firestore on subscribe, and HERE the test supplies it. So this
   * does NOT prove Firestore replays state to a new listener. What it DOES prove
   * is that HQ holds no start-up ordering dependence — the late machine has no
   * "missed the first snapshot" state that keeps it behind.
   */
  test('D4: a machine opened late converges on the same figures', () => {
    unlock()
    const mac = openHQ('hq-macbook')
    emitOrders(SHIFT_ONE)
    expect(tiles(mac)['total-sales']).toBe('420฿')

    const win = openHQ('hq-windows') // the second laptop is opened now
    expect(tiles(win)['total-sales']).toBe('0฿') // and starts empty, as expected

    emitOrders(SHIFT_ONE)

    expect(tiles(win)).toStrictEqual(tiles(mac))
    expect(tiles(win)['total-sales']).toBe('420฿')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// S. "ปิดเครื่องนึง อีกเครื่องทำงานครบ"
// ════════════════════════════════════════════════════════════════════════════
describe('S. closing one machine leaves the other whole', () => {
  /**
   * S1 — the close releases exactly ITS OWN subscriptions. Both halves matter:
   * a teardown that released nothing leaks, and one that released everything
   * would take the survivor down with it. The surviving callback is identified by
   * IDENTITY, not by counting.
   */
  test('S1: closing a machine releases its own subscriptions and only its own', () => {
    unlock()
    const mac = openHQ('hq-macbook')
    openHQ('hq-windows')

    const macOrderCb = orderSubs[0]
    const winOrderCb = orderSubs[1]
    expect(orderSubs).toHaveLength(2)
    expect(expenseSubs).toHaveLength(2)

    mac.unmount()

    expect(orderSubs).toHaveLength(1)
    expect(expenseSubs).toHaveLength(1)
    expect(orderSubs).not.toContain(macOrderCb)
    expect(orderSubs).toContain(winOrderCb)
  })

  /**
   * S2 — the heart of the clause. After the MacBook closes, a NEW snapshot
   * repaints the Windows box.
   *
   * 🚨 This is the test that a shared-callback mock would fake. The emit walks
   * only the LIVE registry, and the assertion right below it states that the dead
   * machine's callback is not in that registry — so the data provably travelled
   * to the survivor rather than to a ghost. W0 is what makes that assertion mean
   * anything.
   */
  test('S2: after one machine closes, a new snapshot still repaints the other', () => {
    unlock()
    const mac = openHQ('hq-macbook')
    const win = openHQ('hq-windows')
    emitOrders(SHIFT_ONE)

    const macOrderCb = orderSubs[0]
    mac.unmount()
    expect(orderSubs).not.toContain(macOrderCb) // the ghost is out of the registry

    // ...and the delivery really went to ONE machine. Without this count, an emit
    // helper that kept its own shadow list could feed the ghost and still leave
    // every assertion below green.
    expect(emitOrders(SHIFT_TWO)).toBe(1)
    expect(emitExpenses([e({ id: 'e1', amount: 200 })])).toBe(1)

    expect(tiles(win)['total-sales']).toBe('670฿')
    expect(tiles(win)['net-donation']).toBe('470฿')
    expect(tiles(win)['paid-orders']).toBe('3')
  })

  /**
   * S3 — "ทำงานครบ" for the READ side: the survivor keeps every control it had
   * while both were open. Compared against the set captured BEFORE the close, so
   * this is a real before/after and not a re-statement of P1.
   */
  test('S3: the surviving machine keeps every control it had', () => {
    unlock()
    const mac = openHQ('hq-macbook')
    const win = openHQ('hq-windows')

    const buttonsBefore = buttonNames(win)
    const fieldsBefore = fieldNames(win)
    expect(buttonsBefore.length).toBeGreaterThan(0) // spine

    mac.unmount()

    expect(buttonNames(win)).toStrictEqual(buttonsBefore)
    expect(fieldNames(win)).toStrictEqual(fieldsBefore)
  })

  /**
   * S4 — "ทำงานครบ" for the WRITE side. Controls that render but no longer write
   * would pass S3 and fail the criterion. `toStrictEqual` on the payload, not
   * `objectContaining`: the Undo criterion's real bug was an EXTRA field slipping
   * through a loose matcher.
   */
  test('S4: the surviving machine can still save an expense', () => {
    unlock()
    const mac = openHQ('hq-macbook')
    const win = openHQ('hq-windows')
    mac.unmount()

    const q = within(win.container)
    fireEvent.change(q.getByLabelText('รายการ'), { target: { value: 'ถ่านสำรอง' } })
    fireEvent.change(q.getByLabelText('จำนวนเงิน'), { target: { value: '250' } })
    fireEvent.click(q.getByRole('button', { name: 'บันทึก · Save' }))

    expect(addExpenseSpy).toHaveBeenCalledTimes(1)
    expect(addExpenseSpy.mock.calls[0][0]).toStrictEqual({
      boothId: 'photo', description: 'ถ่านสำรอง', amount: 250, createdAt: T0,
    })
  })

  /**
   * S5 — and can still broadcast, the third of §98's four verbs. The message
   * carries the SURVIVOR's device id, which is the part that would break if the
   * closed machine's identity were somehow still in play.
   */
  test('S5: the surviving machine can still broadcast to every booth', () => {
    unlock()
    const mac = openHQ('hq-macbook')
    const win = openHQ('hq-windows')
    mac.unmount()

    const q = within(win.container)
    fireEvent.change(q.getByLabelText('ประกาศถึงทุกซุ้ม'), { target: { value: 'ปิดซุ้มสามทุ่ม' } })
    fireEvent.click(q.getByRole('button', { name: 'ส่ง' }))

    expect(sendMessageSpy).toHaveBeenCalledTimes(1)
    expect(sendMessageSpy.mock.calls[0][0]).toStrictEqual({
      fromDeviceId: 'hq-windows', fromBooth: 'photo', fromMode: 'dashboard',
      scope: 'all', kind: 'broadcast', text: 'ปิดซุ้มสามทุ่ม', createdAt: T0, ackBy: [],
    })
  })
})

// ════════════════════════════════════════════════════════════════════════════
// H. presence — §102 "เขียว=online แดง=หลุด" · §157 heartbeat หยุด → HQ เห็น "หลุด"
// ════════════════════════════════════════════════════════════════════════════
describe('H. each machine reports itself, and a closed one goes quiet', () => {
  /**
   * H0 — each machine beats for ITSELF. The payload is pinned field for field:
   * `lastSeen` is an exact number because the clock is held at T0, so a heartbeat
   * that quietly grew or lost a field is visible here.
   */
  test('H0: each open machine writes its own presence document', () => {
    unlock()
    openHQ('hq-macbook')
    openHQ('hq-windows')

    expect(upsertSpy).toHaveBeenCalledTimes(2)
    const written = upsertSpy.mock.calls
      .map((c) => c[0] as Presence)
      .sort((a, b) => a.id.localeCompare(b.id))

    expect(written).toStrictEqual([
      { id: 'hq-macbook', deviceId: 'hq-macbook', booth: 'photo', mode: 'dashboard', lastSeen: T0 },
      { id: 'hq-windows', deviceId: 'hq-windows', booth: 'photo', mode: 'dashboard', lastSeen: T0 },
    ])
  })

  /**
   * H1 — §157's mechanism. The closed machine stops beating; the survivor does
   * not. Both halves are asserted from the SAME clock advance, so "it stopped"
   * cannot be an artifact of time simply not moving.
   */
  test('H1: a closed machine stops beating while the survivor keeps going', () => {
    unlock()
    const mac = openHQ('hq-macbook')
    openHQ('hq-windows')
    upsertSpy.mockClear()

    mac.unmount()
    act(() => { vi.advanceTimersByTime(90_000) }) // three heartbeat intervals

    const beats = upsertSpy.mock.calls.map((c) => (c[0] as Presence).deviceId)
    expect(beats).not.toContain('hq-macbook')
    expect(beats.filter((d) => d === 'hq-windows')).toHaveLength(3)
  })

  /**
   * H2 — what HQ actually PAINTS once one machine has gone quiet. Two rows land on
   * opposite sides of the 90s threshold at the same instant: the survivor beat
   * just now, the closed machine last beat two minutes ago.
   *
   * The threshold's own arithmetic is NOT re-derived here — `alertToast.audit` C4
   * already evaluates `isOnline` on both sides of 90_000 and at the boundary. What
   * this adds is the pairing: one board, one `Date.now()`, two opposite verdicts.
   */
  test('H2: the board shows the closed machine หลุด and the survivor ออนไลน์', () => {
    unlock()
    const win = openHQ('hq-windows')

    emitPresence([
      { id: 'hq-windows', deviceId: 'hq-windows', booth: 'photo', mode: 'dashboard', lastSeen: T0 },
      { id: 'hq-macbook', deviceId: 'hq-macbook', booth: 'photo', mode: 'dashboard', lastSeen: T0 - 120_000 },
    ])

    const rows = within(win.container).getAllByTestId('presence-row')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('ออนไลน์')
    expect(rows[1]).toHaveTextContent('หลุด')

    // and the verdicts are opposite, not both defaulted to one value
    expect(rows[0].textContent).not.toContain('หลุด')
    expect(rows[1].textContent).not.toContain('ออนไลน์')
  })

  /**
   * H3 — `DashboardScreen:30` gates the heartbeat on `unlocked`. A machine sitting
   * at the PIN gate must not advertise itself as an online HQ, or the board would
   * show a machine nobody is watching. Pairs with P0.
   */
  test('H3: a locked machine advertises no presence at all', () => {
    openHQ('hq-macbook') // locked
    act(() => { vi.advanceTimersByTime(120_000) })
    expect(upsertSpy).not.toHaveBeenCalled()

    // ...and the moment it is unlocked, the next machine to open does beat —
    // so H3 is about the gate, not about the heartbeat being broken outright
    unlock()
    openHQ('hq-windows')
    expect(upsertSpy).toHaveBeenCalledTimes(1)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// G. Recorded gaps. These assert a state that is still INCOMPLETE.
// If one goes RED, somebody built the missing half — that is the fix.
// ════════════════════════════════════════════════════════════════════════════
describe('G. gaps recorded, not fixed', () => {
  /** Read `src/` from `process.cwd()`. NOT `import.meta.url` + `fileURLToPath`: */
  /* under Vitest that URL is not a `file:` URL, `fileURLToPath` throws at import */
  /* time, and the file then reports ZERO tests while the suite still says       */
  /* "passed". G0 asserts the read really returned files, so a scanner that read */
  /* nothing cannot go green.                                                    */
  function sourceFiles(dir = join(process.cwd(), 'src'), acc: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) sourceFiles(full, acc)
      else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) acc.push(full)
    }
    return acc
  }

  /**
   * G0 — 🚨 GAP-1. §98 names four things both machines must do:
   * "view + export + broadcast + control". Three exist and are proved above.
   * Export does not exist at all.
   */
  test('G0: GAP — no export path exists anywhere in src/, though §98 requires one', () => {
    const files = sourceFiles()

    // the read actually happened — without this the scan below is vacuous
    expect(files.length).toBeGreaterThan(20)
    const sources = files.map((f) => readFileSync(f, 'utf8'))
    expect(sources.join('').length).toBeGreaterThan(10_000)

    // the positive spine: the OTHER three verbs of §98 are really in this corpus,
    // so the scanner is demonstrably able to find things
    const corpus = sources.join('\n')
    expect(corpus).toContain('BroadcastBar')          // broadcast ✓
    expect(corpus).toContain('computeDashboardMetrics') // view ✓
    expect(corpus).toContain('addExpense')            // control ✓

    // ...and the fourth is absent
    const exportHits = files.filter((f, i) =>
      /\.xlsx|\.csv|createObjectURL|new Blob|download=|application\/pdf/i.test(sources[i]),
    )
    expect(exportHits).toStrictEqual([])
  })

  /**
   * G1 — ⚠️ GAP-2. §102 asks the presence grid to identify machines by
   * "ซุ้ม/โหมด/station". Two HQ machines on the same booth therefore render rows
   * with identical text: nobody at HQ can tell which laptop just died.
   *
   * The row text is pinned literally so this documents WHAT is shown, not merely
   * that two strings happen to match — two empty rows would also match.
   */
  test('G1: GAP — two HQ machines render indistinguishable presence rows', () => {
    unlock()
    const win = openHQ('hq-windows')

    emitPresence([
      { id: 'hq-macbook', deviceId: 'hq-macbook', booth: 'photo', mode: 'dashboard', lastSeen: T0 },
      { id: 'hq-windows', deviceId: 'hq-windows', booth: 'photo', mode: 'dashboard', lastSeen: T0 },
    ])

    const rows = within(win.container).getAllByTestId('presence-row')
    expect(rows).toHaveLength(2)
    expect(rows[0].textContent).toBe('โฟโต้บูธ · dashboardออนไลน์')
    expect(rows[0].textContent).toBe(rows[1].textContent)

    // the id that WOULD disambiguate them is carried in the document and simply
    // never rendered
    expect(rows[0].textContent).not.toContain('hq-macbook')
    expect(rows[1].textContent).not.toContain('hq-windows')
  })
})

// A `BoothId` is referenced only in the type position above; this keeps the
// import honest under `tsc -b`, which typechecks test files even though vitest
// does not.
export type _BoothIdIsUsed = BoothId
