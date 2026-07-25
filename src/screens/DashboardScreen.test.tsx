import { vi, beforeEach, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { act } from 'react'
import userEvent from '@testing-library/user-event'
import type { Order } from '../domain/types'

let emitOrders: (o: Order[]) => void = () => {}
let emitExpenses: (e: unknown[]) => void = () => {}
const { addExpenseSpy } = vi.hoisted(() => ({ addExpenseSpy: vi.fn().mockResolvedValue('e1') }))
vi.mock('../order/ordersRepo', () => ({
  subscribeAllOrders: (cb: (o: Order[]) => void) => { emitOrders = cb; return () => {} },
}))
vi.mock('../expense/expensesRepo', () => ({
  subscribeAllExpenses: (cb: (e: unknown[]) => void) => { emitExpenses = cb; return () => {} },
  addExpense: addExpenseSpy,
}))

import { DashboardScreen } from './DashboardScreen'

const o = (over: Partial<Order>): Order => ({
  id: 'x', boothId: 'drinks', queueNumber: 'A1', station: 'A',
  items: [{ sku: 'a', name: 'A', qty: 1, unitPrice: 30, subtotal: 30 }],
  total: 30, paymentMethod: 'cash', paymentStatus: 'paid', status: 'done', createdAt: 1, ...over,
})

beforeEach(() => {
  localStorage.clear()
  addExpenseSpy.mockClear()
})

test('renders the PIN gate when locked', () => {
  render(<DashboardScreen />)
  expect(screen.getByText(/ใส่ PIN/)).toBeInTheDocument()
})

test('when unlocked, shows net donation computed from live orders and expenses', () => {
  localStorage.setItem('phantom.dashboardPin', 'unlocked')
  render(<DashboardScreen />)
  act(() => {
    emitOrders([o({ id: '1', total: 300, paymentMethod: 'cash' })])
    emitExpenses([{ id: 'e1', boothId: 'photo', description: 'ฟิล์ม', amount: 200, createdAt: 1 }])
  })
  expect(screen.getByTestId('net-donation')).toHaveTextContent('100')
  expect(screen.getByTestId('total-sales')).toHaveTextContent('300')
  expect(screen.getByTestId('expected-cash')).toHaveTextContent('300')
})

test('the expense form calls addExpense with the entered values', async () => {
  localStorage.setItem('phantom.dashboardPin', 'unlocked')
  const user = userEvent.setup()
  render(<DashboardScreen />)
  await user.type(screen.getByLabelText(/รายการ/), 'ยาคูลท์ 5 แพ็ค')
  await user.type(screen.getByLabelText(/จำนวนเงิน/), '250')
  await user.click(screen.getByRole('button', { name: /บันทึก/ }))
  expect(addExpenseSpy).toHaveBeenCalledWith(
    expect.objectContaining({ description: 'ยาคูลท์ 5 แพ็ค', amount: 250 }),
  )
})
