import { vi, beforeEach, test, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,FAKE') } }))

const { createOrder } = vi.hoisted(() => ({
  createOrder: vi.fn().mockResolvedValue('order-1'),
}))
vi.mock('../order/ordersRepo', () => ({
  createOrder,
  subscribeBoothOrders: () => () => {},
  updateOrderStatus: vi.fn(),
}))
vi.mock('./QueuePanel', () => ({ QueuePanel: () => null }))
vi.mock('../comms/commsRepo', () => ({
  sendMessage: vi.fn().mockResolvedValue('m1'),
  subscribeMessages: () => () => {},
  ackMessage: vi.fn(),
  upsertPresence: vi.fn().mockResolvedValue(undefined),
  subscribePresence: () => () => {},
}))

import { OrderStation } from './OrderStation'

beforeEach(() => {
  localStorage.clear()
  createOrder.mockClear()
})

test('adding a drink with a topping opens the picker and prices the option in', async () => {
  const user = userEvent.setup()
  render(<OrderStation booth="drinks" station="A" />)

  await user.click(screen.getByRole('button', { name: /สตรอเบอร์รี่โยเกิร์ตปั่น/ })) // 35, has options
  // picker appears
  await user.click(screen.getByRole('button', { name: /ไข่มุกป็อป/ }))               // +10
  await user.click(screen.getByRole('button', { name: /เพิ่มลงตะกร้า/ }))
  expect(screen.getByTestId('cart-total')).toHaveTextContent('45')

  await user.click(screen.getByRole('button', { name: /เงินสด/ }))
  await user.click(screen.getByRole('button', { name: /รับเงินแล้ว/ }))
  await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1))
  const persisted = createOrder.mock.calls[0][0]
  expect(persisted.total).toBe(45)
  expect(persisted.items[0].options).toEqual([{ label: 'ไข่มุกป็อป', priceDelta: 10 }])
  expect(persisted.paymentMethod).toBe('cash')
  expect(persisted.paymentStatus).toBe('paid')
  expect(persisted.status).toBe('waiting')
  expect(persisted.queueNumber).toBe('A1')
  expect(screen.getByTestId('issued-queue')).toHaveTextContent('A1')
})

test('a default drink (no option changes) adds at base price with no recorded options', async () => {
  const user = userEvent.setup()
  render(<OrderStation booth="drinks" station="A" />)
  await user.click(screen.getByRole('button', { name: /สตรอเบอร์รี่นมสดปั่น/ })) // 25
  await user.click(screen.getByRole('button', { name: /เพิ่มลงตะกร้า/ }))
  expect(screen.getByTestId('cart-total')).toHaveTextContent('25')
})

test('QR order: choosing QR shows a QR image, then confirm persists a qr order', async () => {
  const user = userEvent.setup()
  render(<OrderStation booth="photo" station="B" />)

  await user.click(screen.getByRole('button', { name: /ถ่าย 3 ช็อต/ })) // 35
  await user.click(screen.getByRole('button', { name: /คิวอาร์/ }))
  expect(await screen.findByAltText('PromptPay QR')).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /ยืนยันชำระ/ }))
  await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1))
  expect(createOrder.mock.calls[0][0].paymentMethod).toBe('qr')
  expect(createOrder.mock.calls[0][0].queueNumber).toBe('B1')
})

test('shows an error alert if saving the order is rejected', async () => {
  const user = userEvent.setup()
  createOrder.mockRejectedValueOnce(new Error('nope'))
  render(<OrderStation booth="drinks" station="A" />)
  await user.click(screen.getByRole('button', { name: /สตรอเบอร์รี่โยเกิร์ตปั่น/ }))
  await user.click(screen.getByRole('button', { name: /เพิ่มลงตะกร้า/ }))
  await user.click(screen.getByRole('button', { name: /เงินสด/ }))
  await user.click(screen.getByRole('button', { name: /รับเงินแล้ว/ }))
  expect(await screen.findByRole('alert')).toHaveTextContent('A1')
})

test('order station shows the inter-booth alert buttons', () => {
  render(<OrderStation booth="drinks" station="A" />)
  expect(screen.getByRole('button', { name: /ขอคนช่วย/ })).toBeInTheDocument()
})
