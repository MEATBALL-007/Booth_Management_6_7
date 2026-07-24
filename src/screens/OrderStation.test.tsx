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

import { OrderStation } from './OrderStation'

beforeEach(() => {
  localStorage.clear()
  createOrder.mockClear()
})

test('cash order: add product, pay cash, issues queue number and persists a paid waiting order', async () => {
  const user = userEvent.setup()
  render(<OrderStation booth="drinks" station="A" />)

  // add one Yakult-Pipo (30)
  await user.click(screen.getByRole('button', { name: /ยาคูลท์ปีโป้ปั่น/ }))
  expect(screen.getByTestId('cart-total')).toHaveTextContent('30')

  await user.click(screen.getByRole('button', { name: /เงินสด/ }))
  await user.click(screen.getByRole('button', { name: /รับเงินแล้ว/ }))

  await waitFor(() => expect(createOrder).toHaveBeenCalledTimes(1))
  const persisted = createOrder.mock.calls[0][0]
  expect(persisted.total).toBe(30)
  expect(persisted.paymentMethod).toBe('cash')
  expect(persisted.paymentStatus).toBe('paid')
  expect(persisted.status).toBe('waiting')
  expect(persisted.queueNumber).toBe('A1')

  // queue number shown to staff/customer
  expect(screen.getByTestId('issued-queue')).toHaveTextContent('A1')
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
  await user.click(screen.getByRole('button', { name: /ยาคูลท์ปีโป้ปั่น/ }))
  await user.click(screen.getByRole('button', { name: /เงินสด/ }))
  await user.click(screen.getByRole('button', { name: /รับเงินแล้ว/ }))
  expect(await screen.findByRole('alert')).toHaveTextContent('A1')
})
