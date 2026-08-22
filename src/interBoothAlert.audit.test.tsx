/**
 * เกณฑ์ (AUTOPILOT.md — จาก `docs/superpowers/specs/2026-07-24-hq-comms-crosssell-design.md`):
 *
 *   "ซุ้มกดปุ่ม 🆘 → HQ + ซุ้มอื่นเห็น toast ภายในไม่กี่วิ (เมื่อ online); ack ได้"
 *
 * ── ขอบเขตของเกณฑ์ (ตัดสินแล้ว ไม่ปล่อยเป็นสถานะ "ไม่รู้") ────────────────────
 * §4.2 `:116` เขียนว่า "**ทุกโหมด (Order/Display/HQ) รับ** → toast + เสียงเบา + ปุ่ม ✔ ack"
 * และ `:118` สั่งแยกอีกบรรทัดว่า "Display: alert สำคัญขึ้น**แถบ**บนจอสั้นๆ ไม่รบกวนการโชว์คิว"
 * เกณฑ์ที่ต้องติ๊กพูดถึง **"toast"** และ **"ack ได้"** ซึ่งเป็นคำของบรรทัด `:116`
 * ส่วน Display ได้ทรีตเมนต์ของตัวเองที่ `:118` (แถบ · สั้นๆ · ไม่มี ack)
 *
 * → **ตัดสิน: เกณฑ์นี้กิน HQ (Dashboard) + Order Station ของซุ้มอื่น** ไม่กินแถบบน Display
 * เหตุผลที่ชี้ขาดไม่ใช่รสนิยม แต่เป็น **ตัวโค้ดเอง**: `visibleMessages()` ตัดข้อความออก
 * ก็ต่อเมื่อ `ackBy` มี deviceId ของเครื่องนั้นแล้ว — จอลูกค้าไม่มีใครกด ✔
 * → เอา `CommsToast` ไปแปะบน Display ตรงๆ = alert **ค้างถาวรบนจอลูกค้า**
 * ปิดช่องนี้ให้ถูกต้องต้องมี time window ใน `commsLogic.ts` ซึ่ง **Out of scope ห้ามแตะ logic comms**
 * → ล็อกไว้เป็นเทสต์ `GAP:` ข้างล่างแทน (G1) พร้อมเหตุผล
 *
 * ── ขอบเขตของหลักฐาน (อ่านก่อนเชื่อ) ──────────────────────────────────────────
 * jsdom ไม่รัน cascade ไม่ layout ไม่มี viewport และ **ไม่มี Firestore จริง**
 * - "ภายในไม่กี่วิ" พิสูจน์ได้แค่เชิง**โครงสร้าง**: จอต่อ listener ไว้ และ toast โผล่
 *   จาก snapshot ที่ยิงเข้ามาโดย**ไม่ต้องรีเฟรช/ไม่ต้องกดอะไร** — ไม่ได้วัดเวลาจริงบนเน็ตจริง
 * - "เมื่อ online" ไม่ได้ทดสอบเลย (ไม่เคยต่อ Firestore จริง ไม่เคยลอง offline จริง)
 * - ทุกอย่างที่เป็นสไตล์เป็น **token ที่ประกาศไว้** ไม่ใช่พิกเซล
 */
