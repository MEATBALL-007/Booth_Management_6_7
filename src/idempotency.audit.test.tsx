/**
 * Audit: the "Idempotency" acceptance criterion
 * (`docs/superpowers/specs/2026-08-04-queue-pro-upgrade-design.md`)
 *
 *   > Idempotency: กดซ้ำ/สองเครื่องพร้อมกัน ไม่ดึงซ้อน/ข้ามผิด (guard คืน no-op)
 *
 * and the spec's own design note for it (§3):
 *
 *   > ทุก action ผ่าน guard ข้างบน → กดซ้ำ/สองเครื่องกดพร้อมกันไม่ทำให้ดึงซ้อนหรือ
 *   > ข้ามผิด (ถ้า order ถูกเปลี่ยนไปแล้ว guard คืน null)
 *
 * ⚠️ WHAT WAS ACTUALLY BROKEN — the spec's design is not sufficient on its own.
 * The guards in `queueActions.ts` test the status of the order object they are
 * *handed*. `QueuePanel` hands them an order out of its render closure, and that
 * closure only changes when a Firestore snapshot arrives. Two presses inside one
 * render generation therefore both see the OLD status and both write:
 *
 *     [ 'o1', { status: 'serving', servingAt: 1000, announcedAt: 1000 } ]
 *     [ 'o1', { status: 'serving', servingAt: 2000, announcedAt: 2000 } ]
 *
 * The action guard is a SNAPSHOT-STATE guard, not a WRITE-ONCE guard — it cannot
 * debounce a press it has not been told about yet. The missing half has to live
 * in the panel, because a pure action handed one order cannot know whether it has
 * already been called for that order (A1 pins exactly that).
 *
 * ⚠️ SCOPE OF THE EVIDENCE — read before trusting a green run.
 *  - `ordersRepo` and `display/chime` are mocked whole. Nothing here reaches
 *    Firestore. "no second write" means `updateOrderStatus` was not called again;
 *    it does NOT mean Firestore would have rejected a second write.
 *  - jsdom runs no layout and fires no real double-tap. "Two presses with no
 *    snapshot between them" is modelled by clicking twice without calling `emit`,
 *    which is the same render generation the real race lands in.
 *  - NOT PROVEN HERE: the two-device case. That is a different mechanism
 *    (Firestore last-write-wins across clients, not a stale React closure) and
 *    this change does not address it. E1 pins the gap honestly as it stands today
 *    rather than leaving it unstated — see the audit note in docs/autopilot/.
 *  - NOT PROVEN HERE: a snapshot that arrives WITHOUT our own write applied. The
 *    release is driven by "a snapshot arrived", not by "our write came back", so
 *    such a snapshot re-opens the window early. Chosen deliberately: the failure
 *    mode of the precise alternative is a permanently stuck button, which is far
 *    worse at a live booth. D1/D2 pin that nothing can latch shut.
 *
 * ⚠️ SELECTOR TRAP (inherited from callSpecific.audit.test.tsx): three buttons
 * start with the word เรียก — เรียกคิวถัดไป · เรียก · เรียกซ้ำ. Every selector
 * below passes the name as an exact STRING, never a regex.
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

import { callSpecific, markDone, skip, recall, reannounce } from './queue/queueActions'
import { QueuePanel } from './screens/QueuePanel'

const emit = (orders: Order[]) => act(() => { subs.forEach((s) => s(orders)) })

const o = (over: Partial<Order>): Order => ({
  id: 'x', boothId: 'drinks', queueNumber: 'A1', station: 'A', items: [], total: 30,
  paymentMethod: 'cash', paymentStatus: 'paid', status: 'waiting', createdAt: 1, ...over,
})

/** Exact strings, never regexes — see the selector trap in the header. */
const CALL = 'เรียก'
const CALL_NEXT = 'เรียกคิวถัดไป · Call next'
const DONE = 'เสร็จ'
const SKIP = 'ข้าม'
const RECALL = 'เรียกซ้ำ'
const REANNOUNCE = '🔔 ประกาศซ้ำ'
const UNDO = 'ย้อนกลับ · Undo'

