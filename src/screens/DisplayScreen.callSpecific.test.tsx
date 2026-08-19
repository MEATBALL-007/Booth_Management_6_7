// Criterion: เรียกเจาะจง — the customer-facing half.
//
// QueuePanel proves the write; this file proves what the customer actually sees when a number is
// called out of order: that number takes over the serving spot, the ones it jumped over stay in
// line, and the display announces it (chime + flash). The announce path here is the
// `was === undefined` branch of newlyAnnounced — a number that appears in the serving set without
// having been there before, which is exactly what callSpecific produces.
import { vi, test, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { act } from 'react'
import type { Order } from '../domain/types'

const { playChimeSpy } = vi.hoisted(() => ({ playChimeSpy: vi.fn() }))
vi.mock('../display/chime', () => ({ playChime: playChimeSpy }))

let emit: (orders: Order[]) => void = () => {}
vi.mock('../order/ordersRepo', () => ({
  subscribeBoothOrders: (_booth: string, cb: (o: Order[]) => void) => { emit = cb; return () => {} },
  createOrder: vi.fn(),
  updateOrderStatus: vi.fn(),
}))

import { DisplayScreen } from './DisplayScreen'

beforeEach(() => playChimeSpy.mockClear())

const o = (over: Partial<Order>): Order => ({
  id: 'x', boothId: 'drinks', queueNumber: 'A1', station: 'A', items: [], total: 30,
  paymentMethod: 'cash', paymentStatus: 'paid', status: 'waiting', createdAt: 1, ...over,
})

// the queue before anyone is called: A1, A2, A3 waiting in that order
const allWaiting = () => [
  o({ id: 'o1', queueNumber: 'A1', status: 'waiting', createdAt: 1 }),
  o({ id: 'o2', queueNumber: 'A2', status: 'waiting', createdAt: 2 }),
  o({ id: 'o3', queueNumber: 'A3', status: 'waiting', createdAt: 3 }),
]

// A3 called out of order; A1 and A2 untouched, exactly what callSpecific leaves behind
const thirdCalled = () => [
  o({ id: 'o1', queueNumber: 'A1', status: 'waiting', createdAt: 1 }),
  o({ id: 'o2', queueNumber: 'A2', status: 'waiting', createdAt: 2 }),
  o({ id: 'o3', queueNumber: 'A3', status: 'serving', createdAt: 3, servingAt: 500, announcedAt: 500 }),
]

const servingNumbers = () => screen.getAllByTestId('serving').map((e) => e.textContent)

test('a number called out of order takes the serving spot on the display', () => {
  render(<DisplayScreen booth="drinks" />)
  act(() => emit(allWaiting()))
  expect(screen.queryAllByTestId('serving')).toHaveLength(0)

  act(() => emit(thirdCalled()))
  expect(servingNumbers()).toEqual(['A3'])
})

test('the numbers it jumped over stay in line, not on the serving spot', () => {
  render(<DisplayScreen booth="drinks" />)
  act(() => emit(allWaiting()))
  act(() => emit(thirdCalled()))

  // A1 is still the one told to get ready, A2 still queued behind it
  expect(servingNumbers()).toEqual(['A3'])
  expect(screen.getByTestId('next-up')).toHaveTextContent('A1')
  expect(screen.getAllByTestId('upnext').map((e) => e.textContent)).toEqual(['A2'])
})

test('calling out of order announces it: chime plus a full-screen flash', () => {
  const { container } = render(<DisplayScreen booth="drinks" />)
  act(() => emit(allWaiting())) // baseline snapshot: nothing serving, nothing announced
  expect(playChimeSpy).not.toHaveBeenCalled()
  expect(container.firstChild).not.toHaveClass('bg-phantom-orange/30')

  act(() => emit(thirdCalled()))

  expect(playChimeSpy).toHaveBeenCalledTimes(1)
  expect(container.firstChild).toHaveClass('bg-phantom-orange/30')
})

test('calling a second number out of order announces that one too', () => {
  render(<DisplayScreen booth="drinks" />)
  act(() => emit(allWaiting()))
  act(() => emit(thirdCalled()))
  expect(playChimeSpy).toHaveBeenCalledTimes(1)

  // now A2 is called as well, while A3 is still being served
  act(() => emit([
    o({ id: 'o1', queueNumber: 'A1', status: 'waiting', createdAt: 1 }),
    o({ id: 'o2', queueNumber: 'A2', status: 'serving', createdAt: 2, servingAt: 900, announcedAt: 900 }),
    o({ id: 'o3', queueNumber: 'A3', status: 'serving', createdAt: 3, servingAt: 500, announcedAt: 500 }),
  ]))

  expect(playChimeSpy).toHaveBeenCalledTimes(2)
  expect(servingNumbers()).toEqual(['A2', 'A3'])
})

test('finishing the out-of-order order changes the serving set but announces nothing', () => {
  render(<DisplayScreen booth="drinks" />)
  act(() => emit(allWaiting()))
  act(() => emit(thirdCalled()))
  playChimeSpy.mockClear()

  // A3 done and gone from the serving set. The set really does change here, so the alert effect
  // re-runs — without that this assertion would pass vacuously (the hook keys off serving only).
  act(() => emit([
    o({ id: 'o1', queueNumber: 'A1', status: 'waiting', createdAt: 1 }),
    o({ id: 'o2', queueNumber: 'A2', status: 'waiting', createdAt: 2 }),
    o({ id: 'o3', queueNumber: 'A3', status: 'done', createdAt: 3, doneAt: 900 }),
  ]))

  expect(playChimeSpy).not.toHaveBeenCalled()
  expect(screen.queryAllByTestId('serving')).toHaveLength(0)
})
