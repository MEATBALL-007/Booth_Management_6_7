/**
 * เกณฑ์ (AUTOPILOT.md — จาก `docs/superpowers/specs/2026-07-24-hq-comms-crosssell-design.md:176`):
 *
 *   "HQ เปิดบน MacBook + Windows พร้อมกัน เห็นข้อมูลตรงกัน realtime; ปิดเครื่องนึง อีกเครื่องทำงานครบ"
 *
 * ── ขอบเขตของเกณฑ์ (ตัดสินแล้ว ไม่ปล่อยเป็นสถานะ "ไม่รู้") ────────────────────
 * "ปิดเครื่องนึง" ในโลกจริงมีสองความหมาย และ **ตัดสินว่าเกณฑ์กินทั้งสอง**:
 *
 *   (ก) **ปิดหน้าต่าง/ปิดเครื่อง** → อีกเครื่องต้องยังรับ snapshot ต่อได้ และยัง
 *       "ทำงานครบ" = view + broadcast + control ตามที่ §4.1 `:98` นิยามคำนี้ไว้เอง
 *       ("2 เครื่องเหมือนกันทุกปุ่ม (ทั้งคู่ view + export + broadcast + control ได้ครบ)")
 *       → ชุด C ข้างล่าง
 *   (ข) **เครื่องนั้นหลุดเน็ต** → HQ อีกเครื่องต้องเห็นเป็น "หลุด" ซึ่ง **สเปกเขียนไว้เองตรงตัว**
 *       ที่ §5 `:157` "presence heartbeat หยุดตอน offline → HQ เห็นเป็น 'หลุด' ถูกต้อง"
 *       → ชุด D ข้างล่าง
 *
 * บรรทัด `:157` คือตัวชี้ขาด — ถ้าเกณฑ์กินแค่ (ก) สเปกจะไม่มีที่ไหนรับผิดชอบข้อ (ข) เลย
 * ทั้งที่ตัวมันเองยกมาพูดถึง HQ โดยตรง
 *
 * ── ขอบเขตของหลักฐาน (อ่านก่อนเชื่อ) ──────────────────────────────────────────
 * `ordersRepo` / `expensesRepo` / `commsRepo` ถูก mock **ทั้งโมดูล**
 * → **ไม่เคยต่อ Firestore จริง ไม่มี MacBook ไม่มี Windows เครื่องที่สอง ไม่เคยดึงปลั๊ก**
 * - "realtime" พิสูจน์ได้แค่ว่า **จอต่อ listener ไว้ และวาดใหม่จาก snapshot โดยไม่ต้องรีเฟรช**
 *   (B2 ยืนยันถึงขั้นว่าเป็น DOM node **ตัวเดิม** ที่เปลี่ยนค่า = อัปเดตสด ไม่ใช่ remount)
 *   ไม่ได้จับเวลาจริงบนเน็ตจริง
 * - jsdom ไม่รัน cascade ไม่ layout → ทุกอย่างที่เป็นสไตล์เป็น token ที่ประกาศไว้ ไม่ใช่พิกเซล
 *
 * ⚠️ **ข้อจำกัดของการจำลอง "สองเครื่อง" ในกล่องเดียว**: render `<DashboardScreen/>` สองครั้ง
 * อยู่ใน JS context เดียวกัน → mock ของ `getDeviceId` เป็นค่าตัวเดียวที่ mutate ได้
 * และ `DashboardScreen` อ่าน `getDeviceId()` / `loadDeviceConfig()` **ทุกครั้งที่ render**
 * → เครื่องที่เปิดก่อนจะ "เปลี่ยนชื่อ" ถ้ามันถูก re-render หลังเปิดเครื่องที่สอง
 * ทุกเทสต์ที่ assert เรื่อง **ตัวตนของเครื่อง** จึง assert **ก่อนมี snapshot ใดๆ เข้ามา**
 * (A2, C5) ส่วนเทสต์ที่กระทำหลัง emit จะกระทำกับ **เครื่องที่เปิดทีหลัง** ซึ่ง id ตรงอยู่แล้ว
 * ข้อจำกัดนี้เป็นของเครื่องมือ ไม่ใช่ของโปรดักชัน — บนเครื่องจริงสอง localStorage แยกกันสนิท
 */
