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
  createOrder: vi.fn(),
  updateOrderStatus: vi.fn(),
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
  expect(screen.getAllByTestId('upnext').map((e) => e.textContent)).toEqual(['B1', 'A2'])
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
