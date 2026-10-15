import { vi, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { act } from 'react'
import type { BoothId, Order } from '../domain/types'

// ไฟล์ใหม่ล้วน: `DisplayScreen.tsx` และ `DisplayScreen.test.tsx` ถูก branch _0020/_0031 แก้ค้างไว้
// เทสต์ชุดนี้จึงอ่านผ่าน role/ข้อความ + testid ที่มีอยู่บน main อยู่แล้ว ไม่เพิ่ม data-testid ลง component

vi.mock('../display/chime', () => ({ playChime: vi.fn() }))

let emit: (orders: Order[]) => void = () => {}
vi.mock('../order/ordersRepo', () => ({
  subscribeBoothOrders: (_booth: string, cb: (o: Order[]) => void) => { emit = cb; return () => {} },
  createOrder: vi.fn(),
  updateOrderStatus: vi.fn(),
}))

import { DisplayScreen } from './DisplayScreen'

const o = (over: Partial<Order>): Order => ({
  id: 'x', boothId: 'drinks', queueNumber: 'A1', station: 'A', items: [], total: 30,
  paymentMethod: 'cash', paymentStatus: 'paid', status: 'waiting', createdAt: 1, ...over,
})

/** จอที่มีทั้งคิวกำลังทำ, คิวเตรียมตัว และแถวรอ — สถานะที่ label ทุกตัวถูก render พร้อมกัน */
function renderBusyDisplay(booth: BoothId = 'drinks') {
  const view = render(<DisplayScreen booth={booth} />)
  act(() => emit([
    o({ id: 's1', queueNumber: 'A1', status: 'serving' }),
    o({ id: 'w1', queueNumber: 'A2', status: 'waiting', createdAt: 2 }),
    o({ id: 'w2', queueNumber: 'B1', status: 'waiting', createdAt: 3 }),
  ]))
  return view
}

/** ไทยต้องมาก่อนอังกฤษในสายข้อความเดียวกัน = "ไทยเด่น อังกฤษรอง" ในเชิงลำดับการอ่าน */
function expectThaiLeadsEnglish(text: string, th: string, en: string) {
  expect(text).toContain(th)
  expect(text).toContain(en)
  expect(text.indexOf(th)).toBeLessThan(text.indexOf(en))
}

test('every bilingual label on a busy Display shows Thai, and shows it before English', () => {
  const { container } = renderBusyDisplay()
  const text = container.textContent ?? ''
  expectThaiLeadsEnglish(text, 'น้ำปั่น', 'Blended drinks')   // ชื่อซุ้มบนหัวจอ
  expectThaiLeadsEnglish(text, 'กำลังทำ', 'Now Serving')      // display.nowServing
  expectThaiLeadsEnglish(text, 'เตรียมตัว', 'Get ready')       // display.getReady
  expectThaiLeadsEnglish(text, 'คิวถัดไป', 'Up Next')          // display.upNext
})

test('the empty state speaks Thai too — ยังไม่มีคิว มาก่อน No orders yet', () => {
  const { container } = render(<DisplayScreen booth="drinks" />)
  act(() => emit([]))
  expectThaiLeadsEnglish(container.textContent ?? '', 'ยังไม่มีคิว', 'No orders yet')
})

test('the booth name on the header is in Thai for all three booths', () => {
  const expected: Record<BoothId, string> = {
    photo: 'โฟโต้บูธ',
    portrait: 'วาดภาพเสมือน',
    drinks: 'น้ำปั่น',
  }
  for (const booth of Object.keys(expected) as BoothId[]) {
    const { container, unmount } = render(<DisplayScreen booth={booth} />)
    expect(container.textContent ?? '').toContain(expected[booth])
    unmount()
  }
})

test('icons stand in for the words — 🔔 on "กำลังทำ" and 👉 on "เตรียมตัว"', () => {
  renderBusyDisplay()
  const headings = screen.getAllByRole('heading').map((h) => h.textContent ?? '')
  const serving = headings.find((t) => t.includes('กำลังทำ'))
  const getReady = headings.find((t) => t.includes('เตรียมตัว'))
  expect(serving).toContain('🔔')
  expect(getReady).toContain('👉')
})

test('the numbers themselves are language-free — nothing to read, only digits', () => {
  renderBusyDisplay()
  expect(screen.getAllByTestId('serving').map((e) => e.textContent)).toStrictEqual(['A1'])
  expect(screen.getByTestId('next-up').textContent).toMatch(/^[A-Z]?\d+$/)
  for (const chip of screen.getAllByTestId('upnext')) {
    expect(chip.textContent).toMatch(/^[A-Z]?\d+$/)
  }
})

// ⚠️ ช่องว่างที่รู้ตัว (บันทึกไว้ ไม่ได้ pin ด้วยเทสต์ เพราะเทสต์ที่ยืนยันพฤติกรรมที่ผิดจะขวางตอนแก้):
// ป้ายสถานะมุมบนของจอ render แค่ `L('display.live').en` = "LIVE" ทั้งที่ตาราง label มี th = "สด" อยู่แล้ว
// (`DisplayScreen.tsx` บรรทัด 40) — เป็นข้อความเดียวบนจอลูกค้าที่เป็นอังกฤษล้วน
// รายละเอียดและเหตุผลที่ไม่แก้ในรอบนี้อยู่ใน AUTOPILOT.md ช่อง "Display glanceable"
