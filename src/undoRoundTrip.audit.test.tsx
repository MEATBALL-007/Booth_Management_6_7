/**
 * Acceptance criterion — 2026-08-04-queue-pro-upgrade-design.md:17
 *
 *   "Undo: ทำ action ใดๆ แล้วกดย้อนกลับ → order คืนสถานะ+เวลาเดิม (ครบทุก action)"
 *
 * Two levels of proof, because neither alone is enough:
 *
 *   A. Round-trip at the pure-function level — action -> patch -> undo snapshot
 *      -> deep-equal the original order. Strongest and easiest to read, but it
 *      only sees patches that live in `queueActions`.
 *   B. The same claim driven through the panel's buttons, asserting
 *      `toStrictEqual` on the WHOLE `updateOrderStatus.mock.calls` list. This
 *      catches fields the panel adds on its own, which (A) cannot see, and it
 *      catches a stray second write, which a single-call matcher cannot see.
 *
 * WHAT THIS FILE CANNOT PROVE
 * `ordersRepo` is mocked in section B and Firestore is never contacted, so
 * "the field is really gone from the document" is out of reach here. What is
 * proven is that undo emits an explicit `undefined` for a field the order never
 * had. The translation of that `undefined` into a real `deleteField()` sentinel
 * is pinned separately in `src/undoDeleteField.audit.test.ts` — the two files
 * are a pair and must be read together.
 *
 * Do NOT weaken the assertions to `objectContaining` / `toHaveBeenCalledWith`:
 * both ignore keys whose value is `undefined`, which is precisely the bug this
 * criterion is about. They would stay green over broken code.
 */
import { vi, beforeEach, afterEach, describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import type { Order } from './domain/types'
import * as Q from './queue/queueActions'

const order = (over: Partial<Order>): Order => ({
  id: 'o1', boothId: 'drinks', queueNumber: 'A1', station: 'A', items: [], total: 30,
  paymentMethod: 'cash', paymentStatus: 'paid', status: 'waiting', createdAt: 1, ...over,
})

/**
 * Firestore `updateDoc` semantics, as the repo layer exposes them: a key with a
 * value overwrites, a key holding `undefined` deletes the field, and a key that
 * is absent from the patch is left alone. That last rule is the whole bug.
 */
const write = (o: Order, patch: Partial<Order>): Order => {
  const next: Record<string, unknown> = { ...o }
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) delete next[k]
    else next[k] = v
  }
  return next as unknown as Order
}

// ---------------------------------------------------------------------------
// A. round-trip at the pure-function level
// ---------------------------------------------------------------------------

const NOW = 900

/** Every action reachable from the panel, in every state the UI can reach it in. */
const CASES: { name: string; before: Order; run: (o: Order) => Partial<Order> | null }[] = [
  {
    name: 'callNext on a queue number that has never been called',
    before: order({ status: 'waiting' }),
    run: (o) => Q.callNext([o], 'A', NOW)?.patch ?? null,
  },
  {
    name: 'callNext on a number that carries timestamps from an earlier call',
    before: order({ status: 'waiting', servingAt: 5, announcedAt: 7 }),
    run: (o) => Q.callNext([o], 'A', NOW)?.patch ?? null,
  },
  {
    name: 'callSpecific on a queue number that has never been called',
    before: order({ status: 'waiting' }),
    run: (o) => Q.callSpecific(o, NOW),
  },
  {
    name: 'callSpecific on a number that carries timestamps from an earlier call',
    before: order({ status: 'waiting', servingAt: 5, announcedAt: 7 }),
    run: (o) => Q.callSpecific(o, NOW),
  },
  {
    name: 'markDone on an order being served',
    before: order({ status: 'serving', servingAt: 5, announcedAt: 5 }),
    run: (o) => Q.markDone(o, NOW),
  },
  {
    name: 'skip an order being served',
    before: order({ status: 'serving', servingAt: 5, announcedAt: 5 }),
    run: (o) => Q.skip(o),
  },
  {
    name: 'recall a parked order',
    before: order({ status: 'skipped', servingAt: 5, announcedAt: 5 }),
    run: (o) => Q.recall(o, NOW),
  },
  {
    name: 'reannounce the order being served',
    before: order({ status: 'serving', servingAt: 5, announcedAt: 5 }),
    run: (o) => Q.reannounce(o, NOW),
  },
  {
    name: 'cancel a waiting order',
    before: order({ status: 'waiting' }),
    run: () => Q.cancel('ลูกค้าเปลี่ยนใจ'),
  },
  {
    name: 'cancel the order being served',
    before: order({ status: 'serving', servingAt: 5, announcedAt: 5 }),
    run: () => Q.cancel('ของหมด'),
  },
]