import { vi, beforeEach, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { act } from 'react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import type { Message } from './comms/types'
import type { BoothId } from './domain/types'
import { visibleMessages } from './comms/commsLogic'

const NOW = 1_760_000_000_000
const ME = 'device-me'

const { sendSpy, ackSpy, subs, device } = vi.hoisted(() => ({
  sendSpy: vi.fn().mockResolvedValue('m1'),
  ackSpy: vi.fn().mockResolvedValue(undefined),
  subs: [] as ((messages: unknown[]) => void)[],
  // เครื่องที่กำลัง render อยู่ — เปลี่ยนได้กลางเทสต์ เพื่อจำลอง **สองเครื่องคนละตัว**
  device: { id: 'device-me' },
}))

vi.mock('./comms/commsRepo', () => ({
  sendMessage: sendSpy,
  subscribeMessages: (cb: (messages: unknown[]) => void) => {
    subs.push(cb)
    return () => {}
  },
  ackMessage: ackSpy,
  upsertPresence: vi.fn().mockResolvedValue(undefined),
  subscribePresence: () => () => {},
}))
vi.mock('./device/deviceId', () => ({ getDeviceId: () => device.id }))
vi.mock('./device/deviceConfig', () => ({ loadDeviceConfig: () => ({ booth: 'photo', mode: 'dashboard' }) }))
vi.mock('./order/ordersRepo', () => ({
  createOrder: vi.fn().mockResolvedValue('order-1'),
  updateOrderStatus: vi.fn(),
  subscribeBoothOrders: () => () => {},
  subscribeAllOrders: () => () => {},
}))
vi.mock('./expense/expensesRepo', () => ({
  subscribeAllExpenses: () => () => {},
  addExpense: vi.fn().mockResolvedValue('e1'),
}))
vi.mock('./screens/QueuePanel', () => ({ QueuePanel: () => null }))
vi.mock('./display/chime', () => ({ playChime: vi.fn() }))
vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,FAKE') } }))

import { OrderStation } from './screens/OrderStation'
import { DashboardScreen } from './screens/DashboardScreen'
import { DisplayScreen } from './screens/DisplayScreen'

/** ข้อความจาก **เครื่องอื่น** เสมอ เว้นแต่จะสั่งเป็นอย่างอื่น */
const alert = (over: Partial<Message> = {}): Message => ({
  id: 'a1',
  fromDeviceId: 'device-photo-station',
  fromBooth: 'photo',
  fromMode: 'order',
  scope: 'all',
  kind: 'alert',
  presetCode: 'need_help',
  createdAt: NOW,
  ackBy: [],
  ...over,
})

/** ยิง snapshot เข้าไปในทุก listener ที่จอที่ mount อยู่เปิดไว้ */
const emit = (messages: Message[]) => act(() => { subs.forEach((cb) => cb(messages)) })

const read = (path: string) => readFileSync(path, 'utf8')

const unlockHq = () => localStorage.setItem('phantom.dashboardPin', 'unlocked')

/** toast ที่มองเห็นอยู่ตอนนี้ (CommsToast เป็น Panel role="status") */
const toast = () => screen.queryByRole('status')

beforeEach(() => {
  localStorage.clear()
  sendSpy.mockClear()
  ackSpy.mockClear()
  subs.length = 0
  device.id = ME
  vi.spyOn(Date, 'now').mockReturnValue(NOW)
})

// ─── A. ครึ่งส่ง: ซุ้มกดปุ่ม 🆘 ────────────────────────────────────────────────

test('A1: pressing 🆘 sends exactly one alert, and the payload carries nothing extra', async () => {
  const user = userEvent.setup()
  render(<OrderStation booth="drinks" station="A" />)

  await user.click(screen.getByRole('button', { name: /ขอคนช่วย/ }))

  // toStrictEqual บน mock.calls **ทั้งลิสต์** ไม่ใช่ objectContaining:
  // รอบ 0031 พิสูจน์แล้วว่า objectContaining ปล่อย field ส่วนเกินผ่าน และมองไม่เห็นการยิงซ้ำสองครั้ง
  expect(sendSpy.mock.calls).toStrictEqual([[{
    fromDeviceId: ME,
    fromBooth: 'drinks',
    fromMode: 'order',
    scope: 'all',
    kind: 'alert',
    presetCode: 'need_help',
    createdAt: NOW,
    ackBy: [],
  }]])
})

test('A2: the three preset buttons of §4.2 all exist and each carries its own code', async () => {
  const user = userEvent.setup()
  render(<OrderStation booth="drinks" station="A" />)

  await user.click(screen.getByRole('button', { name: /ขอคนช่วย/ }))
  await user.click(screen.getByRole('button', { name: /ของใกล้หมด/ }))
  await user.click(screen.getByRole('button', { name: /เคลียร์แล้ว/ }))

  expect(sendSpy.mock.calls.map((c) => (c[0] as Message).presetCode))
    .toStrictEqual(['need_help', 'low_stock', 'cleared'])
  // scope ต้องเป็น 'all' ทุกตัว ไม่งั้น "ซุ้มอื่น" ไม่มีวันเห็น
  expect(sendSpy.mock.calls.every((c) => (c[0] as Message).scope === 'all')).toBe(true)
})

// ─── B. ครึ่งรับ: HQ เห็น toast ────────────────────────────────────────────────

test('B1: HQ shows the alert the moment a snapshot arrives — no refresh, no click', () => {
  unlockHq()
  render(<DashboardScreen />)

  // ก่อน snapshot: ไม่มีอะไร (พิสูจน์ว่าตัว toast ไม่ได้โผล่มาเองจากการ render)
  expect(toast()).toBeNull()

  emit([alert()])

  expect(toast()).toBeInTheDocument()
  expect(toast()).toHaveTextContent(/ขอคนช่วย/)
  // ต้องบอกด้วยว่ามาจากซุ้มไหน ไม่งั้น HQ ไม่รู้จะส่งคนไปที่ไหน
  expect(toast()).toHaveTextContent(/โฟโต้บูธ/)
})

test('B2: a locked HQ shows no alert (the toast lives behind the PIN gate)', () => {
  render(<DashboardScreen />)
  emit([alert()])

  expect(screen.getByText(/ใส่ PIN/)).toBeInTheDocument()
  expect(toast()).toBeNull()
})

// ─── C. ครึ่งรับ: ซุ้มอื่นเห็น toast ───────────────────────────────────────────

test('C1: another booth’s Order Station shows the alert from a different booth', () => {
  render(<OrderStation booth="drinks" station="A" />)
  expect(toast()).toBeNull()

  emit([alert({ fromBooth: 'photo' })])

  expect(toast()).toHaveTextContent(/ขอคนช่วย/)
  expect(toast()).toHaveTextContent(/โฟโต้บูธ/)
})

test('C2: a message scoped to one booth does not leak to the others', () => {
  render(<OrderStation booth="drinks" station="A" />)

  emit([alert({ scope: 'photo' })])
  expect(toast()).toBeNull()

  // spine: **ตัวกรองยังมองเห็นอะไรอยู่** — ข้อความชิ้นเดิมที่ยิงตรงมาที่ซุ้มนี้ต้องขึ้น
  // ถ้าไม่มีคู่นี้ เทสต์ข้างบนจะเขียวต่อไปแม้ CommsToast จะไม่เคยแสดงอะไรเลย
  emit([alert({ scope: 'drinks' })])
  expect(toast()).toHaveTextContent(/ขอคนช่วย/)
})

test('C3: the device that pressed the button does not toast itself', () => {
  render(<OrderStation booth="drinks" station="A" />)

  emit([alert({ fromDeviceId: ME, fromBooth: 'drinks' })])

  expect(toast()).toBeNull()
})

test('C4: a newer alert takes the slot from an older un-acked one', () => {
  render(<OrderStation booth="drinks" station="A" />)

  emit([
    alert({ id: 'old', presetCode: 'low_stock', createdAt: NOW - 60_000 }),
    alert({ id: 'new', presetCode: 'need_help', createdAt: NOW }),
  ])

  // ถ้าเรียงผิดทาง alert ใหม่จะถูก alert เก่าที่ยังไม่ ack บังไว้ = ไม่ "เห็นภายในไม่กี่วิ"
  expect(toast()).toHaveTextContent(/ขอคนช่วย/)
  expect(toast()).not.toHaveTextContent(/ของใกล้หมด/)
})

// ─── D. ack ได้ ────────────────────────────────────────────────────────────────

test('D1: ✔ acks the message that is actually on screen, once', async () => {
  const user = userEvent.setup()
  render(<OrderStation booth="drinks" station="A" />)
  emit([alert({ id: 'msg-42' })])

  await user.click(screen.getByRole('button', { name: /รับทราบ/ }))

  expect(ackSpy.mock.calls).toStrictEqual([['msg-42', ME]])
})

test('D2: the toast clears when the ack echoes back — not on the click alone', async () => {
  const user = userEvent.setup()
  render(<OrderStation booth="drinks" station="A" />)
  emit([alert({ id: 'msg-42' })])

  await user.click(screen.getByRole('button', { name: /รับทราบ/ }))

  // ยังอยู่: UI ไม่ได้ซ่อนแบบ optimistic — มันรอ snapshot จริง
  // (สำคัญตอน offline: ถ้า write ยังไม่ลง toast ก็ยังต้องค้างอยู่ ไม่ใช่หายไปเฉยๆ)
  expect(toast()).toBeInTheDocument()

  // กับดักรอบ 0042: ต้องกระทำกับ **id เดิม** คร่อม snapshot ไม่ใช่ยิงข้อความคนละตัว
  emit([alert({ id: 'msg-42', ackBy: [ME] })])
  expect(toast()).toBeNull()
})

test('D3: another device’s ack does not silence my toast', () => {
  render(<OrderStation booth="drinks" station="A" />)

  emit([alert({ id: 'msg-42', ackBy: ['device-somebody-else'] })])

  expect(toast()).toHaveTextContent(/ขอคนช่วย/)
})

// ─── E. ปลายทางถึงกันจริง (ส่ง → รับ ด้วย payload ชิ้นเดียวกัน) ────────────────

test('E1: the payload the button sends is exactly the shape the receiver renders', async () => {
  const user = userEvent.setup()

  // เครื่องที่ 1 — ซุ้มโฟโต้บูธ กดปุ่ม
  device.id = 'device-photo-station'
  const sender = render(<OrderStation booth="photo" station="A" />)
  await user.click(screen.getByRole('button', { name: /ขอคนช่วย/ }))
  const sent = sendSpy.mock.calls[0][0] as Omit<Message, 'id'>
  sender.unmount()
  subs.length = 0

  // เครื่องที่ 2 — ซุ้มน้ำปั่น รับของชิ้นนั้น (Firestore เติม id ให้) โดยไม่มีใครแต่งกลางทาง
  device.id = ME
  render(<OrderStation booth="drinks" station="A" />)
  emit([{ id: 'from-firestore', ...sent }])

  expect(toast()).toHaveTextContent(/ขอคนช่วย/)
  expect(toast()).toHaveTextContent(/โฟโต้บูธ/)
})

// ─── GAP: ช่องว่างที่รู้ตัว — เทสต์พวกนี้ **ตั้งใจให้แดง**วันที่มีคนปิดช่องว่าง ────
// แดงเมื่อไหร่: ลบเทสต์ตัวนั้นทิ้ง แล้วมาอัปเดตบัญชีใน AUTOPILOT.md

test('GAP: the customer Display receives no alert at all (§4.2 :118 bar is unbuilt)', () => {
  // ครึ่งแรก — พฤติกรรมจริง: จอลูกค้า mount อยู่ แล้วยิง alert เข้าไป ไม่มีอะไรโผล่ทั้ง DOM
  const { container } = render(<DisplayScreen booth="drinks" />)
  emit([alert()])
  expect(toast()).toBeNull()
  expect(container.textContent).not.toMatch(/ขอคนช่วย/)

  // ครึ่งหลัง — สำมะโนจุด mount: เป็นทั้ง spine และตัวจับช่องว่าง
  // ถ้าใครถอด mount ออกจากสองจอที่เกณฑ์ครอบ → แดง
  // ถ้าใครเพิ่ม mount ให้ Display → แดง (ตั้งใจ: มาอัปเดตบัญชี)
  const screens = ['src/screens/OrderStation.tsx', 'src/screens/DashboardScreen.tsx', 'src/screens/DisplayScreen.tsx']
  expect(screens.filter((p) => /<CommsToast\b/.test(read(p))))
    .toStrictEqual(['src/screens/OrderStation.tsx', 'src/screens/DashboardScreen.tsx'])
})

test('GAP: no soft alert sound — §4.2 :116 asks for one distinct from the queue chime', () => {
  const probe = /AudioContext|createOscillator|new Audio\b|playChime/
  expect(probe.test(read('src/comms/CommsToast.tsx'))).toBe(false)

  // spine: probe ตัวเดียวกันนี้ **มองเห็น**เสียงเรียกคิวที่มีอยู่จริง
  // ไม่มีบรรทัดนี้ เทสต์ข้างบนจะเขียวตลอดกาลแม้ probe จะตาบอด
  expect(probe.test(read('src/display/chime.ts'))).toBe(true)
})

test('GAP: no time window — a three-day-old un-acked alert is still "current"', () => {
  const stale = alert({ id: 'ancient', createdAt: NOW - 3 * 24 * 3600 * 1000 })

  // §4.2 :116 เขียนว่า listener ควรมองข้อความ "ล่าสุด ~เวลาปัจจุบัน"
  // ของจริง: visibleMessages ไม่รู้จักเวลาเลย ไม่มีพารามิเตอร์ now ด้วยซ้ำ
  expect(visibleMessages([stale], 'drinks' as BoothId, ME)).toHaveLength(1)

  // spine: ตัวกรองที่มีอยู่ยังทำงาน (ไม่ใช่ฟังก์ชันที่คืนทุกอย่างเสมอ)
  expect(visibleMessages([{ ...stale, ackBy: [ME] }], 'drinks' as BoothId, ME)).toHaveLength(0)

  // และผลของมันบนจอจริง: alert ค้างวันวานยังเด้งอยู่
  render(<OrderStation booth="drinks" station="A" />)
  emit([stale])
  expect(toast()).toHaveTextContent(/ขอคนช่วย/)
})
