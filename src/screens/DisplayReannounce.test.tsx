// Re-announce criterion (2026-08-04-queue-pro-upgrade-design.md), Display half:
//   "ประกาศซ้ำ: กดบน serving → Display เล่นเสียง+ไฟสำหรับเลขนั้นอีกครั้ง (announcedAt เด้ง)"
//
// The panel half lives in QueuePanelReannounce.test.tsx. Kept in its own file so it does not
// collide with DisplayScreen.test.tsx on other branches.
//
// The existing suite proved `Q.reannounce` returns { announcedAt } and that a *new* number
// starting to serve chimes. Neither proves the clause this criterion is actually about: an
// order that was ALREADY serving, and stays serving, must announce again when announcedAt
// bumps — and must stay silent when it does not.
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

beforeEach(() => { playChimeSpy.mockClear() })
afterEach(() => { vi.useRealTimers() })

const o = (over: Partial<Order>): Order => ({
  id: 'x', boothId: 'drinks', queueNumber: 'A1', station: 'A', items: [], total: 30,
  paymentMethod: 'cash', paymentStatus: 'paid', status: 'waiting', createdAt: 1, ...over,
})

// the flash is the root container's alert background; see DisplayScreen's `flashing` branch
const isFlashing = (container: HTMLElement) =>
  (container.firstChild as HTMLElement).className.includes('animate-pulse')

// --- clause: กดบน serving → เสียง+ไฟ สำหรับเลขนั้น "อีกครั้ง" ----------------

test('re-announcing an order that is already serving chimes and flashes again', () => {
  const { container } = render(<DisplayScreen booth="drinks" />)
  // baseline: A1 already serving and already announced once
  act(() => emit([o({ id: 'a', queueNumber: 'A1', status: 'serving', announcedAt: 100 })]))
  expect(playChimeSpy).not.toHaveBeenCalled()
  expect(isFlashing(container)).toBe(false)

  // the button bumps announcedAt and changes nothing else (what Q.reannounce produces)
  act(() => emit([o({ id: 'a', queueNumber: 'A1', status: 'serving', announcedAt: 200 })]))

  expect(playChimeSpy).toHaveBeenCalledTimes(1)
  expect(isFlashing(container)).toBe(true)
  // and the number is still the one being served — re-announcing must not move it
  expect(screen.getAllByTestId('serving').map((e) => e.textContent)).toEqual(['A1'])
})

test('re-announcing repeatedly announces every time, not just the first', () => {
  render(<DisplayScreen booth="drinks" />)
  act(() => emit([o({ id: 'a', queueNumber: 'A1', status: 'serving', announcedAt: 100 })]))

  act(() => emit([o({ id: 'a', queueNumber: 'A1', status: 'serving', announcedAt: 200 })]))
  act(() => emit([o({ id: 'a', queueNumber: 'A1', status: 'serving', announcedAt: 300 })]))

  expect(playChimeSpy).toHaveBeenCalledTimes(2)
})

test('re-announcing one serving number leaves the other serving numbers silent', () => {
  render(<DisplayScreen booth="drinks" />)
  act(() => emit([
    o({ id: 'a', queueNumber: 'A1', status: 'serving', announcedAt: 100 }),
    o({ id: 'b', queueNumber: 'A2', status: 'serving', announcedAt: 100 }),
  ]))

  act(() => emit([
    o({ id: 'a', queueNumber: 'A1', status: 'serving', announcedAt: 100 }), // untouched
    o({ id: 'b', queueNumber: 'A2', status: 'serving', announcedAt: 200 }), // re-announced
  ]))

  expect(playChimeSpy).toHaveBeenCalledTimes(1)
  expect(screen.getAllByTestId('serving').map((e) => e.textContent)).toEqual(['A1', 'A2'])
})

// --- clause: announcedAt เท่าเดิม → ต้องไม่ประกาศ ---------------------------

test('a new waiting order arriving does not re-announce the number already serving', () => {
  // Firestore re-delivers the whole booth on any change, so the display sees fresh objects
  // constantly. A new *waiting* order must not re-fire the chime for a number announced
  // long ago. (This one is held by the alert hook's key being derived from the serving set
  // only — a waiting order never reaches it. The test below is the one that exercises
  // newlyAnnounced's comparison through the screen.)
  const { container } = render(<DisplayScreen booth="drinks" />)
  act(() => emit([o({ id: 'a', queueNumber: 'A1', status: 'serving', announcedAt: 100 })]))

  act(() => emit([
    o({ id: 'a', queueNumber: 'A1', status: 'serving', announcedAt: 100 }), // same announce time
    o({ id: 'w', queueNumber: 'A9', status: 'waiting', createdAt: 2 }),     // new, unrelated
  ]))

  expect(playChimeSpy).not.toHaveBeenCalled()
  expect(isFlashing(container)).toBe(false)
  expect(screen.getByTestId('next-up')).toHaveTextContent('A9')
})

test('finishing one serving order does not re-announce the one still serving', () => {
  // Changing the serving SET does re-run the alert effect, so this is the case where the
  // display genuinely re-compares announcedAt values. A2 leaving must not drag A1 — whose
  // announcedAt never moved — back into an announcement.
  const { container } = render(<DisplayScreen booth="drinks" />)
  act(() => emit([
    o({ id: 'a', queueNumber: 'A1', status: 'serving', announcedAt: 100 }),
    o({ id: 'b', queueNumber: 'A2', status: 'serving', announcedAt: 100 }),
  ]))

  act(() => emit([
    o({ id: 'a', queueNumber: 'A1', status: 'serving', announcedAt: 100 }), // untouched
    o({ id: 'b', queueNumber: 'A2', status: 'done', doneAt: 500 }),         // finished
  ]))

  expect(playChimeSpy).not.toHaveBeenCalled()
  expect(isFlashing(container)).toBe(false)
  expect(screen.getAllByTestId('serving').map((e) => e.textContent)).toEqual(['A1'])
})

test('an announcedAt that goes backwards does not announce', () => {
  // Two stations can write concurrently and Firestore may deliver a stale value; only a
  // forward bump is a real re-announce.
  render(<DisplayScreen booth="drinks" />)
  act(() => emit([o({ id: 'a', queueNumber: 'A1', status: 'serving', announcedAt: 200 })]))

  act(() => emit([o({ id: 'a', queueNumber: 'A1', status: 'serving', announcedAt: 100 })]))

  expect(playChimeSpy).not.toHaveBeenCalled()
})

test('the flash is temporary — it clears itself after the alert window', () => {
  vi.useFakeTimers()
  const { container } = render(<DisplayScreen booth="drinks" />)
  act(() => emit([o({ id: 'a', queueNumber: 'A1', status: 'serving', announcedAt: 100 })]))
  act(() => emit([o({ id: 'a', queueNumber: 'A1', status: 'serving', announcedAt: 200 })]))
  expect(isFlashing(container)).toBe(true)

  act(() => { vi.advanceTimersByTime(3000) })

  // back to the normal background, ready to flash again on the next re-announce
  expect(isFlashing(container)).toBe(false)
  expect(screen.getAllByTestId('serving').map((e) => e.textContent)).toEqual(['A1'])
})