import { vi, beforeEach, afterEach, test, expect } from 'vitest'
import { render, within, cleanup } from '@testing-library/react'
import { act } from 'react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import type { Order, Expense, BoothId } from './domain/types'
import type { Message, Presence } from './comms/types'
import { computeDashboardMetrics } from './dashboard/metrics'
import { visibleMessages } from './comms/commsLogic'

const NOW = 1_770_000_000_000

interface Sub<T> {
  cb: (v: T) => void
  unsub: ReturnType<typeof vi.fn>
  alive: boolean
}

const h = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const make = <T,>(list: any[]) => (cb: (v: T) => void) => {
    const sub = { cb, alive: true, unsub: vi.fn() }
    sub.unsub.mockImplementation(() => { sub.alive = false })
    list.push(sub)
    return sub.unsub
  }
  return {
    // เครื่องที่กำลัง render อยู่ — เปลี่ยนได้กลางเทสต์ เพื่อจำลองสองเครื่องคนละตัว
    device: { id: 'macbook-hq', booth: 'photo' as BoothId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    orderSubs: [] as any[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expenseSubs: [] as any[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    presenceSubs: [] as any[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messageSubs: [] as any[],
    sendSpy: vi.fn(),
    ackSpy: vi.fn(),
    addExpenseSpy: vi.fn(),
    beatSpy: vi.fn(),
    make,
  }
})

vi.mock('./order/ordersRepo', () => ({
  createOrder: vi.fn(),
  updateOrderStatus: vi.fn(),
  subscribeBoothOrders: () => () => {},
  subscribeAllOrders: h.make<Order[]>(h.orderSubs),
}))
vi.mock('./expense/expensesRepo', () => ({
  addExpense: h.addExpenseSpy,
  subscribeAllExpenses: h.make<Expense[]>(h.expenseSubs),
}))
vi.mock('./comms/commsRepo', () => ({
  sendMessage: h.sendSpy,
  ackMessage: h.ackSpy,
  upsertPresence: h.beatSpy,
  subscribeMessages: h.make<Message[]>(h.messageSubs),
  subscribePresence: h.make<Presence[]>(h.presenceSubs),
}))
vi.mock('./device/deviceId', () => ({ getDeviceId: () => h.device.id }))
vi.mock('./device/deviceConfig', () => ({
  loadDeviceConfig: () => ({ booth: h.device.booth, mode: 'dashboard' }),
}))

import { DashboardScreen } from './screens/DashboardScreen'

let clock = NOW
vi.spyOn(Date, 'now').mockImplementation(() => clock)

/** เปิด HQ หนึ่งเครื่อง (หนึ่งเบราว์เซอร์) — คืน query ที่ผูกกับ container ของเครื่องนั้นเท่านั้น */
function openHq(deviceId: string, booth: BoothId = 'photo') {
  h.device.id = deviceId
  h.device.booth = booth
  const { container, unmount } = render(<DashboardScreen />)
  return { view: within(container), unmount }
}

/** Firestore ยิง snapshot เดียวกันให้ทุกเครื่องที่ยัง subscribe อยู่ (เครื่องที่ปิดแล้วไม่ได้รับ) */
function emit(orders: Order[], expenses: Expense[] = []) {
  act(() => {
    h.orderSubs.filter((s: Sub<Order[]>) => s.alive).forEach((s: Sub<Order[]>) => s.cb(orders))
    h.expenseSubs.filter((s: Sub<Expense[]>) => s.alive).forEach((s: Sub<Expense[]>) => s.cb(expenses))
  })
}

function emitPresence(rows: Presence[]) {
  act(() => {
    h.presenceSubs.filter((s: Sub<Presence[]>) => s.alive).forEach((s: Sub<Presence[]>) => s.cb(rows))
  })
}

const o = (over: Partial<Order>): Order => ({
  id: 'x', boothId: 'drinks', queueNumber: 'A1', station: 'A',
  items: [{ sku: 'a', name: 'A', qty: 1, unitPrice: 30, subtotal: 30 }],
  total: 30, paymentMethod: 'cash', paymentStatus: 'paid', status: 'done', createdAt: 1, ...over,
})

const p = (over: Partial<Presence>): Presence => ({
  id: 'd', deviceId: 'd', booth: 'photo', mode: 'dashboard', lastSeen: NOW, ...over,
})

/** ทุกตัวเลขบนแผงตัวเลข HQ — คู่กับสูตรกลางใน `dashboard/metrics.ts` */
const TILES: [string, (m: ReturnType<typeof computeDashboardMetrics>) => string][] = [
  ['total-sales', (m) => `${m.totalSales}฿`],
  ['net-donation', (m) => `${m.netDonation}฿`],
  ['cash-total', (m) => `${m.cashTotal}฿`],
  ['qr-total', (m) => `${m.qrTotal}฿`],
  ['total-cost', (m) => `${m.totalCost}฿`],
  ['expected-cash', (m) => `${m.expectedCash}฿`],
  ['paid-orders', (m) => `${m.paidOrderCount}`],
  ['done-count', (m) => `${m.doneCount}`],
]

const tileMap = (view: ReturnType<typeof within>) =>
  Object.fromEntries(TILES.map(([id]) => [id, view.getByTestId(id).textContent]))

beforeEach(() => {
  clock = NOW
  localStorage.clear()
  localStorage.setItem('phantom.dashboardPin', 'unlocked')
  h.orderSubs.length = 0
  h.expenseSubs.length = 0
  h.presenceSubs.length = 0
  h.messageSubs.length = 0
  h.sendSpy.mockReset().mockResolvedValue('m1')
  h.ackSpy.mockReset().mockResolvedValue(undefined)
  h.addExpenseSpy.mockReset().mockResolvedValue('e1')
  h.beatSpy.mockReset().mockResolvedValue(undefined)
})

// ─────────────────────────────────────────────────────────────────────────────
// A. "เปิดพร้อมกันสองเครื่อง" — สองเครื่องต้องเป็นสองเครื่องจริงๆ ไม่ใช่เครื่องเดียวนับสองที
// ─────────────────────────────────────────────────────────────────────────────

test('A1: two HQ browsers each open their own live listeners, not a shared one', () => {
  openHq('macbook-hq')
  openHq('windows-hq')

  // หนึ่งชุดต่อหนึ่งเบราว์เซอร์: orders + expenses + presence + messages
  expect(h.orderSubs).toHaveLength(2)
  expect(h.expenseSubs).toHaveLength(2)
  expect(h.presenceSubs).toHaveLength(2)
  expect(h.messageSubs).toHaveLength(2)
  // และเป็นคนละ callback จริง (ถ้าเป็นตัวเดียวกัน แปลว่ามี state กลางที่แชร์กันอยู่)
  expect(h.orderSubs[0].cb).not.toBe(h.orderSubs[1].cb)
})

test('A2: each browser announces itself to /presence under its own id, both as HQ', () => {
  openHq('macbook-hq')
  openHq('windows-hq')

  // assert **ก่อนมี snapshot ใดๆ** — ดูหมายเหตุเรื่องข้อจำกัดของการจำลองที่หัวไฟล์
  expect(h.beatSpy.mock.calls).toStrictEqual([
    [{ id: 'macbook-hq', deviceId: 'macbook-hq', booth: 'photo', mode: 'dashboard', lastSeen: NOW }],
    [{ id: 'windows-hq', deviceId: 'windows-hq', booth: 'photo', mode: 'dashboard', lastSeen: NOW }],
  ])
})

// ─────────────────────────────────────────────────────────────────────────────
// B. "เห็นข้อมูลตรงกัน realtime"
// ─────────────────────────────────────────────────────────────────────────────

test('B1: one snapshot gives both browsers the same numbers, and the numbers are the books', () => {
  const a = openHq('macbook-hq')
  const b = openHq('windows-hq')

  const orders = [
    o({ id: '1', total: 300, paymentMethod: 'cash', boothId: 'photo' }),
    o({ id: '2', total: 120, paymentMethod: 'qr', boothId: 'drinks', status: 'serving' }),
    o({ id: '3', total: 999, paymentStatus: 'pending', status: 'waiting' }),
  ]
  const expenses: Expense[] = [{ id: 'e1', boothId: 'photo', description: 'ฟิล์ม', amount: 200, createdAt: 1 }]
  emit(orders, expenses)

  const m = computeDashboardMetrics(orders, expenses)
  const expected = Object.fromEntries(TILES.map(([id, read]) => [id, read(m)]))

  // ปักตัวเลขไว้ตรงๆ ด้วย ไม่งั้นถ้าใครแก้สูตรกลาง **ทั้งสองฝั่งของการเทียบจะขยับตามกัน**
  // แล้วเทสต์จะเขียวต่อไปทั้งที่ยอดเปลี่ยน (สูตรเองมีเทสต์ของตัวเองที่ `dashboard/metrics.test.ts`)
  expect(expected).toStrictEqual({
    'total-sales': '420฿', 'net-donation': '220฿', 'cash-total': '300฿', 'qr-total': '120฿',
    'total-cost': '200฿', 'expected-cash': '300฿', 'paid-orders': '2', 'done-count': '1',
  })

  // ตรงกันระหว่างสองเครื่อง — กวาดครบทุกช่อง ไม่ใช่สุ่มดูสองช่อง
  expect(tileMap(b.view)).toStrictEqual(tileMap(a.view))
  // และตรงกับสูตรกลาง ไม่ใช่ตรงกันเพราะผิดเหมือนกันทั้งคู่
  expect(tileMap(a.view)).toStrictEqual(expected)
})

test('B2: a new order reaches both browsers live — the same node changes, nothing reloads', () => {
  const a = openHq('macbook-hq')
  const b = openHq('windows-hq')

  emit([o({ id: '1', total: 300 })])
  const nodeA = a.view.getByTestId('total-sales')
  const nodeB = b.view.getByTestId('total-sales')
  expect(nodeA).toHaveTextContent('300฿')
  expect(nodeB).toHaveTextContent('300฿')

  emit([o({ id: '1', total: 300 }), o({ id: '2', total: 45 })])

  expect(nodeA).toHaveTextContent('345฿')
  expect(nodeB).toHaveTextContent('345฿')
  // DOM node ตัวเดิมเปลี่ยนค่า = อัปเดตสด ไม่ใช่ remount/รีเฟรช
  expect(a.view.getByTestId('total-sales')).toBe(nodeA)
  expect(b.view.getByTestId('total-sales')).toBe(nodeB)
})

test('B3: both browsers offer the same controls (§4.1 "2 เครื่องเหมือนกันทุกปุ่ม")', () => {
  const a = openHq('macbook-hq')
  const b = openHq('windows-hq')

  const names = (view: ReturnType<typeof within>) =>
    view.getAllByRole('button').map((el) => el.textContent).sort()

  // spine: ถ้าไม่มีปุ่มเลย การเทียบ [] กับ [] จะเขียวว่างเปล่า
  expect(names(a.view).length).toBeGreaterThanOrEqual(2)
  expect(names(a.view)).toEqual(expect.arrayContaining([expect.stringContaining('ส่ง')]))
  expect(names(b.view)).toStrictEqual(names(a.view))
})

// ─────────────────────────────────────────────────────────────────────────────
// C. "ปิดเครื่องนึง อีกเครื่องทำงานครบ" — ความหมาย (ก): ปิดหน้าต่าง/ปิดเครื่อง
// ─────────────────────────────────────────────────────────────────────────────

test('C1: closing one browser tears down only its own listeners', () => {
  const a = openHq('macbook-hq')
  openHq('windows-hq')

  a.unmount()

  expect(h.orderSubs[0].unsub).toHaveBeenCalledTimes(1)
  expect(h.expenseSubs[0].unsub).toHaveBeenCalledTimes(1)
  expect(h.presenceSubs[0].unsub).toHaveBeenCalledTimes(1)
  expect(h.messageSubs[0].unsub).toHaveBeenCalledTimes(1)
  // เครื่องที่ยังเปิดอยู่ต้องไม่ถูกปิดตามไปด้วย
  expect(h.orderSubs[1].unsub).not.toHaveBeenCalled()
  expect(h.expenseSubs[1].unsub).not.toHaveBeenCalled()
  expect(h.presenceSubs[1].unsub).not.toHaveBeenCalled()
  expect(h.messageSubs[1].unsub).not.toHaveBeenCalled()
})

test('C2: the surviving browser keeps taking snapshots after the other one closes', () => {
  const a = openHq('macbook-hq')
  const b = openHq('windows-hq')

  emit([o({ id: '1', total: 300 })])
  a.unmount()
  emit([o({ id: '1', total: 300 }), o({ id: '2', total: 70 })])

  expect(b.view.getByTestId('total-sales')).toHaveTextContent('370฿')
})

test('C3: the surviving browser can still broadcast to every booth', async () => {
  const a = openHq('macbook-hq')
  const b = openHq('windows-hq')
  a.unmount()

  const user = userEvent.setup()
  await user.type(b.view.getByLabelText(/ประกาศถึงทุกซุ้ม/), 'พักเบรก 10 นาที')
  await user.click(b.view.getByRole('button', { name: /^ส่ง$/ }))

  expect(h.sendSpy.mock.calls).toStrictEqual([[{
    fromDeviceId: 'windows-hq', fromBooth: 'photo', fromMode: 'dashboard',
    scope: 'all', kind: 'broadcast', text: 'พักเบรก 10 นาที', createdAt: NOW, ackBy: [],
  }]])
})

test('C4: the surviving browser can still record an expense', async () => {
  const a = openHq('macbook-hq')
  const b = openHq('windows-hq')
  a.unmount()

  const user = userEvent.setup()
  await user.type(b.view.getByLabelText(/รายการ/), 'น้ำแข็ง 3 ถุง')
  await user.type(b.view.getByLabelText(/จำนวนเงิน/), '120')
  await user.click(b.view.getByRole('button', { name: /บันทึก/ }))

  expect(h.addExpenseSpy.mock.calls).toStrictEqual([[{
    boothId: 'photo', description: 'น้ำแข็ง 3 ถุง', amount: 120, createdAt: NOW,
  }]])
})

test('C5: a closed browser stops claiming to be online — its heartbeat is cleaned up', () => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] })
  try {
    const a = openHq('macbook-hq')
    openHq('windows-hq')
    expect(h.beatSpy).toHaveBeenCalledTimes(2) // นัดแรกตอนเปิด

    act(() => { vi.advanceTimersByTime(30_000) })
    expect(h.beatSpy).toHaveBeenCalledTimes(4) // ทั้งคู่เต้นต่อ

    a.unmount()
    h.beatSpy.mockClear()
    act(() => { vi.advanceTimersByTime(30_000) })

    expect(h.beatSpy).toHaveBeenCalledTimes(1)
    expect(h.beatSpy.mock.calls[0][0]).toMatchObject({ id: 'windows-hq' })
  } finally {
    cleanup()
    vi.useRealTimers()
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// D. "ปิดเครื่องนึง" — ความหมาย (ข): เครื่องนั้นหลุดเน็ต → HQ ที่เหลือเห็นเป็น "หลุด" (§5 `:157`)
// ─────────────────────────────────────────────────────────────────────────────

test('D1: the surviving HQ shows a machine that stopped beating as หลุด', () => {
  const b = openHq('windows-hq')

  emitPresence([
    p({ id: 'macbook-hq', station: 'A', lastSeen: NOW - 120_000 }), // เงียบไป 2 นาที
    p({ id: 'windows-hq', station: 'B', lastSeen: NOW - 1_000 }),
  ])

  const rows = b.view.getAllByTestId('presence-row')
  expect(rows).toHaveLength(2)
  expect(rows[0]).toHaveTextContent('A')
  expect(rows[0]).toHaveTextContent('หลุด')
  expect(rows[1]).toHaveTextContent('B')
  expect(rows[1]).toHaveTextContent('ออนไลน์')
})

test('D2 (spine): a machine that is still beating reads as ออนไลน์, not หลุด', () => {
  const b = openHq('windows-hq')

  emitPresence([
    p({ id: 'macbook-hq', station: 'A', lastSeen: NOW - 1_000 }),
    p({ id: 'windows-hq', station: 'B', lastSeen: NOW }),
  ])

  const rows = b.view.getAllByTestId('presence-row')
  expect(rows.map((r) => r.textContent?.includes('หลุด'))).toStrictEqual([false, false])
})

test('D3 GAP: the หลุด flip needs a snapshot — the presence board has no clock of its own', () => {
  // นาฬิกาของ Date ต้องไม่ถูก fake ทับ (`clock` ยังต้องเป็นตัวคุม) — fake แค่ timer
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] })
  try {
    const b = openHq('windows-hq')
    emitPresence([
      p({ id: 'macbook-hq', station: 'A', lastSeen: NOW }),
      p({ id: 'windows-hq', station: 'B', lastSeen: NOW }),
    ])
    expect(b.view.getAllByTestId('presence-row')[0]).toHaveTextContent('ออนไลน์')

    // เวลาเดินผ่านเกณฑ์ไปไกลแล้ว และ **timer ทุกตัวได้เดินจริง** แต่ไม่มี snapshot ใหม่เข้ามา
    clock = NOW + 300_000
    act(() => { vi.advanceTimersByTime(300_000) })
    expect(b.view.getAllByTestId('presence-row')[0]).toHaveTextContent('ออนไลน์') // ← ยังเขียวอยู่

    // พอมี snapshot อะไรก็ได้เข้ามา การ์ดถึงคำนวณ now ใหม่แล้วพลิกเป็น "หลุด"
    emitPresence([
      p({ id: 'macbook-hq', station: 'A', lastSeen: NOW }),
      p({ id: 'windows-hq', station: 'B', lastSeen: clock }),
    ])
    expect(b.view.getAllByTestId('presence-row')[0]).toHaveTextContent('หลุด')
  } finally {
    cleanup()
    vi.useRealTimers()
  }

  // ⚠️ เทสต์นี้บันทึก **ช่องว่าง** ไว้ ไม่ได้บันทึกว่ามันถูก: `PresenceBoard.tsx:10` อ่าน
  // `Date.now()` ตอน render และไม่มี timer ของตัวเอง → สถานะ "หลุด" เป็นเรื่องที่ **snapshot ผลัก**
  // ไม่ใช่ **นาฬิกาผลัก** — เอา PresenceBoard ไปแปะจอที่ไม่มีอะไรเขียน presence เมื่อไหร่ จะค้างเขียวถาวร
  // **บนของจริงเกณฑ์ยังผ่าน** เพราะ heartbeat ของเครื่องที่ยังเปิดอยู่เองเขียน `/presence` ทุก 30 วิ
  // → Firestore สะท้อน snapshot กลับมาเอง → การ์ดคำนวณใหม่ (D4 ล็อกว่า 30 วิ ถี่พอเทียบเกณฑ์ 90 วิ)
  // กลไกนั้นอยู่ฝั่ง Firestore ซึ่งไฟล์นี้ mock ทิ้ง → **จำลองไม่ได้ จึงไม่แกล้งทำเป็นพิสูจน์**
  // ปิดช่องนี้ให้ตรงไปตรงมาต้องเพิ่ม tick เข้าไปใน PresenceBoard = **แก้คอมโพเนนต์ comms ซึ่ง Out of scope**
  // วันที่มีคนแก้ เทสต์นี้จะแดง — **ตั้งใจให้แดง** ให้ลบเทสต์นี้แล้วมาอัปเดตบัญชีใน AUTOPILOT.md
})

