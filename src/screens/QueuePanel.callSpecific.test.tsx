import { vi, beforeEach, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Order } from '../domain/types'

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
  id: 'x', boothId: 'drinks', queueNumber: 'A1', station: 'A', items: [], total: 30,
  paymentMethod: 'cash', paymentStatus: 'paid', status: 'waiting', createdAt: 1, ...over,
})

// คิวรอ 3 ใบ — สามใบคือจำนวนน้อยที่สุดที่แยก "ใบที่กด" ออกจากทั้ง "ใบแรก" และ
// "ใบสุดท้าย" ได้พร้อมกัน ถ้ามีแค่ 2 ใบแล้วกดใบที่สอง ทั้งสามความหมายจะให้ผลตรงกันหมด
const threeWaiting = () => [
  order({ id: 'o1', queueNumber: 'A1', status: 'waiting', createdAt: 1 }),
  order({ id: 'o2', queueNumber: 'A2', status: 'waiting', createdAt: 2 }),
  order({ id: 'o3', queueNumber: 'A3', status: 'waiting', createdAt: 3 }),
]

// patch ที่ callSpecific ต้องส่ง — เทียบแบบตรงตัว (toStrictEqual) ไม่ใช่ objectContaining
// เพราะ objectContaining จะมองข้าม field ส่วนเกินที่หลุดเข้ามา
const servePatch = { status: 'serving', servingAt: expect.any(Number), announcedAt: expect.any(Number) }

// ปุ่ม "เรียก" ของการ์ด waiting เท่านั้น — ผูกหัวท้ายไว้ไม่ให้ไปโดน
// "เรียกคิวถัดไป" (ปุ่ม callNext) หรือ "เรียกซ้ำ" (ปุ่มโซนพักไว้)
const callButtons = () => screen.getAllByRole('button', { name: /^เรียก$/ })

const renderWaiting = (orders: Order[] = threeWaiting()) => {
  const view = render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit(orders))
  return view
}

beforeEach(() => updateOrderStatus.mockClear())

test('กด "เรียก" บนการ์ดกลาง → เรียกเลขนั้นตัวเดียว (ไม่ใช่ใบแรก ไม่ใช่ใบสุดท้าย)', async () => {
  const user = userEvent.setup()
  renderWaiting()

  await user.click(callButtons()[1])

  expect(updateOrderStatus.mock.calls).toStrictEqual([['o2', servePatch]])
})

test('ทุกการ์ด waiting เรียกเลขของตัวเอง — ไม่ได้ผูกกับตำแหน่งใดตำแหน่งหนึ่งตายตัว', async () => {
  const user = userEvent.setup()

  for (const [index, expectedId] of [[0, 'o1'], [1, 'o2'], [2, 'o3']] as const) {
    updateOrderStatus.mockClear()
    const { unmount } = renderWaiting()

    await user.click(callButtons()[index])

    expect(updateOrderStatus.mock.calls).toStrictEqual([[expectedId, servePatch]])
    unmount()
  }
})

test('ข้ามลำดับได้: กดใบสุดท้ายก่อนแล้วค่อยกดใบแรก → เรียกตามลำดับที่กดจริง', async () => {
  const user = userEvent.setup()
  renderWaiting()

  await user.click(callButtons()[2])
  await user.click(callButtons()[0])

  expect(updateOrderStatus.mock.calls.map((call) => call[0])).toStrictEqual(['o3', 'o1'])
})

test('ปุ่ม "เรียก" ขึ้นเฉพาะ waiting — serving กับ skipped ไม่มีให้กด', () => {
  renderWaiting([
    order({ id: 'o1', queueNumber: 'A1', status: 'waiting', createdAt: 1 }),
    order({ id: 'o2', queueNumber: 'A2', status: 'serving', createdAt: 2 }),
    order({ id: 'o3', queueNumber: 'A3', status: 'skipped', createdAt: 3 }),
  ])

  expect(callButtons()).toHaveLength(1)
})

test('คิวรอของสถานีอื่นไม่ถูกเรียกจากแผงของสถานีนี้', async () => {
  const user = userEvent.setup()
  renderWaiting([
    order({ id: 'oA', queueNumber: 'A1', station: 'A', status: 'waiting', createdAt: 1 }),
    order({ id: 'oB', queueNumber: 'B1', station: 'B', status: 'waiting', createdAt: 2 }),
  ])

  expect(callButtons()).toHaveLength(1)
  await user.click(callButtons()[0])

  expect(updateOrderStatus.mock.calls).toStrictEqual([['oA', servePatch]])
})