const press = async (user: ReturnType<typeof userEvent.setup>, name: string) =>
  user.click(screen.getByRole('button', { name }))

beforeEach(() => { subs = []; playChimeSpy.mockClear(); updateOrderStatus.mockClear() })
afterEach(() => { cleanup(); vi.restoreAllMocks() })

// ───────── A. root cause: the pure guard cannot be a write-once guard ─────────

test('A1: handed the same stale order twice, every action patches twice — the guard is snapshot-state, not write-once', () => {
  const waiting = o({ status: 'waiting' })
  const serving = o({ status: 'serving' })
  const skipped = o({ status: 'skipped' })

  // Same input object, two calls, two patches. These are pure functions: they are
  // handed one order and have no memory, so they CANNOT refuse a repeat. This is
  // why the fix lives in QueuePanel and not here.
  expect(callSpecific(waiting, 1000)).not.toBeNull()
  expect(callSpecific(waiting, 2000)).toStrictEqual({ status: 'serving', servingAt: 2000, announcedAt: 2000 })
  expect(markDone(serving, 1000)).not.toBeNull()
  expect(markDone(serving, 2000)).toStrictEqual({ status: 'done', doneAt: 2000 })
  expect(skip(serving)).not.toBeNull()
  expect(skip(serving)).toStrictEqual({ status: 'skipped' })
  expect(recall(skipped, 1000)).not.toBeNull()
  expect(recall(skipped, 2000)).toStrictEqual({ status: 'serving', servingAt: 2000, announcedAt: 2000 })
})

test('A2: the actions still no-op once the status HAS moved — the spec guard is intact, just not sufficient', () => {
  // spine for A1: the actions are not unconditional patch factories. Handed the
  // post-transition status they do return null, exactly as §3 of the spec says.
  expect(callSpecific(o({ status: 'serving' }), 100)).toBeNull()
  expect(markDone(o({ status: 'done' }), 100)).toBeNull()
  expect(skip(o({ status: 'skipped' }))).toBeNull()
  expect(recall(o({ status: 'serving' }), 100)).toBeNull()
  expect(reannounce(o({ status: 'done' }), 100)).toBeNull()
})

// ───────── B. the panel: a double press writes once, per transition button ─────────

test('B1: pressing เรียก twice with no snapshot between writes once — ไม่ดึงซ้อน', async () => {
  const clock = vi.spyOn(Date, 'now').mockReturnValue(1000)
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  emit([o({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'waiting', createdAt: 1 })])

  await press(user, CALL)
  clock.mockReturnValue(2000)
  await press(user, CALL)

  // The whole call list, strictly. toEqual is blind to keys holding undefined and
  // updateOrderStatus turns those into a real deleteField().
  expect(updateOrderStatus.mock.calls).toStrictEqual([
    ['o1', { status: 'serving', servingAt: 1000, announcedAt: 1000 }],
  ])
})

test('B2: pressing เรียกคิวถัดไป twice writes once, and does not jump to the next number — ไม่ข้ามผิด', async () => {
  const clock = vi.spyOn(Date, 'now').mockReturnValue(1000)
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  emit([
    o({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'waiting', createdAt: 1 }),
    o({ id: 'o2', queueNumber: 'A2', station: 'A', status: 'waiting', createdAt: 2 }),
  ])

  await press(user, CALL_NEXT)
  clock.mockReturnValue(2000)
  await press(user, CALL_NEXT)

  // Exactly one write, and o2 is NOT in it: the second press must neither re-pull
  // o1 nor skip ahead to o2 while o1's own transition is still unconfirmed.
  expect(updateOrderStatus.mock.calls).toStrictEqual([
    ['o1', { status: 'serving', servingAt: 1000, announcedAt: 1000 }],
  ])
})