test('D4: the heartbeat is frequent enough that a live machine is never called หลุด', () => {
  const read = (file: string, name: string): number => {
    const src = readFileSync(file, 'utf8')
    const m = new RegExp(`${name}\\s*=\\s*([0-9_]+)`).exec(src)
    // ห้ามคืน 0 เมื่ออ่านไม่ออก — ไม่งั้นการเทียบ "ถี่พอ" จะเขียวว่างเปล่าตลอดกาล
    if (!m) throw new Error(`อ่าน ${name} จาก ${file} ไม่ออก`)
    return Number(m[1].replace(/_/g, ''))
  }
  const beat = read('src/comms/useHeartbeat.ts', 'HEARTBEAT_MS')
  const threshold = read('src/comms/commsLogic.ts', 'ONLINE_THRESHOLD_MS')

  expect(beat).toBeGreaterThan(0)
  expect(threshold).toBeGreaterThan(0)
  // เผื่อพลาดไปหนึ่งจังหวะยังต้องไม่ขึ้น "หลุด" — ไม่งั้น HQ จะเห็นเครื่องที่ยังทำงานอยู่กระพริบแดง
  expect(beat * 2).toBeLessThanOrEqual(threshold)
})

// ─────────────────────────────────────────────────────────────────────────────
// E. ช่องว่างที่บันทึกไว้ ไม่ปล่อยเป็นสถานะ "ไม่รู้"
// ─────────────────────────────────────────────────────────────────────────────

