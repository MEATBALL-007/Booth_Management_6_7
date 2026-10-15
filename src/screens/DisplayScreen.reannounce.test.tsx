import { vi, test, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { act } from 'react'
import type { Order } from '../domain/types'

// --- Re-announce acceptance (Display wiring) ----------------------------
// spec: 2026-08-04-queue-pro-upgrade-design.md
//   "ประกาศซ้ำ: กดบน serving → Display เล่นเสียง+ไฟสำหรับเลขนั้นอีกครั้ง (announcedAt เด้ง)"
//
// The action half (`reannounce`) and the pure half (`newlyAnnounced`) are both
// already covered. What nothing covered is the seam between them: that
// DisplayScreen forwards a *changing* announcedAt for a number that was already
// serving. Every other screen-level test is a "new number entered serving" case,
// which only exercises the `was === undefined` branch — so pinning announcedAt to
// a constant in DisplayScreen.tsx would leave them all green.
//
// This lives in its own file (rather than appended to DisplayScreen.test.tsx) and
// reads the flash off the render container (rather than a data-testid) so it does
// not collide with the still-unmerged branch 2026-08-15_0020.

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

const item = (name: string) => ({ sku: name, name, qty: 1, unitPrice: 30, subtotal: 30 })

// the flash lives on the screen's root element as `animate-pulse`
const renderDisplay = () => {
  const { container } = render(<DisplayScreen booth="drinks" />)
  return () => (container.firstElementChild as HTMLElement).className.includes('animate-pulse')
}

test('pressing re-announce on an order that is already serving chimes and flashes again', () => {
  const flashing = renderDisplay()
  act(() => emit([o({ id: 's1', queueNumber: 'A1', status: 'serving', servingAt: 100, announcedAt: 100 })]))
  expect(playChimeSpy).not.toHaveBeenCalled() // first snapshot = baseline
  expect(flashing()).toBe(false)

  // reannounce(A1, 200) => { announcedAt: 200 }; the order never left serving
  act(() => emit([o({ id: 's1', queueNumber: 'A1', status: 'serving', servingAt: 100, announcedAt: 200 })]))
  expect(screen.getAllByTestId('serving').map((e) => e.textContent)).toEqual(['A1'])
  expect(playChimeSpy).toHaveBeenCalledTimes(1)
  expect(flashing()).toBe(true)
})

test('re-announcing one serving number does not announce the other serving numbers', () => {
  const flashing = renderDisplay()
  act(() => emit([
    o({ id: 's1', queueNumber: 'A1', status: 'serving', servingAt: 100, announcedAt: 100 }),
    o({ id: 's2', queueNumber: 'B1', status: 'serving', servingAt: 110, announcedAt: 110 }),
  ]))
  act(() => emit([
    o({ id: 's1', queueNumber: 'A1', status: 'serving', servingAt: 100, announcedAt: 100 }),
    o({ id: 's2', queueNumber: 'B1', status: 'serving', servingAt: 110, announcedAt: 200 }), // only B1 bumped
  ]))
  expect(playChimeSpy).toHaveBeenCalledTimes(1)
  expect(flashing()).toBe(true)
})

test('a snapshot that changes something other than announcedAt does not re-announce', () => {
  const flashing = renderDisplay()
  act(() => emit([
    o({ id: 's1', queueNumber: 'A1', status: 'serving', servingAt: 100, announcedAt: 100, items: [item('ชาเย็น')] }),
  ]))
  // same announcedAt, different items — e.g. staff edited the order after calling it
  act(() => emit([
    o({ id: 's1', queueNumber: 'A1', status: 'serving', servingAt: 100, announcedAt: 100, items: [item('โอเลี้ยง')] }),
  ]))
  expect(screen.getByText(/โอเลี้ยง/)).toBeInTheDocument() // the new snapshot really did land
  expect(playChimeSpy).not.toHaveBeenCalled()
  expect(flashing()).toBe(false)
})

test('the re-announce flash stops on its own so the screen is not left pulsing', () => {
  vi.useFakeTimers()
  try {
    const flashing = renderDisplay()
    act(() => emit([o({ id: 's1', queueNumber: 'A1', status: 'serving', servingAt: 100, announcedAt: 100 })]))
    act(() => emit([o({ id: 's1', queueNumber: 'A1', status: 'serving', servingAt: 100, announcedAt: 200 })]))
    expect(flashing()).toBe(true)
    act(() => { vi.advanceTimersByTime(2500) })
    expect(flashing()).toBe(false)
  } finally {
    vi.useRealTimers()
  }
})