test('B3: pressing เสร็จ twice with no snapshot between writes once', async () => {
  const clock = vi.spyOn(Date, 'now').mockReturnValue(1000)
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  emit([o({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'serving', servingAt: 5, announcedAt: 5 })])

  await press(user, DONE)
  clock.mockReturnValue(2000)
  await press(user, DONE)

  expect(updateOrderStatus.mock.calls).toStrictEqual([['o1', { status: 'done', doneAt: 1000 }]])
})

test('B4: pressing ข้าม twice with no snapshot between writes once', async () => {
  vi.spyOn(Date, 'now').mockReturnValue(1000)
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  emit([o({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'serving', servingAt: 5, announcedAt: 5 })])

  await press(user, SKIP)
  await press(user, SKIP)

  expect(updateOrderStatus.mock.calls).toStrictEqual([['o1', { status: 'skipped' }]])
})

test('B5: pressing เรียกซ้ำ twice with no snapshot between writes once', async () => {
  const clock = vi.spyOn(Date, 'now').mockReturnValue(1000)
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  emit([o({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'skipped', createdAt: 1 })])

  await press(user, RECALL)
  clock.mockReturnValue(2000)
  await press(user, RECALL)

  expect(updateOrderStatus.mock.calls).toStrictEqual([
    ['o1', { status: 'serving', servingAt: 1000, announcedAt: 1000 }],
  ])
})

test('B6: the guard is per order — a double press on one card never gags a different card', async () => {
  const clock = vi.spyOn(Date, 'now').mockReturnValue(1000)
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  emit([
    o({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'serving', servingAt: 5, announcedAt: 5 }),
    o({ id: 'o2', queueNumber: 'A2', station: 'A', status: 'serving', servingAt: 6, announcedAt: 6 }),
  ])

  const cardOf = (n: string) => screen.getByText(n).closest('div') as HTMLElement
  await user.click(within(cardOf('A1')).getByRole('button', { name: DONE }))
  clock.mockReturnValue(2000)
  await user.click(within(cardOf('A1')).getByRole('button', { name: DONE }))
  await user.click(within(cardOf('A2')).getByRole('button', { name: DONE }))

  // o1 blocked on its repeat; o2 completely unaffected. A guard that latched
  // globally instead of per id would swallow the o2 write too.
  expect(updateOrderStatus.mock.calls).toStrictEqual([
    ['o1', { status: 'done', doneAt: 1000 }],
    ['o2', { status: 'done', doneAt: 2000 }],
  ])
})

// ───────── C. the exemption: ประกาศซ้ำ is meant to repeat ─────────

test('C1: ประกาศซ้ำ is NOT gagged by the guard — repeating it is the whole feature', async () => {
  const clock = vi.spyOn(Date, 'now').mockReturnValue(1000)
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  emit([o({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'serving', servingAt: 5, announcedAt: 5 })])

  await press(user, REANNOUNCE)
  clock.mockReturnValue(2000)
  await press(user, REANNOUNCE)

  // The spec's action table calls reannounce "serving (ไม่เปลี่ยนสถานะ)" — it is
  // the one action that moves no status, so the transition guard must not see it.
  // Blocking this would silently break the ประกาศซ้ำ criterion.
  expect(updateOrderStatus.mock.calls).toStrictEqual([
    ['o1', { announcedAt: 1000 }],
    ['o1', { announcedAt: 2000 }],
  ])
})

test('C2: a status transition on a card does not gag that card\'s ประกาศซ้ำ', async () => {
  const clock = vi.spyOn(Date, 'now').mockReturnValue(1000)
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  emit([o({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'serving', servingAt: 5, announcedAt: 5 })])

  await press(user, SKIP)
  clock.mockReturnValue(2000)
  await press(user, REANNOUNCE)

  // The skip is in flight for o1, but announcing again is still allowed: the
  // guard keys on "this patch moves the status", not on "this id is busy".
  expect(updateOrderStatus.mock.calls).toStrictEqual([
    ['o1', { status: 'skipped' }],
    ['o1', { announcedAt: 2000 }],
  ])
})

// ───────── D. the guard releases — nothing may latch shut ─────────