test('E1 GAP: two HQ machines set up for different booths would not see the same booth-scoped message', () => {
  const scopedToPhoto: Message = {
    id: 'm1', fromDeviceId: 'booth-tablet', fromBooth: 'photo', fromMode: 'order',
    scope: 'photo', kind: 'alert', presetCode: 'need_help', createdAt: NOW, ackBy: [],
  }
  const toEveryone: Message = { ...scopedToPhoto, id: 'm2', scope: 'all' }

  // spine: ข้อความ scope 'all' ถึงทั้งสองเครื่องเสมอ — ตัวกรองไม่ได้ตาบอด
  expect(visibleMessages([toEveryone], 'photo', 'macbook-hq')).toHaveLength(1)
  expect(visibleMessages([toEveryone], 'drinks', 'windows-hq')).toHaveLength(1)

  // ...แต่ข้อความที่ scope ไปที่ซุ้มเดียว เห็นไม่เท่ากัน ถ้า HQ สองเครื่องตั้ง booth ไว้คนละซุ้ม
  expect(visibleMessages([scopedToPhoto], 'photo', 'macbook-hq')).toHaveLength(1)
  expect(visibleMessages([scopedToPhoto], 'drinks', 'windows-hq')).toHaveLength(0)

  // ⚠️ **ช่องว่าง ไม่ใช่บั๊กที่เอื้อมถึงวันนี้**: E2 พิสูจน์ว่าไม่มีที่ไหนในแอปส่ง scope แบบเจาะซุ้มเลย
  // ปิดให้ถูกต้องต้องให้ HQ มองเห็นทุก scope = แก้ `visibleMessages` = **logic comms ซึ่ง Out of scope**
})

