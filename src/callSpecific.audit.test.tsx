/**
 * Audit: the "เรียกเจาะจง / call a specific number" acceptance criterion
 * (`docs/superpowers/specs/2026-08-04-queue-pro-upgrade-design.md`)
 *
 *   > เรียกเจาะจง: กด "เรียก" บน waiting เลขใดก็ได้ → serving (ข้ามลำดับได้)
 *
 * ⚠️ THE SELECTOR TRAP THIS FILE EXISTS TO AVOID.
 * Three different buttons in `QueuePanel` start with the word เรียก:
 *   เรียกคิวถัดไป (callNext) · เรียก (callSpecific) · เรียกซ้ำ (recall)
 * A `getByRole('button', { name: /เรียก/ })` therefore matches the WRONG button
 * as happily as the right one — and "the เรียก button is absent from parked
 * cards" is green-by-accident when the matcher is really finding เรียกซ้ำ, which
 * lives on exactly those cards. Every selector below passes the name as an exact
 * STRING (Testing Library full-string match after normalisation), never a regex.
 * B3 pins the trap itself so a future rewrite to a regex fails loudly.
 *
 * ⚠️ SCOPE OF THE EVIDENCE — read before trusting a green run.
 *  - `ordersRepo` and `display/chime` are mocked whole. Nothing here writes
 *    Firestore and no sound leaves a speaker. "the panel called it" means the
 *    patch handed to `updateOrderStatus` had the right shape and the right id.
 *  - jsdom runs no layout. Nothing here measures a pixel or a font size.
 *  - "ข้ามลำดับได้" is proven two ways that do NOT overlap: structurally at the
 *    action (A3 — `callSpecific` receives one order and no list, so it has no
 *    ordering input it could obey) and behaviourally at the panel (B1/B2 — the
 *    last and the middle card of a five-deep queue each write only themselves).
 *  - NOT PROVEN HERE: pressing เรียก on an order that is no longer `waiting`.
 *    The panel only renders the button inside the `waiting` list, so the status
 *    guard in `callSpecific` is a second line of defence that this UI cannot
 *    reach. B4 pins both layers separately and says so out loud rather than
 *    faking a press that the real screen can never produce.
 *  - NOT PROVEN HERE: the double-press race. Two presses before a fresh snapshot
 *    arrive both see a stale `waiting` order and both write. That belongs to the
 *    Idempotency criterion, not this one — see the audit note in docs/autopilot/.
 */