test('D1: a fresh snapshot re-opens the SAME order for its next transition', async () => {
  const clock = vi.spyOn(Date, 'now').mockReturnValue(1000)
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  emit([o({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'serving', servingAt: 5, announcedAt: 5 })])

  await press(user, SKIP)
  await press(user, SKIP) // swallowed — still the same render generation

  // the snapshot Firestore sends back, now carrying the skip
  emit([o({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'skipped', servingAt: 5, announcedAt: 5 })])
  clock.mockReturnValue(2000)
  await press(user, RECALL)

  // Both writes are for o1: the release is proven by the SAME id acting again
  // across the barrier, not by some other order being free to move.
  expect(updateOrderStatus.mock.calls).toStrictEqual([
    ['o1', { status: 'skipped' }],
    ['o1', { status: 'serving', servingAt: 2000, announcedAt: 2000 }],
  ])
})

test('D2: ย้อนกลับ is never blocked by an in-flight transition — the safety net always fires', async () => {
  vi.spyOn(Date, 'now').mockReturnValue(1000)
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  emit([o({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'serving', servingAt: 5, announcedAt: 5 })])

  await press(user, DONE)
  await press(user, UNDO)

  // Undo writes the full snapshot for the very id that is still in flight. If the
  // guard ever swallowed this, a misfire would be unrecoverable at the booth.
  expect(updateOrderStatus.mock.calls).toStrictEqual([
    ['o1', { status: 'done', doneAt: 1000 }],
    ['o1', { status: 'serving', servingAt: 5, doneAt: undefined, announcedAt: 5, cancelReason: undefined }],
  ])
})

test('D3: undo itself releases the hold — no snapshot needed to move the order again', async () => {
  const clock = vi.spyOn(Date, 'now').mockReturnValue(1000)
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  emit([o({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'serving', servingAt: 5, announcedAt: 5 })])

  await press(user, DONE)
  await press(user, UNDO)
  clock.mockReturnValue(3000)
  await press(user, DONE) // deliberately NO emit() — the release must come from the undo

  // D1 covers release-by-snapshot; this covers release-by-undo, which is a
  // separate line in the panel. Without it the order is stranded whenever the
  // undo lands before Firestore echoes anything back.
  expect(updateOrderStatus.mock.calls).toStrictEqual([
    ['o1', { status: 'done', doneAt: 1000 }],
    ['o1', { status: 'serving', servingAt: 5, doneAt: undefined, announcedAt: 5, cancelReason: undefined }],
    ['o1', { status: 'done', doneAt: 3000 }],
  ])
})

// ───────── E. the gap this change does NOT close ─────────

test('E1: two devices still both write — the cross-client race is NOT closed by this guard', async () => {
  vi.spyOn(Date, 'now').mockReturnValue(1000)
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />) // device 1
  render(<QueuePanel booth="drinks" station="A" />) // device 2
  emit([o({ id: 'o1', queueNumber: 'A1', station: 'A', status: 'waiting', createdAt: 1 })])

  const buttons = screen.getAllByRole('button', { name: CALL })
  expect(buttons).toHaveLength(2) // spine: two independent panels really are mounted
  await user.click(buttons[0])
  await user.click(buttons[1])

  // DOCUMENTED GAP, not a desired behaviour. The guard is per panel instance, so
  // it cannot see the other device's press. Firestore is last-write-wins and both
  // writes carry the same target status, so the end state is still correct — but
  // "only one write" is NOT true across clients. Closing this needs a Firestore
  // transaction (runTransaction / a conditional update), which is out of scope
  // here because it touches the repo layer and the security rules.
  // If someone closes that gap later, this test SHOULD go red — read the note in
  // docs/autopilot/2026-08-30-idempotency-audit.md before changing it.
  expect(updateOrderStatus.mock.calls).toStrictEqual([
    ['o1', { status: 'serving', servingAt: 1000, announcedAt: 1000 }],
    ['o1', { status: 'serving', servingAt: 1000, announcedAt: 1000 }],
  ])
})