test('E2 (spine for E1): nothing in the app sends a booth-scoped message today', () => {
  const senders = ['src/comms/AlertButtons.tsx', 'src/comms/BroadcastBar.tsx']
  const scopes = senders.flatMap((f) =>
    [...readFileSync(f, 'utf8').matchAll(/scope:\s*'([^']+)'/g)].map((m) => `${f}:${m[1]}`),
  )
  // spine: ตัวสแกนต้องมองเห็นอะไรอยู่จริง ไม่ใช่ [] เทียบ []
  expect(scopes.length).toBeGreaterThanOrEqual(2)
  expect(scopes.filter((s) => !s.endsWith(':all'))).toStrictEqual([])
})

test('F1 GAP: HQ has no Export (.xlsx/PDF) although §4.1 lists it as an existing feature', () => {
  const detect = (text: string) => [
    ...text.matchAll(/xlsx|createObjectURL|\.pdf\b|download=/g),
  ].map((m) => m[0])

  // spine: ตัวตรวจต้องมีฟันจริง — ป้อนของที่ต้องถูกจับเข้าไป
  expect(detect(`const a = document.createElement('a'); a.download='x.xlsx'`)).not.toHaveLength(0)

  const files = [
    'src/screens/DashboardScreen.tsx',
    'package.json',
  ]
  expect(files.flatMap((f) => detect(readFileSync(f, 'utf8')))).toStrictEqual([])

  // §4.1 `:106` เขียนว่า "Donation thermometer (ใหญ่) + **Export (.xlsx/PDF) เดิม**"
  // คำว่า "เดิม" เป็นข้ออ้างที่ **ไม่จริง** — ไม่มี export ที่ไหนในแอปเลย และไม่เคยมี
  // ทำให้มีจริงต้อง **เพิ่ม dependency ใหม่** (xlsx/pdf) ซึ่ง Out of scope ห้ามไว้ตรงตัว
  // → เกณฑ์ข้อนี้ยังผ่านได้ เพราะสิ่งที่มันถามคือ "สองเครื่อง **เหมือนกัน**" ซึ่งจริง
  //   (โค้ดชุดเดียวกัน ไม่มีสาขาไหนแยกตามเครื่อง) — สิ่งที่ขาดคือฟีเจอร์ที่ขาด **ทั้งสองเครื่องเท่ากัน**
  // วันที่มีคนทำ Export เทสต์นี้จะแดง — **ตั้งใจให้แดง** ให้ลบเทสต์นี้แล้วมาอัปเดตบัญชี
})

afterEach(() => {
  vi.useRealTimers()
})
