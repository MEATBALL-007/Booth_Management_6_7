/**
 * Audit: the "ประกาศซ้ำ / re-announce" acceptance criterion
 * (`docs/superpowers/specs/2026-08-04-queue-pro-upgrade-design.md:23`)
 *
 *   > ประกาศซ้ำ: กดบน serving → Display เล่นเสียง+ไฟสำหรับเลขนั้นอีกครั้ง (announcedAt เด้ง)
 *
 * ⚠️ THE TRAP THIS FILE EXISTS TO AVOID.
 * §4 of the spec says the Display announces when EITHER
 *   (ก) a number newly enters `serving`, OR
 *   (ข) a serving order's `announcedAt` goes up.
 * `newlyAnnounced()` treats a number missing from the previous snapshot as new
 * (`was === undefined`), so path (ก) will happily make a screen-level test pass
 * without proving anything about `announcedAt`. This criterion is path (ข) ONLY.
 * Every screen-level test below therefore keeps the SAME order id and the SAME
 * queue number inside `serving` across both snapshots, and asserts it never left.
 * If a mutation to `newlyAnnounced` (e.g. `>` → `!==`, or "new numbers only")
 * leaves this file green, the file has drifted back onto path (ก).
 *
 * ⚠️ SCOPE OF THE EVIDENCE — read before trusting a green run.
 *  - `ordersRepo` and `display/chime` are mocked whole. Nothing here ever writes
 *    Firestore and no sound ever leaves a speaker. "chime" means `playChime` was
 *    called; "the panel announced" means the patch handed to `updateOrderStatus`
 *    had the right shape.
 *  - jsdom runs no cascade and no layout. "ไฟ" (flash) means the root element
 *    DECLARED `animate-pulse` / `bg-phantom-orange/30` — not a measured pixel.
 *  - "สำหรับเลขนั้น" (for that number) is provable at the selector and the panel:
 *    `newlyAnnounced` returns exactly the bumped number, and the panel writes only
 *    the pressed card's order. It is NOT provable of the flash itself: the flash is
 *    a class on the ROOT of the whole screen, so it is per-screen by construction.
 *    No test here pretends otherwise.
 *  - The whole-screen pulse must be asserted on the ROOT element. The green LIVE
 *    dot (`DisplayScreen.tsx:40`) carries `animate-pulse` permanently, so
 *    "is anything pulsing?" is green even on a dead screen. D2 pins that trap.
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

// One broadcast bus shared by every screen this file renders. Subscribers are
// removed on unsubscribe so a torn-down screen genuinely stops receiving.
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

import { reannounce } from './queue/queueActions'
import { newlyAnnounced, type ServingSig } from './display/queueView'
import { QueuePanel } from './screens/QueuePanel'
import { DisplayScreen } from './screens/DisplayScreen'

const emit = (orders: Order[]) => act(() => { subs.forEach((s) => s(orders)) })

const o = (over: Partial<Order>): Order => ({
  id: 'x', boothId: 'drinks', queueNumber: 'A1', station: 'A', items: [], total: 30,
  paymentMethod: 'cash', paymentStatus: 'paid', status: 'waiting', createdAt: 1, ...over,
})

beforeEach(() => { subs = []; playChimeSpy.mockClear(); updateOrderStatus.mockClear() })
afterEach(() => { cleanup(); vi.restoreAllMocks() })

// The screen's own outermost element — NOT `document.body.firstElementChild`, which
// is Testing Library's wrapper div and carries no classes at all. Reading the wrapper
// makes every `not.toContain('animate-pulse')` pass against an empty string.
const rootOf = (container: HTMLElement) => container.firstElementChild as HTMLElement

// ───────────────────────── A. the action: what a press means ─────────────────────────

test('A1: reannounce hands back announcedAt and NOTHING else', () => {
  const patch = reannounce(o({ status: 'serving', servingAt: 5, announcedAt: 5 }), 100)
  // toStrictEqual, not toEqual: toEqual is blind to keys whose value is undefined,
  // and a smuggled `status: undefined` would reach Firestore as a real write.
  expect(patch).toStrictEqual({ announcedAt: 100 })
  expect(Object.keys(patch!)).toStrictEqual(['announcedAt'])
})

test('A2: reannounce is a no-op for every status that is not serving', () => {
  const now = 100
  expect(reannounce(o({ status: 'waiting' }), now)).toBeNull()
  expect(reannounce(o({ status: 'done' }), now)).toBeNull()
  expect(reannounce(o({ status: 'skipped' }), now)).toBeNull()
  expect(reannounce(o({ status: 'cancelled' }), now)).toBeNull()
  // spine: the guard is not simply `return null` — serving still produces a patch
  expect(reannounce(o({ status: 'serving' }), now)).not.toBeNull()
})

// ───────────────────────── B. the panel: pressing the button ─────────────────────────

test('B1: pressing ประกาศซ้ำ writes exactly one patch, carrying only announcedAt', async () => {
  const NOW = 1_700_000_000_000
  vi.spyOn(Date, 'now').mockReturnValue(NOW)
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  emit([o({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'serving', servingAt: 5, announcedAt: 5 })])

  await user.click(screen.getByRole('button', { name: /ประกาศซ้ำ/ }))

  // The whole call list, strictly. objectContaining would wave through a smuggled
  // `status: 'serving'` (which updateOrderStatus merges straight onto the document)
  // and would also miss the write being fired twice.
  expect(updateOrderStatus.mock.calls).toStrictEqual([['o1', { announcedAt: NOW }]])
})

test('B2: each press announces again — two presses send two rising announcedAt', async () => {
  const clock = vi.spyOn(Date, 'now').mockReturnValue(1000)
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  emit([o({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'serving', servingAt: 5, announcedAt: 5 })])

  await user.click(screen.getByRole('button', { name: /ประกาศซ้ำ/ }))
  clock.mockReturnValue(2000)
  await user.click(screen.getByRole('button', { name: /ประกาศซ้ำ/ }))

  expect(updateOrderStatus.mock.calls).toStrictEqual([
    ['o1', { announcedAt: 1000 }],
    ['o1', { announcedAt: 2000 }],
  ])
})

test('B3: the button is offered on serving cards only — waiting and parked cards have none', () => {
  render(<QueuePanel booth="drinks" station="A" />)
  emit([
    o({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'serving' }),
    o({ id: 'o2', queueNumber: 'A2', station: 'A', status: 'waiting', createdAt: 2 }),
    o({ id: 'o3', queueNumber: 'A3', station: 'A', status: 'skipped', createdAt: 3 }),
  ])

  const card = (n: string) => screen.getByText(n).closest('div') as HTMLElement
  // spine: the serving card does carry it, so the two negatives below mean something
  expect(within(card('A1')).getByRole('button', { name: /ประกาศซ้ำ/ })).toBeInTheDocument()
  expect(within(card('A2')).queryByRole('button', { name: /ประกาศซ้ำ/ })).toBeNull()
  expect(within(card('A3')).queryByRole('button', { name: /ประกาศซ้ำ/ })).toBeNull()
  // …so `reannounce`'s own status guard (A2) is a second line of defence that the
  // UI cannot reach today. Both layers are pinned; neither is assumed.
  expect(screen.getAllByRole('button', { name: /ประกาศซ้ำ/ })).toHaveLength(1)
})

test('B4: with two orders serving, only the pressed card is re-announced', async () => {
  const NOW = 4242
  vi.spyOn(Date, 'now').mockReturnValue(NOW)
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  emit([
    o({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'serving', announcedAt: 5 }),
    o({ id: 'o2', queueNumber: 'A9', station: 'A', status: 'serving', announcedAt: 5, createdAt: 2 }),
  ])

  const a9 = screen.getByText('A9').closest('div') as HTMLElement
  await user.click(within(a9).getByRole('button', { name: /ประกาศซ้ำ/ }))

  expect(updateOrderStatus.mock.calls).toStrictEqual([['o2', { announcedAt: NOW }]])
})

// ─────────────── C. the selector: which numbers count as freshly announced ───────────────

const sig = (n: string, announcedAt: number): ServingSig => ({ n, announcedAt })

test('C1: a bump picks out exactly the bumped number, not its neighbours', () => {
  const prev = [sig('A1', 100), sig('A9', 100)]
  expect(newlyAnnounced(prev, [sig('A1', 100), sig('A9', 200)])).toStrictEqual([sig('A9', 200)])
  // spine: the same shape with the other one bumped picks the other one
  expect(newlyAnnounced(prev, [sig('A1', 200), sig('A9', 100)])).toStrictEqual([sig('A1', 200)])
})

test('C2: an announcedAt that goes BACKWARDS never announces', () => {
  // Snapshots do not arrive in clock order — offline sync, or two devices whose
  // clocks disagree. `newlyAnnounced` compares with `>` (not `!==`) on purpose, so
  // a stale write can never make the customer screen announce into the past.
  const prev = [sig('A1', 500)]
  expect(newlyAnnounced(prev, [sig('A1', 400)])).toStrictEqual([])
  expect(newlyAnnounced(prev, [sig('A1', 0)])).toStrictEqual([])
  // spine: the same comparison still fires forwards
  expect(newlyAnnounced(prev, [sig('A1', 501)])).toStrictEqual([sig('A1', 501)])
})

test('C3: an unchanged announcedAt is silent, while an unseen number is path (ก) not (ข)', () => {
  expect(newlyAnnounced([sig('A1', 100)], [sig('A1', 100)])).toStrictEqual([])
  // Documented, not incidental: a number absent from the previous snapshot counts
  // as announced regardless of its announcedAt. That is spec §4 path (ก) — the
  // reason every screen-level test below keeps its number in serving throughout.
  expect(newlyAnnounced([], [sig('A1', 0)])).toStrictEqual([sig('A1', 0)])
})

// ───────────────────── D. the screen: does the press reach the customer ─────────────────────

test('D1: a serving number that never leaves serving still chimes and flashes when announcedAt rises', () => {
  const { container } = render(<DisplayScreen booth="drinks" />)
  emit([o({ id: 's1', queueNumber: 'A1', status: 'serving', announcedAt: 1000 })]) // baseline
  expect(screen.getAllByTestId('serving').map((e) => e.textContent)).toStrictEqual(['A1'])
  expect(playChimeSpy).not.toHaveBeenCalled()

  emit([o({ id: 's1', queueNumber: 'A1', status: 'serving', announcedAt: 2000 })]) // ประกาศซ้ำ landed

  // same id, same number, serving before AND after — this is path (ข), not (ก)
  expect(screen.getAllByTestId('serving').map((e) => e.textContent)).toStrictEqual(['A1'])
  expect(playChimeSpy).toHaveBeenCalledTimes(1)
  // spine for the reader of every className assertion in this file: we are holding
  // the screen's own root, not an empty wrapper
  expect(rootOf(container).className).toContain('min-h-screen')
  expect(rootOf(container).className).toContain('animate-pulse')
  expect(rootOf(container).className).toContain('bg-phantom-orange/30')
})

test('D2: before the re-announce the screen is calm — even though the LIVE dot always pulses', () => {
  const { container } = render(<DisplayScreen booth="drinks" />)
  emit([o({ id: 's1', queueNumber: 'A1', status: 'serving', announcedAt: 1000 })])

  expect(rootOf(container).className).toContain('min-h-screen')
  expect(rootOf(container).className).not.toContain('animate-pulse')
  expect(rootOf(container).className).toContain('bg-phantom-bg')
  // The trap, written down: the green LIVE dot carries `animate-pulse` forever, so
  // "does the document contain something pulsing?" is green on a dead screen too.
  expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
})

test('D3: a stale snapshot reaches the screen and is deliberately ignored', () => {
  const { container } = render(<DisplayScreen booth="drinks" />)
  emit([o({ id: 's1', queueNumber: 'A1', status: 'serving', announcedAt: 5000 })]) // baseline

  // announcedAt drops: the alert effect DOES re-run (its key changed), so this is a
  // real chance to misfire, not an assertion about something that never happened.
  emit([o({ id: 's1', queueNumber: 'A1', status: 'serving', announcedAt: 4000 })])
  expect(playChimeSpy).not.toHaveBeenCalled()
  expect(rootOf(container).className).toContain('min-h-screen')
  expect(rootOf(container).className).not.toContain('animate-pulse')

  // spine: the very next forward bump does announce, so the screen was not simply deaf
  emit([o({ id: 's1', queueNumber: 'A1', status: 'serving', announcedAt: 6000 })])
  expect(playChimeSpy).toHaveBeenCalledTimes(1)
  expect(rootOf(container).className).toContain('animate-pulse')
})

test('D4: pressing it twice announces twice — "อีกครั้ง" really means again', () => {
  render(<DisplayScreen booth="drinks" />)
  emit([o({ id: 's1', queueNumber: 'A1', status: 'serving', announcedAt: 1000 })])
  emit([o({ id: 's1', queueNumber: 'A1', status: 'serving', announcedAt: 2000 })])
  expect(playChimeSpy).toHaveBeenCalledTimes(1)
  emit([o({ id: 's1', queueNumber: 'A1', status: 'serving', announcedAt: 3000 })])
  expect(playChimeSpy).toHaveBeenCalledTimes(2)
  expect(screen.getAllByTestId('serving').map((e) => e.textContent)).toStrictEqual(['A1'])
})

test('D5: re-announcing one of two serving numbers announces once, for the whole screen', () => {
  const { container } = render(<DisplayScreen booth="drinks" />)
  emit([
    o({ id: 's1', queueNumber: 'A1', status: 'serving', announcedAt: 1000 }),
    o({ id: 's2', queueNumber: 'A9', status: 'serving', announcedAt: 1000 }),
  ])
  emit([
    o({ id: 's1', queueNumber: 'A1', status: 'serving', announcedAt: 1000 }),
    o({ id: 's2', queueNumber: 'A9', status: 'serving', announcedAt: 2000 }),
  ])

  // Both numbers stay on screen; the announcement is one chime and one whole-screen
  // flash. The screen has no per-number flash to assert — see the header note.
  expect(screen.getAllByTestId('serving').map((e) => e.textContent)).toStrictEqual(['A1', 'A9'])
  expect(playChimeSpy).toHaveBeenCalledTimes(1)
  expect(rootOf(container).className).toContain('animate-pulse')
})

test('D6: the flash is transient, so the next re-announce is a fresh one', () => {
  // Fake ONLY the timers. `vi.useFakeTimers()` bare also replaces Date.now, which
  // would silently defeat any hand-held clock (and this file holds one in B1/B2/B4).
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  try {
    const { container } = render(<DisplayScreen booth="drinks" />)
    emit([o({ id: 's1', queueNumber: 'A1', status: 'serving', announcedAt: 1000 })])
    emit([o({ id: 's1', queueNumber: 'A1', status: 'serving', announcedAt: 2000 })])
    expect(rootOf(container).className).toContain('animate-pulse')

    act(() => { vi.advanceTimersByTime(2500) })
    expect(rootOf(container).className).not.toContain('animate-pulse')
    expect(rootOf(container).className).toContain('bg-phantom-bg')

    emit([o({ id: 's1', queueNumber: 'A1', status: 'serving', announcedAt: 3000 })])
    expect(rootOf(container).className).toContain('animate-pulse')
    expect(playChimeSpy).toHaveBeenCalledTimes(2)
  } finally {
    vi.useRealTimers()
  }
})
