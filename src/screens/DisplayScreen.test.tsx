import { vi, test, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { act } from 'react'
import type { Order } from '../domain/types'

const { playChimeSpy } = vi.hoisted(() => ({ playChimeSpy: vi.fn() }))
vi.mock('../display/chime', () => ({ playChime: playChimeSpy }))

beforeEach(() => { playChimeSpy.mockClear() })

let emit: (orders: Order[]) => void = () => {}
vi.mock('../order/ordersRepo', () => ({
  subscribeBoothOrders: (_booth: string, cb: (o: Order[]) => void) => { emit = cb; return () => {} },
  // The donation thermometer in the corner reads event-wide totals, so the
  // screen subscribes to these too. This file is about the queue, so they are
  // stubbed to never emit — the thermometer's own behaviour is covered in
  // `src/donationThermometer.audit.test.tsx`.
  subscribeAllOrders: () => () => {},
  createOrder: vi.fn(),
  updateOrderStatus: vi.fn(),
}))
vi.mock('../expense/expensesRepo', () => ({
  subscribeAllExpenses: () => () => {},
  addExpense: vi.fn(),
}))
vi.mock('../domain/configRepo', () => ({
  subscribeGlobalConfig: () => () => {},
}))

import { DisplayScreen } from './DisplayScreen'

const o = (over: Partial<Order>): Order => ({
  id: 'x', boothId: 'drinks', queueNumber: 'A1', station: 'A', items: [], total: 30,
  paymentMethod: 'cash', paymentStatus: 'paid', status: 'waiting', createdAt: 1, ...over,
})

test('renders serving numbers big and up-next sorted by createdAt', () => {
  render(<DisplayScreen booth="drinks" />)
  act(() => emit([
    o({ id: 's1', queueNumber: 'A1', status: 'serving' }),
    o({ id: 'w1', queueNumber: 'A2', status: 'waiting', createdAt: 2 }),
    o({ id: 'w2', queueNumber: 'B1', status: 'waiting', createdAt: 1 }),
  ]))
  expect(screen.getAllByTestId('serving').map((e) => e.textContent)).toEqual(['A1'])
  // NOTE: the earliest waiting (B1) is now spotlighted separately as `next-up` (Task 5);
  // only the remaining up-next ones (A2) still carry the `upnext` testid.
  expect(screen.getAllByTestId('upnext').map((e) => e.textContent)).toEqual(['A2'])
  expect(screen.getByTestId('next-up')).toHaveTextContent('B1')
})

test('spotlights the first up-next number as the "get ready" next', () => {
  render(<DisplayScreen booth="drinks" />)
  act(() => emit([
    o({ id: 's', queueNumber: 'A1', status: 'serving' }),
    o({ id: 'w1', queueNumber: 'A2', status: 'waiting', createdAt: 2 }),
    o({ id: 'w2', queueNumber: 'B1', status: 'waiting', createdAt: 1 }),
  ]))
  // the very next (earliest waiting) is B1, shown in the get-ready spotlight
  expect(screen.getByTestId('next-up')).toHaveTextContent('B1')
  expect(screen.getByText(/เตรียมตัว/)).toBeInTheDocument()
})

test('does not chime for the first snapshot, but chimes when a new order starts serving after', () => {
  render(<DisplayScreen booth="drinks" />)
  act(() => emit([o({ id: 's1', queueNumber: 'A1', status: 'serving' })])) // first snapshot = baseline
  expect(playChimeSpy).not.toHaveBeenCalled()
  act(() => emit([
    o({ id: 's1', queueNumber: 'A1', status: 'serving' }),
    o({ id: 's2', queueNumber: 'A2', status: 'serving' }),
  ])) // A2 newly serving
  expect(playChimeSpy).toHaveBeenCalledTimes(1)
})

test('shows the no-queue placeholder when nothing is serving', () => {
  render(<DisplayScreen booth="drinks" />)
  expect(screen.getByText(/ยังไม่มีคิว/)).toBeInTheDocument()
})

test('the photo booth display says it is shooting, not serving', () => {
  render(<DisplayScreen booth="photo" />)
  expect(screen.getByText(/กำลังถ่าย/)).toBeInTheDocument()
  expect(screen.getByText(/Now Shooting/)).toBeInTheDocument()
  expect(screen.queryByText(/Now Serving/)).not.toBeInTheDocument()
})

test('booths without their own wording keep the generic now-serving heading', () => {
  render(<DisplayScreen booth="drinks" />)
  expect(screen.getByText(/Now Serving/)).toBeInTheDocument()
})
