import { vi, beforeEach, test, expect } from 'vitest'

const { addDoc, onSnapshot, updateDoc, collection, query, where, doc, deleteField } = vi.hoisted(() => ({
  addDoc: vi.fn(),
  onSnapshot: vi.fn(),
  updateDoc: vi.fn(),
  collection: vi.fn((_db, path) => ({ __collection: path })),
  query: vi.fn((...args) => ({ __query: args })),
  where: vi.fn((f, op, v) => ({ __where: [f, op, v] })),
  doc: vi.fn((_db, path, id) => ({ __doc: [path, id] })),
  deleteField: vi.fn(() => ({ __delete: true })),
}))

vi.mock('firebase/firestore', () => ({
  collection, addDoc, onSnapshot, query, where, doc, updateDoc, deleteField,
}))
vi.mock('../lib/firebase', () => ({ getDb: () => ({ __db: true }) }))

import { createOrder, subscribeBoothOrders, subscribeAllOrders, updateOrderStatus } from './ordersRepo'

beforeEach(() => vi.clearAllMocks())

test('createOrder writes to the orders collection and returns the new id', async () => {
  addDoc.mockResolvedValue({ id: 'order123' })
  const id = await createOrder({ boothId: 'photo' } as never)
  expect(collection).toHaveBeenCalledWith({ __db: true }, 'orders')
  expect(addDoc).toHaveBeenCalledWith({ __collection: 'orders' }, { boothId: 'photo' })
  expect(id).toBe('order123')
})

test('subscribeBoothOrders queries orders for the booth and delivers docs sorted by createdAt ascending', () => {
  let handler: (snap: unknown) => void = () => {}
  onSnapshot.mockImplementation((_q, cb) => { handler = cb; return () => {} })
  const received: unknown[] = []
  const unsub = subscribeBoothOrders('drinks', (orders) => received.push(orders))

  expect(where).toHaveBeenCalledWith('boothId', '==', 'drinks')

  handler({ docs: [
    { id: 'o2', data: () => ({ boothId: 'drinks', createdAt: 2 }) },
    { id: 'o1', data: () => ({ boothId: 'drinks', createdAt: 1 }) },
  ] })
  expect(received[0]).toEqual([
    { id: 'o1', boothId: 'drinks', createdAt: 1 },
    { id: 'o2', boothId: 'drinks', createdAt: 2 },
  ])
  expect(typeof unsub).toBe('function')
})

test('updateOrderStatus updates the order doc with the patch', async () => {
  updateDoc.mockResolvedValue(undefined)
  await updateOrderStatus('o1', { status: 'serving', servingAt: 42 })
  expect(doc).toHaveBeenCalledWith({ __db: true }, 'orders', 'o1')
  expect(updateDoc).toHaveBeenCalledWith({ __doc: ['orders', 'o1'] }, { status: 'serving', servingAt: 42 })
})

// Firestore has no "set this to undefined" — an undo that must remove a field the action
// created has to send the deleteField() sentinel, otherwise updateDoc merges and it survives.
test('updateOrderStatus turns an explicit undefined in the patch into deleteField()', async () => {
  updateDoc.mockResolvedValue(undefined)
  await updateOrderStatus('o1', { status: 'waiting', servingAt: undefined, announcedAt: undefined })
  expect(updateDoc).toHaveBeenCalledWith({ __doc: ['orders', 'o1'] }, {
    status: 'waiting', servingAt: { __delete: true }, announcedAt: { __delete: true },
  })
  expect(deleteField).toHaveBeenCalledTimes(2)
})

test('subscribeAllOrders subscribes to the whole orders collection (no filter) and sorts by createdAt', () => {
  let handler: (snap: unknown) => void = () => {}
  onSnapshot.mockImplementation((_ref, cb) => { handler = cb; return () => {} })
  const received: unknown[] = []
  const unsub = subscribeAllOrders((orders) => received.push(orders))

  expect(collection).toHaveBeenCalledWith({ __db: true }, 'orders')
  expect(where).not.toHaveBeenCalled()
  expect(query).not.toHaveBeenCalled()

  handler({ docs: [
    { id: 'o2', data: () => ({ boothId: 'drinks', createdAt: 2 }) },
    { id: 'o1', data: () => ({ boothId: 'photo', createdAt: 1 }) },
  ] })
  expect(received[0]).toEqual([
    { id: 'o1', boothId: 'photo', createdAt: 1 },
    { id: 'o2', boothId: 'drinks', createdAt: 2 },
  ])
  expect(typeof unsub).toBe('function')
})
