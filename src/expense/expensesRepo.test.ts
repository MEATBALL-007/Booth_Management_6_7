import { vi, beforeEach, test, expect } from 'vitest'

const { addDoc, onSnapshot, collection } = vi.hoisted(() => ({
  addDoc: vi.fn(),
  onSnapshot: vi.fn(),
  collection: vi.fn((_db, path) => ({ __collection: path })),
}))
vi.mock('firebase/firestore', () => ({ addDoc, onSnapshot, collection }))
vi.mock('../lib/firebase', () => ({ getDb: () => ({ __db: true }) }))

import { addExpense, subscribeAllExpenses } from './expensesRepo'

beforeEach(() => vi.clearAllMocks())

test('addExpense writes to the expenses collection and returns the id', async () => {
  addDoc.mockResolvedValue({ id: 'e1' })
  const id = await addExpense({ boothId: 'photo', description: 'ฟิล์ม', amount: 5500, createdAt: 1 })
  expect(collection).toHaveBeenCalledWith({ __db: true }, 'expenses')
  expect(addDoc).toHaveBeenCalledWith({ __collection: 'expenses' }, { boothId: 'photo', description: 'ฟิล์ม', amount: 5500, createdAt: 1 })
  expect(id).toBe('e1')
})

test('subscribeAllExpenses maps docs and sorts by createdAt ascending', () => {
  let handler: (snap: unknown) => void = () => {}
  onSnapshot.mockImplementation((_ref, cb) => { handler = cb; return () => {} })
  const received: unknown[] = []
  const unsub = subscribeAllExpenses((e) => received.push(e))
  expect(collection).toHaveBeenCalledWith({ __db: true }, 'expenses')
  handler({ docs: [
    { id: 'e2', data: () => ({ amount: 20, createdAt: 2 }) },
    { id: 'e1', data: () => ({ amount: 10, createdAt: 1 }) },
  ] })
  expect(received[0]).toEqual([
    { id: 'e1', amount: 10, createdAt: 1 },
    { id: 'e2', amount: 20, createdAt: 2 },
  ])
  expect(typeof unsub).toBe('function')
})
