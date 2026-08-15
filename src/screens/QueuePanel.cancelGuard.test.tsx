// ช่องว่างที่ปิดในไฟล์นี้: "ยกเลิก" เป็น action เดียวที่ patch ถูกสร้างเป็น object literal
// จึงไม่มี guard สถานะเหมือน action อื่นที่ผ่าน Q.* — แผงยกเลิกที่เปิดค้างไว้จึงเขียนทับ
// order ที่เครื่องอื่นปิดไปแล้วได้ (ยอดขายหาย) ดูช่อง Idempotency ข้อ ง. ใน AUTOPILOT.md
//
// ยืนยันด้วย toStrictEqual บน mock.calls เสมอ ไม่ใช้ objectContaining/toHaveBeenCalledWith
// เพราะทั้งคู่มองข้ามทั้ง field ส่วนเกินและจำนวนครั้งที่เรียก
import { vi, beforeEach, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Order, OrderStatus } from '../domain/types'

const { updateOrderStatus } = vi.hoisted(() => ({
  updateOrderStatus: vi.fn().mockResolvedValue(undefined),
}))
let emit: (orders: Order[]) => void = () => {}
vi.mock('../order/ordersRepo', () => ({
  subscribeBoothOrders: (_booth: string, cb: (o: Order[]) => void) => { emit = cb; return () => {} },
  updateOrderStatus,
  createOrder: vi.fn(),
}))

import { QueuePanel } from './QueuePanel'
import { act } from 'react'

const order = (over: Partial<Order>): Order => ({
  id: 'o1', boothId: 'drinks', queueNumber: 'A1', station: 'A', items: [], total: 30,
  paymentMethod: 'cash', paymentStatus: 'paid', status: 'waiting', createdAt: 1, ...over,
})

const REASON = 'ลูกค้าเปลี่ยนใจ'

beforeEach(() => updateOrderStatus.mockClear())

/**
 * เครื่อง A เปิดแผงยกเลิกค้างไว้ แล้วเครื่อง B เปลี่ยนสถานะใบเดียวกันไปก่อน
 * คืนค่าหน้าจอของเครื่อง A ที่กด "ยืนยันยกเลิก" ไปแล้ว
 */
async function cancelAfterRemoteChange(landsAs: OrderStatus) {
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([order({ status: 'serving' })]))

  // เครื่อง A: เปิดแผงยกเลิกจากการ์ด serving แล้วพิมพ์เหตุผล (ยังไม่กดยืนยัน)
  await user.click(screen.getByRole('button', { name: 'ยกเลิก/แก้ไข' }))
  await user.type(screen.getByLabelText(/เหตุผล/), REASON)

  // เครื่อง B: เปลี่ยนสถานะใบเดียวกัน แล้ว snapshot ใหม่เข้ามาที่เครื่อง A
  act(() => emit([order({ status: landsAs })]))

  await user.click(screen.getByRole('button', { name: /ยืนยันยกเลิก/ }))
  return user
}

test('ยืนยันยกเลิกหลังอีกเครื่องกด "เสร็จ" → ไม่เขียนทับ order ที่ done', async () => {
  await cancelAfterRemoteChange('done')

  expect(updateOrderStatus.mock.calls).toStrictEqual([])
  expect(screen.queryByRole('button', { name: /ย้อนกลับ/ })).toBeNull()
})

test('ยืนยันยกเลิกซ้ำบน order ที่ cancelled แล้ว → ไม่ทับเหตุผลเดิม', async () => {
  await cancelAfterRemoteChange('cancelled')

  expect(updateOrderStatus.mock.calls).toStrictEqual([])
  expect(screen.queryByRole('button', { name: /ย้อนกลับ/ })).toBeNull()
})

test('ยกเลิกที่ถูกบล็อก ต้องปิดแผงและล้างเหตุผล ไม่ค้างไว้ให้กดซ้ำ', async () => {
  const user = await cancelAfterRemoteChange('done')

  // แผงปิดไปแล้ว: ไม่มีทั้งช่องเหตุผลและปุ่มยืนยัน
  expect(screen.queryByLabelText(/เหตุผล/)).toBeNull()
  expect(screen.queryByRole('button', { name: /ยืนยันยกเลิก/ })).toBeNull()

  // และถ้าใบใหม่เข้ามา แล้วเปิดแผงอีกครั้ง เหตุผลเดิมต้องไม่ค้างอยู่
  act(() => emit([order({ id: 'o2', queueNumber: 'A2', status: 'waiting' })]))
  await user.click(screen.getByRole('button', { name: 'ยกเลิก/แก้ไข' }))
  expect(screen.getByLabelText(/เหตุผล/)).toHaveValue('')
})

test('order ที่ยังอยู่ในคิว ยังยกเลิกได้ตามปกติ — waiting', async () => {
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([order({ status: 'waiting' })]))

  await user.click(screen.getByRole('button', { name: 'ยกเลิก/แก้ไข' }))
  await user.type(screen.getByLabelText(/เหตุผล/), REASON)
  await user.click(screen.getByRole('button', { name: /ยืนยันยกเลิก/ }))

  expect(updateOrderStatus.mock.calls).toStrictEqual([['o1', { status: 'cancelled', cancelReason: REASON }]])
})

test('order ที่ยังอยู่ในคิว ยังยกเลิกได้ตามปกติ — serving', async () => {
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit([order({ status: 'serving' })]))

  await user.click(screen.getByRole('button', { name: 'ยกเลิก/แก้ไข' }))
  await user.type(screen.getByLabelText(/เหตุผล/), REASON)
  await user.click(screen.getByRole('button', { name: /ยืนยันยกเลิก/ }))

  expect(updateOrderStatus.mock.calls).toStrictEqual([['o1', { status: 'cancelled', cancelReason: REASON }]])
})

test('order ที่ถูกพักไว้ (skipped) ยังยกเลิกได้ — ไม่ใช่สถานะปิดงาน', async () => {
  // การ์ดโซนพักไว้ไม่มีปุ่มยกเลิกของตัวเอง แต่แผงที่เปิดค้างจาก serving ต้องยังยืนยันได้
  await cancelAfterRemoteChange('skipped')

  expect(updateOrderStatus.mock.calls).toStrictEqual([['o1', { status: 'cancelled', cancelReason: REASON }]])
})
