/**
 * The other half of the Undo criterion (2026-08-04-queue-pro-upgrade-design.md:17).
 *
 * `src/undoRoundTrip.audit.test.tsx` proves undo emits an explicit `undefined`
 * for a field the order never had. That is only meaningful if the repo layer
 * turns that `undefined` into something Firestore understands as "remove this
 * field", because `updateDoc` merges — an omitted key is left alone, and a raw
 * `undefined` is rejected outright (getDb() does not set
 * `ignoreUndefinedProperties`). This file pins that translation.
 *
 * WHAT THIS FILE CANNOT PROVE
 * `firebase/firestore` is mocked, so no document is ever written. This proves
 * the sentinel we hand to `updateDoc` is `deleteField()`, not that a field
 * disappeared from a real collection. Nothing here has touched Firestore.
 */
import { vi, beforeEach, test, expect } from 'vitest'

const { updateDoc, deleteField, addDoc, collection, doc, onSnapshot, query, where } = vi.hoisted(() => ({
  updateDoc: vi.fn(),
  deleteField: vi.fn(() => ({ __sentinel: 'delete' })),
  addDoc: vi.fn(),
  collection: vi.fn((_db, path) => ({ __collection: path })),
  doc: vi.fn((_db, path, id) => ({ __doc: [path, id] })),
  onSnapshot: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({ collection, addDoc, onSnapshot, query, where, doc, updateDoc, deleteField }))
vi.mock('./lib/firebase', () => ({ getDb: () => ({ __db: true }) }))

import { createOrder, updateOrderStatus } from './order/ordersRepo'

const DEL = { __sentinel: 'delete' }
const patchOf = () => updateDoc.mock.calls[0][1] as Record<string, unknown>

beforeEach(() => {
  vi.clearAllMocks()
  deleteField.mockReturnValue({ __sentinel: 'delete' })
  updateDoc.mockResolvedValue(undefined)
})

test('D1 a field the undo snapshot marks absent is sent as a deleteField sentinel', async () => {
  await updateOrderStatus('o1', { status: 'waiting', servingAt: undefined, announcedAt: undefined })

  expect(doc).toHaveBeenCalledWith({ __db: true }, 'orders', 'o1')
  expect(patchOf()).toStrictEqual({ status: 'waiting', servingAt: DEL, announcedAt: DEL })
})

test('D2 the keys survive the translation — a deleted field must be named, not dropped', async () => {
  // Dropping the key instead of sending a sentinel is exactly the old bug:
  // updateDoc merges, so an unmentioned field keeps whatever the action wrote.
  await updateOrderStatus('o1', { status: 'serving', doneAt: undefined })

  expect(Object.keys(patchOf()).sort()).toStrictEqual(['doneAt', 'status'])
})

test('D3 values that are present pass through untouched, and no sentinel is minted', async () => {
  // Spine for D1: if `deleteField()` were applied to every key, or the patch
  // were rebuilt lossily, this is where it shows. It is also the guard that
  // keeps this change away from the money fields on an order document — a patch
  // with nothing absent must come out of the repo byte-for-byte as it went in.
  await updateOrderStatus('o1', { status: 'done', doneAt: 42, total: 30, paymentStatus: 'paid' })

  expect(patchOf()).toStrictEqual({ status: 'done', doneAt: 42, total: 30, paymentStatus: 'paid' })
  expect(deleteField).not.toHaveBeenCalled()
})

test('D4 one sentinel is minted per absent field, so they cannot be aliased', async () => {
  await updateOrderStatus('o1', { servingAt: undefined, doneAt: undefined, announcedAt: undefined })
  expect(deleteField).toHaveBeenCalledTimes(3)
})

test('D5 the translation is confined to updateOrderStatus — createOrder still writes raw', async () => {
  addDoc.mockResolvedValue({ id: 'new1' })
  await createOrder({ boothId: 'photo', staffName: undefined } as never)

  expect(addDoc).toHaveBeenCalledWith({ __collection: 'orders' }, { boothId: 'photo', staffName: undefined })
  expect(deleteField).not.toHaveBeenCalled()
})
