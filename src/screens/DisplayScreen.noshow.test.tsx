// Acceptance criterion "No-show" — the customer-display half.
//   ข้าม serving -> skipped (หายจากจอลูกค้า); เรียกซ้ำ -> serving + Display ประกาศ (chime+flash)
// The QueuePanel half (โซนพักไว้) lives in QueuePanel.noshow.test.tsx.
import { vi, test, expect, beforeEach, afterEach } from 'vitest'
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

beforeEach(() => { vi.useFakeTimers(); playChimeSpy.mockClear() })
afterEach(() => vi.useRealTimers())

const o = (over: Partial<Order>): Order => ({
  id: 'x', boothId: 'drinks', queueNumber: 'A1', station: 'A', items: [], total: 30,
  paymentMethod: 'cash', paymentStatus: 'paid', status: 'waiting', createdAt: 1, ...over,
})

// The whole screen is one root <div>; the flash class lives on it and nowhere else.
const rootOf = (container: HTMLElement) => container.firstElementChild as HTMLElement

// Distinct, non-overlapping queue numbers so substring checks on textContent cannot
// accidentally match (e.g. 'A1' is a substring of 'A10').
const SKIPPED = 'A7'
const OTHER_SERVING = 'B2'
const OTHER_WAITING = 'C3'

test('a skipped order never reaches the customer display', () => {
  const { container } = render(<DisplayScreen booth="drinks" />)
  act(() => emit([
    o({ id: 'sk', queueNumber: SKIPPED, status: 'skipped' }),
    o({ id: 'sv', queueNumber: OTHER_SERVING, status: 'serving' }),
    o({ id: 'wt', queueNumber: OTHER_WAITING, status: 'waiting', createdAt: 2 }),
  ]))

  // the skipped number is absent from the entire screen — not merely absent from
  // the `serving` slot. A customer must not see it anywhere.
  expect(container.textContent).not.toContain(SKIPPED)
  // ...while the orders that should be visible still are (guards against a
  // vacuous pass where nothing rendered at all).
  expect(screen.getAllByTestId('serving').map((e) => e.textContent)).toEqual([OTHER_SERVING])
  expect(screen.getByTestId('next-up')).toHaveTextContent(OTHER_WAITING)
})

test('skipping the number that is currently serving clears it off the display', () => {
  const { container } = render(<DisplayScreen booth="drinks" />)
  act(() => emit([o({ id: 'sk', queueNumber: SKIPPED, status: 'serving' })]))
  expect(screen.getAllByTestId('serving').map((e) => e.textContent)).toEqual([SKIPPED])

  act(() => emit([o({ id: 'sk', queueNumber: SKIPPED, status: 'skipped' })]))
  expect(container.textContent).not.toContain(SKIPPED)
  expect(screen.queryAllByTestId('serving')).toHaveLength(0)
  expect(screen.getByText(/ยังไม่มีคิว/)).toBeInTheDocument()
})

test('recalling a skipped order puts it back on the display and announces it (chime + flash)', () => {
  const { container } = render(<DisplayScreen booth="drinks" />)
  // baseline snapshot: parked, so the display shows nothing and stays silent
  act(() => emit([o({ id: 'sk', queueNumber: SKIPPED, status: 'skipped', announcedAt: 100 })]))
  expect(playChimeSpy).not.toHaveBeenCalled()
  expect(rootOf(container).className).not.toContain('animate-pulse')

  // Q.recall() writes { status: 'serving', servingAt: now, announcedAt: now } —
  // the announcedAt bump is what the display listens for.
  act(() => emit([
    o({ id: 'sk', queueNumber: SKIPPED, status: 'serving', servingAt: 500, announcedAt: 500 }),
  ]))

  expect(screen.getAllByTestId('serving').map((e) => e.textContent)).toEqual([SKIPPED])
  expect(playChimeSpy).toHaveBeenCalledTimes(1)
  expect(rootOf(container).className).toContain('animate-pulse')
})

test('the flash is transient: it clears once the announce window closes', () => {
  const { container } = render(<DisplayScreen booth="drinks" />)
  act(() => emit([o({ id: 'sk', queueNumber: SKIPPED, status: 'skipped' })]))
  act(() => emit([o({ id: 'sk', queueNumber: SKIPPED, status: 'serving', servingAt: 500, announcedAt: 500 })]))
  expect(rootOf(container).className).toContain('animate-pulse')

  act(() => vi.advanceTimersByTime(2500))
  expect(rootOf(container).className).not.toContain('animate-pulse')
  // the recalled number is still being served — only the announcement ended
  expect(screen.getAllByTestId('serving').map((e) => e.textContent)).toEqual([SKIPPED])
})

test('the flash assertion is scoped to the root, not to any pulsing element on screen', () => {
  // The header live-dot pulses permanently. If the tests above queried the whole
  // document for `.animate-pulse` they would pass even with the flash wiring gone,
  // so this pins that `rootOf()` is really the discriminating element.
  const { container } = render(<DisplayScreen booth="drinks" />)
  act(() => emit([o({ id: 'sv', queueNumber: OTHER_SERVING, status: 'serving' })]))
  expect(rootOf(container).className).not.toContain('animate-pulse')
  expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
})