import { vi, test, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, within, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import type { Order } from './domain/types'

const { playChimeSpy, updateOrderStatus } = vi.hoisted(() => ({
  playChimeSpy: vi.fn(),
  updateOrderStatus: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('./display/chime', () => ({ playChime: playChimeSpy }))

let subs: Array<(o: Order[]) => void> = []
vi.mock('./order/ordersRepo', () => ({
  subscribeBoothOrders: (_booth: string, cb: (o: Order[]) => void) => {
    subs.push(cb)
    return () => { subs = subs.filter((s) => s !== cb) }
  },
  subscribeAllOrders: (cb: (o: Order[]) => void) => { subs.push(cb); return () => { subs = subs.filter((s) => s !== cb) } },
  createOrder: vi.fn(),
  updateOrderStatus,
}))

import { callSpecific } from './queue/queueActions'
import { QueuePanel } from './screens/QueuePanel'
import { DisplayScreen } from './screens/DisplayScreen'

const emit = (orders: Order[]) => act(() => { subs.forEach((s) => s(orders)) })

const o = (over: Partial<Order>): Order => ({
  id: 'x', boothId: 'drinks', queueNumber: 'A1', station: 'A', items: [], total: 30,
  paymentMethod: 'cash', paymentStatus: 'paid', status: 'waiting', createdAt: 1, ...over,
})

/** Five waiting numbers, oldest first: o1/A1 … o5/A5. */
const LINE = [1, 2, 3, 4, 5].map((i) =>
  o({ id: `o${i}`, queueNumber: `A${i}`, station: 'A', status: 'waiting', createdAt: i }),
)

const rootOf = (container: HTMLElement) => container.firstElementChild as HTMLElement

/** The card a queue number sits in. QueueNumber is a <span>, so this climbs to the card div. */
const card = (n: string) => screen.getByText(n).closest('div') as HTMLElement

/** Exact string, never a regex — see the selector trap in the header. */
const CALL = 'เรียก'

beforeEach(() => { subs = []; playChimeSpy.mockClear(); updateOrderStatus.mockClear() })
afterEach(() => { cleanup(); vi.restoreAllMocks() })

// ───────────────────────── A. the action: what "เรียก" means ─────────────────────────

test('A1: callSpecific serves the order it is handed, and writes nothing else', () => {
  const patch = callSpecific(o({ status: 'waiting', createdAt: 7 }), 100)
  // toStrictEqual, not toEqual: toEqual is blind to keys holding undefined, and a
  // smuggled `doneAt: undefined` would reach the repo as a real deleteField().
  expect(patch).toStrictEqual({ status: 'serving', servingAt: 100, announcedAt: 100 })
  expect(Object.keys(patch!).sort()).toStrictEqual(['announcedAt', 'servingAt', 'status'])
})

test('A2: callSpecific is a no-op for every status that is not waiting', () => {
  const now = 100
  expect(callSpecific(o({ status: 'serving' }), now)).toBeNull()
  expect(callSpecific(o({ status: 'done' }), now)).toBeNull()
  expect(callSpecific(o({ status: 'skipped' }), now)).toBeNull()
  expect(callSpecific(o({ status: 'cancelled' }), now)).toBeNull()
  // spine: the guard is not simply `return null` — waiting still produces a patch
  expect(callSpecific(o({ status: 'waiting' }), now)).not.toBeNull()
})

test('A3: the action has no ordering input at all — position cannot change the patch', () => {
  // This is the strongest available form of "ข้ามลำดับได้": callSpecific takes ONE
  // order and no queue, so there is no line for it to respect. The oldest and the
  // newest waiting number produce byte-identical patches.
  const oldest = callSpecific(o({ id: 'o1', queueNumber: 'A1', status: 'waiting', createdAt: 1 }), 500)
  const newest = callSpecific(o({ id: 'o9', queueNumber: 'A9', status: 'waiting', createdAt: 999 }), 500)
  expect(oldest).toStrictEqual(newest)
  expect(newest).toStrictEqual({ status: 'serving', servingAt: 500, announcedAt: 500 })
  // …and it is the SAME patch callNext would produce, so a number called out of
  // turn is not a second-class serving order on the customer screen.
  expect(callSpecific(o({ status: 'waiting' }), 500)).toStrictEqual({ status: 'serving', servingAt: 500, announcedAt: 500 })
})

// ───────────────── B. the panel: pressing เรียก on a number down the line ─────────────────

test('B1: the LAST number in a five-deep queue can be called, over four waiting cards', async () => {
  const NOW = 1_700_000_000_000
  vi.spyOn(Date, 'now').mockReturnValue(NOW)
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  emit(LINE)

  // spine: all five cards really are on screen and each offers its own เรียก, so
  // "clicked the fifth" is a genuine choice among five, not the only button there is.
  expect(screen.getAllByRole('button', { name: CALL })).toHaveLength(5)

  await user.click(within(card('A5')).getByRole('button', { name: CALL }))

  expect(updateOrderStatus.mock.calls).toStrictEqual([
    ['o5', { status: 'serving', servingAt: NOW, announcedAt: NOW }],
  ])
})

test('B2: calling the MIDDLE number leaves the other four completely untouched', async () => {
  const NOW = 4242
  vi.spyOn(Date, 'now').mockReturnValue(NOW)
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  emit(LINE)

  await user.click(within(card('A3')).getByRole('button', { name: CALL }))

  // The WHOLE call list, strictly. objectContaining would wave through a second
  // write, and a `mock.calls[0]` check would not notice a fired-twice bug at all.
  expect(updateOrderStatus.mock.calls).toStrictEqual([
    ['o3', { status: 'serving', servingAt: NOW, announcedAt: NOW }],
  ])
  // spelled out separately, because this is the half of the criterion that a
  // single-order fixture can never fail: nobody else was written to.
  expect(updateOrderStatus.mock.calls.map((c) => c[0])).toStrictEqual(['o3'])
  for (const id of ['o1', 'o2', 'o4', 'o5']) {
    expect(updateOrderStatus).not.toHaveBeenCalledWith(id, expect.anything())
  }
})

test('B3: เรียก is offered on waiting cards only — and /เรียก/ as a regex is the wrong matcher', () => {
  render(<QueuePanel booth="drinks" station="A" />)
  emit([
    o({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'serving' }),
    o({ id: 'o2', queueNumber: 'A2', station: 'A', status: 'waiting', createdAt: 2 }),
    o({ id: 'o3', queueNumber: 'A3', station: 'A', status: 'skipped', createdAt: 3 }),
  ])

  // positive spine FIRST: the waiting card carries it, so the negatives below are
  // about the button's absence and not about `card()` returning some inner div.
  expect(within(card('A2')).getByRole('button', { name: CALL })).toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: CALL })).toHaveLength(1)

  // Each negative is paired with a positive from the SAME container, proving the
  // container is the real card. A shrink-wrapped div would fail these positives.
  expect(within(card('A1')).getByRole('button', { name: 'เสร็จ' })).toBeInTheDocument()
  expect(within(card('A1')).queryByRole('button', { name: CALL })).toBeNull()
  expect(within(card('A3')).getByRole('button', { name: 'เรียกซ้ำ' })).toBeInTheDocument()
  expect(within(card('A3')).queryByRole('button', { name: CALL })).toBeNull()

  // The trap, pinned: a regex sees all three เรียก-prefixed buttons, so the two
  // `queryByRole` nulls above would flip to green-for-the-wrong-reason under one.
  const loose = screen.getAllByRole('button', { name: /เรียก/ }).map((b) => b.textContent)
  expect(loose).toContain('เรียกซ้ำ')
  expect(loose.some((t) => t?.startsWith('เรียกคิวถัดไป'))).toBe(true)
  expect(loose.length).toBeGreaterThan(1)
})

test('B4: the status guard is a real second line of defence the screen cannot reach', () => {
  render(<QueuePanel booth="drinks" station="A" />)
  emit([
    o({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'serving' }),
    o({ id: 'o3', queueNumber: 'A3', station: 'A', status: 'skipped', createdAt: 3 }),
    o({ id: 'o4', queueNumber: 'A4', station: 'A', status: 'done', createdAt: 4 }),
  ])

  // Layer 1 — with nothing waiting, the panel offers no เรียก at all, so no press
  // can ever hand a non-waiting order to callSpecific through this UI.
  expect(screen.queryAllByRole('button', { name: CALL })).toHaveLength(0)
  expect(updateOrderStatus).not.toHaveBeenCalled()

  // Layer 2 — and if some future card did offer it, the action itself refuses and
  // `apply()` writes nothing, because a null patch returns before updateOrderStatus.
  for (const status of ['serving', 'skipped', 'done', 'cancelled'] as const) {
    expect(callSpecific(o({ id: 'o1', status }), 999)).toBeNull()
  }
})

// ──────────── C. the customer screen: a number called out of turn is announced ────────────

test('C1: calling the last number moves it to serving on the Display and announces it', () => {
  const { container } = render(<DisplayScreen booth="drinks" />)
  emit(LINE) // nothing serving yet; A1 is the callout, A2–A5 queue behind it
  expect(screen.queryAllByTestId('serving')).toHaveLength(0)
  expect(screen.getByTestId('next-up').textContent).toBe('A1')
  expect(playChimeSpy).not.toHaveBeenCalled()

  // the เรียก press on A5 lands: only o5 changed, exactly as B1 proved the panel writes
  emit(LINE.map((x) => (x.id === 'o5' ? { ...x, status: 'serving' as const, servingAt: 900, announcedAt: 900 } : x)))

  expect(screen.getAllByTestId('serving').map((e) => e.textContent)).toStrictEqual(['A5'])
  expect(playChimeSpy).toHaveBeenCalledTimes(1)
  expect(rootOf(container).className).toContain('min-h-screen')
  expect(rootOf(container).className).toContain('animate-pulse')
})

test('C2: the numbers it jumped stay queued, in their original order, still waiting', () => {
  render(<DisplayScreen booth="drinks" />)
  emit(LINE)
  emit(LINE.map((x) => (x.id === 'o5' ? { ...x, status: 'serving' as const, servingAt: 900, announcedAt: 900 } : x)))

  // A5 skipped the line without disturbing it: A1 is still the "เตรียมตัว" callout
  // and A2–A4 still trail it oldest-first. Nobody was silently consumed.
  expect(screen.getByTestId('next-up').textContent).toBe('A1')
  expect(screen.getAllByTestId('upnext').map((e) => e.textContent)).toStrictEqual(['A2', 'A3', 'A4'])
  expect(screen.getAllByTestId('serving').map((e) => e.textContent)).toStrictEqual(['A5'])
})

test('C3: a specifically-called number announces on its own merit, not by being first', () => {
  // A1 is already serving and has been announced. Calling A4 must still chime — if
  // the screen only announced the head of the queue, this is where it would stay silent.
  render(<DisplayScreen booth="drinks" />)
  emit(LINE.map((x) => (x.id === 'o1' ? { ...x, status: 'serving' as const, servingAt: 100, announcedAt: 100 } : x)))
  expect(screen.getAllByTestId('serving').map((e) => e.textContent)).toStrictEqual(['A1'])
  expect(playChimeSpy).not.toHaveBeenCalled()

  emit(LINE.map((x) => {
    if (x.id === 'o1') return { ...x, status: 'serving' as const, servingAt: 100, announcedAt: 100 }
    if (x.id === 'o4') return { ...x, status: 'serving' as const, servingAt: 900, announcedAt: 900 }
    return x
  }))

  expect(screen.getAllByTestId('serving').map((e) => e.textContent)).toStrictEqual(['A1', 'A4'])
  expect(playChimeSpy).toHaveBeenCalledTimes(1)
})
