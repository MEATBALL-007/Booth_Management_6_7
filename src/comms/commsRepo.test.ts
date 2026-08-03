import { vi, beforeEach, test, expect } from 'vitest'

const { addDoc, onSnapshot, collection, doc, updateDoc, setDoc, arrayUnion } = vi.hoisted(() => ({
  addDoc: vi.fn(),
  onSnapshot: vi.fn(),
  collection: vi.fn((_db, path) => ({ __collection: path })),
  doc: vi.fn((_db, path, id) => ({ __doc: [path, id] })),
  updateDoc: vi.fn(),
  setDoc: vi.fn(),
  arrayUnion: vi.fn((v) => ({ __arrayUnion: v })),
}))
vi.mock('firebase/firestore', () => ({ addDoc, onSnapshot, collection, doc, updateDoc, setDoc, arrayUnion }))
vi.mock('../lib/firebase', () => ({ getDb: () => ({ __db: true }) }))

import { sendMessage, subscribeMessages, ackMessage, upsertPresence, subscribePresence } from './commsRepo'

beforeEach(() => vi.clearAllMocks())

test('sendMessage writes to messages and returns the id', async () => {
  addDoc.mockResolvedValue({ id: 'm1' })
  const id = await sendMessage({ fromDeviceId: 'd1' } as never)
  expect(collection).toHaveBeenCalledWith({ __db: true }, 'messages')
  expect(addDoc).toHaveBeenCalledWith({ __collection: 'messages' }, { fromDeviceId: 'd1' })
  expect(id).toBe('m1')
})

test('subscribeMessages sorts by createdAt ascending', () => {
  let handler: (snap: unknown) => void = () => {}
  onSnapshot.mockImplementation((_ref, cb) => { handler = cb; return () => {} })
  const received: unknown[] = []
  subscribeMessages((m) => received.push(m))
  expect(collection).toHaveBeenCalledWith({ __db: true }, 'messages')
  handler({ docs: [
    { id: 'b', data: () => ({ createdAt: 2 }) },
    { id: 'a', data: () => ({ createdAt: 1 }) },
  ] })
  expect(received[0]).toEqual([{ id: 'a', createdAt: 1 }, { id: 'b', createdAt: 2 }])
})

test('ackMessage arrayUnions the device id onto ackBy', async () => {
  updateDoc.mockResolvedValue(undefined)
  await ackMessage('m1', 'd9')
  expect(doc).toHaveBeenCalledWith({ __db: true }, 'messages', 'm1')
  expect(updateDoc).toHaveBeenCalledWith({ __doc: ['messages', 'm1'] }, { ackBy: { __arrayUnion: 'd9' } })
})

test('upsertPresence setDocs the presence keyed by id (merge)', async () => {
  setDoc.mockResolvedValue(undefined)
  await upsertPresence({ id: 'd1', deviceId: 'd1', booth: 'drinks', mode: 'order', lastSeen: 5 })
  expect(doc).toHaveBeenCalledWith({ __db: true }, 'presence', 'd1')
  expect(setDoc).toHaveBeenCalledWith({ __doc: ['presence', 'd1'] }, { id: 'd1', deviceId: 'd1', booth: 'drinks', mode: 'order', lastSeen: 5 }, { merge: true })
})

test('subscribePresence maps docs', () => {
  let handler: (snap: unknown) => void = () => {}
  onSnapshot.mockImplementation((_ref, cb) => { handler = cb; return () => {} })
  const received: unknown[] = []
  subscribePresence((p) => received.push(p))
  expect(collection).toHaveBeenCalledWith({ __db: true }, 'presence')
  handler({ docs: [{ id: 'd1', data: () => ({ booth: 'drinks', lastSeen: 5 }) }] })
  expect(received[0]).toEqual([{ id: 'd1', booth: 'drinks', lastSeen: 5 }])
})
