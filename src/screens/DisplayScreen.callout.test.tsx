// Wiring tests for the "เตรียมตัว" (get-ready) callout on the customer Display.
//
// Why a separate file: `DisplayScreen.tsx` / `DisplayScreen.test.tsx` are already
// edited on unmerged branches `_0020` and `_0031`; a new file collides with nobody.
//
// What is already covered elsewhere, and deliberately NOT repeated here:
//   - `upNextOrders` filters to waiting and sorts by createdAt  -> src/display/queueView.test.ts:14
//   - a `skipped` order vanishes from the customer screen and does not steal the
//     spotlight from a newer waiting order                      -> branch _0020, DisplayScreen.test.tsx
//
// The gap this file closes is the *wiring*: `const [next, ...rest] = upNext` in
// DisplayScreen.tsx decides which waiting order gets the callout and which ones fall
// through to the up-next pills. queueView.test.ts cannot see that destructure at all.
import { vi, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { act } from 'react'
import type { Order } from '../domain/types'

vi.mock('../display/chime', () => ({ playChime: vi.fn() }))

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

test('no waiting order at all -> the get-ready callout is absent entirely', () => {
  render(<DisplayScreen booth="drinks" />)
  act(() => emit([o({ id: 's1', queueNumber: 'A1', status: 'serving' })]))
  // serving is on screen, but nobody is being told to get ready
  expect(screen.getAllByTestId('serving').map((e) => e.textContent)).toEqual(['A1'])
  expect(screen.queryByTestId('next-up')).toBeNull()
  expect(screen.queryByText(/เตรียมตัว/)).toBeNull()
})

test('three waiting orders -> the callout takes the earliest, not the first or last in the array', () => {
  render(<DisplayScreen booth="drinks" />)
  // Array order is C1, A9, B4; createdAt order is A9(3) < B4(7) < C1(9).
  // The earliest is neither upNext[0] nor upNext[length-1] of the *unsorted* input,
  // so an off-by-one or a dropped sort cannot pass this by accident.
  act(() => emit([
    o({ id: 'w1', queueNumber: 'C1', createdAt: 9 }),
    o({ id: 'w2', queueNumber: 'A9', createdAt: 3 }),
    o({ id: 'w3', queueNumber: 'B4', createdAt: 7 }),
  ]))
  expect(screen.getByTestId('next-up')).toHaveTextContent('A9')
})

test('the spotlighted number is not repeated among the up-next pills', () => {
  render(<DisplayScreen booth="drinks" />)
  act(() => emit([
    o({ id: 'w1', queueNumber: 'C1', createdAt: 9 }),
    o({ id: 'w2', queueNumber: 'A9', createdAt: 3 }),
    o({ id: 'w3', queueNumber: 'B4', createdAt: 7 }),
  ]))
  // A9 is in the callout, so the pills must be exactly the remaining two in createdAt order.
  // toEqual on the full list catches both a duplicated A9 and a dropped/reordered pill.
  expect(screen.getAllByTestId('upnext').map((e) => e.textContent)).toEqual(['B4', 'C1'])
})

test('exactly one waiting order -> callout only, no up-next strip', () => {
  render(<DisplayScreen booth="drinks" />)
  act(() => emit([
    o({ id: 's1', queueNumber: 'A1', status: 'serving' }),
    o({ id: 'w1', queueNumber: 'A2', createdAt: 5 }),
  ]))
  expect(screen.getByTestId('next-up')).toHaveTextContent('A2')
  expect(screen.getByText(/เตรียมตัว/)).toBeInTheDocument()
  // the sole waiting order was consumed by the callout, so `rest` is empty
  expect(screen.queryAllByTestId('upnext')).toEqual([])
})

test('the callout follows the snapshot when the queue moves on', () => {
  render(<DisplayScreen booth="drinks" />)
  act(() => emit([
    o({ id: 'w1', queueNumber: 'A9', createdAt: 3 }),
    o({ id: 'w2', queueNumber: 'B4', createdAt: 7 }),
  ]))
  expect(screen.getByTestId('next-up')).toHaveTextContent('A9')

  // A9 gets called to the counter; B4 must inherit the callout, and the strip empties.
  act(() => emit([
    o({ id: 'w1', queueNumber: 'A9', status: 'serving', createdAt: 3 }),
    o({ id: 'w2', queueNumber: 'B4', createdAt: 7 }),
  ]))
  expect(screen.getByTestId('next-up')).toHaveTextContent('B4')
  expect(screen.getAllByTestId('serving').map((e) => e.textContent)).toEqual(['A9'])
  expect(screen.queryAllByTestId('upnext')).toEqual([])
})

test('a serving order never fills the callout', () => {
  render(<DisplayScreen booth="drinks" />)
  // Two serving and one waiting. The callout is a waiting-only concept, so even though
  // the serving orders are older they must not be spotlighted as "get ready".
  act(() => emit([
    o({ id: 's1', queueNumber: 'A1', status: 'serving', createdAt: 1 }),
    o({ id: 's2', queueNumber: 'A2', status: 'serving', createdAt: 2 }),
    o({ id: 'w1', queueNumber: 'A3', createdAt: 8 }),
  ]))
  expect(screen.getByTestId('next-up')).toHaveTextContent('A3')
  expect(screen.getAllByTestId('serving').map((e) => e.textContent)).toEqual(['A1', 'A2'])
})
