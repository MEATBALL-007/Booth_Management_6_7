import { vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

vi.mock('./order/ordersRepo', () => ({
  createOrder: vi.fn().mockResolvedValue('id'),
  subscribeBoothOrders: () => () => {},
  subscribeAllOrders: () => () => {},
  updateOrderStatus: vi.fn(),
}))

vi.mock('./expense/expensesRepo', () => ({
  subscribeAllExpenses: () => () => {},
  addExpense: vi.fn(),
}))

beforeEach(() => localStorage.clear())

test('shows Setup when no device config', () => {
  render(<App />)
  expect(screen.getByText(/ตั้งค่าเครื่อง/)).toBeInTheDocument()
})

test('display mode renders the Display screen; back-to-setup asks to confirm first', async () => {
  const user = userEvent.setup()
  render(<App />)
  await user.click(screen.getByRole('button', { name: /น้ำปั่น/ }))
  await user.click(screen.getByRole('button', { name: /จอโชว์คิว/ }))
  await user.click(screen.getByRole('button', { name: /ยืนยัน/ }))

  // Display screen shows the Now Serving heading
  expect(screen.getByText(/กำลังทำ/)).toBeInTheDocument()

  // Back button opens a confirm; cancelling keeps us in Display mode
  await user.click(screen.getByRole('button', { name: /ตั้งค่า/ }))
  await user.click(screen.getByRole('button', { name: /ยกเลิก/ }))
  expect(screen.getByText(/กำลังทำ/)).toBeInTheDocument()

  // Confirming actually returns to Setup
  await user.click(screen.getByRole('button', { name: /ตั้งค่า/ }))
  await user.click(screen.getByRole('button', { name: /ยืนยัน/ }))
  expect(screen.getByText(/ตั้งค่าเครื่อง/)).toBeInTheDocument()
})

test('order mode renders the Order Station with the booth catalog', async () => {
  const user = userEvent.setup()
  render(<App />)
  await user.click(screen.getByRole('button', { name: /น้ำปั่น/ }))
  await user.click(screen.getByRole('button', { name: /รับออเดอร์/ }))
  await user.click(screen.getByRole('button', { name: /^A$/ }))
  await user.click(screen.getByRole('button', { name: /ยืนยัน/ }))

  // OrderStation shows the drinks catalog
  expect(screen.getByRole('button', { name: /สตรอเบอร์รี่โยเกิร์ตปั่น/ })).toBeInTheDocument()
})

test('dashboard mode shows the PIN gate', async () => {
  const user = userEvent.setup()
  render(<App />)
  await user.click(screen.getByRole('button', { name: /โฟโต้บูธ/ }))
  await user.click(screen.getByRole('button', { name: /แดชบอร์ด/ }))
  await user.click(screen.getByRole('button', { name: /ยืนยัน/ }))
  expect(screen.getByText(/ใส่ PIN/)).toBeInTheDocument()
})