describe('A. round-trip: every action, undone, leaves the order byte-for-byte as it was', () => {
  test.each(CASES)('A1 $name', ({ before, run }) => {
    const snapshot = Q.orderSnapshot(before)   // what the panel records BEFORE writing
    const patch = run(before)
    expect(patch).not.toBeNull()

    const after = write(before, patch!)
    const undone = write(after, snapshot)

    expect(undone).toStrictEqual(before)
  })

  /**
   * Spine for A1. `undone === before` is trivially true when the action did
   * nothing at all, so each case must be shown to have moved the order first.
   * Without this, an action stubbed to `{}` would keep all ten cases green.
   */
  test.each(CASES)('A2 the action actually changed something — $name', ({ before, run }) => {
    const after = write(before, run(before)!)
    expect(after).not.toStrictEqual(before)
  })

  /**
   * The reason the criterion holds, rather than today's field list. A new action
   * writing a field the snapshot does not carry would survive its own undo, so
   * pin containment — and pin the concrete key set too, so that blanking the
   * actions out cannot satisfy containment vacuously.
   */
  test('A3 the snapshot carries every field any action is able to write', () => {
    const written = new Set<string>()
    for (const c of CASES) for (const k of Object.keys(c.run(c.before)!)) written.add(k)

    expect([...written].sort()).toStrictEqual(['announcedAt', 'cancelReason', 'doneAt', 'servingAt', 'status'])
    const covered = Object.keys(Q.orderSnapshot(order({})))
    expect([...written].filter((k) => !covered.includes(k))).toStrictEqual([])
  })

  test('A4 an absent field is recorded as an explicit undefined, not omitted', () => {
    // Omitting it is what let `doneAt` and friends survive undo: updateDoc merges.
    expect(Q.orderSnapshot(order({ status: 'waiting' }))).toStrictEqual({
      status: 'waiting', servingAt: undefined, doneAt: undefined, announcedAt: undefined, cancelReason: undefined,
    })
    expect(Q.orderSnapshot(order({ status: 'done', servingAt: 5, doneAt: 9, announcedAt: 5, cancelReason: 'x' })))
      .toStrictEqual({ status: 'done', servingAt: 5, doneAt: 9, announcedAt: 5, cancelReason: 'x' })
  })

  test('A5 cancel is a real action with a home in queueActions, not an inline patch', () => {
    expect(Q.cancel('  ของหมด  ')).toStrictEqual({ status: 'cancelled', cancelReason: 'ของหมด' })
    expect(Q.cancel('   ')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// B. the same claim, driven through the panel's own buttons
// ---------------------------------------------------------------------------

const { updateOrderStatus } = vi.hoisted(() => ({ updateOrderStatus: vi.fn().mockResolvedValue(undefined) }))
let emit: (orders: Order[]) => void = () => {}
vi.mock('./order/ordersRepo', () => ({
  subscribeBoothOrders: (_booth: string, cb: (o: Order[]) => void) => { emit = cb; return () => {} },
  updateOrderStatus,
  createOrder: vi.fn(),
}))

import { QueuePanel } from './screens/QueuePanel'

const CLOCK = 1000
/** An order that never had a field carries `undefined` for it after undo. */
const gone = { servingAt: undefined, doneAt: undefined, announcedAt: undefined, cancelReason: undefined }

beforeEach(() => {
  updateOrderStatus.mockClear()
  vi.spyOn(Date, 'now').mockReturnValue(CLOCK)   // not fake timers: userEvent runs its own
})
afterEach(() => vi.restoreAllMocks())

const mount = (orders: Order[]) => {
  const user = userEvent.setup()
  render(<QueuePanel booth="drinks" station="A" />)
  act(() => emit(orders))
  return user
}
const undoButton = () => screen.getByRole('button', { name: /ย้อนกลับ/ })

describe('B. undo through the panel restores status AND timestamps, adding nothing', () => {
  test('B1 undoing "เรียกคิวถัดไป" strips the timestamps the call invented', async () => {
    const user = mount([order({ id: 'o1', status: 'waiting' })])
    await user.click(screen.getByRole('button', { name: /เรียกคิวถัดไป/ }))
    await user.click(undoButton())

    expect(updateOrderStatus.mock.calls).toStrictEqual([
      ['o1', { status: 'serving', servingAt: CLOCK, announcedAt: CLOCK }],
      ['o1', { status: 'waiting', ...gone }],
    ])
  })

  test('B2 undoing "เรียก" on a specific number strips its timestamps too', async () => {
    const user = mount([
      order({ id: 'o1', queueNumber: 'A1', status: 'waiting', createdAt: 1 }),
      order({ id: 'o2', queueNumber: 'A2', status: 'waiting', createdAt: 2 }),
    ])
    await user.click(screen.getAllByRole('button', { name: /^เรียก$/ })[1])
    await user.click(undoButton())

    expect(updateOrderStatus.mock.calls).toStrictEqual([
      ['o2', { status: 'serving', servingAt: CLOCK, announcedAt: CLOCK }],
      ['o2', { status: 'waiting', ...gone }],
    ])
  })

  test('B3 undoing "เสร็จ" removes doneAt and keeps the original servingAt', async () => {
    const user = mount([order({ id: 'o1', status: 'serving', servingAt: 5, announcedAt: 7 })])
    await user.click(screen.getByRole('button', { name: /^เสร็จ$/ }))
    await user.click(undoButton())

    expect(updateOrderStatus.mock.calls).toStrictEqual([
      ['o1', { status: 'done', doneAt: CLOCK }],
      ['o1', { status: 'serving', servingAt: 5, announcedAt: 7, doneAt: undefined, cancelReason: undefined }],
    ])
  })

  test('B4 undoing "ข้าม" puts the order back to serving unchanged', async () => {
    const user = mount([order({ id: 'o1', status: 'serving', servingAt: 5, announcedAt: 7 })])
    await user.click(screen.getByRole('button', { name: /^ข้าม$/ }))
    await user.click(undoButton())

    expect(updateOrderStatus.mock.calls).toStrictEqual([
      ['o1', { status: 'skipped' }],
      ['o1', { status: 'serving', servingAt: 5, announcedAt: 7, doneAt: undefined, cancelReason: undefined }],
    ])
  })

  test('B5 undoing "เรียกซ้ำ" on a parked order restores the older timestamps', async () => {
    const user = mount([order({ id: 'o1', status: 'skipped', servingAt: 5, announcedAt: 7 })])
    await user.click(screen.getByRole('button', { name: /^เรียกซ้ำ$/ }))
    await user.click(undoButton())

    expect(updateOrderStatus.mock.calls).toStrictEqual([
      ['o1', { status: 'serving', servingAt: CLOCK, announcedAt: CLOCK }],
      ['o1', { status: 'skipped', servingAt: 5, announcedAt: 7, doneAt: undefined, cancelReason: undefined }],
    ])
  })

  test('B6 undoing "ประกาศซ้ำ" puts announcedAt back where it was', async () => {
    const user = mount([order({ id: 'o1', status: 'serving', servingAt: 5, announcedAt: 7 })])
    await user.click(screen.getByRole('button', { name: /ประกาศซ้ำ/ }))
    await user.click(undoButton())

    expect(updateOrderStatus.mock.calls).toStrictEqual([
      ['o1', { announcedAt: CLOCK }],
      ['o1', { status: 'serving', servingAt: 5, announcedAt: 7, doneAt: undefined, cancelReason: undefined }],
    ])
  })

  test('B7 undoing a cancellation removes the reason instead of leaving it behind', async () => {
    const user = mount([order({ id: 'o1', status: 'waiting' })])
    await user.click(screen.getByRole('button', { name: /^ยกเลิก\/แก้ไข$/ }))
    await user.type(screen.getByLabelText(/เหตุผล/), 'ของหมด')
    await user.click(screen.getByRole('button', { name: /ยืนยันยกเลิก/ }))
    await user.click(undoButton())

    expect(updateOrderStatus.mock.calls).toStrictEqual([
      ['o1', { status: 'cancelled', cancelReason: 'ของหมด' }],
      ['o1', { status: 'waiting', ...gone }],
    ])
  })

  test('B8 the undo bar appears only after an action, and fires once per press', async () => {
    // Spine for B1-B7: if the bar were always present, or undo wrote twice, the
    // call-list assertions above would be describing something other than one
    // deliberate press.
    const user = mount([order({ id: 'o1', status: 'serving', servingAt: 5 })])
    expect(screen.queryByRole('button', { name: /ย้อนกลับ/ })).toBeNull()

    await user.click(screen.getByRole('button', { name: /^เสร็จ$/ }))
    await user.click(undoButton())
    expect(updateOrderStatus.mock.calls).toHaveLength(2)
    expect(screen.queryByRole('button', { name: /ย้อนกลับ/ })).toBeNull()
  })
})
