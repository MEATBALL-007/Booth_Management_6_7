import { vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

vi.mock('./order/ordersRepo', () => ({
  createOrder: vi.fn().mockResolvedValue('id'),
  subscribeBoothOrders: () => () => {},
  updateOrderStatus: vi.fn(),
}))

beforeEach(() => localStorage.clear())

test('shows Setup when no device config', () => {
  render(<App />)
  expect(screen.getByText(/ตั้งค่าเครื่อง/)).toBeInTheDocument()
})

test('after setup, shows the chosen mode placeholder and can reset', async () => {
  const user = userEvent.setup()
  render(<App />)

  await user.click(screen.getByRole('button', { name: /น้ำปั่น/ }))
  await user.click(screen.getByRole('button', { name: /จอโชว์คิว/ }))
  await user.click(screen.getByRole('button', { name: /ยืนยัน/ }))

  expect(screen.getByText(/โหมด: display/)).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /เปลี่ยนค่า/ }))
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
  expect(screen.getByRole('button', { name: /ยาคูลท์ปีโป้ปั่น/ })).toBeInTheDocument()
})
