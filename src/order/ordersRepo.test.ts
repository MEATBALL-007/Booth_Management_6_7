import { vi, beforeEach, test, expect } from 'vitest'

const { addDoc, onSnapshot, updateDoc, collection, query, where, orderBy, doc } = vi.hoisted(() => ({
  addDoc: vi.fn(),
  onSnapshot: vi.fn(),
  updateDoc: vi.fn(),
  collection: vi.fn((_db, path) => ({ __collection: path })),
  query: vi.fn((...args) => ({ __query: args })),
  where: vi.fn((f, op, v) => ({ __where: [f, op, v] })),
  orderBy: vi.fn((f, dir) => ({ __orderBy: [f, dir] })),
  doc: vi.fn((_db, path, id) => ({ __doc: [path, id] })),
}))

vi.mock('firebase/firestore', () => ({
  collection, addDoc, onSnapshot, query, where, orderBy, doc, updateDoc,
}))
vi.mock('../lib/firebase', () => ({ getDb: () => ({ __db: true }) }))

import { createOrder, subscribeBoothOrders, updateOrderStatus } from './ordersRepo'

beforeEach(() => vi.clearAllMocks())

test('createOrder writes to the orders collection and returns the new id', async () => {
  addDoc.mockResolvedValue({ id: 'order123' })
  const id = await createOrder({ boothId: 'photo' } as never)
  expect(collection).toHaveBeenCalledWith({ __db: true }, 'orders')
  expect(addDoc).toHaveBeenCalledWith({ __collection: 'orders' }, { boothId: 'photo' })
  expect(id).toBe('order123')
})

test('subscribeBoothOrders queries orders for the booth ordered by createdAt and maps docs', () => {
  let handler: (snap: unknown) => void = () => {}
  onSnapshot.mockImplementation((_q, cb) => { handler = cb; return () => {} })
  const received: unknown[] = []
  const unsub = subscribeBoothOrders('drinks', (orders) => received.push(orders))

  expect(where).toHaveBeenCalledWith('boothId', '==', 'drinks')
  expect(orderBy).toHaveBeenCalledWith('createdAt', 'asc')

  handler({ docs: [{ id: 'o1', data: () => ({ boothId: 'drinks', total: 30 }) }] })
  expect(received[0]).toEqual([{ id: 'o1', boothId: 'drinks', total: 30 }])
  expect(typeof unsub).toBe('function')
})

test('updateOrderStatus updates the order doc with the patch', async () => {
  updateDoc.mockResolvedValue(undefined)
  await updateOrderStatus('o1', { status: 'serving', servingAt: 42 })
  expect(doc).toHaveBeenCalledWith({ __db: true }, 'orders', 'o1')
  expect(updateDoc).toHaveBeenCalledWith({ __doc: ['orders', 'o1'] }, { status: 'serving', servingAt: 42 })
})
