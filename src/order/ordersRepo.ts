import { collection, addDoc, onSnapshot, query, where, doc, updateDoc, deleteField } from 'firebase/firestore'
import { getDb } from '../lib/firebase'
import type { Order, BoothId } from '../domain/types'

export async function createOrder(order: Omit<Order, 'id'>): Promise<string> {
  const ref = await addDoc(collection(getDb(), 'orders'), order)
  return ref.id
}

export function subscribeBoothOrders(boothId: BoothId, cb: (orders: Order[]) => void): () => void {
  const q = query(collection(getDb(), 'orders'), where('boothId', '==', boothId))
  return onSnapshot(q, (snap) => {
    const orders = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Order, 'id'>) }))
    cb(orders.sort((a, b) => a.createdAt - b.createdAt))
  })
}

export function subscribeAllOrders(cb: (orders: Order[]) => void): () => void {
  return onSnapshot(collection(getDb(), 'orders'), (snap) => {
    const orders = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Order, 'id'>) }))
    cb(orders.sort((a, b) => a.createdAt - b.createdAt))
  })
}

export async function updateOrderStatus(id: string, patch: Partial<Order>): Promise<void> {
  await updateDoc(doc(getDb(), 'orders', id), withDeletions(patch))
}

/**
 * Firestore has no "write undefined": `updateDoc` rejects it outright, and
 * simply omitting the key means merge, which keeps the old value. Undo needs a
 * third thing — "this field should not exist" — and `deleteField()` is the
 * sentinel for it. Keys holding a real value are passed through untouched, so a
 * patch with nothing absent (every caller other than undo) is unaffected.
 */
function withDeletions(patch: Partial<Order>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(patch).map(([key, value]) => [key, value === undefined ? deleteField() : value]),
  )
}
